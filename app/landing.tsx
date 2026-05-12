import { Redirect, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/* ══════════════════════════════════════════════════════════════════════════
   ShiftApp — Landing
   Portal pattern (bypasses React Native web shell). Clean, robust CSS.
   ══════════════════════════════════════════════════════════════════════════ */

/* ────────── CSS ────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap');

#sa-portal,#sa-portal *,#sa-portal *::before,#sa-portal *::after{box-sizing:border-box;margin:0;padding:0;}
#sa-portal{
  font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;
  -webkit-font-smoothing:antialiased;
  color:#0f172a;
  background:#fff;
  width:100%;
  min-height:100vh;
  overflow-x:hidden;
  line-height:1.5;
}
#sa-portal a{color:inherit;text-decoration:none;}
#sa-portal button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit;padding:0;}
#sa-portal ul,#sa-portal ol{list-style:none;}
#sa-portal h1,#sa-portal h2,#sa-portal h3,#sa-portal h4{margin:0;font-weight:500;}
#sa-portal p{margin:0;}
#sa-portal img,#sa-portal video{display:block;max-width:100%;}
/* CRITICAL: prevent oversized SVG */
#sa-portal svg{width:1em;height:1em;flex-shrink:0;display:inline-block;vertical-align:middle;}
#sa-portal input,#sa-portal button{font-family:inherit;font-size:inherit;}
#sa-portal ::selection{background:rgba(37,99,235,.18);}

/* ─── Utility ─── */
.s-container{max-width:1180px;margin:0 auto;padding:0 24px;width:100%;}
.s-section{padding:96px 0;}
.s-eyebrow{display:inline-block;font-size:12px;text-transform:uppercase;letter-spacing:.18em;color:#2563EB;font-weight:600;margin-bottom:16px;}
.s-h2{font-family:'Instrument Serif',serif;font-size:clamp(34px,5vw,56px);line-height:1.05;letter-spacing:-.02em;font-weight:400;color:#0f172a;}
.s-h2 em{font-style:italic;color:#2563EB;}
.s-lead{font-size:16px;color:#64748b;line-height:1.6;margin-top:16px;}
.s-btn{display:inline-flex;align-items:center;gap:8px;padding:13px 24px;border-radius:12px;font-size:14px;font-weight:600;transition:all .2s;white-space:nowrap;}
.s-btn-primary{background:#2563EB;color:#fff;box-shadow:0 4px 14px rgba(37,99,235,.3);}
.s-btn-primary:hover{background:#1d4ed8;transform:translateY(-1px);box-shadow:0 6px 20px rgba(37,99,235,.4);}
.s-btn-ghost{background:#fff;color:#0f172a;border:1px solid #e2e8f0;}
.s-btn-ghost:hover{border-color:#2563EB;color:#2563EB;}
.s-btn svg{width:16px;height:16px;}

/* ─── NAV ─── */
.s-nav{
  position:fixed;top:18px;left:50%;transform:translateX(-50%);
  z-index:100;display:flex;align-items:center;gap:8px;
  padding:8px 8px 8px 22px;
  background:rgba(255,255,255,.75);
  backdrop-filter:saturate(180%) blur(18px);
  -webkit-backdrop-filter:saturate(180%) blur(18px);
  border:1px solid rgba(0,0,0,.07);
  border-radius:14px;
  box-shadow:0 4px 20px rgba(0,0,0,.04);
  transition:all .25s;
  max-width:calc(100% - 24px);
}
.s-nav.scrolled{background:rgba(255,255,255,.95);box-shadow:0 8px 28px rgba(0,0,0,.06);}
.s-nav-brand{display:flex;align-items:center;gap:10px;font-weight:600;font-size:15px;color:#0f172a;letter-spacing:-.2px;padding-right:8px;}
.s-nav-mark{width:26px;height:26px;border-radius:7px;background:#2563EB;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;box-shadow:0 2px 6px rgba(37,99,235,.35);}
.s-nav-links{display:none;align-items:center;gap:4px;margin:0 4px;}
@media(min-width:900px){.s-nav-links{display:flex;}}
.s-nav-links a{font-size:13.5px;color:#64748b;font-weight:500;padding:6px 12px;border-radius:8px;transition:all .15s;}
.s-nav-links a:hover{color:#0f172a;background:rgba(0,0,0,.04);}
.s-nav-cta{padding:8px 16px;background:#0f172a;color:#fff;border-radius:9px;font-size:13px;font-weight:500;transition:all .2s;}
.s-nav-cta:hover{background:#2563EB;}

/* ─── HERO ─── */
.s-hero{
  position:relative;min-height:100vh;
  padding:130px 24px 80px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:
    radial-gradient(ellipse 80% 60% at 50% 0%,rgba(37,99,235,.12),transparent 60%),
    radial-gradient(ellipse 60% 40% at 50% 100%,rgba(96,165,250,.08),transparent 60%),
    #fff;
  overflow:hidden;
}
.s-hero-inner{max-width:820px;width:100%;text-align:center;display:flex;flex-direction:column;align-items:center;gap:20px;position:relative;z-index:2;}
.s-hero-badge{display:inline-flex;align-items:center;gap:8px;padding:6px 14px;background:#fff;border:1px solid #e2e8f0;border-radius:9999px;font-size:13px;color:#475569;font-weight:500;box-shadow:0 2px 8px rgba(0,0,0,.04);}
.s-hero-badge-dot{width:6px;height:6px;border-radius:50%;background:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,.2);}
.s-hero h1{font-family:'Instrument Serif',serif;font-size:clamp(40px,7vw,84px);line-height:1;letter-spacing:-.025em;font-weight:400;color:#0f172a;}
.s-hero h1 em{font-style:italic;color:#2563EB;}
.s-hero-sub{font-size:clamp(15px,1.5vw,18px);color:#475569;max-width:620px;line-height:1.55;}
.s-hero-form{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:6px;width:100%;max-width:460px;box-shadow:0 8px 24px rgba(0,0,0,.06);transition:all .2s;}
.s-hero-form:focus-within{border-color:#2563EB;box-shadow:0 0 0 4px rgba(37,99,235,.1),0 8px 24px rgba(0,0,0,.06);}
.s-hero-form input{flex:1;border:none;outline:none;background:none;padding:10px 14px;font-size:14px;color:#0f172a;min-width:0;}
.s-hero-form input::placeholder{color:#94a3b8;}
.s-hero-form button{padding:10px 20px;background:#2563EB;color:#fff;border-radius:10px;font-size:14px;font-weight:600;flex-shrink:0;}
.s-hero-form button:hover{background:#1d4ed8;}
.s-hero-meta{display:flex;align-items:center;gap:16px;flex-wrap:wrap;justify-content:center;font-size:13px;color:#64748b;}
.s-avatars{display:flex;align-items:center;}
.s-avatars span{width:26px;height:26px;border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:#fff;margin-left:-8px;}
.s-avatars span:first-child{margin-left:0;background:#3b82f6;}
.s-avatars span:nth-child(2){background:#8b5cf6;}
.s-avatars span:nth-child(3){background:#ec4899;}
.s-avatars span:nth-child(4){background:#f59e0b;}
.s-hero-dot{width:4px;height:4px;border-radius:50%;background:#cbd5e1;}

/* ─── HERO MOCKUP ─── */
.s-mock{max-width:1100px;width:100%;margin:64px auto 0;padding:0 16px;position:relative;z-index:2;}
.s-mock-frame{background:rgba(255,255,255,.6);border:1px solid rgba(255,255,255,.8);border-radius:20px;padding:14px;backdrop-filter:blur(10px);box-shadow:0 30px 80px -15px rgba(15,23,42,.2),0 0 0 1px rgba(0,0,0,.05);}
.s-mock-app{background:#f8fafc;border-radius:11px;overflow:hidden;display:flex;min-height:360px;border:1px solid #e2e8f0;}
.s-mock-side{display:none;width:180px;background:#fff;border-right:1px solid #e2e8f0;padding:14px 10px;flex-direction:column;gap:2px;}
@media(min-width:640px){.s-mock-side{display:flex;}}
.s-mock-side .brand{display:flex;align-items:center;gap:8px;padding:4px 8px 14px;font-weight:600;font-size:13px;color:#0f172a;}
.s-mock-side .brand-m{width:22px;height:22px;border-radius:6px;background:#2563EB;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;}
.s-mock-side .h{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;padding:12px 8px 6px;font-weight:600;}
.s-mock-side a{display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:6px;color:#475569;font-size:12px;font-weight:500;}
.s-mock-side a:hover{background:#f1f5f9;}
.s-mock-side a.act{background:#eff6ff;color:#2563EB;}
.s-mock-side a .ic{width:14px;height:14px;}
.s-mock-side .b{margin-left:auto;background:#2563EB;color:#fff;font-size:10px;padding:2px 7px;border-radius:9px;font-weight:600;}
.s-mock-main{flex:1;display:flex;flex-direction:column;min-width:0;}
.s-mock-bar{padding:12px 16px;background:#fff;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;gap:12px;}
.s-mock-search{flex:1;max-width:320px;padding:7px 12px;background:#f1f5f9;border-radius:8px;color:#94a3b8;font-size:12px;}
.s-mock-ava{width:26px;height:26px;border-radius:50%;background:#2563EB;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;}
.s-mock-body{flex:1;padding:16px;display:flex;flex-direction:column;gap:12px;overflow:hidden;}
.s-mock-greet{font-size:14px;font-weight:600;color:#0f172a;}
.s-mock-greet span{color:#64748b;font-weight:400;}
.s-mock-card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px;}
.s-mock-card-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;font-size:12px;font-weight:600;color:#0f172a;}
.s-mock-pill{padding:3px 8px;border-radius:9999px;font-size:10px;font-weight:600;background:#dbeafe;color:#1d4ed8;}
.s-mock-pill.g{background:#dcfce7;color:#16a34a;}
.s-sched{display:grid;grid-template-columns:70px repeat(7,1fr);gap:3px;}
.s-sched > div{padding:6px 2px;font-size:10px;text-align:center;color:#64748b;border-radius:4px;background:#f8fafc;}
.s-sched > div.hd{background:none;font-weight:600;color:#94a3b8;text-transform:uppercase;font-size:9px;}
.s-sched > div.nm{text-align:left;padding-left:6px;font-weight:600;color:#0f172a;background:none;font-size:11px;}
.s-sched > div.b{background:#dbeafe;color:#1d4ed8;font-weight:600;}
.s-sched > div.p{background:#f3e8ff;color:#7c3aed;font-weight:600;}
.s-sched > div.gr{background:#dcfce7;color:#16a34a;font-weight:600;}
.s-mock-grid2{display:none;grid-template-columns:1fr 1fr;gap:10px;}
@media(min-width:640px){.s-mock-grid2{display:grid;}}
.s-mock-tasks{display:flex;flex-direction:column;gap:6px;}
.s-mock-task{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:6px;background:#f8fafc;font-size:11px;color:#475569;}
.s-mock-task .cb{width:14px;height:14px;border-radius:4px;border:1.5px solid #cbd5e1;flex-shrink:0;}
.s-mock-task.d .cb{background:#10b981;border-color:#10b981;}
.s-mock-task.d span{text-decoration:line-through;color:#94a3b8;}
.s-mock-task small{margin-left:auto;color:#94a3b8;font-size:10px;}

/* ─── FEATURES (dark) ─── */
.s-feat{background:#0a0a0a;color:#fff;padding:100px 0;position:relative;overflow:hidden;}
.s-feat::before{content:'';position:absolute;top:-200px;left:50%;transform:translateX(-50%);width:900px;height:500px;background:radial-gradient(ellipse,rgba(37,99,235,.25),transparent 70%);pointer-events:none;}
.s-feat-head{max-width:720px;margin:0 auto 64px;text-align:center;position:relative;z-index:2;}
.s-feat-head .s-eyebrow{color:#60a5fa;}
.s-feat-head h2{color:#fff;}
.s-feat-head h2 em{color:#60a5fa;}
.s-feat-head .s-lead{color:rgba(255,255,255,.65);}
.s-feat-grid{display:grid;grid-template-columns:1fr;gap:20px;position:relative;z-index:2;}
@media(min-width:700px){.s-feat-grid{grid-template-columns:repeat(2,1fr);}}
@media(min-width:1024px){.s-feat-grid{grid-template-columns:repeat(6,1fr);}}
.s-fcard{
  position:relative;border-radius:20px;padding:28px;overflow:hidden;
  background:#141414;border:1px solid rgba(255,255,255,.08);
  display:flex;flex-direction:column;
  min-height:300px;
  grid-column:span 1;
}
@media(min-width:1024px){
  .s-fcard{grid-column:span 2;}
  .s-fcard.wide{grid-column:span 3;}
  .s-fcard.hero{grid-column:span 4;min-height:380px;}
  .s-fcard.tall{grid-column:span 2;min-height:380px;}
}
.s-fcard.blue{background:linear-gradient(160deg,#1e3a8a 0%,#0f1f3f 100%);}
.s-fcard-tag{display:flex;align-items:center;gap:8px;font-size:11px;text-transform:uppercase;letter-spacing:.18em;color:rgba(255,255,255,.65);font-weight:600;margin-bottom:16px;}
.s-fcard-tag svg{width:13px;height:13px;color:#60a5fa;}
.s-fcard h3{font-size:22px;font-weight:600;color:#fff;letter-spacing:-.01em;line-height:1.2;margin-bottom:10px;}
.s-fcard p{font-size:14px;color:rgba(255,255,255,.6);line-height:1.55;}
.s-fcard-body{flex:1;display:flex;flex-direction:column;justify-content:flex-end;}
.s-fcard-viz{margin-top:20px;}

/* feature mockups */
.s-fv-week{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:14px;}
.s-fv-week-h{display:flex;justify-content:space-between;font-size:10px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px;}
.s-fv-week-row{display:grid;grid-template-columns:70px repeat(7,1fr);gap:4px;align-items:center;margin-bottom:5px;}
.s-fv-week-row .n{font-size:11px;color:rgba(255,255,255,.85);font-weight:500;}
.s-fv-cell{height:20px;border-radius:4px;background:rgba(255,255,255,.04);}
.s-fv-cell.b{background:rgba(59,130,246,.5);}
.s-fv-cell.p{background:rgba(168,85,247,.5);}
.s-fv-cell.g{background:rgba(34,197,94,.5);}
.s-fv-ai{margin-top:12px;padding:9px 12px;background:rgba(96,165,250,.14);border:1px solid rgba(96,165,250,.3);border-radius:8px;font-size:11px;color:#93c5fd;display:flex;align-items:center;gap:8px;}
.s-fv-ai svg{width:13px;height:13px;}

.s-fv-task{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:12px;color:rgba(255,255,255,.85);}
.s-fv-task:last-child{border-bottom:none;}
.s-fv-task .cb{width:14px;height:14px;border-radius:4px;border:1.5px solid rgba(255,255,255,.25);flex-shrink:0;}
.s-fv-task.d .cb{background:#22c55e;border-color:#22c55e;}
.s-fv-task.d span{text-decoration:line-through;color:rgba(255,255,255,.45);}
.s-fv-task .m{margin-left:auto;font-size:10px;color:rgba(255,255,255,.4);}

.s-fv-rank{display:flex;align-items:center;gap:10px;padding:9px 12px;background:rgba(255,255,255,.05);border-radius:8px;margin-bottom:6px;font-size:12px;color:rgba(255,255,255,.9);}
.s-fv-rank .pos{width:22px;height:22px;border-radius:50%;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;}
.s-fv-rank.gold .pos{background:linear-gradient(135deg,#fde68a,#f59e0b);color:#451a03;}
.s-fv-rank.silver .pos{background:linear-gradient(135deg,#e5e7eb,#9ca3af);color:#1f2937;}
.s-fv-rank.bronze .pos{background:linear-gradient(135deg,#fdba74,#c2410c);color:#431407;}
.s-fv-rank .pts{margin-left:auto;font-size:10px;color:rgba(255,255,255,.5);font-weight:700;letter-spacing:.05em;}

.s-fv-time{display:flex;align-items:center;justify-content:center;flex-direction:column;padding:20px 0;}
.s-fv-time-num{font-family:'Instrument Serif',serif;font-size:72px;line-height:1;color:#fff;font-weight:400;letter-spacing:-.02em;}
.s-fv-time-sub{font-size:12px;color:rgba(255,255,255,.5);margin-top:6px;text-transform:uppercase;letter-spacing:.12em;}

.s-fv-doc{display:flex;align-items:center;gap:10px;padding:9px 12px;background:rgba(255,255,255,.04);border-radius:8px;margin-bottom:6px;font-size:12px;}
.s-fv-doc-ic{width:26px;height:26px;border-radius:6px;background:rgba(96,165,250,.18);color:#60a5fa;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;flex-shrink:0;letter-spacing:.02em;}
.s-fv-doc-name{flex:1;color:rgba(255,255,255,.8);font-size:12px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.s-fv-doc-tag{font-size:10px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.08em;}

/* ─── STEPS ─── */
.s-steps{background:#f8fafc;padding:100px 0;}
.s-steps-head{text-align:center;max-width:680px;margin:0 auto 56px;}
.s-steps-grid{display:grid;grid-template-columns:1fr;gap:18px;}
@media(min-width:900px){.s-steps-grid{grid-template-columns:repeat(3,1fr);}}
.s-step{background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:32px;transition:all .25s;}
.s-step:hover{border-color:#2563EB;transform:translateY(-2px);box-shadow:0 12px 32px rgba(37,99,235,.12);}
.s-step-n{width:40px;height:40px;border-radius:12px;background:#2563EB;color:#fff;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;margin-bottom:18px;box-shadow:0 4px 14px rgba(37,99,235,.3);}
.s-step-t{font-size:10px;text-transform:uppercase;letter-spacing:.18em;color:#94a3b8;font-weight:700;margin-bottom:6px;}
.s-step h3{font-size:19px;color:#0f172a;font-weight:600;margin-bottom:8px;}
.s-step p{font-size:14px;color:#64748b;line-height:1.6;}

/* ─── DEMO ─── */
.s-demo{background:#fff;padding:100px 0;}
.s-demo-head{text-align:center;max-width:680px;margin:0 auto 48px;}
.s-demo-frame{position:relative;border-radius:24px;overflow:hidden;aspect-ratio:16/9;background:linear-gradient(135deg,#1e3a8a 0%,#0f172a 100%);box-shadow:0 30px 80px -15px rgba(15,23,42,.3);cursor:pointer;max-width:980px;margin:0 auto;}
.s-demo-frame::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,transparent 20%,rgba(0,0,0,.4) 100%);pointer-events:none;}
.s-demo-play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:84px;height:84px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 40px rgba(0,0,0,.4);transition:transform .25s;z-index:2;}
.s-demo-play svg{width:28px;height:28px;color:#2563EB;margin-left:3px;}
.s-demo-frame:hover .s-demo-play{transform:translate(-50%,-50%) scale(1.08);}
.s-demo-cta{text-align:center;margin-top:36px;}

/* ─── PRICING ─── */
.s-price{background:#f8fafc;padding:100px 0;}
.s-price-head{text-align:center;max-width:680px;margin:0 auto 48px;}
.s-price-card{max-width:540px;margin:0 auto;background:#fff;border-radius:24px;padding:44px 32px;border:2px solid #2563EB;position:relative;box-shadow:0 30px 80px -15px rgba(37,99,235,.2);}
.s-price-tag{position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:#2563EB;color:#fff;padding:6px 16px;border-radius:9999px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;}
.s-price-amt-row{display:flex;align-items:baseline;justify-content:center;gap:8px;margin-bottom:6px;}
.s-price-amt{font-family:'Instrument Serif',serif;font-size:76px;line-height:1;color:#0f172a;font-weight:400;letter-spacing:-.02em;}
.s-price-per{font-size:15px;color:#64748b;}
.s-price-base{text-align:center;font-size:13px;color:#64748b;margin-bottom:4px;}
.s-price-extra{text-align:center;font-size:14px;color:#0f172a;font-weight:500;margin-bottom:18px;}
.s-price-promo{text-align:center;font-size:12px;color:#b45309;font-weight:600;background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:10px;margin-bottom:26px;}
.s-price-list{display:flex;flex-direction:column;gap:10px;margin-bottom:26px;}
.s-price-list li{display:flex;align-items:flex-start;gap:10px;font-size:14px;color:#475569;}
.s-price-list li svg{width:18px;height:18px;color:#22c55e;margin-top:1px;}
.s-price .s-btn{width:100%;justify-content:center;padding:14px;}

/* ─── CALC ─── */
.s-calc{background:#fff;padding:100px 0;}
.s-calc-head{text-align:center;max-width:680px;margin:0 auto 48px;}
.s-calc-card{background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);border-radius:28px;padding:40px;color:#fff;display:grid;grid-template-columns:1fr;gap:40px;position:relative;overflow:hidden;}
@media(min-width:900px){.s-calc-card{grid-template-columns:1fr 1fr;padding:48px;}}
.s-calc-card::before{content:'';position:absolute;top:-100px;right:-100px;width:400px;height:400px;background:radial-gradient(circle,rgba(37,99,235,.35),transparent 70%);pointer-events:none;}
.s-calc-left,.s-calc-right{position:relative;z-index:2;}
.s-calc-h{font-family:'Instrument Serif',serif;font-size:32px;line-height:1.1;font-weight:400;margin-bottom:8px;}
.s-calc-h em{font-style:italic;color:#60a5fa;}
.s-calc-sub{font-size:14px;color:rgba(255,255,255,.6);margin-bottom:28px;}
.s-calc-field{margin-bottom:22px;}
.s-calc-field label{display:block;font-size:12px;color:rgba(255,255,255,.55);margin-bottom:10px;line-height:1.4;}
.s-calc-row{display:flex;align-items:baseline;gap:10px;margin-bottom:10px;}
.s-calc-val{font-family:'Instrument Serif',serif;font-size:32px;color:#fff;font-weight:400;}
.s-calc-unit{font-size:13px;color:rgba(255,255,255,.5);}
.s-calc-slider{width:100%;-webkit-appearance:none;appearance:none;height:4px;background:rgba(255,255,255,.12);border-radius:2px;outline:none;}
.s-calc-slider::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;background:#2563EB;border-radius:50%;cursor:pointer;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);}
.s-calc-slider::-moz-range-thumb{width:18px;height:18px;background:#2563EB;border-radius:50%;cursor:pointer;border:3px solid #fff;}
.s-calc-result{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:28px;}
.s-calc-res-h{font-size:13px;color:rgba(255,255,255,.6);margin-bottom:12px;}
.s-calc-res-v{font-family:'Instrument Serif',serif;font-size:60px;line-height:1;color:#60a5fa;font-weight:400;letter-spacing:-.02em;margin-bottom:6px;}
.s-calc-res-s{font-size:13px;color:rgba(255,255,255,.6);margin-bottom:24px;line-height:1.5;}
.s-calc-res .s-btn{width:100%;justify-content:center;}
.s-calc-break{margin-top:22px;padding-top:22px;border-top:1px solid rgba(255,255,255,.08);}
.s-calc-break-h{font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:rgba(255,255,255,.4);margin-bottom:10px;font-weight:700;}
.s-calc-break-row{display:flex;justify-content:space-between;font-size:13px;padding:6px 0;color:rgba(255,255,255,.7);}
.s-calc-break-row strong{color:#fff;font-weight:600;}
.s-calc-break-row.tot{padding-top:10px;margin-top:6px;border-top:1px solid rgba(255,255,255,.08);}
.s-calc-break-row.tot strong{color:#60a5fa;}

/* ─── FAQ ─── */
.s-faq{background:#f8fafc;padding:100px 0;}
.s-faq-head{text-align:center;max-width:680px;margin:0 auto 48px;}
.s-faq-list{max-width:780px;margin:0 auto;display:flex;flex-direction:column;gap:10px;}
.s-faq-item{background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;transition:border-color .2s;}
.s-faq-item:hover{border-color:#cbd5e1;}
.s-faq-q{width:100%;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;text-align:left;font-size:15px;font-weight:500;color:#0f172a;}
.s-faq-q-ic{width:26px;height:26px;border-radius:50%;background:#f1f5f9;color:#475569;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .25s;}
.s-faq-q-ic svg{width:14px;height:14px;}
.s-faq-item.open .s-faq-q-ic{background:#2563EB;color:#fff;transform:rotate(45deg);}
.s-faq-a{max-height:0;overflow:hidden;transition:max-height .35s ease;}
.s-faq-item.open .s-faq-a{max-height:400px;}
.s-faq-a-in{padding:0 24px 22px;font-size:14px;color:#64748b;line-height:1.65;}

/* ─── CONTACT ─── */
.s-contact{background:#fff;padding:100px 0;text-align:center;}
.s-contact-inner{max-width:680px;margin:0 auto;padding:0 24px;}
.s-contact-phone{font-family:'Instrument Serif',serif;font-size:clamp(44px,6vw,72px);color:#0f172a;font-weight:400;letter-spacing:-.02em;line-height:1;margin:24px 0 6px;}
.s-contact-hours{font-size:13px;color:#64748b;margin-bottom:32px;}
.s-contact-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;}

/* ─── FOOTER ─── */
.s-foot{background:#0f172a;color:rgba(255,255,255,.7);padding:64px 0 32px;}
.s-foot-grid{display:grid;grid-template-columns:1fr;gap:40px;margin-bottom:48px;}
@media(min-width:768px){.s-foot-grid{grid-template-columns:2fr 1fr 1fr 1fr;}}
.s-foot-brand-row{display:flex;align-items:center;gap:10px;color:#fff;font-size:19px;font-weight:600;margin-bottom:14px;}
.s-foot-brand-m{width:28px;height:28px;border-radius:8px;background:#2563EB;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#fff;}
.s-foot-desc{font-size:13px;line-height:1.65;max-width:360px;color:rgba(255,255,255,.55);}
.s-foot-col h4{font-size:12px;text-transform:uppercase;letter-spacing:.14em;color:#fff;font-weight:600;margin-bottom:16px;}
.s-foot-col a{display:block;font-size:13px;color:rgba(255,255,255,.55);padding:5px 0;transition:color .2s;}
.s-foot-col a:hover{color:#fff;}
.s-foot-bot{padding-top:24px;border-top:1px solid rgba(255,255,255,.1);display:flex;flex-direction:column;gap:16px;align-items:center;justify-content:space-between;}
@media(min-width:768px){.s-foot-bot{flex-direction:row;}}
.s-foot-copy{font-size:12px;color:rgba(255,255,255,.5);}
.s-foot-social{display:flex;gap:12px;}
.s-foot-social a{width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.65);transition:all .2s;}
.s-foot-social a:hover{background:#2563EB;color:#fff;}
.s-foot-social svg{width:14px;height:14px;}
`;

/* ────────── ICONS ────────── */
const I = {
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`,
  phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  spark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`,
  cal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  task: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  trophy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
  doc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  fb: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>`,
  ig: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.4A4 4 0 1 1 12.6 8 4 4 0 0 1 16 11.4z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`,
  tt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  yt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>`,
};

/* ────────── HTML ────────── */
const NAV = `
<nav class="s-nav">
  <a href="#" class="s-nav-brand" data-action="top"><span class="s-nav-mark">S</span><span>ShiftApp</span></a>
  <div class="s-nav-links">
    <a href="#funkcje" data-action="scroll:funkcje">Funkcje</a>
    <a href="#kroki" data-action="scroll:kroki">Jak zacząć</a>
    <a href="#cennik" data-action="scroll:cennik">Cennik</a>
    <a href="#faq" data-action="scroll:faq">FAQ</a>
  </div>
  <a href="#" class="s-nav-cta" data-action="signup">Dołącz</a>
</nav>`;

const HERO = `
<section class="s-hero">
  <div class="s-hero-inner">
    <div class="s-hero-badge"><span class="s-hero-badge-dot"></span>Whitelista otwarta · Dla restauracji</div>
    <h1>Odzyskaj 13h tygodniowo<br/>i obniż <em>koszty pracy</em><br/>o 1300 zł/mies.</h1>
    <p class="s-hero-sub">Grafik AI, ewidencja czasu, zadania i szkolenia w jednej aplikacji. Stworzona dla gastronomii — koniec z chaosem w Excelu.</p>
    <form class="s-hero-form">
      <input type="email" placeholder="Twój e-mail" required/>
      <button type="submit">Dalej ${I.arrow}</button>
    </form>
    <div class="s-hero-meta">
      <div class="s-avatars"><span>JK</span><span>AM</span><span>TW</span><span>+</span></div>
      <span>Dołączyło już 50 restauratorów</span>
      <span class="s-hero-dot"></span>
      <a href="#demo" data-action="scroll:demo" style="color:#2563EB;font-weight:500">Obejrzyj prezentację ▶</a>
    </div>
  </div>
  <div class="s-mock">
    <div class="s-mock-frame">
      <div class="s-mock-app">
        <aside class="s-mock-side">
          <div class="brand"><span class="brand-m">S</span>ShiftApp</div>
          <div class="h">Panel</div>
          <a class="act">${I.cal}<span>Grafik</span></a>
          <a>${I.task}<span>Zadania</span><span class="b">10</span></a>
          <a>${I.clock}<span>Ewidencja</span></a>
          <a>${I.doc}<span>Dokumenty</span></a>
          <div class="h">Zespół</div>
          <a>${I.users}<span>Pracownicy</span></a>
          <a>${I.trophy}<span>Ranking</span></a>
        </aside>
        <div class="s-mock-main">
          <div class="s-mock-bar">
            <div class="s-mock-search">${I.search} Szukaj pracownika, zadania…</div>
            <div style="display:flex;align-items:center;gap:10px;color:#64748b">${I.bell}<div class="s-mock-ava">JK</div></div>
          </div>
          <div class="s-mock-body">
            <div class="s-mock-greet">Cześć Jan 👋 <span>— oto Twój tydzień 14</span></div>
            <div class="s-mock-card">
              <div class="s-mock-card-h"><span>Grafik tygodnia</span><span class="s-mock-pill">✨ AI sugeruje</span></div>
              <div class="s-sched">
                <div class="hd"></div><div class="hd">Pn</div><div class="hd">Wt</div><div class="hd">Śr</div><div class="hd">Czw</div><div class="hd">Pt</div><div class="hd">Sb</div><div class="hd">Nd</div>
                <div class="nm">Anna K.</div><div class="b">8-16</div><div class="b">10-18</div><div></div><div class="b">8-16</div><div class="b">8-16</div><div></div><div></div>
                <div class="nm">Marek W.</div><div></div><div class="p">14-22</div><div class="p">14-22</div><div></div><div class="p">14-22</div><div class="p">14-22</div><div></div>
                <div class="nm">Kasia P.</div><div class="gr">8-16</div><div></div><div class="gr">8-16</div><div class="gr">8-16</div><div></div><div></div><div class="gr">10-18</div>
                <div class="nm">Tomek S.</div><div></div><div class="b">10-18</div><div class="b">10-18</div><div class="b">10-18</div><div></div><div class="p">14-22</div><div class="p">14-22</div>
              </div>
            </div>
            <div class="s-mock-grid2">
              <div class="s-mock-card">
                <div class="s-mock-card-h"><span>Dzisiejsze zadania</span><span class="s-mock-pill g">1/4 ✓</span></div>
                <div class="s-mock-tasks">
                  <div class="s-mock-task d"><div class="cb"></div><span>Czyszczenie ekspresu</span><small>14:00</small></div>
                  <div class="s-mock-task"><div class="cb"></div><span>Uzupełnienie lodówki</span><small>15:30</small></div>
                  <div class="s-mock-task"><div class="cb"></div><span>Zamknięcie kasy</span><small>22:00</small></div>
                </div>
              </div>
              <div class="s-mock-card">
                <div class="s-mock-card-h"><span>Top 3 tygodnia 🏆</span></div>
                <div class="s-mock-tasks">
                  <div class="s-mock-task"><div class="cb" style="background:#fbbf24;border-color:#fbbf24"></div><span>Anna K.</span><small>1240 pkt</small></div>
                  <div class="s-mock-task"><div class="cb" style="background:#cbd5e1;border-color:#cbd5e1"></div><span>Marek W.</span><small>980 pkt</small></div>
                  <div class="s-mock-task"><div class="cb" style="background:#d97706;border-color:#d97706"></div><span>Karolina B.</span><small>760 pkt</small></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`;

const FEAT = `
<section class="s-feat" id="funkcje">
  <div class="s-container">
    <div class="s-feat-head">
      <div class="s-eyebrow">Funkcje</div>
      <h2 class="s-h2">Wszystko czego <em>potrzebujesz</em></h2>
      <p class="s-lead">Jedna aplikacja zamiast pięciu. Grafik, zadania, dokumenty, szkolenia i gamifikacja — w jednym miejscu.</p>
    </div>
    <div class="s-feat-grid">

      <div class="s-fcard hero blue">
        <div class="s-fcard-tag">${I.spark}<span>Grafik AI</span></div>
        <h3>Grafik pracy z AI</h3>
        <p>Automatyczne tworzenie grafików z uwzględnieniem dostępności, preferencji i przepisów. Drag &amp; drop. Powiadomienia push.</p>
        <div class="s-fcard-body"><div class="s-fcard-viz">
          <div class="s-fv-week">
            <div class="s-fv-week-h"><span>Tydzień 14</span><span>Pn — Nd</span></div>
            <div class="s-fv-week-row"><span class="n">Anna K.</span><div class="s-fv-cell b"></div><div class="s-fv-cell b"></div><div class="s-fv-cell"></div><div class="s-fv-cell b"></div><div class="s-fv-cell b"></div><div class="s-fv-cell"></div><div class="s-fv-cell"></div></div>
            <div class="s-fv-week-row"><span class="n">Marek W.</span><div class="s-fv-cell"></div><div class="s-fv-cell p"></div><div class="s-fv-cell p"></div><div class="s-fv-cell"></div><div class="s-fv-cell p"></div><div class="s-fv-cell p"></div><div class="s-fv-cell"></div></div>
            <div class="s-fv-week-row"><span class="n">Kasia P.</span><div class="s-fv-cell g"></div><div class="s-fv-cell"></div><div class="s-fv-cell g"></div><div class="s-fv-cell g"></div><div class="s-fv-cell"></div><div class="s-fv-cell"></div><div class="s-fv-cell g"></div></div>
            <div class="s-fv-week-row"><span class="n">Tomek S.</span><div class="s-fv-cell"></div><div class="s-fv-cell b"></div><div class="s-fv-cell b"></div><div class="s-fv-cell b"></div><div class="s-fv-cell"></div><div class="s-fv-cell p"></div><div class="s-fv-cell p"></div></div>
            <div class="s-fv-ai">${I.spark}<span>AI sugeruje: Kasia P. → Czw 8-16 (uzupełnia brak)</span></div>
          </div>
        </div></div>
      </div>

      <div class="s-fcard tall">
        <div class="s-fcard-tag">${I.task}<span>Zadania</span></div>
        <h3>Zadania dla pracowników</h3>
        <p>Przydzielaj codzienne zadania z deadline i potwierdzeniem wykonania zdjęciem.</p>
        <div class="s-fcard-body"><div class="s-fcard-viz">
          <div class="s-fv-task d"><div class="cb"></div><span>Czyszczenie ekspresu</span><span class="m">Anna K · 14:00</span></div>
          <div class="s-fv-task"><div class="cb"></div><span>Uzupełnienie lodówki</span><span class="m">Marek W · 15:30</span></div>
          <div class="s-fv-task"><div class="cb"></div><span>Zamknięcie kasy</span><span class="m">Kasia P · 22:00</span></div>
          <div class="s-fv-task"><div class="cb"></div><span>Inwentaryzacja</span><span class="m">Tomek S · 20:00</span></div>
        </div></div>
      </div>

      <div class="s-fcard">
        <div class="s-fcard-tag">${I.clock}<span>Ewidencja</span></div>
        <h3>Ewidencja czasu</h3>
        <p>GPS / QR check-in, nadgodziny, raporty dla księgowości — automatycznie.</p>
        <div class="s-fcard-body"><div class="s-fv-time">
          <div class="s-fv-time-num">08:42</div>
          <div class="s-fv-time-sub">Zalogowany · QR</div>
        </div></div>
      </div>

      <div class="s-fcard">
        <div class="s-fcard-tag">${I.trophy}<span>Gamifikacja</span></div>
        <h3>Szkolenia &amp; ranking</h3>
        <p>Szkolenia video, quizy, certyfikaty. Punkty i nagrody motywujące zespół.</p>
        <div class="s-fcard-body"><div class="s-fcard-viz">
          <div class="s-fv-rank gold"><div class="pos">1</div><span>Anna K.</span><span class="pts">1240 PKT</span></div>
          <div class="s-fv-rank silver"><div class="pos">2</div><span>Marek W.</span><span class="pts">980 PKT</span></div>
          <div class="s-fv-rank bronze"><div class="pos">3</div><span>Karolina B.</span><span class="pts">760 PKT</span></div>
        </div></div>
      </div>

      <div class="s-fcard wide">
        <div class="s-fcard-tag">${I.doc}<span>Dokumenty</span></div>
        <h3>Cyfrowa teczka pracownika</h3>
        <p>Umowy, badania, certyfikaty BHP. Auto-generowanie i przypomnienia o terminach.</p>
        <div class="s-fcard-body"><div class="s-fcard-viz">
          <div class="s-fv-doc"><div class="s-fv-doc-ic">PDF</div><div class="s-fv-doc-name">Umowa zlecenie — Jan K.</div><span class="s-fv-doc-tag">umowa</span></div>
          <div class="s-fv-doc"><div class="s-fv-doc-ic">PDF</div><div class="s-fv-doc-name">Badania lekarskie — Anna M.</div><span class="s-fv-doc-tag">badania</span></div>
          <div class="s-fv-doc"><div class="s-fv-doc-ic">PDF</div><div class="s-fv-doc-name">Certyfikat BHP — Tomek W.</div><span class="s-fv-doc-tag">cert</span></div>
        </div></div>
      </div>

    </div>
  </div>
</section>`;

const STEPS = `
<section class="s-steps" id="kroki">
  <div class="s-container">
    <div class="s-steps-head">
      <div class="s-eyebrow">Jak zacząć</div>
      <h2 class="s-h2">3 proste <em>kroki</em></h2>
      <p class="s-lead">W mniej niż 10 minut Twój zespół pracuje w nowym systemie.</p>
    </div>
    <div class="s-steps-grid">
      <div class="s-step"><div class="s-step-n">1</div><div class="s-step-t">Krok 1</div><h3>Zarejestruj restaurację</h3><p>Załóż konto, dodaj lokalizację i zaproś swój zespół jednym linkiem.</p></div>
      <div class="s-step"><div class="s-step-n">2</div><div class="s-step-t">Krok 2</div><h3>Skonfiguruj grafik</h3><p>AI utworzy optymalny grafik na podstawie dostępności i preferencji pracowników.</p></div>
      <div class="s-step"><div class="s-step-n">3</div><div class="s-step-t">Krok 3</div><h3>Zarządzaj z telefonu</h3><p>Zadania, dokumenty, szkolenia. Twój zespół wie co, kiedy i jak.</p></div>
    </div>
  </div>
</section>`;

const DEMO = `
<section class="s-demo" id="demo">
  <div class="s-container">
    <div class="s-demo-head">
      <div class="s-eyebrow">Prezentacja</div>
      <h2 class="s-h2">Zobacz ShiftApp <em>w akcji</em></h2>
      <p class="s-lead">Krótka prezentacja pokazująca, jak ShiftApp rewolucjonizuje zarządzanie zespołem.</p>
    </div>
    <div class="s-demo-frame" data-action="signup"><div class="s-demo-play">${I.play}</div></div>
    <div class="s-demo-cta"><a class="s-btn s-btn-primary" data-action="signup">Dołącz do Whitelisty ${I.arrow}</a></div>
  </div>
</section>`;

const PRICE = `
<section class="s-price" id="cennik">
  <div class="s-container">
    <div class="s-price-head">
      <div class="s-eyebrow">Cennik</div>
      <h2 class="s-h2">Prosty i <em>przejrzysty</em></h2>
      <p class="s-lead">Płacisz za lokal + liczbę pracowników. Bez ukrytych opłat.</p>
    </div>
    <div class="s-price-card">
      <div class="s-price-tag">Early Adopter</div>
      <div class="s-price-amt-row"><span class="s-price-amt">99</span><span class="s-price-per">zł / mies.</span></div>
      <div class="s-price-base">bazowa cena — do 5 pracowników w cenie</div>
      <div class="s-price-extra">+ 19 zł za każdego dodatkowego pracownika</div>
      <div class="s-price-promo">🔥 Pierwsze 20 restauracji: -50% przez 3 miesiące</div>
      <ul class="s-price-list">
        <li>${I.check}<span>Grafik pracy z AI</span></li>
        <li>${I.check}<span>Ewidencja czasu (GPS / QR)</span></li>
        <li>${I.check}<span>Zadania z deadline i zdjęciami</span></li>
        <li>${I.check}<span>Dokumenty pracownika</span></li>
        <li>${I.check}<span>Powiadomienia push + SMS</span></li>
        <li>${I.check}<span>Panel web + aplikacja mobilna</span></li>
      </ul>
      <a class="s-btn s-btn-primary" data-action="signup">Zapisz się na Whitelistę ${I.arrow}</a>
    </div>
  </div>
</section>`;

const CALC = `
<section class="s-calc">
  <div class="s-container">
    <div class="s-calc-head">
      <div class="s-eyebrow">Kalkulator</div>
      <h2 class="s-h2">Ile jest <em>wart</em> Twój czas?</h2>
      <p class="s-lead">Sprawdź, ile oszczędzisz z ShiftApp każdego miesiąca.</p>
    </div>
    <div class="s-calc-card">
      <div class="s-calc-left">
        <div class="s-calc-h">Twoje <em>parametry</em></div>
        <div class="s-calc-sub">Przesuń suwakami, aby policzyć oszczędności.</div>
        <div class="s-calc-field">
          <label>Godziny poświęcone tygodniowo na grafiki, urlopy i ewidencję</label>
          <div class="s-calc-row"><span class="s-calc-val" id="c-h">5</span><span class="s-calc-unit">godz. / tydzień</span></div>
          <input type="range" min="1" max="24" value="5" class="s-calc-slider" id="c-hi"/>
        </div>
        <div class="s-calc-field">
          <label>Wartość godziny Twojego czasu</label>
          <div class="s-calc-row"><span class="s-calc-val" id="c-r">70</span><span class="s-calc-unit">zł / godz.</span></div>
          <input type="range" min="20" max="500" step="5" value="70" class="s-calc-slider" id="c-ri"/>
        </div>
        <div class="s-calc-field">
          <label>Liczba pracowników</label>
          <div class="s-calc-row"><span class="s-calc-val" id="c-e">5</span><span class="s-calc-unit">osób</span></div>
          <input type="range" min="3" max="100" value="5" class="s-calc-slider" id="c-ei"/>
        </div>
      </div>
      <div class="s-calc-right">
        <div class="s-calc-result s-calc-res">
          <div class="s-calc-res-h">Miesięczny zysk z ShiftApp</div>
          <div class="s-calc-res-v"><span id="c-net">1301</span> zł</div>
          <div class="s-calc-res-s">albo <strong id="c-time">13 godz.</strong> Twojego czasu odzyskanego co miesiąc</div>
          <a class="s-btn s-btn-primary" data-action="signup">Zapisz się na Whitelistę ${I.arrow}</a>
          <div class="s-calc-break">
            <div class="s-calc-break-h">Jak to policzyliśmy?</div>
            <div class="s-calc-break-row"><span>Godziny miesięcznie</span><strong id="c-mh">20 godz.</strong></div>
            <div class="s-calc-break-row"><span>Wartość tych godzin</span><strong id="c-v">1400 zł</strong></div>
            <div class="s-calc-break-row"><span>Koszt ShiftApp</span><strong id="c-c">99 zł</strong></div>
            <div class="s-calc-break-row tot"><span>Zysk / mies.</span><strong id="c-n">1301 zł</strong></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`;

const FAQ = `
<section class="s-faq" id="faq">
  <div class="s-container">
    <div class="s-faq-head">
      <div class="s-eyebrow">FAQ</div>
      <h2 class="s-h2">Najczęściej <em>zadawane pytania</em></h2>
    </div>
    <div class="s-faq-list">
      <div class="s-faq-item" data-faq>
        <button class="s-faq-q"><span>Dla kogo jest ShiftApp?</span><span class="s-faq-q-ic">${I.plus}</span></button>
        <div class="s-faq-a"><div class="s-faq-a-in">Dla restauracji, kawiarni i food trucków zatrudniających od 3 do 100 pracowników. Idealny tam, gdzie grafiki powstają w Excelu lub na kartce.</div></div>
      </div>
      <div class="s-faq-item" data-faq>
        <button class="s-faq-q"><span>Na jakich platformach działa?</span><span class="s-faq-q-ic">${I.plus}</span></button>
        <div class="s-faq-a"><div class="s-faq-a-in">Panel właściciela w przeglądarce (Chrome, Safari, Firefox). Pracownicy korzystają z aplikacji mobilnej na iOS i Android. Wszystko synchronizuje się w czasie rzeczywistym.</div></div>
      </div>
      <div class="s-faq-item" data-faq>
        <button class="s-faq-q"><span>Ile kosztuje ShiftApp?</span><span class="s-faq-q-ic">${I.plus}</span></button>
        <div class="s-faq-a"><div class="s-faq-a-in">99 zł / mies. za lokal (do 5 pracowników w cenie). Każdy dodatkowy pracownik to 19 zł / mies. Pierwsze 20 restauracji z whitelisty dostaje 50% zniżki na 3 miesiące.</div></div>
      </div>
      <div class="s-faq-item" data-faq>
        <button class="s-faq-q"><span>Kiedy startuje aplikacja?</span><span class="s-faq-q-ic">${I.plus}</span></button>
        <div class="s-faq-a"><div class="s-faq-a-in">Aplikacja startuje w Q2 2026. Osoby z whitelisty otrzymają wcześniejszy dostęp i specjalne warunki cenowe.</div></div>
      </div>
      <div class="s-faq-item" data-faq>
        <button class="s-faq-q"><span>Czym różni się od Kadromierza?</span><span class="s-faq-q-ic">${I.plus}</span></button>
        <div class="s-faq-a"><div class="s-faq-a-in">ShiftApp jest stworzony specjalnie dla gastronomii. Mamy AI tworzące grafiki, zadania z potwierdzeniem zdjęciem, gamifikację i teczkę dokumentów. Kadromierz to ogólne HR — my idziemy głębiej w specyfikę restauracji.</div></div>
      </div>
    </div>
  </div>
</section>`;

const CONTACT = `
<section class="s-contact">
  <div class="s-contact-inner">
    <div class="s-eyebrow">Kontakt</div>
    <h2 class="s-h2">Porozmawiajmy</h2>
    <p class="s-lead">Chcesz dowiedzieć się więcej? Zadzwoń lub napisz — odpowiemy od razu.</p>
    <div class="s-contact-phone">884 184 352</div>
    <div class="s-contact-hours">Pon – Pt, 9:00 – 18:00</div>
    <div class="s-contact-actions">
      <a class="s-btn s-btn-primary" href="tel:884184352">${I.phone}<span>Zadzwoń</span></a>
      <a class="s-btn s-btn-ghost" href="https://wa.me/48884184352" target="_blank" rel="noopener">${I.chat}<span>WhatsApp</span></a>
    </div>
  </div>
</section>`;

const FOOT = `
<footer class="s-foot">
  <div class="s-container">
    <div class="s-foot-grid">
      <div>
        <div class="s-foot-brand-row"><span class="s-foot-brand-m">S</span><span>ShiftApp</span></div>
        <p class="s-foot-desc">Aplikacja do zarządzania zespołem dla gastronomii. Grafik AI, zadania, ewidencja, dokumenty i szkolenia w jednym.</p>
      </div>
      <div class="s-foot-col">
        <h4>Produkt</h4>
        <a href="#funkcje" data-action="scroll:funkcje">Funkcje</a>
        <a href="#cennik" data-action="scroll:cennik">Cennik</a>
        <a href="#demo" data-action="scroll:demo">Prezentacja</a>
        <a href="#" data-action="signup">Whitelista</a>
      </div>
      <div class="s-foot-col">
        <h4>Firma</h4>
        <a href="#">O nas</a>
        <a href="#">Kontakt</a>
        <a href="#faq" data-action="scroll:faq">FAQ</a>
        <a href="#">Blog</a>
      </div>
      <div class="s-foot-col">
        <h4>Prawne</h4>
        <a href="#">Polityka prywatności</a>
        <a href="#">Regulamin</a>
        <a href="#">RODO</a>
        <a href="#">Cookies</a>
      </div>
    </div>
    <div class="s-foot-bot">
      <div class="s-foot-copy">© 2026 ShiftApp · Kontakt: 884 184 352</div>
      <div class="s-foot-social">
        <a href="#" aria-label="TikTok">${I.tt}</a>
        <a href="#" aria-label="Facebook">${I.fb}</a>
        <a href="#" aria-label="Instagram">${I.ig}</a>
        <a href="#" aria-label="YouTube">${I.yt}</a>
      </div>
    </div>
  </div>
</footer>`;

const HTML = `${NAV}${HERO}${FEAT}${STEPS}${DEMO}${PRICE}${CALC}${FAQ}${CONTACT}${FOOT}`;

/* ────────── COMPONENT ────────── */
export default function Landing() {
  const router = useRouter();

  if (Platform.OS !== 'web') return <Redirect href="/" />;

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const portal = document.createElement('div');
    portal.id = 'sa-portal';
    portal.innerHTML = HTML;

    let styleEl = document.getElementById('sa-styles') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'sa-styles';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = CSS;

    const hidden: { el: HTMLElement; d: string }[] = [];
    Array.from(document.body.children).forEach((c) => {
      const el = c as HTMLElement;
      if (['SCRIPT', 'STYLE', 'LINK'].includes(el.tagName)) return;
      hidden.push({ el, d: el.style.display || '' });
      el.style.display = 'none';
    });
    document.body.appendChild(portal);

    const html = document.documentElement;
    const body = document.body;
    const orig = {
      ho: html.style.overflow, hh: html.style.height,
      bo: body.style.overflow, bh: body.style.height,
      bm: body.style.margin, bp: body.style.padding, bg: body.style.background,
    };
    html.style.overflow = 'auto'; html.style.height = 'auto';
    body.style.overflow = 'auto'; body.style.height = 'auto';
    body.style.margin = '0'; body.style.padding = '0'; body.style.background = '#ffffff';

    /* FAQ */
    const handleFaq = (e: Event) => {
      const item = (e.target as HTMLElement).closest?.('[data-faq]') as HTMLElement | null;
      if (!item) return;
      const open = item.classList.contains('open');
      portal.querySelectorAll('.s-faq-item').forEach((el) => el.classList.remove('open'));
      if (!open) item.classList.add('open');
    };
    portal.addEventListener('click', handleFaq);

    /* Actions */
    const handleClick = (e: Event) => {
      const t = e.target as HTMLElement;
      const trig = t.closest?.('[data-action]') as HTMLElement | null;
      if (!trig) return;
      const action = trig.getAttribute('data-action') || '';
      if (action === 'top') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (action === 'login') {
        e.preventDefault();
        router.push('/login');
      } else if (action === 'signup') {
        e.preventDefault();
        router.push('/join');
      } else if (action.startsWith('scroll:')) {
        e.preventDefault();
        const id = action.slice('scroll:'.length);
        const el = portal.querySelector('#' + id) as HTMLElement | null;
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY - 80;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }
    };
    portal.addEventListener('click', handleClick);

    /* Form */
    const handleSubmit = (e: Event) => {
      const form = (e.target as HTMLElement).closest?.('form');
      if (!form) return;
      e.preventDefault();
      router.push('/join');
    };
    portal.addEventListener('submit', handleSubmit);

    /* Calc */
    const hi = portal.querySelector('#c-hi') as HTMLInputElement | null;
    const ri = portal.querySelector('#c-ri') as HTMLInputElement | null;
    const ei = portal.querySelector('#c-ei') as HTMLInputElement | null;
    const recompute = () => {
      if (!hi || !ri || !ei) return;
      const h = parseInt(hi.value, 10);
      const r = parseInt(ri.value, 10);
      const emp = parseInt(ei.value, 10);
      const mh = h * 4;
      const val = mh * r;
      const cost = 99 + Math.max(0, emp - 5) * 19;
      const net = Math.max(0, val - cost);
      const time = Math.round(net / r);
      const set = (id: string, v: string) => { const el = portal.querySelector('#' + id); if (el) el.textContent = v; };
      set('c-h', String(h));
      set('c-r', String(r));
      set('c-e', String(emp));
      set('c-net', String(net));
      set('c-time', `${time} godz.`);
      set('c-mh', `${mh} godz.`);
      set('c-v', `${val} zł`);
      set('c-c', `${cost} zł`);
      set('c-n', `${net} zł`);
    };
    hi?.addEventListener('input', recompute);
    ri?.addEventListener('input', recompute);
    ei?.addEventListener('input', recompute);
    recompute();

    /* Nav scroll shadow */
    const nav = portal.querySelector('.s-nav') as HTMLElement | null;
    const handleScroll = () => {
      if (!nav) return;
      if (window.scrollY > 30) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      portal.removeEventListener('click', handleFaq);
      portal.removeEventListener('click', handleClick);
      portal.removeEventListener('submit', handleSubmit);
      hi?.removeEventListener('input', recompute);
      ri?.removeEventListener('input', recompute);
      ei?.removeEventListener('input', recompute);
      window.removeEventListener('scroll', handleScroll);
      portal.remove();
      hidden.forEach(({ el, d }) => { el.style.display = d; });
      html.style.overflow = orig.ho; html.style.height = orig.hh;
      body.style.overflow = orig.bo; body.style.height = orig.bh;
      body.style.margin = orig.bm; body.style.padding = orig.bp; body.style.background = orig.bg;
    };
  }, [router]);

  return null;
}
