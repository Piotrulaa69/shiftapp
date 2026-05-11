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

/* ── DASHBOARD PREVIEW ── */
.sa-dash-section { position: relative; z-index: 10; max-width: 1400px; margin: 0 auto; padding: 60px 32px 100px; }
.sa-dash-intro { text-align: center; max-width: 700px; margin: 0 auto; }
.sa-dash-mockup {
  background: white; border-radius: 20px;
  box-shadow: 0 30px 80px -20px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04);
  overflow: hidden; display: grid;
  grid-template-columns: 220px 1fr;
  height: 540px; margin-top: 50px;
}
.sa-dash-sidebar { background: #f5f5f3; border-right: 1px solid rgba(0,0,0,0.07); padding: 16px 12px; display: flex; flex-direction: column; gap: 4px; }
.sa-dash-brand-row { display: flex; align-items: center; gap: 8px; padding: 6px 10px 14px; font-family: 'Fustat',sans-serif; font-weight: 700; font-size: 15px; color: #0f172a; }
.sa-dash-brand-mark { width: 24px; height: 24px; border-radius: 6px; background: linear-gradient(135deg,#0084FF,#60B1FF); color: white; font-weight: 800; font-size: 12px; display: flex; align-items: center; justify-content: center; }
.sa-dash-group-label { font-size: 10px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; padding: 12px 10px 6px; }
.sa-dash-nav-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; font-size: 13.5px; font-weight: 500; color: #4b5563; cursor: pointer; }
.sa-dash-nav-item.active { background: white; font-weight: 600; color: #0f172a; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
.sa-dash-icon { width: 16px; height: 16px; flex-shrink: 0; }
.sa-dash-main { display: flex; flex-direction: column; min-width: 0; }
.sa-dash-header { height: 56px; border-bottom: 1px solid rgba(0,0,0,0.07); display: flex; justify-content: space-between; align-items: center; padding: 0 24px; flex-shrink: 0; }
.sa-dash-title { font-size: 15px; font-weight: 600; color: #0f172a; }
.sa-dash-content { padding: 24px; overflow: auto; }
.sa-dash-kpis { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin-bottom: 20px; }
.sa-dash-kpi { background: #F4F8F9; border-radius: 14px; padding: 16px; }
.sa-dash-kpi-label { font-size: 11px; font-weight: 500; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; }
.sa-dash-kpi-num { font-size: 24px; font-weight: 700; color: #0f172a; margin-top: 6px; letter-spacing: -0.5px; }
.sa-dash-kpi-delta { font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 9999px; margin-top: 6px; display: inline-block; }
.sa-dash-table { background: white; border: 1px solid rgba(0,0,0,0.05); border-radius: 14px; overflow: hidden; }
.sa-dash-row { display: grid; grid-template-columns: 60px 1fr 90px 70px 100px; gap: 12px; padding: 12px 16px; align-items: center; border-bottom: 1px solid rgba(0,0,0,0.05); font-size: 13px; }
.sa-dash-row:last-child { border-bottom: none; }
.sa-dash-row.head { font-size: 10px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px; background: #fafafa; }
.sa-dash-tag { display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
.sa-dash-tag.green { background: #DCFCE7; color: #16A34A; }
.sa-dash-tag.amber { background: #FEF3C7; color: #D97706; }
@media (max-width: 880px) {
  .sa-dash-mockup { grid-template-columns: 1fr; height: auto; }
  .sa-dash-sidebar { display: none; }
  .sa-dash-kpis { grid-template-columns: 1fr; }
}

/* ── REGISTRATION SECTION ── */
.sa-reg-section { position: relative; z-index: 10; background: #0a0a0a; padding: 80px 16px; }
.sa-reg-intro { text-align: center; max-width: 700px; margin: 0 auto 50px; }
.sa-reg-card {
  max-width: 1400px; margin: 0 auto; background: #0a0a0a;
  border-radius: 24px; display: grid;
  grid-template-columns: 52% 1fr; gap: 16px;
  min-height: 520px; padding: 8px;
}
@media (max-width: 1024px) { .sa-reg-card { grid-template-columns: 1fr; } }
.sa-reg-left {
  position: relative; border-radius: 20px; overflow: hidden;
  background:
    radial-gradient(circle at 30% 30%, rgba(0,132,255,0.5) 0%, transparent 55%),
    radial-gradient(circle at 75% 75%, rgba(96,177,255,0.35) 0%, transparent 55%),
    linear-gradient(180deg, #1e3a8a 0%, #0a0a0a 100%);
  padding: 40px;
  display: flex; flex-direction: column;
  justify-content: flex-end;
  min-height: 400px;
}
@media (max-width: 1024px) { .sa-reg-left { display: none; } }
.sa-reg-left-content { color: white; max-width: 320px; }
.sa-reg-left-brand { display: flex; align-items: center; gap: 8px; margin-bottom: 32px; font-family: 'Fustat',sans-serif; font-weight: 700; font-size: 18px; }
.sa-reg-left-h { font-size: 32px; font-weight: 500; letter-spacing: -1px; margin-bottom: 8px; }
.sa-reg-left-sub { font-size: 14px; color: rgba(255,255,255,0.65); margin-bottom: 28px; line-height: 1.5; }
.sa-step-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; margin-bottom: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.75); font-size: 14px; }
.sa-step-item.active { background: white; color: #0a0a0a; border-color: white; font-weight: 500; }
.sa-step-num { width: 24px; height: 24px; border-radius: 9999px; background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.4); font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sa-step-item.active .sa-step-num { background: #0a0a0a; color: white; }
.sa-reg-right { background: #0a0a0a; padding: 60px 40px; display: flex; flex-direction: column; justify-content: center; align-items: center; }
.sa-reg-form { width: 100%; max-width: 400px; }
.sa-reg-h { font-size: 28px; font-weight: 500; color: white; letter-spacing: -0.5px; }
.sa-reg-h-sub { font-size: 14px; color: rgba(255,255,255,0.4); margin-top: 6px; margin-bottom: 32px; }
.sa-reg-socials { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
.sa-reg-social { background: #1A1A1A; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px; color: white; font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: background 0.2s; font-family: inherit; }
.sa-reg-social:hover { background: rgba(255,255,255,0.05); }
.sa-reg-divider { display: flex; align-items: center; gap: 12px; margin: 8px 0 20px; }
.sa-reg-divider::before, .sa-reg-divider::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.1); }
.sa-reg-divider span { font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1.5px; }
.sa-reg-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
.sa-reg-field { margin-bottom: 12px; }
.sa-reg-label { display: block; font-size: 13px; font-weight: 500; color: white; margin-bottom: 6px; }
.sa-reg-input { width: 100%; background: #1A1A1A; border: none; border-radius: 12px; height: 44px; padding: 0 14px; color: white; font-size: 14px; font-family: inherit; outline: none; transition: box-shadow 0.2s; box-sizing: border-box; }
.sa-reg-input:focus { box-shadow: 0 0 0 2px rgba(255,255,255,0.2); }
.sa-reg-input::placeholder { color: rgba(255,255,255,0.2); }
.sa-reg-submit { width: 100%; height: 52px; background: white; color: #0a0a0a; border: none; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 16px; transition: all 0.2s; font-family: inherit; }
.sa-reg-submit:hover { background: rgba(255,255,255,0.9); }

/* ── PRICING ── */
.sa-pricing { position: relative; z-index: 10; max-width: 1200px; margin: 0 auto; padding: 100px 32px; text-align: center; }
.sa-pricing-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; text-align: left; margin-top: 50px; }
@media (max-width: 900px) { .sa-pricing-grid { grid-template-columns: 1fr; max-width: 400px; margin-left: auto; margin-right: auto; } }
.sa-plan { background: #F4F8F9; border-radius: 20px; padding: 32px 28px; border: 1px solid rgba(0,0,0,0.04); display: flex; flex-direction: column; transition: transform 0.3s, box-shadow 0.3s; position: relative; }
.sa-plan:hover { transform: translateY(-3px); box-shadow: 0 20px 40px -10px rgba(0,0,0,0.1); }
.sa-plan.featured { background: #0a0a0a; color: white; border: none; box-shadow: 0 20px 60px -10px rgba(0,132,255,0.3); }
.sa-plan-badge { position: absolute; top: -10px; right: 24px; background: rgba(0,132,255,0.85); color: white; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.8px; }
.sa-plan-name { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 12px; }
.sa-plan.featured .sa-plan-name { color: rgba(255,255,255,0.6); }
.sa-plan-price { display: flex; align-items: baseline; gap: 4px; margin-bottom: 8px; }
.sa-plan-amount { font-size: 44px; font-weight: 700; letter-spacing: -2px; color: #0f172a; line-height: 1; }
.sa-plan.featured .sa-plan-amount { color: white; }
.sa-plan-currency { font-size: 14px; font-weight: 500; color: #64748b; }
.sa-plan-tagline { font-size: 14px; color: #64748b; margin-bottom: 24px; line-height: 1.5; margin-top: 4px; }
.sa-plan.featured .sa-plan-tagline { color: rgba(255,255,255,0.6); }
.sa-plan-features { list-style: none; flex: 1; margin-bottom: 24px; }
.sa-plan-features li { display: flex; align-items: flex-start; gap: 10px; padding: 7px 0; font-size: 14px; color: #475569; }
.sa-plan.featured .sa-plan-features li { color: rgba(255,255,255,0.85); }
.sa-plan-check { flex-shrink: 0; width: 18px; height: 18px; border-radius: 9999px; background: rgba(0,132,255,0.1); color: #0084FF; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; margin-top: 1px; }
.sa-plan.featured .sa-plan-check { background: rgba(255,255,255,0.15); color: white; }
.sa-plan-cta { background: white; border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; padding: 12px 18px; font-size: 14px; font-weight: 600; color: #0f172a; cursor: pointer; transition: all 0.2s; width: 100%; font-family: inherit; }
.sa-plan-cta:hover { background: rgba(0,0,0,0.04); }
.sa-plan.featured .sa-plan-cta { background: rgba(0,132,255,0.85); color: white; border: none; box-shadow: inset 0px 4px 4px 0px rgba(255,255,255,0.35); }
.sa-plan.featured .sa-plan-cta:hover { background: rgba(0,132,255,1); }

/* ── FINAL CTA ── */
.sa-final-cta { position: relative; z-index: 10; max-width: 1200px; margin: 0 auto; padding: 60px 32px 100px; }
.sa-final-cta-card {
  position: relative;
  background:
    radial-gradient(circle at 30% 0%, rgba(96,177,255,0.45) 0%, transparent 55%),
    radial-gradient(circle at 80% 100%, rgba(0,132,255,0.35) 0%, transparent 55%),
    #0a0a0a;
  border-radius: 28px; padding: 80px 40px;
  text-align: center; overflow: hidden;
}
.sa-final-cta-h { font-family: 'Fustat',sans-serif; font-weight: 700; font-size: 56px; letter-spacing: -1.5px; line-height: 1.05; color: white; max-width: 700px; margin: 0 auto 16px; }
@media (max-width: 600px) { .sa-final-cta-h { font-size: 40px; letter-spacing: -1px; } }
.sa-final-cta-sub { font-size: 17px; color: rgba(255,255,255,0.65); max-width: 500px; margin: 0 auto 32px; line-height: 1.5; }
.sa-final-cta-btn { display: inline-flex; align-items: center; gap: 10px; padding: 14px 28px; background: white; color: #0a0a0a; border: none; border-radius: 14px; font-size: 15px; font-weight: 600; cursor: pointer; transition: transform 0.2s; font-family: inherit; }
.sa-final-cta-btn:hover { transform: scale(1.02); }

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

  <!-- DASHBOARD PREVIEW -->
  <section class="sa-dash-section" id="produkt">
    <div class="sa-dash-intro">
      <div class="sa-section-badge">Panel</div>
      <h2 class="sa-section-title">Jeden panel.<br/>Pełna kontrola.</h2>
      <p class="sa-section-sub">Wszystkie operacje w jednym miejscu.\nSzybko, czysto, bez zbędnych kliknięć.</p>
    </div>
    <div class="sa-dash-mockup">
      <aside class="sa-dash-sidebar">
        <div class="sa-dash-brand-row">
          <div class="sa-dash-brand-mark">S</div>
          <span>ShiftApp</span>
        </div>
        <div class="sa-dash-group-label">Główne</div>
        <div class="sa-dash-nav-item active"><svg class="sa-dash-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg><span>Pulpit</span></div>
        <div class="sa-dash-nav-item"><svg class="sa-dash-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span>Rezerwacje</span></div>
        <div class="sa-dash-nav-item"><svg class="sa-dash-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 3h18v18H3z"/><path d="M3 9h18M9 21V9"/></svg><span>Zamówienia</span></div>
        <div class="sa-dash-nav-item"><svg class="sa-dash-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg><span>Goście</span></div>
        <div class="sa-dash-group-label">Operacje</div>
        <div class="sa-dash-nav-item"><svg class="sa-dash-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/></svg><span>Personel</span></div>
        <div class="sa-dash-nav-item"><svg class="sa-dash-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg><span>Stoły</span></div>
        <div class="sa-dash-nav-item"><svg class="sa-dash-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span>Menu</span></div>
        <div class="sa-dash-group-label">Raporty</div>
        <div class="sa-dash-nav-item"><svg class="sa-dash-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg><span>Przychody</span></div>
        <div class="sa-dash-nav-item"><svg class="sa-dash-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg><span>Statystyki</span></div>
      </aside>
      <div class="sa-dash-main">
        <div class="sa-dash-header">
          <div class="sa-dash-title">Pulpit · Wtorek, 11 listopada</div>
          <div style="display:flex;gap:8px;">
            <button class="sa-cta-secondary" style="padding:7px 14px;font-size:12px;">Eksport</button>
            <button style="padding:7px 14px;font-size:12px;font-weight:600;background:rgba(0,132,255,0.85);color:white;border:none;border-radius:10px;cursor:pointer;font-family:inherit;">+ Rezerwacja</button>
          </div>
        </div>
        <div class="sa-dash-content">
          <div class="sa-dash-kpis">
            <div class="sa-dash-kpi">
              <div class="sa-dash-kpi-label">Rezerwacje dziś</div>
              <div class="sa-dash-kpi-num">42</div>
              <span class="sa-dash-kpi-delta" style="background:#DCFCE7;color:#16A34A;">+8 vs wczoraj</span>
            </div>
            <div class="sa-dash-kpi">
              <div class="sa-dash-kpi-label">Obłożenie</div>
              <div class="sa-dash-kpi-num">87%</div>
              <span class="sa-dash-kpi-delta" style="background:#DBEAFE;color:#1D4ED8;">Pełny wieczór</span>
            </div>
            <div class="sa-dash-kpi">
              <div class="sa-dash-kpi-label">Przychód dziś</div>
              <div class="sa-dash-kpi-num">8&nbsp;940&nbsp;zł</div>
              <span class="sa-dash-kpi-delta" style="background:#DCFCE7;color:#16A34A;">+12.4%</span>
            </div>
          </div>
          <div class="sa-dash-table">
            <div class="sa-dash-row head"><div>Stolik</div><div>Gość</div><div>Czas</div><div>Osoby</div><div>Status</div></div>
            <div class="sa-dash-row"><div style="font-weight:600;color:#0f172a;">T7</div><div>Anna Kowalska</div><div>19:30</div><div>4</div><div><span class="sa-dash-tag green">Potwierdz.</span></div></div>
            <div class="sa-dash-row"><div style="font-weight:600;color:#0f172a;">T2</div><div>Piotr Nowak</div><div>20:00</div><div>2</div><div><span class="sa-dash-tag amber">Walk-in</span></div></div>
            <div class="sa-dash-row"><div style="font-weight:600;color:#0f172a;">T11</div><div>Marta Lis</div><div>20:30</div><div>6</div><div><span class="sa-dash-tag green">Potwierdz.</span></div></div>
            <div class="sa-dash-row"><div style="font-weight:600;color:#0f172a;">T4</div><div>Tomasz Wróbel</div><div>21:00</div><div>3</div><div><span class="sa-dash-tag green">Potwierdz.</span></div></div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- REGISTRATION -->
  <section class="sa-reg-section">
    <div class="sa-reg-intro">
      <div class="sa-section-badge">Rejestracja</div>
      <h2 class="sa-section-title" style="color:white;">Zacznij w 2 minuty</h2>
      <p class="sa-section-sub" style="color:rgba(255,255,255,0.55);">Bez karty kredytowej.\n14 dni za darmo.</p>
    </div>
    <div class="sa-reg-card">
      <div class="sa-reg-left">
        <div class="sa-reg-left-content">
          <div class="sa-reg-left-brand">
            <div class="sa-nav-mark">S</div>
            <span>ShiftApp</span>
          </div>
          <div class="sa-reg-left-h">Dołącz do ShiftApp</div>
          <div class="sa-reg-left-sub">3 kroki do pełnej kontroli restauracji.</div>
          <div class="sa-step-item active"><div class="sa-step-num">1</div><span>Utwórz konto</span></div>
          <div class="sa-step-item"><div class="sa-step-num">2</div><span>Skonfiguruj lokal</span></div>
          <div class="sa-step-item"><div class="sa-step-num">3</div><span>Zaproś zespół</span></div>
        </div>
      </div>
      <div class="sa-reg-right">
        <div class="sa-reg-form">
          <div class="sa-reg-h">Utwórz konto</div>
          <div class="sa-reg-h-sub">Bezpłatny okres próbny 14 dni.</div>
          <div class="sa-reg-socials">
            <button class="sa-reg-social">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              Google
            </button>
            <button class="sa-reg-social">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
              Apple
            </button>
          </div>
          <div class="sa-reg-divider"><span>lub</span></div>
          <div class="sa-reg-row2">
            <div class="sa-reg-field"><label class="sa-reg-label">Imię</label><input class="sa-reg-input" placeholder="Jan" /></div>
            <div class="sa-reg-field"><label class="sa-reg-label">Nazwisko</label><input class="sa-reg-input" placeholder="Kowalski" /></div>
          </div>
          <div class="sa-reg-field"><label class="sa-reg-label">Email</label><input class="sa-reg-input" placeholder="jan@restauracja.pl" /></div>
          <div class="sa-reg-field"><label class="sa-reg-label">Hasło</label><input class="sa-reg-input" type="password" placeholder="Min. 8 znaków" /></div>
          <button class="sa-reg-submit" data-action="signup">Utwórz konto</button>
        </div>
      </div>
    </div>
  </section>

  <!-- PRICING -->
  <section class="sa-pricing" id="cennik">
    <div class="sa-section-badge">Cennik</div>
    <h2 class="sa-section-title">Plan dla każdej restauracji</h2>
    <p class="sa-section-sub">Bez ukrytych kosztów.\nAnuluj kiedy chcesz.</p>
    <div class="sa-pricing-grid">
      <div class="sa-plan">
        <div class="sa-plan-name">Starter</div>
        <div class="sa-plan-price"><span class="sa-plan-amount">99</span><span class="sa-plan-currency">zł / mies.</span></div>
        <div class="sa-plan-tagline">Dla małych lokali do 30 miejsc.</div>
        <ul class="sa-plan-features">
          <li><span class="sa-plan-check">✓</span><span>Rezerwacje online</span></li>
          <li><span class="sa-plan-check">✓</span><span>Profil gościa (do 500)</span></li>
          <li><span class="sa-plan-check">✓</span><span>1 użytkownik</span></li>
          <li><span class="sa-plan-check">✓</span><span>Wsparcie e-mail</span></li>
        </ul>
        <button class="sa-plan-cta" data-action="signup">Wypróbuj za darmo</button>
      </div>
      <div class="sa-plan featured">
        <div class="sa-plan-badge">Popularny</div>
        <div class="sa-plan-name">Pro</div>
        <div class="sa-plan-price"><span class="sa-plan-amount">249</span><span class="sa-plan-currency">zł / mies.</span></div>
        <div class="sa-plan-tagline">Dla rozwijających się restauracji.</div>
        <ul class="sa-plan-features">
          <li><span class="sa-plan-check">✓</span><span>Wszystko ze Starter</span></li>
          <li><span class="sa-plan-check">✓</span><span>Nielimitowani goście</span></li>
          <li><span class="sa-plan-check">✓</span><span>5 użytkowników</span></li>
          <li><span class="sa-plan-check">✓</span><span>Analityka i raporty</span></li>
          <li><span class="sa-plan-check">✓</span><span>SMS przypomnienia</span></li>
          <li><span class="sa-plan-check">✓</span><span>Wsparcie 24/7</span></li>
        </ul>
        <button class="sa-plan-cta" data-action="signup">Wypróbuj Pro</button>
      </div>
      <div class="sa-plan">
        <div class="sa-plan-name">Enterprise</div>
        <div class="sa-plan-price"><span class="sa-plan-amount" style="font-size:28px;">Indywidualny</span></div>
        <div class="sa-plan-tagline">Dla sieci i grup gastronomicznych.</div>
        <ul class="sa-plan-features">
          <li><span class="sa-plan-check">✓</span><span>Wszystko z Pro</span></li>
          <li><span class="sa-plan-check">✓</span><span>Multi-lokal</span></li>
          <li><span class="sa-plan-check">✓</span><span>Nielimitowani użytkownicy</span></li>
          <li><span class="sa-plan-check">✓</span><span>Dedykowane API</span></li>
          <li><span class="sa-plan-check">✓</span><span>Account Manager</span></li>
        </ul>
        <button class="sa-plan-cta">Skontaktuj się</button>
      </div>
    </div>
  </section>

  <!-- FINAL CTA -->
  <section class="sa-final-cta">
    <div class="sa-final-cta-card">
      <h2 class="sa-final-cta-h">Gotowy na koniec chaosu?</h2>
      <p class="sa-final-cta-sub">Dołącz do 500+ restauracji, które zarządzają operacjami w jednym miejscu.</p>
      <button class="sa-final-cta-btn" data-action="signup">
        Zacznij za darmo
        <span style="font-size:18px;">→</span>
      </button>
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
