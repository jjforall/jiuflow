import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const Logout = () => {
  const { signOut, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const performLogout = async () => {
      await signOut();
      navigate('/login');
    };
    
    if (!isLoading) {
      performLogout();
    }
  }, [signOut, navigate, isLoading]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">ログアウト中...</p>
      </div>
    </div>
  );
};

export default Logout;
