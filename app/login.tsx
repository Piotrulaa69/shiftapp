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
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';

/* ═══════════════════════════════════════════════════════════════════════════
   WEB PORTAL — dark two-column auth design
   ═══════════════════════════════════════════════════════════════════════════ */

const AUTH_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
#sa-login{font-family:'Inter',ui-sans-serif,system-ui,sans-serif;-webkit-font-smoothing:antialiased;display:flex;min-height:100vh;width:100%;background:white;padding:14px;transition:all .5s;}
@media(min-width:1024px){#sa-login{height:100vh;overflow:hidden;}}

/* ─── LEFT: blue hero ─── */
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

/* ─── RIGHT: white form ─── */
.al-right{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 24px;overflow-y:auto;}
@media(min-width:640px){.al-right{padding:48px 48px;}}
@media(min-width:1024px){.al-right{padding:24px 64px;overflow:hidden;}}
@media(min-width:1280px){.al-right{padding:24px 96px;}}
.al-form{width:100%;max-width:420px;display:flex;flex-direction:column;gap:24px;}

.al-form-header{display:flex;flex-direction:column;gap:6px;}
.al-fh{font-size:28px;font-weight:700;letter-spacing:-.03em;color:#111827;}
.al-fs{font-size:14px;color:#6B7280;line-height:1.5;}

/* Social buttons */
.al-socials{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.al-soc{background:white;border:1.5px solid #E5E7EB;border-radius:12px;height:48px;font-size:14px;font-weight:600;color:#374151;display:flex;align-items:center;justify-content:center;gap:10px;cursor:pointer;transition:all .2s;font-family:inherit;}
.al-soc:hover{border-color:#D1D5DB;background:#F9FAFB;transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.04);}
.al-soc svg{width:18px;height:18px;}

.al-divider{position:relative;display:flex;align-items:center;justify-content:center;border-top:1px solid #E5E7EB;margin:4px 0;}
.al-divider span{position:absolute;background:white;padding:0 14px;font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:2px;}

/* Inputs */
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

/* Forgot */
.al-forgot{display:flex;justify-content:flex-end;margin-top:-6px;}
.al-forgot button{background:none;border:none;color:#2563EB;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;padding:0;transition:color .2s;}
.al-forgot button:hover{color:#1d4ed8;}

/* Submit */
.al-sub{width:100%;height:52px;background:#2563EB;color:white;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;transition:all .15s;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 14px rgba(37,99,235,.3);}
.al-sub:hover{background:#1d4ed8;box-shadow:0 6px 20px rgba(37,99,235,.4);transform:translateY(-1px);}
.al-sub:active{transform:scale(0.98);}
.al-sub:disabled{opacity:.5;cursor:not-allowed;transform:none;}

.al-fr{text-align:center;font-size:14px;color:#6B7280;}
.al-fl{color:#2563EB;font-weight:600;background:none;border:none;cursor:pointer;font-family:inherit;font-size:14px;}
.al-fl:hover{text-decoration:underline;}

.al-err{background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:12px 14px;font-size:13px;color:#DC2626;display:flex;align-items:center;gap:10px;font-weight:500;}
.al-err svg{flex-shrink:0;}
`;

const EYE_OPEN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_OFF  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
const ERR_ICO  = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
const GOOGLE_ICO = `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>`;
const APPLE_ICO = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>`;

function buildLoginPortal(showPw: boolean, loading: boolean, err: string) {
  return `
  <div class="al-left">
    <div class="al-noise"></div>
    <div class="al-lc">
      <div class="al-brand"><div class="al-mark">S</div><span>ShiftApp</span></div>
      <div class="al-heading">
        <h1>Witaj z powrotem</h1>
        <p>Zaloguj się, aby zarządzać grafikiem, zespołem i rezerwacjami.</p>
      </div>
      <div class="al-steps">
        <div class="al-step act"><div class="al-sn">1</div><span>Zaloguj się na konto</span></div>
        <div class="al-step"><div class="al-sn">2</div><span>Przejdź do panelu</span></div>
        <div class="al-step"><div class="al-sn">3</div><span>Zarządzaj restauracją</span></div>
      </div>
    </div>
  </div>
  <div class="al-right">
    <div class="al-form">
      <div class="al-form-header">
        <div class="al-fh">Zaloguj się</div>
        <div class="al-fs">Wprowadź dane, aby uzyskać dostęp do panelu.</div>
      </div>

      <div class="al-fields">
        ${err ? `<div class="al-err">${ERR_ICO}${err}</div>` : ''}
        <div class="al-field"><label class="al-lbl">E-mail</label><input class="al-in" id="al-email" type="email" placeholder="jan@restauracja.pl" autocomplete="email"/></div>
        <div class="al-field"><label class="al-lbl">Hasło</label>
          <div class="al-pw"><input class="al-in" id="al-pw" type="${showPw ? 'text' : 'password'}" placeholder="Wpisz hasło" autocomplete="current-password"/>
          <button class="al-eye" data-action="togglepw" type="button">${showPw ? EYE_OFF : EYE_OPEN}</button></div>
        </div>
        <div class="al-forgot"><button data-action="forgot" type="button">Nie pamiętam hasła</button></div>
      </div>

      <button class="al-sub" data-action="login" ${loading ? 'disabled' : ''}>${loading ? 'Logowanie…' : 'Zaloguj się'}</button>
    </div>
  </div>`;
}

function useAuthPortal({
  portalId,
  cssFn,
  htmlFn,
  onAction,
  disabled,
}: {
  portalId: string;
  cssFn: () => string;
  htmlFn: () => string;
  onAction: (action: string, portal: HTMLElement, rerender: () => void) => void;
  disabled?: boolean;
}) {
  useEffect(() => {
    if (disabled) return;
    if (typeof document === 'undefined') return;

    const portal = document.createElement('div');
    portal.id = portalId;

    let styleEl = document.getElementById(portalId + '-css') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = portalId + '-css';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = cssFn();

    const hidden: { el: HTMLElement; d: string }[] = [];
    Array.from(document.body.children).forEach((c) => {
      const el = c as HTMLElement;
      if (['SCRIPT','STYLE','LINK'].includes(el.tagName) || el.id === portalId) return;
      hidden.push({ el, d: el.style.display || '' });
      el.style.display = 'none';
    });

    const html = document.documentElement;
    const body = document.body;
    const orig = { ho: html.style.overflow, hh: html.style.height, bo: body.style.overflow, bh: body.style.height, bg: body.style.background };
    html.style.overflow = 'auto'; html.style.height = 'auto';
    body.style.overflow = 'auto'; body.style.height = 'auto';
    body.style.background = '#ffffff';

    portal.innerHTML = htmlFn();
    document.body.appendChild(portal);

    const rerender = () => { portal.innerHTML = htmlFn(); };

    const handler = (e: Event) => {
      const trigger = (e.target as HTMLElement).closest?.('[data-action]') as HTMLElement | null;
      if (trigger) onAction(trigger.getAttribute('data-action') || '', portal, rerender);
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
  }, []);
}

export default function LoginScreen() {
  const { login } = useAuth();
  const [localLoading, setLocalLoading] = useState(false);
  const { showAlert } = useAlert();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isMobileBrowser, setIsMobileBrowser] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.innerWidth < 900) {
      setIsMobileBrowser(true);
    }
  }, []);

  /* ── WEB: portal pattern ── */
  useAuthPortal({
    disabled: isMobileBrowser,
    portalId: 'sa-login',
    cssFn: () => AUTH_CSS,
    htmlFn: () => buildLoginPortal(showPassword, localLoading, ''),
    onAction: async (action, portal, rerender) => {
      if (action === 'back') { router.push('/landing' as any); return; }
      if (action === 'register') { router.push('/join' as any); return; }
      if (action === 'forgot') { router.push('/forgot-password' as any); return; }
      if (action === 'togglepw') {
        const emailVal = (portal.querySelector('#al-email') as HTMLInputElement)?.value || '';
        const pwVal = (portal.querySelector('#al-pw') as HTMLInputElement)?.value || '';
        setShowPassword((prev) => {
          const next = !prev;
          portal.innerHTML = buildLoginPortal(next, false, '');
          setTimeout(() => {
            const e = portal.querySelector('#al-email') as HTMLInputElement;
            const p = portal.querySelector('#al-pw') as HTMLInputElement;
            if (e) e.value = emailVal;
            if (p) { p.value = pwVal; p.focus(); }
          }, 0);
          return next;
        });
        return;
      }
      if (action === 'login') {
        const emailVal = (portal.querySelector('#al-email') as HTMLInputElement)?.value?.trim() || '';
        const pwVal = (portal.querySelector('#al-pw') as HTMLInputElement)?.value?.trim() || '';
        if (!emailVal || !pwVal) {
          portal.innerHTML = buildLoginPortal(showPassword, false, 'Wprowadź e-mail i hasło.');
          setTimeout(() => {
            const e = portal.querySelector('#al-email') as HTMLInputElement;
            const p = portal.querySelector('#al-pw') as HTMLInputElement;
            if (e) e.value = emailVal;
            if (p) p.value = pwVal;
          }, 0);
          return;
        }
        setLocalLoading(true);
        portal.innerHTML = buildLoginPortal(showPassword, true, '');
        const success = await login(emailVal, pwVal);
        setLocalLoading(false);
        if (success) {
          router.replace('/(tabs)/dashboard');
        } else {
          portal.innerHTML = buildLoginPortal(showPassword, false, 'Nieprawidłowy e-mail lub hasło.');
          setTimeout(() => {
            const e = portal.querySelector('#al-email') as HTMLInputElement;
            const p = portal.querySelector('#al-pw') as HTMLInputElement;
            if (e) e.value = emailVal;
            if (p) p.value = pwVal;
          }, 0);
        }
      }
    },
  });

  /* ── MOBILE fallback (native + mobile browser) ── */
  if (Platform.OS !== 'web' || isMobileBrowser) {
    const handleLogin = async () => {
      if (!email.trim() || !password.trim()) {
        showAlert('Brakujące dane', 'Wprowadź e-mail i hasło.');
        return;
      }
      setLocalLoading(true);
      const success = await login(email, password);
      setLocalLoading(false);
      if (success) {
        router.replace('/(tabs)/dashboard');
      } else {
        showAlert('Błąd logowania', 'Sprawdź swoje dane i spróbuj ponownie.');
      }
    };

    return (
      <SafeAreaView style={mob.safe} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={mob.form} keyboardShouldPersistTaps="handled">
            <Text style={mob.title}>Zaloguj się</Text>
            <Text style={mob.sub}>Wprowadź swoje dane, aby uzyskać dostęp.</Text>
            <Text style={mob.lbl}>E-mail</Text>
            <TextInput style={mob.input} placeholder="jan@restauracja.pl" placeholderTextColor="#94a3b8" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <Text style={mob.lbl}>Hasło</Text>
            <View style={{ position: 'relative' }}>
              <TextInput style={mob.input} placeholder="••••••••" placeholderTextColor="#94a3b8" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
              <TouchableOpacity style={mob.eye} onPress={() => setShowPassword(v => !v)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={mob.btn} onPress={handleLogin} disabled={localLoading} activeOpacity={0.88}>
              {localLoading ? <ActivityIndicator color="#fff" /> : <Text style={mob.btnTxt}>Zaloguj się</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  /* ── WEB desktop: portal renders via useAuthPortal, return null ── */
  return null;
}

const mob = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  form: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 40, flexGrow: 1, justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  sub: { fontSize: 14, color: '#64748b', marginBottom: 28 },
  lbl: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#f8fafc', borderRadius: 12, height: 44, paddingHorizontal: 14, fontSize: 14, color: '#0f172a', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  eye: { position: 'absolute', right: 14, top: 12 },
  btn: { marginTop: 24, height: 52, backgroundColor: '#0084FF', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
