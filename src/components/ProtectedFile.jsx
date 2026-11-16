import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { api } from '../lib/api.js';

// Backend returns /api/uploads/... and /api/drivers/... while Axios baseURL already ends in /api.
// Strip only that prefix to avoid requests to /api/api/....
export default function ProtectedFile({ path, label = 'View private document' }) {
  const [error, setError] = useState('');
  async function view() {
    if (typeof path !== 'string' || !path.startsWith('/api/')) {
      setError('Invalid document link');
      return;
    }
    try {
      setError('');
      const response = await api.get(path.slice(4), { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const popup = window.open(url, '_blank', 'noopener,noreferrer');
      if (!popup) {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.download = 'driver-document';
        anchor.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setError('Could not open private document');
    }
  }
  return <>
    <button className="link-button" type="button" onClick={view}><ExternalLink size={14}/> {label}</button>
    {error && <small className="muted">{error}</small>}
  </>;
}
