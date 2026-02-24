export default function Forbidden() {
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
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Forbidden</h1>
      <p style={{ color: '#a1a1aa' }}>
        You don&apos;t have access to this resource.
      </p>
    </div>
  );
}
