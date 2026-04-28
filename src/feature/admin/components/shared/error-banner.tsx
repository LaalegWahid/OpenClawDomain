import { DANGER } from "./constants";

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      style={{
        marginBottom: 10,
        fontSize: 12,
        color: DANGER,
        background: "rgba(200,52,38,0.08)",
        border: "1px solid rgba(200,52,38,0.25)",
        borderRadius: 8,
        padding: "6px 10px",
      }}
    >
      {message}
    </div>
  );
}
