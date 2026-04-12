import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Onboarding from './pages/Onboarding';
import Login from './pages/Login';
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

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loader"><div className="spinner" /></div>;
  return user ? children : <Navigate to="/onboarding" />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loader"><div className="spinner" /></div>;
  return !user ? children : <Navigate to="/" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/onboarding" element={<PublicRoute><Onboarding /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<Navigate to="/login" replace />} />
      <Route path="/" element={<PrivateRoute><Layout><Home /></Layout></PrivateRoute>} />
      <Route path="/task/:id" element={<PrivateRoute><Layout><TaskDetail /></Layout></PrivateRoute>} />
      <Route path="/post" element={<PrivateRoute><Layout><PostTask /></Layout></PrivateRoute>} />
      <Route path="/my-tasks" element={<PrivateRoute><Layout><MyTasks /></Layout></PrivateRoute>} />
      <Route path="/messages" element={<PrivateRoute><Layout><Messages /></Layout></PrivateRoute>} />
      <Route path="/chat/:taskId/:userId" element={<PrivateRoute><Layout><Chat /></Layout></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Layout><Profile /></Layout></PrivateRoute>} />
      <Route path="/user/:id" element={<PrivateRoute><Layout><UserProfile /></Layout></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><Layout><Notifications /></Layout></PrivateRoute>} />
      <Route path="/review/:taskId/:revieweeId" element={<PrivateRoute><Layout><ReviewForm /></Layout></PrivateRoute>} />
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
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
