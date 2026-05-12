import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, Bell, Plus, X, LogIn, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import TaskCard from '../components/TaskCard';
import { CATEGORY_ICONS } from '../utils/helpers';
import { UNIVERSITIES } from '../data/universities';

const CATEGORIES = [
  'Moving & Heavy Lifting',
  'Delivery & Pickup',
  'Academic Help',
  'Tech Help',
  'Errands',
  'Cleaning & Organization',
  'Assembly & Setup',
  'Event Help',
  'Creative & Design',
  'Other',
];

export default function Home() {
  const { user, university, setUniversity, requireLogin } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);
  const [sort, setSort] = useState('newest');
  const [minPay, setMinPay] = useState('');
  const [maxPay, setMaxPay] = useState('');
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (selectedCategory) params.category = selectedCategory;
      if (sort !== 'newest') params.sort = sort;
      if (minPay) params.minPay = minPay;
      if (maxPay) params.maxPay = maxPay;
      
      if (!user && university) {
        params.university = university;
      }
      
      const data = await api.getTasks(params);
      setTasks(data.tasks || []);
    } catch (err) {
      console.error(err);
      setTasks([]);
    }
    setLoading(false);
  }, [search, selectedCategory, sort, minPay, maxPay, user, university]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (user) {
      api.getNotifications().then(data => {
        setUnreadNotifs(data.unreadCount);
      }).catch(() => {});
    }
  }, [user]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadTasks();
  };

  const handlePostClick = () => {
    requireLogin(() => navigate('/post'));
  };

  const handleNotificationsClick = () => {
    requireLogin(() => navigate('/notifications'));
  };

  const handleSchoolChange = (newSchool) => {
    setUniversity(newSchool);
    setShowSchoolPicker(false);
    setTasks([]);
    setTimeout(loadTasks, 100);
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="home-header">
        <div className="home-header-top">
          <div>
            <h1 className="home-logo">
              Campus<span>Gig</span>
            </h1>
            <button 
              className="home-university"
              onClick={() => setShowSchoolPicker(true)}
            >
              {university} <ChevronDown size={12} />
            </button>
          </div>
          <div className="home-header-actions">
            {user ? (
              <button onClick={handleNotificationsClick} className="icon-btn">
                <Bell size={20} />
                {unreadNotifs > 0 && <span className="notif-badge">{unreadNotifs}</span>}
              </button>
            ) : (
              <button onClick={() => requireLogin(() => {})} className="login-chip">
                <LogIn size={14} /> Sign in
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search gigs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            type="button" 
            onClick={() => setShowFilters(!showFilters)} 
            className={`filter-btn ${showFilters ? 'active' : ''}`}
          >
            <SlidersHorizontal size={18} />
          </button>
        </form>

        {/* Category pills */}
        <div className="category-scroll">
          <button
            onClick={() => setSelectedCategory('')}
            className={`category-pill ${!selectedCategory ? 'active' : ''}`}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
              className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
            >
              {CATEGORY_ICONS[cat]} {cat.split(' & ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Filters modal */}
      {showFilters && (
        <div className="modal-overlay" onClick={() => setShowFilters(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Filters</h2>
              <button onClick={() => setShowFilters(false)} className="modal-close"><X size={20} /></button>
            </div>
            <div className="input-group">
              <label>Sort By</label>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="newest">Newest First</option>
                <option value="pay_high">Highest Pay</option>
                <option value="pay_low">Lowest Pay</option>
                <option value="soonest">Soonest Deadline</option>
              </select>
            </div>
            <div className="filter-row">
              <div className="input-group">
                <label>Min Pay ($)</label>
                <input type="number" placeholder="0" value={minPay} onChange={(e) => setMinPay(e.target.value)} />
              </div>
              <div className="input-group">
                <label>Max Pay ($)</label>
                <input type="number" placeholder="Any" value={maxPay} onChange={(e) => setMaxPay(e.target.value)} />
              </div>
            </div>
            <button className="btn btn-primary btn-full" onClick={() => { setShowFilters(false); loadTasks(); }}>
              Apply Filters
            </button>
            <button className="btn btn-secondary btn-full" style={{ marginTop: 8 }} onClick={() => {
              setSort('newest'); setMinPay(''); setMaxPay(''); setSelectedCategory(''); setShowFilters(false);
            }}>
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* School picker modal */}
      {showSchoolPicker && (
        <SchoolPickerModal 
          university={university}
          onSelect={handleSchoolChange}
          onClose={() => setShowSchoolPicker(false)}
        />
      )}

      {/* Task feed */}
      <div className="task-feed">
        {loading ? (
          <div className="loader"><div className="spinner" /></div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No gigs yet</h3>
            <p>Be the first to post a task on your campus!</p>
            <button className="btn btn-primary" onClick={handlePostClick}>
              Post a Gig
            </button>
          </div>
        ) : (
          <div className="task-grid">
            {tasks.map((task, i) => (
              <TaskCard 
                key={task.id} 
                task={task}
                style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={handlePostClick}>
        <Plus size={24} />
      </button>
    </div>
  );
}

function SchoolPickerModal({ university, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [customSchool, setCustomSchool] = useState('');
  const searchRef = useRef(null);

  useEffect(() => {
    if (searchRef.current) searchRef.current.focus();
  }, []);

  const filtered = UNIVERSITIES.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.domain.toLowerCase().includes(search.toLowerCase())
  );

  const handleCustomSubmit = () => {
    if (customSchool.trim()) {
      onSelect(customSchool.trim());
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h2>Change School</h2>
          <button onClick={onClose} className="modal-close"><X size={20} /></button>
        </div>
        
        {!customMode ? (
          <>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search size={16} style={{ 
                position: 'absolute', 
                left: 12, 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)',
              }} />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search universities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ 
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 14,
                }}
              />
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto', marginBottom: 12 }}>
              {filtered.slice(0, 50).map(uni => (
                <button
                  key={uni.domain}
                  onClick={() => onSelect(uni.name)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: uni.name === university ? 'var(--accent-light)' : 'transparent',
                    color: uni.name === university ? 'var(--accent)' : 'var(--text-primary)',
                    fontWeight: uni.name === university ? 600 : 500,
                    fontSize: 14,
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 2,
                  }}
                >
                  <span>{uni.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{uni.domain}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  No universities found
                </div>
              )}
            </div>
            <button
              onClick={() => setCustomMode(true)}
              className="btn btn-secondary btn-full"
            >
              <Plus size={14} /> My school isn't listed
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Enter your school name:
            </p>
            <input
              type="text"
              placeholder="e.g., Springfield University"
              value={customSchool}
              onChange={(e) => setCustomSchool(e.target.value)}
              autoFocus
              style={{ 
                width: '100%',
                padding: '10px 14px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 14,
                marginBottom: 12,
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setCustomMode(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                Back
              </button>
              <button onClick={handleCustomSubmit} className="btn btn-primary" style={{ flex: 1 }} disabled={!customSchool.trim()}>
                Use This School
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
