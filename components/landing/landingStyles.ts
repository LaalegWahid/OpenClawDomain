export const landingStyles = `
  @keyframes floatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
  @keyframes heroFadeUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
  @keyframes heroFadeIn { from{opacity:0} to{opacity:1} }
  @keyframes slideInLeft { from{opacity:0;transform:translateX(-40px)} to{opacity:1;transform:translateX(0)} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes scaleIn { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
  @keyframes glowPulse { 0%,100%{box-shadow:0 0 20px rgba(255,77,0,0.08)} 50%{box-shadow:0 0 40px rgba(255,77,0,0.2)} }
  @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes driftRotate { 0%{transform:rotate(var(--r)) scale(1)} 50%{transform:rotate(calc(var(--r) + 8deg)) scale(1.04)} 100%{transform:rotate(var(--r)) scale(1)} }

  .oc-claw-drift { animation: driftRotate 12s ease-in-out infinite; }
  .oc-pricing-card { transition:transform 0.3s ease,box-shadow 0.3s ease; }
  .oc-pricing-card:hover { transform:translateY(-5px); box-shadow:0 12px 40px rgba(255,77,0,0.1); }
  .oc-faq-item { transition:background 0.2s ease,border-color 0.2s ease; }
  .oc-cta-btn { animation: glowPulse 3s ease-in-out infinite; }
  .oc-section-heading {
    animation: fadeUp 0.5s ease both;
    animation-timeline: view();
    animation-range: entry 0% entry 25%;
  }
  .oc-shimmer {
    background:linear-gradient(90deg,#FF4D00 0%,#FF8C42 40%,#FFB88C 50%,#FF8C42 60%,#FF4D00 100%);
    background-size:200% 100%;
    -webkit-background-clip:text;
    background-clip:text;
    -webkit-text-fill-color:transparent;
    animation:shimmer 4s ease-in-out infinite;
  }
  .oc-hero-btns button:first-child { transition:transform 0.2s ease,box-shadow 0.2s ease; }
  .oc-hero-btns button:first-child:hover { transform:translateY(-2px); box-shadow:0 8px 25px rgba(255,77,0,0.3); }
  .oc-hero-btns button:last-child { transition:transform 0.2s ease,border-color 0.2s ease; }
  .oc-hero-btns button:last-child:hover { transform:translateY(-2px); border-color:rgba(255,77,0,0.4) !important; color:#2a1f19 !important; }

  * { box-sizing:border-box; }
  h1 { font-family:var(--serif); font-weight:600; font-style:normal; }
  h2 { font-family:var(--serif); font-weight:600; font-style:normal; }
  h1 em, h2 em { font-style:italic; font-weight:inherit; }
  .oc-shimmer { font-style:italic; }

  .oc-grid-2     { display:grid; grid-template-columns:1fr 1fr; gap:3rem; align-items:center; }
  .oc-grid-3     { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
  .oc-grid-4     { display:grid; grid-template-columns:repeat(4,1fr); gap:20px; }
  .oc-grid-skills   { display:grid; grid-template-columns:repeat(2,1fr); gap:16px; }
  .oc-grid-pricing  { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
  .oc-grid-footer   { display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:2rem; }
  .oc-nav-links     { display:flex; gap:2rem; }
  .oc-hamburger     { display:none !important; }
  .oc-footer-bottom { display:flex; align-items:center; justify-content:space-between; }
  .oc-hero-btns     { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }

  @media(max-width:900px){
    .oc-grid-3{grid-template-columns:1fr 1fr;}
    .oc-grid-4{grid-template-columns:1fr 1fr;}
    .oc-grid-pricing{grid-template-columns:1fr;}
    .oc-grid-footer{grid-template-columns:1fr 1fr;}
    .oc-hero-claw img { width:130px !important; opacity:0.22 !important; }
    .oc-hero-claw img:nth-child(3n) { display:none !important; }
  }
  @media(max-width:640px){
    .oc-grid-3{grid-template-columns:1fr;}
    .oc-grid-skills{grid-template-columns:1fr;}
    .oc-grid-2{grid-template-columns:1fr;gap:2.5rem;}
    .oc-grid-4{grid-template-columns:1fr 1fr;}
    .oc-nav-links{display:none;}
    .oc-hamburger{display:flex !important;}
    .oc-hero-btns{flex-direction:column;align-items:center;}
    .oc-footer-bottom{flex-direction:column;gap:1rem;text-align:center;}
    .oc-grid-footer{grid-template-columns:1fr 1fr;}
    .oc-hero-claw img { width:90px !important; opacity:0.18 !important; }
    .oc-hero-claw img:nth-child(even) { display:none !important; }
  }
`
