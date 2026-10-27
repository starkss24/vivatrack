import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute, { homeFor } from './routes/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import StudentPage from './pages/student/StudentPage';
import TaPage from './pages/ta/TaPage';
import AdminPage from './pages/admin/AdminPage';
import AppShell from './components/AppShell';

function Root() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Root />} />
      <Route path="/login" element={<Login />} />
      <Route path="/student/*" element={<ProtectedRoute role="student"><AppShell><StudentPage /></AppShell></ProtectedRoute>} />
      <Route path="/ta/*" element={<ProtectedRoute role="ta"><AppShell><TaPage /></AppShell></ProtectedRoute>} />
      <Route path="/admin/*" element={<ProtectedRoute role="admin"><AppShell><AdminPage /></AppShell></ProtectedRoute>} />
      <Route path="*" element={<Root />} />
    </Routes>
  );
}
