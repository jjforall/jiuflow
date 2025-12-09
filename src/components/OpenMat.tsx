import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ja, enUS, ptBR } from "date-fns/locale";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  MessageCircle, Send, Trash2, Heart, MessageSquare, Image as ImageIcon,
  Video, MoreHorizontal, RefreshCw, Pencil, X, Check
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

interface Post {
  id: string;
  thread_id: string;
  author_id: string;
  content: string;
  content_en?: string | null;
  content_ja?: string | null;
  content_pt?: string | null;
  created_at: string;
  updated_at: string;
  author?: UserProfile;
  reply_count?: number;
  like_count?: number;
  is_liked?: boolean;
}

interface Reply {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: UserProfile;
  like_count?: number;
  is_liked?: boolean;
}

// For now, we'll repurpose the existing tables
// community_threads -> main posts (one "General" category)
// community_posts -> replies to posts
// community_reactions -> likes

export const OpenMat = () => {
  const { language } = useLanguage();
  const { user, isAdmin } = useAuth();
  const { subscribed, loading: subscriptionLoading } = useSubscription();
  const navigate = useNavigate();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [replyUploading, setReplyUploading] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const getDateLocale = () => {
    if (language === "ja") return ja;
    if (language === "pt") return ptBR;
    return enUS;
  };

  useEffect(() => {
    if (user) {
      loadMyProfile();
    }
  }, [user]);

  useEffect(() => {
    if (subscribed) {
      loadPosts();
      
      // Real-time subscription for new posts
      const channel = supabase
        .channel('openmat-posts')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'community_threads',
          },
          () => {
            loadPosts();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [subscribed]);

  const loadMyProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, username')
        .eq('id', user.id)
        .maybeSingle();
      
      if (!error && data) {
        setMyProfile(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      
      // Load threads as posts (we'll use threads as main posts)
      const { data: threads, error } = await supabase
        .from('community_threads')
        .select(`
          id,
          author_id,
          title,
          content,
          content_en,
          content_ja,
          content_pt,
          created_at,
          updated_at,
          author:profiles!community_threads_author_id_fkey(id, display_name, avatar_url, username)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get reply counts and like counts
      const postsWithCounts = await Promise.all(
        (threads || []).map(async (thread) => {
          const [{ count: replyCount }, { data: reactions }] = await Promise.all([
            supabase
              .from('community_posts')
              .select('*', { count: 'exact', head: true })
              .eq('thread_id', thread.id),
            supabase
              .from('community_reactions')
              .select('*')
              .eq('thread_id', thread.id)
          ]);

          const isLiked = user ? reactions?.some(r => r.user_id === user.id) : false;

          return {
            id: thread.id,
            thread_id: thread.id,
            author_id: thread.author_id,
            content: thread.content,
            content_en: thread.content_en,
            content_ja: thread.content_ja,
            content_pt: thread.content_pt,
            created_at: thread.created_at,
            updated_at: thread.updated_at,
            author: thread.author,
            reply_count: replyCount || 0,
            like_count: reactions?.length || 0,
            is_liked: isLiked,
          };
        })
      );

      setPosts(postsWithCounts);
    } catch (error) {
      console.error('Error loading posts:', error);
      toast.error(language === "ja" ? "投稿の読み込みに失敗しました" : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  const loadReplies = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select(`
          id,
          thread_id,
          author_id,
          content,
          created_at,
          author:profiles!community_posts_author_id_fkey(id, display_name, avatar_url, username)
        `)
        .eq('thread_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get like counts for replies
      const repliesWithCounts = await Promise.all(
        (data || []).map(async (reply) => {
          const { data: reactions } = await supabase
            .from('community_reactions')
            .select('*')
            .eq('post_id', reply.id);

          const isLiked = user ? reactions?.some(r => r.user_id === user.id) : false;

          return {
            id: reply.id,
            post_id: reply.thread_id,
            author_id: reply.author_id,
            content: reply.content,
            created_at: reply.created_at,
            author: reply.author,
            like_count: reactions?.length || 0,
            is_liked: isLiked,
          };
        })
      );

      setReplies(prev => ({ ...prev, [postId]: repliesWithCounts }));
    } catch (error) {
      console.error('Error loading replies:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
    toast.success(language === "ja" ? "更新しました" : "Refreshed");
  };

  const createPost = async () => {
    if (!user) {
      toast.error(language === "ja" ? "ログインしてください" : "Please log in");
      return;
    }
    if (!newPostContent.trim()) {
      toast.error(language === "ja" ? "内容を入力してください" : "Please enter content");
      return;
    }

    setSubmitting(true);
    try {
      // Get or create a default category
      let categoryId: string;
      const { data: categories } = await supabase
        .from('community_categories')
        .select('id')
        .limit(1);

      if (categories && categories.length > 0) {
        categoryId = categories[0].id;
      } else {
        // Create a default category if none exists
        const { data: newCat, error: catError } = await supabase
          .from('community_categories')
          .insert({
            name: 'General',
            name_ja: '一般',
            name_pt: 'Geral',
            icon: 'MessageCircle',
          })
          .select()
          .single();
        
        if (catError) throw catError;
        categoryId = newCat.id;
      }

      const { data, error } = await supabase
        .from('community_threads')
        .insert({
          category_id: categoryId,
          author_id: user.id,
          title: newPostContent.trim().slice(0, 100), // Use first 100 chars as title
          content: newPostContent.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      // Translate in background
      supabase.functions.invoke('translate-community-content', {
        body: {
          type: 'thread',
          id: data.id,
          title: newPostContent.trim().slice(0, 100),
          content: newPostContent.trim(),
          source_lang: language
        }
      }).catch(err => console.error('Translation error:', err));

      toast.success(language === "ja" ? "投稿しました！" : "Posted!");
      setNewPostContent("");
      await loadPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error(language === "ja" ? "投稿に失敗しました" : "Failed to post");
    } finally {
      setSubmitting(false);
    }
  };

  const createReply = async (postId: string) => {
    if (!user) {
      toast.error(language === "ja" ? "ログインしてください" : "Please log in");
      return;
    }
    
    const content = replyContent[postId]?.trim();
    if (!content) {
      toast.error(language === "ja" ? "内容を入力してください" : "Please enter content");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          thread_id: postId,
          author_id: user.id,
          content: content,
        })
        .select()
        .single();

      if (error) throw error;

      // Translate in background
      supabase.functions.invoke('translate-community-content', {
        body: {
          type: 'post',
          id: data.id,
          content: content,
          source_lang: language
        }
      }).catch(err => console.error('Translation error:', err));

      toast.success(language === "ja" ? "返信しました" : "Replied!");
      setReplyContent(prev => ({ ...prev, [postId]: "" }));
      await loadReplies(postId);
      
      // Update reply count in posts
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, reply_count: (p.reply_count || 0) + 1 } : p
      ));
    } catch (error) {
      console.error('Error creating reply:', error);
      toast.error(language === "ja" ? "返信に失敗しました" : "Failed to reply");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLike = async (postId: string, isReply: boolean = false, replyId?: string) => {
    if (!user) {
      toast.error(language === "ja" ? "ログインしてください" : "Please log in");
      return;
    }

    const targetId = isReply && replyId ? replyId : postId;
    const field = isReply ? 'post_id' : 'thread_id';

    try {
      const { data: existing } = await supabase
        .from('community_reactions')
        .select('id')
        .eq('user_id', user.id)
        .eq(field, targetId)
        .maybeSingle();

      if (existing) {
        await supabase.from('community_reactions').delete().eq('id', existing.id);
      } else {
        await supabase
          .from('community_reactions')
          .insert({ 
            user_id: user.id, 
            [field]: targetId 
          });
      }

      if (isReply && replyId) {
        // Update reply in state
        setReplies(prev => ({
          ...prev,
          [postId]: (prev[postId] || []).map(r => 
            r.id === replyId 
              ? { ...r, is_liked: !existing, like_count: (r.like_count || 0) + (existing ? -1 : 1) }
              : r
          )
        }));
      } else {
        // Update post in state
        setPosts(prev => prev.map(p => 
          p.id === postId 
            ? { ...p, is_liked: !existing, like_count: (p.like_count || 0) + (existing ? -1 : 1) }
            : p
        ));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const deletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('community_threads')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      toast.success(language === "ja" ? "削除しました" : "Deleted");
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error(language === "ja" ? "削除に失敗しました" : "Failed to delete");
    }
  };

  const deleteReply = async (postId: string, replyId: string) => {
    try {
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', replyId);

      if (error) throw error;

      toast.success(language === "ja" ? "削除しました" : "Deleted");
      setReplies(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).filter(r => r.id !== replyId)
      }));
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, reply_count: Math.max(0, (p.reply_count || 0) - 1) } : p
      ));
    } catch (error) {
      console.error('Error deleting reply:', error);
      toast.error(language === "ja" ? "削除に失敗しました" : "Failed to delete");
    }
  };

  const startEditPost = (post: Post) => {
    setEditingPostId(post.id);
    setEditContent(post.content);
  };

  const cancelEditPost = () => {
    setEditingPostId(null);
    setEditContent("");
  };

  const saveEditPost = async (postId: string) => {
    if (!editContent.trim()) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('community_threads')
        .update({ 
          content: editContent.trim(),
          title: editContent.trim().slice(0, 100),
          updated_at: new Date().toISOString()
        })
        .eq('id', postId);

      if (error) throw error;

      // Translate in background
      supabase.functions.invoke('translate-community-content', {
        body: {
          type: 'thread',
          id: postId,
          title: editContent.trim().slice(0, 100),
          content: editContent.trim(),
          source_lang: language
        }
      }).catch(err => console.error('Translation error:', err));

      toast.success(language === "ja" ? "更新しました" : "Updated");
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, content: editContent.trim() } : p
      ));
      setEditingPostId(null);
      setEditContent("");
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error(language === "ja" ? "更新に失敗しました" : "Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  const startEditReply = (reply: Reply) => {
    setEditingReplyId(reply.id);
    setEditContent(reply.content);
  };

  const cancelEditReply = () => {
    setEditingReplyId(null);
    setEditContent("");
  };

  const saveEditReply = async (postId: string, replyId: string) => {
    if (!editContent.trim()) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('community_posts')
        .update({ 
          content: editContent.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', replyId);

      if (error) throw error;

      // Translate in background
      supabase.functions.invoke('translate-community-content', {
        body: {
          type: 'post',
          id: replyId,
          content: editContent.trim(),
          source_lang: language
        }
      }).catch(err => console.error('Translation error:', err));

      toast.success(language === "ja" ? "更新しました" : "Updated");
      setReplies(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).map(r => 
          r.id === replyId ? { ...r, content: editContent.trim() } : r
        )
      }));
      setEditingReplyId(null);
      setEditContent("");
    } catch (error) {
      console.error('Error updating reply:', error);
      toast.error(language === "ja" ? "更新に失敗しました" : "Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  const canEditOrDelete = (authorId: string) => {
    return user?.id === authorId || isAdmin;
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error(language === "ja" ? "ファイルは50MB以下にしてください" : "File must be under 50MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('community-media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('community-media')
        .getPublicUrl(fileName);

      const isVideo = file.type.startsWith('video/');
      const markdown = isVideo 
        ? `\n\n<video src="${publicUrl}" controls style="max-width:100%;border-radius:8px;"></video>\n`
        : `\n\n![image](${publicUrl})\n`;
      
      setNewPostContent(prev => prev + markdown);
      toast.success(language === "ja" ? "アップロードしました" : "Uploaded");
    } catch (error) {
      console.error('Error uploading:', error);
      toast.error(language === "ja" ? "アップロードに失敗しました" : "Failed to upload");
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleReplyMediaUpload = async (postId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error(language === "ja" ? "ファイルは50MB以下にしてください" : "File must be under 50MB");
      return;
    }

    setReplyUploading(prev => ({ ...prev, [postId]: true }));
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('community-media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('community-media')
        .getPublicUrl(fileName);

      const isVideo = file.type.startsWith('video/');
      const markdown = isVideo 
        ? `\n\n<video src="${publicUrl}" controls style="max-width:100%;border-radius:8px;"></video>\n`
        : `\n\n![image](${publicUrl})\n`;
      
      setReplyContent(prev => ({ 
        ...prev, 
        [postId]: (prev[postId] || "") + markdown 
      }));
      toast.success(language === "ja" ? "アップロードしました" : "Uploaded");
    } catch (error) {
      console.error('Error uploading:', error);
      toast.error(language === "ja" ? "アップロードに失敗しました" : "Failed to upload");
    } finally {
      setReplyUploading(prev => ({ ...prev, [postId]: false }));
      e.target.value = '';
    }
  };

  const toggleExpand = (postId: string) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
    } else {
      setExpandedPost(postId);
      if (!replies[postId]) {
        loadReplies(postId);
      }
    }
  };

  const getProfileLink = (author?: { username: string | null }) => {
    if (author?.username) return `/${author.username}`;
    return null;
  };

  const getTranslatedContent = (item: Post | Reply): string => {
    const langKey = `content_${language}` as keyof typeof item;
    const translated = item[langKey] as string | null | undefined;
    if (translated) return translated;
    return item.content;
  };

  const renderContent = (content: string) => (
    <ReactMarkdown 
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
            {children}
          </a>
        ),
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        img: ({ src, alt }) => (
          <img src={src} alt={alt || ''} className="max-w-full rounded-lg my-2" />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );

  // Subscription Gate
  if (subscriptionLoading) {
    return (
      <div className="space-y-4 px-4 sm:px-6 max-w-2xl mx-auto w-full">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!subscribed) {
    return (
      <div className="space-y-6 px-4 sm:px-6 max-w-2xl mx-auto text-center py-12">
        <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
          <MessageCircle className="h-16 w-16 mx-auto text-primary mb-4" />
          <h2 className="text-2xl font-semibold mb-2">
            {language === "ja" ? "Open Mat は会員限定です" : "Open Mat is for Members Only"}
          </h2>
          <p className="text-muted-foreground mb-6">
            {language === "ja" 
              ? "サブスクリプションに登録して、柔術コミュニティに参加しましょう。"
              : "Subscribe to join the BJJ community."}
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate("/join")}
            className="px-8"
          >
            {language === "ja" ? "今すぐ登録する" : "Subscribe Now"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-light">Open Mat</h2>
          <p className="text-sm text-muted-foreground">
            {language === "ja" ? "柔術仲間とつながろう" : "Connect with your BJJ community"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={refreshing}
          className="shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* New Post Composer */}
      <Card className="border-2 border-dashed border-muted hover:border-primary/30 transition-colors">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={myProfile?.avatar_url || undefined} />
              <AvatarFallback>
                {myProfile?.display_name?.slice(0, 2) || user?.email?.slice(0, 2).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <Textarea
                placeholder={language === "ja" ? "今日の練習はどうでしたか？" : "How was your training today?"}
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                className="min-h-[80px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0 text-base placeholder:text-muted-foreground/60"
              />
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex gap-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleMediaUpload}
                    accept="image/*,video/*"
                    className="hidden"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="text-muted-foreground hover:text-primary"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="text-muted-foreground hover:text-primary"
                  >
                    <Video className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  onClick={createPost}
                  disabled={submitting || !newPostContent.trim()}
                  className="px-4"
                >
                  {submitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1" />
                      {language === "ja" ? "投稿" : "Post"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts Feed */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              {language === "ja" ? "まだ投稿がありません。最初の投稿をしてみよう！" : "No posts yet. Be the first to post!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden">
              <CardContent className="p-4">
                {/* Post Header */}
                <div className="flex items-start gap-3">
                  {post.author ? (
                    <Link to={getProfileLink(post.author) || '#'}>
                      <Avatar className="h-10 w-10 cursor-pointer hover:opacity-80 transition">
                        <AvatarImage src={post.author.avatar_url || undefined} />
                        <AvatarFallback>
                          {post.author.display_name?.slice(0, 2) || "?"}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                  ) : (
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>?</AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {post.author ? (
                          <Link 
                            to={getProfileLink(post.author) || '#'}
                            className="font-medium hover:underline truncate"
                          >
                            {post.author.display_name || post.author.username || "Anonymous"}
                          </Link>
                        ) : (
                          <span className="font-medium">Anonymous</span>
                        )}
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(post.created_at), { 
                            addSuffix: true,
                            locale: getDateLocale()
                          })}
                        </span>
                      </div>
                      
                      {canEditOrDelete(post.author_id) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => startEditPost(post)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              {language === "ja" ? "編集" : "Edit"}
                            </DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem 
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {language === "ja" ? "削除" : "Delete"}
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    {language === "ja" ? "投稿を削除しますか？" : "Delete this post?"}
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {language === "ja" ? "この操作は取り消せません。" : "This action cannot be undone."}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    {language === "ja" ? "キャンセル" : "Cancel"}
                                  </AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deletePost(post.id)}>
                                    {language === "ja" ? "削除" : "Delete"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {/* Post Content */}
                    {editingPostId === post.id ? (
                      <div className="mt-2 space-y-2">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="min-h-[100px] resize-none"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelEditPost}
                            disabled={submitting}
                          >
                            <X className="h-4 w-4 mr-1" />
                            {language === "ja" ? "キャンセル" : "Cancel"}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => saveEditPost(post.id)}
                            disabled={submitting || !editContent.trim()}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            {language === "ja" ? "保存" : "Save"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 text-sm whitespace-pre-wrap break-words prose prose-sm dark:prose-invert max-w-none">
                        {renderContent(getTranslatedContent(post))}
                      </div>
                    )}

                    {/* Post Actions */}
                    <div className="flex items-center gap-4 mt-3 pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleLike(post.id)}
                        className={`gap-1.5 px-2 ${post.is_liked ? 'text-red-500' : 'text-muted-foreground'}`}
                      >
                        <Heart className={`h-4 w-4 ${post.is_liked ? 'fill-current' : ''}`} />
                        <span className="text-xs">{post.like_count || 0}</span>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(post.id)}
                        className="gap-1.5 px-2 text-muted-foreground"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span className="text-xs">{post.reply_count || 0}</span>
                      </Button>
                    </div>

                    {/* Replies Section */}
                    {expandedPost === post.id && (
                      <div className="mt-3 pt-3 border-t space-y-3">
                        {/* Replies List */}
                        {replies[post.id]?.map((reply) => (
                          <div key={reply.id} className="flex gap-2 pl-2 border-l-2 border-muted">
                            {reply.author ? (
                              <Link to={getProfileLink(reply.author) || '#'}>
                                <Avatar className="h-7 w-7">
                                  <AvatarImage src={reply.author.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {reply.author.display_name?.slice(0, 2) || "?"}
                                  </AvatarFallback>
                                </Avatar>
                              </Link>
                            ) : (
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="text-xs">?</AvatarFallback>
                              </Avatar>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium">
                                  {reply.author?.display_name || "Anonymous"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(reply.created_at), { 
                                    addSuffix: true,
                                    locale: getDateLocale()
                                  })}
                                </span>
                              </div>
                              {editingReplyId === reply.id ? (
                                <div className="mt-1 space-y-2">
                                  <Textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="min-h-[60px] resize-none text-sm"
                                    rows={2}
                                  />
                                  <div className="flex gap-2 justify-end">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={cancelEditReply}
                                      disabled={submitting}
                                      className="h-6 text-xs"
                                    >
                                      <X className="h-3 w-3 mr-1" />
                                      {language === "ja" ? "キャンセル" : "Cancel"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => saveEditReply(post.id, reply.id)}
                                      disabled={submitting || !editContent.trim()}
                                      className="h-6 text-xs"
                                    >
                                      <Check className="h-3 w-3 mr-1" />
                                      {language === "ja" ? "保存" : "Save"}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm mt-0.5 break-words">{reply.content}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleLike(post.id, true, reply.id)}
                                  className={`gap-1 h-6 px-1.5 ${reply.is_liked ? 'text-red-500' : 'text-muted-foreground'}`}
                                >
                                  <Heart className={`h-3 w-3 ${reply.is_liked ? 'fill-current' : ''}`} />
                                  <span className="text-xs">{reply.like_count || 0}</span>
                                </Button>
                                {canEditOrDelete(reply.author_id) && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => startEditReply(reply)}
                                      className="h-6 px-1.5 text-muted-foreground hover:text-foreground"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-1.5 text-muted-foreground hover:text-destructive"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>
                                            {language === "ja" ? "返信を削除しますか？" : "Delete this reply?"}
                                          </AlertDialogTitle>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>
                                            {language === "ja" ? "キャンセル" : "Cancel"}
                                          </AlertDialogCancel>
                                          <AlertDialogAction onClick={() => deleteReply(post.id, reply.id)}>
                                            {language === "ja" ? "削除" : "Delete"}
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Reply Input */}
                        <div className="flex gap-2 pt-2">
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage src={myProfile?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {myProfile?.display_name?.slice(0, 2) || user?.email?.slice(0, 2).toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-2">
                            <Textarea
                              placeholder={language === "ja" ? "返信を書く..." : "Write a reply..."}
                              value={replyContent[post.id] || ""}
                              onChange={(e) => setReplyContent(prev => ({ ...prev, [post.id]: e.target.value }))}
                              className="min-h-[60px] resize-none text-sm"
                              rows={2}
                            />
                            <div className="flex items-center justify-between">
                              <div className="flex gap-1">
                                <input
                                  type="file"
                                  id={`reply-file-${post.id}`}
                                  onChange={(e) => handleReplyMediaUpload(post.id, e)}
                                  accept="image/*,video/*"
                                  className="hidden"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => document.getElementById(`reply-file-${post.id}`)?.click()}
                                  disabled={replyUploading[post.id]}
                                  className="h-7 px-2 text-muted-foreground hover:text-primary"
                                >
                                  <ImageIcon className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => document.getElementById(`reply-file-${post.id}`)?.click()}
                                  disabled={replyUploading[post.id]}
                                  className="h-7 px-2 text-muted-foreground hover:text-primary"
                                >
                                  <Video className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => createReply(post.id)}
                                disabled={submitting || !replyContent[post.id]?.trim()}
                                className="h-7"
                              >
                                <Send className="h-3.5 w-3.5 mr-1" />
                                {language === "ja" ? "返信" : "Reply"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};