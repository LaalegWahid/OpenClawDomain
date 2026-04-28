export function LogsStyles() {
  return (
    <style>{`
      @keyframes oc-fade-up { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      @keyframes oc-spin { to { transform: rotate(360deg); } }
      .oc-logs-fade { animation: oc-fade-up 0.4s ease both; }
      .oc-log-row:hover { background: rgba(255,255,255,0.02); }
    `}</style>
  );
}
