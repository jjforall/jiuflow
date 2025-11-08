import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { Upload, Trash2, Edit, Users, ShieldCheck, Search, Key } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlansTab } from "@/components/admin/PlansTab";

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

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'complete' | 'error';
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
  const [uploadQueue, setUploadQueue] = useState<UploadProgress[]>([]);
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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "email" | "role">("date");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordChangeUserId, setPasswordChangeUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    name_ja: "",
    name_pt: "",
    description: "",
    description_ja: "",
    description_pt: "",
    category: "pull" as "pull" | "control" | "submission" | "pass-guard",
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

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

  const handleVideoUpload = async (file: File, progressId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `videos/${fileName}`;

      // Update progress to uploading
      setUploadQueue(prev => prev.map(item => 
        item.fileName === progressId 
          ? { ...item, progress: 0, status: 'uploading' as const }
          : item
      ));

      // Simulate upload progress (Supabase doesn't provide real-time progress)
      const progressInterval = setInterval(() => {
        setUploadQueue(prev => prev.map(item => 
          item.fileName === progressId && item.progress < 90
            ? { ...item, progress: item.progress + 10 }
            : item
        ));
      }, 300);

      const { error: uploadError } = await supabase.storage
        .from("technique-videos")
        .upload(filePath, file);

      clearInterval(progressInterval);

      if (uploadError) {
        setUploadQueue(prev => prev.map(item => 
          item.fileName === progressId 
            ? { ...item, status: 'error' as const }
            : item
        ));
        throw uploadError;
      }

      const { data } = supabase.storage
        .from("technique-videos")
        .getPublicUrl(filePath);

      // Update progress to complete
      setUploadQueue(prev => prev.map(item => 
        item.fileName === progressId 
          ? { ...item, progress: 100, status: 'complete' as const }
          : item
      ));

      // Remove from queue after 2 seconds
      setTimeout(() => {
        setUploadQueue(prev => prev.filter(item => item.fileName !== progressId));
      }, 2000);

      return data.publicUrl;
    } catch (error) {
      console.error("Video upload error:", error);
      return null;
    }
  };

  const handleTranslate = async (text: string, field: 'name' | 'description') => {
    if (!text.trim()) return;
    
    setIsTranslating(true);
    try {
      // Translate to English
      const enResponse = await supabase.functions.invoke('translate-technique', {
        body: { text, targetLang: 'en' }
      });

      if (enResponse.error) throw enResponse.error;

      // Translate to Portuguese
      const ptResponse = await supabase.functions.invoke('translate-technique', {
        body: { text, targetLang: 'pt' }
      });

      if (ptResponse.error) throw ptResponse.error;

      // Update form data with translations
      if (field === 'name') {
        setFormData(prev => ({
          ...prev,
          name: enResponse.data.translatedText,
          name_pt: ptResponse.data.translatedText
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          description: enResponse.data.translatedText,
          description_pt: ptResponse.data.translatedText
        }));
      }

      toast({
        title: "翻訳完了",
        description: "英語とポルトガル語への翻訳が完了しました。必要に応じて編集してください。",
      });
    } catch (error: any) {
      toast({
        title: "翻訳エラー",
        description: error.message || "翻訳に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsTranslating(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name_ja) {
      toast({
        title: "エラー",
        description: "日本語の名前を入力してください",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      let videoUrl = null;
      const progressId = `upload-${Date.now()}`;

      if (videoFile) {
        // Add to upload queue
        setUploadQueue(prev => [...prev, {
          fileName: videoFile.name,
          progress: 0,
          status: 'uploading',
        }]);

        // Upload video in background (non-blocking)
        handleVideoUpload(videoFile, videoFile.name).then(url => {
          if (url) {
            // Update the technique with video URL after upload completes
            supabase
              .from("techniques")
              .update({ video_url: url })
              .eq("name_ja", formData.name_ja)
              .then(() => {
                toast({
                  title: "ビデオアップロード完了",
                  description: `${videoFile.name} のアップロードが完了しました`,
                });
                loadTechniques();
              });
          }
        });
      }

      // Insert technique immediately without waiting for video
      const { error } = await supabase.from("techniques").insert({
        ...formData,
        video_url: videoUrl,
        display_order: techniques.length,
      });

      if (error) throw error;

      toast({
        title: "テクニック追加完了",
        description: videoFile 
          ? "テクニックを追加しました。ビデオは背景でアップロード中です。"
          : "テクニックを追加しました",
      });

      // Reset form immediately so user can continue
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
        title: "エラー",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
      category: technique.category as "pull" | "control" | "submission" | "pass-guard",
    });
    setShowEditDialog(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTechnique) return;

    setIsLoading(true);

    try {
      let videoUrl = editingTechnique.video_url;

      if (videoFile) {
        // Add to upload queue
        setUploadQueue(prev => [...prev, {
          fileName: videoFile.name,
          progress: 0,
          status: 'uploading',
        }]);

        // Upload in background
        handleVideoUpload(videoFile, videoFile.name).then(url => {
          if (url) {
            supabase
              .from("techniques")
              .update({ video_url: url })
              .eq("id", editingTechnique.id)
              .then(() => {
                toast({
                  title: "ビデオアップロード完了",
                  description: `${videoFile.name} のアップロードが完了しました`,
                });
                loadTechniques();
              });
          }
        });
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
        title: "更新完了",
        description: videoFile
          ? "テクニックを更新しました。ビデオは背景でアップロード中です。"
          : "テクニックを更新しました",
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

      const sorted = (data || []).sort((a, b) => {
        const aAdmin = a.user_roles?.some(r => r.role === 'admin') ? 1 : 0;
        const bAdmin = b.user_roles?.some(r => r.role === 'admin') ? 1 : 0;
        return bAdmin - aAdmin || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setProfiles(sorted);
      toast({
        title: "読み込み完了",
        description: `${sorted.length}件の会員を読み込みました（管理者${sorted.filter(p => p.user_roles?.some(r => r.role === 'admin')).length}名）`,
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
      const { data, error } = await supabase.functions.invoke("manage-roles", {
        body: {
          targetUserId: userId,
          makeAdmin: !isCurrentlyAdmin,
        },
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast({
        title: !isCurrentlyAdmin ? "管理者権限を付与しました" : "管理者権限を削除しました",
        description: !isCurrentlyAdmin ? "ユーザーを管理者に設定しました" : "ユーザーの管理者権限を削除しました",
      });

      loadProfiles();
    } catch (error: any) {
      console.error("Toggle admin error:", error);
      toast({
        title: "エラー",
        description: error.message || "権限の変更に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordChangeUserId || !newPassword) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-user-password", {
        body: {
          userId: passwordChangeUserId,
          newPassword: newPassword,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "パスワード変更完了",
        description: "ユーザーのパスワードを変更しました",
      });

      setShowPasswordDialog(false);
      setPasswordChangeUserId(null);
      setNewPassword("");
    } catch (error: any) {
      console.error("Password change error:", error);
      toast({
        title: "エラー",
        description: error.message || "パスワードの変更に失敗しました",
        variant: "destructive",
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
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="techniques">テクニック管理</TabsTrigger>
              <TabsTrigger value="users">
                <Users className="w-4 h-4 mr-2" />
                会員管理
              </TabsTrigger>
              <TabsTrigger value="plans">
                <ShieldCheck className="w-4 h-4 mr-2" />
                プラン管理
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
                    placeholder="自動翻訳後に編集可能"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Name (JA) *</label>
                  <Input
                    value={formData.name_ja}
                    onChange={(e) => setFormData({ ...formData, name_ja: e.target.value })}
                    onBlur={(e) => {
                      if (e.target.value && !formData.name && !formData.name_pt) {
                        handleTranslate(e.target.value, 'name');
                      }
                    }}
                    placeholder="日本語で入力すると自動翻訳されます"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Name (PT)</label>
                  <Input
                    value={formData.name_pt}
                    onChange={(e) => setFormData({ ...formData, name_pt: e.target.value })}
                    placeholder="自動翻訳後に編集可能"
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
                    placeholder="自動翻訳後に編集可能"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Description (JA)</label>
                  <Textarea
                    value={formData.description_ja}
                    onChange={(e) => setFormData({ ...formData, description_ja: e.target.value })}
                    onBlur={(e) => {
                      if (e.target.value && !formData.description && !formData.description_pt) {
                        handleTranslate(e.target.value, 'description');
                      }
                    }}
                    placeholder="日本語で入力すると自動翻訳されます"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">Description (PT)</label>
                  <Textarea
                    value={formData.description_pt}
                    onChange={(e) => setFormData({ ...formData, description_pt: e.target.value })}
                    placeholder="自動翻訳後に編集可能"
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
                    <SelectItem value="pull">Pull (引き込み)</SelectItem>
                    <SelectItem value="pass-guard">Pass Guard (ガード突破)</SelectItem>
                    <SelectItem value="control">Control (コントロール)</SelectItem>
                    <SelectItem value="submission">Submission (一本)</SelectItem>
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
                </div>
              </div>

              {/* Upload Progress Indicators */}
              {uploadQueue.length > 0 && (
                <div className="space-y-2 p-4 border border-border rounded">
                  <h3 className="text-sm font-medium mb-2">アップロード状況</h3>
                  {uploadQueue.map((upload, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="truncate max-w-xs">{upload.fileName}</span>
                        <span>{upload.progress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            upload.status === 'complete' ? 'bg-green-500' : 
                            upload.status === 'error' ? 'bg-red-500' : 
                            'bg-primary'
                          }`}
                          style={{ width: `${upload.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button type="submit" size="lg" disabled={isLoading || isTranslating}>
                <Upload className="w-4 h-4 mr-2" />
                {isTranslating ? "翻訳中..." : isLoading ? "追加中..." : "テクニックを追加"}
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

                <div className="flex gap-4 mt-6">
                  <div className="flex-1">
                    <Input
                      placeholder="メールアドレスまたはStripe IDで検索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="並び替え" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">登録日順</SelectItem>
                      <SelectItem value="email">メール順</SelectItem>
                      <SelectItem value="role">管理者優先</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {loadingProfiles ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">読み込み中...</p>
                </div>
              ) : (() => {
                // Filter and sort profiles
                let filtered = profiles.filter(profile => {
                  if (!searchQuery) return true;
                  const query = searchQuery.toLowerCase();
                  return (
                    profile.email?.toLowerCase().includes(query) ||
                    profile.stripe_customer_id?.toLowerCase().includes(query) ||
                    profile.id.toLowerCase().includes(query)
                  );
                });

                // Sort profiles
                filtered = [...filtered].sort((a, b) => {
                  if (sortBy === "date") {
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                  } else if (sortBy === "email") {
                    return (a.email || "").localeCompare(b.email || "");
                  } else if (sortBy === "role") {
                    const aAdmin = a.user_roles?.some(r => r.role === 'admin') ? 1 : 0;
                    const bAdmin = b.user_roles?.some(r => r.role === 'admin') ? 1 : 0;
                    return bAdmin - aAdmin || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                  }
                  return 0;
                });

                return filtered.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-light flex items-center gap-3">
                        会員一覧 ({filtered.length}/{profiles.length}名)
                        <span className="inline-flex items-center gap-1 text-sm px-2 py-1 rounded bg-accent text-accent-foreground">
                          <ShieldCheck className="w-4 h-4" />
                          管理者 {filtered.filter(p => p.user_roles?.some(r => r.role === 'admin')).length}名
                        </span>
                      </h2>
                    </div>
                    
                    <div className="border border-border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border bg-muted/50">
                              <th className="text-left p-4 font-medium">ロール</th>
                              <th className="text-left p-4 font-medium">メールアドレス</th>
                              <th className="text-left p-4 font-medium">登録日</th>
                              <th className="text-left p-4 font-medium">Stripe ID</th>
                              <th className="text-right p-4 font-medium">操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map((profile, index) => {
                              const isAdmin = profile.user_roles?.some(role => role.role === 'admin') || false;
                              return (
                                <tr 
                                  key={profile.id} 
                                  className={`border-b border-border hover:bg-muted/50 transition-colors ${
                                    index % 2 === 0 ? '' : 'bg-muted/20'
                                  }`}
                                >
                                  <td className="p-4">
                                    {isAdmin ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded">
                                        <ShieldCheck className="w-3 h-3" />
                                        管理者
                                      </span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">一般</span>
                                    )}
                                  </td>
                                  <td className="p-4">
                                    <div>
                                      <p className="font-medium">{profile.email || "未設定"}</p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        ID: {profile.id.slice(0, 8)}...
                                      </p>
                                    </div>
                                  </td>
                                  <td className="p-4 text-sm">
                                    {new Date(profile.created_at).toLocaleDateString("ja-JP", {
                                      year: 'numeric',
                                      month: '2-digit',
                                      day: '2-digit'
                                    })}
                                  </td>
                                  <td className="p-4 text-sm text-muted-foreground">
                                    {profile.stripe_customer_id ? (
                                      <code className="text-xs bg-muted px-2 py-1 rounded">
                                        {profile.stripe_customer_id.slice(0, 20)}...
                                      </code>
                                    ) : (
                                      "未設定"
                                    )}
                                  </td>
                                   <td className="p-4">
                                    <div className="flex gap-2 justify-end">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openPasswordDialog(profile.id)}
                                        disabled={isLoading}
                                      >
                                        <Key className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant={isAdmin ? "destructive" : "default"}
                                        size="sm"
                                        onClick={() => handleToggleAdmin(profile.id, isAdmin)}
                                        disabled={isLoading}
                                      >
                                        {isAdmin ? "管理者解除" : "管理者設定"}
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEditProfile(profile)}
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 border border-border rounded-lg">
                    <p className="text-muted-foreground">
                      {searchQuery ? "検索結果がありません" : "会員が登録されていません"}
                    </p>
                  </div>
                );
              })()}
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
                  <SelectItem value="pull">Pull (引き込み)</SelectItem>
                  <SelectItem value="pass-guard">Pass Guard (ガード突破)</SelectItem>
                  <SelectItem value="control">Control (コントロール)</SelectItem>
                  <SelectItem value="submission">Submission (一本)</SelectItem>
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

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>パスワード変更</DialogTitle>
            <DialogPrimitive.Description className="text-sm text-muted-foreground">
              ユーザーの新しいパスワードを設定します
            </DialogPrimitive.Description>
          </DialogHeader>
          
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm mb-2">新しいパスワード</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="新しいパスワード（6文字以上）"
                required
                minLength={6}
              />
              <p className="text-xs text-muted-foreground mt-2">
                ※ パスワードは6文字以上で設定してください
              </p>
            </div>

            <div className="flex gap-2">
              <Button type="submit" size="lg" disabled={isLoading} className="flex-1">
                {isLoading ? "変更中..." : "パスワードを変更"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowPasswordDialog(false);
                  setNewPassword("");
                }}
                disabled={isLoading}
              >
                キャンセル
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <TabsContent value="plans">
        <PlansTab />
      </TabsContent>
    </div>
  );
};

export default AdminDashboard;
