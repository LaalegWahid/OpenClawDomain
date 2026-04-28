export function SkillsStyles() {
  return (
    <style>{`
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes shimmer { 0% { background-position: -600px 0; } 100% { background-position: 600px 0; } }
    `}</style>
  );
}
