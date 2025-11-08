import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, ShieldCheck, Grid3X3 } from "lucide-react";

// Import tab components
import { TechniquesManagement } from "@/components/admin/TechniquesManagement";
import { UsersTab } from "@/components/admin/UsersTab";
import { PlansTab } from "@/components/admin/PlansTab";
import { SubscriptionsTab } from "@/components/admin/SubscriptionsTab";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      // Check Supabase authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/admin");
        return;
      }

      // Check if user is admin
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (rolesError || !userRoles) {
        toast.error("アクセス拒否", {
          description: "管理者権限が必要です",
        });
        navigate("/");
        return;
      }

      setIsLoading(false);
    };

    checkAuthAndLoad();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-12">
            <h1 className="text-4xl font-light">Admin Dashboard</h1>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>

          <Tabs defaultValue="techniques" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="techniques" className="flex items-center gap-2">
                <Grid3X3 className="w-4 h-4" />
                テクニック管理
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                会員管理
              </TabsTrigger>
              <TabsTrigger value="subscriptions">
                サブスク管理
              </TabsTrigger>
              <TabsTrigger value="plans" className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                プラン管理
              </TabsTrigger>
            </TabsList>

            <TabsContent value="techniques" className="space-y-6">
              <TechniquesManagement />
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              <UsersTab />
            </TabsContent>

            <TabsContent value="subscriptions">
              <SubscriptionsTab />
            </TabsContent>

            <TabsContent value="plans" className="space-y-6">
              <PlansTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;