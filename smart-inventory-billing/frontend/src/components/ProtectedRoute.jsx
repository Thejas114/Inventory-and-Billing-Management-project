import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700">Access denied</p>
          <p className="text-sm text-gray-500 mt-1">
            Your role ({user.role}) doesn't have permission to view this page.
          </p>
        </div>
      </div>
    );
  }
  return children;
}
