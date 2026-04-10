import { useState, useEffect, useRef } from 'react';

export default function UniversitySearch({ value, onChange, required }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(!!value);
  const ref = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (value) { setQuery(value); setSelected(true); }
  }, [value]);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const doSearch = (q) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`http://universities.hipolabs.com/search?name=${encodeURIComponent(q)}`);
        const data = await res.json();
        const unique = [...new Map(data.map(u => [u.name, u])).values()];
        setResults(unique.slice(0, 6));
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    setSelected(false);
    onChange('');
    doSearch(val);
  };

  const handleSelect = (name) => {
    setQuery(name);
    setSelected(true);
    onChange(name);
    setOpen(false);
    setResults([]);
  };

  return (
    <div ref={ref} className="uni-search">
      <div className="uni-search-input-wrap">
        <svg className="uni-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          className="form-control"
          style={{ paddingLeft: 36 }}
          placeholder="Search for your university..."
          value={query}
          onChange={handleInput}
          onFocus={() => results.length > 0 && !selected && setOpen(true)}
          required={required}
        />
        {loading && <span className="uni-search-spinner" />}
        {selected && <span className="uni-search-check">✓</span>}
      </div>
      {!selected && query.length >= 2 && !loading && results.length === 0 && (
        <div className="uni-search-hint">No results found. Keep typing...</div>
      )}
      {!selected && query.length > 0 && query.length < 2 && (
        <div className="uni-search-hint">Type at least 2 characters</div>
      )}
      {open && results.length > 0 && (
        <div className="uni-search-dropdown">
          {results.map((u, i) => (
            <div key={i} className="uni-search-option" onClick={() => handleSelect(u.name)}>
              <div className="uni-search-option-name">{u.name}</div>
              <div className="uni-search-option-country">{u.country}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
