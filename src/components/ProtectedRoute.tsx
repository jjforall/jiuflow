import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  redirectTo?: string;
}

export const ProtectedRoute = ({ 
  children, 
  requireAdmin = false,
  redirectTo = '/login'
}: ProtectedRouteProps) => {
  const { user, isLoading, isAdmin } = useAuth();
  const location = useLocation();

  // Not authenticated
  if (!user && !isLoading) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Requires admin but user is not admin
  if (user && requireAdmin && !isAdmin && !isLoading) {
    return <Navigate to="/" replace />;
  }

  // Only show loading on initial authentication check
  if (isLoading) {
    return null;
  }

  return <>{children}</>;
};