import React, { useEffect, useState } from 'react';

export default function LegacyImportStatusTestView() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/user/legacy-import-status')
      .then((res) => res.json())
      .then(setData)
      .catch((e) => setError(e.message || 'Error fetching status'));
  }, []);

  return (
    <div style={{ padding: 32, background: '#181a20', color: '#fff', fontFamily: 'monospace' }}>
      <h2>Legacy Import Status API Test</h2>
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}
      <pre style={{ background: '#222', padding: 16, borderRadius: 8 }}>
        {data ? JSON.stringify(data, null, 2) : 'Loading...'}
      </pre>
    </div>
  );
}
