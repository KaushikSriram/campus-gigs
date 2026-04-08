import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PostTask from './pages/PostTask';
import TaskDetail from './pages/TaskDetail';
import MyTasks from './pages/MyTasks';
import Messages from './pages/Messages';
import Profile from './pages/Profile';

export default function App() {
  return (
    <>
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/post" element={<ProtectedRoute><PostTask /></ProtectedRoute>} />
          <Route path="/task/:id" element={<ProtectedRoute><TaskDetail /></ProtectedRoute>} />
          <Route path="/my-tasks" element={<ProtectedRoute><MyTasks /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/profile/:id" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        </Routes>
      </main>
    </>
  );
}
