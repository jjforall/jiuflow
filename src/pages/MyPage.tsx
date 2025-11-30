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
import { User, CreditCard, Calendar, Mail, Upload, Video, Eye, Edit2, Check, X, Trash2, Lock, Globe, Plus, Copy, MapPin, Building2, Camera, Image } from "lucide-react";
import { toast } from "sonner";
import { VideoUploadDialog } from "@/components/VideoUploadDialog";
import { VideoEditDialog } from "@/components/VideoEditDialog";
import { UserVideoCard } from "@/components/UserVideoCard";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarUploadDialog } from "@/components/AvatarUploadDialog";
import { CoverUploadDialog } from "@/components/CoverUploadDialog";
import { CoverImageGalleryDialog } from "@/components/CoverImageGalleryDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import hero1 from "@/assets/hero-1.jpg";
import hero2 from "@/assets/hero-2.jpg";
import hero3 from "@/assets/hero-3.jpg";
import hero4 from "@/assets/hero-4.jpg";
import hero5 from "@/assets/hero-5.jpg";
import hero6 from "@/assets/hero-6.jpg";
import hero7 from "@/assets/hero-7.jpg";
import hero8 from "@/assets/hero-8.jpg";
import hero9 from "@/assets/hero-9.jpg";
import hero10 from "@/assets/hero-10.jpg";

const DEFAULT_COVER_IMAGES = [
  hero1, hero2, hero3, hero4, hero5,
  hero6, hero7, hero8, hero9, hero10
];

// カバー画像のURLまたはインデックスから画像を取得
const getCoverImageUrl = (coverUrl: string | null, userId: string | null): string => {
  // "default-X" 形式の場合
  if (coverUrl && coverUrl.startsWith("default-")) {
    const index = parseInt(coverUrl.replace("default-", ""));
    if (!isNaN(index) && index >= 0 && index < DEFAULT_COVER_IMAGES.length) {
      return DEFAULT_COVER_IMAGES[index];
    }
  }
  
  // カスタムアップロード画像の場合
  if (coverUrl && !coverUrl.startsWith("default-")) {
    return coverUrl;
  }
  
  // デフォルト: ユーザーIDに基づいてランダム選択
  if (!userId) return DEFAULT_COVER_IMAGES[0];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash;
  }
  const index = Math.abs(hash) % DEFAULT_COVER_IMAGES.length;
  return DEFAULT_COVER_IMAGES[index];
};

// "default-X" 形式からインデックスを取得
const getCurrentCoverIndex = (coverUrl: string | null): number | undefined => {
  if (coverUrl && coverUrl.startsWith("default-")) {
    const index = parseInt(coverUrl.replace("default-", ""));
    if (!isNaN(index) && index >= 0 && index < DEFAULT_COVER_IMAGES.length) {
      return index;
    }
  }
  return undefined;
};
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
  cover_image_url: string | null;
  username: string | null;
  education: Array<{school: string; degree?: string; period?: string}> | null;
  work_experience: Array<{company: string; position: string; period?: string; description?: string}> | null;
  belt_history: Array<{belt: string; date?: string; instructor?: string}> | null;
  home_dojo: string | null;
  training_locations: Array<string> | null;
  titles: Array<{title: string; rank?: string; organization?: string; customTitle?: string; weight_class?: string}> | null;
  favorite_fighters: Array<string> | null;
  favorite_techniques: Array<string> | null;
  hometown: string | null;
  hobbies: Array<string> | null;
  marital_status: string | null;
  date_of_birth: string | null;
  social_links: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    facebook?: string;
    tiktok?: string;
    website?: string;
  } | null;
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
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showFollowList, setShowFollowList] = useState<'followers' | 'following' | null>(null);
  const [followList, setFollowList] = useState<Array<{ id: string; display_name: string; username: string; avatar_url: string }>>([]);
  const [schoolSuggestions, setSchoolSuggestions] = useState<string[]>([]);
  const [companySuggestions, setCompanySuggestions] = useState<string[]>([]);
  const [userDojos, setUserDojos] = useState<Array<{ id: string; dojo: any; relationship_type: string }>>([]);
  const [dojosLoading, setDojosLoading] = useState(false);
  const [dojoDialogOpen, setDojoDialogOpen] = useState(false);
  const [availableDojos, setAvailableDojos] = useState<Array<{ id: string; name: string; name_ja: string; name_pt: string; location: string | null }>>([]);
  const [selectedDojoId, setSelectedDojoId] = useState<string>("");
  const [selectedRelationshipType, setSelectedRelationshipType] = useState<"home" | "training">("home");
  const [coverGalleryOpen, setCoverGalleryOpen] = useState(false);
  const [coverUploadOpen, setCoverUploadOpen] = useState(false);

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
      loadFollowStats();
      loadSchoolSuggestions();
      loadCompanySuggestions();
      loadUserDojos();
      loadAvailableDojos();
    }
  }, [user]);

  const loadFollowStats = async () => {
    if (!user) return;
    
    try {
      // Load followers count
      const { count: followersCount, error: followersError } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id);

      if (followersError) throw followersError;
      setFollowersCount(followersCount || 0);

      // Load following count
      const { count: followingCount, error: followingError } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id);

      if (followingError) throw followingError;
      setFollowingCount(followingCount || 0);
    } catch (error) {
      console.error('Error loading follow stats:', error);
    }
  };

  const loadFollowList = async (type: 'followers' | 'following') => {
    if (!user) return;

    try {
      let query;
      if (type === 'followers') {
        query = supabase
          .from('user_follows')
          .select('follower_id')
          .eq('following_id', user.id);
      } else {
        query = supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', user.id);
      }

      const { data: follows, error: followsError } = await query;
      if (followsError) throw followsError;

      const userIds = follows?.map(f => type === 'followers' ? f.follower_id : f.following_id) || [];
      
      if (userIds.length === 0) {
        setFollowList([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;
      setFollowList(profiles || []);
    } catch (error) {
      console.error('Error loading follow list:', error);
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

  const loadSchoolSuggestions = async () => {
    try {
      // Default suggestions for common schools
      const defaultSuggestions = [
        '東京大学',
        '京都大学',
        '大阪大学',
        '東北大学',
        '名古屋大学',
        '九州大学',
        '北海道大学',
        '早稲田大学',
        '慶應義塾大学',
        '上智大学',
        '明治大学',
        '青山学院大学',
        '立教大学',
        '中央大学',
        '法政大学',
        '日本大学',
        '東海大学',
        '専修大学',
        '駒澤大学',
        '関西大学',
        '関西学院大学',
        '同志社大学',
        '立命館大学',
        '近畿大学',
        'その他'
      ];

      const { data, error } = await supabase
        .from('profiles')
        .select('education');

      if (error) throw error;

      const schools = new Set<string>(defaultSuggestions);
      
      data?.forEach((profile) => {
        if (profile.education) {
          (profile.education as any[]).forEach((edu: any) => {
            if (edu.school) schools.add(edu.school);
          });
        }
      });

      setSchoolSuggestions(Array.from(schools).sort());
    } catch (error) {
      console.error('Error loading school suggestions:', error);
    }
  };

  const loadCompanySuggestions = async () => {
    try {
      // Default suggestions for common companies
      const defaultSuggestions = [
        'トヨタ自動車',
        'ソニー',
        'パナソニック',
        '日立製作所',
        '東芝',
        '富士通',
        'NEC',
        '三菱電機',
        'キヤノン',
        'ニコン',
        'ソフトバンク',
        'NTTドコモ',
        'KDDI',
        '楽天',
        'サイバーエージェント',
        'ヤフー',
        'LINE',
        'メルカリ',
        'リクルート',
        'サントリー',
        'アサヒビール',
        'キリン',
        '任天堂',
        'バンダイナムコ',
        'カプコン',
        'その他'
      ];

      const { data, error } = await supabase
        .from('profiles')
        .select('work_experience');

      if (error) throw error;

      const companies = new Set<string>(defaultSuggestions);
      
      data?.forEach((profile) => {
        if (profile.work_experience) {
          (profile.work_experience as any[]).forEach((work: any) => {
            if (work.company) companies.add(work.company);
          });
        }
      });

      setCompanySuggestions(Array.from(companies).sort());
    } catch (error) {
      console.error('Error loading company suggestions:', error);
    }
  };

  const loadProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, bio, avatar_url, username, education, work_experience, belt_history, home_dojo, training_locations, titles, created_at, cover_image_url, organization_id, favorite_fighters, favorite_techniques, hometown, hobbies, marital_status, date_of_birth, social_links')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      setProfile({
        ...data,
        education: (data.education as any) || [],
        work_experience: (data.work_experience as any) || [],
        belt_history: (data.belt_history as any) || [],
        training_locations: (data.training_locations as any) || [],
        titles: (data.titles as any) || [],
        favorite_fighters: (data.favorite_fighters as any) || [],
        favorite_techniques: (data.favorite_techniques as any) || [],
        hobbies: (data.hobbies as any) || [],
        social_links: (data.social_links as any) || {}
      });
      setCreatedAt(data.created_at);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadUserDojos = async () => {
    if (!user) return;
    
    setDojosLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_dojos')
        .select(`
          id,
          relationship_type,
          dojos:dojo_id (
            id,
            name,
            name_ja,
            name_pt,
            location,
            is_verified
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      
      const formattedDojos = (data || []).map((item: any) => ({
        id: item.id,
        dojo: item.dojos,
        relationship_type: item.relationship_type
      }));
      
      setUserDojos(formattedDojos);
    } catch (error) {
      console.error('Error loading user dojos:', error);
      toast.error(language === "ja" ? "道場の読み込みに失敗しました" : "Failed to load dojos");
    } finally {
      setDojosLoading(false);
    }
  };

  const loadAvailableDojos = async () => {
    try {
      const { data, error } = await supabase
        .from('dojos')
        .select('id, name, name_ja, name_pt, location')
        .order('name');

      if (error) throw error;
      setAvailableDojos(data || []);
    } catch (error) {
      console.error('Error loading available dojos:', error);
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

  const handleAddDojo = async () => {
    if (!selectedDojoId || !user) return;

    try {
      const { error } = await supabase
        .from('user_dojos')
        .insert({
          user_id: user.id,
          dojo_id: selectedDojoId,
          relationship_type: selectedRelationshipType,
          joined_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success(language === "ja" ? "道場を追加しました" : "Dojo added");
      setDojoDialogOpen(false);
      setSelectedDojoId("");
      setSelectedRelationshipType("home");
      loadUserDojos();
    } catch (error: any) {
      console.error('Error adding dojo:', error);
      if (error.code === '23505') {
        toast.error(language === "ja" ? "この道場は既に登録されています" : "This dojo is already added");
      } else {
        toast.error(language === "ja" ? "追加に失敗しました" : "Failed to add");
      }
    }
  };

  const handleRemoveDojo = async (userDojoId: string) => {
    if (!confirm(language === "ja" ? "この道場を削除しますか？" : "Remove this dojo?")) return;

    try {
      const { error } = await supabase
        .from('user_dojos')
        .delete()
        .eq('id', userDojoId);

      if (error) throw error;

      toast.success(language === "ja" ? "道場を削除しました" : "Dojo removed");
      loadUserDojos();
    } catch (error) {
      console.error('Error removing dojo:', error);
      toast.error(language === "ja" ? "削除に失敗しました" : "Failed to remove");
    }
  };

  const copyProfileUrl = () => {
    const url = `${window.location.origin}/user/${profile?.username || user?.id}`;
    navigator.clipboard.writeText(url);
    toast.success(language === "ja" ? "プロフィールURLをコピーしました" : "Profile URL copied");
  };

  const handleSelectDefaultCover = async (index: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ cover_image_url: `default-${index}` })
        .eq("id", user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, cover_image_url: `default-${index}` } : prev);
      toast.success(language === "ja" ? "カバー画像を更新しました" : "Cover image updated");
    } catch (error) {
      console.error("Error updating cover image:", error);
      toast.error(language === "ja" ? "カバー画像の更新に失敗しました" : "Failed to update cover image");
    }
  };

  const startEditing = (field: string, currentValue: any) => {
    setEditingField(field);
    
    // For array fields, add an empty entry if the field is empty or null
    if (field === 'education' && (!currentValue || currentValue.length === 0)) {
      setEditValues({ ...editValues, [field]: [{ school: "" }] });
    } else if (field === 'work_experience' && (!currentValue || currentValue.length === 0)) {
      setEditValues({ ...editValues, [field]: [{ company: "", position: "" }] });
    } else if (field === 'belt_history' && (!currentValue || currentValue.length === 0)) {
      setEditValues({ ...editValues, [field]: [{ belt: "" }] });
    } else if (field === 'training_locations' && (!currentValue || currentValue.length === 0)) {
      setEditValues({ ...editValues, [field]: [""] });
    } else if (field === 'titles' && (!currentValue || currentValue.length === 0)) {
      setEditValues({ ...editValues, [field]: [{ title: "" }] });
    } else if (field === 'favorite_fighters' && (!currentValue || currentValue.length === 0)) {
      setEditValues({ ...editValues, [field]: [""] });
    } else if (field === 'favorite_techniques' && (!currentValue || currentValue.length === 0)) {
      setEditValues({ ...editValues, [field]: [""] });
    } else if (field === 'hobbies' && (!currentValue || currentValue.length === 0)) {
      setEditValues({ ...editValues, [field]: [""] });
    } else {
      setEditValues({ ...editValues, [field]: currentValue });
    }
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValues({});
  };

  const calculateAge = (dateOfBirth: string | null): number | null => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const saveField = async (field: string) => {
    if (!user || !profile) return;

    try {
      const updateData: any = {};
      
      if (field === 'display_name') {
        updateData.display_name = editValues.display_name?.trim() || null;
      } else if (field === 'bio') {
        updateData.bio = editValues.bio?.trim() || null;
      } else if (field === 'username') {
        // Validate username
        const newUsername = editValues.username?.trim() || null;
        if (newUsername && newUsername !== profile.username) {
          // Check if username is already taken by another user
          const { data: existingUser, error: checkError } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', newUsername)
            .neq('id', user.id)
            .maybeSingle();

          if (checkError) throw checkError;
          
          if (existingUser) {
            toast.error(language === "ja" ? "このユーザー名は既に使用されています" : "This username is already taken");
            return;
          }
        }
        updateData.username = newUsername;
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
      } else if (field === 'favorite_fighters') {
        // Filter out empty entries
        const validFighters = (editValues.favorite_fighters || []).filter((fighter: string) => 
          fighter && fighter.trim()
        );
        updateData.favorite_fighters = validFighters;
      } else if (field === 'favorite_techniques') {
        // Filter out empty entries
        const validTechniques = (editValues.favorite_techniques || []).filter((technique: string) => 
          technique && technique.trim()
        );
        updateData.favorite_techniques = validTechniques;
      } else if (field === 'hobbies') {
        // Filter out empty entries
        const validHobbies = (editValues.hobbies || []).filter((hobby: string) => 
          hobby && hobby.trim()
        );
        updateData.hobbies = validHobbies;
      } else {
        updateData[field] = editValues[field];
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
            <div className="h-40 sm:h-48 md:h-56 bg-gradient-to-r from-primary/30 via-primary/20 to-accent/30 rounded-t-2xl shadow-lg relative overflow-hidden group">
              {profile?.cover_image_url ? (
                <>
                  <img 
                    src={profile.cover_image_url.startsWith("default-") 
                      ? getCoverImageUrl(profile.cover_image_url, user?.id || null)
                      : profile.cover_image_url
                    } 
                    alt="Cover" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
                </>
              ) : (
                <>
                  <div 
                    className="absolute inset-0 bg-cover bg-center" 
                    style={{ backgroundImage: `url(${getCoverImageUrl(null, user?.id || null)})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
                </>
              )}
              
              {/* Edit Buttons */}
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <Button
                  size="sm"
                  variant="secondary"
                  className="backdrop-blur-md bg-background/80 hover:bg-background/90 border border-border/50 shadow-lg gap-2"
                  onClick={() => setCoverGalleryOpen(true)}
                >
                  <Image className="w-4 h-4" />
                  {language === "ja" ? "ギャラリー" : "Gallery"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="backdrop-blur-md bg-background/80 hover:bg-background/90 border border-border/50 shadow-lg gap-2"
                  onClick={() => setCoverUploadOpen(true)}
                >
                  <Camera className="w-4 h-4" />
                  {language === "ja" ? "アップロード" : "Upload"}
                </Button>
              </div>
            </div>
            
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
                  onClick={() => window.open(`/user/${profile?.username || user?.id}`, '_blank')}
                  className="gap-2 mb-4"
                >
                  <ExternalLink className="w-4 h-4" />
                  {language === "ja" ? "公開プロフィール" : "View Profile"}
                </Button>
              </div>
              
              <div className="mt-4">
                {editingField === 'display_name' ? (
                  <div className="flex items-center gap-2 mb-1">
                    <Input
                      value={editValues.display_name || ''}
                      onChange={(e) => setEditValues({ ...editValues, display_name: e.target.value })}
                      placeholder={language === "ja" ? "表示名" : "Display name"}
                      className="text-3xl font-bold h-12"
                    />
                    <Button size="sm" onClick={() => saveField('display_name')}><Check className="w-4 h-4" /></Button>
                    <Button size="sm" variant="outline" onClick={cancelEditing}><X className="w-4 h-4" /></Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group mb-1">
                    <h1 className="text-3xl font-bold">
                      {profile?.display_name || profile?.username || user?.email?.split('@')[0] || "ユーザー"}
                    </h1>
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
                  <div className="flex items-start gap-2 mb-3">
                    <Textarea
                      value={editValues.bio || ''}
                      onChange={(e) => setEditValues({ ...editValues, bio: e.target.value })}
                      placeholder={language === "ja" ? "自己紹介" : "Bio"}
                      rows={2}
                      className="text-muted-foreground"
                    />
                    <div className="flex flex-col gap-2">
                      <Button size="sm" onClick={() => saveField('bio')}><Check className="w-4 h-4" /></Button>
                      <Button size="sm" variant="outline" onClick={cancelEditing}><X className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 group mb-3">
                    <p className="text-muted-foreground flex-1">
                      {profile?.bio || (language === "ja" ? "自己紹介を追加してください" : "Add your bio")}
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
                
                {/* Stats */}
                <div className="flex gap-6 text-sm">
                  <button 
                    onClick={() => {
                      setShowFollowList('following');
                      loadFollowList('following');
                    }}
                    className="hover:opacity-70 transition-opacity"
                  >
                    <span className="font-bold">{followingCount}</span>
                    <span className="text-muted-foreground ml-1">{language === "ja" ? "フォロー中" : "Following"}</span>
                  </button>
                  <button 
                    onClick={() => {
                      setShowFollowList('followers');
                      loadFollowList('followers');
                    }}
                    className="hover:opacity-70 transition-opacity"
                  >
                    <span className="font-bold">{followersCount}</span>
                    <span className="text-muted-foreground ml-1">{language === "ja" ? "フォロワー" : "Followers"}</span>
                  </button>
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
              {/* Unified Profile Card */}
              <Card className="mb-8 animate-fade-up border-border/50 shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-accent/10 via-primary/5 to-accent/10 border-b border-border/50">
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-xl">
                      🥋
                    </div>
                    {language === "ja" ? "プロフィール" : "Profile"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 md:p-8">
                  <div className="grid gap-6">

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
                                <div className="grid grid-cols-3 gap-2">
                                  <Select
                                    value={belt.date?.split('-')[0] || ''}
                                    onValueChange={(value) => {
                                      const month = belt.date?.split('-')[1] || '';
                                      updateBeltHistory(index, 'date', month ? `${value}-${month}` : value);
                                    }}
                                  >
                                    <SelectTrigger className="h-12">
                                      <SelectValue placeholder={language === "ja" ? "年" : "Year"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Array.from({ length: new Date().getFullYear() - 1949 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                                        <SelectItem key={year} value={year.toString()}>
                                          {year}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Select
                                    value={belt.date?.split('-')[1] || ''}
                                    onValueChange={(value) => {
                                      const year = belt.date?.split('-')[0] || new Date().getFullYear().toString();
                                      updateBeltHistory(index, 'date', `${year}-${value}`);
                                    }}
                                  >
                                    <SelectTrigger className="h-12">
                                      <SelectValue placeholder={language === "ja" ? "月" : "Month"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map((month) => (
                                        <SelectItem key={month} value={month}>
                                          {month}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <InputWithSuggestions
                                    value={belt.instructor || ''}
                                    onChange={(e) => updateBeltHistory(index, 'instructor', e.target.value)}
                                    onSelectSuggestion={(value) => updateBeltHistory(index, 'instructor', value)}
                                    suggestions={instructorSuggestions}
                                    placeholder={language === "ja" ? "授与者" : "Instructor"}
                                    className="h-12"
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
                          {(editValues.titles || []).map((title: any, index: number) => {
                            const organizationTitles: Record<string, string[]> = {
                              "ADCC": ["World Champion", "Continental Champion", "Trials Winner"],
                              "IBJJF": ["World Champion", "Pan Champion", "European Champion", "Asian Champion", "Brazilian Nationals Champion", "World Master Champion"],
                              "Abu Dhabi Pro": ["Grand Slam Champion", "World Pro Champion", "Continental Pro Champion"],
                              "JBJJF": ["全日本選手権", "アジアオープン", "東日本選手権", "西日本選手権", "関東オープン", "関西オープン"],
                              "コパ・ジアパン": ["アダルト優勝", "マスター優勝", "シニア優勝"],
                              "DUMAU": ["ライトコンタクトトーナメント優勝", "グランドスラム優勝"],
                              "Polaris": ["Champion", "Contender"],
                              "ONE Championship": ["Champion", "Interim Champion"],
                              "QUINTET": ["Team Champion"],
                              "JJWL": ["Team Champion"],
                              "Combat Jiu-Jitsu Worlds": ["Champion"],
                              "Grappling Industries": ["Champion"],
                            "SJJJF": [
                              "世界選手権",           // World Championship (9月)
                              "全日本選手権",         // All Japan Championship (9月)
                              "関東オープン",         // Kanto Open
                              "関東選手権",
                              "関西選手権",
                              "九州選手権",
                              "東北選手権",
                              "北海道選手権",
                              "夏季柔術甲子園"        // Summer Jiu-Jitsu Koshien (10月)
                            ],
                              "パンパシフィック選手権": ["Champion"],
                              "その他": []
                            };

                            const selectedOrgTitles = title.organization ? organizationTitles[title.organization] || [] : [];

                            return (
                              <div key={index} className="flex items-start gap-2 p-3 bg-background rounded border">
                                <div className="flex-1 space-y-2">
                                  <Select
                                    value={title.organization || ''}
                                    onValueChange={(value) => {
                                      updateTitle(index, 'organization', value);
                                      updateTitle(index, 'title', '');
                                    }}
                                  >
                                    <SelectTrigger className="font-medium h-12">
                                      <SelectValue placeholder={language === "ja" ? "団体を選択" : "Select Organization"} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-popover z-50">
                                      <SelectItem value="SJJJF">SJJJF</SelectItem>
                                      <SelectItem value="IBJJF">IBJJF</SelectItem>
                                      <SelectItem value="JBJJF">JBJJF</SelectItem>
                                      <SelectItem value="ADCC">ADCC</SelectItem>
                                      <SelectItem value="Abu Dhabi Pro">Abu Dhabi Pro</SelectItem>
                                      <SelectItem value="コパ・ジアパン">コパ・ジアパン</SelectItem>
                                      <SelectItem value="DUMAU">DUMAU</SelectItem>
                                      <SelectItem value="Polaris">Polaris</SelectItem>
                                      <SelectItem value="ONE Championship">ONE Championship</SelectItem>
                                      <SelectItem value="QUINTET">QUINTET</SelectItem>
                                      <SelectItem value="JJWL">JJWL</SelectItem>
                                      <SelectItem value="Combat Jiu-Jitsu Worlds">Combat Jiu-Jitsu Worlds</SelectItem>
                                      <SelectItem value="Grappling Industries">Grappling Industries</SelectItem>
                                      <SelectItem value="パンパシフィック選手権">パンパシフィック選手権</SelectItem>
                                      <SelectItem value="その他">{language === "ja" ? "その他" : "Other"}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  
                                  <div className="grid grid-cols-2 gap-2">
                                    {title.organization && selectedOrgTitles.length > 0 ? (
                                      <Select
                                        value={title.title || ''}
                                        onValueChange={(value) => updateTitle(index, 'title', value)}
                                      >
                                        <SelectTrigger className="h-12">
                                          <SelectValue placeholder={language === "ja" ? "タイトルを選択" : "Select Title"} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-popover z-50">
                                          {selectedOrgTitles.map((t) => (
                                            <SelectItem key={t} value={t}>
                                              {t}
                                            </SelectItem>
                                          ))}
                                          <SelectItem value="custom">{language === "ja" ? "カスタム" : "Custom"}</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <Input
                                        value={title.customTitle || ''}
                                        onChange={(e) => updateTitle(index, 'customTitle', e.target.value)}
                                        placeholder={language === "ja" ? "カスタムタイトル" : "Custom Title"}
                                        className="h-12"
                                      />
                                    )}
                                    <Select
                                      value={title.rank || ''}
                                      onValueChange={(value) => updateTitle(index, 'rank', value)}
                                    >
                                      <SelectTrigger className="h-12">
                                        <SelectValue placeholder={language === "ja" ? "順位" : "Rank"} />
                                      </SelectTrigger>
                                      <SelectContent className="bg-popover z-50">
                                        <SelectItem value="優勝">{language === "ja" ? "優勝" : "Champion"}</SelectItem>
                                        <SelectItem value="準優勝">{language === "ja" ? "準優勝" : "Runner-up"}</SelectItem>
                                        <SelectItem value="3位">{language === "ja" ? "3位" : "3rd Place"}</SelectItem>
                                        <SelectItem value="ベスト8">{language === "ja" ? "ベスト8" : "Quarter-finalist"}</SelectItem>
                                        <SelectItem value="ベスト16">{language === "ja" ? "ベスト16" : "Round of 16"}</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <Select
                                    value={title.weight_class || ''}
                                    onValueChange={(value) => updateTitle(index, 'weight_class', value)}
                                  >
                                    <SelectTrigger className="h-12">
                                      <SelectValue placeholder={language === "ja" ? "階級を選択" : "Select Weight Class"} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-popover z-50">
                                      <SelectItem value="ルースター">{language === "ja" ? "ルースター" : "Rooster"}</SelectItem>
                                      <SelectItem value="ライトフェザー">{language === "ja" ? "ライトフェザー" : "Light Feather"}</SelectItem>
                                      <SelectItem value="フェザー">{language === "ja" ? "フェザー" : "Feather"}</SelectItem>
                                      <SelectItem value="ライト">{language === "ja" ? "ライト" : "Light"}</SelectItem>
                                      <SelectItem value="ミディアム">{language === "ja" ? "ミディアム" : "Medium"}</SelectItem>
                                      <SelectItem value="ミディアムヘビー">{language === "ja" ? "ミディアムヘビー" : "Medium Heavy"}</SelectItem>
                                      <SelectItem value="ヘビー">{language === "ja" ? "ヘビー" : "Heavy"}</SelectItem>
                                      <SelectItem value="スーパーヘビー">{language === "ja" ? "スーパーヘビー" : "Super Heavy"}</SelectItem>
                                      <SelectItem value="ウルトラヘビー">{language === "ja" ? "ウルトラヘビー" : "Ultra Heavy"}</SelectItem>
                                      <SelectItem value="オープンクラス">{language === "ja" ? "オープンクラス" : "Absolute"}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  
                                  {title.title === "custom" && (
                                    <Input
                                      value={title.customTitle || ''}
                                      onChange={(e) => updateTitle(index, 'customTitle', e.target.value)}
                                      placeholder={language === "ja" ? "カスタムタイトル名" : "Custom Title"}
                                      className="h-12"
                                    />
                                  )}
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => removeTitle(index)}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            );
                          })}
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
                                    <div className="font-semibold text-primary">
                                      {title.title === "custom" ? title.customTitle : title.title}
                                    </div>
                                    {title.organization && (
                                      <div className="text-sm text-muted-foreground">{title.organization}</div>
                                    )}
                                    <div className="flex gap-2 mt-1">
                                      {title.weight_class && (
                                        <Badge variant="secondary" className="text-xs">{title.weight_class}</Badge>
                                      )}
                                      {title.rank && (
                                        <Badge variant="outline" className="text-xs">{title.rank}</Badge>
                                      )}
                                    </div>
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

                    {/* Favorite Fighters Section */}
                    <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border/50">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-semibold flex items-center gap-2">
                          👤 {language === "ja" ? "好きな選手" : "Favorite Fighters"}
                        </h3>
                        {editingField === 'favorite_fighters' ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveField('favorite_fighters')} className="gap-1">
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
                            onClick={() => startEditing('favorite_fighters', profile?.favorite_fighters || [])}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {editingField === 'favorite_fighters' ? (
                        <div className="space-y-4">
                          <div className="p-3 bg-background rounded border">
                            <h4 className="text-sm font-medium mb-3">{language === "ja" ? "よく選ばれる選手" : "Popular Fighters"}</h4>
                            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                              {[
                                "ホジェー・グレイシー", "ヒクソン・グレイシー", "ヘンゾ・グレイシー", "ホイラー・グレイシー",
                                "マルセロ・ガルシア", "ゴードン・ライアン", "ギャリー・トナン", "ニッキー・ライアン",
                                "ミカエル・ムシュメシ", "フェリペ・ペナ", "ブカシャ兄弟", "アンドレ・ガウヴァオ",
                                "ラファエル・メンデス", "コブリンハ", "ルーカス・レプリ", "レアンドロ・ロー",
                                "カイオ・テハ", "ジョアオ・ミヤオ", "パウロ・ミヤオ", "ハファエル・ロバート",
                                "ブルーノ・マルファシーニ", "ギジェルミ・メンデス", "ミヤオ兄弟", "ケーナン・コーネリアス"
                              ].map((fighter) => {
                                const isSelected = editValues.favorite_fighters?.includes(fighter);
                                return (
                                  <Button
                                    key={fighter}
                                    size="sm"
                                    variant={isSelected ? "default" : "outline"}
                                    onClick={() => {
                                      const current = editValues.favorite_fighters || [];
                                      if (isSelected) {
                                        setEditValues({ 
                                          ...editValues, 
                                          favorite_fighters: current.filter((f: string) => f !== fighter)
                                        });
                                      } else {
                                        setEditValues({ 
                                          ...editValues, 
                                          favorite_fighters: [...current, fighter]
                                        });
                                      }
                                    }}
                                    className="justify-start text-left h-auto py-2"
                                  >
                                    {isSelected && <Check className="w-3 h-3 mr-1" />}
                                    {fighter}
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                          
                          <div className="p-3 bg-background rounded border">
                            <h4 className="text-sm font-medium mb-2">{language === "ja" ? "カスタム入力" : "Custom Input"}</h4>
                            <div className="flex gap-2">
                              <Input
                                placeholder={language === "ja" ? "選手名を入力" : "Enter fighter name"}
                                className="h-12"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                    const current = editValues.favorite_fighters || [];
                                    if (!current.includes(e.currentTarget.value.trim())) {
                                      setEditValues({ 
                                        ...editValues, 
                                        favorite_fighters: [...current, e.currentTarget.value.trim()]
                                      });
                                    }
                                    e.currentTarget.value = '';
                                  }
                                }}
                              />
                            </div>
                          </div>

                          {editValues.favorite_fighters && editValues.favorite_fighters.length > 0 && (
                            <div className="p-3 bg-background rounded border">
                              <h4 className="text-sm font-medium mb-2">{language === "ja" ? "選択済み" : "Selected"}</h4>
                              <div className="flex flex-wrap gap-2">
                                {editValues.favorite_fighters.map((fighter: string, index: number) => (
                                  <Badge key={index} variant="secondary" className="gap-1">
                                    {fighter}
                                    <X 
                                      className="w-3 h-3 cursor-pointer" 
                                      onClick={() => {
                                        const newFighters = editValues.favorite_fighters.filter((_: string, i: number) => i !== index);
                                        setEditValues({ ...editValues, favorite_fighters: newFighters });
                                      }}
                                    />
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        profile?.favorite_fighters && profile.favorite_fighters.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {profile.favorite_fighters.map((fighter, index) => (
                              <Badge key={index} variant="secondary" className="text-sm py-1.5 px-3">
                                {fighter}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">{language === "ja" ? "好きな選手を追加してください" : "Add favorite fighters"}</p>
                        )
                      )}
                    </div>

                    {/* Favorite Techniques Section */}
                    <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border/50">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-semibold flex items-center gap-2">
                          🥋 {language === "ja" ? "好きな技" : "Favorite Techniques"}
                        </h3>
                        {editingField === 'favorite_techniques' ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveField('favorite_techniques')} className="gap-1">
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
                            onClick={() => startEditing('favorite_techniques', profile?.favorite_techniques || [])}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {editingField === 'favorite_techniques' ? (
                        <div className="space-y-4">
                          <div className="p-3 bg-background rounded border">
                            <h4 className="text-sm font-medium mb-3">{language === "ja" ? "よく選ばれる技" : "Popular Techniques"}</h4>
                            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                              {[
                                "三角絞め", "腕十字", "キムラロック", "アームバー", "チョークスリーパー",
                                "ギロチンチョーク", "リアネイキッドチョーク", "オモプラータ", "ダースチョーク",
                                "デラヒーバガード", "スパイダーガード", "バタフライガード", "ラッソガード",
                                "ベリンボロ", "50/50ガード", "Xガード", "シングルレッグX", "レッグドラッグ",
                                "ヒールフック", "トーホールド", "アキレスロック", "ニーバー", "クルシフィックス",
                                "バックテイク", "パスガード", "スイープ", "マウントポジション"
                              ].map((technique) => {
                                const isSelected = editValues.favorite_techniques?.includes(technique);
                                return (
                                  <Button
                                    key={technique}
                                    size="sm"
                                    variant={isSelected ? "default" : "outline"}
                                    onClick={() => {
                                      const current = editValues.favorite_techniques || [];
                                      if (isSelected) {
                                        setEditValues({ 
                                          ...editValues, 
                                          favorite_techniques: current.filter((t: string) => t !== technique)
                                        });
                                      } else {
                                        setEditValues({ 
                                          ...editValues, 
                                          favorite_techniques: [...current, technique]
                                        });
                                      }
                                    }}
                                    className="justify-start text-left h-auto py-2"
                                  >
                                    {isSelected && <Check className="w-3 h-3 mr-1" />}
                                    {technique}
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                          
                          <div className="p-3 bg-background rounded border">
                            <h4 className="text-sm font-medium mb-2">{language === "ja" ? "カスタム入力" : "Custom Input"}</h4>
                            <div className="flex gap-2">
                              <Input
                                placeholder={language === "ja" ? "技名を入力" : "Enter technique name"}
                                className="h-12"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                    const current = editValues.favorite_techniques || [];
                                    if (!current.includes(e.currentTarget.value.trim())) {
                                      setEditValues({ 
                                        ...editValues, 
                                        favorite_techniques: [...current, e.currentTarget.value.trim()]
                                      });
                                    }
                                    e.currentTarget.value = '';
                                  }
                                }}
                              />
                            </div>
                          </div>

                          {editValues.favorite_techniques && editValues.favorite_techniques.length > 0 && (
                            <div className="p-3 bg-background rounded border">
                              <h4 className="text-sm font-medium mb-2">{language === "ja" ? "選択済み" : "Selected"}</h4>
                              <div className="flex flex-wrap gap-2">
                                {editValues.favorite_techniques.map((technique: string, index: number) => (
                                  <Badge key={index} variant="secondary" className="gap-1">
                                    {technique}
                                    <X 
                                      className="w-3 h-3 cursor-pointer" 
                                      onClick={() => {
                                        const newTechniques = editValues.favorite_techniques.filter((_: string, i: number) => i !== index);
                                        setEditValues({ ...editValues, favorite_techniques: newTechniques });
                                      }}
                                    />
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        profile?.favorite_techniques && profile.favorite_techniques.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {profile.favorite_techniques.map((technique, index) => (
                              <Badge key={index} variant="secondary" className="text-sm py-1.5 px-3">
                                {technique}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">{language === "ja" ? "好きな技を追加してください" : "Add favorite techniques"}</p>
                        )
                      )}
                     </div>

                    {/* Hometown Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <span>🏠</span>
                          {language === "ja" ? "出身地" : "Hometown"}
                          <Badge variant="outline" className="text-xs">{language === "ja" ? "オプション" : "Optional"}</Badge>
                        </h3>
                        {editingField === 'hometown' ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveField('hometown')} className="gap-1">
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
                            onClick={() => startEditing('hometown', profile?.hometown || '')}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {editingField === 'hometown' ? (
                        <Input
                          value={editValues.hometown || ''}
                          onChange={(e) => setEditValues({ ...editValues, hometown: e.target.value })}
                          placeholder={language === "ja" ? "例: 東京都" : "e.g. Tokyo"}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {profile?.hometown || (language === "ja" ? "未設定" : "Not set")}
                        </p>
                      )}
                    </div>

                    {/* Hobbies Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <span>🎯</span>
                          {language === "ja" ? "趣味" : "Hobbies"}
                          <Badge variant="outline" className="text-xs">{language === "ja" ? "オプション" : "Optional"}</Badge>
                        </h3>
                        {editingField === 'hobbies' ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveField('hobbies')} className="gap-1">
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
                            onClick={() => startEditing('hobbies', profile?.hobbies || [])}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {editingField === 'hobbies' ? (
                        <div className="space-y-4">
                          <div className="p-3 bg-background rounded border">
                            <h4 className="text-sm font-medium mb-3">{language === "ja" ? "よく選ばれる趣味" : "Popular Hobbies"}</h4>
                            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                              {[
                                "読書", "映画鑑賞", "音楽鑑賞", "料理", "旅行",
                                "写真撮影", "ゲーム", "釣り", "ゴルフ", "サーフィン",
                                "スノーボード", "スキー", "登山", "キャンプ", "ランニング",
                                "サイクリング", "筋トレ", "ヨガ", "水泳", "ダンス",
                                "楽器演奏", "絵画", "書道", "陶芸", "手芸",
                                "ガーデニング", "ペット", "車", "バイク", "アニメ・漫画"
                              ].map((hobby) => {
                                const isSelected = editValues.hobbies?.includes(hobby);
                                return (
                                  <Button
                                    key={hobby}
                                    size="sm"
                                    variant={isSelected ? "default" : "outline"}
                                    onClick={() => {
                                      const current = editValues.hobbies || [];
                                      if (isSelected) {
                                        setEditValues({ 
                                          ...editValues, 
                                          hobbies: current.filter((h: string) => h !== hobby)
                                        });
                                      } else {
                                        setEditValues({ 
                                          ...editValues, 
                                          hobbies: [...current, hobby]
                                        });
                                      }
                                    }}
                                    className="justify-start text-left h-auto py-2"
                                  >
                                    {isSelected && <Check className="w-3 h-3 mr-1" />}
                                    {hobby}
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                          
                          <div className="p-3 bg-background rounded border">
                            <h4 className="text-sm font-medium mb-2">{language === "ja" ? "カスタム入力" : "Custom Input"}</h4>
                            <div className="flex gap-2">
                              <Input
                                placeholder={language === "ja" ? "趣味を入力" : "Enter hobby"}
                                className="h-12"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                    const current = editValues.hobbies || [];
                                    if (!current.includes(e.currentTarget.value.trim())) {
                                      setEditValues({ 
                                        ...editValues, 
                                        hobbies: [...current, e.currentTarget.value.trim()]
                                      });
                                    }
                                    e.currentTarget.value = '';
                                  }
                                }}
                              />
                            </div>
                          </div>

                          {editValues.hobbies && editValues.hobbies.length > 0 && (
                            <div className="p-3 bg-background rounded border">
                              <h4 className="text-sm font-medium mb-2">{language === "ja" ? "選択済み" : "Selected"}</h4>
                              <div className="flex flex-wrap gap-2">
                                {editValues.hobbies.map((hobby: string, index: number) => (
                                  <Badge key={index} variant="secondary" className="gap-1">
                                    {hobby}
                                    <X 
                                      className="w-3 h-3 cursor-pointer" 
                                      onClick={() => {
                                        const newHobbies = editValues.hobbies.filter((_: string, i: number) => i !== index);
                                        setEditValues({ ...editValues, hobbies: newHobbies });
                                      }}
                                    />
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        profile?.hobbies && profile.hobbies.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {profile.hobbies.map((hobby, index) => (
                              <Badge key={index} variant="secondary" className="text-sm py-1.5 px-3">{hobby}</Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">{language === "ja" ? "未設定" : "Not set"}</p>
                        )
                      )}
                    </div>

                    {/* Marital Status Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <span>💍</span>
                          {language === "ja" ? "結婚" : "Marital Status"}
                          <Badge variant="outline" className="text-xs">{language === "ja" ? "オプション" : "Optional"}</Badge>
                        </h3>
                        {editingField === 'marital_status' ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveField('marital_status')} className="gap-1">
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
                            onClick={() => startEditing('marital_status', profile?.marital_status || '')}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {editingField === 'marital_status' ? (
                        <Select
                          value={editValues.marital_status || 'not_set'}
                          onValueChange={(value) => setEditValues({ ...editValues, marital_status: value === 'not_set' ? null : value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={language === "ja" ? "選択してください" : "Select"} />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            <SelectItem value="not_set">{language === "ja" ? "未設定" : "Not set"}</SelectItem>
                            <SelectItem value="single">{language === "ja" ? "独身" : "Single"}</SelectItem>
                            <SelectItem value="married">{language === "ja" ? "既婚" : "Married"}</SelectItem>
                            <SelectItem value="other">{language === "ja" ? "その他" : "Other"}</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {profile?.marital_status === 'single' 
                            ? (language === "ja" ? "独身" : "Single")
                            : profile?.marital_status === 'married'
                            ? (language === "ja" ? "既婚" : "Married")
                            : profile?.marital_status === 'other'
                            ? (language === "ja" ? "その他" : "Other")
                            : (language === "ja" ? "未設定" : "Not set")
                          }
                        </p>
                      )}
                    </div>

                    {/* Date of Birth Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <span>🎂</span>
                          {language === "ja" ? "生年月日" : "Date of Birth"}
                          <Badge variant="outline" className="text-xs">{language === "ja" ? "オプション" : "Optional"}</Badge>
                        </h3>
                        {editingField === 'date_of_birth' ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveField('date_of_birth')} className="gap-1">
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
                            onClick={() => startEditing('date_of_birth', profile?.date_of_birth || '')}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {editingField === 'date_of_birth' ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {editValues.date_of_birth ? format(new Date(editValues.date_of_birth), "PPP", { locale: language === "ja" ? undefined : undefined }) : (language === "ja" ? "日付を選択" : "Pick a date")}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-popover" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={editValues.date_of_birth ? new Date(editValues.date_of_birth) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  setEditValues({ ...editValues, date_of_birth: format(date, 'yyyy-MM-dd') });
                                }
                              }}
                              disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {profile?.date_of_birth 
                              ? format(new Date(profile.date_of_birth), "PPP", { locale: language === "ja" ? undefined : undefined })
                              : (language === "ja" ? "未設定" : "Not set")
                            }
                          </p>
                          {profile?.date_of_birth && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {language === "ja" ? "年齢: " : "Age: "}
                              {calculateAge(profile.date_of_birth)}
                              {language === "ja" ? "歳" : " years old"}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Social Links Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <span>🔗</span>
                          {language === "ja" ? "SNSリンク" : "Social Links"}
                          <Badge variant="outline" className="text-xs">{language === "ja" ? "オプション" : "Optional"}</Badge>
                        </h3>
                        {editingField === 'social_links' ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveField('social_links')} className="gap-1">
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
                            onClick={() => startEditing('social_links', profile?.social_links || {})}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {editingField === 'social_links' ? (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <label className="text-xs text-muted-foreground flex items-center gap-2">
                              <span>📷</span> Instagram
                            </label>
                            <Input
                              value={editValues.social_links?.instagram || ''}
                              onChange={(e) => setEditValues({ 
                                ...editValues, 
                                social_links: { ...editValues.social_links, instagram: e.target.value }
                              })}
                              placeholder="https://instagram.com/username"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs text-muted-foreground flex items-center gap-2">
                              <span>🐦</span> Twitter (X)
                            </label>
                            <Input
                              value={editValues.social_links?.twitter || ''}
                              onChange={(e) => setEditValues({ 
                                ...editValues, 
                                social_links: { ...editValues.social_links, twitter: e.target.value }
                              })}
                              placeholder="https://twitter.com/username"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs text-muted-foreground flex items-center gap-2">
                              <span>▶️</span> YouTube
                            </label>
                            <Input
                              value={editValues.social_links?.youtube || ''}
                              onChange={(e) => setEditValues({ 
                                ...editValues, 
                                social_links: { ...editValues.social_links, youtube: e.target.value }
                              })}
                              placeholder="https://youtube.com/@username"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs text-muted-foreground flex items-center gap-2">
                              <span>👍</span> Facebook
                            </label>
                            <Input
                              value={editValues.social_links?.facebook || ''}
                              onChange={(e) => setEditValues({ 
                                ...editValues, 
                                social_links: { ...editValues.social_links, facebook: e.target.value }
                              })}
                              placeholder="https://facebook.com/username"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs text-muted-foreground flex items-center gap-2">
                              <span>🎵</span> TikTok
                            </label>
                            <Input
                              value={editValues.social_links?.tiktok || ''}
                              onChange={(e) => setEditValues({ 
                                ...editValues, 
                                social_links: { ...editValues.social_links, tiktok: e.target.value }
                              })}
                              placeholder="https://tiktok.com/@username"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs text-muted-foreground flex items-center gap-2">
                              <span>🌐</span> {language === "ja" ? "ウェブサイト" : "Website"}
                            </label>
                            <Input
                              value={editValues.social_links?.website || ''}
                              onChange={(e) => setEditValues({ 
                                ...editValues, 
                                social_links: { ...editValues.social_links, website: e.target.value }
                              })}
                              placeholder="https://yourwebsite.com"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {profile?.social_links?.instagram && (
                            <a 
                              href={profile.social_links.instagram} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                            >
                              <span>📷</span> Instagram
                            </a>
                          )}
                          {profile?.social_links?.twitter && (
                            <a 
                              href={profile.social_links.twitter} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                            >
                              <span>🐦</span> Twitter
                            </a>
                          )}
                          {profile?.social_links?.youtube && (
                            <a 
                              href={profile.social_links.youtube} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                            >
                              <span>▶️</span> YouTube
                            </a>
                          )}
                          {profile?.social_links?.facebook && (
                            <a 
                              href={profile.social_links.facebook} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                            >
                              <span>👍</span> Facebook
                            </a>
                          )}
                          {profile?.social_links?.tiktok && (
                            <a 
                              href={profile.social_links.tiktok} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                            >
                              <span>🎵</span> TikTok
                            </a>
                          )}
                          {profile?.social_links?.website && (
                            <a 
                              href={profile.social_links.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                            >
                              <span>🌐</span> {language === "ja" ? "ウェブサイト" : "Website"}
                            </a>
                          )}
                          {!profile?.social_links?.instagram && 
                           !profile?.social_links?.twitter && 
                           !profile?.social_links?.youtube && 
                           !profile?.social_links?.facebook && 
                           !profile?.social_links?.tiktok && 
                           !profile?.social_links?.website && (
                            <p className="text-sm text-muted-foreground italic">{language === "ja" ? "未設定" : "Not set"}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Education Section */}
                    <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border/50">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-base font-semibold flex items-center gap-2">
                            <span>🎓</span>
                            {language === "ja" ? "学歴" : "Education"}
                          </h3>
                          {editingField === 'education' ? (
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => saveField('education')} className="gap-1">
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
                              onClick={() => startEditing('education', profile?.education || [])}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        {editingField === 'education' ? (
                          <div className="space-y-3">
                            {(editValues.education || []).map((edu: any, index: number) => (
                              <div key={index} className="p-3 bg-background rounded border">
                                <InputWithSuggestions
                                  value={edu.school || ''}
                                  onChange={(e) => updateEducation(index, 'school', e.target.value)}
                                  onSelectSuggestion={(value) => updateEducation(index, 'school', value)}
                                  suggestions={schoolSuggestions}
                                  placeholder={language === "ja" ? "学校名" : "School name"}
                                />
                                <div className="grid grid-cols-2 gap-2 mt-2">
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
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => removeEducation(index)}
                                  className="mt-2"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  {language === "ja" ? "削除" : "Remove"}
                                </Button>
                              </div>
                            ))}
                            <Button 
                              variant="outline" 
                              onClick={addEducation}
                              className="w-full gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              {language === "ja" ? "学歴を追加" : "Add Education"}
                            </Button>
                          </div>
                        ) : (
                          profile?.education && profile.education.length > 0 ? (
                            <div className="space-y-2">
                              {profile.education.map((edu, index) => (
                                <div key={index} className="p-2 bg-background rounded">
                                  <p className="font-medium text-sm">{edu.school}</p>
                                  {edu.degree && <p className="text-xs text-muted-foreground mt-1">{edu.degree}</p>}
                                  {edu.period && <p className="text-xs text-muted-foreground">{edu.period}</p>}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">{language === "ja" ? "学歴を追加してください" : "Add education"}</p>
                          )
                        )}
                      </div>

                      {/* Work Experience Section */}
                      <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border/50">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-base font-semibold flex items-center gap-2">
                            <span>💼</span>
                            {language === "ja" ? "職歴" : "Work Experience"}
                          </h3>
                          {editingField === 'work_experience' ? (
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => saveField('work_experience')} className="gap-1">
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
                              onClick={() => startEditing('work_experience', profile?.work_experience || [])}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        {editingField === 'work_experience' ? (
                          <div className="space-y-3">
                            {(editValues.work_experience || []).map((work: any, index: number) => (
                              <div key={index} className="p-3 bg-background rounded border space-y-2">
                                <InputWithSuggestions
                                  value={work.company || ''}
                                  onChange={(e) => updateWorkExperience(index, 'company', e.target.value)}
                                  onSelectSuggestion={(value) => updateWorkExperience(index, 'company', value)}
                                  suggestions={companySuggestions}
                                  placeholder={language === "ja" ? "会社名" : "Company"}
                                />
                                <div className="grid grid-cols-2 gap-2">
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
                                </div>
                                <Textarea
                                  value={work.description || ''}
                                  onChange={(e) => updateWorkExperience(index, 'description', e.target.value)}
                                  placeholder={language === "ja" ? "業務内容..." : "Description..."}
                                  rows={2}
                                />
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => removeWorkExperience(index)}
                                  className="w-full"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  {language === "ja" ? "削除" : "Remove"}
                                </Button>
                              </div>
                            ))}
                            <Button 
                              variant="outline" 
                              onClick={addWorkExperience}
                              className="w-full gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              {language === "ja" ? "職歴を追加" : "Add Work Experience"}
                            </Button>
                          </div>
                        ) : (
                          profile?.work_experience && profile.work_experience.length > 0 ? (
                            <div className="space-y-2">
                              {profile.work_experience.map((work, index) => (
                                <div key={index} className="p-2 bg-background rounded">
                                  <div className="font-medium text-sm">{work.company}</div>
                                  <div className="text-xs text-primary mt-1">{work.position}</div>
                                  {work.period && (
                                    <div className="text-xs text-muted-foreground">{work.period}</div>
                                  )}
                                  {work.description && (
                                    <p className="text-xs text-muted-foreground mt-1">{work.description}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">{language === "ja" ? "職歴を追加してください" : "Add work experience"}</p>
                          )
                        )}
                      </div>

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
                
                {/* Username field */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold">{language === "ja" ? "公開用URL（ユーザー名）" : "Public URL (Username)"}</h3>
                    {editingField !== 'username' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => startEditing('username', profile?.username)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {editingField === 'username' ? (
                    <div className="space-y-2">
                      <Input
                        value={editValues.username || ''}
                        onChange={(e) => setEditValues({ ...editValues, username: e.target.value })}
                        placeholder="your-username"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveField('username')}>
                          <Check className="w-4 h-4 mr-1" />
                          {language === "ja" ? "保存" : "Save"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditing}>
                          <X className="w-4 h-4 mr-1" />
                          {language === "ja" ? "キャンセル" : "Cancel"}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {language === "ja" ? "プロフィールURL: " : "Profile URL: "}
                        {window.location.origin}/user/{editValues.username || profile?.username || user?.id}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-light mb-1">{profile?.username || <span className="text-muted-foreground italic">{language === "ja" ? "未設定" : "Not set"}</span>}</p>
                      <p className="text-xs text-muted-foreground">
                        {language === "ja" ? "プロフィールURL: " : "Profile URL: "}
                        {window.location.origin}/user/{profile?.username || user?.id}
                      </p>
                    </div>
                  )}
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
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {language === "ja" ? "紹介リンク" : "Referral Link"}
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          value={`${window.location.origin}/join?referral=${referralCode}`}
                          readOnly
                          className="flex-1 text-sm"
                          disabled={!referralCode}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/join?referral=${referralCode}`);
                            toast.success(language === "ja" ? "リンクをコピーしました" : "Link copied!");
                          }}
                          disabled={!referralCode}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
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

      <CoverUploadDialog
        open={coverUploadOpen}
        onOpenChange={setCoverUploadOpen}
        currentCoverUrl={profile?.cover_image_url}
        userId={user?.id || ''}
        onUploadComplete={(url) => {
          setProfile(prev => prev ? { ...prev, cover_image_url: url } : null);
        }}
      />

      <CoverImageGalleryDialog
        open={coverGalleryOpen}
        onOpenChange={setCoverGalleryOpen}
        onSelectImage={handleSelectDefaultCover}
        currentIndex={getCurrentCoverIndex(profile?.cover_image_url || null)}
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

      {/* Follow List Dialog */}
      <AlertDialog open={showFollowList !== null} onOpenChange={() => setShowFollowList(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {showFollowList === 'followers' 
                ? (language === "ja" ? "フォロワー" : "Followers")
                : (language === "ja" ? "フォロー中" : "Following")
              }
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-3">
            {followList.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {showFollowList === 'followers'
                  ? (language === "ja" ? "フォロワーはいません" : "No followers yet")
                  : (language === "ja" ? "誰もフォローしていません" : "Not following anyone yet")
                }
              </p>
            ) : (
              followList.map((user) => (
                <div 
                  key={user.id} 
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => {
                    const identifier = user.username || user.id;
                    navigate(`/user/${identifier}`);
                    setShowFollowList(null);
                  }}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>
                      {user.display_name?.[0] || user.username?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{user.display_name || user.username || "User"}</p>
                    {user.username && <p className="text-sm text-muted-foreground">@{user.username}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === "ja" ? "閉じる" : "Close"}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
};

export default MyPage;
