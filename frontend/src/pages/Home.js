import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, Bell, Plus, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import TaskCard from '../components/TaskCard';
import { CATEGORY_ICONS } from '../utils/helpers';

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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showFilters, setShowFilters] = useState(false);
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
      const data = await api.getTasks(params);
      setTasks(data.tasks);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [search, selectedCategory, sort, minPay, maxPay]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    api.getNotifications().then(data => {
      setUnreadNotifs(data.unreadCount);
    }).catch(() => {});
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    loadTasks();
  };

  return (
    <div className="page">
      {/* Header */}
      <div style={{ padding: '16px 20px', background: 'white', borderBottom: '1px solid var(--gray-100)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800 }}>
              Campus<span style={{ color: 'var(--primary)' }}>Gig</span>
            </h1>
            <p style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 500 }}>{user.university}</p>
          </div>
          <button onClick={() => navigate('/notifications')} style={{ background: 'none', position: 'relative', padding: 4 }}>
            <Bell size={24} color="var(--gray-600)" />
            {unreadNotifs > 0 && (
              <span className="notif-badge" style={{ position: 'absolute', top: -2, right: -4 }}>
                {unreadNotifs}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px 10px 40px', border: '2px solid var(--gray-200)',
                borderRadius: 'var(--radius-md)', fontSize: 14, background: 'var(--gray-50)',
              }}
            />
          </div>
          <button type="button" onClick={() => setShowFilters(!showFilters)} style={{
            background: showFilters ? 'var(--primary-light)' : 'var(--gray-100)',
            borderRadius: 'var(--radius-md)', padding: '0 12px',
            color: showFilters ? 'var(--primary)' : 'var(--gray-500)',
          }}>
            <SlidersHorizontal size={20} />
          </button>
        </form>

        {/* Category pills */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingTop: 12, paddingBottom: 4, marginLeft: -20, marginRight: -20, paddingLeft: 20, paddingRight: 20 }}>
          <button
            onClick={() => setSelectedCategory('')}
            style={{
              flexShrink: 0, padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: 12,
              fontWeight: 600, border: '1.5px solid',
              background: !selectedCategory ? 'var(--primary)' : 'white',
              color: !selectedCategory ? 'white' : 'var(--gray-600)',
              borderColor: !selectedCategory ? 'var(--primary)' : 'var(--gray-200)',
            }}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
              style={{
                flexShrink: 0, padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: 12,
                fontWeight: 600, border: '1.5px solid', whiteSpace: 'nowrap',
                background: selectedCategory === cat ? 'var(--primary)' : 'white',
                color: selectedCategory === cat ? 'white' : 'var(--gray-600)',
                borderColor: selectedCategory === cat ? 'var(--primary)' : 'var(--gray-200)',
              }}
            >
              {CATEGORY_ICONS[cat]} {cat.split(' & ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Filters bottom sheet */}
      {showFilters && (
        <div className="modal-overlay" onClick={() => setShowFilters(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Filters</h2>
              <button onClick={() => setShowFilters(false)} style={{ background: 'none' }}><X size={24} /></button>
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
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label>Min Pay ($)</label>
                <input type="number" placeholder="0" value={minPay} onChange={(e) => setMinPay(e.target.value)} />
              </div>
              <div className="input-group" style={{ flex: 1 }}>
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

      {/* Task feed */}
      <div style={{ padding: '12px 16px' }}>
        {loading ? (
          <div className="loader"><div className="spinner" /></div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <h3>No tasks found</h3>
            <p>No open tasks on your campus right now. Be the first to post one!</p>
          </div>
        ) : (
          <div className="task-grid">
            {tasks.map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => navigate('/post')}>
        <Plus size={28} />
      </button>
    </div>
  );
}
