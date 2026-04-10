import { RegisterForm } from "../../feature/auth/components/register-form";

export default function RegisterPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--background)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      position: 'relative',
    }}>
      {/* Subtle radial glow */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px',
        height: '400px',
        background: 'radial-gradient(ellipse, rgba(255,77,0,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Form card */}
      <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
        <RegisterForm />
      </div>
    </div>
  );
}