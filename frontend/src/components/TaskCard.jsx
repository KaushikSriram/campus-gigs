import { useNavigate } from 'react-router-dom';

const categoryLabels = {
  moving: 'Moving',
  tutoring: 'Tutoring',
  errands: 'Errands',
  tech_help: 'Tech Help',
  cleaning: 'Cleaning',
  delivery: 'Delivery',
  other: 'Other',
};

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date + 'Z').getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function TaskCard({ task }) {
  const navigate = useNavigate();

  return (
    <div className="card card-clickable task-card" onClick={() => navigate(`/task/${task.id}`)}>
      <div className="task-card-header">
        <div className="task-card-title">{task.title}</div>
        <div className="task-card-fee">${Number(task.fee).toFixed(2)}</div>
      </div>
      <div className="task-card-description">{task.description}</div>
      <div className="task-card-footer">
        <div className="task-card-meta">
          <span className="badge badge-category">{categoryLabels[task.category] || task.category}</span>
          <span className={`badge badge-${task.status}`}>{task.status}</span>
          {task.location && <span>{task.location}</span>}
        </div>
        <div className="task-card-meta">
          <span>{task.poster_name}</span>
          <span>{timeAgo(task.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
