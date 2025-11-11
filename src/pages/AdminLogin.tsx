import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/lib/translations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkIfSetupNeeded();
  }, []);

  const checkIfSetupNeeded = async () => {
    try {
      // Check if any admin users exist
      const { data, error } = await supabase
        .from('user_roles')
        .select('id')
        .eq('role', 'admin')
        .limit(1);

      if (error) {
        console.error('Error checking admin users:', error);
        setIsCheckingSetup(false);
        return;
      }

      // If no admin users exist, show setup form
      setShowSetup(!data || data.length === 0);
    } catch (error: unknown) {
      console.error('Error:', error);
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
        // Check if user is admin
        const { data: userRoles, error: rolesError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (rolesError || !userRoles) {
          toast.error("Access denied", {
            description: "Admin access required",
          });
          await supabase.auth.signOut();
          setIsLoading(false);
          return;
        }

        toast.success("Login successful", {
          description: "Welcome to admin panel",
        });
        navigate("/admin/dashboard");
      }
    } catch (error: unknown) {
      toast.error("Login failed", {
        description: (error instanceof Error ? error.message : String(error)),
      });
    } finally {
      setIsLoading(false);
    }
  };

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
