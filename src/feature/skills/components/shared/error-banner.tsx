export function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{
      background: "rgba(226,61,45,0.1)",
      border: "1px solid rgba(226,61,45,0.3)",
      borderRadius: 8,
      padding: "10px 14px",
      marginBottom: 16,
      fontSize: 13,
      color: "#E23D2D",
    }}>
      {message}
    </div>
  );
}
