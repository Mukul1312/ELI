export default function Unauthorized() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Unauthorized</h1>
      <p style={{ color: '#a1a1aa', marginBottom: 24 }}>
        Please log in to continue.
      </p>
      <a
        href="/auth/sign-in"
        style={{
          padding: '10px 20px',
          background: '#3b82f6',
          color: 'white',
          borderRadius: 8,
          textDecoration: 'none',
        }}
      >
        Sign in
      </a>
    </div>
  );
}
