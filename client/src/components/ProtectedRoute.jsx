import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ROLE_DASHBOARD = {
  admin: '/admin',
  manager: '/manager',
  kitchen: '/kitchen',
  waiter: '/waiter',
};

export default function ProtectedRoute({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={ROLE_DASHBOARD[user.role] || '/'} replace />;
  }
  return children;
}
