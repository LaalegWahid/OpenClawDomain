import { ACCENT, mono } from "./constants";

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{ background: "rgba(255,77,0,0.06)", border: "1px solid rgba(255,77,0,0.25)", borderRadius: "8px", padding: "10px 14px", fontFamily: mono, fontSize: "12px", color: ACCENT }}>
      {message}
    </div>
  );
}
