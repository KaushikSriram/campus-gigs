import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ChevronDown, ArrowRight, Search, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UNIVERSITIES } from '../data/universities';

export default function Welcome() {
  const [selected, setSelected] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [customSchool, setCustomSchool] = useState('');
  const { setUniversity } = useAuth();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search when dropdown opens
  useEffect(() => {
    if (showDropdown && searchRef.current) {
      searchRef.current.focus();
    }
  }, [showDropdown]);

  const filtered = UNIVERSITIES.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.domain.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (uni) => {
    setSelected(uni.name);
    setShowDropdown(false);
    setSearch('');
    setCustomMode(false);
  };

  const handleCustomSubmit = () => {
    if (customSchool.trim()) {
      setSelected(customSchool.trim());
      setCustomMode(false);
      setShowDropdown(false);
    }
  };

  const handleContinue = () => {
    if (selected) {
      setUniversity(selected);
      navigate('/');
    }
  };

  return (
    <div className="welcome-page">
      <div className="welcome-content">
        <div className="welcome-header">
          <h1 className="welcome-logo">
            Campus<span>Gig</span>
          </h1>
          <p className="welcome-tagline">
            The student marketplace for campus tasks
          </p>
        </div>

        <div className="welcome-features">
          <div className="feature-item">
            <span className="feature-icon">📋</span>
            <span>Post tasks you need help with</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">💵</span>
            <span>Earn money helping other students</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🎓</span>
            <span>Verified students only</span>
          </div>
        </div>

        <div className="welcome-select">
          <label>Select your university</label>
          <div className="university-dropdown" ref={dropdownRef}>
            <button 
              className="dropdown-trigger"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <MapPin size={16} style={{ color: 'var(--text-tertiary)' }} />
              <span style={{ color: selected ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                {selected || 'Choose your school'}
              </span>
              <ChevronDown size={16} className={showDropdown ? 'rotated' : ''} />
            </button>
            
            {showDropdown && (
              <div className="dropdown-menu">
                {!customMode ? (
                  <>
                    <div style={{ position: 'relative' }}>
                      <Search size={16} style={{ 
                        position: 'absolute', 
                        left: 14, 
                        top: '50%', 
                        transform: 'translateY(-50%)',
                        color: 'var(--text-tertiary)',
                      }} />
                      <input
                        ref={searchRef}
                        type="text"
                        placeholder="Search 200+ universities..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ paddingLeft: 40 }}
                      />
                    </div>
                    <div className="dropdown-list">
                      {filtered.slice(0, 50).map(uni => (
                        <button
                          key={uni.domain}
                          className={`dropdown-item ${selected === uni.name ? 'selected' : ''}`}
                          onClick={() => handleSelect(uni)}
                        >
                          <span>{uni.name}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                            {uni.domain}
                          </span>
                        </button>
                      ))}
                      {filtered.length === 0 && search && (
                        <div className="dropdown-empty">
                          <p>No universities found for "{search}"</p>
                          <button 
                            onClick={() => setCustomMode(true)}
                            style={{
                              marginTop: 8,
                              padding: '8px 12px',
                              background: 'var(--accent-light)',
                              color: 'var(--accent)',
                              borderRadius: 'var(--radius-md)',
                              fontSize: 13,
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Plus size={14} /> Add "{search}" as custom school
                          </button>
                        </div>
                      )}
                      {filtered.length > 50 && (
                        <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>
                          Type to search {filtered.length - 50} more...
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setCustomMode(true)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderTop: '1px solid var(--border)',
                        background: 'var(--surface-hover)',
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <Plus size={14} /> My school isn't listed
                    </button>
                  </>
                ) : (
                  <div style={{ padding: 16 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                      Enter your school name:
                    </p>
                    <input
                      type="text"
                      placeholder="e.g., Springfield University"
                      value={customSchool || search}
                      onChange={(e) => setCustomSchool(e.target.value)}
                      autoFocus
                      style={{ marginBottom: 12 }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        onClick={() => { setCustomMode(false); setCustomSchool(''); }}
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                      >
                        Back
                      </button>
                      <button 
                        onClick={handleCustomSubmit}
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                        disabled={!customSchool.trim()}
                      >
                        Use This School
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <button 
          className="btn btn-primary btn-full welcome-btn"
          onClick={handleContinue}
          disabled={!selected}
        >
          Browse Gigs <ArrowRight size={16} />
        </button>

        <p className="welcome-note">
          Email verification only required when posting or accepting tasks
        </p>
      </div>
    </div>
  );
}
