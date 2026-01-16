import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

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
  const { user, isLoading, isAdmin, isStaff, rolesChecked } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Check if accessing video via unlisted list (has ?list= parameter)
  const listId = searchParams.get('list');
  const isVideoRoute = location.pathname.includes('/video/');
  const isUnlistedListAccess = isVideoRoute && !!listId;

  // If accessing video via unlisted list, bypass auth guard and let Video.tsx handle access control
  if (isUnlistedListAccess) {
    return <>{children}</>;
  }

  // Show loading state while checking authentication or roles
  if (isLoading || (user && requireAdmin && !rolesChecked)) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <main className="pt-16">
          <div className="h-[60vh] flex items-center justify-center text-muted-foreground">Loading...</div>
        </main>
        <Footer />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Requires admin but user is not admin or staff
  if (requireAdmin && !isAdmin && !isStaff) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
