import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Landing() {
  const { user } = useAuth();

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="landing">
      <div className="landing-hero">
        <h1>Get Help. <span>Earn Money.</span><br />Right On Campus.</h1>
        <p>
          CampusGigs connects students who need help with quick tasks to fellow students
          who want to earn money. Verified .edu emails only — you know they're legit.
        </p>
        <div className="landing-buttons">
          <Link to="/register" className="btn btn-primary btn-lg">Get Started</Link>
          <Link to="/login" className="btn btn-secondary btn-lg">I Have an Account</Link>
        </div>
      </div>

      <div className="features-grid">
        <div className="card feature-card">
          <div className="feature-icon">&#127979;</div>
          <h3>Campus Verified</h3>
          <p>Only students with a valid .edu email can join. Everyone you interact with is from your university.</p>
        </div>
        <div className="card feature-card">
          <div className="feature-icon">&#128176;</div>
          <h3>Set Your Price</h3>
          <p>Need help? Name your fee. Looking to earn? Browse tasks and pick the ones that pay what you want.</p>
        </div>
        <div className="card feature-card">
          <div className="feature-icon">&#9889;</div>
          <h3>Quick Tasks</h3>
          <p>From moving furniture to tutoring sessions — post any task and get help from someone nearby in minutes.</p>
        </div>
        <div className="card feature-card">
          <div className="feature-icon">&#11088;</div>
          <h3>Build Your Rep</h3>
          <p>Rate and review after every task. Build a reputation as a reliable helper or great task poster.</p>
        </div>
        <div className="card feature-card">
          <div className="feature-icon">&#128172;</div>
          <h3>In-App Messaging</h3>
          <p>Coordinate details directly in the app. Discuss logistics before accepting a task.</p>
        </div>
        <div className="card feature-card">
          <div className="feature-icon">&#128274;</div>
          <h3>Safe & Secure</h3>
          <p>University-only community means accountability. JWT-secured authentication keeps your data safe.</p>
        </div>
      </div>

      <div className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Sign Up with .edu</h3>
            <p>Create an account using your university email to verify you're a real student.</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Post or Browse</h3>
            <p>Need help? Post a task with a description and fee. Want to earn? Browse available tasks.</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Connect & Coordinate</h3>
            <p>Message each other to work out the details. Meet up and get the task done.</p>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <h3>Complete & Review</h3>
            <p>Mark the task as done, exchange payment, and leave a review for each other.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
