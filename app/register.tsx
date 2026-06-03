import { Ionicons } from '@expo/vector-icons';
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
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import { theme } from '../styles/theme';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ═══════════════════════════════════════════════════════════════════════════
   WEB PORTAL — same design as login (dark two-column)
   ═══════════════════════════════════════════════════════════════════════════ */

const REG_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
#sa-register{font-family:'Inter',ui-sans-serif,system-ui,sans-serif;-webkit-font-smoothing:antialiased;display:flex;min-height:100vh;width:100%;background:white;padding:14px;transition:all .5s;}
@media(min-width:1024px){#sa-register{height:100vh;overflow:hidden;}}

.al-left{width:52%;position:relative;display:none;flex-direction:column;align-items:center;justify-content:center;padding:0 48px;border-radius:24px;overflow:hidden;height:100%;flex-shrink:0;background:linear-gradient(160deg,#2563EB 0%,#1E40AF 50%,#1E3A5F 100%);}
@media(min-width:1024px){.al-left{display:flex;}}
.al-left::before{content:'';position:absolute;top:-30%;left:-20%;width:70%;height:70%;background:radial-gradient(circle,rgba(96,165,250,.5) 0%,transparent 65%);filter:blur(60px);pointer-events:none;}
.al-left::after{content:'';position:absolute;bottom:-30%;right:-20%;width:70%;height:70%;background:radial-gradient(circle,rgba(37,99,235,.4) 0%,transparent 65%);filter:blur(70px);pointer-events:none;}
.al-noise{position:absolute;inset:0;pointer-events:none;opacity:.18;mix-blend-mode:soft-light;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");background-size:200px 200px;border-radius:inherit;}
.al-lc{position:relative;z-index:10;width:100%;max-width:320px;display:flex;flex-direction:column;gap:32px;}
.al-brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:20px;letter-spacing:-.4px;color:white;}
.al-mark{width:32px;height:32px;border-radius:9px;background:rgba(255,255,255,.2);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:16px;box-shadow:inset 0 1px 2px rgba(255,255,255,.3);}
.al-heading{display:flex;flex-direction:column;text-align:center;gap:10px;}
.al-heading h1{font-size:38px;font-weight:600;letter-spacing:-.03em;color:white;line-height:1.1;}
.al-heading p{color:rgba(255,255,255,.65);font-size:14px;line-height:1.6;padding:0 12px;}
.al-steps{display:flex;flex-direction:column;gap:8px;}
.al-step{display:flex;align-items:center;gap:14px;padding:13px 16px;border-radius:12px;font-size:14px;font-weight:500;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.7);transition:all .2s;}
.al-step.act{background:white;color:#1E3A5F;border-color:white;font-weight:600;}
.al-sn{width:26px;height:26px;border-radius:9999px;background:rgba(255,255,255,.12);color:rgba(255,255,255,.5);font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.al-step.act .al-sn{background:#2563EB;color:white;}

.al-right{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 24px;overflow-y:auto;}
@media(min-width:640px){.al-right{padding:48px 48px;}}
@media(min-width:1024px){.al-right{padding:24px 64px;}}
@media(min-width:1280px){.al-right{padding:24px 96px;}}
.al-form{width:100%;max-width:420px;display:flex;flex-direction:column;gap:24px;}

.al-form-header{display:flex;flex-direction:column;gap:6px;}
.al-fh{font-size:28px;font-weight:700;letter-spacing:-.03em;color:#111827;}
.al-fs{font-size:14px;color:#6B7280;line-height:1.5;}

.al-fields{display:flex;flex-direction:column;gap:14px;}
.al-field{display:flex;flex-direction:column;gap:6px;}
.al-lbl{font-size:13px;font-weight:600;color:#374151;}
.al-in{width:100%;background:#F9FAFB;border:1.5px solid #E5E7EB;border-radius:12px;height:48px;padding:0 16px;color:#111827;font-size:14px;font-family:inherit;outline:none;transition:all .2s;}
.al-in:hover{border-color:#D1D5DB;}
.al-in:focus{background:white;border-color:#2563EB;box-shadow:0 0 0 3px rgba(37,99,235,.1);}
.al-in::placeholder{color:#9CA3AF;}
.al-pw{position:relative;}
.al-pw .al-in{padding-right:48px;}
.al-eye{position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#9CA3AF;display:flex;align-items:center;padding:4px;border-radius:6px;transition:all .2s;}
.al-eye:hover{color:#374151;background:rgba(0,0,0,.04);}
.al-eye svg{width:18px;height:18px;}

.al-sub{width:100%;height:52px;background:#2563EB;color:white;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;transition:all .15s;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 14px rgba(37,99,235,.3);}
.al-sub:hover{background:#1d4ed8;box-shadow:0 6px 20px rgba(37,99,235,.4);transform:translateY(-1px);}
.al-sub:active{transform:scale(0.98);}
.al-sub:disabled{opacity:.5;cursor:not-allowed;transform:none;}

.al-back{width:100%;height:44px;background:transparent;color:#6B7280;border:1.5px solid #E5E7EB;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;transition:all .15s;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px;}
.al-back:hover{border-color:#D1D5DB;background:#F9FAFB;}

.al-err{background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:12px 14px;font-size:13px;color:#DC2626;display:flex;align-items:center;gap:10px;font-weight:500;}
.al-err svg{flex-shrink:0;}

.al-footer{text-align:center;font-size:14px;color:#6B7280;}
.al-fl{color:#2563EB;font-weight:600;background:none;border:none;cursor:pointer;font-family:inherit;font-size:14px;}
.al-fl:hover{text-decoration:underline;}
`;

const EYE_OPEN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_OFF  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
const ERR_ICO  = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

function buildStep1(loading: boolean, err: string) {
  return `
  <div class="al-left">
    <div class="al-noise"></div>
    <div class="al-lc">
      <div class="al-brand"><div class="al-mark">S</div><span>ShiftApp</span></div>
      <div class="al-heading">
        <h1>Zarejestruj restaurację</h1>
        <p>Stwórz konto i zacznij zarządzać zespołem w kilka minut.</p>
      </div>
      <div class="al-steps">
        <div class="al-step act"><div class="al-sn">1</div><span>Dane restauracji</span></div>
        <div class="al-step"><div class="al-sn">2</div><span>Konto właściciela</span></div>
        <div class="al-step"><div class="al-sn">3</div><span>Gotowe!</span></div>
      </div>
    </div>
  </div>
  <div class="al-right">
    <div class="al-form">
      <div class="al-form-header">
        <div class="al-fh">Dane restauracji</div>
        <div class="al-fs">Podaj podstawowe informacje o swoim lokalu. Krok 1 z 2.</div>
      </div>

      ${err ? `<div class="al-err">${ERR_ICO}${err}</div>` : ''}

      <div class="al-fields">
        <div class="al-field"><label class="al-lbl">Nazwa restauracji *</label><input class="al-in" id="ar-name" type="text" placeholder="np. Trattoria Bella"/></div>
        <div class="al-field"><label class="al-lbl">Adres</label><input class="al-in" id="ar-addr" type="text" placeholder="np. ul. Marszałkowska 1, Warszawa"/></div>
        <div class="al-field"><label class="al-lbl">Telefon</label><input class="al-in" id="ar-phone" type="tel" placeholder="np. 500 600 700"/></div>
      </div>

      <button class="al-sub" data-action="next" ${loading ? 'disabled' : ''}>Dalej →</button>
      <button class="al-back" data-action="back-login" type="button">← Wróć do logowania</button>

      <div class="al-footer">
        Masz już konto? <button class="al-fl" data-action="login" type="button">Zaloguj się</button>
      </div>
      <button data-action="help" type="button" style="margin-top:16px;width:100%;padding:14px 16px;background:#F0F9FF;border-radius:12px;border:1px solid #BAE6FD;display:flex;align-items:center;gap:10px;cursor:pointer;">
        <div style="width:36px;height:36px;border-radius:10px;background:#DBEAFE;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0284C7" stroke-width="1.5"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
        </div>
        <div style="flex:1;text-align:left;"><div style="font-size:13px;font-weight:700;color:#0369A1;">Potrzebujesz pomocy?</div><div style="font-size:12px;color:#0284C7;font-weight:500;">Centrum pomocy &nbsp;·&nbsp; FAQ &nbsp;·&nbsp; Kontakt</div></div>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#0284C7" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  </div>`;
}

function buildStep2(showPw: boolean, loading: boolean, err: string) {
  return `
  <div class="al-left">
    <div class="al-noise"></div>
    <div class="al-lc">
      <div class="al-brand"><div class="al-mark">S</div><span>ShiftApp</span></div>
      <div class="al-heading">
        <h1>Zarejestruj restaurację</h1>
        <p>Stwórz konto i zacznij zarządzać zespołem w kilka minut.</p>
      </div>
      <div class="al-steps">
        <div class="al-step"><div class="al-sn">✓</div><span>Dane restauracji</span></div>
        <div class="al-step act"><div class="al-sn">2</div><span>Konto właściciela</span></div>
        <div class="al-step"><div class="al-sn">3</div><span>Gotowe!</span></div>
      </div>
    </div>
  </div>
  <div class="al-right">
    <div class="al-form">
      <div class="al-form-header">
        <div class="al-fh">Konto właściciela</div>
        <div class="al-fs">Utwórz konto, które będzie zarządzać restauracją. Krok 2 z 2.</div>
      </div>

      ${err ? `<div class="al-err">${ERR_ICO}${err}</div>` : ''}

      <div class="al-fields">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <div class="al-field"><label class="al-lbl">Imię *</label><input class="al-in" id="ar-fn" type="text" placeholder="Jan"/></div>
          <div class="al-field"><label class="al-lbl">Nazwisko *</label><input class="al-in" id="ar-ln" type="text" placeholder="Kowalski"/></div>
        </div>
        <div class="al-field"><label class="al-lbl">E-mail *</label><input class="al-in" id="ar-em" type="email" placeholder="jan@restauracja.pl" autocomplete="email"/></div>
        <div class="al-field"><label class="al-lbl">Hasło * (min. 6 znaków)</label>
          <div class="al-pw"><input class="al-in" id="ar-pw" type="${showPw ? 'text' : 'password'}" placeholder="Wpisz hasło" autocomplete="new-password"/>
          <button class="al-eye" data-action="togglepw" type="button">${showPw ? EYE_OFF : EYE_OPEN}</button></div>
        </div>
      </div>

      <button class="al-sub" data-action="register" ${loading ? 'disabled' : ''}>${loading ? 'Rejestracja…' : 'Zarejestruj restaurację'}</button>
      <button class="al-back" data-action="back-step" type="button">← Wróć do danych restauracji</button>

      <div class="al-footer">
        Masz już konto? <button class="al-fl" data-action="login" type="button">Zaloguj się</button>
      </div>
      <button data-action="help" type="button" style="margin-top:16px;width:100%;padding:14px 16px;background:#F0F9FF;border-radius:12px;border:1px solid #BAE6FD;display:flex;align-items:center;gap:10px;cursor:pointer;">
        <div style="width:36px;height:36px;border-radius:10px;background:#DBEAFE;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0284C7" stroke-width="1.5"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
        </div>
        <div style="flex:1;text-align:left;"><div style="font-size:13px;font-weight:700;color:#0369A1;">Potrzebujesz pomocy?</div><div style="font-size:12px;color:#0284C7;font-weight:500;">Centrum pomocy &nbsp;·&nbsp; FAQ &nbsp;·&nbsp; Kontakt</div></div>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#0284C7" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  </div>`;
}

/* ═══════════════════════════════════════════════════════════════════════════ */

export default function RegisterScreen() {
  const router = useRouter();
  const { registerRestaurant } = useAuth();
  const { showAlert } = useAlert();

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isMobileBrowser] = useState(() =>
    Platform.OS === 'web' && typeof window !== 'undefined' && window.innerWidth < 900
  );

  // Mobile state
  const [restaurantName, setRestaurantName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  /* ── WEB: portal pattern ── */
  useEffect(() => {
    if (Platform.OS !== 'web' || isMobileBrowser) return;
    if (typeof document === 'undefined') return;

    const portal = document.createElement('div');
    portal.id = 'sa-register';

    let styleEl = document.getElementById('sa-register-css') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'sa-register-css';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = REG_CSS;

    const hidden: { el: HTMLElement; d: string }[] = [];
    Array.from(document.body.children).forEach((c) => {
      const el = c as HTMLElement;
      if (['SCRIPT','STYLE','LINK'].includes(el.tagName) || el.id === 'sa-register') return;
      hidden.push({ el, d: el.style.display || '' });
      el.style.display = 'none';
    });

    const html = document.documentElement;
    const body = document.body;
    const orig = { ho: html.style.overflow, hh: html.style.height, bo: body.style.overflow, bh: body.style.height, bg: body.style.background };
    html.style.overflow = 'auto'; html.style.height = 'auto';
    body.style.overflow = 'auto'; body.style.height = 'auto';
    body.style.background = '#ffffff';

    let currentStep: 1 | 2 = 1;
    let showPw = false;
    let savedStep1 = { name: '', addr: '', phone: '' };

    const render = (err = '') => {
      portal.innerHTML = currentStep === 1 ? buildStep1(false, err) : buildStep2(showPw, false, err);
      // Restore values after DOM update
      setTimeout(() => {
        if (currentStep === 1) {
          const n = portal.querySelector('#ar-name') as HTMLInputElement;
          const a = portal.querySelector('#ar-addr') as HTMLInputElement;
          const p = portal.querySelector('#ar-phone') as HTMLInputElement;
          if (n) n.value = savedStep1.name;
          if (a) a.value = savedStep1.addr;
          if (p) p.value = savedStep1.phone;
        }
      }, 0);
    };

    render();
    document.body.appendChild(portal);

    const handler = async (e: Event) => {
      const trigger = (e.target as HTMLElement).closest?.('[data-action]') as HTMLElement | null;
      if (!trigger) return;
      const action = trigger.getAttribute('data-action') || '';

      if (action === 'login' || action === 'back-login') { window.location.href = '/login'; return; }
      if (action === 'help') { window.location.href = '/help'; return; }

      if (action === 'next') {
        const name = (portal.querySelector('#ar-name') as HTMLInputElement)?.value?.trim() || '';
        const addr = (portal.querySelector('#ar-addr') as HTMLInputElement)?.value?.trim() || '';
        const ph = (portal.querySelector('#ar-phone') as HTMLInputElement)?.value?.trim() || '';
        if (!name) { render('Podaj nazwę restauracji.'); return; }
        savedStep1 = { name, addr, phone: ph };
        currentStep = 2;
        render();
        return;
      }

      if (action === 'back-step') {
        currentStep = 1;
        render();
        return;
      }

      if (action === 'togglepw') {
        showPw = !showPw;
        const fn = (portal.querySelector('#ar-fn') as HTMLInputElement)?.value || '';
        const ln = (portal.querySelector('#ar-ln') as HTMLInputElement)?.value || '';
        const em = (portal.querySelector('#ar-em') as HTMLInputElement)?.value || '';
        const pw = (portal.querySelector('#ar-pw') as HTMLInputElement)?.value || '';
        render();
        setTimeout(() => {
          const f = portal.querySelector('#ar-fn') as HTMLInputElement;
          const l = portal.querySelector('#ar-ln') as HTMLInputElement;
          const eEl = portal.querySelector('#ar-em') as HTMLInputElement;
          const p = portal.querySelector('#ar-pw') as HTMLInputElement;
          if (f) f.value = fn; if (l) l.value = ln; if (eEl) eEl.value = em; if (p) p.value = pw;
        }, 0);
        return;
      }

      if (action === 'register') {
        const fn = (portal.querySelector('#ar-fn') as HTMLInputElement)?.value?.trim() || '';
        const ln = (portal.querySelector('#ar-ln') as HTMLInputElement)?.value?.trim() || '';
        const em = (portal.querySelector('#ar-em') as HTMLInputElement)?.value?.trim() || '';
        const pw = (portal.querySelector('#ar-pw') as HTMLInputElement)?.value?.trim() || '';
        if (!fn || !ln || !em || !pw) { render('Wszystkie pola oznaczone * są wymagane.'); return; }
        if (!EMAIL_REGEX.test(em)) { render('Podaj poprawny adres e-mail.'); return; }
        if (pw.length < 6) { render('Hasło musi mieć minimum 6 znaków.'); return; }

        portal.innerHTML = currentStep === 1 ? buildStep1(true, '') : buildStep2(showPw, true, '');
        const result = await registerRestaurant({
          restaurantName: savedStep1.name,
          address: savedStep1.addr,
          phone: savedStep1.phone,
          firstName: fn, lastName: ln, email: em, password: pw,
        });
        if (result.success) {
          router.replace('/(tabs)/dashboard');
        } else {
          render(result.error ?? 'Nie udało się zarejestrować. Spróbuj ponownie.');
        }
      }
    };

    portal.addEventListener('click', handler);

    return () => {
      portal.removeEventListener('click', handler);
      portal.remove();
      styleEl?.remove();
      hidden.forEach(({ el, d }) => { el.style.display = d; });
      html.style.overflow = orig.ho; html.style.height = orig.hh;
      body.style.overflow = orig.bo; body.style.height = orig.bh;
      body.style.background = orig.bg;
    };
  }, [isMobileBrowser]);

  /* ── MOBILE fallback ── */
  if (Platform.OS !== 'web' || isMobileBrowser) {
    const validateStep1 = (): boolean => {
      if (!restaurantName.trim()) { showAlert('Brakujące dane', 'Podaj nazwę restauracji.'); return false; }
      return true;
    };
    const validateStep2 = (): boolean => {
      if (!firstName.trim() || !lastName.trim()) { showAlert('Brakujące dane', 'Podaj imię i nazwisko.'); return false; }
      if (!email.trim() || !EMAIL_REGEX.test(email.trim())) { showAlert('Nieprawidłowy e-mail', 'Podaj poprawny adres e-mail.'); return false; }
      if (password.length < 6) { showAlert('Za krótkie hasło', 'Hasło musi mieć minimum 6 znaków.'); return false; }
      return true;
    };
    const handleRegister = async () => {
      if (!validateStep2()) return;
      setLoading(true);
      const result = await registerRestaurant({ restaurantName, address, phone, firstName, lastName, email, password });
      setLoading(false);
      if (result.success) { router.replace('/(tabs)/dashboard'); }
      else { showAlert('Błąd rejestracji', result.error ?? 'Spróbuj ponownie później.'); }
    };

    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
            <View style={s.headerRow}>
              <TouchableOpacity onPress={() => (step === 2 ? setStep(1) : router.push('/login' as any))} style={s.backBtn}>
                <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={s.headerTitle}>{step === 1 ? 'Nowa restauracja' : 'Twoje konto'}</Text>
              <View style={{ width: 40 }} />
            </View>
            <View style={s.steps}>
              <View style={[s.stepDot, s.stepActive]} />
              <View style={[s.stepLine, step === 2 && s.stepLineActive]} />
              <View style={[s.stepDot, step === 2 && s.stepActive]} />
            </View>
            <Text style={s.stepLabel}>Krok {step} z 2</Text>
            {step === 1 ? (
              <View style={s.form}>
                <Text style={s.sectionTitle}>Dane restauracji</Text>
                <Text style={s.sectionSub}>Podaj podstawowe informacje o swoim lokalu</Text>
                <Text style={s.label}>Nazwa restauracji *</Text>
                <TextInput style={s.input} placeholder="np. Trattoria Bella" placeholderTextColor={theme.colors.textMuted} value={restaurantName} onChangeText={setRestaurantName} />
                <Text style={s.label}>Adres</Text>
                <TextInput style={s.input} placeholder="np. ul. Marszałkowska 1, Warszawa" placeholderTextColor={theme.colors.textMuted} value={address} onChangeText={setAddress} />
                <Text style={s.label}>Telefon</Text>
                <TextInput style={s.input} placeholder="np. 500 600 700" placeholderTextColor={theme.colors.textMuted} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                <TouchableOpacity style={s.primaryBtn} onPress={() => { if (validateStep1()) setStep(2); }} activeOpacity={0.85}>
                  <Text style={s.primaryBtnText}>Dalej</Text>
                  <Ionicons name="arrow-forward" size={18} color={theme.colors.white} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.form}>
                <Text style={s.sectionTitle}>Konto właściciela</Text>
                <Text style={s.sectionSub}>Utwórz konto, które będzie zarządzać restauracją</Text>
                <Text style={s.label}>Imię *</Text>
                <TextInput style={s.input} placeholder="Jan" placeholderTextColor={theme.colors.textMuted} value={firstName} onChangeText={setFirstName} />
                <Text style={s.label}>Nazwisko *</Text>
                <TextInput style={s.input} placeholder="Kowalski" placeholderTextColor={theme.colors.textMuted} value={lastName} onChangeText={setLastName} />
                <Text style={s.label}>E-mail *</Text>
                <TextInput style={s.input} placeholder="jan@restauracja.pl" placeholderTextColor={theme.colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                <Text style={s.label}>Hasło * (min. 6 znaków)</Text>
                <View style={{ position: 'relative' }}>
                  <TextInput style={s.input} placeholder="••••••••" placeholderTextColor={theme.colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
                  <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={s.primaryBtn} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
                  {loading ? <ActivityIndicator color={theme.colors.white} /> : <><Text style={s.primaryBtnText}>Zarejestruj restaurację</Text><Ionicons name="checkmark-circle" size={18} color={theme.colors.white} /></>}
                </TouchableOpacity>
              </View>
            )}
            <View style={s.footer}>
              <Text style={s.footerText}>Masz już konto?</Text>
              <TouchableOpacity onPress={() => router.push('/login' as any)}><Text style={s.footerLink}>Zaloguj się</Text></TouchableOpacity>
            </View>

            {/* Support link */}
            <TouchableOpacity style={s.supportBox} onPress={() => router.push('/help' as any)} activeOpacity={0.8}>
              <View style={s.supportIconBox}>
                <Ionicons name="headset-outline" size={18} color="#0284C7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.supportTitle}>Potrzebujesz pomocy?</Text>
                <Text style={s.supportContact}>Centrum pomocy · FAQ · Kontakt</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#0284C7" />
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return <View style={{ flex: 1, backgroundColor: '#fff' }} />;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { flexGrow: 1, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center', ...theme.shadows.card },
  headerTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  steps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 0, marginTop: 8 },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: theme.colors.border },
  stepActive: { backgroundColor: theme.colors.primary },
  stepLine: { width: 60, height: 3, backgroundColor: theme.colors.border },
  stepLineActive: { backgroundColor: theme.colors.primary },
  stepLabel: { textAlign: 'center', fontSize: 12, color: theme.colors.textMuted, fontWeight: '600', marginTop: 8, marginBottom: 16 },
  form: { paddingHorizontal: 24, gap: 4 },
  sectionTitle: { fontSize: 22, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  sectionSub: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: theme.colors.card, borderRadius: theme.borderRadius.md, height: 48, paddingHorizontal: 14, fontSize: 15, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border },
  eyeBtn: { position: 'absolute', right: 14, top: 14 },
  primaryBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.md, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, ...theme.shadows.medium },
  primaryBtnText: { color: theme.colors.white, fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 24 },
  footerText: { fontSize: 14, color: theme.colors.textSecondary },
  footerLink: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
  supportBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, marginBottom: 8, backgroundColor: '#F0F9FF', borderRadius: 12, borderWidth: 1, borderColor: '#BAE6FD', padding: 14 },
  supportIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  supportTitle: { fontSize: 13, fontWeight: '700', color: '#0369A1', marginBottom: 2 },
  supportContact: { fontSize: 12, fontWeight: '500', color: '#0284C7' },
});
