/**
 * auto-translate.ts — long-term, zero-maintenance UI translation (web).
 *
 * Instead of hand-written dictionaries, this watches the rendered DOM and
 * machine-translates every visible Polish string on the fly:
 *   1. localStorage cache (instant, per device)
 *   2. Supabase shared cache `ui_translations` (each unique string is
 *      translated ONCE globally, then reused by every user/device)
 *   3. Google Translate (free gtx endpoint) for strings never seen before,
 *      results saved back to both caches.
 *
 * New screens and future features translate automatically — no dictionary
 * entries, no t() wrapping required. Native apps currently keep Polish
 * (plus the curated t() dictionary); the DOM approach is web-only.
 *
 * Skips: numbers, URLs/e-mails, user input values, and anything inside an
 * element marked data-notranslate / translate="no" / .notranslate.
 */
import { Platform } from 'react-native';
import { supabase } from './supabase';

type Lang = 'pl' | 'en' | 'uk';

let currentLang: Lang = 'pl';
let observer: MutationObserver | null = null;
let sweepTimer: ReturnType<typeof setTimeout> | null = null;
let suppress = false; // guard: ignore mutations caused by our own writes

const mem = new Map<string, string>();   // source -> translated (current lang)
const outputs = new Set<string>();        // translated values (skip re-translating)
const pending = new Set<string>();        // strings queued for translation
let flushing = false;

const LS_KEY = (lang: string) => `shiftapp_at_${lang}`;

/* ── helpers ───────────────────────────────────────────────────────── */

const HAS_LETTERS = /[a-ząęółśżźćńA-ZĄĘÓŁŚŻŹĆŃ]/;
const LOOKS_SKIPPABLE = /^(\d[\d\s.,:%/-]*|[^\p{L}]*|https?:\/\/\S+|\S+@\S+\.\S+)$/u;

function shouldTranslate(src: string): boolean {
  const s = src.trim();
  if (s.length < 2 || s.length > 800) return false;
  if (!HAS_LETTERS.test(s)) return false;
  if (LOOKS_SKIPPABLE.test(s)) return false;
  if (outputs.has(s)) return false; // already a translation output
  return true;
}

function isExcluded(el: Element | null): boolean {
  if (!el) return true;
  const tag = el.tagName;
  if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'INPUT' || tag === 'TEXTAREA') return true;
  if (el.closest('[data-notranslate], [translate="no"], .notranslate')) return true;
  return false;
}

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
  }, 800);
}

/* ── translation sources ───────────────────────────────────────────── */

async function fetchFromSharedCache(batch: string[]): Promise<string[]> {
  // Returns the strings still missing after the shared cache lookup.
  try {
    const { data } = await supabase
      .from('ui_translations')
      .select('source, translated')
      .eq('lang', currentLang)
      .in('source', batch);
    const found = new Set<string>();
    (data ?? []).forEach((r: any) => {
      mem.set(r.source, r.translated);
      outputs.add(r.translated);
      found.add(r.source);
    });
    if (found.size) saveLocalCache();
    return batch.filter((s) => !found.has(s));
  } catch {
    return batch;
  }
}

async function fetchFromGoogle(batch: string[]): Promise<void> {
  // Free gtx endpoint; conservative batching to stay under URL limits.
  const CHUNK = 15;
  for (let i = 0; i < batch.length; i += CHUNK) {
    const chunk = batch.slice(i, i + CHUNK);
    const url =
      `https://translate.googleapis.com/translate_a/t?client=gtx&sl=pl&tl=${currentLang}&format=text&` +
      chunk.map((s) => `q=${encodeURIComponent(s)}`).join('&');
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
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
      saveLocalCache();
      // Persist to the global shared cache (best effort; ignore failures/RLS).
      if (rows.length) {
        supabase
          .from('ui_translations')
          .upsert(rows.map((r) => ({ lang: currentLang, ...r })), { onConflict: 'lang,source', ignoreDuplicates: true })
          .then(() => {}, () => {});
      }
    } catch { /* network hiccup — strings stay pending for a later sweep */ }
  }
}

async function flushPending() {
  if (flushing || pending.size === 0) return;
  flushing = true;
  try {
    const batch = Array.from(pending).slice(0, 200);
    batch.forEach((s) => pending.delete(s));
    const missing = await fetchFromSharedCache(batch);
    if (missing.length) await fetchFromGoogle(missing);
    applyAll(); // apply what we've learned
  } finally {
    flushing = false;
    if (pending.size > 0) setTimeout(flushPending, 400);
  }
}

/* ── DOM sweep & apply ─────────────────────────────────────────────── */

function collectTextNodes(root: Node): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (isExcluded((node as Text).parentElement)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n: Node | null;
  while ((n = walker.nextNode())) out.push(n as Text);
  return out;
}

function applyToNode(node: Text) {
  const raw = node.nodeValue ?? '';
  const src = raw.trim();
  if (!src || !shouldTranslate(src)) return;
  const translated = mem.get(src);
  if (translated === undefined) {
    pending.add(src);
    return;
  }
  if (translated !== src) {
    suppress = true;
    node.nodeValue = raw.replace(src, translated);
    suppress = false;
  }
}

function applyPlaceholders(root: ParentNode) {
  root.querySelectorAll('input[placeholder], textarea[placeholder]').forEach((el) => {
    if (isExcluded(el)) return;
    const src = (el.getAttribute('placeholder') ?? '').trim();
    if (!src || !shouldTranslate(src)) return;
    const translated = mem.get(src);
    if (translated === undefined) { pending.add(src); return; }
    if (translated !== src) {
      suppress = true;
      el.setAttribute('placeholder', translated);
      suppress = false;
    }
  });
}

function applyAll() {
  if (currentLang === 'pl' || typeof document === 'undefined') return;
  collectTextNodes(document.body).forEach(applyToNode);
  applyPlaceholders(document);
  if (pending.size) flushPending();
}

function scheduleSweep() {
  if (sweepTimer) clearTimeout(sweepTimer);
  sweepTimer = setTimeout(applyAll, 150);
}

/* ── public API ────────────────────────────────────────────────────── */

export function initAutoTranslate(lang: Lang) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  if (observer) { observer.disconnect(); observer = null; }
  mem.clear(); outputs.clear(); pending.clear();
  currentLang = lang;
  if (lang === 'pl') return; // Polish is the source language — nothing to do

  loadLocalCache(lang);

  observer = new MutationObserver(() => {
    if (suppress) return;
    scheduleSweep();
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  scheduleSweep();
}

export function stopAutoTranslate() {
  if (observer) { observer.disconnect(); observer = null; }
}
