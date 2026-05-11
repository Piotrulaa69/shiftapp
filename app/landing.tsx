import { Redirect, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/* ──────────────────────────────────────────────────────────────────────────
   STYLES
   ────────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fustat:wght@200..800&family=Inter:wght@300;400;500;600;700&display=swap');

#sa-portal, #sa-portal * { box-sizing: border-box; }

#sa-portal {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #0f172a;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: #ffffff;
  min-height: 100vh;
  width: 100%;
  position: relative;
  overflow-x: hidden;
}

#sa-portal a { color: inherit; text-decoration: none; }
#sa-portal button { font-family: inherit; cursor: pointer; border: none; background: none; }
#sa-portal h1, #sa-portal h2, #sa-portal h3, #sa-portal h4, #sa-portal p, #sa-portal ul {
  margin: 0; padding: 0;
}
#sa-portal ul { list-style: none; }

/* ── Background glow ── */
.sa-glow {
  position: absolute; pointer-events: none; z-index: 0;
  border-radius: 9999px;
}
.sa-glow-1 { top: -200px; left: -200px; width: 700px; height: 500px; background: #60B1FF; opacity: 0.22; filter: blur(120px); }
.sa-glow-2 { top: 50px; left: 80px; width: 450px; height: 350px; background: #319AFF; opacity: 0.16; filter: blur(80px); }

/* ──────────── NAVBAR ──────────── */
.sa-nav {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 8px 8px 8px 18px;
  background: rgba(255,255,255,0.55);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 16px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.6), 0 4px 24px rgba(0,0,0,0.04);
  transition: box-shadow 0.25s ease, background 0.25s ease;
}
.sa-nav.scrolled {
  background: rgba(255,255,255,0.85);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.6), 0 8px 32px rgba(0,0,0,0.08);
}
.sa-nav-brand {
  display: flex; align-items: center; gap: 8px;
  font-family: 'Fustat', sans-serif;
  font-weight: 700; font-size: 17px;
  letter-spacing: -0.5px; color: #0f172a;
  cursor: pointer;
}
.sa-mark {
  width: 26px; height: 26px;
  border-radius: 7px;
  background: linear-gradient(135deg, #0084FF, #60B1FF);
  display: flex; align-items: center; justify-content: center;
  color: white; font-weight: 800; font-size: 13px;
  box-shadow: inset 0 1px 2px rgba(255,255,255,0.4);
  font-family: 'Fustat', sans-serif;
}
.sa-nav-links {
  display: flex; gap: 24px;
  font-size: 14px; font-weight: 500;
  color: #0f172a;
}
.sa-nav-links button { font-size: 14px; font-weight: 500; color: #0f172a; transition: color 0.2s; padding: 0; }
.sa-nav-links button:hover { color: #0084FF; }
.sa-nav-cta {
  background: rgba(255,255,255,0.7);
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 12px;
  padding: 8px 16px;
  font-size: 13px; font-weight: 600;
  color: #0f172a;
  display: flex; align-items: center; gap: 6px;
  transition: all 0.2s;
}
.sa-nav-cta:hover { background: white; transform: translateY(-1px); }

@media (max-width: 880px) {
  .sa-nav-links { display: none; }
  .sa-nav { gap: 16px; }
}

/* ──────────── HERO ──────────── */
.sa-hero {
  position: relative; z-index: 10;
  max-width: 1600px;
  margin: 0 auto;
  padding: 180px 60px 80px;
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 60px;
  align-items: center;
  min-height: 100vh;
}
@media (max-width: 1024px) {
  .sa-hero { grid-template-columns: 1fr; padding: 140px 32px 60px; gap: 40px; min-height: auto; }
}

.sa-hero-left { display: flex; flex-direction: column; gap: 28px; }

.sa-badge {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 7px 14px;
  border-radius: 9999px;
  background: rgba(255,255,255,0.7);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(0,0,0,0.07);
  font-size: 13px; font-weight: 500;
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
@media (max-width: 1280px) { .sa-headline { font-size: 64px; letter-spacing: -1.8px; } }
@media (max-width: 1024px) { .sa-headline { font-size: 56px; letter-spacing: -1.5px; } }
@media (max-width: 600px)  { .sa-headline { font-size: 42px; letter-spacing: -1px; } }

.sa-grad {
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
  background: rgba(0,132,255,0.85);
  backdrop-filter: blur(2px);
  border-radius: 16px;
  color: white;
  font-size: 15px; font-weight: 600;
  box-shadow: inset 0 4px 4px rgba(255,255,255,0.35), 0 8px 24px rgba(0,132,255,0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.sa-cta:hover { transform: scale(1.02); box-shadow: inset 0 4px 4px rgba(255,255,255,0.4), 0 12px 32px rgba(0,132,255,0.35); }
.sa-cta-arrow {
  width: 36px; height: 36px;
  border-radius: 9999px;
  background: white;
  color: #0084FF;
  display: flex; align-items: center; justify-content: center;
}

.sa-cta-secondary {
  padding: 13px 22px;
  background: transparent;
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 16px;
  font-size: 14px; font-weight: 600;
  color: #0f172a;
  transition: all 0.2s;
}
.sa-cta-secondary:hover { background: rgba(0,0,0,0.04); }

/* ── Orb ── */
.sa-orb-wrap {
  position: relative;
  display: flex; align-items: center; justify-content: center;
  height: 540px;
}
@media (max-width: 1024px) { .sa-orb-wrap { height: 360px; } }
.sa-orb {
  position: relative;
  width: 460px; height: 460px;
  border-radius: 9999px;
  background: radial-gradient(circle at 35% 30%,
    rgba(255,255,255,0.95) 0%,
    rgba(150,200,255,0.85) 18%,
    rgba(0,132,255,0.95) 45%,
    rgba(0,80,200,1) 75%,
    rgba(20,30,80,1) 100%);
  box-shadow:
    0 30px 100px rgba(0,132,255,0.45),
    inset -30px -50px 100px rgba(0,30,100,0.5),
    inset 20px 30px 80px rgba(255,255,255,0.3);
  animation: sa-float 8s ease-in-out infinite;
}
@media (max-width: 1024px) { .sa-orb { width: 320px; height: 320px; } }
.sa-orb::before {
  content: ''; position: absolute;
  top: 12%; left: 18%;
  width: 30%; height: 25%;
  background: radial-gradient(ellipse, rgba(255,255,255,0.7), transparent 60%);
  border-radius: 9999px;
  filter: blur(8px);
}
@keyframes sa-float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-20px) scale(1.02); }
}

/* ──────────── TRUSTED ──────────── */
.sa-trusted {
  position: relative; z-index: 10;
  max-width: 1600px; margin: 0 auto;
  padding: 20px 60px 60px;
  text-align: center;
}
.sa-trusted-label {
  font-size: 11px; font-weight: 600;
  letter-spacing: 1.5px; text-transform: uppercase;
  color: #94a3b8; margin-bottom: 28px;
}
.sa-trusted-row {
  display: flex; justify-content: center; align-items: center;
  gap: 80px; flex-wrap: wrap; opacity: 0.45;
}
.sa-tlogo {
  font-family: 'Fustat', sans-serif;
  font-weight: 700; font-size: 22px;
  color: #475569; letter-spacing: -0.5px;
}
@media (max-width: 768px) { .sa-trusted-row { gap: 36px; } .sa-tlogo { font-size: 18px; } }

/* ──────────── SECTION HEADERS ──────────── */
.sa-sec-intro { text-align: center; max-width: 720px; margin: 0 auto; }
.sa-sec-badge {
  display: inline-block;
  font-size: 12px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 1px;
  margin-bottom: 16px;
  background: linear-gradient(90deg, #F5C344, #F28482, #B567C2);
  -webkit-background-clip: text; background-clip: text;
  color: transparent;
}
.sa-sec-title {
  font-size: 44px; font-weight: 500;
  color: #0f172a; letter-spacing: -0.02em;
  line-height: 1.1; margin-bottom: 14px;
}
@media (max-width: 600px) { .sa-sec-title { font-size: 32px; } }
.sa-sec-sub {
  font-size: 17px; color: #64748b;
  line-height: 1.5; white-space: pre-line;
}

/* ──────────── FEATURES ──────────── */
.sa-features {
  position: relative; z-index: 10;
  max-width: 1200px; margin: 0 auto;
  padding: 100px 32px;
}
.sa-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-top: 56px;
}
@media (max-width: 900px) { .sa-grid-3 { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .sa-grid-3 { grid-template-columns: 1fr; } }

.sa-feat {
  position: relative;
  border-radius: 20px;
  height: 340px;
  display: flex; flex-direction: column;
  justify-content: flex-end;
  overflow: hidden;
  background: #F4F8F9;
  box-shadow: 0 10px 30px -10px rgba(0,0,0,0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.sa-feat:hover { transform: translateY(-3px); box-shadow: 0 20px 40px -10px rgba(0,0,0,0.15); }
.sa-feat-1 { background: radial-gradient(circle at 50% 0%, #60B1FF 0%, #C5E4FF 30%, #F4F8F9 60%, #F4F8F9 100%); }
.sa-feat-2 { background: radial-gradient(circle at 50% 0%, #F28482 0%, #FFDDD9 30%, #F4F8F9 60%, #F4F8F9 100%); }
.sa-feat-3 { background: radial-gradient(circle at 50% 0%, #F5C344 0%, #FFF3C4 30%, #F4F8F9 60%, #F4F8F9 100%); }

.sa-feat-vis { position: absolute; top: 30px; left: 24px; right: 24px; }
.sa-feat-title { font-size: 17px; font-weight: 600; color: #1e293b; padding: 24px 24px 4px; }
.sa-feat-desc { font-size: 14px; color: #64748b; padding: 0 24px 24px; line-height: 1.5; }

.sa-resv {
  background: white; border-radius: 12px; padding: 14px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 10px;
}
.sa-resv-tag {
  width: 38px; height: 38px; border-radius: 8px;
  background: linear-gradient(135deg, #0084FF, #60B1FF);
  color: white; display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 13px;
}
.sa-resv-info { flex: 1; min-width: 0; }
.sa-resv-name { font-size: 13px; font-weight: 600; color: #0f172a; }
.sa-resv-time { font-size: 11px; color: #64748b; margin-top: 2px; }
.sa-resv-dot { width: 8px; height: 8px; border-radius: 9999px; background: #22c55e; box-shadow: 0 0 0 4px rgba(34,197,94,0.18); }

.sa-guest {
  background: white; border-radius: 12px; padding: 16px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
  display: flex; align-items: center; gap: 12px;
}
.sa-guest-av {
  width: 44px; height: 44px; border-radius: 9999px;
  background: linear-gradient(135deg, #F28482, #FCA5A5);
  color: white; display: flex; align-items: center; justify-content: center;
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

.sa-ana {
  background: white; border-radius: 12px; padding: 18px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
}
.sa-ana-row { display: flex; justify-content: space-between; align-items: flex-start; }
.sa-ana-num { font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px; }
.sa-ana-label { font-size: 10px; font-weight: 500; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 4px; }
.sa-ana-delta {
  font-size: 11px; font-weight: 600;
  padding: 3px 7px; border-radius: 9999px;
  background: #DCFCE7; color: #16A34A;
}
.sa-ana-spark {
  margin-top: 12px; height: 36px;
  background: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 30' preserveAspectRatio='none'><polyline fill='none' stroke='%23F5C344' stroke-width='2' points='0,22 12,18 24,20 36,12 48,15 60,8 72,11 84,5 100,7'/></svg>") no-repeat center / 100% 100%;
}

/* ──────────── DASHBOARD PREVIEW ──────────── */
.sa-dash-section {
  position: relative; z-index: 10;
  max-width: 1400px; margin: 0 auto;
  padding: 60px 32px 100px;
}
.sa-dash-mockup {
  background: white; border-radius: 20px;
  box-shadow: 0 30px 80px -20px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04);
  overflow: hidden; display: grid;
  grid-template-columns: 220px 1fr;
  height: 540px; margin-top: 56px;
}
.sa-dsb {
  background: #f5f5f3;
  border-right: 1px solid rgba(0,0,0,0.07);
  padding: 16px 12px;
  display: flex; flex-direction: column; gap: 4px;
}
.sa-dsb-brand { display: flex; align-items: center; gap: 8px; padding: 6px 10px 14px; font-family: 'Fustat',sans-serif; font-weight: 700; font-size: 15px; color: #0f172a; }
.sa-dsb-mark { width: 22px; height: 22px; border-radius: 6px; background: linear-gradient(135deg,#0084FF,#60B1FF); color: white; font-weight: 800; font-size: 11px; display: flex; align-items: center; justify-content: center; }
.sa-dsb-group { font-size: 10px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; padding: 12px 10px 6px; }
.sa-dsb-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; font-size: 13.5px; font-weight: 500; color: #4b5563; }
.sa-dsb-item.act { background: white; font-weight: 600; color: #0f172a; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
.sa-dsb-icn { width: 16px; height: 16px; flex-shrink: 0; }

.sa-dmain { display: flex; flex-direction: column; min-width: 0; }
.sa-dhd { height: 56px; border-bottom: 1px solid rgba(0,0,0,0.07); display: flex; justify-content: space-between; align-items: center; padding: 0 24px; flex-shrink: 0; }
.sa-dhd-title { font-size: 15px; font-weight: 600; color: #0f172a; }
.sa-dhd-actions { display: flex; gap: 8px; }
.sa-dhd-btn { padding: 7px 14px; font-size: 12px; font-weight: 600; border-radius: 10px; border: 1px solid rgba(0,0,0,0.1); background: white; color: #0f172a; }
.sa-dhd-btn.prim { background: rgba(0,132,255,0.85); color: white; border: none; box-shadow: inset 0 2px 2px rgba(255,255,255,0.3); }

.sa-dcontent { padding: 24px; overflow: auto; }
.sa-dkpi-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin-bottom: 20px; }
.sa-dkpi { background: #F4F8F9; border-radius: 14px; padding: 16px; }
.sa-dkpi-l { font-size: 11px; font-weight: 500; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; }
.sa-dkpi-n { font-size: 24px; font-weight: 700; color: #0f172a; margin-top: 6px; letter-spacing: -0.5px; }
.sa-dkpi-d { font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 9999px; margin-top: 6px; display: inline-block; }

.sa-dtab { background: white; border: 1px solid rgba(0,0,0,0.05); border-radius: 14px; overflow: hidden; }
.sa-drow { display: grid; grid-template-columns: 60px 1fr 90px 70px 100px; gap: 12px; padding: 12px 16px; align-items: center; border-bottom: 1px solid rgba(0,0,0,0.05); font-size: 13px; }
.sa-drow:last-child { border-bottom: none; }
.sa-drow.h { font-size: 10px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px; background: #fafafa; }
.sa-dtag { display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
.sa-dtag.g { background: #DCFCE7; color: #16A34A; }
.sa-dtag.a { background: #FEF3C7; color: #D97706; }

@media (max-width: 880px) {
  .sa-dash-mockup { grid-template-columns: 1fr; height: auto; }
  .sa-dsb { display: none; }
  .sa-dkpi-row { grid-template-columns: 1fr; }
  .sa-drow { grid-template-columns: 50px 1fr 70px 50px 80px; gap: 8px; font-size: 12px; }
}

/* ──────────── REGISTRATION PREVIEW ──────────── */
.sa-reg-section {
  position: relative; z-index: 10;
  background: #0a0a0a;
  padding: 100px 16px;
}
.sa-reg-section .sa-sec-title { color: white; }
.sa-reg-section .sa-sec-sub { color: rgba(255,255,255,0.55); }
.sa-reg-card {
  max-width: 1400px; margin: 56px auto 0;
  display: grid; grid-template-columns: 52% 1fr; gap: 16px;
  min-height: 520px;
}
@media (max-width: 1024px) { .sa-reg-card { grid-template-columns: 1fr; } }
.sa-reg-left {
  position: relative; border-radius: 20px; overflow: hidden;
  background:
    radial-gradient(circle at 30% 30%, rgba(0,132,255,0.5) 0%, transparent 55%),
    radial-gradient(circle at 75% 75%, rgba(96,177,255,0.35) 0%, transparent 55%),
    linear-gradient(180deg, #1e3a8a 0%, #0a0a0a 100%);
  padding: 40px;
  display: flex; flex-direction: column; justify-content: flex-end;
  min-height: 400px;
}
@media (max-width: 1024px) { .sa-reg-left { display: none; } }
.sa-reg-l-content { color: white; max-width: 320px; }
.sa-reg-l-brand { display: flex; align-items: center; gap: 8px; margin-bottom: 32px; font-family: 'Fustat',sans-serif; font-weight: 700; font-size: 18px; }
.sa-reg-l-h { font-size: 32px; font-weight: 500; letter-spacing: -1px; margin-bottom: 8px; }
.sa-reg-l-sub { font-size: 14px; color: rgba(255,255,255,0.65); margin-bottom: 28px; line-height: 1.5; }
.sa-step { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; margin-bottom: 8px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.75); font-size: 14px; }
.sa-step.act { background: white; color: #0a0a0a; border-color: white; font-weight: 500; }
.sa-step-n { width: 24px; height: 24px; border-radius: 9999px; background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.4); font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sa-step.act .sa-step-n { background: #0a0a0a; color: white; }

.sa-reg-right { background: #0a0a0a; padding: 40px; display: flex; flex-direction: column; justify-content: center; align-items: center; border-radius: 20px; }
.sa-reg-form { width: 100%; max-width: 400px; }
.sa-reg-h { font-size: 28px; font-weight: 500; color: white; letter-spacing: -0.5px; }
.sa-reg-h-sub { font-size: 14px; color: rgba(255,255,255,0.4); margin-top: 6px; margin-bottom: 32px; }
.sa-reg-socials { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
.sa-reg-soc { background: #1A1A1A; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px; color: white; font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.2s; }
.sa-reg-soc:hover { background: rgba(255,255,255,0.05); }
.sa-reg-div { display: flex; align-items: center; gap: 12px; margin: 8px 0 20px; }
.sa-reg-div::before, .sa-reg-div::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.1); }
.sa-reg-div span { font-size: 11px; font-weight: 500; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1.5px; }
.sa-reg-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
.sa-reg-f { margin-bottom: 12px; }
.sa-reg-lbl { display: block; font-size: 13px; font-weight: 500; color: white; margin-bottom: 6px; }
.sa-reg-in { width: 100%; background: #1A1A1A; border: none; border-radius: 12px; height: 44px; padding: 0 14px; color: white; font-size: 14px; font-family: inherit; outline: none; transition: box-shadow 0.2s; }
.sa-reg-in:focus { box-shadow: 0 0 0 2px rgba(255,255,255,0.2); }
.sa-reg-in::placeholder { color: rgba(255,255,255,0.2); }
.sa-reg-submit { width: 100%; height: 52px; background: white; color: #0a0a0a; border-radius: 12px; font-size: 14px; font-weight: 600; margin-top: 16px; transition: all 0.2s; }
.sa-reg-submit:hover { background: rgba(255,255,255,0.9); }

/* ──────────── PRICING ──────────── */
.sa-pricing {
  position: relative; z-index: 10;
  max-width: 1200px; margin: 0 auto;
  padding: 100px 32px;
}
.sa-pricing .sa-sec-intro { margin-bottom: 0; }
.sa-plans { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; margin-top: 56px; }
@media (max-width: 900px) { .sa-plans { grid-template-columns: 1fr; max-width: 400px; margin-left: auto; margin-right: auto; } }
.sa-plan {
  background: #F4F8F9;
  border-radius: 20px;
  padding: 32px 28px;
  border: 1px solid rgba(0,0,0,0.04);
  display: flex; flex-direction: column;
  transition: transform 0.3s, box-shadow 0.3s;
  position: relative;
}
.sa-plan:hover { transform: translateY(-3px); box-shadow: 0 20px 40px -10px rgba(0,0,0,0.1); }
.sa-plan.feat { background: #0a0a0a; color: white; border: none; box-shadow: 0 20px 60px -10px rgba(0,132,255,0.3); }
.sa-plan-pin { position: absolute; top: -10px; right: 24px; background: rgba(0,132,255,0.85); color: white; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.8px; }
.sa-plan-name { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 12px; }
.sa-plan.feat .sa-plan-name { color: rgba(255,255,255,0.6); }
.sa-plan-price { display: flex; align-items: baseline; gap: 4px; margin-bottom: 8px; }
.sa-plan-amt { font-size: 44px; font-weight: 700; letter-spacing: -2px; color: #0f172a; line-height: 1; }
.sa-plan.feat .sa-plan-amt { color: white; }
.sa-plan-cur { font-size: 14px; font-weight: 500; color: #64748b; }
.sa-plan-tag { font-size: 14px; color: #64748b; margin-bottom: 24px; line-height: 1.5; margin-top: 4px; }
.sa-plan.feat .sa-plan-tag { color: rgba(255,255,255,0.6); }
.sa-plan-feats { flex: 1; margin-bottom: 24px; }
.sa-plan-feats li { display: flex; align-items: flex-start; gap: 10px; padding: 7px 0; font-size: 14px; color: #475569; }
.sa-plan.feat .sa-plan-feats li { color: rgba(255,255,255,0.85); }
.sa-plan-chk { flex-shrink: 0; width: 18px; height: 18px; border-radius: 9999px; background: rgba(0,132,255,0.1); color: #0084FF; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; margin-top: 1px; }
.sa-plan.feat .sa-plan-chk { background: rgba(255,255,255,0.15); color: white; }
.sa-plan-cta { background: white; border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; padding: 12px 18px; font-size: 14px; font-weight: 600; color: #0f172a; transition: all 0.2s; width: 100%; }
.sa-plan-cta:hover { background: rgba(0,0,0,0.04); }
.sa-plan.feat .sa-plan-cta { background: rgba(0,132,255,0.85); color: white; border: none; box-shadow: inset 0 4px 4px rgba(255,255,255,0.35); }
.sa-plan.feat .sa-plan-cta:hover { background: rgba(0,132,255,1); }

/* ──────────── FINAL CTA ──────────── */
.sa-final {
  position: relative; z-index: 10;
  max-width: 1200px; margin: 0 auto;
  padding: 60px 32px 100px;
}
.sa-final-card {
  position: relative;
  background:
    radial-gradient(circle at 30% 0%, rgba(96,177,255,0.45) 0%, transparent 55%),
    radial-gradient(circle at 80% 100%, rgba(0,132,255,0.35) 0%, transparent 55%),
    #0a0a0a;
  border-radius: 28px;
  padding: 80px 40px;
  text-align: center; overflow: hidden;
}
.sa-final-h { font-family: 'Fustat',sans-serif; font-weight: 700; font-size: 56px; letter-spacing: -1.5px; line-height: 1.05; color: white; max-width: 700px; margin: 0 auto 16px; }
@media (max-width: 600px) { .sa-final-h { font-size: 36px; letter-spacing: -1px; } }
.sa-final-sub { font-size: 17px; color: rgba(255,255,255,0.65); max-width: 500px; margin: 0 auto 32px; line-height: 1.5; }
.sa-final-btn { display: inline-flex; align-items: center; gap: 10px; padding: 14px 28px; background: white; color: #0a0a0a; border-radius: 14px; font-size: 15px; font-weight: 600; transition: transform 0.2s; }
.sa-final-btn:hover { transform: scale(1.02); }

/* ──────────── FOOTER ──────────── */
.sa-foot-wrap {
  position: relative;
  background: linear-gradient(180deg, #ffffff 0%, #f5f3ef 100%);
  padding: 80px 32px 40px;
  z-index: 10;
}
.sa-foot {
  max-width: 1200px; margin: 0 auto;
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(8px);
  border-radius: 24px;
  box-shadow: 0 20px 60px -10px rgba(0,0,0,0.12);
  overflow: hidden;
}
.sa-foot-top { display: flex; flex-direction: row; justify-content: space-between; gap: 40px; padding: 40px; }
@media (max-width: 768px) { .sa-foot-top { flex-direction: column; } }
.sa-foot-brand { display: flex; align-items: center; gap: 12px; }
.sa-foot-mark {
  width: 44px; height: 44px;
  border-radius: 10px;
  background: #f97316;
  box-shadow: inset 0 1px 2px rgba(255,255,255,0.3);
  display: flex; align-items: center; justify-content: center;
  color: white; font-family: 'Fustat',sans-serif; font-size: 22px; font-weight: 800;
}
.sa-foot-name { font-size: 26px; font-weight: 700; color: #0f172a; letter-spacing: -1px; }
.sa-foot-cols { display: flex; gap: 56px; flex-wrap: wrap; }
.sa-foot-col { display: flex; flex-direction: column; gap: 10px; min-width: 110px; }
.sa-foot-col-h { font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #0f172a; margin-bottom: 4px; }
.sa-foot-col a { font-size: 14px; color: #6b7280; font-weight: 500; transition: color 0.2s; }
.sa-foot-col a:hover { color: #f97316; }
.sa-foot-bot { border-top: 1px solid #f3f4f6; background: white; padding: 18px 40px; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
.sa-foot-copy { font-size: 13px; color: #6b7280; font-weight: 500; }
.sa-socials { display: flex; gap: 10px; }
.sa-soc {
  width: 40px; height: 40px;
  border-radius: 9999px;
  border: 1px solid #f3f4f6;
  display: flex; align-items: center; justify-content: center;
  color: #6b7280;
  transition: all 0.3s;
}
.sa-soc:hover { background: #f97316; color: white; border-color: #f97316; }
.sa-soc svg { width: 18px; height: 18px; }
`;

/* ──────────────────────────────────────────────────────────────────────────
   HTML (single source of truth)
   ────────────────────────────────────────────────────────────────────────── */
const HTML = `
<div class="sa-glow sa-glow-1"></div>
<div class="sa-glow sa-glow-2"></div>

<!-- NAVBAR -->
<nav class="sa-nav">
  <div class="sa-nav-brand" data-action="top">
    <div class="sa-mark">S</div>
    <span>ShiftApp</span>
  </div>
  <div class="sa-nav-links">
    <button data-action="scroll:produkt">Produkt</button>
    <button data-action="scroll:funkcje">Funkcje</button>
    <button data-action="scroll:cennik">Cennik</button>
    <button data-action="scroll:demo">Demo</button>
  </div>
  <button class="sa-nav-cta" data-action="login">
    Zaloguj się
    <span style="font-size:14px;">→</span>
  </button>
</nav>

<!-- HERO -->
<section class="sa-hero">
  <div class="sa-hero-left">
    <div class="sa-badge">
      <span class="sa-stars">★★★★★</span>
      <span>Oceniony 4.9/5 przez 500+ restauracji</span>
    </div>
    <h1 class="sa-headline">Zarządzaj <span class="sa-grad">restauracją</span>,<br/>nie paperworkiem.</h1>
    <p class="sa-sub">ShiftApp łączy rezerwacje, zespół i gości w jednym miejscu. Zero arkuszy. Zero chaosu. Tylko wyniki.</p>
    <div class="sa-cta-row">
      <button class="sa-cta" data-action="signup">
        Zacznij za darmo
        <span class="sa-cta-arrow">→</span>
      </button>
      <button class="sa-cta-secondary" data-action="scroll:demo">Zobacz demo</button>
    </div>
  </div>
  <div class="sa-orb-wrap"><div class="sa-orb"></div></div>
</section>

<!-- TRUSTED -->
<section class="sa-trusted">
  <div class="sa-trusted-label">Zaufały nam wiodące restauracje w Polsce</div>
  <div class="sa-trusted-row">
    <div class="sa-tlogo">Bistro&nbsp;Lumière</div>
    <div class="sa-tlogo">Trzy&nbsp;Stoły</div>
    <div class="sa-tlogo">NORDA</div>
    <div class="sa-tlogo">Krynica&nbsp;Co.</div>
    <div class="sa-tlogo">Atelier&nbsp;15</div>
  </div>
</section>

<!-- FEATURES -->
<section class="sa-features" id="funkcje">
  <div class="sa-sec-intro">
    <div class="sa-sec-badge">Możliwości</div>
    <h2 class="sa-sec-title">Wszystko czego potrzebuje<br/>nowoczesna restauracja</h2>
    <p class="sa-sec-sub">Od rezerwacji po rozliczenia.\nJeden panel. Zero chaosu.</p>
  </div>
  <div class="sa-grid-3">
    <div class="sa-feat sa-feat-1">
      <div class="sa-feat-vis">
        <div class="sa-resv">
          <div class="sa-resv-tag">T7</div>
          <div class="sa-resv-info"><div class="sa-resv-name">Anna Kowalska</div><div class="sa-resv-time">19:30 · 4 osoby</div></div>
          <div class="sa-resv-dot"></div>
        </div>
        <div class="sa-resv">
          <div class="sa-resv-tag" style="background:linear-gradient(135deg,#22c55e,#86efac);">T2</div>
          <div class="sa-resv-info"><div class="sa-resv-name">Piotr Nowak</div><div class="sa-resv-time">20:00 · 2 osoby</div></div>
          <div class="sa-resv-dot"></div>
        </div>
      </div>
      <div class="sa-feat-title">Rezerwacje w czasie rzeczywistym</div>
      <div class="sa-feat-desc">Online booking, walk-iny i waitlist w jednym widoku. Konflikty wykluczone.</div>
    </div>
    <div class="sa-feat sa-feat-2">
      <div class="sa-feat-vis">
        <div class="sa-guest">
          <div class="sa-guest-av">AK</div>
          <div class="sa-guest-info">
            <div class="sa-guest-name">Anna Kowalska</div>
            <div class="sa-guest-meta">12 wizyt · stolik #7</div>
            <div class="sa-guest-chips"><span class="sa-guest-chip">GLUTEN</span><span class="sa-guest-chip">ORZECHY</span></div>
          </div>
        </div>
      </div>
      <div class="sa-feat-title">Profil gościa 360°</div>
      <div class="sa-feat-desc">Historia wizyt, alergie, preferowane stoliki i ulubione dania w jednym miejscu.</div>
    </div>
    <div class="sa-feat sa-feat-3">
      <div class="sa-feat-vis">
        <div class="sa-ana">
          <div class="sa-ana-row">
            <div>
              <div class="sa-ana-num">28&nbsp;450&nbsp;zł</div>
              <div class="sa-ana-label">Ten tydzień</div>
            </div>
            <div class="sa-ana-delta">+12.4%</div>
          </div>
          <div class="sa-ana-spark"></div>
        </div>
      </div>
      <div class="sa-feat-title">Analityka i raporty</div>
      <div class="sa-feat-desc">Przychód, obłożenie, średni rachunek. Decyzje oparte na danych, nie na intuicji.</div>
    </div>
  </div>
</section>

<!-- DASHBOARD -->
<section class="sa-dash-section" id="produkt">
  <div class="sa-sec-intro">
    <div class="sa-sec-badge">Panel</div>
    <h2 class="sa-sec-title">Jeden panel.<br/>Pełna kontrola.</h2>
    <p class="sa-sec-sub">Wszystkie operacje w jednym miejscu.\nSzybko, czysto, bez zbędnych kliknięć.</p>
  </div>
  <div class="sa-dash-mockup" id="demo">
    <aside class="sa-dsb">
      <div class="sa-dsb-brand"><div class="sa-dsb-mark">S</div><span>ShiftApp</span></div>
      <div class="sa-dsb-group">Główne</div>
      <div class="sa-dsb-item act"><svg class="sa-dsb-icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg><span>Pulpit</span></div>
      <div class="sa-dsb-item"><svg class="sa-dsb-icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span>Rezerwacje</span></div>
      <div class="sa-dsb-item"><svg class="sa-dsb-icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 3h18v18H3z"/><path d="M3 9h18M9 21V9"/></svg><span>Zamówienia</span></div>
      <div class="sa-dsb-item"><svg class="sa-dsb-icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg><span>Goście</span></div>
      <div class="sa-dsb-group">Operacje</div>
      <div class="sa-dsb-item"><svg class="sa-dsb-icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/></svg><span>Personel</span></div>
      <div class="sa-dsb-item"><svg class="sa-dsb-icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg><span>Stoły</span></div>
      <div class="sa-dsb-item"><svg class="sa-dsb-icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span>Menu</span></div>
      <div class="sa-dsb-group">Raporty</div>
      <div class="sa-dsb-item"><svg class="sa-dsb-icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg><span>Przychody</span></div>
      <div class="sa-dsb-item"><svg class="sa-dsb-icn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg><span>Statystyki</span></div>
    </aside>
    <div class="sa-dmain">
      <div class="sa-dhd">
        <div class="sa-dhd-title">Pulpit · Wtorek, 11 listopada</div>
        <div class="sa-dhd-actions">
          <button class="sa-dhd-btn">Eksport</button>
          <button class="sa-dhd-btn prim">+ Rezerwacja</button>
        </div>
      </div>
      <div class="sa-dcontent">
        <div class="sa-dkpi-row">
          <div class="sa-dkpi"><div class="sa-dkpi-l">Rezerwacje dziś</div><div class="sa-dkpi-n">42</div><span class="sa-dkpi-d" style="background:#DCFCE7;color:#16A34A;">+8 vs wczoraj</span></div>
          <div class="sa-dkpi"><div class="sa-dkpi-l">Obłożenie</div><div class="sa-dkpi-n">87%</div><span class="sa-dkpi-d" style="background:#DBEAFE;color:#1D4ED8;">Pełny wieczór</span></div>
          <div class="sa-dkpi"><div class="sa-dkpi-l">Przychód dziś</div><div class="sa-dkpi-n">8&nbsp;940&nbsp;zł</div><span class="sa-dkpi-d" style="background:#DCFCE7;color:#16A34A;">+12.4%</span></div>
        </div>
        <div class="sa-dtab">
          <div class="sa-drow h"><div>Stolik</div><div>Gość</div><div>Czas</div><div>Osoby</div><div>Status</div></div>
          <div class="sa-drow"><div style="font-weight:600;color:#0f172a;">T7</div><div>Anna Kowalska</div><div>19:30</div><div>4</div><div><span class="sa-dtag g">Potwierdz.</span></div></div>
          <div class="sa-drow"><div style="font-weight:600;color:#0f172a;">T2</div><div>Piotr Nowak</div><div>20:00</div><div>2</div><div><span class="sa-dtag a">Walk-in</span></div></div>
          <div class="sa-drow"><div style="font-weight:600;color:#0f172a;">T11</div><div>Marta Lis</div><div>20:30</div><div>6</div><div><span class="sa-dtag g">Potwierdz.</span></div></div>
          <div class="sa-drow"><div style="font-weight:600;color:#0f172a;">T4</div><div>Tomasz Wróbel</div><div>21:00</div><div>3</div><div><span class="sa-dtag g">Potwierdz.</span></div></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- REGISTRATION -->
<section class="sa-reg-section">
  <div class="sa-sec-intro">
    <div class="sa-sec-badge">Rejestracja</div>
    <h2 class="sa-sec-title">Zacznij w 2 minuty</h2>
    <p class="sa-sec-sub">Bez karty kredytowej.\n14 dni za darmo.</p>
  </div>
  <div class="sa-reg-card">
    <div class="sa-reg-left">
      <div class="sa-reg-l-content">
        <div class="sa-reg-l-brand"><div class="sa-mark">S</div><span>ShiftApp</span></div>
        <div class="sa-reg-l-h">Dołącz do ShiftApp</div>
        <div class="sa-reg-l-sub">3 kroki do pełnej kontroli restauracji.</div>
        <div class="sa-step act"><div class="sa-step-n">1</div><span>Utwórz konto</span></div>
        <div class="sa-step"><div class="sa-step-n">2</div><span>Skonfiguruj lokal</span></div>
        <div class="sa-step"><div class="sa-step-n">3</div><span>Zaproś zespół</span></div>
      </div>
    </div>
    <div class="sa-reg-right">
      <div class="sa-reg-form">
        <div class="sa-reg-h">Utwórz konto</div>
        <div class="sa-reg-h-sub">Bezpłatny okres próbny 14 dni.</div>
        <div class="sa-reg-socials">
          <button class="sa-reg-soc"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>Google</button>
          <button class="sa-reg-soc"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>Apple</button>
        </div>
        <div class="sa-reg-div"><span>lub</span></div>
        <div class="sa-reg-row">
          <div class="sa-reg-f"><label class="sa-reg-lbl">Imię</label><input class="sa-reg-in" placeholder="Jan" /></div>
          <div class="sa-reg-f"><label class="sa-reg-lbl">Nazwisko</label><input class="sa-reg-in" placeholder="Kowalski" /></div>
        </div>
        <div class="sa-reg-f"><label class="sa-reg-lbl">Email</label><input class="sa-reg-in" placeholder="jan@restauracja.pl" /></div>
        <div class="sa-reg-f"><label class="sa-reg-lbl">Hasło</label><input class="sa-reg-in" type="password" placeholder="Min. 8 znaków" /></div>
        <button class="sa-reg-submit" data-action="signup">Utwórz konto</button>
      </div>
    </div>
  </div>
</section>

<!-- PRICING -->
<section class="sa-pricing" id="cennik">
  <div class="sa-sec-intro">
    <div class="sa-sec-badge">Cennik</div>
    <h2 class="sa-sec-title">Plan dla każdej restauracji</h2>
    <p class="sa-sec-sub">Bez ukrytych kosztów.\nAnuluj kiedy chcesz.</p>
  </div>
  <div class="sa-plans">
    <div class="sa-plan">
      <div class="sa-plan-name">Starter</div>
      <div class="sa-plan-price"><span class="sa-plan-amt">99</span><span class="sa-plan-cur">zł / mies.</span></div>
      <div class="sa-plan-tag">Dla małych lokali do 30 miejsc.</div>
      <ul class="sa-plan-feats">
        <li><span class="sa-plan-chk">✓</span><span>Rezerwacje online</span></li>
        <li><span class="sa-plan-chk">✓</span><span>Profil gościa (do 500)</span></li>
        <li><span class="sa-plan-chk">✓</span><span>1 użytkownik</span></li>
        <li><span class="sa-plan-chk">✓</span><span>Wsparcie e-mail</span></li>
      </ul>
      <button class="sa-plan-cta" data-action="signup">Wypróbuj za darmo</button>
    </div>
    <div class="sa-plan feat">
      <div class="sa-plan-pin">Popularny</div>
      <div class="sa-plan-name">Pro</div>
      <div class="sa-plan-price"><span class="sa-plan-amt">249</span><span class="sa-plan-cur">zł / mies.</span></div>
      <div class="sa-plan-tag">Dla rozwijających się restauracji.</div>
      <ul class="sa-plan-feats">
        <li><span class="sa-plan-chk">✓</span><span>Wszystko ze Starter</span></li>
        <li><span class="sa-plan-chk">✓</span><span>Nielimitowani goście</span></li>
        <li><span class="sa-plan-chk">✓</span><span>5 użytkowników</span></li>
        <li><span class="sa-plan-chk">✓</span><span>Analityka i raporty</span></li>
        <li><span class="sa-plan-chk">✓</span><span>SMS przypomnienia</span></li>
        <li><span class="sa-plan-chk">✓</span><span>Wsparcie 24/7</span></li>
      </ul>
      <button class="sa-plan-cta" data-action="signup">Wypróbuj Pro</button>
    </div>
    <div class="sa-plan">
      <div class="sa-plan-name">Enterprise</div>
      <div class="sa-plan-price"><span class="sa-plan-amt" style="font-size:30px;">Indywidualny</span></div>
      <div class="sa-plan-tag">Dla sieci i grup gastronomicznych.</div>
      <ul class="sa-plan-feats">
        <li><span class="sa-plan-chk">✓</span><span>Wszystko z Pro</span></li>
        <li><span class="sa-plan-chk">✓</span><span>Multi-lokal</span></li>
        <li><span class="sa-plan-chk">✓</span><span>Nielimitowani użytkownicy</span></li>
        <li><span class="sa-plan-chk">✓</span><span>Dedykowane API</span></li>
        <li><span class="sa-plan-chk">✓</span><span>Account Manager</span></li>
      </ul>
      <button class="sa-plan-cta">Skontaktuj się</button>
    </div>
  </div>
</section>

<!-- FINAL CTA -->
<section class="sa-final">
  <div class="sa-final-card">
    <h2 class="sa-final-h">Gotowy na koniec chaosu?</h2>
    <p class="sa-final-sub">Dołącz do 500+ restauracji, które zarządzają operacjami w jednym miejscu.</p>
    <button class="sa-final-btn" data-action="signup">Zacznij za darmo<span style="font-size:18px;">→</span></button>
  </div>
</section>

<!-- FOOTER -->
<div class="sa-foot-wrap">
  <div class="sa-foot">
    <div class="sa-foot-top">
      <div class="sa-foot-brand">
        <div class="sa-foot-mark">S</div>
        <div class="sa-foot-name">ShiftApp</div>
      </div>
      <div class="sa-foot-cols">
        <div class="sa-foot-col"><div class="sa-foot-col-h">Firma</div><a href="#">O nas</a><a href="#">Kariera</a><a href="#">Kontakt</a></div>
        <div class="sa-foot-col"><div class="sa-foot-col-h">Produkt</div><a href="#">Funkcje</a><a href="#">Cennik</a><a href="#">API</a></div>
        <div class="sa-foot-col"><div class="sa-foot-col-h">Prawne</div><a href="#">Polityka prywatności</a><a href="#">Regulamin</a><a href="#">RODO</a></div>
      </div>
    </div>
    <div class="sa-foot-bot">
      <div class="sa-foot-copy">© 2026 ShiftApp. Wszelkie prawa zastrzeżone.</div>
      <div class="sa-socials">
        <a href="#" class="sa-soc" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>
        <a href="#" class="sa-soc" aria-label="Twitter"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2-3-1-5-7-3-12 2.4 2.7 6.1 4.5 10 5 .1-3.9 4-6 8-2.4z"/></svg></a>
        <a href="#" class="sa-soc" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.4A4 4 0 1 1 12.6 8 4 4 0 0 1 16 11.4z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg></a>
        <a href="#" class="sa-soc" aria-label="LinkedIn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg></a>
      </div>
    </div>
  </div>
</div>
`;

/* ──────────────────────────────────────────────────────────────────────────
   COMPONENT — uses portal pattern to bypass React Native web shell
   ────────────────────────────────────────────────────────────────────────── */
export default function Landing() {
  const router = useRouter();

  if (Platform.OS !== 'web') return <Redirect href="/" />;

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // 1. Create portal container appended directly to <body>
    const portal = document.createElement('div');
    portal.id = 'sa-portal';
    portal.innerHTML = HTML;

    // 2. Inject CSS once
    const styleEl = document.createElement('style');
    styleEl.id = 'sa-styles';
    styleEl.innerHTML = CSS;
    document.head.appendChild(styleEl);

    // 3. Hide ALL existing body children (= the React Native web root) and append portal
    const hiddenChildren: { el: HTMLElement; prevDisplay: string }[] = [];
    Array.from(document.body.children).forEach((c) => {
      const el = c as HTMLElement;
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK') return;
      hiddenChildren.push({ el, prevDisplay: el.style.display || '' });
      el.style.display = 'none';
    });
    document.body.appendChild(portal);

    // 4. Override html/body styles so page is freely scrollable
    const html = document.documentElement;
    const body = document.body;
    const orig = {
      htmlOverflow: html.style.overflow,
      htmlHeight: html.style.height,
      bodyOverflow: body.style.overflow,
      bodyHeight: body.style.height,
      bodyMargin: body.style.margin,
      bodyPadding: body.style.padding,
      bodyBg: body.style.background,
    };
    html.style.overflow = 'auto';
    html.style.height = 'auto';
    body.style.overflow = 'auto';
    body.style.height = 'auto';
    body.style.margin = '0';
    body.style.padding = '0';
    body.style.background = '#ffffff';

    // 5. Click handler: data-action="..." → action
    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const trigger = target.closest?.('[data-action]') as HTMLElement | null;
      if (!trigger) return;
      const action = trigger.getAttribute('data-action');
      if (!action) return;

      if (action === 'top') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (action === 'login' || action === 'signup') {
        e.preventDefault();
        router.push('/login');
      } else if (action.startsWith('scroll:')) {
        e.preventDefault();
        const id = action.slice('scroll:'.length);
        const el = portal.querySelector('#' + id) as HTMLElement | null;
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY - 90;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }
    };
    portal.addEventListener('click', handleClick);

    // 6. Scroll handler — toggles "scrolled" class on nav
    const nav = portal.querySelector('.sa-nav') as HTMLElement | null;
    const handleScroll = () => {
      if (!nav) return;
      if (window.scrollY > 30) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Cleanup on unmount
    return () => {
      portal.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll);
      portal.remove();
      styleEl.remove();
      hiddenChildren.forEach(({ el, prevDisplay }) => { el.style.display = prevDisplay; });
      html.style.overflow = orig.htmlOverflow;
      html.style.height = orig.htmlHeight;
      body.style.overflow = orig.bodyOverflow;
      body.style.height = orig.bodyHeight;
      body.style.margin = orig.bodyMargin;
      body.style.padding = orig.bodyPadding;
      body.style.background = orig.bodyBg;
    };
  }, [router]);

  return null;
}
