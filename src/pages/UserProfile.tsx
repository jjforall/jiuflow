import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { UserVideoCard } from "@/components/UserVideoCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { User, Video, Edit2, Check, X, Plus, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { EventCard } from "@/components/EventCard";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BeltBadge } from "@/components/ui/belt-badge";
import { Badge } from "@/components/ui/badge";
import { CoverUploadDialog } from "@/components/CoverUploadDialog";
import { CoverImageGalleryDialog } from "@/components/CoverImageGalleryDialog";
import { ChristmasSnow } from "@/components/ChristmasSnow";
import { Camera, Image } from "lucide-react";
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
  user_id: string;
}

interface Profile {
  email: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  username: string | null;
  created_at: string | null;
  cover_image_url: string | null;
  organization_id: string | null;
  education: Array<{school: string; degree?: string; period?: string}> | null;
  work_experience: Array<{company: string; position: string; period?: string; description?: string}> | null;
  belt_history: Array<{belt: string; date?: string; instructor?: string}> | null;
  home_dojo: string | null;
  training_locations: Array<string> | null;
  titles: Array<{title: string; date?: string; organization?: string; customTitle?: string}> | null;
  favorite_fighters: Array<string> | null;
  favorite_techniques: Array<string> | null;
  hometown: string | null;
  hobbies: Array<string> | null;
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

export default function UserProfile() {
  const { identifier } = useParams();
  const { language } = useLanguage();
  const [videos, setVideos] = useState<UserVideo[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [purchasedVideos, setPurchasedVideos] = useState<Set<string>>(new Set());
  const [events, setEvents] = useState<any[]>([]);
  const [registeredEvents, setRegisteredEvents] = useState<Set<string>>(new Set());
  const [actualUserId, setActualUserId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const [isCoverGalleryOpen, setIsCoverGalleryOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [userDojos, setUserDojos] = useState<Array<{ dojo: any; relationship_type: string }>>([]);

  useEffect(() => {
    const checkCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user?.id || null);
      
      if (user?.id) {
        // Load purchased videos
        const { data: purchases } = await supabase
          .from('video_purchases')
          .select('video_id')
          .eq('buyer_id', user.id);
        
        if (purchases) {
          setPurchasedVideos(new Set(purchases.map(p => p.video_id)));
        }
      }
    };
    checkCurrentUser();
  }, []);

  useEffect(() => {
    if (identifier) {
      resolveUserAndLoadData();
    }
  }, [identifier]);

  useEffect(() => {
    if (actualUserId && currentUser) {
      loadFollowStatus();
    }
    if (actualUserId) {
      loadFollowCounts();
    }
  }, [actualUserId, currentUser]);

  const resolveUserAndLoadData = async () => {
    if (!identifier) return;

    try {
      // Check if identifier looks like a UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
      
      // Try to resolve as username first if not UUID, otherwise use ID
      const { data: profileByUsername } = await supabase
        .from('profiles')
        .select('id, email, display_name, bio, avatar_url, username, education, work_experience, belt_history, home_dojo, training_locations, titles, created_at, cover_image_url, organization_id, favorite_fighters, favorite_techniques, hometown, hobbies, date_of_birth, social_links')
        .eq(isUUID ? 'id' : 'username', identifier)
        .maybeSingle();

      let resolvedUserId: string;
      
      if (profileByUsername) {
        resolvedUserId = profileByUsername.id;
        setProfile({
          ...profileByUsername,
          education: (profileByUsername.education as any) || [],
          work_experience: (profileByUsername.work_experience as any) || [],
          belt_history: (profileByUsername.belt_history as any) || [],
          training_locations: (profileByUsername.training_locations as any) || [],
          titles: (profileByUsername.titles as any) || [],
          favorite_fighters: (profileByUsername.favorite_fighters as any) || [],
          favorite_techniques: (profileByUsername.favorite_techniques as any) || [],
          hobbies: (profileByUsername.hobbies as any) || [],
          social_links: (profileByUsername.social_links as any) || {}
        });
      } else {
        // Fall back to UUID (shouldn't happen if logic above works)
        resolvedUserId = identifier;
        const { data: profileById } = await supabase
          .from('profiles')
          .select('id, email, display_name, bio, avatar_url, username, education, work_experience, belt_history, home_dojo, training_locations, titles, created_at, cover_image_url, organization_id, favorite_fighters, favorite_techniques, hometown, hobbies, date_of_birth, social_links')
          .eq('id', identifier)
          .single();
        
        if (profileById) {
          setProfile({
            ...profileById,
            education: (profileById.education as any) || [],
            work_experience: (profileById.work_experience as any) || [],
            belt_history: (profileById.belt_history as any) || [],
            training_locations: (profileById.training_locations as any) || [],
            titles: (profileById.titles as any) || [],
            favorite_fighters: (profileById.favorite_fighters as any) || [],
            favorite_techniques: (profileById.favorite_techniques as any) || [],
            hobbies: (profileById.hobbies as any) || [],
            social_links: (profileById.social_links as any) || {}
          });
        }
      }
      
      setActualUserId(resolvedUserId);
      await Promise.all([
        loadUserVideos(resolvedUserId),
        loadUserEvents(resolvedUserId),
        loadUserDojos(resolvedUserId)
      ]);
    } catch (error) {
      console.error('Error resolving user:', error);
      toast.error("プロフィールの読み込みに失敗しました");
    }
  };

  const loadUserDojos = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_dojos')
        .select(`
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
        .eq('user_id', userId);

      if (error) throw error;
      
      const formattedDojos = (data || []).map((item: any) => ({
        dojo: item.dojos,
        relationship_type: item.relationship_type
      }));
      
      setUserDojos(formattedDojos);
    } catch (error) {
      console.error('Error loading user dojos:', error);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("purchase") === "success") {
      toast.success("動画を購入しました！");
      window.history.replaceState({}, '', window.location.pathname);
      
      // Reload purchased videos
      const checkCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          const { data: purchases } = await supabase
            .from('video_purchases')
            .select('video_id')
            .eq('buyer_id', user.id);
          
          if (purchases) {
            setPurchasedVideos(new Set(purchases.map(p => p.video_id)));
          }
        }
      };
      checkCurrentUser();
    }
  }, []);

  const loadUserProfile = async () => {
    // This function is no longer needed as profile is loaded in resolveUserAndLoadData
  };

  const loadUserVideos = async (userId: string) => {
    if (!userId) return;

    setLoading(true);
    try {
      // 最新の認証情報を取得
      const { data: { user } } = await supabase.auth.getUser();
      
      let query = supabase
        .from('user_videos')
        .select('*')
        .eq('user_id', userId);

      // 自分のプロフィールでない場合のみ公開動画に限定
      if (user?.id !== userId) {
        query = query.eq('is_public', true);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserEvents = async (userId: string) => {
    if (!userId) return;

    try {
      const { data: eventsData, error } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', userId)
        .eq('is_public', true)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(eventsData || []);

      // Load user's registrations
      if (currentUser) {
        const { data: registrations } = await supabase
          .from('event_registrations')
          .select('event_id')
          .eq('user_id', currentUser);

        if (registrations) {
          setRegisteredEvents(new Set(registrations.map(r => r.event_id)));
        }
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const handleRegisterEvent = async (eventId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error(language === "ja" ? "イベントに参加するにはログインが必要です" : "Login required to register");
      return;
    }

    try {
      // Get event details
      const { data: event } = await supabase
        .from('events')
        .select('price, title')
        .eq('id', eventId)
        .single();

      if (!event) {
        toast.error(language === "ja" ? "イベントが見つかりません" : "Event not found");
        return;
      }

      if (event.price > 0) {
        // TODO: Implement payment flow
        toast.info(language === "ja" ? "支払い機能は近日公開予定です" : "Payment coming soon");
      } else {
        // Free event, register directly
        const { error } = await supabase
          .from('event_registrations')
          .insert({
            event_id: eventId,
            user_id: user.id,
            payment_status: 'completed'
          });

        if (error) throw error;

        toast.success(language === "ja" ? "登録しました！" : "Registered successfully!");
        if (actualUserId) {
          loadUserEvents(actualUserId);
        }
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error?.code === '23505') {
        toast.error(language === "ja" ? "既に登録済みです" : "Already registered");
      } else {
        toast.error(language === "ja" ? "登録に失敗しました" : "Registration failed");
      }
    }
  };

  const handlePurchase = async (videoId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("動画を購入するにはログインが必要です");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-video-purchase', {
        body: { videoId }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error("購入処理に失敗しました");
    }
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
    if (!actualUserId || !profile) return;

    try {
      const updateData: any = {};
      
      if (field === 'display_name') {
        updateData.display_name = editValues.display_name?.trim() || null;
      } else if (field === 'bio') {
        updateData.bio = editValues.bio?.trim() || null;
      } else if (field === 'education') {
        updateData.education = editValues.education || [];
      } else if (field === 'work_experience') {
        updateData.work_experience = editValues.work_experience || [];
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', actualUserId);

      if (error) throw error;

      // Update local state
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

  const loadFollowStatus = async () => {
    if (!actualUserId || !currentUser) return;

    try {
      const { data } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', currentUser)
        .eq('following_id', actualUserId)
        .maybeSingle();

      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error loading follow status:', error);
    }
  };

  const loadFollowCounts = async () => {
    if (!actualUserId) return;

    try {
      // Get followers count
      const { count: followers } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', actualUserId);

      // Get following count
      const { count: following } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', actualUserId);

      setFollowersCount(followers || 0);
      setFollowingCount(following || 0);
    } catch (error) {
      console.error('Error loading follow counts:', error);
    }
  };

  const handleFollow = async () => {
    if (!currentUser || !actualUserId) {
      toast.error(language === "ja" ? "フォローするにはログインが必要です" : "Login required to follow");
      return;
    }

    try {
      const { error } = await supabase
        .from('user_follows')
        .insert({
          follower_id: currentUser,
          following_id: actualUserId
        });

      if (error) throw error;

      setIsFollowing(true);
      setFollowersCount(prev => prev + 1);
      toast.success(language === "ja" ? "フォローしました" : "Following");
    } catch (error: any) {
      console.error('Error following:', error);
      if (error?.code === '23505') {
        toast.error(language === "ja" ? "既にフォローしています" : "Already following");
      } else {
        toast.error(language === "ja" ? "フォローに失敗しました" : "Follow failed");
      }
    }
  };

  const handleUnfollow = async () => {
    if (!currentUser || !actualUserId) return;

    try {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', currentUser)
        .eq('following_id', actualUserId);

      if (error) throw error;

      setIsFollowing(false);
      setFollowersCount(prev => Math.max(0, prev - 1));
      toast.success(language === "ja" ? "フォローを解除しました" : "Unfollowed");
    } catch (error) {
      console.error('Error unfollowing:', error);
      toast.error(language === "ja" ? "フォロー解除に失敗しました" : "Unfollow failed");
    }
  };

  const handleSelectDefaultCover = async (index: number) => {
    if (!profile || !actualUserId) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ cover_image_url: `default-${index}` })
        .eq("id", actualUserId);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, cover_image_url: `default-${index}` } : prev);
      toast.success(language === "ja" ? "カバー画像を更新しました" : "Cover image updated");
    } catch (error) {
      console.error("Error updating cover image:", error);
      toast.error(language === "ja" ? "カバー画像の更新に失敗しました" : "Failed to update cover image");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/5">
      <ChristmasSnow />
      <Navigation />
      
      <main className="pt-24 pb-20 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Stunning Profile Header with Cover */}
          <div className="relative mb-16 animate-fade-up">
            {/* Cover Image with Overlay */}
            <div className="h-72 md:h-96 bg-gradient-to-br from-primary/40 via-accent/30 to-primary/20 rounded-3xl relative overflow-hidden group shadow-2xl">
              {profile?.cover_image_url ? (
                <>
                  <img 
                    src={profile.cover_image_url} 
                    alt="Cover" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
                </>
              ) : (
                <>
                  <div 
                    className="absolute inset-0 bg-cover bg-center" 
                    style={{ backgroundImage: `url(${getCoverImageUrl(profile?.cover_image_url || null, actualUserId)})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
                </>
              )}
              
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
              
              {currentUser === actualUserId && (
                <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="backdrop-blur-md bg-background/80 hover:bg-background/90 border border-border/50 shadow-xl"
                    onClick={() => setIsCoverGalleryOpen(true)}
                  >
                    <Image className="w-4 h-4 mr-2" />
                    {language === "ja" ? "ギャラリー" : "Gallery"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="backdrop-blur-md bg-background/80 hover:bg-background/90 border border-border/50 shadow-xl"
                    onClick={() => setCoverDialogOpen(true)}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {language === "ja" ? "アップロード" : "Upload"}
                  </Button>
                </div>
              )}
            </div>
            
            {/* Profile Info Card */}
            <Card className="mx-4 md:mx-8 -mt-24 relative bg-card border shadow-xl">
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
                  {/* Avatar */}
                  <Avatar className="h-32 w-32 md:h-36 md:w-36 ring-4 ring-background shadow-lg">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-primary to-accent text-primary-foreground">
                      {profile?.display_name?.[0] || profile?.username?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* User Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-3xl md:text-4xl font-bold">
                        {profile?.display_name || profile?.email?.split('@')[0] || (language === "ja" ? "ユーザー" : "User")}
                      </h1>
                      {profile?.belt_history && profile.belt_history.length > 0 && (
                        <BeltBadge belt={profile.belt_history[profile.belt_history.length - 1].belt} />
                      )}
                    </div>
                    
                    {profile?.bio && (
                      <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-2xl">
                        {profile.bio}
                      </p>
                    )}
                    
                    {/* Stats Row with Follow Button */}
                    <div className="flex flex-wrap items-center gap-4 pt-2">
                      {videos.length > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg border border-primary/20">
                          <Video className="w-4 h-4 text-primary" />
                          <div className="flex flex-col">
                            <span className="font-bold text-lg">{videos.length}</span>
                            <span className="text-xs text-muted-foreground">
                              {language === "ja" ? "動画" : "Videos"}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 px-3 py-2 bg-accent/10 rounded-lg border border-accent/20">
                        <User className="w-4 h-4 text-accent" />
                        <div className="flex flex-col">
                          <span className="font-bold text-lg">{followersCount}</span>
                          <span className="text-xs text-muted-foreground">
                            {language === "ja" ? "フォロワー" : "Followers"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border border-border">
                        <div className="flex flex-col">
                          <span className="font-bold text-lg">{followingCount}</span>
                          <span className="text-xs text-muted-foreground">
                            {language === "ja" ? "フォロー中" : "Following"}
                          </span>
                        </div>
                      </div>
                      
                      {profile?.titles && profile.titles.length > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-accent/10 rounded-lg border border-accent/20">
                          <div className="text-lg">🏆</div>
                          <div className="flex flex-col">
                            <span className="font-bold text-lg">{profile.titles.length}</span>
                            <span className="text-xs text-muted-foreground">
                              {language === "ja" ? "タイトル" : "Titles"}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {profile?.created_at && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border border-border">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {new Date(profile.created_at).toLocaleDateString(language === "ja" ? "ja-JP" : "en-US", { 
                                year: 'numeric', 
                                month: 'short' 
                              })}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {language === "ja" ? "登録日" : "Joined"}
                            </span>
                          </div>
                        </div>
                      )}

                      {currentUser && currentUser !== actualUserId && (
                        <Button
                          onClick={isFollowing ? handleUnfollow : handleFollow}
                          variant={isFollowing ? "outline" : "default"}
                          size="lg"
                          className="ml-auto"
                        >
                          <User className="w-4 h-4 mr-2" />
                          {isFollowing 
                            ? (language === "ja" ? "フォロー中" : "Following")
                            : (language === "ja" ? "フォロー" : "Follow")
                          }
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* BJJ Profile Section */}
          {(profile?.belt_history && profile.belt_history.length > 0) || 
           profile?.home_dojo || 
           (profile?.training_locations && profile.training_locations.length > 0) ||
           (profile?.titles && profile.titles.length > 0) ||
           (profile?.favorite_fighters && profile.favorite_fighters.length > 0) ||
           (profile?.favorite_techniques && profile.favorite_techniques.length > 0) ? (
            <Card className="mb-8 animate-fade-up bg-card border shadow-lg">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
                    🥋
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold">
                    {language === "ja" ? "柔術プロフィール" : "BJJ Profile"}
                  </h2>
                </div>
                
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Belt History */}
                  {profile?.belt_history && profile.belt_history.length > 0 && (
                    <div className="md:col-span-2">
                      <div className="flex items-center gap-2 mb-6">
                        <div className="text-lg">🥋</div>
                        <h3 className="text-xl font-bold">
                          {language === "ja" ? "帯の履歴" : "Belt Journey"}
                        </h3>
                      </div>
                      <div className="relative">
                        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
                        
                        <div className="space-y-6">
                          {[...profile.belt_history].reverse().map((belt, index) => (
                            <div 
                              key={index} 
                              className="relative pl-16 animate-fade-up" 
                              style={{ animationDelay: `${index * 0.1}s` }}
                            >
                              <div className="absolute left-3 top-1 w-6 h-6 rounded-full bg-primary shadow-md flex items-center justify-center z-10">
                                <div className="w-2 h-2 rounded-full bg-white" />
                              </div>
                              
                              <div className="bg-card/50 border rounded-xl p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start gap-4">
                                  <BeltBadge belt={belt.belt} />
                                  <div className="flex-1 space-y-1">
                                    <h4 className="font-bold text-lg">{belt.belt}</h4>
                                    {belt.instructor && (
                                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                                        <span>👨‍🏫</span>
                                        {belt.instructor}
                                      </p>
                                    )}
                                    {belt.date && (
                                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {belt.date}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Titles */}
                  {profile?.titles && profile.titles.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-lg">🏆</span>
                        <h3 className="text-xl font-bold">
                          {language === "ja" ? "獲得タイトル" : "Achievements"}
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {profile.titles.map((title, index) => (
                          <div 
                            key={index} 
                            className="p-4 bg-accent/10 rounded-lg border border-accent/20 hover:border-accent/40 transition-colors"
                          >
                            <p className="font-semibold text-base">
                              {title.title === "custom" ? title.customTitle : title.title}
                            </p>
                            {title.organization && (
                              <p className="text-sm text-muted-foreground mt-1">{title.organization}</p>
                            )}
                            {title.date && (
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {title.date}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Favorite Fighters */}
                  {profile?.favorite_fighters && profile.favorite_fighters.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-lg">👤</span>
                        <h3 className="text-xl font-bold">
                          {language === "ja" ? "好きな選手" : "Favorite Fighters"}
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {profile.favorite_fighters.map((fighter, index) => (
                          <Badge 
                            key={index} 
                            variant="secondary" 
                            className="text-sm px-3 py-1"
                          >
                            {fighter}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Favorite Techniques */}
                  {profile?.favorite_techniques && profile.favorite_techniques.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-lg">🥋</span>
                        <h3 className="text-xl font-bold">
                          {language === "ja" ? "好きな技" : "Favorite Techniques"}
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {profile.favorite_techniques.map((technique, index) => (
                          <Badge 
                            key={index} 
                            variant="secondary" 
                            className="text-sm px-3 py-1"
                          >
                            {technique}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Personal Info Section */}
                  {(profile?.hometown || profile?.date_of_birth || (profile?.hobbies && profile.hobbies.length > 0)) && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-lg">ℹ️</span>
                        <h3 className="text-xl font-bold">
                          {language === "ja" ? "プロフィール" : "About"}
                        </h3>
                      </div>
                      <div className="space-y-3">
                        {profile?.hometown && (
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🏠</span>
                            <div>
                              <p className="text-xs text-muted-foreground">{language === "ja" ? "出身地" : "Hometown"}</p>
                              <p className="font-medium">{profile.hometown}</p>
                            </div>
                          </div>
                        )}
                        {profile?.date_of_birth && (() => {
                          const today = new Date();
                          const birthDate = new Date(profile.date_of_birth);
                          let age = today.getFullYear() - birthDate.getFullYear();
                          const monthDiff = today.getMonth() - birthDate.getMonth();
                          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                            age--;
                          }
                          return (
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🎂</span>
                              <div>
                                <p className="text-xs text-muted-foreground">{language === "ja" ? "年齢" : "Age"}</p>
                                <p className="font-medium">{age} {language === "ja" ? "歳" : "years old"}</p>
                              </div>
                            </div>
                          );
                        })()}
                        {profile?.hobbies && profile.hobbies.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">🎯</span>
                              <p className="text-xs text-muted-foreground">{language === "ja" ? "趣味" : "Hobbies"}</p>
                            </div>
                            <div className="flex flex-wrap gap-2 ml-7">
                              {profile.hobbies.map((hobby, index) => (
                                <Badge 
                                  key={index} 
                                  variant="outline" 
                                  className="text-sm"
                                >
                                  {hobby}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Social Links */}
                  {profile?.social_links && (profile.social_links.instagram || profile.social_links.twitter || profile.social_links.youtube || profile.social_links.facebook || profile.social_links.tiktok || profile.social_links.website) && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-lg">🔗</span>
                        <h3 className="text-xl font-bold">
                          {language === "ja" ? "SNSリンク" : "Social Links"}
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {profile.social_links.instagram && (
                          <a 
                            href={profile.social_links.instagram} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted border border-border hover:border-primary/30 transition-colors"
                          >
                            <span>📷</span>
                            <span className="text-sm font-medium">Instagram</span>
                          </a>
                        )}
                        {profile.social_links.twitter && (
                          <a 
                            href={profile.social_links.twitter} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted border border-border hover:border-primary/30 transition-colors"
                          >
                            <span>🐦</span>
                            <span className="text-sm font-medium">Twitter</span>
                          </a>
                        )}
                        {profile.social_links.youtube && (
                          <a 
                            href={profile.social_links.youtube} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted border border-border hover:border-primary/30 transition-colors"
                          >
                            <span>▶️</span>
                            <span className="text-sm font-medium">YouTube</span>
                          </a>
                        )}
                        {profile.social_links.facebook && (
                          <a 
                            href={profile.social_links.facebook} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted border border-border hover:border-primary/30 transition-colors"
                          >
                            <span>👍</span>
                            <span className="text-sm font-medium">Facebook</span>
                          </a>
                        )}
                        {profile.social_links.tiktok && (
                          <a 
                            href={profile.social_links.tiktok} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted border border-border hover:border-primary/30 transition-colors"
                          >
                            <span>🎵</span>
                            <span className="text-sm font-medium">TikTok</span>
                          </a>
                        )}
                        {profile.social_links.website && (
                          <a 
                            href={profile.social_links.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted border border-border hover:border-primary/30 transition-colors"
                          >
                            <span>🌐</span>
                            <span className="text-sm font-medium">{language === "ja" ? "ウェブサイト" : "Website"}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Dojos Section */}
                  {userDojos.length > 0 && (
                    <div className="md:col-span-2">
                      <div className="space-y-6">
                        {/* Home Dojos */}
                        {userDojos.filter(d => d.relationship_type === 'home').length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-4">
                              <span className="text-lg">🏛️</span>
                              <h3 className="text-xl font-bold">
                                {language === "ja" ? "所属道場" : "Home Dojo"}
                              </h3>
                            </div>
                            <div className="space-y-3">
                              {userDojos
                                .filter(d => d.relationship_type === 'home')
                                .map((item, index) => (
                                  <Link
                                    key={index}
                                    to={`/dojo/${item.dojo.id}`}
                                    className="block p-4 bg-primary/10 rounded-lg border border-primary/20 hover:border-primary/40 transition-colors"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-semibold text-lg">
                                          {language === "ja" ? item.dojo.name_ja : language === "pt" ? item.dojo.name_pt : item.dojo.name}
                                        </p>
                                        {item.dojo.location && (
                                          <p className="text-sm text-muted-foreground mt-1">
                                            {item.dojo.location}
                                          </p>
                                        )}
                                      </div>
                                      {item.dojo.is_verified && (
                                        <Badge variant="secondary" className="ml-2">
                                          {language === "ja" ? "公認" : "Verified"}
                                        </Badge>
                                      )}
                                    </div>
                                  </Link>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* Training Locations */}
                        {userDojos.filter(d => d.relationship_type === 'training').length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-4">
                              <span className="text-lg">🗺️</span>
                              <h3 className="text-xl font-bold">
                                {language === "ja" ? "出稽古先" : "Training Spots"}
                              </h3>
                            </div>
                            <div className="space-y-3">
                              {userDojos
                                .filter(d => d.relationship_type === 'training')
                                .map((item, index) => (
                                  <Link
                                    key={index}
                                    to={`/dojo/${item.dojo.id}`}
                                    className="block p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/30 transition-colors"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-semibold text-base">
                                          {language === "ja" ? item.dojo.name_ja : language === "pt" ? item.dojo.name_pt : item.dojo.name}
                                        </p>
                                        {item.dojo.location && (
                                          <p className="text-sm text-muted-foreground mt-1">
                                            {item.dojo.location}
                                          </p>
                                        )}
                                      </div>
                                      {item.dojo.is_verified && (
                                        <Badge variant="outline" className="ml-2">
                                          {language === "ja" ? "公認" : "Verified"}
                                        </Badge>
                                      )}
                                    </div>
                                  </Link>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Events Section with Enhanced Design */}
          {events.length > 0 && (
            <div className="mb-16 animate-fade-up">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                  <Calendar className="w-6 h-6 text-primary-foreground" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold">
                  {language === "ja" ? "開催予定のイベント" : "Upcoming Events"}
                </h2>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event, index) => (
                  <div key={event.id} className="animate-fade-up" style={{ animationDelay: `${index * 0.1}s` }}>
                    <EventCard
                      event={event}
                      onRegister={handleRegisterEvent}
                      isRegistered={registeredEvents.has(event.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Videos Section with Elegant Header */}
          <div className="mb-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <Video className="w-6 h-6 text-primary-foreground" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">
                {language === "ja" ? "動画コレクション" : "Video Collection"}
              </h2>
            </div>
          </div>

          {/* Videos Grid with Enhanced Loading States */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div 
                  key={i} 
                  className="space-y-4 border-2 border-border/50 rounded-2xl p-6 animate-pulse backdrop-blur-sm bg-card/50"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 rounded-xl" />
                  <div className="h-6 bg-gradient-to-r from-muted to-muted/50 rounded-lg" />
                  <div className="h-4 bg-gradient-to-r from-muted to-muted/50 rounded-lg w-3/4" />
                </div>
              ))}
            </div>
          ) : videos.length === 0 ? (
            <Card className="backdrop-blur-xl bg-card/95 border-2 border-border/50 shadow-xl">
              <CardContent className="p-16 text-center">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                  <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <Video className="h-12 w-12 text-primary" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-3">
                  {language === "ja" ? "まだ動画がありません" : "No Videos Yet"}
                </h3>
                <p className="text-muted-foreground text-lg">
                  {language === "ja" 
                    ? "このユーザーはまだ公開動画を投稿していません" 
                    : "This user hasn't posted any public videos yet"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {videos.map((video, index) => (
                <div 
                  key={video.id} 
                  className="animate-fade-up hover:scale-[1.02] transition-transform duration-300"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <UserVideoCard
                    video={video}
                    isOwner={currentUser === actualUserId}
                    isPurchased={purchasedVideos.has(video.id)}
                    onPurchase={() => handlePurchase(video.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
      
      {currentUser === actualUserId && actualUserId && (
        <>
          <CoverUploadDialog
            open={coverDialogOpen}
            onOpenChange={setCoverDialogOpen}
            currentCoverUrl={profile?.cover_image_url}
            userId={actualUserId}
            onUploadComplete={(url) => {
              if (profile) {
                setProfile({ ...profile, cover_image_url: url });
              }
            }}
          />
          <CoverImageGalleryDialog
            open={isCoverGalleryOpen}
            onOpenChange={setIsCoverGalleryOpen}
            onSelectImage={handleSelectDefaultCover}
            currentIndex={getCurrentCoverIndex(profile?.cover_image_url || null)}
          />
        </>
      )}
    </div>
  );
}
