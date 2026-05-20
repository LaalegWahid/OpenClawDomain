import { ACCENT, ACCENT_GLOW } from "./constants";

export function AdminStyles() {
  return (
    <style>{`
      @keyframes oc-fade-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      @keyframes oc-shimmer { 0%{opacity:0.45} 50%{opacity:0.8} 100%{opacity:0.45} }
      .oc-page-section { animation: oc-fade-up 0.5s ease both; }
      .oc-skeleton { background: rgba(42,31,25,0.07); border-radius: 8px; animation: oc-shimmer 1.4s ease-in-out infinite; }
      .oc-card { transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
      .oc-stat:hover { transform: translateY(-2px); border-color: rgba(255,77,0,0.35); }
      .oc-btn-primary { transition: transform 0.18s ease, box-shadow 0.18s ease; }
      .oc-btn-primary:hover { transform: translateY(-1px); box-shadow: ${ACCENT_GLOW}; }
      .oc-row:hover { background: rgba(42,31,25,0.03); }
      .oc-agent-link { transition: border-color 0.15s ease, color 0.15s ease; }
      a:hover .oc-agent-link { border-bottom-color: ${ACCENT}; color: ${ACCENT}; }
    `}</style>
  );
}
