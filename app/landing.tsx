import { Redirect, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/* ══════════════════════════════════════════════════════════════════════════
   ShiftApp — Landing (Liquid Glass Premium)
   Portal pattern. Desktop-first. Inter + Fustat (hero only).
   Brand: Electric blue #0084FF · Background: pure white with luminous glow
   ══════════════════════════════════════════════════════════════════════════ */

/* ────────── CSS ────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Fustat:wght@600;700;800&display=swap');

:where(#sa-portal),:where(#sa-portal *),:where(#sa-portal *::before),:where(#sa-portal *::after){box-sizing:border-box;margin:0;padding:0;}
#sa-portal{
  position:relative;
  width:100%;
  min-height:100vh;
  overflow-x:hidden;
  font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  -webkit-font-smoothing:antialiased;
  -moz-osx-font-smoothing:grayscale;
  color:#0f172a;
  background:#ffffff;
  line-height:1.5;
  font-size:15px;
  display:block;
}
#sa-portal a{color:inherit;text-decoration:none;}
#sa-portal button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit;padding:0;}
#sa-portal ul,#sa-portal ol{list-style:none;}
#sa-portal h1,#sa-portal h2,#sa-portal h3,#sa-portal h4,#sa-portal h5{margin:0;font-weight:500;line-height:1.15;color:#0f172a;}
#sa-portal p{margin:0;}
#sa-portal img,#sa-portal video{display:block;max-width:100%;}
/* CRITICAL: clamp SVG default size — without this, SVGs without explicit width
   stretch to fill flex parents and blow the layout up */
#sa-portal svg{width:1em;height:1em;flex-shrink:0;display:inline-block;vertical-align:middle;}
#sa-portal input,#sa-portal button{font-family:inherit;font-size:inherit;}
#sa-portal ::selection{background:rgba(0,132,255,.2);}

/* ─── Layout primitives ─── */
.c{max-width:1240px;margin:0 auto;padding:0 32px;width:100%;}
.section{padding:140px 0;position:relative;}
.section-tight{padding:100px 0;}

/* ─── Type ─── */
.eyebrow{
  display:inline-block;
  font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.12em;
  background:linear-gradient(90deg,#F5C344,#F28482,#B567C2);
  -webkit-background-clip:text;background-clip:text;color:transparent;
  margin-bottom:18px;
}
.eyebrow-blue{
  display:inline-block;
  font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.12em;
  color:#0084FF;margin-bottom:18px;
}
.h2{
  font-size:clamp(38px,4.2vw,56px);
  font-weight:500;
  letter-spacing:-.025em;
  line-height:1.08;
  color:#0f172a;
}
.h2 span.grad{
  background:linear-gradient(90deg,#0084FF,#60B1FF);
  -webkit-background-clip:text;background-clip:text;color:transparent;
}
.lead{
  font-size:18px;color:#64748b;line-height:1.5;margin-top:18px;letter-spacing:-.005em;
  max-width:580px;
}
.lead-center{margin-left:auto;margin-right:auto;}

/* ─── Background glow ─── */
.glow-wrap{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0;}
.glow-1{
  position:absolute;top:-200px;left:-200px;
  width:900px;height:600px;border-radius:50%;
  background:radial-gradient(ellipse,rgba(96,177,255,.35),transparent 60%);
  filter:blur(60px);
}
.glow-2{
  position:absolute;top:-100px;left:200px;
  width:500px;height:400px;border-radius:50%;
  background:radial-gradient(ellipse,rgba(49,154,255,.25),transparent 60%);
  filter:blur(40px);
}

/* ─── Liquid Glass mixin (light) ─── */
.lg{
  background:rgba(255,255,255,.55);
  backdrop-filter:saturate(180%) blur(40px);
  -webkit-backdrop-filter:saturate(180%) blur(40px);
  border:1px solid rgba(0,0,0,.08);
  box-shadow:inset 0 1px 0 0 rgba(255,255,255,.7),inset 0 4px 4px 0 rgba(255,255,255,.25);
}

/* ─── NAV ─── */
.nav-wrap{
  position:fixed;top:24px;left:0;right:0;
  z-index:50;
  display:flex;justify-content:center;
  pointer-events:none;
}
.nav{
  pointer-events:auto;
  display:flex;align-items:center;gap:4px;
  padding:8px 8px 8px 22px;
  border-radius:16px;
  background:rgba(255,255,255,.5);
  backdrop-filter:saturate(180%) blur(40px);
  -webkit-backdrop-filter:saturate(180%) blur(40px);
  border:1px solid rgba(0,0,0,.08);
  box-shadow:inset 0 1px 0 0 rgba(255,255,255,.7),0 8px 32px rgba(15,23,42,.05);
  transition:background .25s ease;
}
.nav.scrolled{background:rgba(255,255,255,.85);}
.nav-brand{
  display:flex;align-items:center;gap:10px;
  font-family:'Fustat',sans-serif;font-weight:800;
  font-size:17px;color:#0f172a;letter-spacing:-.02em;padding-right:14px;
  border-right:1px solid rgba(0,0,0,.08);
  margin-right:10px;
}
.nav-mark{
  width:28px;height:28px;border-radius:8px;
  background:linear-gradient(135deg,#0084FF,#005FBF);
  color:#fff;display:flex;align-items:center;justify-content:center;
  font-weight:700;font-size:13px;font-family:'Fustat',sans-serif;
  box-shadow:0 4px 12px rgba(0,132,255,.4),inset 0 1px 0 rgba(255,255,255,.3);
}
.nav-links{display:flex;align-items:center;gap:2px;}
.nav-links a{
  font-size:14px;color:#475569;font-weight:500;
  padding:8px 14px;border-radius:10px;transition:all .15s;
}
.nav-links a:hover{color:#0f172a;background:rgba(0,0,0,.04);}
.nav-cta{
  margin-left:8px;padding:10px 18px;
  background:rgba(0,132,255,.95);
  color:#fff;font-size:13.5px;font-weight:600;
  border-radius:11px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 4px 14px rgba(0,132,255,.35);
  transition:all .2s;display:inline-flex;align-items:center;gap:6px;
}
.nav-cta:hover{background:#0084FF;transform:translateY(-1px);box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 6px 20px rgba(0,132,255,.45);}
.nav-cta svg{width:14px;height:14px;}

/* ─── HERO ─── */
.hero{
  position:relative;
  padding:200px 32px 100px;
  min-height:100vh;
  display:flex;align-items:center;justify-content:center;
  overflow:hidden;
  background:#fff;
}
.hero-bg{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0;}
.hero-glow-1{
  position:absolute;top:-300px;left:-200px;
  width:1100px;height:700px;border-radius:50%;
  background:radial-gradient(ellipse,rgba(96,177,255,.4),transparent 60%);
  filter:blur(80px);
}
.hero-glow-2{
  position:absolute;top:-100px;right:-200px;
  width:800px;height:600px;border-radius:50%;
  background:radial-gradient(ellipse,rgba(0,132,255,.18),transparent 60%);
  filter:blur(80px);
}
.hero-glow-3{
  position:absolute;bottom:-200px;left:30%;
  width:700px;height:400px;border-radius:50%;
  background:radial-gradient(ellipse,rgba(49,154,255,.15),transparent 60%);
  filter:blur(80px);
}
.hero-inner{
  position:relative;z-index:2;
  max-width:1100px;width:100%;
  display:flex;flex-direction:column;align-items:center;text-align:center;
  gap:32px;
}
.hero-badge{
  display:inline-flex;align-items:center;gap:8px;
  padding:7px 14px 7px 8px;
  background:rgba(255,255,255,.7);
  border:1px solid rgba(0,0,0,.08);
  border-radius:9999px;
  font-size:13px;color:#475569;font-weight:500;
  backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  box-shadow:0 4px 12px rgba(0,0,0,.04),inset 0 1px 0 rgba(255,255,255,.8);
}
.hero-badge .pill{
  display:inline-flex;align-items:center;gap:6px;
  padding:3px 10px;border-radius:9999px;
  background:linear-gradient(135deg,#0084FF,#60B1FF);
  color:#fff;font-size:11px;font-weight:700;letter-spacing:.04em;
}
.hero-h1{
  font-family:'Fustat',sans-serif;font-weight:700;
  font-size:clamp(48px,7vw,84px);
  line-height:1.02;letter-spacing:-.035em;
  color:#0f172a;
  max-width:1000px;
}
.hero-h1 .grad{
  background:linear-gradient(90deg,#0084FF 0%,#319AFF 50%,#60B1FF 100%);
  -webkit-background-clip:text;background-clip:text;color:transparent;
  font-style:normal;
}
.hero-sub{
  font-size:19px;color:#475569;line-height:1.55;
  max-width:680px;letter-spacing:-.005em;
}
.hero-form{
  display:flex;align-items:center;gap:8px;
  padding:8px;
  background:rgba(255,255,255,.65);
  border:1px solid rgba(0,0,0,.08);
  border-radius:18px;
  backdrop-filter:saturate(180%) blur(40px);
  -webkit-backdrop-filter:saturate(180%) blur(40px);
  box-shadow:0 12px 32px rgba(15,23,42,.06),inset 0 1px 0 rgba(255,255,255,.8);
  max-width:540px;width:100%;
  transition:all .2s;
}
.hero-form:focus-within{border-color:rgba(0,132,255,.5);box-shadow:0 12px 32px rgba(0,132,255,.15),inset 0 1px 0 rgba(255,255,255,.8),0 0 0 4px rgba(0,132,255,.08);}
.hero-form input{
  flex:1;border:none;outline:none;background:transparent;
  padding:12px 16px;
  font-size:15px;color:#0f172a;min-width:0;
}
.hero-form input::placeholder{color:#94a3b8;}
.btn-primary{
  display:inline-flex;align-items:center;gap:10px;
  padding:13px 22px 13px 24px;
  background:rgba(0,132,255,.92);
  color:#fff;
  border-radius:13px;
  font-size:14.5px;font-weight:600;letter-spacing:-.005em;
  backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.4),inset 0 4px 4px rgba(255,255,255,.18),0 8px 24px rgba(0,132,255,.35);
  transition:all .2s ease;
  flex-shrink:0;
}
.btn-primary:hover{transform:scale(1.02);background:#0084FF;box-shadow:inset 0 1px 0 rgba(255,255,255,.4),inset 0 4px 4px rgba(255,255,255,.18),0 12px 32px rgba(0,132,255,.45);}
.btn-primary .arrow{
  width:24px;height:24px;border-radius:50%;background:#fff;
  display:flex;align-items:center;justify-content:center;color:#0084FF;
}
.btn-primary .arrow svg{width:13px;height:13px;}
.btn-ghost{
  display:inline-flex;align-items:center;gap:8px;
  padding:13px 22px;
  background:rgba(255,255,255,.6);
  color:#0f172a;border:1px solid rgba(0,0,0,.08);
  border-radius:13px;
  font-size:14.5px;font-weight:600;
  backdrop-filter:blur(10px);
  transition:all .2s;
}
.btn-ghost:hover{background:#fff;border-color:rgba(0,0,0,.18);}
.btn-ghost svg{width:16px;height:16px;}
.hero-meta{
  display:flex;align-items:center;gap:24px;
  margin-top:8px;flex-wrap:wrap;justify-content:center;
}
.avatars{display:flex;align-items:center;}
.avatars span{
  width:30px;height:30px;border-radius:50%;
  border:2.5px solid #fff;
  display:flex;align-items:center;justify-content:center;
  font-size:11px;font-weight:600;color:#fff;
  margin-left:-10px;
  box-shadow:0 2px 6px rgba(0,0,0,.08);
}
.avatars span:first-child{margin-left:0;background:linear-gradient(135deg,#0084FF,#005FBF);}
.avatars span:nth-child(2){background:linear-gradient(135deg,#F28482,#E15554);}
.avatars span:nth-child(3){background:linear-gradient(135deg,#F5C344,#E8A317);}
.avatars span:nth-child(4){background:linear-gradient(135deg,#B567C2,#8B4A9E);}
.hero-meta-text{font-size:14px;color:#64748b;font-weight:500;}
.hero-demo{
  display:inline-flex;align-items:center;gap:10px;
  font-size:14px;color:#0f172a;font-weight:600;
  padding:8px 16px 8px 8px;background:rgba(255,255,255,.7);
  border:1px solid rgba(0,0,0,.08);border-radius:9999px;
  transition:all .2s;
}
.hero-demo:hover{background:#fff;}
.hero-demo .play{
  width:28px;height:28px;border-radius:50%;background:#0f172a;color:#fff;
  display:flex;align-items:center;justify-content:center;
}
.hero-demo .play svg{width:11px;height:11px;}
.hero-demo .soon{font-size:11px;font-weight:600;color:#64748b;
  padding:2px 8px;border-radius:9999px;background:rgba(0,0,0,.04);}

/* ─── SECTION HEADERS ─── */
.sec-head{text-align:center;max-width:760px;margin:0 auto 80px;}

/* ─── FEATURES ─── */
.features-wrap{position:relative;background:#F5F7FA;}
.features-glow{
  position:absolute;top:200px;right:-300px;width:800px;height:600px;border-radius:50%;
  background:radial-gradient(ellipse,rgba(96,177,255,.15),transparent 60%);
  filter:blur(80px);z-index:0;pointer-events:none;
}
.features-grid{
  display:grid;
  grid-template-columns:repeat(6,1fr);
  gap:24px;
  position:relative;z-index:1;
}
.feat-card{
  position:relative;overflow:hidden;
  border-radius:24px;
  height:400px;
  display:flex;flex-direction:column;justify-content:flex-end;
  padding:28px;
  background:#FFFFFF;
  border:1px solid rgba(15,23,42,.06);
  box-shadow:0 4px 16px rgba(15,23,42,.04),0 20px 40px -20px rgba(15,23,42,.08);
  transition:all .3s ease;
}
.feat-card:hover{transform:translateY(-4px);box-shadow:0 8px 24px rgba(15,23,42,.06),0 30px 60px -20px rgba(15,23,42,.14);border-color:rgba(15,23,42,.1);}
.feat-card-1{grid-column:span 3;background:radial-gradient(circle at 50% 0%,#60B1FF 0%,#C5E4FF 18%,#EEF6FF 42%,#FFFFFF 70%);}
.feat-card-2{grid-column:span 3;background:radial-gradient(circle at 50% 0%,#F28482 0%,#FFDDD9 18%,#FFF0EE 42%,#FFFFFF 70%);}
.feat-card-3{grid-column:span 2;background:radial-gradient(circle at 50% 0%,#0084FF 0%,#7FBEFF 18%,#E8F4FF 42%,#FFFFFF 70%);}
.feat-card-4{grid-column:span 2;background:radial-gradient(circle at 50% 0%,#F5C344 0%,#FFE08C 18%,#FFF8DD 42%,#FFFFFF 70%);}
.feat-card-5{grid-column:span 2;background:radial-gradient(circle at 50% 0%,#B567C2 0%,#D9A0E2 18%,#F3E2F7 42%,#FFFFFF 70%);}
.feat-title{
  font-size:1.1rem;font-weight:600;color:#0f172a;
  letter-spacing:-.015em;margin-bottom:6px;
}
.feat-desc{
  font-size:13.5px;color:#475569;line-height:1.5;
}

/* Feature visuals */
.fv{
  position:absolute;top:0;left:0;right:0;
  display:flex;align-items:flex-start;justify-content:center;
  padding-top:34px;
  pointer-events:none;
}

/* Schedule mockup */
.fv-sched{
  width:88%;max-width:380px;background:#fff;border-radius:14px;
  padding:14px;
  box-shadow:0 8px 24px rgba(15,23,42,.12),inset 0 1px 0 rgba(255,255,255,.8);
  border:1px solid rgba(0,0,0,.04);
  font-size:11px;
}
.fv-sched-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;font-weight:600;color:#0f172a;}
.fv-sched-head .week{font-size:10px;color:#64748b;font-weight:500;}
.fv-sched-grid{display:grid;grid-template-columns:60px repeat(7,1fr);gap:3px;}
.fv-sched-grid > div{padding:5px 2px;font-size:9px;text-align:center;border-radius:4px;background:#f8fafc;color:#64748b;font-weight:500;}
.fv-sched-grid > .hd{background:transparent;color:#94a3b8;font-size:9px;font-weight:600;text-transform:uppercase;}
.fv-sched-grid > .nm{text-align:left;padding-left:6px;font-weight:600;color:#0f172a;background:transparent;font-size:10px;}
.fv-sched-grid > .b{background:#DBEAFE;color:#1D4ED8;font-weight:600;}
.fv-sched-grid > .g{background:#DCFCE7;color:#16A34A;font-weight:600;}
.fv-sched-grid > .o{background:#FFEDD5;color:#C2410C;font-weight:600;}
.fv-sched-grid > .p{background:#F3E8FF;color:#7E22CE;font-weight:600;}
.fv-sched-ai{
  margin-top:10px;padding:7px 10px;
  background:linear-gradient(90deg,rgba(0,132,255,.08),rgba(96,177,255,.05));
  border-radius:8px;border:1px solid rgba(0,132,255,.15);
  font-size:10.5px;color:#0084FF;font-weight:600;
  display:flex;align-items:center;gap:6px;
}
.fv-sched-ai svg{width:12px;height:12px;}

/* Tasks mockup */
.fv-tasks{
  width:86%;max-width:340px;background:#fff;border-radius:14px;
  padding:16px;
  box-shadow:0 8px 24px rgba(15,23,42,.12),inset 0 1px 0 rgba(255,255,255,.8);
  border:1px solid rgba(0,0,0,.04);
}
.fv-tasks-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
.fv-tasks-head h5{font-size:12px;font-weight:600;color:#0f172a;}
.fv-tasks-head .pill{font-size:10px;font-weight:600;color:#475569;padding:2px 8px;background:#f1f5f9;border-radius:9999px;}
.fv-task{display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid #f1f5f9;}
.fv-task:first-of-type{border-top:none;}
.fv-task .cb{width:14px;height:14px;border-radius:5px;border:1.5px solid #cbd5e1;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.fv-task.d .cb{background:#0084FF;border-color:#0084FF;}
.fv-task.d .cb svg{width:8px;height:8px;color:#fff;}
.fv-task .ttext{font-size:11.5px;color:#0f172a;font-weight:500;flex:1;}
.fv-task.d .ttext{text-decoration:line-through;color:#94a3b8;}
.fv-task .meta{font-size:10px;color:#94a3b8;}

/* Time-tracking visual */
.fv-time{
  width:80%;max-width:240px;background:#fff;border-radius:14px;
  padding:18px;
  box-shadow:0 8px 24px rgba(15,23,42,.12),inset 0 1px 0 rgba(255,255,255,.8);
  border:1px solid rgba(0,0,0,.04);
  text-align:center;
}
.fv-time-ring{
  width:90px;height:90px;border-radius:50%;
  background:conic-gradient(#0084FF 0deg 268deg,#E0F2FE 268deg 360deg);
  display:flex;align-items:center;justify-content:center;
  margin:0 auto 10px;position:relative;
}
.fv-time-ring::before{
  content:'';position:absolute;inset:8px;background:#fff;border-radius:50%;
}
.fv-time-ring span{position:relative;z-index:1;font-size:18px;font-weight:700;color:#0084FF;letter-spacing:-.02em;}
.fv-time-label{font-size:10px;color:#64748b;font-weight:500;text-transform:uppercase;letter-spacing:.08em;}
.fv-time-row{display:flex;justify-content:space-between;gap:10px;margin-top:12px;}
.fv-time-cell{flex:1;padding:7px;background:#F1F5F9;border-radius:8px;text-align:center;}
.fv-time-cell strong{display:block;font-size:13px;color:#0f172a;font-weight:700;}
.fv-time-cell em{display:block;font-size:9px;color:#64748b;font-style:normal;margin-top:2px;}

/* Leaderboard */
.fv-board{
  width:88%;max-width:300px;background:#fff;border-radius:14px;
  padding:14px;
  box-shadow:0 8px 24px rgba(15,23,42,.12),inset 0 1px 0 rgba(255,255,255,.8);
  border:1px solid rgba(0,0,0,.04);
}
.fv-board-row{display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid #f1f5f9;}
.fv-board-row:first-of-type{border-top:none;}
.fv-board-row .medal{font-size:18px;width:24px;text-align:center;}
.fv-board-row .av{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff;font-weight:600;}
.fv-board-row .av.a1{background:linear-gradient(135deg,#F28482,#E15554);}
.fv-board-row .av.a2{background:linear-gradient(135deg,#0084FF,#005FBF);}
.fv-board-row .av.a3{background:linear-gradient(135deg,#F5C344,#E8A317);}
.fv-board-row .nm{flex:1;font-size:12px;font-weight:600;color:#0f172a;}
.fv-board-row .pts{font-size:11px;font-weight:700;color:#0084FF;}

/* Documents */
.fv-docs{
  width:88%;max-width:300px;background:#fff;border-radius:14px;
  padding:14px;
  box-shadow:0 8px 24px rgba(15,23,42,.12),inset 0 1px 0 rgba(255,255,255,.8);
  border:1px solid rgba(0,0,0,.04);
}
.fv-doc{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid #f1f5f9;}
.fv-doc:first-of-type{border-top:none;}
.fv-doc .ic{width:28px;height:28px;border-radius:7px;background:#EFF6FF;color:#0084FF;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.fv-doc .ic svg{width:14px;height:14px;}
.fv-doc .nm{flex:1;font-size:11.5px;font-weight:600;color:#0f172a;line-height:1.3;}
.fv-doc .tag{font-size:9.5px;font-weight:600;color:#64748b;padding:2px 7px;border-radius:9999px;background:#F1F5F9;}
.fv-doc .tag.green{color:#16A34A;background:#DCFCE7;}
.fv-doc .tag.orange{color:#C2410C;background:#FFEDD5;}
.fv-doc-ai{
  margin-top:10px;padding:7px 10px;
  background:linear-gradient(90deg,rgba(181,103,194,.08),rgba(229,200,236,.08));
  border-radius:8px;border:1px solid rgba(181,103,194,.18);
  font-size:10.5px;color:#9333EA;font-weight:600;
  display:flex;align-items:center;gap:6px;
}
.fv-doc-ai svg{width:12px;height:12px;}

/* ─── STEPS ─── */
.steps-wrap{background:#FFFFFF;position:relative;overflow:hidden;}
.steps-glow{
  position:absolute;top:50%;left:-200px;width:600px;height:400px;border-radius:50%;
  background:radial-gradient(ellipse,rgba(96,177,255,.12),transparent 60%);
  filter:blur(80px);transform:translateY(-50%);pointer-events:none;
}
.steps-grid{
  display:grid;grid-template-columns:repeat(3,1fr);gap:24px;
  position:relative;z-index:1;
}
.step-card{
  background:linear-gradient(180deg,#FAFBFC 0%,#FFFFFF 100%);
  border:1px solid rgba(15,23,42,.08);
  border-radius:24px;
  padding:40px 32px;
  box-shadow:0 4px 16px rgba(15,23,42,.04),0 20px 40px -20px rgba(15,23,42,.08);
  transition:all .25s ease;
  position:relative;overflow:hidden;
  min-height:260px;
}
.step-card:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(15,23,42,.06),0 30px 60px -20px rgba(0,132,255,.18);border-color:rgba(0,132,255,.2);}
.step-label{
  display:inline-block;
  font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;
  color:#0084FF;
  padding:6px 12px;border-radius:9999px;
  background:rgba(0,132,255,.08);
  margin-bottom:28px;
}
.step-num{
  position:absolute;top:24px;right:28px;
  font-family:'Fustat',sans-serif;font-weight:800;
  font-size:84px;line-height:1;
  color:transparent;
  -webkit-background-clip:text;background-clip:text;
  background-image:linear-gradient(180deg,#E2E8F0 0%,#F8FAFC 100%);
  letter-spacing:-.06em;
  pointer-events:none;
}
.step-title{
  font-size:22px;font-weight:600;color:#0f172a;letter-spacing:-.02em;
  margin-bottom:12px;
}
.step-desc{font-size:14.5px;color:#64748b;line-height:1.55;}

/* ─── DEMO ─── */
.demo-wrap{position:relative;background:#fff;}
.demo-card{
  max-width:1080px;margin:0 auto;
  background:linear-gradient(135deg,#0a0a0a 0%,#1a1a2e 50%,#0a0a0a 100%);
  border-radius:28px;
  padding:80px 60px;
  text-align:center;
  position:relative;overflow:hidden;
  box-shadow:0 30px 80px -20px rgba(0,132,255,.25);
}
.demo-card::before{
  content:'';position:absolute;top:-200px;left:50%;transform:translateX(-50%);
  width:600px;height:400px;border-radius:50%;
  background:radial-gradient(ellipse,rgba(0,132,255,.4),transparent 60%);
  filter:blur(60px);
}
.demo-content{position:relative;z-index:2;}
.demo-eyebrow{
  display:inline-block;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.18em;
  color:rgba(255,255,255,.5);margin-bottom:18px;
}
.demo-card h2{
  font-size:clamp(36px,4.5vw,52px);font-weight:500;letter-spacing:-.025em;
  color:#fff;line-height:1.1;margin-bottom:18px;
}
.demo-card p{
  font-size:18px;color:rgba(255,255,255,.7);max-width:560px;margin:0 auto 36px;line-height:1.5;
}
.demo-cta{
  display:inline-flex;align-items:center;gap:10px;
  padding:14px 26px;
  background:rgba(255,255,255,.95);
  color:#0a0a0a;
  border-radius:13px;
  font-size:14.5px;font-weight:600;
  transition:all .2s;
  box-shadow:0 12px 32px rgba(0,132,255,.2);
}
.demo-cta:hover{transform:scale(1.02);background:#fff;}
.demo-cta svg{width:14px;height:14px;}

/* ─── PRICING ─── */
.price-wrap{position:relative;background:#F5F7FA;overflow:hidden;}
.price-glow{
  position:absolute;top:30%;left:50%;transform:translate(-50%,-50%);width:1000px;height:600px;border-radius:50%;
  background:radial-gradient(ellipse,rgba(96,177,255,.18),transparent 60%);
  filter:blur(80px);pointer-events:none;
}
.price-card-wrap{max-width:520px;margin:0 auto;position:relative;z-index:1;}
.price-card{
  background:#FFFFFF;border-radius:28px;padding:44px 40px;
  border:1px solid rgba(15,23,42,.08);
  box-shadow:0 10px 30px -10px rgba(15,23,42,.12),0 40px 80px -20px rgba(0,132,255,.15);
  position:relative;
}
.price-card::before{
  content:'';position:absolute;inset:-1px;border-radius:28px;padding:1px;
  background:linear-gradient(135deg,rgba(0,132,255,.3),transparent 50%,rgba(96,177,255,.2));
  -webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);
  -webkit-mask-composite:xor;mask-composite:exclude;
  pointer-events:none;
}
.price-badge{
  display:inline-block;
  padding:6px 14px;border-radius:9999px;
  background:linear-gradient(135deg,#0084FF,#60B1FF);
  color:#fff;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
  margin-bottom:24px;
  box-shadow:0 4px 12px rgba(0,132,255,.3);
}
.price-amount{
  display:flex;align-items:baseline;gap:8px;margin-bottom:6px;
}
.price-amount strong{
  font-family:'Fustat',sans-serif;font-weight:700;
  font-size:64px;letter-spacing:-.04em;color:#0f172a;line-height:1;
}
.price-amount em{font-style:normal;font-size:18px;color:#64748b;font-weight:500;}
.price-small{font-size:14px;color:#64748b;font-weight:500;margin-bottom:8px;}
.price-add{
  font-size:13.5px;color:#475569;font-weight:500;margin-bottom:20px;
  padding-bottom:20px;border-bottom:1px solid #F1F5F9;
}
.price-promo{
  padding:14px 16px;border-radius:12px;
  background:linear-gradient(135deg,rgba(255,128,30,.08),rgba(255,165,0,.06));
  border:1px solid rgba(255,128,30,.2);
  font-size:13px;color:#C2410C;font-weight:600;
  margin-bottom:28px;
  display:flex;align-items:center;gap:8px;
}
.price-feats{display:flex;flex-direction:column;gap:12px;margin-bottom:28px;}
.price-feat{
  display:flex;align-items:center;gap:12px;
  font-size:14px;color:#0f172a;font-weight:500;
}
.price-feat .ok{
  width:22px;height:22px;border-radius:50%;background:#EFF6FF;color:#0084FF;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
}
.price-feat .ok svg{width:11px;height:11px;}
.price-cta{
  display:flex;align-items:center;justify-content:center;gap:10px;
  width:100%;
  padding:16px 24px;
  background:rgba(0,132,255,.92);
  color:#fff;
  border-radius:14px;
  font-size:15px;font-weight:600;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.4),inset 0 4px 4px rgba(255,255,255,.18),0 12px 28px rgba(0,132,255,.4);
  transition:all .2s;
}
.price-cta:hover{transform:scale(1.02);background:#0084FF;}

/* ─── CALCULATOR ─── */
.calc-wrap{background:#FFFFFF;position:relative;overflow:hidden;}
.calc-glow{
  position:absolute;top:20%;right:-300px;width:800px;height:600px;border-radius:50%;
  background:radial-gradient(ellipse,rgba(96,177,255,.12),transparent 60%);
  filter:blur(80px);pointer-events:none;
}
.calc-card{
  max-width:1080px;margin:0 auto;
  background:#FFFFFF;
  border-radius:28px;
  border:1px solid rgba(15,23,42,.08);
  box-shadow:0 10px 30px -10px rgba(15,23,42,.08),0 40px 80px -20px rgba(15,23,42,.12);
  display:grid;grid-template-columns:1.1fr 1fr;overflow:hidden;
  position:relative;z-index:1;
}
.calc-left{padding:48px 44px;}
.calc-right{padding:48px 44px;background:linear-gradient(135deg,#0084FF 0%,#0066CC 50%,#005FBF 100%);color:#fff;position:relative;overflow:hidden;}
.calc-right::before{
  content:'';position:absolute;top:-100px;right:-100px;width:400px;height:400px;border-radius:50%;
  background:radial-gradient(ellipse,rgba(255,255,255,.15),transparent 60%);
  filter:blur(40px);pointer-events:none;
}
.calc-eyebrow{
  font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.18em;
  color:#0084FF;margin-bottom:16px;
}
.calc-title{
  font-size:32px;font-weight:500;color:#0f172a;letter-spacing:-.025em;line-height:1.1;
  margin-bottom:8px;
}
.calc-sub{font-size:15px;color:#64748b;margin-bottom:36px;line-height:1.5;}
.calc-input{margin-bottom:26px;}
.calc-label{
  display:flex;justify-content:space-between;align-items:center;gap:12px;
  font-size:13px;color:#475569;font-weight:500;margin-bottom:12px;
}
.calc-label strong{
  font-size:18px;font-weight:700;color:#0084FF;font-family:'Fustat',sans-serif;letter-spacing:-.02em;
}
.calc-slider{
  -webkit-appearance:none;appearance:none;
  width:100%;height:6px;border-radius:9999px;
  background:#E2E8F0;
  outline:none;
}
.calc-slider::-webkit-slider-thumb{
  -webkit-appearance:none;appearance:none;
  width:22px;height:22px;border-radius:50%;
  background:#fff;border:2px solid #0084FF;
  box-shadow:0 4px 12px rgba(0,132,255,.4);
  cursor:pointer;transition:all .15s;
}
.calc-slider::-webkit-slider-thumb:hover{transform:scale(1.1);}
.calc-slider::-moz-range-thumb{
  width:22px;height:22px;border-radius:50%;
  background:#fff;border:2px solid #0084FF;
  box-shadow:0 4px 12px rgba(0,132,255,.4);
  cursor:pointer;
}
.calc-right-label{
  font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.18em;
  color:rgba(255,255,255,.7);margin-bottom:16px;position:relative;
}
.calc-right h3{
  font-size:18px;font-weight:500;color:#fff;letter-spacing:-.01em;
  margin-bottom:8px;position:relative;
}
.calc-result{
  font-family:'Fustat',sans-serif;font-weight:700;
  font-size:64px;letter-spacing:-.04em;line-height:1;
  color:#fff;margin:18px 0 8px;position:relative;
}
.calc-result-sub{font-size:14px;color:rgba(255,255,255,.7);margin-bottom:28px;position:relative;}
.calc-right-cta{
  display:flex;align-items:center;justify-content:center;gap:10px;
  width:100%;padding:14px 22px;
  background:rgba(255,255,255,.95);
  color:#0084FF;
  border-radius:13px;font-size:14.5px;font-weight:600;
  box-shadow:0 8px 20px rgba(0,0,0,.15);
  transition:all .2s;position:relative;
}
.calc-right-cta:hover{transform:scale(1.02);background:#fff;}
.calc-breakdown{margin-top:28px;padding-top:24px;border-top:1px solid rgba(255,255,255,.15);position:relative;}
.calc-breakdown-label{
  font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.18em;
  color:rgba(255,255,255,.55);margin-bottom:14px;
}
.calc-break-row{
  display:flex;justify-content:space-between;align-items:center;
  padding:8px 0;font-size:13.5px;color:rgba(255,255,255,.85);
}
.calc-break-row strong{color:#fff;font-weight:600;}
.calc-break-row.tot{padding-top:14px;margin-top:6px;border-top:1px solid rgba(255,255,255,.15);font-weight:600;}
.calc-break-row.tot strong{font-size:18px;font-family:'Fustat',sans-serif;letter-spacing:-.02em;}

/* ─── FAQ ─── */
.faq-wrap{background:#F5F7FA;position:relative;}
.faq-grid{max-width:780px;margin:0 auto;display:flex;flex-direction:column;gap:12px;}
.faq-item{
  background:#fff;border:1px solid rgba(0,0,0,.06);border-radius:18px;
  overflow:hidden;
  transition:all .25s ease;
}
.faq-item:hover{border-color:rgba(0,132,255,.2);}
.faq-item.open{border-color:rgba(0,132,255,.3);box-shadow:0 8px 24px rgba(0,132,255,.08);}
.faq-q{
  width:100%;display:flex;align-items:center;justify-content:space-between;
  padding:22px 26px;font-size:16px;font-weight:600;color:#0f172a;
  text-align:left;letter-spacing:-.01em;
}
.faq-q-ic{
  width:32px;height:32px;border-radius:50%;
  background:#F1F5F9;color:#0084FF;
  display:flex;align-items:center;justify-content:center;
  transition:all .25s ease;
}
.faq-q-ic svg{width:14px;height:14px;transition:transform .3s ease;}
.faq-item.open .faq-q-ic{background:#0084FF;color:#fff;}
.faq-item.open .faq-q-ic svg{transform:rotate(45deg);}
.faq-a{max-height:0;overflow:hidden;transition:max-height .35s ease;}
.faq-item.open .faq-a{max-height:400px;}
.faq-a-in{padding:0 26px 24px;font-size:14.5px;color:#64748b;line-height:1.6;}

/* ─── CONTACT ─── */
.contact-wrap{
  background:#fff;position:relative;overflow:hidden;
  text-align:center;
}
.contact-glow{
  position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:1200px;height:600px;border-radius:50%;
  background:radial-gradient(ellipse,rgba(96,177,255,.15),transparent 60%);
  filter:blur(80px);pointer-events:none;
}
.contact-inner{max-width:640px;margin:0 auto;position:relative;z-index:1;}
.contact-phone{
  font-family:'Fustat',sans-serif;font-weight:700;
  font-size:60px;letter-spacing:-.03em;
  color:#0f172a;margin:32px 0 8px;line-height:1;
}
.contact-phone a:hover{color:#0084FF;}
.contact-hours{font-size:14px;color:#64748b;margin-bottom:28px;}
.contact-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;}

/* ─── FOOTER ─── */
.foot-wrap{
  background:#F5F7FA;position:relative;
  padding:48px 32px 32px;
  overflow:hidden;
}
.foot-card{
  max-width:1240px;margin:0 auto;
  background:rgba(255,255,255,.95);
  border:1px solid rgba(0,0,0,.06);
  border-radius:28px;
  overflow:hidden;
  backdrop-filter:blur(20px);
  box-shadow:0 30px 80px -20px rgba(15,23,42,.08);
}
.foot-top{
  display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:48px;
  padding:48px 48px 36px;
}
.foot-brand{display:flex;flex-direction:column;gap:14px;}
.foot-brand-row{display:flex;align-items:center;gap:12px;}
.foot-brand-mark{
  width:44px;height:44px;border-radius:12px;
  background:linear-gradient(135deg,#FF801E,#FF6B00);
  display:flex;align-items:center;justify-content:center;
  box-shadow:inset 0 -2px 4px rgba(0,0,0,.1),0 4px 12px rgba(255,128,30,.3);
}
.foot-brand-mark svg{width:24px;height:24px;color:#fff;}
.foot-brand-name{
  font-family:'Fustat',sans-serif;font-weight:800;
  font-size:28px;color:#0f172a;letter-spacing:-.04em;
}
.foot-brand p{font-size:14px;color:#64748b;line-height:1.55;max-width:320px;}
.foot-col h4{
  font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.14em;
  color:#0f172a;margin-bottom:18px;
}
.foot-col a{
  display:block;font-size:14px;color:#64748b;font-weight:500;
  padding:6px 0;transition:color .15s;
}
.foot-col a:hover{color:#FF801E;}
.foot-bot{
  display:flex;align-items:center;justify-content:space-between;gap:24px;
  padding:24px 48px;
  border-top:1px solid #F1F5F9;
  background:#fff;
}
.foot-copy{font-size:13px;color:#64748b;font-weight:500;}
.foot-copy a{color:#64748b;}
.foot-copy a:hover{color:#FF801E;}
.foot-social{display:flex;gap:8px;}
.foot-social a{
  width:40px;height:40px;border-radius:50%;
  border:1px solid #F1F5F9;
  display:flex;align-items:center;justify-content:center;
  color:#64748b;
  transition:all .3s;
}
.foot-social a:hover{background:#FF801E;border-color:#FF801E;color:#fff;}
.foot-social a svg{width:18px;height:18px;}

/* ─── Reveal animation ─── */
.reveal{opacity:0;transform:translateY(20px);transition:opacity .7s ease,transform .7s ease;}
.reveal.in{opacity:1;transform:none;}
.reveal-1{transition-delay:.05s;}
.reveal-2{transition-delay:.15s;}
.reveal-3{transition-delay:.25s;}
.reveal-4{transition-delay:.35s;}
.reveal-5{transition-delay:.45s;}

/* ─── Responsive (desktop-first, soft mobile fallback) ─── */
@media(max-width:1100px){
  .features-grid{grid-template-columns:repeat(2,1fr);}
  .feat-card-1,.feat-card-2{grid-column:span 2;}
  .feat-card-3,.feat-card-4,.feat-card-5{grid-column:span 1;}
  .calc-card{grid-template-columns:1fr;}
  .foot-top{grid-template-columns:1fr 1fr;gap:32px;}
}
@media(max-width:760px){
  .section{padding:80px 0;}
  .nav-links{display:none;}
  .features-grid{grid-template-columns:1fr;}
  .feat-card-1,.feat-card-2,.feat-card-3,.feat-card-4,.feat-card-5{grid-column:span 1;}
  .steps-grid{grid-template-columns:1fr;}
  .foot-top{grid-template-columns:1fr;padding:32px 28px;}
  .foot-bot{padding:20px 28px;flex-direction:column;align-items:flex-start;}
  .hero-form{flex-direction:column;}
  .hero-form input{width:100%;}
  .btn-primary{width:100%;justify-content:center;}
}
`;

/* ────────── Icons (inline SVG to avoid lucide RN incompatibility) ────────── */
const I = {
  arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l14 8-14 8V4z"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  spark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>`,
  doc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z"/></svg>`,
  chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  fb: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12z"/></svg>`,
  ig: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`,
  tw: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  yt: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
  s: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14.5 4h-5C7 4 5 6 5 8.5S7 13 9.5 13h5C16 13 17 14 17 15.5S16 18 14.5 18h-5C8 18 7 17 7 16h-2c0 2.5 2 4 4.5 4h5c2.5 0 4.5-2 4.5-4.5S17 11 14.5 11h-5C8 11 7 10 7 8.5S8 6 9.5 6h5C16 6 17 7 17 8h2c0-2-2-4-4.5-4z"/></svg>`,
};

/* ────────── HTML strings ────────── */

const NAV = `
<div class="nav-wrap">
  <nav class="nav" id="nav">
    <a class="nav-brand" data-action="top" href="#">
      <span class="nav-mark">S</span>
      <span>ShiftApp</span>
    </a>
    <div class="nav-links">
      <a href="#funkcje" data-action="scroll:funkcje">Funkcje</a>
      <a href="#kroki" data-action="scroll:kroki">Jak zacząć</a>
      <a href="#cennik" data-action="scroll:cennik">Cennik</a>
      <a href="#faq" data-action="scroll:faq">FAQ</a>
    </div>
    <a class="nav-cta" data-action="signup" href="#">Dołącz ${I.arrow}</a>
  </nav>
</div>`;

const HERO = `
<section class="hero">
  <div class="hero-bg">
    <div class="hero-glow-1"></div>
    <div class="hero-glow-2"></div>
    <div class="hero-glow-3"></div>
  </div>
  <div class="hero-inner">
    <div class="hero-badge reveal reveal-1">
      <span class="pill">EARLY ADOPTER</span>
      <span>Stworzona dla gastronomii · Premiera Q2 2026</span>
    </div>
    <h1 class="hero-h1 reveal reveal-2">
      Odzyskaj <span class="grad">13h tygodniowo</span><br/>
      i obniż koszty pracy o <span class="grad">1300 zł/mies.</span>
    </h1>
    <p class="hero-sub reveal reveal-3">
      Grafik AI, ewidencja czasu, zadania i szkolenia w jednej aplikacji.
      Stworzona dla gastronomii — koniec z chaosem w Excelu.
    </p>
    <form class="hero-form reveal reveal-4" id="hero-form">
      <input type="email" name="email" placeholder="Zapisz się do osób oczekujących i zgarnij zniżkę na 3 miesiące" required />
      <button class="btn-primary" type="submit">
        <span>Dalej</span>
        <span class="arrow">${I.arrow}</span>
      </button>
    </form>
    <div class="hero-meta reveal reveal-5">
      <div style="display:flex;align-items:center;gap:12px;">
        <div class="avatars"><span>A</span><span>M</span><span>K</span><span>T</span></div>
        <span class="hero-meta-text">Dołączyło już <strong style="color:#0f172a;">50 restauratorów</strong></span>
      </div>
      <a class="hero-demo" data-action="scroll:demo" href="#demo">
        <span class="play">${I.play}</span>
        <span>Obejrzyj prezentację</span>
        <span class="soon">Wkrótce</span>
      </a>
    </div>
  </div>
</section>`;

const FEATURES = `
<section class="features-wrap section" id="funkcje">
  <div class="features-glow"></div>
  <div class="c">
    <div class="sec-head reveal">
      <div class="eyebrow">Funkcje</div>
      <h2 class="h2">Wszystko czego <span class="grad">potrzebujesz</span></h2>
      <p class="lead lead-center">Jedna aplikacja zamiast pięciu. Grafik, zadania, dokumenty, szkolenia i gamifikacja.</p>
    </div>
    <div class="features-grid">
      <div class="feat-card feat-card-1 reveal reveal-1">
        <div class="fv">
          <div class="fv-sched">
            <div class="fv-sched-head"><span>Grafik zespołu</span><span class="week">Tydzień 14</span></div>
            <div class="fv-sched-grid">
              <div class="hd"></div><div class="hd">Pon</div><div class="hd">Wt</div><div class="hd">Śr</div><div class="hd">Czw</div><div class="hd">Pt</div><div class="hd">Sob</div><div class="hd">Nd</div>
              <div class="nm">Anna K.</div><div class="b">8-16</div><div class="b">8-16</div><div></div><div class="b">12-20</div><div class="b">12-20</div><div></div><div></div>
              <div class="nm">Marek W.</div><div></div><div class="g">14-22</div><div class="g">14-22</div><div></div><div class="g">14-22</div><div class="g">14-22</div><div></div>
              <div class="nm">Kasia P.</div><div class="o">8-16</div><div></div><div class="o">8-16</div><div class="o">8-16</div><div></div><div></div><div class="o">10-18</div>
              <div class="nm">Tomek S.</div><div></div><div></div><div class="p">18-02</div><div class="p">18-02</div><div></div><div class="p">18-02</div><div class="p">18-02</div>
            </div>
            <div class="fv-sched-ai">${I.spark}<span>AI: Kasia P. → Czw 8-16</span></div>
          </div>
        </div>
        <h3 class="feat-title">Grafik pracy AI</h3>
        <p class="feat-desc">Automatyczne tworzenie grafików z uwzględnieniem dostępności, preferencji i przepisów. Drag &amp; drop. Powiadomienia push.</p>
      </div>

      <div class="feat-card feat-card-2 reveal reveal-2">
        <div class="fv">
          <div class="fv-tasks">
            <div class="fv-tasks-head"><h5>Dzisiejsze zadania</h5><span class="pill">1/4</span></div>
            <div class="fv-task d"><span class="cb">${I.check}</span><span class="ttext">Czyszczenie ekspresu</span><span class="meta">Anna K. · 14:00</span></div>
            <div class="fv-task"><span class="cb"></span><span class="ttext">Uzupełnienie lodówki bar</span><span class="meta">Marek W. · 15:30</span></div>
            <div class="fv-task"><span class="cb"></span><span class="ttext">Zamknięcie kasy</span><span class="meta">Kasia P. · 22:00</span></div>
            <div class="fv-task"><span class="cb"></span><span class="ttext">Inwentaryzacja napojów</span><span class="meta">Tomek S. · 20:00</span></div>
          </div>
        </div>
        <h3 class="feat-title">Zadania dla pracowników</h3>
        <p class="feat-desc">Przydzielaj codzienne zadania z deadline, priorytetami i potwierdzeniem wykonania. Czyszczenie, inwentaryzacja, zamknięcie — wszystko pod kontrolą.</p>
      </div>

      <div class="feat-card feat-card-3 reveal reveal-1">
        <div class="fv">
          <div class="fv-time">
            <div class="fv-time-ring"><span>74%</span></div>
            <div class="fv-time-label">obecność dziś</div>
            <div class="fv-time-row">
              <div class="fv-time-cell"><strong>168h</strong><em>w tym tyg.</em></div>
              <div class="fv-time-cell"><strong>12h</strong><em>nadgodziny</em></div>
            </div>
          </div>
        </div>
        <h3 class="feat-title">Ewidencja czasu</h3>
        <p class="feat-desc">Rejestracja wejść/wyjść (GPS/QR), liczenie godzinówki, nadgodziny, raporty dla księgowości. Wszystko automatycznie.</p>
      </div>

      <div class="feat-card feat-card-4 reveal reveal-2">
        <div class="fv">
          <div class="fv-board">
            <div class="fv-board-row"><span class="medal">🏆</span><span class="av a1">A</span><span class="nm">Anna K.</span><span class="pts">1 240 pkt</span></div>
            <div class="fv-board-row"><span class="medal">🥈</span><span class="av a2">M</span><span class="nm">Marek W.</span><span class="pts">980 pkt</span></div>
            <div class="fv-board-row"><span class="medal">🥉</span><span class="av a3">K</span><span class="nm">Karolina B.</span><span class="pts">760 pkt</span></div>
          </div>
        </div>
        <h3 class="feat-title">Szkolenia &amp; Gamifikacja</h3>
        <p class="feat-desc">Wewnętrzne szkolenia video, quizy, certyfikaty. System punktowy, ranking i nagrody motywujące zespół.</p>
      </div>

      <div class="feat-card feat-card-5 reveal reveal-3">
        <div class="fv">
          <div class="fv-docs">
            <div class="fv-doc"><span class="ic">${I.doc}</span><span class="nm">Umowa zlecenie — Jan K.</span><span class="tag">umowa</span></div>
            <div class="fv-doc"><span class="ic">${I.doc}</span><span class="nm">Badania lekarskie — Anna M.</span><span class="tag green">badania</span></div>
            <div class="fv-doc"><span class="ic">${I.doc}</span><span class="nm">Certyfikat BHP — Tomek W.</span><span class="tag orange">cert</span></div>
            <div class="fv-doc-ai">${I.spark}<span>Auto-generowanie umowy</span></div>
          </div>
        </div>
        <h3 class="feat-title">Dokumenty</h3>
        <p class="feat-desc">Cyfrowa teczka pracownika: umowy, badania, certyfikaty. Automatyczne generowanie dokumentów i przypomnienia o terminach.</p>
      </div>
    </div>
  </div>
</section>`;

const STEPS = `
<section class="steps-wrap section" id="kroki">
  <div class="steps-glow"></div>
  <div class="c">
    <div class="sec-head reveal">
      <div class="eyebrow-blue">Jak zacząć</div>
      <h2 class="h2">3 proste <span class="grad">kroki</span></h2>
      <p class="lead lead-center">Od rejestracji do pełnej kontroli nad zespołem w mniej niż 15 minut.</p>
    </div>
    <div class="steps-grid">
      <div class="step-card reveal reveal-1">
        <div class="step-num">01</div>
        <div class="step-label">Krok 1</div>
        <h3 class="step-title">Zarejestruj restaurację</h3>
        <p class="step-desc">Załóż konto, dodaj lokalizację i zaproś swój zespół jednym linkiem.</p>
      </div>
      <div class="step-card reveal reveal-2">
        <div class="step-num">02</div>
        <div class="step-label">Krok 2</div>
        <h3 class="step-title">Skonfiguruj grafik</h3>
        <p class="step-desc">AI utworzy optymalny grafik na podstawie dostępności i preferencji pracowników.</p>
      </div>
      <div class="step-card reveal reveal-3">
        <div class="step-num">03</div>
        <div class="step-label">Krok 3</div>
        <h3 class="step-title">Zarządzaj z telefonu</h3>
        <p class="step-desc">Zadania, dokumenty, szkolenia. Wszystko w jednym miejscu. Twój zespół wie co, kiedy i jak.</p>
      </div>
    </div>
  </div>
</section>`;

const DEMO = `
<section class="demo-wrap section" id="demo">
  <div class="c">
    <div class="demo-card reveal">
      <div class="demo-content">
        <div class="demo-eyebrow">Prezentacja</div>
        <h2>Zobacz ShiftApp <br/>w akcji</h2>
        <p>Krótka prezentacja pokazująca, jak ShiftApp rewolucjonizuje zarządzanie zespołem.</p>
        <a class="demo-cta" data-action="signup" href="#">
          <span>Dołącz do Whitelisty</span>
          ${I.arrow}
        </a>
      </div>
    </div>
  </div>
</section>`;

const PRICING = `
<section class="price-wrap section" id="cennik">
  <div class="price-glow"></div>
  <div class="c">
    <div class="sec-head reveal">
      <div class="eyebrow">Cennik</div>
      <h2 class="h2">Prosty i <span class="grad">przejrzysty</span></h2>
      <p class="lead lead-center">Płacisz za lokal + liczbę pracowników. Bez ukrytych opłat.</p>
    </div>
    <div class="price-card-wrap reveal">
      <div class="price-card">
        <div class="price-badge">EARLY ADOPTER</div>
        <div class="price-amount">
          <strong>99 zł</strong>
          <em>/ mies. bazowa</em>
        </div>
        <div class="price-small">do 5 pracowników w cenie</div>
        <div class="price-add">+ 19 zł / dodatkowy pracownik / mies.</div>
        <div class="price-promo">🔥 Pierwsze 20 restauracji: −50% przez 3 miesiące</div>
        <div class="price-feats">
          <div class="price-feat"><span class="ok">${I.check}</span>Grafik pracy z AI</div>
          <div class="price-feat"><span class="ok">${I.check}</span>Ewidencja czasu (GPS/QR)</div>
          <div class="price-feat"><span class="ok">${I.check}</span>Zadania z deadline i zdjęciami</div>
          <div class="price-feat"><span class="ok">${I.check}</span>Dokumenty pracownika</div>
          <div class="price-feat"><span class="ok">${I.check}</span>Powiadomienia push + SMS</div>
          <div class="price-feat"><span class="ok">${I.check}</span>Panel web dla właściciela</div>
          <div class="price-feat"><span class="ok">${I.check}</span>Aplikacja mobilna dla pracowników</div>
        </div>
        <a class="price-cta" data-action="signup" href="#">
          <span>Zapisz się na Whitelistę</span>
          ${I.arrow}
        </a>
      </div>
    </div>
  </div>
</section>`;

const CALC = `
<section class="calc-wrap section">
  <div class="calc-glow"></div>
  <div class="c">
    <div class="sec-head reveal">
      <div class="eyebrow-blue">Kalkulator</div>
      <h2 class="h2">Ile jest dla Ciebie wart <span class="grad">Twój czas?</span></h2>
      <p class="lead lead-center">Sprawdź, ile oszczędzisz z ShiftApp każdego miesiąca.</p>
    </div>
    <div class="calc-card reveal">
      <div class="calc-left">
        <div class="calc-input">
          <div class="calc-label">
            <span>Godziny poświęcone tygodniowo na układanie grafików, urlopów i ewidencję czasu pracy</span>
            <strong><span id="c-h">5</span> godz.</strong>
          </div>
          <input type="range" min="1" max="40" value="5" class="calc-slider" id="c-hi"/>
        </div>
        <div class="calc-input">
          <div class="calc-label">
            <span>Ile jest dla Ciebie warta godzina Twojego czasu?</span>
            <strong><span id="c-r">70</span> zł / godz.</strong>
          </div>
          <input type="range" min="20" max="500" value="70" class="calc-slider" id="c-ri"/>
        </div>
        <div class="calc-input">
          <div class="calc-label">
            <span>Liczba pracowników</span>
            <strong><span id="c-e">5</span></strong>
          </div>
          <input type="range" min="1" max="100" value="5" class="calc-slider" id="c-ei"/>
        </div>
      </div>
      <div class="calc-right">
        <div class="calc-right-label">Miesięczny zysk z ShiftApp</div>
        <div class="calc-result"><span id="c-net">1 301</span> zł</div>
        <div class="calc-result-sub">albo <span id="c-time">19</span> Twojego czasu</div>
        <a class="calc-right-cta" data-action="signup" href="#">
          <span>Zapisz się na Whitelistę</span>
          ${I.arrow}
        </a>
        <div class="calc-breakdown">
          <div class="calc-breakdown-label">Jak to policzyliśmy?</div>
          <div class="calc-break-row"><span>Poświęcone godziny miesięcznie</span><strong><span id="c-mh">20</span> godz.</strong></div>
          <div class="calc-break-row"><span>Wartość powyższych godzin</span><strong><span id="c-v">1 400</span> zł</strong></div>
          <div class="calc-break-row"><span>Koszt ShiftApp (<span id="c-e2">5</span> pracowników)</span><strong><span id="c-c">99</span> zł</strong></div>
          <div class="calc-break-row tot"><span>Zysk z inwestycji na miesiąc</span><strong><span id="c-net2">1 301</span> zł</strong></div>
        </div>
      </div>
    </div>
  </div>
</section>`;

const FAQ = `
<section class="faq-wrap section" id="faq">
  <div class="c">
    <div class="sec-head reveal">
      <div class="eyebrow">FAQ</div>
      <h2 class="h2">Najczęściej <span class="grad">zadawane pytania</span></h2>
    </div>
    <div class="faq-grid">
      <div class="faq-item reveal reveal-1" data-faq>
        <button class="faq-q"><span>Dla kogo jest ShiftApp?</span><span class="faq-q-ic">${I.plus}</span></button>
        <div class="faq-a"><div class="faq-a-in">Dla restauracji, kawiarni i food trucków zatrudniających od 3 do 100 pracowników. Idealny tam, gdzie grafiki powstają w Excelu lub na kartce.</div></div>
      </div>
      <div class="faq-item reveal reveal-2" data-faq>
        <button class="faq-q"><span>Na jakich platformach działa?</span><span class="faq-q-ic">${I.plus}</span></button>
        <div class="faq-a"><div class="faq-a-in">Panel właściciela w przeglądarce (Chrome, Safari, Firefox). Pracownicy korzystają z aplikacji mobilnej na iOS i Android. Wszystko synchronizuje się w czasie rzeczywistym.</div></div>
      </div>
      <div class="faq-item reveal reveal-3" data-faq>
        <button class="faq-q"><span>Ile kosztuje ShiftApp?</span><span class="faq-q-ic">${I.plus}</span></button>
        <div class="faq-a"><div class="faq-a-in">99 zł / mies. za lokal (do 5 pracowników w cenie). Każdy dodatkowy pracownik to 19 zł / mies. Pierwsze 20 restauracji z whitelisty dostaje 50% zniżki na 3 miesiące.</div></div>
      </div>
      <div class="faq-item reveal reveal-4" data-faq>
        <button class="faq-q"><span>Kiedy startuje aplikacja?</span><span class="faq-q-ic">${I.plus}</span></button>
        <div class="faq-a"><div class="faq-a-in">Aplikacja startuje w Q2 2026. Osoby z whitelisty otrzymają wcześniejszy dostęp i specjalne warunki cenowe.</div></div>
      </div>
      <div class="faq-item reveal reveal-5" data-faq>
        <button class="faq-q"><span>Czym ShiftApp różni się od Kadromierza?</span><span class="faq-q-ic">${I.plus}</span></button>
        <div class="faq-a"><div class="faq-a-in">ShiftApp jest stworzony specjalnie dla gastronomii. Mamy AI tworzące grafiki, zadania z potwierdzeniem zdjęciem, gamifikację i teczkę dokumentów. Kadromierz to ogólne HR — my idziemy głębiej w specyfikę restauracji.</div></div>
      </div>
    </div>
  </div>
</section>`;

const CONTACT = `
<section class="contact-wrap section">
  <div class="contact-glow"></div>
  <div class="c">
    <div class="contact-inner reveal">
      <div class="eyebrow-blue">Kontakt</div>
      <h2 class="h2">Porozmawiajmy</h2>
      <p class="lead lead-center">Chcesz dowiedzieć się więcej? Zadzwoń lub napisz — odpowiemy od razu.</p>
      <div class="contact-phone"><a href="tel:+48884184352">884 184 352</a></div>
      <div class="contact-hours">Pon – Pt, 9:00 – 18:00</div>
      <div class="contact-actions">
        <a class="btn-primary" href="tel:+48884184352">
          ${I.phone}<span>Zadzwoń</span>
        </a>
        <a class="btn-ghost" href="https://wa.me/48884184352" target="_blank" rel="noopener">
          ${I.chat}<span>WhatsApp</span>
        </a>
      </div>
    </div>
  </div>
</section>`;

const FOOT = `
<footer class="foot-wrap">
  <div class="foot-card reveal">
    <div class="foot-top">
      <div class="foot-brand">
        <div class="foot-brand-row">
          <div class="foot-brand-mark">${I.s}</div>
          <div class="foot-brand-name">ShiftApp</div>
        </div>
        <p>Aplikacja do zarządzania zespołem dla gastronomii. Grafik AI, zadania, ewidencja, dokumenty i szkolenia w jednym.</p>
      </div>
      <div class="foot-col">
        <h4>Produkt</h4>
        <a href="#funkcje" data-action="scroll:funkcje">Funkcje</a>
        <a href="#cennik" data-action="scroll:cennik">Cennik</a>
        <a href="#demo" data-action="scroll:demo">Prezentacja</a>
        <a href="#" data-action="signup">Whitelista</a>
      </div>
      <div class="foot-col">
        <h4>Firma</h4>
        <a href="#">O nas</a>
        <a href="#faq" data-action="scroll:faq">FAQ</a>
        <a href="tel:+48884184352">Kontakt</a>
        <a href="#">Blog</a>
      </div>
      <div class="foot-col">
        <h4>Prawne</h4>
        <a href="#">Polityka prywatności</a>
        <a href="#">Regulamin</a>
        <a href="#">RODO</a>
        <a href="#">Cookies</a>
      </div>
    </div>
    <div class="foot-bot">
      <div class="foot-copy">
        <span>© 2026 ShiftApp. Wszystkie prawa zastrzeżone. · </span>
        <a href="tel:+48884184352">Kontakt: 884-184-352</a>
      </div>
      <div class="foot-social">
        <a href="#" aria-label="Facebook">${I.fb}</a>
        <a href="#" aria-label="Twitter">${I.tw}</a>
        <a href="#" aria-label="Instagram">${I.ig}</a>
        <a href="#" aria-label="YouTube">${I.yt}</a>
      </div>
    </div>
  </div>
</footer>`;

const HTML = `${NAV}${HERO}${FEATURES}${STEPS}${DEMO}${PRICING}${CALC}${FAQ}${CONTACT}${FOOT}`;

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

    // hide existing app
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
      ho: html.style.overflow, hh: html.style.height, hw: html.style.width,
      bo: body.style.overflow, bh: body.style.height, bw: body.style.width,
      bm: body.style.margin, bp: body.style.padding, bg: body.style.background,
      bd: body.style.display,
    };
    html.style.overflow = 'auto'; html.style.height = 'auto'; html.style.width = '100%';
    body.style.overflow = 'auto'; body.style.height = 'auto'; body.style.width = '100%';
    body.style.margin = '0'; body.style.padding = '0'; body.style.background = '#ffffff';
    body.style.display = 'block';

    /* FAQ accordion */
    const handleFaq = (e: Event) => {
      const item = (e.target as HTMLElement).closest?.('[data-faq]') as HTMLElement | null;
      if (!item) return;
      const open = item.classList.contains('open');
      portal.querySelectorAll('.faq-item').forEach((el) => el.classList.remove('open'));
      if (!open) item.classList.add('open');
    };
    portal.addEventListener('click', handleFaq);

    /* Action delegation */
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

    /* Form submit → join */
    const handleSubmit = (e: Event) => {
      const form = (e.target as HTMLElement).closest?.('form');
      if (!form) return;
      e.preventDefault();
      router.push('/join');
    };
    portal.addEventListener('submit', handleSubmit);

    /* Calculator */
    const hi = portal.querySelector('#c-hi') as HTMLInputElement | null;
    const ri = portal.querySelector('#c-ri') as HTMLInputElement | null;
    const ei = portal.querySelector('#c-ei') as HTMLInputElement | null;
    const fmt = (n: number) => n.toLocaleString('pl-PL').replace(/,/g, ' ');
    const recompute = () => {
      if (!hi || !ri || !ei) return;
      const h = parseInt(hi.value, 10);
      const r = parseInt(ri.value, 10);
      const emp = parseInt(ei.value, 10);
      const mh = h * 4;
      const val = mh * r;
      const cost = 99 + Math.max(0, emp - 5) * 19;
      const net = Math.max(0, val - cost);
      const time = r > 0 ? Math.round(net / r) : 0;
      const set = (id: string, v: string) => { const el = portal.querySelector('#' + id); if (el) el.textContent = v; };
      set('c-h', String(h));
      set('c-r', String(r));
      set('c-e', String(emp));
      set('c-e2', String(emp));
      set('c-mh', String(mh));
      set('c-v', fmt(val));
      set('c-c', fmt(cost));
      set('c-net', fmt(net));
      set('c-net2', fmt(net));
      set('c-time', `${time} godz.`);
    };
    hi?.addEventListener('input', recompute);
    ri?.addEventListener('input', recompute);
    ei?.addEventListener('input', recompute);
    recompute();

    /* Nav scroll shadow */
    const nav = portal.querySelector('.nav') as HTMLElement | null;
    const handleScroll = () => {
      if (!nav) return;
      if (window.scrollY > 30) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    /* Reveal on scroll */
    const reveals = Array.from(portal.querySelectorAll('.reveal')) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );
    reveals.forEach((el) => io.observe(el));

    return () => {
      portal.removeEventListener('click', handleFaq);
      portal.removeEventListener('click', handleClick);
      portal.removeEventListener('submit', handleSubmit);
      hi?.removeEventListener('input', recompute);
      ri?.removeEventListener('input', recompute);
      ei?.removeEventListener('input', recompute);
      window.removeEventListener('scroll', handleScroll);
      io.disconnect();
      portal.remove();
      hidden.forEach(({ el, d }) => { el.style.display = d; });
      html.style.overflow = orig.ho; html.style.height = orig.hh; html.style.width = orig.hw;
      body.style.overflow = orig.bo; body.style.height = orig.bh; body.style.width = orig.bw;
      body.style.margin = orig.bm; body.style.padding = orig.bp; body.style.background = orig.bg;
      body.style.display = orig.bd;
    };
  }, [router]);

  return null;
}
