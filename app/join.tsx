import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Step = 'code' | 'register' | 'personal';

/* ═══════════════════════════════════════════════════════════════════════════
   WEB PORTAL — dark two-column auth design (same CSS as login)
   ═══════════════════════════════════════════════════════════════════════════ */

const JOIN_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
#sa-join{font-family:'Inter',ui-sans-serif,system-ui,sans-serif;-webkit-font-smoothing:antialiased;display:flex;min-height:100vh;width:100%;background:white;padding:14px;}
@media(min-width:1024px){#sa-join{height:100vh;overflow:hidden;}}

/* ─── LEFT: blue hero ─── */
.aj-left{width:52%;position:relative;display:none;flex-direction:column;align-items:center;justify-content:center;padding:0 48px;border-radius:24px;overflow:hidden;height:100%;flex-shrink:0;background:linear-gradient(160deg,#2563EB 0%,#1E40AF 50%,#1E3A5F 100%);}
@media(min-width:1024px){.aj-left{display:flex;}}
.aj-left::before{content:'';position:absolute;top:-30%;left:-20%;width:70%;height:70%;background:radial-gradient(circle,rgba(96,165,250,.5) 0%,transparent 65%);filter:blur(60px);pointer-events:none;}
.aj-left::after{content:'';position:absolute;bottom:-30%;right:-20%;width:70%;height:70%;background:radial-gradient(circle,rgba(37,99,235,.4) 0%,transparent 65%);filter:blur(70px);pointer-events:none;}
.aj-noise{position:absolute;inset:0;pointer-events:none;opacity:.18;mix-blend-mode:soft-light;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");background-size:200px 200px;border-radius:inherit;}
.aj-lc{position:relative;z-index:10;width:100%;max-width:320px;display:flex;flex-direction:column;gap:32px;}
.aj-brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:20px;letter-spacing:-.4px;color:white;}
.aj-mark{width:32px;height:32px;border-radius:9px;background:rgba(255,255,255,.2);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:16px;box-shadow:inset 0 1px 2px rgba(255,255,255,.3);}
.aj-heading{display:flex;flex-direction:column;text-align:center;gap:10px;}
.aj-heading h1{font-size:38px;font-weight:600;letter-spacing:-.03em;color:white;line-height:1.1;}
.aj-heading p{color:rgba(255,255,255,.65);font-size:14px;line-height:1.6;padding:0 12px;}
.aj-steps{display:flex;flex-direction:column;gap:8px;}
.aj-step{display:flex;align-items:center;gap:14px;padding:13px 16px;border-radius:12px;font-size:14px;font-weight:500;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.7);transition:all .2s;}
.aj-step.act{background:white;color:#1E3A5F;border-color:white;font-weight:600;}
.aj-step.done{background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.25);color:rgba(255,255,255,.9);}
.aj-sn{width:26px;height:26px;border-radius:9999px;background:rgba(255,255,255,.12);color:rgba(255,255,255,.5);font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.aj-step.act .aj-sn{background:#2563EB;color:white;}
.aj-step.done .aj-sn{background:rgba(255,255,255,.3);color:#1E3A5F;}
.aj-sect{font-size:12px;font-weight:700;color:#6B7280;letter-spacing:.06em;text-transform:uppercase;margin:18px 0 8px;}
.aj-opt{font-size:11px;font-weight:500;color:#9CA3AF;margin-left:4px;font-style:normal;}
.aj-check-row{display:flex;align-items:flex-start;gap:10px;margin-bottom:14px;cursor:pointer;}
.aj-check-row input[type=checkbox]{width:18px;height:18px;border-radius:5px;accent-color:#2563EB;flex-shrink:0;margin-top:2px;cursor:pointer;}
.aj-check-lbl{font-size:13px;color:#374151;line-height:1.5;}

/* ─── RIGHT: white form ─── */
.aj-right{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 24px;overflow-y:auto;}
@media(min-width:640px){.aj-right{padding:48px 48px;}}
@media(min-width:1024px){.aj-right{padding:24px 64px;}}
.aj-form{width:100%;max-width:420px;display:flex;flex-direction:column;gap:0;}
.aj-fh{font-size:28px;font-weight:700;letter-spacing:-.03em;color:#111827;margin-bottom:6px;}
.aj-fs{font-size:14px;color:#6B7280;margin-bottom:24px;line-height:1.5;}
.aj-field{margin-bottom:14px;}
.aj-lbl{display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;}
.aj-in{width:100%;background:#F9FAFB;border:1.5px solid #E5E7EB;border-radius:12px;height:48px;padding:0 16px;color:#111827;font-size:14px;font-family:inherit;outline:none;transition:all .2s;}
.aj-in:hover{border-color:#D1D5DB;}
.aj-in:focus{background:white;border-color:#2563EB;box-shadow:0 0 0 3px rgba(37,99,235,.1);}
.aj-in::placeholder{color:#9CA3AF;}
.aj-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;}
.aj-code{width:100%;background:#F9FAFB;border:2px solid #E5E7EB;border-radius:16px;height:72px;text-align:center;font-size:32px;font-weight:800;color:#111827;letter-spacing:8px;font-family:inherit;outline:none;transition:all .2s;}
.aj-code:focus{background:white;border-color:#2563EB;box-shadow:0 0 0 4px rgba(37,99,235,.1);}
.aj-code::placeholder{font-size:16px;letter-spacing:2px;font-weight:500;color:#9CA3AF;}
.aj-sub{width:100%;height:52px;background:#2563EB;color:white;border:none;border-radius:12px;font-size:15px;font-weight:600;margin-top:16px;cursor:pointer;transition:all .15s;font-family:inherit;box-shadow:0 4px 14px rgba(37,99,235,.3);}
.aj-sub:hover{background:#1d4ed8;box-shadow:0 6px 20px rgba(37,99,235,.4);transform:translateY(-1px);}
.aj-sub:active{transform:scale(0.98);}
.aj-sub:disabled{opacity:.5;cursor:not-allowed;transform:none;}
.aj-back{display:inline-flex;align-items:center;gap:6px;background:none;border:none;color:#9CA3AF;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;margin-bottom:28px;padding:0;transition:color .2s;}
.aj-back:hover{color:#111827;}
.aj-back svg{width:16px;height:16px;}
.aj-err{background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:12px 14px;font-size:13px;color:#DC2626;margin-bottom:14px;display:flex;align-items:center;gap:10px;font-weight:500;}
.aj-hint{background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:14px;font-size:13px;color:#1d4ed8;margin-top:16px;line-height:1.5;}
.aj-ok{background:#F0FDF4;border:1px solid #BBF7D0;border-radius:14px;padding:16px;display:flex;align-items:flex-start;gap:12px;margin-bottom:20px;}
.aj-ok-ico{width:24px;height:24px;border-radius:9999px;background:#16A34A;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:white;font-size:14px;font-weight:700;}
.aj-ok-name{font-size:15px;font-weight:700;color:#166534;}
.aj-ok-role{font-size:12px;color:#16a34a;font-weight:500;margin-top:2px;}
.aj-fl{color:#2563EB;font-weight:600;background:none;border:none;cursor:pointer;font-family:inherit;font-size:14px;}
.aj-fl:hover{text-decoration:underline;}
.aj-fr{margin-top:20px;text-align:center;font-size:14px;color:#6B7280;}
`;

const ERR_ICO = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
const CHECK_ICO = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;

function buildJoinPortal(step: Step, loading: boolean, err: string, restaurantName: string, jobTitle: string) {
  const leftSteps = `
    <div class="aj-steps">
      <div class="aj-step ${step === 'code' ? 'act' : (step === 'register' || step === 'personal' ? 'done' : '')}"><div class="aj-sn">${step === 'register' || step === 'personal' ? '✓' : '1'}</div><span>Kod aktywacyjny</span></div>
      <div class="aj-step ${step === 'register' ? 'act' : (step === 'personal' ? 'done' : '')}"><div class="aj-sn">${step === 'personal' ? '✓' : '2'}</div><span>Utwórz konto</span></div>
      <div class="aj-step ${step === 'personal' ? 'act' : ''}"><div class="aj-sn">3</div><span>Dane osobowe</span></div>
    </div>`;

  const codeForm = `
    <div class="aj-form">
      <button class="aj-back" data-action="back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="15 18 9 12 15 6"/></svg>Powrót</button>
      <div class="aj-fh">Dołącz do restauracji</div>
      <div class="aj-fs">Wpisz kod aktywacyjny od pracodawcy.</div>
      ${err ? `<div class="aj-err">${ERR_ICO}${err}</div>` : ''}
      <div class="aj-field"><label class="aj-lbl">Kod aktywacyjny</label>
        <input class="aj-code" id="aj-code" type="text" placeholder="np. CAFE47" maxlength="8" autocomplete="off" autocapitalize="characters"/>
      </div>
      <button class="aj-sub" data-action="verify" ${loading ? 'disabled' : ''}>${loading ? 'Sprawdzanie…' : 'Sprawdź kod →'}</button>
      <div class="aj-hint">💡 Kod aktywacyjny otrzymujesz od właściciela lub kierownika restauracji. Składa się z 6 znaków (np. CAFE47).</div>
      <div class="aj-fr">Masz już konto? <button class="aj-fl" data-action="login">Zaloguj się</button></div>
    </div>`;

  const registerForm = `
    <div class="aj-form">
      <button class="aj-back" data-action="backToCode"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="15 18 9 12 15 6"/></svg>Zmień kod</button>
      <div class="aj-ok"><div class="aj-ok-ico">${CHECK_ICO}</div><div><div class="aj-ok-name">${restaurantName}</div><div class="aj-ok-role">Stanowisko: ${jobTitle}</div></div></div>
      <div class="aj-fh">Utwórz konto</div>
      <div class="aj-fs">Uzupełnij dane logowania, aby dołączyć do zespołu.</div>
      ${err ? `<div class="aj-err">${ERR_ICO}${err}</div>` : ''}
      <div class="aj-row">
        <div class="aj-field"><label class="aj-lbl">Imię</label><input class="aj-in" id="aj-fn" type="text" placeholder="Anna" autocapitalize="words"/></div>
        <div class="aj-field"><label class="aj-lbl">Nazwisko</label><input class="aj-in" id="aj-ln" type="text" placeholder="Nowak" autocapitalize="words"/></div>
      </div>
      <div class="aj-field"><label class="aj-lbl">E-mail</label><input class="aj-in" id="aj-em" type="email" placeholder="anna@email.pl" autocomplete="email"/></div>
      <div class="aj-field"><label class="aj-lbl">Hasło</label><input class="aj-in" id="aj-pw" type="password" placeholder="Minimum 6 znaków" autocomplete="new-password"/></div>
      <button class="aj-sub" data-action="register" ${loading ? 'disabled' : ''}>${loading ? 'Tworzenie konta…' : 'Dalej: dane osobowe →'}</button>
    </div>`;

  const personalForm = `
    <div class="aj-form">
      <div class="aj-fh">Dane osobowe</div>
      <div class="aj-fs">Uzupełnij wszystkie dane kadrowe. Są one wymagane do zatrudnienia.</div>
      ${err ? `<div class="aj-err">${ERR_ICO}${err}</div>` : ''}

      <div class="aj-sect">Dane kontaktowe</div>
      <div class="aj-row">
        <div class="aj-field"><label class="aj-lbl">Telefon *</label><input class="aj-in" id="aj-phone" type="tel" placeholder="+48 500 000 000"/></div>
        <div class="aj-field"><label class="aj-lbl">Data urodzenia *</label><input class="aj-in" id="aj-birth" type="date"/></div>
      </div>
      <div class="aj-field"><label class="aj-lbl">Adres zamieszkania *</label><input class="aj-in" id="aj-addr" type="text" placeholder="ul. Kwiatowa 1, 00-001 Warszawa"/></div>

      <div class="aj-sect">Dokumenty tożsamości</div>
      <div class="aj-row">
        <div class="aj-field"><label class="aj-lbl">PESEL *</label><input class="aj-in" id="aj-pesel" type="text" placeholder="00000000000" maxlength="11"/></div>
        <div class="aj-field"><label class="aj-lbl">Obywatelstwo *</label><input class="aj-in" id="aj-citizen" type="text" placeholder="polskie"/></div>
      </div>
      <div class="aj-row">
        <div class="aj-field"><label class="aj-lbl">Seria i nr dowodu *</label><input class="aj-in" id="aj-idnum" type="text" placeholder="ABC 123456"/></div>
        <div class="aj-field"><label class="aj-lbl">Nr legitymacji <em class="aj-opt">(opcjonalnie)</em></label><input class="aj-in" id="aj-idcard" type="text" placeholder="np. 1234567"/></div>
      </div>

      <div class="aj-sect">Dane bankowe</div>
      <div class="aj-field"><label class="aj-lbl">Numer rachunku bankowego *</label><input class="aj-in" id="aj-iban" type="text" placeholder="PL 00 0000 0000 0000 0000 0000 0000"/></div>
      <div class="aj-field"><label class="aj-lbl">Nazwa banku *</label><input class="aj-in" id="aj-bank" type="text" placeholder="np. PKO BP"/></div>

      <div class="aj-sect">Dane kadrowe</div>
      <div class="aj-row">
        <div class="aj-field"><label class="aj-lbl">Oddział NFZ *</label><input class="aj-in" id="aj-nfz" type="text" placeholder="np. Mazowiecki"/></div>
        <div class="aj-field"><label class="aj-lbl">Urząd skarbowy *</label><input class="aj-in" id="aj-tax" type="text" placeholder="np. US Warszawa-Śródmieście"/></div>
      </div>
      <label class="aj-check-row">
        <input type="checkbox" id="aj-pit" />
        <span class="aj-check-lbl">Wyrażam zgodę na przesyłanie PIT elektronicznie (e-PIT)</span>
      </label>

      <button class="aj-sub" data-action="savePersonal" ${loading ? 'disabled' : ''}>${loading ? 'Zapisywanie…' : `Dołącz do ${restaurantName} →`}</button>
    </div>`;

  const headingMap: Record<Step, string> = { code: 'Dołącz do zespołu', register: 'Prawie gotowe', personal: 'Ostatni krok' };
  const subMap: Record<Step, string> = { code: 'Wpisz kod aktywacyjny i dołącz do restauracji w kilka sekund.', register: 'Uzupełnij dane logowania i przejdź do danych osobowych.', personal: 'Wszystkie dane są wymagane do zatrudnienia.' };
  const formMap: Record<Step, string> = { code: codeForm, register: registerForm, personal: personalForm };

  return `
  <div class="aj-left">
    <div class="aj-noise"></div>
    <div class="aj-lc">
      <div class="aj-brand"><div class="aj-mark">S</div><span>ShiftApp</span></div>
      <div class="aj-heading">
        <h1>${headingMap[step]}</h1>
        <p>${subMap[step]}</p>
      </div>
      ${leftSteps}
    </div>
  </div>
  <div class="aj-right">
    ${formMap[step]}
  </div>`;
}

export default function JoinScreen() {
  const router = useRouter();
  const { joinWithCode, isLoading, refreshUser } = useAuth();
  const { showAlert } = useAlert();

  const [step, setStep] = useState<Step>('code');
  const [code, setCode] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [pendingUserId, setPendingUserId] = useState('');

  /* ── WEB: portal ── */
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const portal = document.createElement('div');
    portal.id = 'sa-join';

    let styleEl = document.getElementById('sa-join-css') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'sa-join-css';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = JOIN_CSS;

    const hidden: { el: HTMLElement; d: string }[] = [];
    Array.from(document.body.children).forEach((c) => {
      const el = c as HTMLElement;
      if (['SCRIPT','STYLE','LINK'].includes(el.tagName) || el.id === 'sa-join') return;
      hidden.push({ el, d: el.style.display || '' });
      el.style.display = 'none';
    });

    const html = document.documentElement;
    const body = document.body;
    const orig = { ho: html.style.overflow, hh: html.style.height, bo: body.style.overflow, bh: body.style.height, bg: body.style.background };
    html.style.overflow = 'auto'; html.style.height = 'auto';
    body.style.overflow = 'auto'; body.style.height = 'auto';
    body.style.background = '#ffffff';

    let currentStep: Step = 'code';
    let currentCode = '';
    let currentRestaurant = '';
    let currentJob = '';
    let pendingUID = '';

    const render = (s: Step, loading: boolean, err: string, rn: string, jt: string) => {
      portal.innerHTML = buildJoinPortal(s, loading, err, rn, jt);
      if (s === 'code') {
        setTimeout(() => {
          const el = portal.querySelector('#aj-code') as HTMLInputElement;
          if (el) { el.value = currentCode; el.focus(); }
        }, 0);
      }
    };

    render(currentStep, false, '', '', '');
    document.body.appendChild(portal);

    const handler = async (e: Event) => {
      const trigger = (e.target as HTMLElement).closest?.('[data-action]') as HTMLElement | null;
      if (!trigger) return;
      const action = trigger.getAttribute('data-action');

      if (action === 'back') { router.push('/landing' as any); return; }
      if (action === 'login') { router.push('/login' as any); return; }

      if (action === 'backToCode') {
        currentStep = 'code';
        render(currentStep, false, '', '', '');
        return;
      }

      if (action === 'verify') {
        const codeEl = portal.querySelector('#aj-code') as HTMLInputElement;
        const cleaned = (codeEl?.value || '').trim().toUpperCase();
        currentCode = cleaned;
        if (cleaned.length < 4) {
          render(currentStep, false, 'Wpisz kod aktywacyjny (minimum 4 znaki).', '', '');
          setTimeout(() => { const el = portal.querySelector('#aj-code') as HTMLInputElement; if (el) el.value = cleaned; }, 0);
          return;
        }
        render(currentStep, true, '', '', '');
        const { data, error } = await supabase.rpc('accept_invitation', { p_code: cleaned });
        if (error || !data || data.error) {
          render(currentStep, false, data?.error ?? 'Kod nie istnieje lub wygasł. Poproś pracodawcę o nowy.', '', '');
          setTimeout(() => { const el = portal.querySelector('#aj-code') as HTMLInputElement; if (el) el.value = cleaned; }, 0);
          return;
        }
        currentRestaurant = data.restaurant_name ?? '';
        currentJob = data.job_title ?? '';
        currentStep = 'register';
        render(currentStep, false, '', currentRestaurant, currentJob);
        return;
      }

      if (action === 'register') {
        const fn = (portal.querySelector('#aj-fn') as HTMLInputElement)?.value?.trim() || '';
        const ln = (portal.querySelector('#aj-ln') as HTMLInputElement)?.value?.trim() || '';
        const em = (portal.querySelector('#aj-em') as HTMLInputElement)?.value?.trim() || '';
        const pw = (portal.querySelector('#aj-pw') as HTMLInputElement)?.value?.trim() || '';
        if (!fn || !ln || !em || !pw) {
          render(currentStep, false, 'Wszystkie pola są wymagane.', currentRestaurant, currentJob);
          setTimeout(() => {
            const f = portal.querySelector('#aj-fn') as HTMLInputElement;
            const l = portal.querySelector('#aj-ln') as HTMLInputElement;
            const eEl = portal.querySelector('#aj-em') as HTMLInputElement;
            const p = portal.querySelector('#aj-pw') as HTMLInputElement;
            if (f) f.value = fn; if (l) l.value = ln; if (eEl) eEl.value = em; if (p) p.value = pw;
          }, 0);
          return;
        }
        if (!EMAIL_REGEX.test(em)) {
          render(currentStep, false, 'Podaj poprawny adres e-mail.', currentRestaurant, currentJob);
          return;
        }
        if (pw.length < 6) {
          render(currentStep, false, 'Hasło musi mieć minimum 6 znaków.', currentRestaurant, currentJob);
          return;
        }
        render(currentStep, true, '', currentRestaurant, currentJob);
        const uid = await joinWithCode(currentCode, { firstName: fn, lastName: ln, email: em, password: pw });
        if (uid) {
          pendingUID = typeof uid === 'string' ? uid : '';
          currentStep = 'personal';
          render(currentStep, false, '', currentRestaurant, currentJob);
        } else {
          render(currentStep, false, 'Nie udało się dołączyć. Sprawdź dane i spróbuj ponownie.', currentRestaurant, currentJob);
          setTimeout(() => {
            const f = portal.querySelector('#aj-fn') as HTMLInputElement;
            const l = portal.querySelector('#aj-ln') as HTMLInputElement;
            const eEl = portal.querySelector('#aj-em') as HTMLInputElement;
            if (f) f.value = fn; if (l) l.value = ln; if (eEl) eEl.value = em;
          }, 0);
        }
        return;
      }

      if (action === 'savePersonal') {
        const phone = (portal.querySelector('#aj-phone') as HTMLInputElement)?.value?.trim() || '';
        const birth = (portal.querySelector('#aj-birth') as HTMLInputElement)?.value?.trim() || '';
        const addr = (portal.querySelector('#aj-addr') as HTMLInputElement)?.value?.trim() || '';
        const pesel = (portal.querySelector('#aj-pesel') as HTMLInputElement)?.value?.trim() || '';
        const citizen = (portal.querySelector('#aj-citizen') as HTMLInputElement)?.value?.trim() || '';
        const idnum = (portal.querySelector('#aj-idnum') as HTMLInputElement)?.value?.trim() || '';
        const idcard = (portal.querySelector('#aj-idcard') as HTMLInputElement)?.value?.trim() || null;
        const iban = (portal.querySelector('#aj-iban') as HTMLInputElement)?.value?.trim().replace(/\s/g,'') || '';
        const bank = (portal.querySelector('#aj-bank') as HTMLInputElement)?.value?.trim() || '';
        const nfz = (portal.querySelector('#aj-nfz') as HTMLInputElement)?.value?.trim() || '';
        const tax = (portal.querySelector('#aj-tax') as HTMLInputElement)?.value?.trim() || '';
        const pit = (portal.querySelector('#aj-pit') as HTMLInputElement)?.checked ?? false;
        if (!phone || !birth || !addr || !pesel || !citizen || !idnum || !iban || !bank || !nfz || !tax) {
          render(currentStep, false, 'Uzupełnij wszystkie wymagane pola (oznaczone *).', currentRestaurant, currentJob);
          return;
        }
        if (pesel.length !== 11) {
          render(currentStep, false, 'PESEL musi mieć dokładnie 11 cyfr.', currentRestaurant, currentJob);
          return;
        }
        render(currentStep, true, '', currentRestaurant, currentJob);
        if (pendingUID) {
          await supabase.from('profiles').update({
            phone, birth_date: birth || null, address: addr, pesel, citizenship: citizen,
            id_series_number: idnum, id_card_number: idcard,
            bank_account_number: iban, bank_name: bank,
            nfz_branch: nfz, tax_office: tax, pit_electronic: pit,
          }).eq('id', pendingUID);
        }
        await refreshUser();
        router.replace('/(tabs)/dashboard');
        return;
      }
    };

    portal.addEventListener('click', handler);

    const inputHandler = (e: Event) => {
      const input = e.target as HTMLInputElement;
      if (input.id === 'aj-code') {
        input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        currentCode = input.value;
      }
    };
    portal.addEventListener('input', inputHandler);

    return () => {
      portal.removeEventListener('click', handler);
      portal.removeEventListener('input', inputHandler);
      portal.remove();
      styleEl?.remove();
      hidden.forEach(({ el, d }) => { el.style.display = d; });
      html.style.overflow = orig.ho; html.style.height = orig.hh;
      body.style.overflow = orig.bo; body.style.height = orig.bh;
      body.style.background = orig.bg;
    };
  }, []);

  /* ── MOBILE fallback ── */
  if (Platform.OS !== 'web') {
    const [mStep, setMStep] = useState<Step>('code');
    const [mCode, setMCode] = useState('');
    const [mRestaurant, setMRestaurant] = useState('');
    const [mJob, setMJob] = useState('');
    const [mFn, setMFn] = useState('');
    const [mLn, setMLn] = useState('');
    const [mEmail, setMEmail] = useState('');
    const [mPw, setMPw] = useState('');
    const [mUID, setMUID] = useState('');
    // personal fields
    const [mPhone, setMPhone] = useState('');
    const [mBirth, setMBirth] = useState('');
    const [mAddr, setMAddr] = useState('');
    const [mPesel, setMPesel] = useState('');
    const [mCitizen, setMCitizen] = useState('');
    const [mIdNum, setMIdNum] = useState('');
    const [mIdCard, setMIdCard] = useState('');
    const [mIban, setMIban] = useState('');
    const [mBank, setMBank] = useState('');
    const [mNfz, setMNfz] = useState('');
    const [mTax, setMTax] = useState('');
    const [mPit, setMPit] = useState(false);

    const verifyCode = async () => {
      const cleaned = mCode.trim().toUpperCase();
      if (cleaned.length < 4) { showAlert('Błąd', 'Wpisz kod aktywacyjny.'); return; }
      const { data, error } = await supabase.rpc('accept_invitation', { p_code: cleaned });
      if (error || !data || data.error) { showAlert('Błąd', data?.error ?? 'Kod nieważny.'); return; }
      setMRestaurant(data.restaurant_name ?? '');
      setMJob(data.job_title ?? '');
      setMStep('register');
    };

    const register = async () => {
      if (!mFn.trim() || !mLn.trim() || !mEmail.trim() || !mPw.trim()) { showAlert('Błąd', 'Uzupełnij wszystkie pola.'); return; }
      if (!EMAIL_REGEX.test(mEmail.trim())) { showAlert('Nieprawidłowy e-mail', 'Podaj poprawny adres e-mail.'); return; }
      if (mPw.trim().length < 6) { showAlert('Za krótkie hasło', 'Hasło musi mieć minimum 6 znaków.'); return; }
      const uid = await joinWithCode(mCode.trim().toUpperCase(), { firstName: mFn.trim(), lastName: mLn.trim(), email: mEmail.trim(), password: mPw.trim() });
      if (uid) { setMUID(uid); setMStep('personal'); }
      else { showAlert('Błąd', 'Nie udało się dołączyć. Spróbuj ponownie.'); }
    };

    const savePersonal = async () => {
      if (!mPhone.trim() || !mBirth.trim() || !mAddr.trim() || !mPesel.trim() || !mCitizen.trim() || !mIdNum.trim() || !mIban.trim() || !mBank.trim() || !mNfz.trim() || !mTax.trim()) {
        showAlert('Brakujące dane', 'Uzupełnij wszystkie wymagane pola.');
        return;
      }
      if (mPesel.trim().length !== 11) {
        showAlert('Nieprawidłowy PESEL', 'PESEL musi mieć dokładnie 11 cyfr.');
        return;
      }
      if (mUID) {
        await supabase.from('profiles').update({
          phone: mPhone.trim(),
          birth_date: mBirth.trim(),
          address: mAddr.trim(),
          pesel: mPesel.trim(),
          citizenship: mCitizen.trim(),
          id_series_number: mIdNum.trim(),
          id_card_number: mIdCard.trim() || null,
          bank_account_number: mIban.replace(/\s/g, ''),
          bank_name: mBank.trim(),
          nfz_branch: mNfz.trim(),
          tax_office: mTax.trim(),
          pit_electronic: mPit,
        }).eq('id', mUID);
      }
      await refreshUser();
      router.replace('/(tabs)/dashboard');
    };

    return (
      <SafeAreaView style={mob.safe} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={mob.form} keyboardShouldPersistTaps="handled">
            {mStep === 'code' && (
              <>
                <Text style={mob.title}>Dołącz do restauracji</Text>
                <Text style={mob.sub}>Wpisz kod aktywacyjny od pracodawcy.</Text>
                <Text style={mob.lbl}>Kod aktywacyjny</Text>
                <TextInput style={[mob.input, { textAlign: 'center', fontSize: 24, letterSpacing: 6, fontWeight: '800' }]} placeholder="CAFE47" placeholderTextColor="#94a3b8" value={mCode} onChangeText={v => setMCode(v.toUpperCase())} autoCapitalize="characters" maxLength={8} />
                <TouchableOpacity style={mob.btn} onPress={verifyCode} disabled={isLoading} activeOpacity={0.88}>
                  {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={mob.btnTxt}>Sprawdź kod →</Text>}
                </TouchableOpacity>
              </>
            )}
            {mStep === 'register' && (
              <>
                <Text style={mob.title}>Utwórz konto</Text>
                <Text style={mob.sub}>{mRestaurant} · {mJob}</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={mob.lbl}>Imię</Text>
                    <TextInput style={mob.input} placeholder="Anna" placeholderTextColor="#94a3b8" value={mFn} onChangeText={setMFn} autoCapitalize="words" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={mob.lbl}>Nazwisko</Text>
                    <TextInput style={mob.input} placeholder="Nowak" placeholderTextColor="#94a3b8" value={mLn} onChangeText={setMLn} autoCapitalize="words" />
                  </View>
                </View>
                <Text style={mob.lbl}>E-mail</Text>
                <TextInput style={mob.input} placeholder="anna@email.pl" placeholderTextColor="#94a3b8" value={mEmail} onChangeText={setMEmail} keyboardType="email-address" autoCapitalize="none" />
                <Text style={mob.lbl}>Hasło</Text>
                <TextInput style={mob.input} placeholder="Minimum 6 znaków" placeholderTextColor="#94a3b8" value={mPw} onChangeText={setMPw} secureTextEntry />
                <TouchableOpacity style={mob.btn} onPress={register} disabled={isLoading} activeOpacity={0.88}>
                  {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={mob.btnTxt}>Dalej: dane osobowe →</Text>}
                </TouchableOpacity>
              </>
            )}
            {mStep === 'personal' && (
              <>
                <Text style={mob.title}>Dane osobowe</Text>
                <Text style={mob.sub}>Wszystkie pola są wymagane do zatrudnienia.</Text>
                <Text style={mob.sect}>Dane kontaktowe</Text>
                <Text style={mob.lbl}>Telefon *</Text>
                <TextInput style={mob.input} placeholder="+48 500 000 000" placeholderTextColor="#94a3b8" value={mPhone} onChangeText={setMPhone} keyboardType="phone-pad" />
                <Text style={mob.lbl}>Data urodzenia * (RRRR-MM-DD)</Text>
                <TextInput style={mob.input} placeholder="1990-01-15" placeholderTextColor="#94a3b8" value={mBirth} onChangeText={setMBirth} />
                <Text style={mob.lbl}>Adres zamieszkania *</Text>
                <TextInput style={mob.input} placeholder="ul. Kwiatowa 1, 00-001 Warszawa" placeholderTextColor="#94a3b8" value={mAddr} onChangeText={setMAddr} />
                <Text style={mob.sect}>Dokumenty tożsamości</Text>
                <Text style={mob.lbl}>PESEL *</Text>
                <TextInput style={mob.input} placeholder="00000000000" placeholderTextColor="#94a3b8" value={mPesel} onChangeText={setMPesel} keyboardType="number-pad" maxLength={11} />
                <Text style={mob.lbl}>Obywatelstwo *</Text>
                <TextInput style={mob.input} placeholder="polskie" placeholderTextColor="#94a3b8" value={mCitizen} onChangeText={setMCitizen} />
                <Text style={mob.lbl}>Seria i nr dowodu *</Text>
                <TextInput style={mob.input} placeholder="ABC 123456" placeholderTextColor="#94a3b8" value={mIdNum} onChangeText={setMIdNum} autoCapitalize="characters" />
                <Text style={mob.lbl}>Nr legitymacji (opcjonalnie)</Text>
                <TextInput style={mob.input} placeholder="np. 1234567" placeholderTextColor="#94a3b8" value={mIdCard} onChangeText={setMIdCard} />
                <Text style={mob.sect}>Dane bankowe</Text>
                <Text style={mob.lbl}>Numer rachunku bankowego *</Text>
                <TextInput style={mob.input} placeholder="PL00 0000 0000 0000 0000 0000 0000" placeholderTextColor="#94a3b8" value={mIban} onChangeText={setMIban} />
                <Text style={mob.lbl}>Nazwa banku *</Text>
                <TextInput style={mob.input} placeholder="np. PKO BP" placeholderTextColor="#94a3b8" value={mBank} onChangeText={setMBank} />
                <Text style={mob.sect}>Dane kadrowe</Text>
                <Text style={mob.lbl}>Oddział NFZ *</Text>
                <TextInput style={mob.input} placeholder="np. Mazowiecki" placeholderTextColor="#94a3b8" value={mNfz} onChangeText={setMNfz} />
                <Text style={mob.lbl}>Urząd skarbowy *</Text>
                <TextInput style={mob.input} placeholder="np. US Warszawa-Śródmieście" placeholderTextColor="#94a3b8" value={mTax} onChangeText={setMTax} />
                <TouchableOpacity style={mob.checkRow} onPress={() => setMPit(!mPit)} activeOpacity={0.7}>
                  <View style={[mob.checkbox, mPit && mob.checkboxChecked]}>
                    {mPit && <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>✓</Text>}
                  </View>
                  <Text style={mob.checkLbl}>Zgoda na przesyłanie PIT elektronicznie (e-PIT)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={mob.btn} onPress={savePersonal} disabled={isLoading} activeOpacity={0.88}>
                  {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={mob.btnTxt}>Dołącz do {mRestaurant} →</Text>}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return null;
}

const mob = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  form: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40, flexGrow: 1, justifyContent: 'center', gap: 4 },
  title: { fontSize: 26, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  sub: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  sect: { fontSize: 11, fontWeight: '700', color: '#6B7280', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 20, marginBottom: 4 },
  lbl: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#f8fafc', borderRadius: 12, height: 44, paddingHorizontal: 14, fontSize: 14, color: '#0f172a', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  btn: { marginTop: 24, height: 52, backgroundColor: '#0084FF', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { color: '#fff', fontSize: 15, fontWeight: '600' },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 16, marginBottom: 4 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: '#D1D5DB', backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  checkboxChecked: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  checkLbl: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 18 },
});
