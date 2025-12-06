import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  BookOpen, GraduationCap, MessageCircle, Trophy, HelpCircle, Calendar,
  Plus, ArrowLeft, Send, Eye, MessageSquare, Pin, ChevronRight, Trash2, 
  Video, Pencil, X, Upload, Heart
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Category {
  id: string;
  name: string;
  name_ja: string;
  name_pt: string;
  description: string | null;
  description_ja: string | null;
  description_pt: string | null;
  icon: string;
  sort_order: number;
}

interface Thread {
  id: string;
  category_id: string;
  author_id: string;
  title: string;
  content: string;
  title_en?: string | null;
  title_ja?: string | null;
  title_pt?: string | null;
  title_es?: string | null;
  title_fr?: string | null;
  title_de?: string | null;
  title_zh?: string | null;
  title_ko?: string | null;
  title_it?: string | null;
  title_ru?: string | null;
  title_ar?: string | null;
  title_hi?: string | null;
  content_en?: string | null;
  content_ja?: string | null;
  content_pt?: string | null;
  content_es?: string | null;
  content_fr?: string | null;
  content_de?: string | null;
  content_zh?: string | null;
  content_ko?: string | null;
  content_it?: string | null;
  content_ru?: string | null;
  content_ar?: string | null;
  content_hi?: string | null;
  is_pinned: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  author?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
  post_count?: number;
}

interface Post {
  id: string;
  thread_id: string;
  author_id: string;
  content: string;
  content_en?: string | null;
  content_ja?: string | null;
  content_pt?: string | null;
  content_es?: string | null;
  content_fr?: string | null;
  content_de?: string | null;
  content_zh?: string | null;
  content_ko?: string | null;
  content_it?: string | null;
  content_ru?: string | null;
  content_ar?: string | null;
  content_hi?: string | null;
  created_at: string;
  author?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
}

interface Reaction {
  id: string;
  user_id: string;
  thread_id: string | null;
  post_id: string | null;
}

interface CommunityRank {
  user_id: string;
  thread_count: number;
  post_count: number;
  likes_received: number;
  rank_level: string;
}

interface WeeklyTopic {
  id: string;
  title: string;
  title_ja: string;
  title_pt: string;
  description: string | null;
  description_ja: string | null;
  description_pt: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

const iconMap: Record<string, React.ElementType> = {
  BookOpen,
  GraduationCap,
  MessageCircle,
  Trophy,
  HelpCircle,
  Calendar,
};

// ランクに基づく帯の色を取得
const getRankBeltColor = (rank: string): string => {
  switch (rank) {
    case 'black': return 'bg-gray-900 text-white';
    case 'brown': return 'bg-amber-700 text-white';
    case 'purple': return 'bg-purple-600 text-white';
    case 'blue': return 'bg-blue-600 text-white';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }
};

const getRankLabel = (rank: string, language: string): string => {
  const labels: Record<string, Record<string, string>> = {
    white: { ja: '白帯', en: 'White Belt', pt: 'Faixa Branca' },
    blue: { ja: '青帯', en: 'Blue Belt', pt: 'Faixa Azul' },
    purple: { ja: '紫帯', en: 'Purple Belt', pt: 'Faixa Roxa' },
    brown: { ja: '茶帯', en: 'Brown Belt', pt: 'Faixa Marrom' },
    black: { ja: '黒帯', en: 'Black Belt', pt: 'Faixa Preta' },
  };
  const lang = language === 'ja' ? 'ja' : language === 'pt' ? 'pt' : 'en';
  return labels[rank]?.[lang] || labels.white[lang];
};

export const OpenMat = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { subscribed, loading: subscriptionLoading } = useSubscription();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [announcements, setAnnouncements] = useState<Array<{
    id: string;
    title: string;
    title_ja: string | null;
    title_pt: string | null;
    content: string;
    content_ja: string | null;
    content_pt: string | null;
    author_email: string | null;
    created_at: string;
  }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadContent, setNewThreadContent] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingThread, setEditingThread] = useState<Thread | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const postVideoInputRef = useRef<HTMLInputElement>(null);
  const [threadReactions, setThreadReactions] = useState<Reaction[]>([]);
  const [postReactions, setPostReactions] = useState<Record<string, Reaction[]>>({});
  const [myRank, setMyRank] = useState<CommunityRank | null>(null);
  const [weeklyTopic, setWeeklyTopic] = useState<WeeklyTopic | null>(null);

  useEffect(() => {
    loadCategories();
    loadAnnouncements();
    loadWeeklyTopic();
  }, []);

  useEffect(() => {
    if (user) {
      loadMyRank();
    }
  }, [user]);

  useEffect(() => {
    if (selectedCategory) {
      loadThreads(selectedCategory.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedThread) {
      loadPosts(selectedThread.id);
      loadReactions(selectedThread.id);
      incrementViewCount(selectedThread.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Real-time subscription for new posts
      const channel = supabase
        .channel(`posts-${selectedThread.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'community_posts',
            filter: `thread_id=eq.${selectedThread.id}`
          },
          () => {
            loadPosts(selectedThread.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedThread]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('community_categories')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error(language === "ja" ? "カテゴリの読み込みに失敗しました" : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('community_announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  };

  const loadMyRank = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('community_ranks')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setMyRank(data);
    } catch (error) {
      console.error('Error loading rank:', error);
    }
  };

  const loadWeeklyTopic = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('weekly_topics')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', today)
        .gte('end_date', today)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setWeeklyTopic(data);
    } catch (error) {
      console.error('Error loading weekly topic:', error);
    }
  };

  const loadThreads = async (categoryId: string) => {
    setThreadsLoading(true);
    try {
      const { data, error } = await supabase
        .from('community_threads')
        .select(`
          *,
          author:profiles!community_threads_author_id_fkey(display_name, avatar_url, username)
        `)
        .eq('category_id', categoryId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get post counts for each thread
      const threadsWithCounts = await Promise.all(
        (data || []).map(async (thread) => {
          const { count } = await supabase
            .from('community_posts')
            .select('*', { count: 'exact', head: true })
            .eq('thread_id', thread.id);
          return { ...thread, post_count: count || 0 };
        })
      );

      setThreads(threadsWithCounts);
    } catch (error) {
      console.error('Error loading threads:', error);
      toast.error(language === "ja" ? "スレッドの読み込みに失敗しました" : "Failed to load threads");
    } finally {
      setThreadsLoading(false);
    }
  };

  const loadPosts = async (threadId: string) => {
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select(`
          *,
          author:profiles!community_posts_author_id_fkey(display_name, avatar_url, username)
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const incrementViewCount = async (threadId: string) => {
    await supabase
      .from('community_threads')
      .update({ view_count: (selectedThread?.view_count || 0) + 1 })
      .eq('id', threadId);
  };

  const loadReactions = async (threadId: string) => {
    try {
      // Load thread reactions
      const { data: threadData } = await supabase
        .from('community_reactions')
        .select('*')
        .eq('thread_id', threadId);
      
      setThreadReactions(threadData || []);

      // Load post reactions for this thread
      const { data: postsData } = await supabase
        .from('community_posts')
        .select('id')
        .eq('thread_id', threadId);

      if (postsData && postsData.length > 0) {
        const postIds = postsData.map(p => p.id);
        const { data: postReactionsData } = await supabase
          .from('community_reactions')
          .select('*')
          .in('post_id', postIds);

        // Group by post_id
        const grouped: Record<string, Reaction[]> = {};
        (postReactionsData || []).forEach(r => {
          if (r.post_id) {
            if (!grouped[r.post_id]) grouped[r.post_id] = [];
            grouped[r.post_id].push(r);
          }
        });
        setPostReactions(grouped);
      }
    } catch (error) {
      console.error('Error loading reactions:', error);
    }
  };

  const toggleThreadReaction = async () => {
    if (!user || !selectedThread) {
      toast.error(language === "ja" ? "ログインしてください" : "Please log in");
      return;
    }

    const existing = threadReactions.find(r => r.user_id === user.id);
    
    if (existing) {
      await supabase.from('community_reactions').delete().eq('id', existing.id);
      setThreadReactions(prev => prev.filter(r => r.id !== existing.id));
    } else {
      const { data, error } = await supabase
        .from('community_reactions')
        .insert({ user_id: user.id, thread_id: selectedThread.id })
        .select()
        .single();
      
      if (!error && data) {
        setThreadReactions(prev => [...prev, data]);
      }
    }
  };

  const togglePostReaction = async (postId: string) => {
    if (!user) {
      toast.error(language === "ja" ? "ログインしてください" : "Please log in");
      return;
    }

    const reactions = postReactions[postId] || [];
    const existing = reactions.find(r => r.user_id === user.id);
    
    if (existing) {
      await supabase.from('community_reactions').delete().eq('id', existing.id);
      setPostReactions(prev => ({
        ...prev,
        [postId]: prev[postId]?.filter(r => r.id !== existing.id) || []
      }));
    } else {
      const { data, error } = await supabase
        .from('community_reactions')
        .insert({ user_id: user.id, post_id: postId })
        .select()
        .single();
      
      if (!error && data) {
        setPostReactions(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), data]
        }));
      }
    }
  };

  const createThread = async () => {
    if (!user || !selectedCategory) return;
    if (!newThreadTitle.trim() || !newThreadContent.trim()) {
      toast.error(language === "ja" ? "タイトルと内容を入力してください" : "Please enter title and content");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('community_threads')
        .insert({
          category_id: selectedCategory.id,
          author_id: user.id,
          title: newThreadTitle.trim(),
          content: newThreadContent.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      // Translate in background
      supabase.functions.invoke('translate-community-content', {
        body: {
          type: 'thread',
          id: data.id,
          title: newThreadTitle.trim(),
          content: newThreadContent.trim(),
          source_lang: language
        }
      }).catch(err => console.error('Translation error:', err));

      toast.success(language === "ja" ? "スレッドを作成しました" : "Thread created");
      setNewThreadOpen(false);
      setNewThreadTitle("");
      setNewThreadContent("");
      loadThreads(selectedCategory.id);
    } catch (error) {
      console.error('Error creating thread:', error);
      toast.error(language === "ja" ? "スレッドの作成に失敗しました" : "Failed to create thread");
    } finally {
      setSubmitting(false);
    }
  };

  const createPost = async () => {
    if (!user || !selectedThread) return;
    if (!newPostContent.trim()) {
      toast.error(language === "ja" ? "内容を入力してください" : "Please enter content");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          thread_id: selectedThread.id,
          author_id: user.id,
          content: newPostContent.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      // Translate in background
      supabase.functions.invoke('translate-community-content', {
        body: {
          type: 'post',
          id: data.id,
          content: newPostContent.trim(),
          source_lang: language
        }
      }).catch(err => console.error('Translation error:', err));

      toast.success(language === "ja" ? "コメントを投稿しました" : "Comment posted");
      setNewPostContent("");
      loadPosts(selectedThread.id);
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error(language === "ja" ? "コメントの投稿に失敗しました" : "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const deletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      toast.success(language === "ja" ? "コメントを削除しました" : "Comment deleted");
      loadPosts(selectedThread!.id);
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error(language === "ja" ? "コメントの削除に失敗しました" : "Failed to delete comment");
    }
  };

  const deleteThread = async (threadId: string) => {
    try {
      const { error } = await supabase
        .from('community_threads')
        .delete()
        .eq('id', threadId);

      if (error) throw error;

      toast.success(language === "ja" ? "スレッドを削除しました" : "Thread deleted");
      setSelectedThread(null);
      setPosts([]);
      if (selectedCategory) {
        loadThreads(selectedCategory.id);
      }
    } catch (error) {
      console.error('Error deleting thread:', error);
      toast.error(language === "ja" ? "スレッドの削除に失敗しました" : "Failed to delete thread");
    }
  };

  const uploadVideo = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('user-videos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-videos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading video:', error);
      toast.error(language === "ja" ? "動画のアップロードに失敗しました" : "Failed to upload video");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>, isPost = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast.error(language === "ja" ? "動画は100MB以下にしてください" : "Video must be under 100MB");
      return;
    }

    const url = await uploadVideo(file);
    if (url) {
      const videoMarkdown = `\n\n<video src="${url}" controls style="max-width:100%;border-radius:8px;"></video>\n`;
      if (isPost) {
        setNewPostContent(prev => prev + videoMarkdown);
      } else {
        setNewThreadContent(prev => prev + videoMarkdown);
      }
      toast.success(language === "ja" ? "動画を追加しました" : "Video added");
    }
    e.target.value = '';
  };

  const startEditThread = (thread: Thread) => {
    setEditingThread(thread);
    setEditTitle(thread.title);
    setEditContent(thread.content);
  };

  const startEditPost = (post: Post) => {
    setEditingPost(post);
    setEditContent(post.content);
  };

  const saveEditThread = async () => {
    if (!editingThread) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('community_threads')
        .update({ 
          title: editTitle.trim(),
          content: editContent.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', editingThread.id);

      if (error) throw error;

      // Translate in background
      supabase.functions.invoke('translate-community-content', {
        body: {
          type: 'thread',
          id: editingThread.id,
          title: editTitle.trim(),
          content: editContent.trim(),
          source_lang: language
        }
      }).catch(err => console.error('Translation error:', err));

      toast.success(language === "ja" ? "更新しました" : "Updated");
      setEditingThread(null);
      setSelectedThread(prev => prev ? { ...prev, title: editTitle.trim(), content: editContent.trim() } : null);
      if (selectedCategory) loadThreads(selectedCategory.id);
    } catch (error) {
      console.error('Error updating thread:', error);
      toast.error(language === "ja" ? "更新に失敗しました" : "Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  const saveEditPost = async () => {
    if (!editingPost) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('community_posts')
        .update({ 
          content: editContent.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPost.id);

      if (error) throw error;

      // Translate in background
      supabase.functions.invoke('translate-community-content', {
        body: {
          type: 'post',
          id: editingPost.id,
          content: editContent.trim(),
          source_lang: language
        }
      }).catch(err => console.error('Translation error:', err));

      toast.success(language === "ja" ? "更新しました" : "Updated");
      setEditingPost(null);
      loadPosts(selectedThread!.id);
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error(language === "ja" ? "更新に失敗しました" : "Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  const getProfileLink = (author?: { username: string | null; display_name: string | null }) => {
    if (author?.username) return `/${author.username}`;
    return null;
  };

  const getTranslatedContent = (item: Thread | Post, field: 'content' | 'title' = 'content'): string => {
    const langKey = `${field}_${language}` as keyof typeof item;
    const translated = item[langKey] as string | null | undefined;
    if (translated) return translated;
    // Fallback to original
    return field === 'title' ? (item as Thread).title : item.content;
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
        video: ({ src, ...props }) => (
          <video src={src} controls className="max-w-full rounded-lg my-2" {...props} />
        ),
      }}
      allowedElements={['p', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'br', 'video']}
    >
      {content}
    </ReactMarkdown>
  );

  const getCategoryName = (cat: Category) => {
    if (language === "ja") return cat.name_ja;
    if (language === "pt") return cat.name_pt;
    return cat.name;
  };

  const getCategoryDescription = (cat: Category) => {
    if (language === "ja") return cat.description_ja;
    if (language === "pt") return cat.description_pt;
    return cat.description;
  };

  const getIcon = (iconName: string) => {
    const Icon = iconMap[iconName] || MessageCircle;
    return <Icon className="h-5 w-5" />;
  };

  // Subscription Gate
  if (subscriptionLoading) {
    return (
      <div className="space-y-4 px-4 sm:px-6 max-w-4xl mx-auto w-full overflow-x-hidden box-border">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  if (!subscribed) {
    return (
      <div className="space-y-6 px-4 sm:px-6 max-w-2xl mx-auto text-center py-12 w-full overflow-x-hidden box-border">
        <div className="p-6 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
          <MessageCircle className="h-16 w-16 mx-auto text-primary mb-4" />
          <h2 className="text-2xl font-semibold mb-2">
            {language === "ja" ? "Open Mat は会員限定です" : "Open Mat is for Members Only"}
          </h2>
          <p className="text-muted-foreground mb-6">
            {language === "ja" 
              ? "サブスクリプションに登録して、柔術コミュニティに参加しましょう。仲間と情報交換したり、質問したりできます。"
              : "Subscribe to join the BJJ community. Share information and ask questions with fellow practitioners."}
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

  // Category List View
  if (!selectedCategory) {
    return (
      <div className="space-y-4 px-4 sm:px-6 max-w-4xl mx-auto w-full box-border">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-light">Open Mat</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {language === "ja" ? "柔術仲間とつながろう" : "Connect with your BJJ community"}
            </p>
          </div>
          {/* My Digital Belt Rank */}
          {myRank && (
            <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${getRankBeltColor(myRank.rank_level)}`}>
              {getRankLabel(myRank.rank_level, language)}
              <span className="ml-1.5 opacity-75">
                ({myRank.thread_count * 3 + myRank.post_count + myRank.likes_received * 2}pt)
              </span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : (
          <>
            {/* Weekly Topic */}
            {weeklyTopic && (
              <Card className="border-accent/30 bg-gradient-to-br from-accent/10 to-accent/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="h-4 w-4 text-accent" />
                    <span className="text-xs font-medium text-accent">
                      {language === "ja" ? "今週のお題" : language === "pt" ? "Tema da Semana" : "Weekly Topic"}
                    </span>
                  </div>
                  <h4 className="font-medium mb-1">
                    {language === "ja" ? weeklyTopic.title_ja : language === "pt" ? weeklyTopic.title_pt : weeklyTopic.title}
                  </h4>
                  {(weeklyTopic.description || weeklyTopic.description_ja || weeklyTopic.description_pt) && (
                    <p className="text-sm text-muted-foreground">
                      {language === "ja" ? weeklyTopic.description_ja : language === "pt" ? weeklyTopic.description_pt : weeklyTopic.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Announcements */}
            {announcements.length > 0 && (
              <div className="space-y-3 mb-6">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  {language === "ja" ? "お知らせ" : "Announcements"}
                </h3>
                {announcements.map((announcement) => (
                  <Card key={announcement.id} className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">
                        {language === "ja" && announcement.title_ja
                          ? announcement.title_ja
                          : language === "pt" && announcement.title_pt
                          ? announcement.title_pt
                          : announcement.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        {language === "ja" && announcement.content_ja
                          ? announcement.content_ja
                          : language === "pt" && announcement.content_pt
                          ? announcement.content_pt
                          : announcement.content}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        <span>{format(new Date(announcement.created_at), 'yyyy/MM/dd')}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Categories */}
            <div className="grid gap-3 w-full">
              {categories.map((category) => (
                <Card 
                  key={category.id} 
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setSelectedCategory(category)}
                >
                <CardContent className="p-4 flex items-center gap-4 overflow-hidden">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary flex-shrink-0">
                    {getIcon(category.icon)}
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <h3 className="font-medium truncate">{getCategoryName(category)}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {getCategoryDescription(category)}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </CardContent>
              </Card>
            ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Thread List View
  if (!selectedThread) {
    return (
      <div className="space-y-4 px-4 sm:px-6 max-w-4xl mx-auto w-full overflow-x-hidden box-border">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSelectedCategory(null)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h2 className="text-xl font-light">{getCategoryName(selectedCategory)}</h2>
            <p className="text-sm text-muted-foreground">
              {getCategoryDescription(selectedCategory)}
            </p>
          </div>
          {user && (
            <Dialog open={newThreadOpen} onOpenChange={setNewThreadOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  {language === "ja" ? "新規" : "New"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {language === "ja" ? "新しいスレッドを作成" : "Create New Thread"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Input
                      placeholder={language === "ja" ? "タイトル" : "Title"}
                      value={newThreadTitle}
                      onChange={(e) => setNewThreadTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Textarea
                      placeholder={language === "ja" ? "内容を入力... (Markdown対応)" : "Enter content... (Markdown supported)"}
                      value={newThreadContent}
                      onChange={(e) => setNewThreadContent(e.target.value)}
                      rows={5}
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept="video/*"
                      ref={videoInputRef}
                      className="hidden"
                      onChange={(e) => handleVideoSelect(e, false)}
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Video className="h-4 w-4 mr-1" />
                      {uploading ? (language === "ja" ? "アップロード中..." : "Uploading...") : (language === "ja" ? "動画を追加" : "Add Video")}
                    </Button>
                  </div>
                  <Button 
                    onClick={createThread} 
                    disabled={submitting || uploading}
                    className="w-full"
                  >
                    {submitting 
                      ? (language === "ja" ? "作成中..." : "Creating...") 
                      : (language === "ja" ? "作成する" : "Create")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {threadsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : threads.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>{language === "ja" ? "まだスレッドがありません" : "No threads yet"}</p>
              {user && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setNewThreadOpen(true)}
                >
                  {language === "ja" ? "最初のスレッドを作成" : "Create the first thread"}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {threads.map((thread) => (
              <Card 
                key={thread.id} 
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setSelectedThread(thread)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={thread.author?.avatar_url || undefined} />
                      <AvatarFallback>
                        {thread.author?.display_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {thread.is_pinned && (
                          <Pin className="h-3.5 w-3.5 text-primary" />
                        )}
                        <h3 className="font-medium truncate">{getTranslatedContent(thread, 'title')}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                        {getTranslatedContent(thread)}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{thread.author?.display_name || "Unknown"}</span>
                        <span>•</span>
                        <span>{format(new Date(thread.created_at), 'yyyy/MM/dd')}</span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {thread.view_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {thread.post_count || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Thread Detail View
  return (
    <div className="space-y-4 px-4 sm:px-6 max-w-4xl mx-auto w-full overflow-x-hidden box-border">
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => {
            setSelectedThread(null);
            setPosts([]);
            setEditingThread(null);
            setEditingPost(null);
          }}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-medium truncate">{getTranslatedContent(selectedThread, 'title')}</h2>
          <p className="text-sm text-muted-foreground">
            {getProfileLink(selectedThread.author) ? (
              <Link to={getProfileLink(selectedThread.author)!} className="hover:text-primary hover:underline">
                {selectedThread.author?.display_name}
              </Link>
            ) : (
              selectedThread.author?.display_name
            )}
            {" • "}
            {format(new Date(selectedThread.created_at), 'yyyy/MM/dd HH:mm')}
          </p>
        </div>
        {user?.id === selectedThread.author_id && (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => startEditThread(selectedThread)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {language === "ja" ? "スレッドを削除しますか？" : "Delete thread?"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {language === "ja" 
                      ? "この操作は取り消せません。スレッドと全てのコメントが削除されます。" 
                      : "This action cannot be undone. The thread and all comments will be deleted."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {language === "ja" ? "キャンセル" : "Cancel"}
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteThread(selectedThread.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {language === "ja" ? "削除" : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Edit Thread Dialog */}
      <Dialog open={!!editingThread} onOpenChange={(open) => !open && setEditingThread(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === "ja" ? "スレッドを編集" : "Edit Thread"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder={language === "ja" ? "タイトル" : "Title"}
            />
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={6}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingThread(null)}>
                {language === "ja" ? "キャンセル" : "Cancel"}
              </Button>
              <Button onClick={saveEditThread} disabled={submitting}>
                {language === "ja" ? "保存" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Post Dialog */}
      <Dialog open={!!editingPost} onOpenChange={(open) => !open && setEditingPost(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === "ja" ? "コメントを編集" : "Edit Comment"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingPost(null)}>
                {language === "ja" ? "キャンセル" : "Cancel"}
              </Button>
              <Button onClick={saveEditPost} disabled={submitting}>
                {language === "ja" ? "保存" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Original Post */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Link to={getProfileLink(selectedThread.author) || "#"}>
              <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                <AvatarImage src={selectedThread.author?.avatar_url || undefined} />
                <AvatarFallback>
                  {selectedThread.author?.display_name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm">
                {getProfileLink(selectedThread.author) ? (
                  <Link to={getProfileLink(selectedThread.author)!} className="font-medium hover:text-primary hover:underline">
                    {selectedThread.author?.display_name}
                  </Link>
                ) : (
                  <span className="font-medium">{selectedThread.author?.display_name}</span>
                )}
                <span className="text-muted-foreground">
                  {format(new Date(selectedThread.created_at), 'yyyy/MM/dd HH:mm')}
                </span>
              </div>
              <div className="mt-2 prose prose-sm dark:prose-invert max-w-none">
                {renderContent(getTranslatedContent(selectedThread))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 gap-1"
                  onClick={toggleThreadReaction}
                >
                  <Heart 
                    className={`h-4 w-4 ${threadReactions.some(r => r.user_id === user?.id) ? 'fill-red-500 text-red-500' : ''}`} 
                  />
                  <span className="text-xs">{threadReactions.length}</span>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Replies */}
      {posts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {language === "ja" ? `${posts.length}件のコメント` : `${posts.length} comments`}
          </h3>
          {posts.map((post) => (
            <Card key={post.id}>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Link to={getProfileLink(post.author) || "#"}>
                    <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                      <AvatarImage src={post.author?.avatar_url || undefined} />
                      <AvatarFallback>
                        {post.author?.display_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        {getProfileLink(post.author) ? (
                          <Link to={getProfileLink(post.author)!} className="font-medium hover:text-primary hover:underline">
                            {post.author?.display_name}
                          </Link>
                        ) : (
                          <span className="font-medium">{post.author?.display_name}</span>
                        )}
                        <span className="text-muted-foreground text-xs">
                          {format(new Date(post.created_at), 'yyyy/MM/dd HH:mm')}
                        </span>
                      </div>
                      {user?.id === post.author_id && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEditPost(post)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {language === "ja" ? "コメントを削除しますか？" : "Delete comment?"}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {language === "ja" 
                                    ? "この操作は取り消せません。" 
                                    : "This action cannot be undone."}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>
                                  {language === "ja" ? "キャンセル" : "Cancel"}
                                </AlertDialogCancel>
                                <AlertDialogAction onClick={() => deletePost(post.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  {language === "ja" ? "削除" : "Delete"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                    <div className="mt-1 text-sm prose prose-sm dark:prose-invert max-w-none">
                      {renderContent(getTranslatedContent(post))}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 gap-1"
                        onClick={() => togglePostReaction(post.id)}
                      >
                        <Heart 
                          className={`h-3.5 w-3.5 ${(postReactions[post.id] || []).some(r => r.user_id === user?.id) ? 'fill-red-500 text-red-500' : ''}`} 
                        />
                        <span className="text-xs">{(postReactions[post.id] || []).length}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reply Form */}
      {user && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <Textarea
                placeholder={language === "ja" ? "コメントを入力... (Markdown対応)" : "Write a comment... (Markdown supported)"}
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                rows={3}
              />
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="video/*"
                    ref={postVideoInputRef}
                    className="hidden"
                    onChange={(e) => handleVideoSelect(e, true)}
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => postVideoInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Video className="h-4 w-4 mr-1" />
                    {uploading ? (language === "ja" ? "アップロード中..." : "Uploading...") : (language === "ja" ? "動画" : "Video")}
                  </Button>
                </div>
                <Button 
                  onClick={createPost} 
                  disabled={submitting || !newPostContent.trim()}
                  size="sm"
                >
                  <Send className="h-4 w-4 mr-1" />
                  {language === "ja" ? "送信" : "Send"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!user && (
        <Card>
          <CardContent className="p-4 text-center text-muted-foreground">
            {language === "ja" ? "コメントするにはログインしてください" : "Please log in to comment"}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
