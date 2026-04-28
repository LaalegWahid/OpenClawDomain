export function OverviewStyles() {
  return (
    <style>{`
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes shimmer { 0% { background-position: -600px 0; } 100% { background-position: 600px 0; } }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    `}</style>
  );
}
