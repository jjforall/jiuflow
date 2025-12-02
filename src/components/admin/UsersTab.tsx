import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, UserPlus, Globe, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Profile, NewUserData } from "@/types/admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  CreateUserDialog, 
  EditProfileDialog, 
  PasswordChangeDialog,
  DeleteUserDialog
} from "./dialogs";

export const UsersTab = () => {
  const { isAdmin } = useAuth();
  const isMobile = useIsMobile();
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Form states
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [passwordChangeUserId, setPasswordChangeUserId] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<{ id: string; email: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [newUserData, setNewUserData] = useState<NewUserData>({
    email: "",
    password: "",
    role: "staff",
  });

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          *,
          user_roles (
            role
          )
        `)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch subscription data for all users
      const { data: subsData } = await supabase
        .from("subscriptions")
        .select("user_id, status, plan_type, current_period_end, trial_start, trial_end")
        .in("status", ["active", "trialing"]);

      // Merge subscription data with profiles
      const profilesWithSubs = (profilesData || []).map(profile => ({
        ...profile,
        is_public: profile.is_public ?? false,
        subscription: subsData?.find(sub => sub.user_id === profile.id)
      }));

      const sorted = profilesWithSubs.sort((a, b) => {
        const aAdmin = a.user_roles?.some(r => r.role === 'admin') ? 2 : 0;
        const aStaff = a.user_roles?.some(r => r.role === 'staff') ? 1 : 0;
        const bAdmin = b.user_roles?.some(r => r.role === 'admin') ? 2 : 0;
        const bStaff = b.user_roles?.some(r => r.role === 'staff') ? 1 : 0;
        return (bAdmin + bStaff) - (aAdmin + aStaff) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setProfiles(sorted);
      const subscribedCount = sorted.filter(p => p.subscription).length;
      const adminCount = sorted.filter(p => p.user_roles?.some(r => r.role === 'admin')).length;
      const staffCount = sorted.filter(p => p.user_roles?.some(r => r.role === 'staff')).length;
      toast.success("読み込み完了", {
        description: `${sorted.length}件の会員を読み込みました（管理者${adminCount}名、スタッフ${staffCount}名、サブスク${subscribedCount}名）`,
      });
    } catch (error: unknown) {
      toast.error("エラー", {
        description: (error instanceof Error ? error.message : String(error)),
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
      // Update stripe_customer_id via edge function
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: {
          action: "update",
          id: profile.id,
          stripe_customer_id: profile.stripe_customer_id,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Update is_public directly in the database
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_public: profile.is_public })
        .eq("id", profile.id);

      if (profileError) throw profileError;

      toast.success("更新完了", {
        description: "会員情報を更新しました",
      });

      setShowEditProfileDialog(false);
      setEditingProfile(null);
      loadProfiles();
    } catch (error: unknown) {
      toast.error("エラー", {
        description: (error instanceof Error ? error.message : String(error)),
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
        role: "staff",
      });
      
      loadProfiles();
    } catch (error: unknown) {
      toast.error("エラー", {
        description: (error instanceof Error ? error.message : String(error)),
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
    } catch (error: unknown) {
      console.error("Toggle admin error:", error);
      toast.error("エラー", {
        description: (error instanceof Error ? error.message : String(error)) || "権限の変更に失敗しました",
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
    } catch (error: unknown) {
      console.error("Password change error:", error);
      toast.error("エラー", {
        description: (error instanceof Error ? error.message : String(error)) || "パスワードの変更に失敗しました",
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

  const openDeleteDialog = (userId: string, userEmail: string) => {
    setDeletingUser({ id: userId, email: userEmail });
    setShowDeleteDialog(true);
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { userId: deletingUser.id },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("削除完了", {
        description: `${deletingUser.email} を削除しました`,
      });

      setShowDeleteDialog(false);
      setDeletingUser(null);
      loadProfiles();
    } catch (error: unknown) {
      console.error("Delete user error:", error);
      toast.error("エラー", {
        description: (error instanceof Error ? error.message : String(error)) || "ユーザーの削除に失敗しました",
      });
    } finally {
      setIsLoading(false);
    }
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
      const aAdmin = a.user_roles?.some(r => r.role === 'admin') ? 2 : 0;
      const aStaff = a.user_roles?.some(r => r.role === 'staff') ? 1 : 0;
      const bAdmin = b.user_roles?.some(r => r.role === 'admin') ? 2 : 0;
      const bStaff = b.user_roles?.some(r => r.role === 'staff') ? 1 : 0;
      return (bAdmin + bStaff) - (aAdmin + aStaff);
    } else if (sortBy === "email") {
      return (a.email || '').localeCompare(b.email || '');
    } else {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-2xl font-semibold">会員管理</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={loadProfiles} variant="outline" disabled={loadingProfiles} className="flex-1 sm:flex-none">
            {loadingProfiles ? "読み込み中..." : "リロード"}
          </Button>
          {isAdmin && (
            <Button onClick={() => setShowCreateUserDialog(true)} className="flex-1 sm:flex-none">
              <UserPlus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">新規ユーザー作成</span>
              <span className="sm:hidden">追加</span>
            </Button>
          )}
        </div>
      </div>

      {/* Search and Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
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
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="並び替え" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="date">作成日順</SelectItem>
            <SelectItem value="email">メール順</SelectItem>
            <SelectItem value="role">権限順</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table - Desktop */}
      {!isMobile ? (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left">メールアドレス</th>
                <th className="px-4 py-3 text-left">Stripe ID</th>
                <th className="px-4 py-3 text-left">サブスク</th>
                <th className="px-4 py-3 text-left">公開</th>
                <th className="px-4 py-3 text-left">権限</th>
                <th className="px-4 py-3 text-left">作成日</th>
                <th className="px-4 py-3 text-right">アクション</th>
              </tr>
            </thead>
            <tbody>
              {loadingProfiles ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    読み込み中...
                  </td>
                </tr>
              ) : filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    ユーザーが見つかりませんでした
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((profile) => {
                  const isAdminUser = profile.user_roles?.some(r => r.role === 'admin');
                  const isStaff = profile.user_roles?.some(r => r.role === 'staff');
                  const hasSub = profile.subscription;
                  return (
                    <tr key={profile.id} className="border-t hover:bg-muted/50">
                      <td className="px-4 py-3">
                        {profile.email || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {profile.stripe_customer_id || 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        {hasSub ? (
                          <div className="flex flex-col gap-1">
                            <Badge variant="default" className="bg-green-600">
                              {profile.subscription.plan_type || 'アクティブ'}
                            </Badge>
                            {profile.subscription.trial_end && new Date(profile.subscription.trial_end) > new Date() && (
                              <span className="text-xs text-muted-foreground">
                                トライアル中 (終了: {new Date(profile.subscription.trial_end).toLocaleDateString('ja-JP')})
                              </span>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline">未加入</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {profile.is_public ? (
                          <Globe className="h-4 w-4 text-green-500" />
                        ) : (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={isAdminUser ? "default" : isStaff ? "secondary" : "outline"}>
                          {isAdminUser ? '管理者' : isStaff ? 'スタッフ' : 'ユーザー'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(profile.created_at).toLocaleString('ja-JP')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end flex-wrap">
                          {isAdmin && (
                            <>
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
                                variant={isAdminUser ? "destructive" : "default"}
                                onClick={() => handleToggleAdmin(profile.id, isAdminUser)}
                                disabled={isLoading}
                              >
                                {isAdminUser ? '管理者解除' : '管理者にする'}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => openDeleteDialog(profile.id, profile.email || 'N/A')}
                                disabled={isLoading}
                              >
                                削除
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Users Cards - Mobile */
        <div className="space-y-4">
          {loadingProfiles ? (
            <Card>
              <CardContent className="py-8 text-center">
                読み込み中...
              </CardContent>
            </Card>
          ) : filteredProfiles.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                ユーザーが見つかりませんでした
              </CardContent>
            </Card>
          ) : (
            filteredProfiles.map((profile) => {
              const isAdminUser = profile.user_roles?.some(r => r.role === 'admin');
              const isStaff = profile.user_roles?.some(r => r.role === 'staff');
              const hasSub = profile.subscription;
              return (
                <Card key={profile.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{profile.email || 'N/A'}</p>
                            {profile.is_public ? (
                              <Globe className="h-4 w-4 text-green-500" />
                            ) : (
                              <Lock className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {profile.stripe_customer_id || 'Stripe ID なし'}
                          </p>
                        </div>
                        <Badge variant={isAdminUser ? "default" : isStaff ? "secondary" : "outline"}>
                          {isAdminUser ? '管理者' : isStaff ? 'スタッフ' : 'ユーザー'}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex gap-2 items-center">
                          {hasSub ? (
                            <Badge variant="default" className="bg-green-600">
                              {profile.subscription.plan_type || 'アクティブ'}
                            </Badge>
                          ) : (
                            <Badge variant="outline">未加入</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(profile.created_at).toLocaleDateString('ja-JP')}
                          </span>
                        </div>
                        {hasSub && profile.subscription.trial_end && new Date(profile.subscription.trial_end) > new Date() && (
                          <span className="text-xs text-muted-foreground">
                            トライアル中 (終了: {new Date(profile.subscription.trial_end).toLocaleDateString('ja-JP')})
                          </span>
                        )}
                      </div>

                      {isAdmin && (
                        <div className="flex flex-col gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditProfile(profile)}
                            className="w-full"
                          >
                            編集
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openPasswordDialog(profile.id)}
                            className="w-full"
                          >
                            パスワード変更
                          </Button>
                          <Button
                            size="sm"
                            variant={isAdminUser ? "destructive" : "default"}
                            onClick={() => handleToggleAdmin(profile.id, isAdminUser)}
                            disabled={isLoading}
                            className="w-full"
                          >
                            {isAdminUser ? '管理者解除' : '管理者にする'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openDeleteDialog(profile.id, profile.email || 'N/A')}
                            disabled={isLoading}
                            className="w-full"
                          >
                            削除
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

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

      <DeleteUserDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        userEmail={deletingUser?.email || null}
        onConfirm={handleDeleteUser}
        isLoading={isLoading}
      />
    </div>
  );
};