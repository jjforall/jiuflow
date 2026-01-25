import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Wrench } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const navigate = useNavigate();
  const { user, isAdmin, isStaff, rolesChecked, isLoading: authLoading } = useAuth();

  // プレビュー環境の検出
  const isLovablePreview = useMemo(() => {
    const hostname = window.location.hostname;
    const search = window.location.search;
    return (
      search.includes('__lovable_token') ||
      hostname.includes('id-preview--') ||
      hostname.includes('lovableproject.com') ||
      (hostname.includes('lovable.app') && hostname !== 'jiuflow.lovable.app')
    );
  }, []);

  // ログイン済みadmin/staffならダッシュボードへリダイレクト
  useEffect(() => {
    if (!authLoading && rolesChecked && user && (isAdmin || isStaff)) {
      navigate('/admin/dashboard');
    }
  }, [authLoading, rolesChecked, user, isAdmin, isStaff, navigate]);

  // プレビュー環境でのメール復元
  useEffect(() => {
    if (isLovablePreview) {
      const savedEmail = localStorage.getItem('jiuflow_admin_dev_email');
      if (savedEmail) {
        setEmail(savedEmail);
      }
    }
  }, [isLovablePreview]);

  useEffect(() => {
    checkIfSetupNeeded();
  }, []);

  const checkIfSetupNeeded = async () => {
    try {
      // RLSポリシーにより未認証ユーザーはuser_rolesを読めないため、
      // setup-admin関数を使って管理者の存在を確認する
      // 空のリクエストを送り、403なら管理者が存在する
      const { error } = await supabase.functions.invoke("setup-admin", {
        body: { email: "check@check.com", password: "CheckOnly123!" },
      });

      // 403 = 管理者が既に存在 → ログインフォームを表示
      // それ以外のエラー or 成功 = セットアップフォームを表示（ただし成功はありえない）
      if (error?.message?.includes('403') || error?.message?.includes('already exist')) {
        setShowSetup(false);
      } else {
        // フォールバック: 直接クエリも試す
        const { data } = await supabase
          .from('user_roles')
          .select('id')
          .eq('role', 'admin')
          .limit(1);
        
        setShowSetup(!data || data.length === 0);
      }
    } catch (error: unknown) {
      console.error('Error:', error);
      setShowSetup(false); // エラー時はログインフォームを表示
    } finally {
      setIsCheckingSetup(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("setup-admin", {
        body: { email, password },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("初期セットアップ完了", {
        description: "管理者アカウントを作成しました。ログインしてください。",
      });

      setShowSetup(false);
      checkIfSetupNeeded();
    } catch (error: unknown) {
      toast.error("セットアップ失敗", {
        description: (error instanceof Error ? error.message : String(error)),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Use Supabase authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Login failed", {
          description: (error instanceof Error ? error.message : String(error)),
        });
        setIsLoading(false);
        return;
      }

      if (data.session) {
        // Check if user has admin or staff role
        const { data: userRoles, error: rolesError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .in("role", ["admin", "staff"]);

        if (rolesError || !userRoles || userRoles.length === 0) {
          toast.error("Access denied", {
            description: "Admin or staff access required",
          });
          await supabase.auth.signOut();
          setIsLoading(false);
          return;
        }

        // プレビュー環境でメールを保存
        if (rememberEmail && isLovablePreview) {
          localStorage.setItem('jiuflow_admin_dev_email', email);
        }

        toast.success("Login successful", {
          description: "Welcome to admin panel",
        });
        // Use window.location to ensure auth state is fully loaded
        window.location.href = "/admin/dashboard";
      }
    } catch (error: unknown) {
      toast.error("Login failed", {
        description: (error instanceof Error ? error.message : String(error)),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 認証チェック中またはリダイレクト待ちの場合はローディング表示
  if (authLoading || (user && !rolesChecked)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-md mx-auto">
          {isCheckingSetup ? (
            <div className="text-center">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : showSetup ? (
            <>
              <div className="text-center mb-12">
                <h1 className="text-4xl font-light mb-4">初期セットアップ</h1>
                <p className="text-muted-foreground font-light">
                  最初の管理者アカウントを作成してください
                </p>
              </div>

              <form onSubmit={handleSetup} className="space-y-6">
                <div>
                  <Input
                    type="email"
                    placeholder="メールアドレス"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <Input
                    type="password"
                    placeholder="パスワード（12文字以上）"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full"
                    required
                    minLength={12}
                    disabled={isLoading}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? "作成中..." : "管理者アカウントを作成"}
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="text-center mb-12">
                <h1 className="text-4xl font-light mb-4">Admin Login</h1>
                <p className="text-muted-foreground font-light">
                  Enter password to access admin panel
                </p>
              </div>

              {isLovablePreview && (
                <div className="mb-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-blue-400">
                    <Wrench className="w-4 h-4" />
                    開発プレビュー環境
                  </div>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full"
                    required
                    disabled={isLoading}
                  />
                </div>

                {isLovablePreview && (
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="remember" 
                      checked={rememberEmail}
                      onCheckedChange={(checked) => setRememberEmail(!!checked)}
                    />
                    <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                      このデバイスでメールを記憶する
                    </Label>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AdminLogin;
