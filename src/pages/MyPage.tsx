import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputWithSuggestions } from "@/components/ui/input-with-suggestions";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BeltBadge } from "@/components/ui/belt-badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { User, CreditCard, Calendar, Mail, Upload, Video, Eye, Edit2, Check, X, Trash2, Lock, Globe, Plus } from "lucide-react";
import { toast } from "sonner";
import { VideoUploadDialog } from "@/components/VideoUploadDialog";
import { VideoEditDialog } from "@/components/VideoEditDialog";
import { UserVideoCard } from "@/components/UserVideoCard";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarUploadDialog } from "@/components/AvatarUploadDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SubscriptionStatus {
  subscribed: boolean;
  product_id?: string;
  price_id?: string;
  subscription_end?: string;
  is_trialing?: boolean;
}

interface UserVideo {
  id: string;
  title: string;
  description: string | null;
  video_type: string;
  video_url: string;
  thumbnail_url: string | null;
  view_count: number;
  price: number;
  is_public: boolean;
  created_at: string;
}

interface Profile {
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  username: string | null;
  organization_id: string | null;
  education: Array<{school: string; degree?: string; period?: string}> | null;
  work_experience: Array<{company: string; position: string; period?: string; description?: string}> | null;
  belt_history: Array<{belt: string; date?: string; instructor?: string}> | null;
  home_dojo: string | null;
  training_locations: Array<string> | null;
  titles: Array<{title: string; date?: string; organization?: string}> | null;
}

const MyPage = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [userVideos, setUserVideos] = useState<UserVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<string>("");
  const [userPoints, setUserPoints] = useState<number>(0);
  const [pointsLoading, setPointsLoading] = useState(true);
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [editedCode, setEditedCode] = useState("");
  const [editingVideo, setEditingVideo] = useState<UserVideo | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [dojoSuggestions, setDojoSuggestions] = useState<string[]>([]);
  const [instructorSuggestions, setInstructorSuggestions] = useState<string[]>([]);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; name_ja: string; name_pt: string }>>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<string | null>(null);

  const loadUserVideos = async () => {
    if (!user) return;
    
    setVideosLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_videos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserVideos(data || []);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setVideosLoading(false);
    }
  };

  const checkAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }
    setUser(session.user);
    await checkSubscription();
  }, [navigate]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user) {
      loadUserVideos();
      loadReferralCodeAndPoints();
      loadProfile();
      loadDojoSuggestions();
      loadInstructorSuggestions();
      loadOrganizations();
    }
  }, [user]);

  const loadOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, name_ja, name_pt')
        .order('name');
      
      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error loading organizations:', error);
    }
  };

  const loadDojoSuggestions = async () => {
    try {
      // Default suggestions for common dojos and locations
      const defaultSuggestions = [
        'トライフォース赤坂',
        'トライフォース池袋',
        'トライフォース青山',
        'グレイシー・バッハ東京',
        'パラエストラ東京',
        'ブルテリア柔術アカデミー',
        'アライアンス柔術アカデミー',
        'ドゥマウ柔術アカデミー',
        'カーペ・ディエム',
        'コブリンハ柔術',
        'レノンGT',
        'グレイシーバッハ',
        'グレイシー柔術アカデミー',
        'ヒクソン・グレイシー',
        'カールソン・グレイシー',
        'アカデミア柔術',
        'ルータ・リーブレ',
        'その他道場',
      ];

      const { data, error } = await supabase
        .from('profiles')
        .select('home_dojo, training_locations');

      if (error) throw error;

      const dojos = new Set<string>(defaultSuggestions);
      
      data?.forEach((profile) => {
        if (profile.home_dojo) {
          dojos.add(profile.home_dojo);
        }
        if (profile.training_locations) {
          (profile.training_locations as string[]).forEach((loc) => {
            if (loc) dojos.add(loc);
          });
        }
      });

      setDojoSuggestions(Array.from(dojos).sort());
    } catch (error) {
      console.error('Error loading dojo suggestions:', error);
    }
  };

  const loadInstructorSuggestions = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('belt_history');

      if (error) throw error;

      const instructors = new Set<string>();
      
      data?.forEach((profile) => {
        if (profile.belt_history) {
          (profile.belt_history as any[]).forEach((belt: any) => {
            if (belt.instructor) instructors.add(belt.instructor);
          });
        }
      });

      setInstructorSuggestions(Array.from(instructors).sort());
    } catch (error) {
      console.error('Error loading instructor suggestions:', error);
    }
  };

  const loadProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, bio, avatar_url, username, education, work_experience, belt_history, home_dojo, training_locations, titles, created_at, cover_image_url, organization_id')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      setProfile({
        ...data,
        education: (data.education as any) || [],
        work_experience: (data.work_experience as any) || [],
        belt_history: (data.belt_history as any) || [],
        training_locations: (data.training_locations as any) || [],
        titles: (data.titles as any) || []
      });
      setCreatedAt(data.created_at);
      setSelectedOrganization(data.organization_id);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadReferralCodeAndPoints = async () => {
    if (!user) return;
    
    setPointsLoading(true);
    try {
      // Load referral code
      const { data: codeData, error: codeError } = await supabase
        .from('referral_codes')
        .select('code')
        .eq('user_id', user.id)
        .maybeSingle();

      if (codeError) {
        console.error('Error loading referral code:', codeError);
      }

      if (codeData) {
        setReferralCode(codeData.code);
        
        // Create Stripe coupon for this referral code
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.functions.invoke('create-referral-coupon', {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });
        }
      } else {
        // Generate new referral code if none exists
        const newCode = generateReferralCode();
        const { error: insertError } = await supabase
          .from('referral_codes')
          .insert({
            user_id: user.id,
            code: newCode,
          });

        if (!insertError) {
          setReferralCode(newCode);
          
          // Create Stripe coupon for the new code
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await supabase.functions.invoke('create-referral-coupon', {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            });
          }
        }
      }

      // Load points
      const { data: pointsData, error: pointsError } = await supabase
        .from('user_points')
        .select('points')
        .eq('user_id', user.id)
        .maybeSingle();

      if (pointsError) {
        console.error('Error loading points:', pointsError);
      }
      
      setUserPoints(pointsData?.points || 0);
      
      // Initialize points if not exists
      if (!pointsData) {
        await supabase
          .from('user_points')
          .insert({
            user_id: user.id,
            points: 0,
          });
      }
    } catch (error) {
      console.error('Error loading referral code and points:', error);
    } finally {
      setPointsLoading(false);
    }
  };

  const generateReferralCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  };

  const handleEditVideo = (video: UserVideo) => {
    setEditingVideo(video);
    setEditDialogOpen(true);
  };

  const handleDeleteVideo = (videoId: string) => {
    setDeletingVideoId(videoId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteVideo = async () => {
    if (!deletingVideoId) return;

    try {
      const { error } = await supabase
        .from('user_videos')
        .delete()
        .eq('id', deletingVideoId);

      if (error) throw error;

      toast.success(language === "ja" ? "動画を削除しました" : "Video deleted");
      loadUserVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error(language === "ja" ? "削除に失敗しました" : "Failed to delete");
    } finally {
      setDeleteDialogOpen(false);
      setDeletingVideoId(null);
    }
  };

  const copyProfileUrl = () => {
    const url = `${window.location.origin}/user/${user?.id}`;
    navigator.clipboard.writeText(url);
    toast.success(language === "ja" ? "プロフィールURLをコピーしました" : "Profile URL copied");
  };

  const startEditing = (field: string, currentValue: any) => {
    setEditingField(field);
    setEditValues({ ...editValues, [field]: currentValue });
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValues({});
  };

  const saveField = async (field: string) => {
    if (!user || !profile) return;

    try {
      const updateData: any = {};
      
      if (field === 'display_name') {
        updateData.display_name = editValues.display_name?.trim() || null;
      } else if (field === 'bio') {
        updateData.bio = editValues.bio?.trim() || null;
      } else if (field === 'education') {
        // Filter out empty entries
        const validEducation = (editValues.education || []).filter((edu: any) => 
          edu.school && edu.school.trim()
        );
        updateData.education = validEducation;
      } else if (field === 'work_experience') {
        // Filter out empty entries
        const validWork = (editValues.work_experience || []).filter((work: any) => 
          work.company && work.company.trim() && work.position && work.position.trim()
        );
        updateData.work_experience = validWork;
      } else if (field === 'belt_history') {
        // Filter out empty entries
        const validBelts = (editValues.belt_history || []).filter((belt: any) => 
          belt.belt && belt.belt.trim()
        );
        updateData.belt_history = validBelts;
      } else if (field === 'home_dojo') {
        updateData.home_dojo = editValues.home_dojo?.trim() || null;
      } else if (field === 'training_locations') {
        // Filter out empty entries
        const validLocations = (editValues.training_locations || []).filter((loc: string) => 
          loc && loc.trim()
        );
        updateData.training_locations = validLocations;
      } else if (field === 'titles') {
        // Filter out empty entries
        const validTitles = (editValues.titles || []).filter((title: any) => 
          title.title && title.title.trim()
        );
        updateData.titles = validTitles;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      setProfile({ ...profile, ...updateData });
      toast.success(language === "ja" ? "更新しました" : "Updated");
      setEditingField(null);
      setEditValues({});
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(language === "ja" ? "更新に失敗しました" : "Update failed");
    }
  };

  const addEducation = () => {
    const newEducation = [...(editValues.education || profile?.education || []), { school: "" }];
    setEditValues({ ...editValues, education: newEducation });
  };

  const updateEducation = (index: number, field: string, value: string) => {
    const newEducation = [...(editValues.education || [])];
    newEducation[index] = { ...newEducation[index], [field]: value };
    setEditValues({ ...editValues, education: newEducation });
  };

  const removeEducation = (index: number) => {
    const newEducation = (editValues.education || []).filter((_: any, i: number) => i !== index);
    setEditValues({ ...editValues, education: newEducation });
  };

  const addWorkExperience = () => {
    const newWork = [...(editValues.work_experience || profile?.work_experience || []), { company: "", position: "" }];
    setEditValues({ ...editValues, work_experience: newWork });
  };

  const updateWorkExperience = (index: number, field: string, value: string) => {
    const newWork = [...(editValues.work_experience || [])];
    newWork[index] = { ...newWork[index], [field]: value };
    setEditValues({ ...editValues, work_experience: newWork });
  };

  const removeWorkExperience = (index: number) => {
    const newWork = (editValues.work_experience || []).filter((_: any, i: number) => i !== index);
    setEditValues({ ...editValues, work_experience: newWork });
  };

  const addBeltHistory = () => {
    const newBelts = [...(editValues.belt_history || profile?.belt_history || []), { belt: "" }];
    setEditValues({ ...editValues, belt_history: newBelts });
  };

  const updateBeltHistory = (index: number, field: string, value: string) => {
    const newBelts = [...(editValues.belt_history || [])];
    newBelts[index] = { ...newBelts[index], [field]: value };
    setEditValues({ ...editValues, belt_history: newBelts });
  };

  const removeBeltHistory = (index: number) => {
    const newBelts = (editValues.belt_history || []).filter((_: any, i: number) => i !== index);
    setEditValues({ ...editValues, belt_history: newBelts });
  };

  const addTrainingLocation = () => {
    const newLocations = [...(editValues.training_locations || profile?.training_locations || []), ""];
    setEditValues({ ...editValues, training_locations: newLocations });
  };

  const updateTrainingLocation = (index: number, value: string) => {
    const newLocations = [...(editValues.training_locations || [])];
    newLocations[index] = value;
    setEditValues({ ...editValues, training_locations: newLocations });
  };

  const removeTrainingLocation = (index: number) => {
    const newLocations = (editValues.training_locations || []).filter((_: any, i: number) => i !== index);
    setEditValues({ ...editValues, training_locations: newLocations });
  };

  const addTitle = () => {
    const newTitles = [...(editValues.titles || profile?.titles || []), { title: "" }];
    setEditValues({ ...editValues, titles: newTitles });
  };

  const updateTitle = (index: number, field: string, value: string) => {
    const newTitles = [...(editValues.titles || [])];
    newTitles[index] = { ...newTitles[index], [field]: value };
    setEditValues({ ...editValues, titles: newTitles });
  };

  const removeTitle = (index: number) => {
    const newTitles = (editValues.titles || []).filter((_: any, i: number) => i !== index);
    setEditValues({ ...editValues, titles: newTitles });
  };

  const updateReferralCode = async (newCode: string) => {
    if (!user) return;
    
    const trimmedCode = newCode.trim().toUpperCase();
    if (trimmedCode.length < 4 || trimmedCode.length > 12) {
      toast.error(language === "ja" ? "コードは4〜12文字で入力してください" : "Code must be 4-12 characters");
      return;
    }

    if (!/^[A-Z0-9]+$/.test(trimmedCode)) {
      toast.error(language === "ja" ? "英数字のみ使用できます" : "Only alphanumeric characters allowed");
      return;
    }

    try {
      // Check if code is already taken
      const { data: existingCode } = await supabase
        .from('referral_codes')
        .select('code')
        .eq('code', trimmedCode)
        .neq('user_id', user.id)
        .maybeSingle();

      if (existingCode) {
        toast.error(language === "ja" ? "このコードは既に使用されています" : "This code is already taken");
        return;
      }

      // Update the code
      const { error } = await supabase
        .from('referral_codes')
        .update({ code: trimmedCode })
        .eq('user_id', user.id);

      if (error) throw error;

      setReferralCode(trimmedCode);
      toast.success(language === "ja" ? "紹介コードを更新しました" : "Referral code updated");

      // Create Stripe coupon for the new code
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.functions.invoke('create-referral-coupon', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
      }
    } catch (error) {
      console.error('Error updating referral code:', error);
      toast.error(language === "ja" ? "コードの更新に失敗しました" : "Failed to update code");
    }
  };

  const checkSubscription = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(language === "ja" ? "ログインが必要です" : "Login required");
        navigate("/login");
        return;
      }

      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (error) throw error;
      setSubscription(data);

      // Award monthly points if subscribed
      if (data?.subscribed) {
        try {
          await supabase.functions.invoke("award-monthly-points", {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });
          // Reload points after awarding
          loadReferralCodeAndPoints();
        } catch (pointsError) {
          console.error("Error awarding points:", pointsError);
        }
      }
    } catch (error: unknown) {
      console.error("Subscription check error:", error);
      toast.error(language === "ja" ? "サブスクリプション情報の取得に失敗しました" : "Failed to fetch subscription");
    } finally {
      setIsLoading(false);
    }
  };

  const getPlanName = (priceId?: string) => {
    // サブスク中だが price_id が取れていないケースでは「未登録」ではなく「有効なプラン」と表示
    if (!priceId) {
      return language === "ja"
        ? "有効なプラン"
        : language === "pt"
          ? "Plano ativo"
          : "Active Plan";
    }
    
    // Map Stripe price IDs to plan names
    const priceMapping: Record<string, string> = {
      "price_1SR3ZmDqLakc8NxkNdqL5BtO": "founder",
      "price_1SNQoeDqLakc8NxkEUVTTs3k": "monthly",
      "price_1SNQoqDqLakc8NxkOaQIL8wX": "annual",
      "price_1SY2D0DqLakc8NxkMKonyIi8": "muratabros",
      "price_1SYK2lDqLakc8Nxkp6TBKYhT": "referral"
    };

    const planType = priceMapping[priceId] || "unknown";
    
    const plans: Record<string, Record<string, string>> = {
      founder: {
        ja: "Founder Plan (¥980/月)",
        en: "Founder Plan (¥980/month)",
        pt: "Founder Plan (¥980/mês)"
      },
      monthly: {
        ja: "月額プラン (¥2,900/月)",
        en: "Monthly Plan (¥2,900/month)",
        pt: "Plano Mensal (¥2,900/mês)"
      },
      annual: {
        ja: "年額プラン (¥29,000/年)",
        en: "Annual Plan (¥29,000/year)",
        pt: "Plano Anual (¥29,000/ano)"
      },
      muratabros: {
        ja: "Founder Plan Pro (¥50,000)",
        en: "Founder Plan Pro (¥50,000)",
        pt: "Founder Plan Pro (¥50,000)"
      },
      referral: {
        ja: "紹介プラン (¥1,900/月)",
        en: "Referral Plan (¥1,900/month)",
        pt: "Plano de Referência (¥1,900/mês)"
      }
    };

    return plans[planType]?.[language] || priceId;
  };
  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString(language === "ja" ? "ja-JP" : language === "pt" ? "pt-BR" : "en-US");
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative mb-16 animate-fade-up">
            {/* Cover Image Area */}
            <div className="h-48 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20 rounded-t-2xl" />
            
            {/* Profile Header */}
            <div className="px-6 -mt-16">
              <div className="flex items-end justify-between">
                <div className="relative group">
                  <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-3xl">
                      {profile?.display_name?.[0] || profile?.username?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute bottom-0 right-0 rounded-full w-10 h-10 p-0 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setAvatarDialogOpen(true)}
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => window.open(`/user/${user?.id}`, '_blank')}
                  className="gap-2 mb-4"
                >
                  <ExternalLink className="w-4 h-4" />
                  {language === "ja" ? "公開プロフィール" : "View Profile"}
                </Button>
              </div>
              
              <div className="mt-4">
                <h1 className="text-3xl font-bold mb-1">
                  {profile?.display_name || profile?.username || user?.email?.split('@')[0] || "ユーザー"}
                </h1>
                <p className="text-muted-foreground mb-3">
                  {profile?.bio || (language === "ja" ? "自己紹介を追加してください" : "Add your bio")}
                </p>
                
                {/* Stats */}
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="font-bold">{userVideos.length}</span>
                    <span className="text-muted-foreground ml-1">{language === "ja" ? "動画" : "Videos"}</span>
                  </div>
                  <div>
                    <span className="font-bold">{userPoints.toLocaleString()}</span>
                    <span className="text-muted-foreground ml-1">{language === "ja" ? "ポイント" : "Points"}</span>
                  </div>
                  {profile?.titles && profile.titles.length > 0 && (
                    <div>
                      <span className="font-bold">{profile.titles.length}</span>
                      <span className="text-muted-foreground ml-1">{language === "ja" ? "タイトル" : "Titles"}</span>
                    </div>
                  )}
                  {createdAt && (
                    <div>
                      <span className="text-muted-foreground">{language === "ja" ? "登録日: " : "Joined: "}</span>
                      <span className="font-medium">{new Date(createdAt).toLocaleDateString(language === "ja" ? "ja-JP" : "en-US", { year: 'numeric', month: 'short' })}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="animate-fade-in space-y-8">
              <div className="grid md:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                  <div key={i} className="space-y-4 border border-border rounded-lg p-6">
                    <div className="h-6 w-1/3 bg-muted/50 animate-pulse rounded" />
                    <div className="space-y-3">
                      <div className="h-4 w-full bg-muted/50 animate-pulse rounded" />
                      <div className="h-4 w-3/4 bg-muted/50 animate-pulse rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* BJJ Profile Information Card */}
              <Card className="mb-6 animate-fade-up">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-light">
                    <Globe className="h-5 w-5 text-green-600" />
                    {language === "ja" ? "プロフィール詳細" : "Profile Details"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-start gap-6">
                      <div className="flex-1">
                        {editingField === 'display_name' ? (
                          <div className="flex items-center gap-2 mb-2">
                            <Input
                              value={editValues.display_name || ''}
                              onChange={(e) => setEditValues({ ...editValues, display_name: e.target.value })}
                              placeholder={language === "ja" ? "表示名" : "Display name"}
                              className="text-2xl font-light h-12"
                            />
                            <Button size="sm" onClick={() => saveField('display_name')}><Check className="w-4 h-4" /></Button>
                            <Button size="sm" variant="outline" onClick={cancelEditing}><X className="w-4 h-4" /></Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group mb-2">
                            <h2 className="text-2xl font-light">
                              {profile?.display_name || profile?.username || user?.email?.split('@')[0] || "ユーザー"}
                            </h2>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => startEditing('display_name', profile?.display_name)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}

                        {editingField === 'bio' ? (
                          <div className="flex items-start gap-2 mb-4">
                            <Textarea
                              value={editValues.bio || ''}
                              onChange={(e) => setEditValues({ ...editValues, bio: e.target.value })}
                              placeholder={language === "ja" ? "自己紹介" : "Bio"}
                              rows={3}
                            />
                            <div className="flex flex-col gap-2">
                              <Button size="sm" onClick={() => saveField('bio')}><Check className="w-4 h-4" /></Button>
                              <Button size="sm" variant="outline" onClick={cancelEditing}><X className="w-4 h-4" /></Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2 group mb-4">
                            <p className="text-muted-foreground flex-1">
                              {profile?.bio || (language === "ja" ? "自己紹介を追加" : "Add bio")}
                            </p>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => startEditing('bio', profile?.bio)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Organization Section */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2 group">
                        <h3 className="text-sm font-semibold">{language === "ja" ? "所属団体" : "Organization"}</h3>
                        {editingField !== 'organization' && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              setEditingField('organization');
                              setEditValues({ organization_id: selectedOrganization });
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {editingField === 'organization' ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editValues.organization_id || ''}
                            onChange={(e) => setEditValues({ ...editValues, organization_id: e.target.value || null })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">{language === "ja" ? "選択してください" : "Select"}</option>
                            {organizations.map((org) => (
                              <option key={org.id} value={org.id}>
                                {language === "ja" ? org.name_ja : language === "pt" ? org.name_pt : org.name}
                              </option>
                            ))}
                          </select>
                          <Button size="sm" onClick={async () => {
                            try {
                              const { error } = await supabase
                                .from('profiles')
                                .update({ organization_id: editValues.organization_id || null })
                                .eq('id', user.id);

                              if (error) throw error;

                              setSelectedOrganization(editValues.organization_id);
                              if (profile) {
                                setProfile({ ...profile, organization_id: editValues.organization_id });
                              }
                              toast.success(language === "ja" ? "更新しました" : "Updated");
                              setEditingField(null);
                              setEditValues({});
                            } catch (error) {
                              console.error('Error updating organization:', error);
                              toast.error(language === "ja" ? "更新に失敗しました" : "Update failed");
                            }
                          }}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEditing}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">
                          {selectedOrganization ? (
                            organizations.find(org => org.id === selectedOrganization)?.[
                              language === "ja" ? "name_ja" : language === "pt" ? "name_pt" : "name"
                            ] || (language === "ja" ? "未設定" : "Not set")
                          ) : (
                            language === "ja" ? "未設定" : "Not set"
                          )}
                        </p>
                      )}
                    </div>
                    
                    {/* Education Section */}
                    <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-sm font-semibold">{language === "ja" ? "学歴" : "Education"}</h3>
                          {editingField === 'education' && (
                            <Button size="sm" variant="ghost" onClick={addEducation}>
                              <Plus className="w-4 h-4" />
                            </Button>
                          )}
                          {editingField !== 'education' && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => startEditing('education', profile?.education || [])}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        {editingField === 'education' ? (
                          <div className="space-y-2">
                            {(editValues.education || []).map((edu: any, index: number) => (
                              <div key={index} className="flex items-start gap-2 p-2 border rounded">
                                <div className="flex-1 space-y-2">
                                  <Input
                                    value={edu.school || ''}
                                    onChange={(e) => updateEducation(index, 'school', e.target.value)}
                                    placeholder={language === "ja" ? "学校名" : "School"}
                                  />
                                  <Input
                                    value={edu.degree || ''}
                                    onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                                    placeholder={language === "ja" ? "学位/専攻" : "Degree"}
                                  />
                                  <Input
                                    value={edu.period || ''}
                                    onChange={(e) => updateEducation(index, 'period', e.target.value)}
                                    placeholder={language === "ja" ? "期間" : "Period"}
                                  />
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => removeEducation(index)}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => saveField('education')}><Check className="w-4 h-4 mr-1" /> {language === "ja" ? "保存" : "Save"}</Button>
                              <Button size="sm" variant="outline" onClick={cancelEditing}><X className="w-4 h-4 mr-1" /> {language === "ja" ? "キャンセル" : "Cancel"}</Button>
                            </div>
                          </div>
                        ) : (
                          profile?.education && profile.education.length > 0 ? (
                            <ul className="space-y-1">
                              {profile.education.map((edu, index) => (
                                <li key={index} className="text-sm text-muted-foreground">
                                  {edu.school}
                                  {edu.degree && ` - ${edu.degree}`}
                                  {edu.period && ` (${edu.period})`}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground">{language === "ja" ? "学歴を追加" : "Add education"}</p>
                          )
                        )}
                      </div>

                      {/* Work Experience Section */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-sm font-semibold">{language === "ja" ? "職歴" : "Work Experience"}</h3>
                          {editingField === 'work_experience' && (
                            <Button size="sm" variant="ghost" onClick={addWorkExperience}>
                              <Plus className="w-4 h-4" />
                            </Button>
                          )}
                          {editingField !== 'work_experience' && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => startEditing('work_experience', profile?.work_experience || [])}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        {editingField === 'work_experience' ? (
                          <div className="space-y-2">
                            {(editValues.work_experience || []).map((work: any, index: number) => (
                              <div key={index} className="flex items-start gap-2 p-2 border rounded">
                                <div className="flex-1 space-y-2">
                                  <Input
                                    value={work.company || ''}
                                    onChange={(e) => updateWorkExperience(index, 'company', e.target.value)}
                                    placeholder={language === "ja" ? "会社名" : "Company"}
                                  />
                                  <Input
                                    value={work.position || ''}
                                    onChange={(e) => updateWorkExperience(index, 'position', e.target.value)}
                                    placeholder={language === "ja" ? "役職" : "Position"}
                                  />
                                  <Input
                                    value={work.period || ''}
                                    onChange={(e) => updateWorkExperience(index, 'period', e.target.value)}
                                    placeholder={language === "ja" ? "期間" : "Period"}
                                  />
                                  <Textarea
                                    value={work.description || ''}
                                    onChange={(e) => updateWorkExperience(index, 'description', e.target.value)}
                                    placeholder={language === "ja" ? "説明" : "Description"}
                                    rows={2}
                                  />
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => removeWorkExperience(index)}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => saveField('work_experience')}><Check className="w-4 h-4 mr-1" /> {language === "ja" ? "保存" : "Save"}</Button>
                              <Button size="sm" variant="outline" onClick={cancelEditing}><X className="w-4 h-4 mr-1" /> {language === "ja" ? "キャンセル" : "Cancel"}</Button>
                            </div>
                          </div>
                        ) : (
                          profile?.work_experience && profile.work_experience.length > 0 ? (
                            <ul className="space-y-2">
                              {profile.work_experience.map((work, index) => (
                                <li key={index} className="text-sm">
                                  <div className="font-medium">{work.company} - {work.position}</div>
                                  {work.period && (
                                    <div className="text-muted-foreground text-xs">{work.period}</div>
                                  )}
                                  {work.description && (
                                    <div className="text-muted-foreground mt-1">{work.description}</div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground">{language === "ja" ? "職歴を追加" : "Add work experience"}</p>
                          )
                        )}
                      </div>

                    {/* Belt History Section */}
                    <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border/50">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-semibold flex items-center gap-2">
                          🥋 {language === "ja" ? "帯の履歴" : "Belt History"}
                        </h3>
                        {editingField === 'belt_history' ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveField('belt_history')} className="gap-1">
                              <Check className="w-4 h-4" /> {language === "ja" ? "保存" : "Save"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEditing} className="gap-1">
                              <X className="w-4 h-4" /> {language === "ja" ? "キャンセル" : "Cancel"}
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => startEditing('belt_history', profile?.belt_history || [])}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {editingField === 'belt_history' ? (
                        <div className="space-y-3">
                          {(editValues.belt_history || []).map((belt: any, index: number) => (
                            <div key={index} className="flex items-start gap-2 p-3 bg-background rounded border">
                              <div className="flex-1 space-y-2">
                                <Select
                                  value={belt.belt || ''}
                                  onValueChange={(value) => updateBeltHistory(index, 'belt', value)}
                                >
                                  <SelectTrigger className="font-medium">
                                    <SelectValue placeholder={language === "ja" ? "帯を選択" : "Select Belt"} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="白帯">
                                      {language === "ja" ? "白帯" : language === "pt" ? "Faixa Branca" : "White Belt"}
                                    </SelectItem>
                                    <SelectItem value="青帯">
                                      {language === "ja" ? "青帯" : language === "pt" ? "Faixa Azul" : "Blue Belt"}
                                    </SelectItem>
                                    <SelectItem value="紫帯">
                                      {language === "ja" ? "紫帯" : language === "pt" ? "Faixa Roxa" : "Purple Belt"}
                                    </SelectItem>
                                    <SelectItem value="茶帯">
                                      {language === "ja" ? "茶帯" : language === "pt" ? "Faixa Marrom" : "Brown Belt"}
                                    </SelectItem>
                                    <SelectItem value="黒帯">
                                      {language === "ja" ? "黒帯" : language === "pt" ? "Faixa Preta" : "Black Belt"}
                                    </SelectItem>
                                    <SelectItem value="赤黒帯">
                                      {language === "ja" ? "赤黒帯" : language === "pt" ? "Faixa Coral" : "Coral Belt"}
                                    </SelectItem>
                                    <SelectItem value="赤帯">
                                      {language === "ja" ? "赤帯" : language === "pt" ? "Faixa Vermelha" : "Red Belt"}
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <div className="grid grid-cols-2 gap-2">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        className="justify-start text-left font-normal"
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {belt.date ? format(new Date(belt.date), "yyyy/MM") : (language === "ja" ? "取得月" : "Month")}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <CalendarComponent
                                        mode="single"
                                        selected={belt.date ? new Date(belt.date) : undefined}
                                        onSelect={(date) => {
                                          if (date) {
                                            updateBeltHistory(index, 'date', format(date, "yyyy-MM"));
                                          }
                                        }}
                                        initialFocus
                                        className="pointer-events-auto"
                                      />
                                    </PopoverContent>
                                  </Popover>
                                  <InputWithSuggestions
                                    value={belt.instructor || ''}
                                    onChange={(e) => updateBeltHistory(index, 'instructor', e.target.value)}
                                    onSelectSuggestion={(value) => updateBeltHistory(index, 'instructor', value)}
                                    suggestions={instructorSuggestions}
                                    placeholder={language === "ja" ? "授与者" : "Instructor"}
                                  />
                                </div>
                              </div>
                              <Button size="sm" variant="ghost" onClick={() => removeBeltHistory(index)}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={addBeltHistory}
                            className="w-full gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            {language === "ja" ? "帯を追加" : "Add Belt"}
                          </Button>
                        </div>
                      ) : (
                        profile?.belt_history && profile.belt_history.length > 0 ? (
                          <ul className="space-y-2">
                            {profile.belt_history.map((belt, index) => (
                              <li key={index} className="flex items-center gap-2 text-sm p-3 bg-background rounded border">
                                <BeltBadge belt={belt.belt} />
                                {belt.instructor && <span className="text-muted-foreground">- {belt.instructor}</span>}
                                {belt.date && <span className="text-muted-foreground text-xs ml-auto">({belt.date})</span>}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">{language === "ja" ? "帯の履歴を追加してください" : "Add belt history"}</p>
                        )
                      )}
                    </div>

                    {/* Home Dojo */}
                    <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border/50">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-semibold flex items-center gap-2">
                          🏛️ {language === "ja" ? "所属道場" : "Home Dojo"}
                        </h3>
                        {editingField === 'home_dojo' ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveField('home_dojo')} className="gap-1">
                              <Check className="w-4 h-4" /> {language === "ja" ? "保存" : "Save"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEditing} className="gap-1">
                              <X className="w-4 h-4" /> {language === "ja" ? "キャンセル" : "Cancel"}
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => startEditing('home_dojo', profile?.home_dojo)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {editingField === 'home_dojo' ? (
                        <InputWithSuggestions
                          value={editValues.home_dojo || ''}
                          onChange={(e) => setEditValues({ ...editValues, home_dojo: e.target.value })}
                          onSelectSuggestion={(value) => setEditValues({ ...editValues, home_dojo: value })}
                          suggestions={dojoSuggestions}
                          placeholder={language === "ja" ? "所属道場名" : "Dojo name"}
                          className="font-medium"
                        />
                      ) : (
                        <p className="text-sm p-2 bg-background rounded">
                          {profile?.home_dojo || <span className="text-muted-foreground italic">{language === "ja" ? "所属道場を追加してください" : "Add home dojo"}</span>}
                        </p>
                      )}
                    </div>

                    {/* Training Locations */}
                    <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border/50">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-semibold flex items-center gap-2">
                          🗺️ {language === "ja" ? "よくいく出稽古先" : "Training Locations"}
                        </h3>
                        {editingField === 'training_locations' ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveField('training_locations')} className="gap-1">
                              <Check className="w-4 h-4" /> {language === "ja" ? "保存" : "Save"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEditing} className="gap-1">
                              <X className="w-4 h-4" /> {language === "ja" ? "キャンセル" : "Cancel"}
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => startEditing('training_locations', profile?.training_locations || [])}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {editingField === 'training_locations' ? (
                        <div className="space-y-2">
                          {(editValues.training_locations || []).map((location: string, index: number) => (
                            <div key={index} className="flex items-center gap-2">
                              <InputWithSuggestions
                                value={location}
                                onChange={(e) => updateTrainingLocation(index, e.target.value)}
                                onSelectSuggestion={(value) => updateTrainingLocation(index, value)}
                                suggestions={dojoSuggestions}
                                placeholder={language === "ja" ? "道場名" : "Location"}
                              />
                              <Button size="sm" variant="ghost" onClick={() => removeTrainingLocation(index)}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={addTrainingLocation}
                            className="w-full gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            {language === "ja" ? "道場を追加" : "Add Location"}
                          </Button>
                        </div>
                      ) : (
                        profile?.training_locations && profile.training_locations.length > 0 ? (
                          <ul className="space-y-1">
                            {profile.training_locations.map((location, index) => (
                              <li key={index} className="text-sm p-2 bg-background rounded flex items-center gap-2">
                                <span className="text-primary">•</span> {location}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">{language === "ja" ? "出稽古先を追加してください" : "Add training locations"}</p>
                        )
                      )}
                    </div>

                    {/* Titles */}
                    <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border/50">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-semibold flex items-center gap-2">
                          🏆 {language === "ja" ? "獲得タイトル" : "Titles & Achievements"}
                        </h3>
                        {editingField === 'titles' ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveField('titles')} className="gap-1">
                              <Check className="w-4 h-4" /> {language === "ja" ? "保存" : "Save"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEditing} className="gap-1">
                              <X className="w-4 h-4" /> {language === "ja" ? "キャンセル" : "Cancel"}
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => startEditing('titles', profile?.titles || [])}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {editingField === 'titles' ? (
                        <div className="space-y-3">
                          {(editValues.titles || []).map((title: any, index: number) => (
                            <div key={index} className="flex items-start gap-2 p-3 bg-background rounded border">
                              <div className="flex-1 space-y-2">
                                <Input
                                  value={title.title || ''}
                                  onChange={(e) => updateTitle(index, 'title', e.target.value)}
                                  placeholder={language === "ja" ? "タイトル名" : "Title"}
                                  className="font-medium"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                  <Select
                                    value={title.organization || ''}
                                    onValueChange={(value) => updateTitle(index, 'organization', value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={language === "ja" ? "団体名を選択" : "Select Organization"} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-popover z-50">
                                      <SelectItem value="">
                                        {language === "ja" ? "なし" : "None"}
                                      </SelectItem>
                                      {organizations.map((org) => (
                                        <SelectItem key={org.id} value={language === "ja" ? org.name_ja : org.name}>
                                          {language === "ja" ? org.name_ja : org.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    value={title.date || ''}
                                    onChange={(e) => updateTitle(index, 'date', e.target.value)}
                                    placeholder={language === "ja" ? "取得日" : "Date"}
                                  />
                                </div>
                              </div>
                              <Button size="sm" variant="ghost" onClick={() => removeTitle(index)}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={addTitle}
                            className="w-full gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            {language === "ja" ? "タイトルを追加" : "Add Title"}
                          </Button>
                        </div>
                      ) : (
                        profile?.titles && profile.titles.length > 0 ? (
                          <div className="grid gap-3">
                            {profile.titles.map((title, index) => (
                              <div key={index} className="p-3 bg-background rounded border border-primary/20">
                                <div className="flex items-start gap-2">
                                  <span className="text-2xl">🏆</span>
                                  <div className="flex-1">
                                    <div className="font-semibold text-primary">{title.title}</div>
                                    {title.organization && (
                                      <div className="text-sm text-muted-foreground">{title.organization}</div>
                                    )}
                                    {title.date && (
                                      <div className="text-xs text-muted-foreground mt-1">{title.date}</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">{language === "ja" ? "獲得タイトルを追加してください" : "Add titles"}</p>
                        )
                      )}
                    </div>

                      <p className="text-sm text-muted-foreground mt-4">
                        <Video className="inline h-4 w-4 mr-1" />
                        動画 {userVideos.length}件
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-6 mb-6 animate-fade-up">
            {/* Private Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between font-light">
                  <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-orange-600" />
                    {language === "ja" ? "非公開情報" : "Private Information"}
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <Lock className="w-3 h-3" />
                    {language === "ja" ? "非公開" : "Private"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {language === "ja" ? "メールアドレス" : "Email"}
                    </p>
                    <p className="font-light">{user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {language === "ja" ? "ユーザーID" : "User ID"}
                    </p>
                    <p className="font-light text-xs">{user?.id.slice(0, 8)}...</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-light">
                  <CreditCard className="h-5 w-5" />
                  {language === "ja" ? "プラン情報" : language === "pt" ? "Informações do plano" : "Plan Information"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {language === "ja" ? "現在のプラン" : language === "pt" ? "Plano atual" : "Current Plan"}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="font-light text-lg">
                      {subscription?.subscribed ? getPlanName(subscription.price_id) : (language === "ja" ? "未登録" : "No Plan")}
                    </p>
                    {subscription?.is_trialing && (
                      <Badge variant="secondary" className="text-xs">
                        {language === "ja" ? "トライアル中" : "Trial"}
                      </Badge>
                    )}
                  </div>
                </div>
                {subscription?.subscribed && subscription.subscription_end && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      {language === "ja" ? "次回更新日" : language === "pt" ? "Próxima renovação" : "Next Renewal"}
                    </p>
                    <p className="font-light">{formatDate(subscription.subscription_end)}</p>
                  </div>
                )}
                <div className="pt-4">
                  {subscription?.subscribed ? (
                    <p className="text-sm text-green-600 dark:text-green-400">
                      ✓ {language === "ja" ? "有効なプラン" : language === "pt" ? "Plano ativo" : "Active Plan"}
                    </p>
                  ) : (
                    <Button
                      onClick={() => navigate("/join")}
                      className="w-full"
                    >
                      {language === "ja" ? "プランに登録する" : language === "pt" ? "Assinar plano" : "Subscribe to Plan"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Referral Code and Points Section */}
          <div className="grid md:grid-cols-2 gap-6 mb-12 animate-fade-up">
            {/* Referral Code Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between font-light">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {language === "ja" ? "紹介コード" : "Referral Code"}
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <Lock className="w-3 h-3" />
                    {language === "ja" ? "非公開" : "Private"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pointsLoading ? (
                  <div className="h-12 bg-muted/50 animate-pulse rounded" />
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {language === "ja" ? "あなたの紹介コード" : "Your Referral Code"}
                      </p>
                      {isEditingCode ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editedCode}
                            onChange={(e) => setEditedCode(e.target.value.toUpperCase())}
                            placeholder={language === "ja" ? "新しいコード" : "New code"}
                            maxLength={12}
                            className="flex-1 font-mono text-lg font-bold text-center"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              updateReferralCode(editedCode);
                              setIsEditingCode(false);
                            }}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setIsEditingCode(false);
                              setEditedCode(referralCode);
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <code className="flex-1 p-3 bg-muted rounded font-mono text-lg font-bold text-center">
                            {referralCode || "loading..."}
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditedCode(referralCode);
                              setIsEditingCode(true);
                            }}
                            disabled={!referralCode}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(referralCode);
                              toast.success(language === "ja" ? "コピーしました" : "Copied!");
                            }}
                            disabled={!referralCode}
                          >
                            {language === "ja" ? "コピー" : "Copy"}
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        {language === "ja" 
                          ? "友達がこのコードで加入すると、初月無料になります" 
                          : "Friends get first month free with this code"}
                      </p>
                      <p className="text-primary font-medium">
                        {language === "ja" 
                          ? "あなたには毎月500円分のポイントが付与されます" 
                          : "You earn ¥500 points every month"}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Points Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between font-light">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    {language === "ja" ? "ポイント" : "Points"}
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <Lock className="w-3 h-3" />
                    {language === "ja" ? "非公開" : "Private"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pointsLoading ? (
                  <div className="h-12 bg-muted/50 animate-pulse rounded" />
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {language === "ja" ? "現在のポイント" : "Current Points"}
                      </p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-4xl font-bold text-primary">
                          {userPoints.toLocaleString()}
                        </p>
                        <p className="text-lg text-muted-foreground">
                          {language === "ja" ? "円分" : "¥"}
                        </p>
                      </div>
                    </div>
                    <div className="pt-2">
                      <p className="text-sm text-muted-foreground">
                        {language === "ja" 
                          ? "ポイントは割引クーポンに交換できます（近日公開予定）" 
                          : "Points can be exchanged for discount coupons (coming soon)"}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Video Upload Section */}
          <div className="mt-12 animate-fade-up">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-light">
                    {language === "ja" ? "あなたの動画" : language === "pt" ? "Seus vídeos" : "Your Videos"}
                  </h2>
                  <Badge variant="secondary" className="gap-1">
                    <Globe className="w-3 h-3" />
                    {language === "ja" ? "公開/非公開設定可能" : "Public/Private"}
                  </Badge>
                </div>
                <Button variant="link" onClick={copyProfileUrl} className="px-0 h-auto">
                  {language === "ja" ? "プロフィールページを共有" : "Share your profile"}
                </Button>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => navigate("/video-upload-info")}>
                  {language === "ja" ? "詳細を見る" : language === "pt" ? "Ver detalhes" : "Learn More"}
                </Button>
                <Button onClick={() => setUploadDialogOpen(true)} className="gap-2">
                  <Upload className="w-4 h-4" />
                  {language === "ja" ? "動画をアップロード" : language === "pt" ? "Enviar vídeo" : "Upload Video"}
                </Button>
              </div>
            </div>

            {videosLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-4 border border-border rounded-lg p-6 animate-pulse">
                    <div className="aspect-video bg-muted rounded" />
                    <div className="h-6 bg-muted rounded" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : userVideos.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-lg">
                <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  {language === "ja" 
                    ? "まだ動画をアップロードしていません" 
                    : language === "pt" 
                    ? "Você ainda não enviou nenhum vídeo" 
                    : "You haven't uploaded any videos yet"}
                </p>
                <Button onClick={() => setUploadDialogOpen(true)} variant="outline" className="gap-2">
                  <Upload className="w-4 h-4" />
                  {language === "ja" ? "最初の動画をアップロード" : language === "pt" ? "Enviar primeiro vídeo" : "Upload First Video"}
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userVideos.map((video) => (
                  <UserVideoCard
                    key={video.id}
                    video={video}
                    onEdit={handleEditVideo}
                    onDelete={handleDeleteVideo}
                    isOwner={true}
                  />
                ))}
              </div>
            )}
          </div>

            </>
          )}
        </div>
      </main>

      <VideoUploadDialog 
        open={uploadDialogOpen} 
        onOpenChange={(open) => {
          setUploadDialogOpen(open);
          if (!open) {
            loadUserVideos();
          }
        }} 
      />

      <VideoEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        video={editingVideo}
        onSuccess={loadUserVideos}
      />

      <AvatarUploadDialog
        open={avatarDialogOpen}
        onOpenChange={setAvatarDialogOpen}
        userId={user?.id || ''}
        onUploadComplete={(url) => {
          setProfile(prev => prev ? { ...prev, avatar_url: url } : null);
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "ja" ? "動画を削除しますか？" : "Delete video?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "ja" 
                ? "この操作は取り消せません。本当に削除しますか？" 
                : "This action cannot be undone. Are you sure?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === "ja" ? "キャンセル" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteVideo}>
              {language === "ja" ? "削除" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
};

export default MyPage;
