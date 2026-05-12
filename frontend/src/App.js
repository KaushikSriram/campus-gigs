import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Welcome from './pages/Welcome';
import Home from './pages/Home';
import TaskDetail from './pages/TaskDetail';
import PostTask from './pages/PostTask';
import MyTasks from './pages/MyTasks';
import Messages from './pages/Messages';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import Notifications from './pages/Notifications';
import ReviewForm from './pages/ReviewForm';
import Layout from './components/Layout';
import LoginModal from './components/LoginModal';

// Requires university selection (but not login)
function RequireUniversity({ children }) {
  const { university, loading } = useAuth();
  if (loading) return <div className="loader"><div className="spinner" /></div>;
  return university ? children : <Navigate to="/welcome" />;
}

// Requires login (for actions like posting)
function RequireAuth({ children }) {
  const { user, university, loading } = useAuth();
  if (loading) return <div className="loader"><div className="spinner" /></div>;
  if (!university) return <Navigate to="/welcome" />;
  if (!user) return <Navigate to="/" />;
  return children;
}

// Redirect if already has university selected
function WelcomeRoute({ children }) {
  const { university, loading } = useAuth();
  if (loading) return <div className="loader"><div className="spinner" /></div>;
  return university ? <Navigate to="/" /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/welcome" element={<WelcomeRoute><Welcome /></WelcomeRoute>} />
      
      {/* Public routes (university required, login optional) */}
      <Route path="/" element={<RequireUniversity><Layout><Home /></Layout></RequireUniversity>} />
      <Route path="/task/:id" element={<RequireUniversity><Layout><TaskDetail /></Layout></RequireUniversity>} />
      <Route path="/user/:id" element={<RequireUniversity><Layout><UserProfile /></Layout></RequireUniversity>} />
      
      {/* Protected routes (require login) */}
      <Route path="/post" element={<RequireAuth><Layout><PostTask /></Layout></RequireAuth>} />
      <Route path="/my-tasks" element={<RequireAuth><Layout><MyTasks /></Layout></RequireAuth>} />
      <Route path="/messages" element={<RequireAuth><Layout><Messages /></Layout></RequireAuth>} />
      <Route path="/chat/:taskId/:userId" element={<RequireAuth><Layout><Chat /></Layout></RequireAuth>} />
      <Route path="/profile" element={<RequireAuth><Layout><Profile /></Layout></RequireAuth>} />
      <Route path="/notifications" element={<RequireAuth><Layout><Notifications /></Layout></RequireAuth>} />
      <Route path="/review/:taskId/:revieweeId" element={<RequireAuth><Layout><ReviewForm /></Layout></RequireAuth>} />
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="container">
          <AppRoutes />
          <LoginModal />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
