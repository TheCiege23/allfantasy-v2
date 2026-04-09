export default function Custom500() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>Something went wrong</h1>
        <p style={{ color: '#666', maxWidth: '32rem' }}>
          The app hit an unexpected server error. Please try again in a moment.
        </p>
      </div>
    </main>
  )
}
