import { Redirect, useRouter } from 'expo-router';
import { Platform } from 'react-native';

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fustat:wght@200..800&family=Inter:wght@300;400;500;600;700&display=swap');

:root {
  --brand: rgba(0, 132, 255, 0.85);
  --brand-solid: #0084FF;
  --brand-glow: rgba(96, 177, 255, 0.25);
  --bg-page: #ffffff;
  --bg-card: #F4F8F9;
  --text-primary: #0f172a;
  --text-secondary: #64748b;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body, #root, #__next {
  margin: 0;
  padding: 0;
  background: var(--bg-page);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--text-primary);
}

.sa-page { position: relative; overflow-x: hidden; min-height: 100vh; }

/* ── BACKGROUND GLOW ── */
.sa-glow-1, .sa-glow-2 {
  position: absolute;
  pointer-events: none;
  z-index: 0;
  border-radius: 9999px;
}
.sa-glow-1 {
  top: -150px; left: -150px;
  width: 700px; height: 500px;
  background: #60B1FF;
  opacity: 0.22;
  filter: blur(120px);
}
.sa-glow-2 {
  top: 50px; left: 100px;
  width: 450px; height: 350px;
  background: #319AFF;
  opacity: 0.16;
  filter: blur(80px);
}

/* ── NAVBAR ── */
.sa-nav {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 8px 8px 8px 18px;
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(50px);
  -webkit-backdrop-filter: blur(50px);
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 16px;
  box-shadow: inset 0px 4px 4px 0px rgba(255,255,255,0.25), 0 4px 24px rgba(0,0,0,0.04);
}
.sa-nav-brand {
  display: flex; align-items: center; gap: 8px;
  font-family: 'Fustat', sans-serif;
  font-weight: 700;
  font-size: 17px;
  letter-spacing: -0.5px;
  color: #0f172a;
}
.sa-nav-mark {
  width: 26px; height: 26px;
  border-radius: 7px;
  background: linear-gradient(135deg, #0084FF, #60B1FF);
  display: flex; align-items: center; justify-content: center;
  color: white; font-weight: 800; font-size: 14px;
  box-shadow: inset 0 1px 2px rgba(255,255,255,0.4);
}
.sa-nav-links {
  display: flex; gap: 22px;
  font-size: 14px; font-weight: 500;
  color: #0f172a;
}
.sa-nav-links a {
  color: inherit; text-decoration: none;
  transition: color 0.2s;
}
.sa-nav-links a:hover { color: var(--brand-solid); }
.sa-nav-cta {
  background: rgba(255,255,255,0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 12px;
  padding: 8px 16px;
  font-size: 13px; font-weight: 600;
  color: #0f172a;
  cursor: pointer;
  display: flex; align-items: center; gap: 6px;
  transition: all 0.2s;
}
.sa-nav-cta:hover { background: white; transform: translateY(-1px); }

@media (max-width: 880px) {
  .sa-nav-links { display: none; }
}

/* ── HERO ── */
.sa-hero {
  position: relative;
  z-index: 10;
  max-width: 1600px;
  margin: 0 auto;
  padding: 160px 60px 80px;
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 60px;
  align-items: center;
  min-height: 100vh;
}
@media (max-width: 1024px) {
  .sa-hero { grid-template-columns: 1fr; padding: 140px 32px 60px; gap: 40px; }
}

.sa-hero-left { display: flex; flex-direction: column; gap: 28px; }

.sa-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 7px 14px;
  border-radius: 9999px;
  background: rgba(255,255,255,0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(0,0,0,0.07);
  font-size: 13px;
  font-weight: 500;
  color: #0f172a;
  width: fit-content;
}
.sa-stars { color: #FF801E; letter-spacing: 1px; font-size: 12px; }

.sa-headline {
  font-family: 'Fustat', sans-serif;
  font-weight: 700;
  font-size: 75px;
  line-height: 1.05;
  letter-spacing: -2px;
  color: #0f172a;
}
@media (max-width: 1024px) { .sa-headline { font-size: 56px; letter-spacing: -1.5px; } }
@media (max-width: 600px) { .sa-headline { font-size: 42px; letter-spacing: -1px; } }

.sa-headline-grad {
  background: linear-gradient(90deg, #0084FF 0%, #60B1FF 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.sa-sub {
  font-size: 18px;
  color: #64748b;
  letter-spacing: -0.4px;
  line-height: 1.55;
  max-width: 520px;
}

.sa-cta-row { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; margin-top: 8px; }

.sa-cta {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 6px 6px 6px 22px;
  background: rgba(0, 132, 255, 0.85);
  backdrop-filter: blur(2px);
  border-radius: 16px;
  border: none;
  color: white;
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: inset 0px 4px 4px 0px rgba(255,255,255,0.35), 0 8px 24px rgba(0,132,255,0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.sa-cta:hover { transform: scale(1.02); box-shadow: inset 0px 4px 4px 0px rgba(255,255,255,0.4), 0 12px 32px rgba(0,132,255,0.35); }
.sa-cta-arrow {
  width: 36px; height: 36px;
  border-radius: 9999px;
  background: white;
  color: #0084FF;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
}

.sa-cta-secondary {
  padding: 13px 22px;
  background: transparent;
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 16px;
  font-size: 14px; font-weight: 600;
  color: #0f172a;
  cursor: pointer;
  transition: all 0.2s;
}
.sa-cta-secondary:hover { background: rgba(0,0,0,0.04); }

/* ── ORB ── */
.sa-orb-wrap {
  position: relative;
  display: flex; align-items: center; justify-content: center;
  height: 540px;
}
.sa-orb {
  position: relative;
  width: 480px; height: 480px;
  border-radius: 9999px;
  background: radial-gradient(circle at 35% 30%,
    rgba(255,255,255,0.95) 0%,
    rgba(150, 200, 255, 0.85) 18%,
    rgba(0, 132, 255, 0.95) 45%,
    rgba(0, 80, 200, 1) 75%,
    rgba(20, 30, 80, 1) 100%
  );
  box-shadow:
    0 30px 100px rgba(0, 132, 255, 0.45),
    inset -30px -50px 100px rgba(0, 30, 100, 0.5),
    inset 20px 30px 80px rgba(255, 255, 255, 0.3);
  animation: sa-orb-float 8s ease-in-out infinite;
  filter: saturate(1.2) contrast(1.05);
}
.sa-orb::before {
  content: '';
  position: absolute;
  top: 12%; left: 18%;
  width: 30%; height: 25%;
  background: radial-gradient(ellipse, rgba(255,255,255,0.7), transparent 60%);
  border-radius: 9999px;
  filter: blur(8px);
}
.sa-orb::after {
  content: '';
  position: absolute;
  bottom: 10%; right: 20%;
  width: 18%; height: 12%;
  background: radial-gradient(ellipse, rgba(180, 220, 255, 0.6), transparent 60%);
  border-radius: 9999px;
  filter: blur(6px);
}
@keyframes sa-orb-float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-20px) scale(1.02); }
}

/* ── TRUSTED ── */
.sa-trusted {
  position: relative; z-index: 10;
  max-width: 1600px;
  margin: 0 auto;
  padding: 40px 60px 80px;
  text-align: center;
}
.sa-trusted-label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #94a3b8;
  margin-bottom: 28px;
}
.sa-trusted-row {
  display: flex; justify-content: center; align-items: center;
  gap: 80px; flex-wrap: wrap;
  opacity: 0.45;
}
.sa-logo {
  font-family: 'Fustat', sans-serif;
  font-weight: 700;
  font-size: 22px;
  color: #475569;
  letter-spacing: -0.5px;
}
@media (max-width: 768px) { .sa-trusted-row { gap: 40px; } }

/* ── FEATURES ── */
.sa-features {
  position: relative; z-index: 10;
  max-width: 1200px;
  margin: 0 auto;
  padding: 100px 32px;
  text-align: center;
}
.sa-section-badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 16px;
  background: linear-gradient(90deg, #F5C344, #F28482, #B567C2);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.sa-section-title {
  font-size: 2.75rem;
  font-weight: 500;
  color: #0f172a;
  letter-spacing: -0.02em;
  margin-bottom: 14px;
  line-height: 1.1;
}
@media (max-width: 600px) { .sa-section-title { font-size: 2.25rem; } }
.sa-section-sub {
  font-size: 1.125rem;
  color: #64748b;
  line-height: 1.5;
  margin-bottom: 50px;
  white-space: pre-line;
}

.sa-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  text-align: left;
}
@media (max-width: 900px) { .sa-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .sa-grid { grid-template-columns: 1fr; } }

.sa-feat-card {
  position: relative;
  border-radius: 20px;
  height: 340px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  overflow: hidden;
  background: #F4F8F9;
  box-shadow: 0 10px 30px -10px rgba(0,0,0,0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.sa-feat-card:hover { transform: translateY(-3px); box-shadow: 0 20px 40px -10px rgba(0,0,0,0.15); }

.sa-feat-1 { background: radial-gradient(circle at 50% 0%, #60B1FF 0%, #C5E4FF 30%, #F4F8F9 60%, #F4F8F9 100%); }
.sa-feat-2 { background: radial-gradient(circle at 50% 0%, #F28482 0%, #FFDDD9 30%, #F4F8F9 60%, #F4F8F9 100%); }
.sa-feat-3 { background: radial-gradient(circle at 50% 0%, #F5C344 0%, #FFF3C4 30%, #F4F8F9 60%, #F4F8F9 100%); }

.sa-feat-title { font-size: 1.05rem; font-weight: 600; color: #1e293b; padding: 24px; }
.sa-feat-desc { font-size: 0.85rem; color: #64748b; padding: 0 24px 24px; line-height: 1.5; margin-top: -16px; }

/* Reservation card visual (card 1) */
.sa-feat-visual { position: absolute; top: 30px; left: 24px; right: 24px; }
.sa-resv {
  background: white;
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.sa-resv-table {
  width: 38px; height: 38px;
  border-radius: 8px;
  background: linear-gradient(135deg, #0084FF, #60B1FF);
  color: white;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 13px;
}
.sa-resv-info { flex: 1; }
.sa-resv-name { font-size: 13px; font-weight: 600; color: #0f172a; }
.sa-resv-time { font-size: 11px; color: #64748b; margin-top: 2px; }
.sa-resv-dot {
  width: 8px; height: 8px; border-radius: 9999px;
  background: #22c55e;
  box-shadow: 0 0 0 4px rgba(34,197,94,0.18);
}

/* Guest profile (card 2) */
.sa-guest {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
  display: flex;
  align-items: center;
  gap: 12px;
}
.sa-guest-avatar {
  width: 44px; height: 44px;
  border-radius: 9999px;
  background: linear-gradient(135deg, #F28482, #FCA5A5);
  color: white;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 14px;
}
.sa-guest-info { flex: 1; }
.sa-guest-name { font-size: 13px; font-weight: 600; color: #0f172a; }
.sa-guest-meta { font-size: 11px; color: #64748b; margin-top: 2px; }
.sa-guest-chips { display: flex; gap: 4px; margin-top: 6px; }
.sa-guest-chip {
  font-size: 9px; font-weight: 600;
  padding: 2px 6px; border-radius: 9999px;
  background: #FFF0EF; color: #DC2626;
  letter-spacing: 0.3px;
}

/* Analytics (card 3) */
.sa-analytics {
  background: white;
  border-radius: 12px;
  padding: 18px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
}
.sa-an-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
.sa-an-num { font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px; }
.sa-an-delta {
  font-size: 11px; font-weight: 600;
  padding: 3px 7px; border-radius: 9999px;
  background: #DCFCE7; color: #16A34A;
}
.sa-an-label { font-size: 10px; font-weight: 500; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; }
.sa-an-spark {
  margin-top: 12px; height: 36px;
  background:
    linear-gradient(180deg, rgba(245,195,68,0.2), transparent),
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 30' preserveAspectRatio='none'><polyline fill='none' stroke='%23F5C344' stroke-width='2' points='0,22 12,18 24,20 36,12 48,15 60,8 72,11 84,5 100,7'/></svg>") no-repeat center / 100% 100%;
}

/* ── FOOTER ── */
.sa-footer-wrap {
  position: relative;
  background: linear-gradient(180deg, #ffffff 0%, #f5f3ef 100%);
  padding: 80px 32px 40px;
  z-index: 10;
}
.sa-footer-card {
  max-width: 1200px;
  margin: 0 auto;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(8px);
  border-radius: 24px;
  box-shadow: 0 20px 60px -10px rgba(0,0,0,0.12);
  overflow: hidden;
}

.sa-footer-top {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 40px;
  padding: 40px;
}
@media (max-width: 768px) { .sa-footer-top { flex-direction: column; } }

.sa-footer-brand { display: flex; align-items: center; gap: 12px; }
.sa-footer-brand-mark {
  width: 44px; height: 44px;
  border-radius: 10px;
  background: #f97316;
  box-shadow: inset 0 1px 2px rgba(255,255,255,0.3);
  display: flex; align-items: center; justify-content: center;
  color: white;
  font-family: 'Fustat', sans-serif;
  font-size: 22px;
  font-weight: 800;
}
.sa-footer-brand-name {
  font-size: 1.65rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -1px;
}

.sa-footer-cols { display: flex; gap: 56px; flex-wrap: wrap; }
.sa-footer-col { display: flex; flex-direction: column; gap: 10px; min-width: 110px; }
.sa-footer-col-head {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #0f172a;
  margin-bottom: 4px;
}
.sa-footer-col a {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
  text-decoration: none;
  transition: color 0.2s;
}
.sa-footer-col a:hover { color: #f97316; }

.sa-footer-bottom {
  border-top: 1px solid #f3f4f6;
  background: white;
  padding: 18px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.sa-footer-copy { font-size: 13px; color: #6b7280; font-weight: 500; }
.sa-socials { display: flex; gap: 10px; }
.sa-social {
  width: 40px; height: 40px;
  border-radius: 9999px;
  border: 1px solid #f3f4f6;
  display: flex; align-items: center; justify-content: center;
  color: #6b7280;
  text-decoration: none;
  transition: all 0.3s;
}
.sa-social:hover { background: #f97316; color: white; border-color: #f97316; }
.sa-social svg { width: 18px; height: 18px; }

/* ── ENTRANCE ANIMATIONS ── */
.sa-fade-up {
  opacity: 0;
  transform: translateY(12px);
  animation: sa-fadeup 0.7s ease forwards;
}
@keyframes sa-fadeup {
  to { opacity: 1; transform: translateY(0); }
}
.sa-d-1 { animation-delay: 0.1s; }
.sa-d-2 { animation-delay: 0.25s; }
.sa-d-3 { animation-delay: 0.4s; }
.sa-d-4 { animation-delay: 0.55s; }
.sa-d-5 { animation-delay: 0.7s; }
`;

const HTML = `
<div class="sa-page">
  <div class="sa-glow-1"></div>
  <div class="sa-glow-2"></div>

  <!-- NAVBAR -->
  <nav class="sa-nav sa-fade-up">
    <div class="sa-nav-brand">
      <div class="sa-nav-mark">S</div>
      <span>ShiftApp</span>
    </div>
    <div class="sa-nav-links">
      <a href="#produkt">Produkt</a>
      <a href="#funkcje">Funkcje</a>
      <a href="#cennik">Cennik</a>
      <a href="#demo">Demo</a>
    </div>
    <button class="sa-nav-cta" data-action="login">
      Zaloguj się
      <span style="font-size:14px">→</span>
    </button>
  </nav>

  <!-- HERO -->
  <section class="sa-hero">
    <div class="sa-hero-left">
      <div class="sa-badge sa-fade-up sa-d-1">
        <span class="sa-stars">★★★★★</span>
        <span>Oceniony 4.9/5 przez 500+ restauracji</span>
      </div>
      <h1 class="sa-headline sa-fade-up sa-d-2">
        Zarządzaj <span class="sa-headline-grad">restauracją</span>,<br/>nie paperworkiem.
      </h1>
      <p class="sa-sub sa-fade-up sa-d-3">
        ShiftApp łączy rezerwacje, zespół i gości w jednym miejscu. Zero arkuszy. Zero chaosu. Tylko wyniki.
      </p>
      <div class="sa-cta-row sa-fade-up sa-d-4">
        <button class="sa-cta" data-action="signup">
          Zacznij za darmo
          <span class="sa-cta-arrow">→</span>
        </button>
        <button class="sa-cta-secondary" data-action="demo">Zobacz demo</button>
      </div>
    </div>

    <div class="sa-orb-wrap sa-fade-up sa-d-3">
      <div class="sa-orb"></div>
    </div>
  </section>

  <!-- TRUSTED -->
  <section class="sa-trusted">
    <div class="sa-trusted-label">Zaufały nam wiodące restauracje w Polsce</div>
    <div class="sa-trusted-row">
      <div class="sa-logo">Bistro&nbsp;Lumière</div>
      <div class="sa-logo">Trzy&nbsp;Stoły</div>
      <div class="sa-logo">NORDA</div>
      <div class="sa-logo">Krynica&nbsp;Co.</div>
      <div class="sa-logo">Atelier&nbsp;15</div>
    </div>
  </section>

  <!-- FEATURES -->
  <section class="sa-features" id="funkcje">
    <div class="sa-section-badge">Możliwości</div>
    <h2 class="sa-section-title">Wszystko czego potrzebuje<br/>nowoczesna restauracja</h2>
    <p class="sa-section-sub">Od rezerwacji po rozliczenia.\nJeden panel. Zero chaosu.</p>

    <div class="sa-grid">
      <!-- Card 1 -->
      <div class="sa-feat-card sa-feat-1">
        <div class="sa-feat-visual">
          <div class="sa-resv">
            <div class="sa-resv-table">T7</div>
            <div class="sa-resv-info">
              <div class="sa-resv-name">Anna Kowalska</div>
              <div class="sa-resv-time">19:30 · 4 osoby</div>
            </div>
            <div class="sa-resv-dot"></div>
          </div>
          <div class="sa-resv">
            <div class="sa-resv-table" style="background:linear-gradient(135deg,#22c55e,#86efac);">T2</div>
            <div class="sa-resv-info">
              <div class="sa-resv-name">Piotr Nowak</div>
              <div class="sa-resv-time">20:00 · 2 osoby</div>
            </div>
            <div class="sa-resv-dot"></div>
          </div>
        </div>
        <div class="sa-feat-title">Rezerwacje w czasie rzeczywistym</div>
        <div class="sa-feat-desc">Online booking, walk-iny i waitlist w jednym widoku. Konflikty wykluczone.</div>
      </div>

      <!-- Card 2 -->
      <div class="sa-feat-card sa-feat-2">
        <div class="sa-feat-visual">
          <div class="sa-guest">
            <div class="sa-guest-avatar">AK</div>
            <div class="sa-guest-info">
              <div class="sa-guest-name">Anna Kowalska</div>
              <div class="sa-guest-meta">12 wizyt · stolik #7</div>
              <div class="sa-guest-chips">
                <span class="sa-guest-chip">GLUTEN</span>
                <span class="sa-guest-chip">ORZECHY</span>
              </div>
            </div>
          </div>
        </div>
        <div class="sa-feat-title">Profil gościa 360°</div>
        <div class="sa-feat-desc">Historia wizyt, alergie, preferowane stoliki i ulubione dania w jednym miejscu.</div>
      </div>

      <!-- Card 3 -->
      <div class="sa-feat-card sa-feat-3">
        <div class="sa-feat-visual">
          <div class="sa-analytics">
            <div class="sa-an-row">
              <div>
                <div class="sa-an-num">28&nbsp;450&nbsp;zł</div>
                <div class="sa-an-label">Przychód · ten tydzień</div>
              </div>
              <div class="sa-an-delta">+12.4%</div>
            </div>
            <div class="sa-an-spark"></div>
          </div>
        </div>
        <div class="sa-feat-title">Analityka i raporty</div>
        <div class="sa-feat-desc">Przychód, obłożenie, średni rachunek. Decyzje oparte na danych, nie na intuicji.</div>
      </div>
    </div>
  </section>

  <!-- FOOTER -->
  <div class="sa-footer-wrap">
    <div class="sa-footer-card sa-fade-up">
      <div class="sa-footer-top">
        <div class="sa-footer-brand">
          <div class="sa-footer-brand-mark">S</div>
          <div class="sa-footer-brand-name">ShiftApp</div>
        </div>
        <div class="sa-footer-cols">
          <div class="sa-footer-col">
            <div class="sa-footer-col-head">Firma</div>
            <a href="#">O nas</a>
            <a href="#">Kariera</a>
            <a href="#">Kontakt</a>
          </div>
          <div class="sa-footer-col">
            <div class="sa-footer-col-head">Produkt</div>
            <a href="#">Funkcje</a>
            <a href="#">Cennik</a>
            <a href="#">API</a>
          </div>
          <div class="sa-footer-col">
            <div class="sa-footer-col-head">Prawne</div>
            <a href="#">Polityka prywatności</a>
            <a href="#">Regulamin</a>
            <a href="#">RODO</a>
          </div>
        </div>
      </div>
      <div class="sa-footer-bottom">
        <div class="sa-footer-copy">© 2026 ShiftApp. Wszelkie prawa zastrzeżone.</div>
        <div class="sa-socials">
          <a href="#" class="sa-social" aria-label="Facebook">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
          </a>
          <a href="#" class="sa-social" aria-label="Twitter">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2-3-1-5-7-3-12 2.4 2.7 6.1 4.5 10 5 .1-3.9 4-6 8-2.4z"/></svg>
          </a>
          <a href="#" class="sa-social" aria-label="Instagram">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.4A4 4 0 1 1 12.6 8 4 4 0 0 1 16 11.4z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
          </a>
          <a href="#" class="sa-social" aria-label="LinkedIn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
          </a>
        </div>
      </div>
    </div>
  </div>
</div>
`;

export default function Landing() {
  const router = useRouter();

  if (Platform.OS !== 'web') {
    return <Redirect href="/" />;
  }

  const handleClick = (e: any) => {
    const target = e.target.closest?.('[data-action]');
    if (!target) return;
    const action = target.getAttribute('data-action');
    if (action === 'login') router.push('/login');
    else if (action === 'signup') router.push('/login');
    else if (action === 'demo') {
      document.getElementById('funkcje')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const Div: any = 'div';
  const StyleTag: any = 'style';

  return (
    <Div onClick={handleClick} style={{ minHeight: '100vh', background: '#ffffff' }}>
      <StyleTag dangerouslySetInnerHTML={{ __html: STYLES }} />
      <Div dangerouslySetInnerHTML={{ __html: HTML }} />
    </Div>
  );
}
