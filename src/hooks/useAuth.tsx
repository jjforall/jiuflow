/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check active sessions and sets the user
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        await checkUserRoles(session.user.id);
      }
      setIsLoading(false);
    };
    
    initializeAuth();

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await checkUserRoles(session.user.id);
      } else {
        setIsAdmin(false);
        setIsStaff(false);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error checking user roles:', error);
        setIsAdmin(false);
        setIsStaff(false);
        return;
      }

      const roles = data?.map(r => r.role) || [];
      setIsAdmin(roles.includes('admin'));
      setIsStaff(roles.includes('staff'));
    } catch (error) {
      console.error('Error in checkUserRoles:', error);
      setIsAdmin(false);
      setIsStaff(false);
    }
  };

  const signOut = async () => {
    try {
      // ローカルストレージをクリア
      localStorage.clear();
      
      // Supabaseからサインアウト（セッションが存在しない場合もエラーにしない）
      const { error } = await supabase.auth.signOut();
      
      // セッションが見つからないエラーは無視
      if (error && !error.message.includes("Session not found") && !error.message.includes("Auth session missing")) {
        console.error('Sign out error:', error);
        // エラーがあってもローカル状態はクリアする
      }
      
      // 状態をクリア
      setUser(null);
      setIsAdmin(false);
      setIsStaff(false);
      
      // ログインページへリダイレクト
      navigate('/login');
      toast.success('ログアウトしました');
    } catch (error) {
      console.error('Error signing out:', error);
      // エラーが発生してもローカル状態はクリアして、ログインページへ遷移
      setUser(null);
      setIsAdmin(false);
      setIsStaff(false);
      navigate('/login');
      toast.success('ログアウトしました');
    }
  };

  const value = {
    user,
    isLoading,
    isAdmin,
    isStaff,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};