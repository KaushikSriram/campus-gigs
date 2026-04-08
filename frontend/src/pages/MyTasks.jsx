import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import TaskCard from '../components/TaskCard';

export default function MyTasks() {
  const { user } = useAuth();
  const [tab, setTab] = useState('posted');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, [tab]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      // Fetch all tasks and filter client-side
      const statuses = ['open', 'accepted', 'completed', 'cancelled'];
      const all = [];
      for (const status of statuses) {
        try {
          const res = await api.get('/tasks', { params: { status } });
          all.push(...res.data);
        } catch {
          // Skip statuses that fail
        }
      }

      if (tab === 'posted') {
        setTasks(all.filter(t => t.poster_id === user.id));
      } else {
        setTasks(all.filter(t => t.accepted_by === user.id));
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontSize: '1.6rem' }}>My Tasks</h1>

      <div className="tabs">
        <button className={`tab ${tab === 'posted' ? 'active' : ''}`} onClick={() => setTab('posted')}>
          Tasks I Posted
        </button>
        <button className={`tab ${tab === 'accepted' ? 'active' : ''}`} onClick={() => setTab('accepted')}>
          Tasks I Accepted
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <h3>No tasks here yet</h3>
          <p>{tab === 'posted' ? "You haven't posted any tasks yet." : "You haven't accepted any tasks yet."}</p>
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
