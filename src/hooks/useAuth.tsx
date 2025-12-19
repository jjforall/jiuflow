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
  rolesChecked: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [rolesChecked, setRolesChecked] = useState(false);
  const navigate = useNavigate();

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
      } else {
        const roles = data?.map(r => r.role) || [];
        setIsAdmin(roles.includes('admin'));
        setIsStaff(roles.includes('staff'));
      }
    } catch (error) {
      console.error('Error in checkUserRoles:', error);
      setIsAdmin(false);
      setIsStaff(false);
    } finally {
      setRolesChecked(true);
    }
  };

  useEffect(() => {
    // Check active sessions and sets the user
    const initializeAuth = async () => {
      try {
        // Add timeout to prevent hanging forever (20 seconds for slow networks)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth timeout')), 20000)
        );
        
        const sessionPromise = supabase.auth.getSession();
        const result = await Promise.race([sessionPromise, timeoutPromise]) as any;
        const session = result?.data?.session;
        
        setUser(session?.user ?? null);
        if (session?.user) {
          // Check roles immediately (await to ensure completion before loading ends)
          await checkUserRoles(session.user.id);
        } else {
          setRolesChecked(true);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // On timeout or error, set user to null to allow page to proceed
        setUser(null);
        setRolesChecked(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeAuth();

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Only synchronous state updates here to prevent Safari issues and deadlocks
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Defer Supabase calls with setTimeout to prevent deadlock
        setTimeout(() => {
          checkUserRoles(session.user.id);
        }, 0);
      } else {
        setIsAdmin(false);
        setIsStaff(false);
        setRolesChecked(true);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
    rolesChecked,
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