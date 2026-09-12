import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" />;

  if (roles && !roles.includes(user.role)) {
    const dash = {
      customer: '/customer',
      worker: '/worker',
      cooperative_admin: '/cooperative',
      federation_admin: '/federation',
    };
    return <Navigate to={dash[user.role] || '/'} />;
  }

  return children;
}
