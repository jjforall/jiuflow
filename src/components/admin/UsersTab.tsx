import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Profile, NewUserData } from "@/types/admin";
import { Badge } from "@/components/ui/badge";
import { 
  CreateUserDialog, 
  EditProfileDialog, 
  PasswordChangeDialog 
} from "./dialogs";

export const UsersTab = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "email" | "role">("date");
  
  // Dialog states
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [showEditProfileDialog, setShowEditProfileDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  
  // Form states
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [passwordChangeUserId, setPasswordChangeUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [newUserData, setNewUserData] = useState<NewUserData>({
    email: "",
    password: "",
    role: "user",
  });

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          user_roles (
            role
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const sorted = (data || []).sort((a, b) => {
        const aAdmin = a.user_roles?.some(r => r.role === 'admin') ? 1 : 0;
        const bAdmin = b.user_roles?.some(r => r.role === 'admin') ? 1 : 0;
        return bAdmin - aAdmin || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setProfiles(sorted);
      toast.success("読み込み完了", {
        description: `${sorted.length}件の会員を読み込みました（管理者${sorted.filter(p => p.user_roles?.some(r => r.role === 'admin')).length}名）`,
      });
    } catch (error: any) {
      toast.error("エラー", {
        description: error.message,
      });
    } finally {
      setLoadingProfiles(false);
    }
  };

  const handleEditProfile = (profile: Profile) => {
    setEditingProfile(profile);
    setShowEditProfileDialog(true);
  };

  const handleUpdateProfile = async (profile: Profile) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: {
          action: "update",
          id: profile.id,
          stripe_customer_id: profile.stripe_customer_id,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("更新完了", {
        description: "会員情報を更新しました",
      });

      setShowEditProfileDialog(false);
      setEditingProfile(null);
      loadProfiles();
    } catch (error: any) {
      toast.error("エラー", {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (userData: NewUserData) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: userData,
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("ユーザー作成成功", {
        description: `${userData.email} を作成しました`,
      });

      setShowCreateUserDialog(false);
      setNewUserData({
        email: "",
        password: "",
        role: "user",
      });
      
      loadProfiles();
    } catch (error: any) {
      toast.error("エラー", {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAdmin = async (userId: string, isCurrentlyAdmin: boolean) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-roles", {
        body: {
          targetUserId: userId,
          makeAdmin: !isCurrentlyAdmin,
        },
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast.success(!isCurrentlyAdmin ? "管理者権限を付与しました" : "管理者権限を削除しました", {
        description: !isCurrentlyAdmin ? "ユーザーを管理者に設定しました" : "ユーザーの管理者権限を削除しました",
      });

      loadProfiles();
    } catch (error: any) {
      console.error("Toggle admin error:", error);
      toast.error("エラー", {
        description: error.message || "権限の変更に失敗しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (userId: string, newPassword: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-user-password", {
        body: {
          userId: userId,
          newPassword: newPassword,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("パスワード変更完了", {
        description: "ユーザーのパスワードを変更しました",
      });

      setShowPasswordDialog(false);
      setPasswordChangeUserId(null);
      setNewPassword("");
    } catch (error: any) {
      console.error("Password change error:", error);
      toast.error("エラー", {
        description: error.message || "パスワードの変更に失敗しました",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openPasswordDialog = (userId: string) => {
    setPasswordChangeUserId(userId);
    setNewPassword("");
    setShowPasswordDialog(true);
  };

  // Filter and sort profiles
  const filteredProfiles = profiles.filter(profile => {
    const query = searchQuery.toLowerCase();
    return (
      profile.email?.toLowerCase().includes(query) ||
      profile.stripe_customer_id?.toLowerCase().includes(query)
    );
  }).sort((a, b) => {
    if (sortBy === "role") {
      const aAdmin = a.user_roles?.some(r => r.role === 'admin') ? 1 : 0;
      const bAdmin = b.user_roles?.some(r => r.role === 'admin') ? 1 : 0;
      return bAdmin - aAdmin;
    } else if (sortBy === "email") {
      return (a.email || '').localeCompare(b.email || '');
    } else {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">会員管理</h2>
        <div className="flex gap-2">
          <Button onClick={loadProfiles} variant="outline" disabled={loadingProfiles}>
            {loadingProfiles ? "読み込み中..." : "リロード"}
          </Button>
          <Button onClick={() => setShowCreateUserDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            新規ユーザー作成
          </Button>
        </div>
      </div>

      {/* Search and Sort */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="メールアドレスまたはStripe IDで検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="並び替え" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">作成日順</SelectItem>
            <SelectItem value="email">メール順</SelectItem>
            <SelectItem value="role">権限順</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left">メールアドレス</th>
              <th className="px-4 py-3 text-left">Stripe ID</th>
              <th className="px-4 py-3 text-left">権限</th>
              <th className="px-4 py-3 text-left">作成日</th>
              <th className="px-4 py-3 text-right">アクション</th>
            </tr>
          </thead>
          <tbody>
            {loadingProfiles ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center">
                  読み込み中...
                </td>
              </tr>
            ) : filteredProfiles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  ユーザーが見つかりませんでした
                </td>
              </tr>
            ) : (
              filteredProfiles.map((profile) => {
                const isAdmin = profile.user_roles?.some(r => r.role === 'admin');
                return (
                  <tr key={profile.id} className="border-t hover:bg-muted/50">
                    <td className="px-4 py-3">
                      {profile.email || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {profile.stripe_customer_id || 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={isAdmin ? "default" : "secondary"}>
                        {isAdmin ? '管理者' : 'ユーザー'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(profile.created_at).toLocaleString('ja-JP')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditProfile(profile)}
                        >
                          編集
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPasswordDialog(profile.id)}
                        >
                          パスワード変更
                        </Button>
                        <Button
                          size="sm"
                          variant={isAdmin ? "destructive" : "default"}
                          onClick={() => handleToggleAdmin(profile.id, isAdmin)}
                          disabled={isLoading}
                        >
                          {isAdmin ? '管理者解除' : '管理者にする'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Dialogs */}
      <CreateUserDialog
        open={showCreateUserDialog}
        onOpenChange={setShowCreateUserDialog}
        newUserData={newUserData}
        setNewUserData={setNewUserData}
        onSubmit={handleCreateUser}
        isLoading={isLoading}
      />

      <EditProfileDialog
        open={showEditProfileDialog}
        onOpenChange={setShowEditProfileDialog}
        profile={editingProfile}
        onSubmit={handleUpdateProfile}
        isLoading={isLoading}
      />

      <PasswordChangeDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        userId={passwordChangeUserId}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        onSubmit={handlePasswordChange}
        isLoading={isLoading}
      />
    </div>
  );
};