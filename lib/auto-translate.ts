/**
 * auto-translate.ts — long-term, zero-maintenance UI translation (web).
 *
 * v2 — performance-focused rewrite:
 *  - The FULL shared cache (Supabase `ui_translations`) is preloaded ONCE at
 *    init, so navigating the app never waits on database roundtrips.
 *  - MutationObserver sweeps ONLY the mutated subtrees (not the whole
 *    document on every click) — no jank on large screens.
 *  - Unknown strings go to Google Translate in PARALLEL batches and are
 *    applied IMMEDIATELY per batch, targeted at the exact nodes waiting for
 *    them (no full re-scan).
 *  - Results persist to localStorage + the global Supabase cache, so every
 *    unique string (including user content: tasks, courses, announcements)
 *    is translated once ever — for all users.
 *
 * Skips numbers, URLs/e-mails, input values, and anything inside
 * data-notranslate / translate="no" / .notranslate.
 */
import { Platform } from 'react-native';
import { supabase } from './supabase';

type Lang = 'pl' | 'en' | 'uk';

let currentLang: Lang = 'pl';
let observer: MutationObserver | null = null;

const mem = new Map<string, string>();          // source -> translated
const outputs = new Set<string>();               // translated values (never re-translate)
const waitingText = new Map<string, Set<Text>>();        // source -> text nodes awaiting
const waitingPh = new Map<string, Set<Element>>();       // source -> elements awaiting placeholder
let flushScheduled = false;
let inFlight = 0;
const MAX_PARALLEL = 4;

const LS_KEY = (lang: string) => `shiftapp_at_${lang}`;

/* ── filters ───────────────────────────────────────────────────────── */

const HAS_LETTERS = /[a-ząęółśżźćńA-ZĄĘÓŁŚŻŹĆŃ]/;
const LOOKS_SKIPPABLE = /^(\d[\d\s.,:%/-]*|[^\p{L}]*|https?:\/\/\S+|\S+@\S+\.\S+)$/u;

function shouldTranslate(src: string): boolean {
  if (src.length < 2 || src.length > 800) return false;
  if (!HAS_LETTERS.test(src)) return false;
  if (LOOKS_SKIPPABLE.test(src)) return false;
  if (outputs.has(src)) return false;
  return true;
}

function isExcluded(el: Element | null): boolean {
  if (!el) return true;
  const tag = el.tagName;
  if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'INPUT' || tag === 'TEXTAREA') return true;
  if (el.closest('[data-notranslate], [translate="no"], .notranslate')) return true;
  return false;
}

/* ── caches ────────────────────────────────────────────────────────── */

function loadLocalCache(lang: string) {
  try {
    const raw = localStorage.getItem(LS_KEY(lang));
    if (raw) {
      const obj = JSON.parse(raw) as Record<string, string>;
      for (const [k, v] of Object.entries(obj)) { mem.set(k, v); outputs.add(v); }
    }
  } catch { /* ignore */ }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function saveLocalCache() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const obj: Record<string, string> = {};
      mem.forEach((v, k) => { obj[k] = v; });
      localStorage.setItem(LS_KEY(currentLang), JSON.stringify(obj));
    } catch { /* ignore */ }
  }, 500);
}

// One-shot bulk preload of the ENTIRE shared cache — after this, navigation
// never waits on the database.
async function preloadSharedCache(lang: Lang) {
  try {
    const PAGE = 1000;
    for (let from = 0; from < 20000; from += PAGE) {
      const { data, error } = await supabase
        .from('ui_translations')
        .select('source, translated')
        .eq('lang', lang)
        .range(from, from + PAGE - 1);
      if (error || !data?.length) break;
      data.forEach((r: any) => {
        if (!mem.has(r.source)) { mem.set(r.source, r.translated); outputs.add(r.translated); }
      });
      if (data.length < PAGE) break;
    }
    saveLocalCache();
    resolveWaiting(Array.from(waitingText.keys()).concat(Array.from(waitingPh.keys())));
  } catch { /* table may not exist yet — Google path still works */ }
}

/* ── applying translations to waiting nodes ────────────────────────── */

function applyTextNode(node: Text, src: string, translated: string) {
  const raw = node.nodeValue ?? '';
  if (!raw.includes(src)) return; // node changed meanwhile
  node.nodeValue = raw.replace(src, translated);
  observer?.takeRecords(); // discard our own mutation records
}

function resolveWaiting(sources: string[]) {
  for (const src of sources) {
    const translated = mem.get(src);
    if (translated === undefined || translated === src) {
      if (translated === src) { waitingText.delete(src); waitingPh.delete(src); }
      continue;
    }
    const nodes = waitingText.get(src);
    if (nodes) {
      nodes.forEach((n) => applyTextNode(n, src, translated));
      waitingText.delete(src);
    }
    const els = waitingPh.get(src);
    if (els) {
      els.forEach((el) => { el.setAttribute('placeholder', translated); });
      observer?.takeRecords();
      waitingPh.delete(src);
    }
  }
}

/* ── Google Translate (parallel batches, applied per batch) ────────── */

async function translateChunk(chunk: string[]) {
  const url =
    `https://translate.googleapis.com/translate_a/t?client=gtx&sl=pl&tl=${currentLang}&format=text&` +
    chunk.map((s) => `q=${encodeURIComponent(s)}`).join('&');
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(to);
    if (!res.ok) return;
    const json = await res.json();
    const arr: any[] = Array.isArray(json) ? json : [];
    const rows: { source: string; translated: string }[] = [];
    chunk.forEach((src, idx) => {
      const item = arr[idx];
      const translated = typeof item === 'string' ? item : Array.isArray(item) ? String(item[0] ?? '') : '';
      if (translated && translated !== src) {
        mem.set(src, translated);
        outputs.add(translated);
        rows.push({ source: src, translated });
      } else {
        mem.set(src, src); // don't retry endlessly
      }
    });
    resolveWaiting(chunk);   // apply IMMEDIATELY — no waiting for other batches
    saveLocalCache();
    if (rows.length) {
      supabase
        .from('ui_translations')
        .upsert(rows.map((r) => ({ lang: currentLang, ...r })), { onConflict: 'lang,source', ignoreDuplicates: true })
        .then(() => {}, () => {});
    }
  } catch { /* network hiccup — nodes stay queued; a later sweep retries */ }
}

function scheduleFlush() {
  if (flushScheduled) return;
  flushScheduled = true;
  setTimeout(async () => {
    flushScheduled = false;
    const unknown = Array.from(new Set([
      ...waitingText.keys(),
      ...waitingPh.keys(),
    ])).filter((s) => !mem.has(s));
    if (!unknown.length) return;
    const CHUNK = 20;
    const chunks: string[][] = [];
    for (let i = 0; i < unknown.length; i += CHUNK) chunks.push(unknown.slice(i, i + CHUNK));
    // Parallel with a small concurrency cap
    const queue = [...chunks];
    const workers = Array.from({ length: Math.min(MAX_PARALLEL, queue.length) }, async () => {
      while (queue.length) {
        const c = queue.shift();
        if (c) { inFlight++; await translateChunk(c); inFlight--; }
      }
    });
    await Promise.all(workers);
    if (waitingText.size || waitingPh.size) scheduleFlush();
  }, 40);
}

/* ── sweeping (targeted — only the given subtree) ──────────────────── */

function processTextNode(node: Text) {
  if (isExcluded(node.parentElement)) return;
  const raw = node.nodeValue ?? '';
  const src = raw.trim();
  if (!src || !shouldTranslate(src)) return;
  const translated = mem.get(src);
  if (translated !== undefined) {
    if (translated !== src) applyTextNode(node, src, translated);
    return;
  }
  let set = waitingText.get(src);
  if (!set) { set = new Set(); waitingText.set(src, set); }
  set.add(node);
}

function sweep(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) { processTextNode(root as Text); return; }
  if (!(root instanceof Element) && !(root instanceof Document)) return;
  if (root instanceof Element && isExcluded(root)) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) processTextNode(n as Text);

  const rootEl = root instanceof Document ? root.body : root;
  if (!rootEl) return;
  const phEls = rootEl.matches?.('input[placeholder], textarea[placeholder]')
    ? [rootEl, ...Array.from(rootEl.querySelectorAll('input[placeholder], textarea[placeholder]'))]
    : Array.from(rootEl.querySelectorAll('input[placeholder], textarea[placeholder]'));
  phEls.forEach((el) => {
    if (isExcluded(el)) return;
    const src = (el.getAttribute('placeholder') ?? '').trim();
    if (!src || !shouldTranslate(src)) return;
    const translated = mem.get(src);
    if (translated !== undefined) {
      if (translated !== src) { el.setAttribute('placeholder', translated); observer?.takeRecords(); }
      return;
    }
    let set = waitingPh.get(src);
    if (!set) { set = new Set(); waitingPh.set(src, set); }
    set.add(el);
  });

  if (waitingText.size || waitingPh.size) scheduleFlush();
}

/* ── public API ────────────────────────────────────────────────────── */

export function initAutoTranslate(lang: Lang) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  if (observer) { observer.disconnect(); observer = null; }
  mem.clear(); outputs.clear(); waitingText.clear(); waitingPh.clear();
  currentLang = lang;
  if (lang === 'pl') return; // Polish is the source language

  loadLocalCache(lang);       // instant for anything seen on this device
  preloadSharedCache(lang);   // one bulk fetch — then zero DB waits while clicking

  observer = new MutationObserver((records) => {
    // Sweep ONLY what changed — never the whole document.
    for (const rec of records) {
      if (rec.type === 'characterData') {
        processTextNode(rec.target as Text);
      } else if (rec.type === 'childList') {
        rec.addedNodes.forEach((n) => sweep(n));
      }
    }
    if (waitingText.size || waitingPh.size) scheduleFlush();
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  sweep(document); // initial full pass (once)
}

export function stopAutoTranslate() {
  if (observer) { observer.disconnect(); observer = null; }
}
