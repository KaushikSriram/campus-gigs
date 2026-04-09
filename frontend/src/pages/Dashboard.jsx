import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import TaskCard from '../components/TaskCard';

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'moving', label: 'Moving' },
  { value: 'tutoring', label: 'Tutoring' },
  { value: 'errands', label: 'Errands' },
  { value: 'tech_help', label: 'Tech Help' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'other', label: 'Other' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'fee_high', label: 'Highest pay' },
  { value: 'fee_low', label: 'Lowest pay' },
  { value: 'deadline', label: 'Due soonest' },
];

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    fetchTasks();
  }, [category, sort]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = { status: 'open', sort };
      if (category) params.category = category;
      if (search) params.search = search;
      const res = await api.get('/tasks', { params });
      setTasks(res.data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTasks();
  };

  return (
    <div>
      <div className="dashboard-header">
        <h1>What needs doing?</h1>
        <Link to="/post" className="btn btn-primary">+ Post a task</Link>
      </div>

      <form onSubmit={handleSearch} className="filters">
        <input
          type="text"
          className="form-control search-input"
          placeholder="Search tasks..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="form-control"
          value={sort}
          onChange={e => setSort(e.target.value)}
          style={{ width: 'auto', minWidth: 130 }}
        >
          {SORT_OPTIONS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <button type="submit" className="btn btn-secondary">Search</button>
      </form>

      <div className="category-tabs">
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            className={`category-tab ${category === cat.value ? 'active' : ''}`}
            onClick={() => setCategory(cat.value)}
            type="button"
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <h3>Nothing here yet</h3>
          <p>Be the first to post a task or try a different filter!</p>
        </div>
      ) : (
        <div className="tasks-grid">
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
