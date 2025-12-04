import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

const Logout = () => {
  const { signOut, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      signOut();
    }
  }, [signOut, isLoading]);

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
