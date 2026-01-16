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
  
  // Check if accessing a video page and/or via unlisted list (has ?list= parameter)
  const listId = searchParams.get('list');
  const isVideoRoute = location.pathname.includes('/video/');
  const isUnlistedListAccess = isVideoRoute && !!listId;

  // Video pages handle their own access control (membership wall, unlisted-list access, etc.)
  // So we always bypass auth guard for /video/:id routes and let Video.tsx decide.
  if (isVideoRoute) {
    if (listId || searchParams.get('debug') === '1') {
      console.log('[ProtectedRoute] bypass video route', {
        pathname: location.pathname,
        listId,
        isUnlistedListAccess,
      });
    }
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
