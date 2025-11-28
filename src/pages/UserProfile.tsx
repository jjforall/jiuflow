import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
  titles: Array<{title: string; date?: string; organization?: string}> | null;
}

export default function UserProfile() {
  const { userId: userIdOrUsername } = useParams();
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
    if (userIdOrUsername) {
      resolveUserAndLoadData();
    }
  }, [userIdOrUsername]);

  useEffect(() => {
    if (actualUserId && currentUser) {
      loadFollowStatus();
    }
    if (actualUserId) {
      loadFollowCounts();
    }
  }, [actualUserId, currentUser]);

  const resolveUserAndLoadData = async () => {
    if (!userIdOrUsername) return;

    try {
      // Try to resolve as username first
      const { data: profileByUsername } = await supabase
        .from('profiles')
        .select('id, email, display_name, bio, avatar_url, username, education, work_experience, belt_history, home_dojo, training_locations, titles, created_at, cover_image_url, organization_id')
        .eq('username', userIdOrUsername)
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
          titles: (profileByUsername.titles as any) || []
        });
      } else {
        // Fall back to UUID
        resolvedUserId = userIdOrUsername;
        const { data: profileById } = await supabase
          .from('profiles')
          .select('id, email, display_name, bio, avatar_url, username, education, work_experience, belt_history, home_dojo, training_locations, titles, created_at, cover_image_url, organization_id')
          .eq('id', userIdOrUsername)
          .single();
        
        if (profileById) {
          setProfile({
            ...profileById,
            education: (profileById.education as any) || [],
            work_experience: (profileById.work_experience as any) || [],
            belt_history: (profileById.belt_history as any) || [],
            training_locations: (profileById.training_locations as any) || [],
            titles: (profileById.titles as any) || []
          });
        }
      }
      
      setActualUserId(resolvedUserId);
      await Promise.all([
        loadUserVideos(resolvedUserId),
        loadUserEvents(resolvedUserId)
      ]);
    } catch (error) {
      console.error('Error resolving user:', error);
      toast.error("プロフィールの読み込みに失敗しました");
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
      const { data, error } = await supabase
        .from('user_videos')
        .select('*')
        .eq('user_id', userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

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
            
            {/* Profile Info Card with Glass Effect */}
            <Card className="mx-4 md:mx-8 -mt-28 relative backdrop-blur-xl bg-card/95 border-2 border-border/50 shadow-2xl hover:shadow-primary/5 transition-all duration-500">
              <CardContent className="p-6 md:p-10">
                <div className="flex flex-col md:flex-row gap-8 items-start md:items-end">
                  {/* Avatar with Ring */}
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-primary rounded-full blur-md opacity-75 group-hover:opacity-100 transition duration-500 animate-pulse" />
                    <Avatar className="relative h-36 w-36 md:h-40 md:w-40 ring-4 ring-background shadow-2xl">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-5xl font-bold bg-gradient-to-br from-primary to-accent text-primary-foreground">
                        {profile?.display_name?.[0] || profile?.username?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  
                  {/* User Info */}
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                        {profile?.display_name || profile?.email?.split('@')[0] || (language === "ja" ? "ユーザー" : "User")}
                      </h1>
                      {profile?.belt_history && profile.belt_history.length > 0 && (
                        <div className="transform hover:scale-110 transition-transform duration-300">
                          <BeltBadge belt={profile.belt_history[profile.belt_history.length - 1].belt} />
                        </div>
                      )}
                    </div>
                    
                    {profile?.bio && (
                      <p className="text-muted-foreground text-lg md:text-xl leading-relaxed max-w-2xl">
                        {profile.bio}
                      </p>
                    )}
                    
                    {/* Enhanced Stats Row with Follow Button */}
                    <div className="flex flex-wrap items-center gap-6">
                      <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20 hover:border-primary/40 transition-all duration-300 hover:scale-105">
                        <div className="p-2 bg-primary/20 rounded-lg">
                          <Video className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-2xl text-foreground">{videos.length}</span>
                          <span className="text-xs text-muted-foreground uppercase tracking-wide">
                            {language === "ja" ? "動画" : "Videos"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-accent/10 to-accent/5 rounded-xl border border-accent/20 hover:border-accent/40 transition-all duration-300 hover:scale-105 cursor-pointer">
                        <div className="p-2 bg-accent/20 rounded-lg">
                          <User className="w-5 h-5 text-accent" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-2xl text-foreground">{followersCount}</span>
                          <span className="text-xs text-muted-foreground uppercase tracking-wide">
                            {language === "ja" ? "フォロワー" : "Followers"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-muted/10 to-muted/5 rounded-xl border border-muted/20 hover:border-muted/40 transition-all duration-300 hover:scale-105 cursor-pointer">
                        <div className="flex flex-col">
                          <span className="font-bold text-2xl text-foreground">{followingCount}</span>
                          <span className="text-xs text-muted-foreground uppercase tracking-wide">
                            {language === "ja" ? "フォロー中" : "Following"}
                          </span>
                        </div>
                      </div>
                      
                      {profile?.titles && profile.titles.length > 0 && (
                        <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-accent/10 to-accent/5 rounded-xl border border-accent/20 hover:border-accent/40 transition-all duration-300 hover:scale-105">
                          <div className="text-2xl">🏆</div>
                          <div className="flex flex-col">
                            <span className="font-bold text-2xl text-foreground">{profile.titles.length}</span>
                            <span className="text-xs text-muted-foreground uppercase tracking-wide">
                              {language === "ja" ? "タイトル" : "Titles"}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {profile?.created_at && (
                        <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 rounded-xl border border-border hover:border-border/80 transition-all duration-300">
                          <Calendar className="w-5 h-5 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">
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
                          className="ml-auto shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          <User className="w-5 h-5 mr-2" />
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

          {/* BJJ Profile Section with Elegant Design */}
          {(profile?.belt_history && profile.belt_history.length > 0) || 
           profile?.home_dojo || 
           (profile?.training_locations && profile.training_locations.length > 0) ||
           (profile?.titles && profile.titles.length > 0) ? (
            <Card className="mb-12 animate-fade-up backdrop-blur-xl bg-card/95 border-2 border-border/50 shadow-xl hover:shadow-2xl transition-all duration-500">
              <CardContent className="p-8 md:p-12">
                <div className="flex items-center gap-3 mb-10">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl shadow-lg">
                    🥋
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                    {language === "ja" ? "柔術プロフィール" : "BJJ Profile"}
                  </h2>
                </div>
                
                <div className="grid md:grid-cols-2 gap-10">
                  {/* Belt History Timeline - Enhanced */}
                  {profile?.belt_history && profile.belt_history.length > 0 && (
                    <div className="md:col-span-2">
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <div className="text-xl">🥋</div>
                        </div>
                        <h3 className="text-2xl font-bold">
                          {language === "ja" ? "帯の履歴" : "Belt Journey"}
                        </h3>
                      </div>
                      <div className="relative">
                        {/* Enhanced Timeline line with gradient */}
                        <div className="absolute left-7 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-accent to-transparent rounded-full" />
                        
                        <div className="space-y-8">
                          {[...profile.belt_history].reverse().map((belt, index) => (
                            <div 
                              key={index} 
                              className="relative pl-20 animate-fade-up hover:translate-x-2 transition-transform duration-300" 
                              style={{ animationDelay: `${index * 0.15}s` }}
                            >
                              {/* Enhanced Timeline dot with glow */}
                              <div className="absolute left-4 top-2 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent shadow-xl flex items-center justify-center z-10 group-hover:scale-125 transition-transform">
                                <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                              </div>
                              
                              {/* Content card with glass effect */}
                              <div className="bg-gradient-to-br from-card to-card/50 backdrop-blur-sm border border-border/30 rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:border-primary/30 transition-all duration-300 group relative overflow-hidden">
                                {/* Decorative gradient overlay */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/5 to-transparent rounded-full blur-2xl" />
                                
                                <div className="flex items-start gap-5 relative z-10">
                                  <div className="transform group-hover:scale-110 transition-transform duration-300">
                                    <BeltBadge belt={belt.belt} />
                                  </div>
                                  <div className="flex-1 min-w-0 space-y-2">
                                    <h4 className="font-bold text-xl md:text-2xl text-foreground">{belt.belt}</h4>
                                    {belt.instructor && (
                                      <p className="text-sm md:text-base text-muted-foreground flex items-center gap-2">
                                        <span className="text-base">👨‍🏫</span>
                                        <span className="font-medium">{belt.instructor}</span>
                                      </p>
                                    )}
                                    {belt.date && (
                                      <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        <span>{belt.date}</span>
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

                  {/* Titles with Trophy Design */}
                  {profile?.titles && profile.titles.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                          <span className="text-xl">🏆</span>
                        </div>
                        <h3 className="text-xl font-bold">
                          {language === "ja" ? "獲得タイトル" : "Achievements"}
                        </h3>
                      </div>
                      <div className="space-y-3">
                        {profile.titles.map((title, index) => (
                          <div 
                            key={index} 
                            className="p-5 bg-gradient-to-br from-accent/10 to-accent/5 rounded-2xl border border-accent/30 hover:border-accent/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group"
                            style={{ animationDelay: `${index * 0.1}s` }}
                          >
                            <div className="relative">
                              <div className="absolute -top-2 -right-2 w-20 h-20 bg-gradient-to-br from-accent/20 to-transparent rounded-full blur-xl group-hover:scale-125 transition-transform" />
                              <p className="font-bold text-lg text-accent-foreground relative z-10">{title.title}</p>
                              {title.organization && (
                                <p className="text-sm text-muted-foreground mt-1">{title.organization}</p>
                              )}
                              {title.date && (
                                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {title.date}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Home Dojo with Elegant Design */}
                  {profile?.home_dojo && (
                    <div>
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <span className="text-xl">🏛️</span>
                        </div>
                        <h3 className="text-xl font-bold">
                          {language === "ja" ? "所属道場" : "Home Dojo"}
                        </h3>
                      </div>
                      <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border-2 border-primary/30 hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
                        <p className="font-bold text-xl md:text-2xl relative z-10">{profile.home_dojo}</p>
                      </div>
                    </div>
                  )}

                  {/* Training Locations with Badge Grid */}
                  {profile?.training_locations && profile.training_locations.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                          <span className="text-xl">🗺️</span>
                        </div>
                        <h3 className="text-xl font-bold">
                          {language === "ja" ? "出稽古先" : "Training Spots"}
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {profile.training_locations.map((location, index) => (
                          <Badge 
                            key={index} 
                            variant="outline" 
                            className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-background to-accent/5 border-border/50 hover:border-accent/50 hover:scale-105 transition-all duration-300 shadow-sm hover:shadow-md"
                          >
                            {location}
                          </Badge>
                        ))}
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
