import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, UserPlus, Globe, Lock, MoreHorizontal, Edit, Key, Shield, ShieldOff, Trash2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Profile, NewUserData } from "@/types/admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { 
  CreateUserDialog, 
  EditProfileDialog, 
  PasswordChangeDialog,
  DeleteUserDialog
} from "./dialogs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const UsersTab = () => {
  const { isAdmin } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "email" | "name" | "role">("date");
  
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
        .rpc("get_profiles_masked");

      if (profilesError) throw profilesError;

      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role");

      const { data: subsData } = await supabase
        .rpc("get_subscriptions_masked");

      const profilesWithSubs = (profilesData || []).map(profile => ({
        ...profile,
        is_public: profile.is_public ?? false,
        user_roles: rolesData?.filter(r => r.user_id === profile.id) || [],
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
        description: `${sorted.length}件の会員（管理者${adminCount}名、スタッフ${staffCount}名、サブスク${subscribedCount}名）`,
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
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: {
          action: "update",
          id: profile.id,
          stripe_customer_id: profile.stripe_customer_id,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_public: profile.is_public })
        .eq("id", profile.id);

      if (profileError) throw profileError;

      toast.success("更新完了");
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
        description: `${userData.email}`,
      });

      setShowCreateUserDialog(false);
      setNewUserData({ email: "", password: "", role: "staff" });
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
        body: { targetUserId: userId, makeAdmin: !isCurrentlyAdmin },
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast.success(!isCurrentlyAdmin ? "管理者権限を付与" : "管理者権限を削除");
      loadProfiles();
    } catch (error: unknown) {
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
        body: { userId, newPassword },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("パスワード変更完了");
      setShowPasswordDialog(false);
      setPasswordChangeUserId(null);
      setNewPassword("");
    } catch (error: unknown) {
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

      toast.success("削除完了", { description: deletingUser.email });
      setShowDeleteDialog(false);
      setDeletingUser(null);
      loadProfiles();
    } catch (error: unknown) {
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
      profile.display_name?.toLowerCase().includes(query) ||
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
    } else if (sortBy === "name") {
      return (a.display_name || '').localeCompare(b.display_name || '');
    } else {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) return name.slice(0, 2).toUpperCase();
    if (email) return email.slice(0, 2).toUpperCase();
    return "??";
  };

  const UserActions = ({ profile, isAdminUser }: { profile: Profile; isAdminUser: boolean }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => handleEditProfile(profile)}>
          <Edit className="h-4 w-4 mr-2" />
          編集
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openPasswordDialog(profile.id)}>
          <Key className="h-4 w-4 mr-2" />
          パスワード変更
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleToggleAdmin(profile.id, isAdminUser)} disabled={isLoading}>
          {isAdminUser ? (
            <>
              <ShieldOff className="h-4 w-4 mr-2" />
              管理者解除
            </>
          ) : (
            <>
              <Shield className="h-4 w-4 mr-2" />
              管理者にする
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => openDeleteDialog(profile.id, profile.email || 'N/A')}
          disabled={isLoading}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          削除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const UserRow = ({ profile }: { profile: Profile }) => {
    const isAdminUser = profile.user_roles?.some(r => r.role === 'admin');
    const isStaff = profile.user_roles?.some(r => r.role === 'staff');
    const hasSub = profile.subscription;

    return (
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {getInitials(profile.display_name, profile.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium truncate">{profile.display_name || '未設定'}</p>
              <p className="text-xs text-muted-foreground truncate">{profile.email || 'N/A'}</p>
            </div>
          </div>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
            {profile.stripe_customer_id ? profile.stripe_customer_id.slice(0, 14) + '...' : '-'}
          </code>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5">
            {hasSub ? (
              <Badge variant="default" className="bg-green-600 text-xs">
                {profile.subscription.plan_type || '有効'}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">未加入</Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="hidden sm:table-cell">
          <div className="flex items-center gap-1.5">
            {profile.is_public ? (
              <Globe className="h-4 w-4 text-green-500" />
            ) : (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
            <Badge variant={isAdminUser ? "default" : isStaff ? "secondary" : "outline"} className="text-xs">
              {isAdminUser ? '管理者' : isStaff ? 'スタッフ' : 'ユーザー'}
            </Badge>
          </div>
        </TableCell>
        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
          {new Date(profile.created_at).toLocaleDateString('ja-JP')}
        </TableCell>
        <TableCell className="text-right">
          {isAdmin && <UserActions profile={profile} isAdminUser={isAdminUser || false} />}
        </TableCell>
      </TableRow>
    );
  };

  const UserCard = ({ profile }: { profile: Profile }) => {
    const isAdminUser = profile.user_roles?.some(r => r.role === 'admin');
    const isStaff = profile.user_roles?.some(r => r.role === 'staff');
    const hasSub = profile.subscription;

    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback>{getInitials(profile.display_name, profile.email)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{profile.display_name || '未設定'}</p>
                  <p className="text-xs text-muted-foreground truncate">{profile.email || 'N/A'}</p>
                </div>
                {isAdmin && <UserActions profile={profile} isAdminUser={isAdminUser || false} />}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {hasSub ? (
                  <Badge variant="default" className="bg-green-600 text-xs">
                    {profile.subscription.plan_type || '有効'}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">未加入</Badge>
                )}
                <Badge variant={isAdminUser ? "default" : isStaff ? "secondary" : "outline"} className="text-xs">
                  {isAdminUser ? '管理者' : isStaff ? 'スタッフ' : 'ユーザー'}
                </Badge>
                {profile.is_public ? (
                  <Globe className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(profile.created_at).toLocaleDateString('ja-JP')}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h2 className="text-xl font-semibold">会員管理</h2>
          <Badge variant="secondary" className="ml-2">{filteredProfiles.length}</Badge>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={loadProfiles} variant="outline" size="sm" disabled={loadingProfiles}>
            {loadingProfiles ? "読込中..." : "更新"}
          </Button>
          {isAdmin && (
            <Button onClick={() => setShowCreateUserDialog(true)} size="sm">
              <UserPlus className="h-4 w-4 mr-1" />
              新規作成
            </Button>
          )}
        </div>
      </div>

      {/* Search and Sort */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="名前、メール、Stripe IDで検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-full sm:w-[140px] h-9">
            <SelectValue placeholder="並び替え" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="date">作成日順</SelectItem>
            <SelectItem value="name">名前順</SelectItem>
            <SelectItem value="email">メール順</SelectItem>
            <SelectItem value="role">権限順</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table - Desktop (md+) */}
      <div className="hidden md:block border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ユーザー</TableHead>
              <TableHead className="hidden md:table-cell">Stripe ID</TableHead>
              <TableHead>サブスク</TableHead>
              <TableHead className="hidden sm:table-cell">権限</TableHead>
              <TableHead className="hidden lg:table-cell">作成日</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingProfiles ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">読み込み中...</TableCell>
              </TableRow>
            ) : filteredProfiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  ユーザーが見つかりません
                </TableCell>
              </TableRow>
            ) : (
              filteredProfiles.map((profile) => <UserRow key={profile.id} profile={profile} />)
            )}
          </TableBody>
        </Table>
      </div>

      {/* Users Cards - Mobile */}
      <div className="md:hidden space-y-2">
        {loadingProfiles ? (
          <Card><CardContent className="py-8 text-center">読み込み中...</CardContent></Card>
        ) : filteredProfiles.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">ユーザーが見つかりません</CardContent></Card>
        ) : (
          filteredProfiles.map((profile) => <UserCard key={profile.id} profile={profile} />)
        )}
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
