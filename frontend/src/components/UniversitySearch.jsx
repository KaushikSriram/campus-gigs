import { useState, useEffect, useRef } from 'react';

export default function UniversitySearch({ value, onChange, required }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (query.length < 3) { setResults([]); return; }
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://universities.hipolabs.com/search?name=${encodeURIComponent(query)}`);
        const data = await res.json();
        const unique = [...new Map(data.map(u => [u.name, u])).values()];
        setResults(unique.slice(0, 8));
        setOpen(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelect = (name) => {
    setQuery(name);
    onChange(name);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        type="text"
        className="form-control"
        placeholder="Start typing your university..."
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); }}
        onFocus={() => results.length > 0 && setOpen(true)}
        required={required}
      />
      {loading && <div style={{ position: 'absolute', right: 12, top: 10, fontSize: '0.75rem', color: 'var(--text-muted)' }}>searching...</div>}
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-lg)', maxHeight: 220, overflowY: 'auto', marginTop: 4,
        }}>
          {results.map((u, i) => (
            <div
              key={i}
              onClick={() => handleSelect(u.name)}
              style={{
                padding: '8px 12px', cursor: 'pointer', fontSize: '0.85rem',
                borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
              }}
              onMouseEnter={e => e.target.style.background = 'var(--bg)'}
              onMouseLeave={e => e.target.style.background = 'white'}
            >
              <div style={{ fontWeight: 500 }}>{u.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.country}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
