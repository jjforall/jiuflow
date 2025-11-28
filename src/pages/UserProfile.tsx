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
import { Camera } from "lucide-react";

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

  const resolveUserAndLoadData = async () => {
    if (!userIdOrUsername) return;

    try {
      // Try to resolve as username first
      const { data: profileByUsername } = await supabase
        .from('profiles')
        .select('id, email, display_name, bio, avatar_url, username, education, work_experience, belt_history, home_dojo, training_locations, titles, created_at, cover_image_url')
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
          .select('id, email, display_name, bio, avatar_url, username, education, work_experience, belt_history, home_dojo, training_locations, titles, created_at, cover_image_url')
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

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Beautiful Profile Header with Cover */}
          <div className="relative mb-12 animate-fade-up">
            {/* Cover Image */}
            <div className="h-64 bg-gradient-to-r from-primary/30 via-accent/20 to-primary/30 rounded-t-3xl relative overflow-hidden group">
              {profile?.cover_image_url ? (
                <img 
                  src={profile.cover_image_url} 
                  alt="Cover" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1555597408-26bc8e548a46?w=1200')] bg-cover bg-center opacity-20" />
              )}
              
              {currentUser === actualUserId && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setCoverDialogOpen(true)}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  カバー画像を変更
                </Button>
              )}
            </div>
            
            {/* Profile Info Overlay */}
            <Card className="mx-6 -mt-20 relative">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                  {/* Avatar */}
                  <Avatar className="h-32 w-32 border-4 border-background shadow-2xl">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-4xl">
                      {profile?.display_name?.[0] || profile?.username?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* User Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-4xl font-bold">
                        {profile?.display_name || profile?.email?.split('@')[0] || "ユーザー"}
                      </h1>
                      {profile?.belt_history && profile.belt_history.length > 0 && (
                        <BeltBadge belt={profile.belt_history[profile.belt_history.length - 1].belt} />
                      )}
                    </div>
                    
                    {profile?.bio && (
                      <p className="text-muted-foreground mb-4 text-lg">{profile.bio}</p>
                    )}
                    
                    {/* Stats Row */}
                    <div className="flex flex-wrap gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold">{videos.length}</span>
                        <span className="text-muted-foreground">{language === "ja" ? "動画" : "Videos"}</span>
                      </div>
                      {profile?.titles && profile.titles.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="gap-1">
                            🏆 {profile.titles.length} {language === "ja" ? "タイトル" : "Titles"}
                          </Badge>
                        </div>
                      )}
                      {profile?.created_at && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {language === "ja" ? "登録: " : "Joined: "}
                            {new Date(profile.created_at).toLocaleDateString(language === "ja" ? "ja-JP" : "en-US", { 
                              year: 'numeric', 
                              month: 'short' 
                            })}
                          </span>
                        </div>
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
           (profile?.titles && profile.titles.length > 0) ? (
            <Card className="mb-8 animate-fade-up">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-6">🥋 {language === "ja" ? "柔術プロフィール" : "BJJ Profile"}</h2>
                
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Belt History Timeline */}
                  {profile?.belt_history && profile.belt_history.length > 0 && (
                    <div className="md:col-span-2">
                      <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        🥋 {language === "ja" ? "帯の履歴" : "Belt History"}
                      </h3>
                      <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-accent to-primary/20" />
                        
                        <div className="space-y-6">
                          {[...profile.belt_history].reverse().map((belt, index) => (
                            <div key={index} className="relative pl-16 animate-fade-up" style={{ animationDelay: `${index * 0.1}s` }}>
                              {/* Timeline dot */}
                              <div className="absolute left-3 top-1 w-6 h-6 rounded-full bg-background border-4 border-primary shadow-lg flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                              </div>
                              
                              {/* Content card */}
                              <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] group">
                                <div className="flex items-start gap-4">
                                  <BeltBadge belt={belt.belt} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-bold text-lg">{belt.belt}</h4>
                                    </div>
                                    {belt.instructor && (
                                      <p className="text-sm text-muted-foreground mb-1">
                                        👨‍🏫 {belt.instructor}
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
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        🏆 {language === "ja" ? "獲得タイトル" : "Titles & Achievements"}
                      </h3>
                      <div className="space-y-2">
                        {profile.titles.map((title, index) => (
                          <div key={index} className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                            <p className="font-semibold text-accent-foreground">{title.title}</p>
                            {title.organization && <p className="text-sm text-muted-foreground">{title.organization}</p>}
                            {title.date && <p className="text-xs text-muted-foreground">{title.date}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Home Dojo */}
                  {profile?.home_dojo && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        🏛️ {language === "ja" ? "所属道場" : "Home Dojo"}
                      </h3>
                      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <p className="font-medium text-lg">{profile.home_dojo}</p>
                      </div>
                    </div>
                  )}

                  {/* Training Locations */}
                  {profile?.training_locations && profile.training_locations.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        🗺️ {language === "ja" ? "よくいく出稽古先" : "Training Locations"}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.training_locations.map((location, index) => (
                          <Badge key={index} variant="outline" className="text-sm">
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

          {/* Events Section */}
          {events.length > 0 && (
            <div className="mb-12 animate-fade-up">
              <h2 className="text-3xl font-light mb-6">
                {language === "ja" ? "開催予定のイベント" : "Upcoming Events"}
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onRegister={handleRegisterEvent}
                    isRegistered={registeredEvents.has(event.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Videos Section */}
          <div className="mb-6">
            <h2 className="text-3xl font-light mb-6">
              {language === "ja" ? "動画" : "Videos"}
            </h2>
          </div>

          {/* Videos Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-4 border border-border rounded-lg p-6 animate-pulse">
                  <div className="aspect-video bg-muted rounded" />
                  <div className="h-6 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : videos.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-light mb-2">まだ動画がありません</h3>
                <p className="text-muted-foreground">
                  このユーザーはまだ公開動画を投稿していません
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-up">
              {videos.map((video) => (
                <UserVideoCard
                  key={video.id}
                  video={video}
                  isOwner={currentUser === actualUserId}
                  isPurchased={purchasedVideos.has(video.id)}
                  onPurchase={() => handlePurchase(video.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
      
      {currentUser === actualUserId && actualUserId && (
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
      )}
    </div>
  );
}
