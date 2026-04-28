export function AuthStyles() {
  return (
    <style>{`
      @keyframes spin { to { transform: rotate(360deg); } }
      .oc-google-btn:hover:not(:disabled) {
        transform: translateY(-1px);
        background: rgba(42,31,25,0.06) !important;
        border-color: rgba(255,77,0,0.30) !important;
        box-shadow: 0 6px 18px rgba(42,31,25,0.06);
      }
      .oc-google-btn:active:not(:disabled) { transform: translateY(0); }
    `}</style>
  );
}
