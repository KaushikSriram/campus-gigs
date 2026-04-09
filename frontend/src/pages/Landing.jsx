import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Landing() {
  const { user } = useAuth();

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="landing">
      <div className="landing-hero">
        <h1>Got a task? <span>Post it.</span><br />Got time? <span>Pick one up.</span></h1>
        <p>
          Clutch is where students help each other out.
          Post quick tasks, earn some cash, and keep it all on campus.
        </p>
        <div className="landing-buttons">
          <Link to="/register" className="btn btn-primary btn-lg">Get started</Link>
          <Link to="/login" className="btn btn-secondary btn-lg">I have an account</Link>
        </div>
      </div>

      <div className="features-grid">
        <div className="card feature-card">
          <div className="feature-icon">&#127979;</div>
          <h3>Your campus only</h3>
          <p>Tasks are scoped to your university. Everyone here is a fellow student.</p>
        </div>
        <div className="card feature-card">
          <div className="feature-icon">&#128176;</div>
          <h3>Name your price</h3>
          <p>Set the fee for your task. Browse what's available and pick what works for you.</p>
        </div>
        <div className="card feature-card">
          <div className="feature-icon">&#9889;</div>
          <h3>Quick stuff</h3>
          <p>Moving boxes, tutoring, errands, tech help — whatever you need, someone's nearby.</p>
        </div>
        <div className="card feature-card">
          <div className="feature-icon">&#11088;</div>
          <h3>Build trust</h3>
          <p>Leave reviews after each task. Reliable helpers rise to the top.</p>
        </div>
        <div className="card feature-card">
          <div className="feature-icon">&#128172;</div>
          <h3>Chat built in</h3>
          <p>Work out the details right in the app before meeting up.</p>
        </div>
        <div className="card feature-card">
          <div className="feature-icon">&#128274;</div>
          <h3>.edu verified</h3>
          <p>Only students with a university email can join. Real people, real accountability.</p>
        </div>
      </div>

      <div className="how-it-works">
        <h2>How it works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Sign up with .edu</h3>
            <p>Create an account with your university email.</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Post or browse</h3>
            <p>Need help? Post a task. Want to earn? Browse what's available.</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Chat and meet up</h3>
            <p>Message each other, sort out the details, get it done.</p>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <h3>Review each other</h3>
            <p>Mark the task done and leave a review. Simple as that.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
