import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { Upload, Trash2, Edit, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Technique {
  id: string;
  name: string;
  name_ja: string;
  name_pt: string;
  description: string | null;
  description_ja: string | null;
  description_pt: string | null;
  category: string;
  video_url: string | null;
  display_order: number;
}

interface Profile {
  id: string;
  email: string | null;
  created_at: string;
  updated_at: string;
  stripe_customer_id: string | null;
  user_roles?: Array<{ role: string }>;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [editingTechnique, setEditingTechnique] = useState<Technique | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [showEditProfileDialog, setShowEditProfileDialog] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: "",
    password: "",
    role: "user" as "admin" | "user",
  });

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    name_ja: "",
    name_pt: "",
    description: "",
    description_ja: "",
    description_pt: "",
    category: "pull" as "pull" | "control" | "submission",
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);

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
        toast({
          title: "Access denied",
          description: "Admin access required",
          variant: "destructive",
        });
        navigate("/admin");
        return;
      }

      loadTechniques();
      loadProfiles();  // Load profiles automatically on mount
    };

    checkAuthAndLoad();
  }, [navigate]);

  const loadTechniques = async () => {
    const { data, error } = await supabase
      .from("techniques")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      toast({
        title: "Error loading techniques",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setTechniques(data || []);
  };

  const handleVideoUpload = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `videos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("technique-videos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("technique-videos")
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error("Video upload error:", error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setUploadingVideo(true);

    try {
      let videoUrl = null;

      if (videoFile) {
        videoUrl = await handleVideoUpload(videoFile);
        if (!videoUrl) {
          throw new Error("Failed to upload video");
        }
      }

      const { error } = await supabase.from("techniques").insert({
        ...formData,
        video_url: videoUrl,
        display_order: techniques.length,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Technique added successfully",
      });

      // Reset form
      setFormData({
        name: "",
        name_ja: "",
        name_pt: "",
        description: "",
        description_ja: "",
        description_pt: "",
        category: "pull",
      });
      setVideoFile(null);

      loadTechniques();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setUploadingVideo(false);
    }
  };

  const handleEdit = (technique: Technique) => {
    setEditingTechnique(technique);
    setFormData({
      name: technique.name,
      name_ja: technique.name_ja,
      name_pt: technique.name_pt,
      description: technique.description || "",
      description_ja: technique.description_ja || "",
      description_pt: technique.description_pt || "",
      category: technique.category as "pull" | "control" | "submission",
    });
    setShowEditDialog(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTechnique) return;

    setIsLoading(true);
    setUploadingVideo(true);

    try {
      let videoUrl = editingTechnique.video_url;

      if (videoFile) {
        const newVideoUrl = await handleVideoUpload(videoFile);
        if (!newVideoUrl) {
          throw new Error("Failed to upload video");
        }
        videoUrl = newVideoUrl;
      }

      const { error } = await supabase
        .from("techniques")
        .update({
          ...formData,
          video_url: videoUrl,
        })
        .eq("id", editingTechnique.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Technique updated successfully",
      });

      setShowEditDialog(false);
      setEditingTechnique(null);
      setFormData({
        name: "",
        name_ja: "",
        name_pt: "",
        description: "",
        description_ja: "",
        description_pt: "",
        category: "pull",
      });
      setVideoFile(null);

      loadTechniques();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setUploadingVideo(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this technique?")) return;

    const { error } = await supabase.from("techniques").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Technique deleted successfully",
    });

    loadTechniques();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin");
  };

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

      setProfiles(data || []);
      toast({
        title: "読み込み完了",
        description: `${data?.length || 0}件の会員を読み込みました`,
      });
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingProfiles(false);
    }
  };

  const handleEditProfile = (profile: Profile) => {
    setEditingProfile(profile);
    setShowEditProfileDialog(true);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !adminPassword) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: {
          action: "update",
          password: adminPassword,
          id: editingProfile.id,
          stripe_customer_id: editingProfile.stripe_customer_id,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "更新完了",
        description: "会員情報を更新しました",
      });

      setShowEditProfileDialog(false);
      setEditingProfile(null);
      loadProfiles();
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: newUserData,
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "ユーザー作成成功",
        description: `${newUserData.email} を作成しました`,
      });

      setShowCreateUserDialog(false);
      setNewUserData({
        email: "",
        password: "",
        role: "user",
      });
      
      // Reload profiles if admin password is set
      if (adminPassword) {
        loadProfiles();
      }
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAdmin = async (userId: string, isCurrentlyAdmin: boolean) => {
    setIsLoading(true);
    try {
      if (isCurrentlyAdmin) {
        // Remove admin role
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");

        if (error) throw error;

        toast({
          title: "管理者権限を削除しました",
          description: "ユーザーの管理者権限を削除しました",
        });
      } else {
        // Add admin role
        const { error } = await supabase
          .from("user_roles")
          .insert({
            user_id: userId,
            role: "admin",
          });

        if (error) throw error;

        toast({
          title: "管理者権限を付与しました",
          description: "ユーザーを管理者に設定しました",
        });
      }

      loadProfiles();
    } catch (error: any) {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-12">
            <h1 className="text-4xl font-light">Admin Dashboard</h1>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>

          <Tabs defaultValue="techniques" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="techniques">テクニック管理</TabsTrigger>
              <TabsTrigger value="users">
                <Users className="w-4 h-4 mr-2" />
                会員管理
              </TabsTrigger>
            </TabsList>

            <TabsContent value="techniques">{/* ... keep existing code */}

          {/* Add Technique Form */}
          <div className="border border-border p-8 mb-12">
            <h2 className="text-2xl font-light mb-6">Add New Technique</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm mb-2">Name (EN)</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Name (JA)</label>
                  <Input
                    value={formData.name_ja}
                    onChange={(e) => setFormData({ ...formData, name_ja: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Name (PT)</label>
                  <Input
                    value={formData.name_pt}
                    onChange={(e) => setFormData({ ...formData, name_pt: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm mb-2">Description (EN)</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Description (JA)</label>
                  <Textarea
                    value={formData.description_ja}
                    onChange={(e) => setFormData({ ...formData, description_ja: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Description (PT)</label>
                  <Textarea
                    value={formData.description_pt}
                    onChange={(e) => setFormData({ ...formData, description_pt: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2">Category</label>
                <Select
                  value={formData.category}
                  onValueChange={(value: any) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pull">Pull</SelectItem>
                    <SelectItem value="control">Control</SelectItem>
                    <SelectItem value="submission">Submission</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm mb-2">Video File</label>
                <div className="border border-border p-4 rounded">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    className="w-full"
                  />
                  {uploadingVideo && (
                    <p className="text-sm text-muted-foreground mt-2">Uploading video...</p>
                  )}
                </div>
              </div>

              <Button type="submit" size="lg" disabled={isLoading}>
                <Upload className="w-4 h-4 mr-2" />
                {isLoading ? "Adding..." : "Add Technique"}
              </Button>
            </form>
          </div>

          {/* Techniques List */}
          <div>
            <h2 className="text-2xl font-light mb-6">Existing Techniques</h2>

            <div className="grid gap-4">
              {techniques.map((technique) => (
                <div key={technique.id} className="border border-border p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-light mb-2">{technique.name}</h3>
                      <p className="text-sm text-muted-foreground mb-1">{technique.name_ja}</p>
                      <p className="text-sm text-muted-foreground mb-2">{technique.name_pt}</p>
                      <span className="inline-block px-3 py-1 text-xs border border-border">
                        {technique.category}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(technique)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(technique.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {technique.video_url && (
                    <div className="mt-4">
                      <video
                        src={technique.video_url}
                        controls
                        className="w-full max-w-2xl rounded border border-border"
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
            </TabsContent>

            <TabsContent value="users">
              <div className="border border-border p-8 mb-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-light mb-2">ユーザー管理</h2>
                    <p className="text-sm text-muted-foreground">
                      新規ユーザーの作成と既存ユーザーの管理
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={loadProfiles} disabled={loadingProfiles}>
                      {loadingProfiles ? "更新中..." : "一覧を更新"}
                    </Button>
                    <Button onClick={() => setShowCreateUserDialog(true)}>
                      <Users className="w-4 h-4 mr-2" />
                      新規ユーザー作成
                    </Button>
                  </div>
                </div>
              </div>

              {loadingProfiles ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">読み込み中...</p>
                </div>
              ) : profiles.length > 0 ? (
                <div>
                  <h2 className="text-2xl font-light mb-6">会員一覧 ({profiles.length}名)</h2>
                  <div className="space-y-4">
                    {profiles.map((profile) => {
                      const isAdmin = profile.user_roles?.some(role => role.role === 'admin') || false;
                      return (
                        <div key={profile.id} className="border border-border p-6">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <p className="text-sm text-muted-foreground">メール: {profile.email || "未設定"}</p>
                                {isAdmin && (
                                  <span className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded">
                                    管理者
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mb-1">ID: {profile.id}</p>
                              <p className="text-xs text-muted-foreground mb-1">
                                登録日: {new Date(profile.created_at).toLocaleDateString("ja-JP")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Stripe ID: {profile.stripe_customer_id || "未設定"}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant={isAdmin ? "destructive" : "default"}
                                size="sm"
                                onClick={() => handleToggleAdmin(profile.id, isAdmin)}
                                disabled={isLoading}
                              >
                                {isAdmin ? "管理者解除" : "管理者に設定"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditProfile(profile)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 border border-border rounded-lg">
                  <p className="text-muted-foreground">会員が登録されていません</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Technique</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm mb-2">Name (EN)</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Name (JA)</label>
                <Input
                  value={formData.name_ja}
                  onChange={(e) => setFormData({ ...formData, name_ja: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Name (PT)</label>
                <Input
                  value={formData.name_pt}
                  onChange={(e) => setFormData({ ...formData, name_pt: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm mb-2">Description (EN)</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Description (JA)</label>
                <Textarea
                  value={formData.description_ja}
                  onChange={(e) => setFormData({ ...formData, description_ja: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Description (PT)</label>
                <Textarea
                  value={formData.description_pt}
                  onChange={(e) => setFormData({ ...formData, description_pt: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2">Category</label>
              <Select
                value={formData.category}
                onValueChange={(value: any) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pull">Pull</SelectItem>
                  <SelectItem value="control">Control</SelectItem>
                  <SelectItem value="submission">Submission</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm mb-2">Video File (leave empty to keep current)</label>
              <div className="border border-border p-4 rounded">
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="w-full"
                />
                {uploadingVideo && (
                  <p className="text-sm text-muted-foreground mt-2">Uploading video...</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Technique"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfileDialog} onOpenChange={setShowEditProfileDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>会員情報編集</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm mb-2">メールアドレス</label>
              <Input value={editingProfile?.email || ""} disabled />
            </div>

            <div>
              <label className="block text-sm mb-2">Stripe Customer ID</label>
              <Input
                value={editingProfile?.stripe_customer_id || ""}
                onChange={(e) => setEditingProfile(editingProfile ? {
                  ...editingProfile,
                  stripe_customer_id: e.target.value
                } : null)}
                placeholder="cus_xxxxx"
              />
            </div>

            <Button type="submit" size="lg" disabled={isLoading} className="w-full">
              {isLoading ? "更新中..." : "更新"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={showCreateUserDialog} onOpenChange={setShowCreateUserDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新規ユーザー作成</DialogTitle>
            <DialogPrimitive.Description className="text-sm text-muted-foreground">
              新しいユーザーアカウントを作成します
            </DialogPrimitive.Description>
          </DialogHeader>
          
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-sm mb-2">メールアドレス</label>
              <Input
                type="email"
                value={newUserData.email}
                onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                placeholder="user@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-2">パスワード</label>
              <Input
                type="password"
                value={newUserData.password}
                onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                placeholder="パスワード（6文字以上）"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm mb-2">ロール</label>
              <Select
                value={newUserData.role}
                onValueChange={(value: "admin" | "user") => setNewUserData({ ...newUserData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">一般ユーザー</SelectItem>
                  <SelectItem value="admin">管理者</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button type="submit" size="lg" disabled={isLoading} className="flex-1">
                {isLoading ? "作成中..." : "ユーザーを作成"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowCreateUserDialog(false)}
                disabled={isLoading}
              >
                キャンセル
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
