import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  BookOpen, GraduationCap, MessageCircle, Trophy, HelpCircle, Calendar,
  Plus, ArrowLeft, Send, Eye, MessageSquare, Pin, ChevronRight
} from "lucide-react";

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
  created_at: string;
  author?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
}

const iconMap: Record<string, React.ElementType> = {
  BookOpen,
  GraduationCap,
  MessageCircle,
  Trophy,
  HelpCircle,
  Calendar,
};

export const OpenMat = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadContent, setNewThreadContent] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadThreads(selectedCategory.id);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedThread) {
      loadPosts(selectedThread.id);
      incrementViewCount(selectedThread.id);
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

  const loadThreads = async (categoryId: string) => {
    setLoading(true);
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
      setLoading(false);
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

  const createThread = async () => {
    if (!user || !selectedCategory) return;
    if (!newThreadTitle.trim() || !newThreadContent.trim()) {
      toast.error(language === "ja" ? "タイトルと内容を入力してください" : "Please enter title and content");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('community_threads')
        .insert({
          category_id: selectedCategory.id,
          author_id: user.id,
          title: newThreadTitle.trim(),
          content: newThreadContent.trim(),
        });

      if (error) throw error;

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
      const { error } = await supabase
        .from('community_posts')
        .insert({
          thread_id: selectedThread.id,
          author_id: user.id,
          content: newPostContent.trim(),
        });

      if (error) throw error;

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

  // Category List View
  if (!selectedCategory) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-light">Open Mat</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {language === "ja" ? "柔術仲間とつながろう" : "Connect with your BJJ community"}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3">
            {categories.map((category) => (
              <Card 
                key={category.id} 
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setSelectedCategory(category)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary">
                    {getIcon(category.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium">{getCategoryName(category)}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {getCategoryDescription(category)}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Thread List View
  if (!selectedThread) {
    return (
      <div className="space-y-4">
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
                      placeholder={language === "ja" ? "内容を入力..." : "Enter content..."}
                      value={newThreadContent}
                      onChange={(e) => setNewThreadContent(e.target.value)}
                      rows={5}
                    />
                  </div>
                  <Button 
                    onClick={createThread} 
                    disabled={submitting}
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

        {loading ? (
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
                        <h3 className="font-medium truncate">{thread.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                        {thread.content}
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
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => {
            setSelectedThread(null);
            setPosts([]);
          }}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-medium truncate">{selectedThread.title}</h2>
          <p className="text-sm text-muted-foreground">
            {selectedThread.author?.display_name} • {format(new Date(selectedThread.created_at), 'yyyy/MM/dd HH:mm')}
          </p>
        </div>
      </div>

      {/* Original Post */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={selectedThread.author?.avatar_url || undefined} />
              <AvatarFallback>
                {selectedThread.author?.display_name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{selectedThread.author?.display_name}</span>
                <span className="text-muted-foreground">
                  {format(new Date(selectedThread.created_at), 'yyyy/MM/dd HH:mm')}
                </span>
              </div>
              <div className="mt-2 whitespace-pre-wrap">{selectedThread.content}</div>
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
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={post.author?.avatar_url || undefined} />
                    <AvatarFallback>
                      {post.author?.display_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{post.author?.display_name}</span>
                      <span className="text-muted-foreground text-xs">
                        {format(new Date(post.created_at), 'yyyy/MM/dd HH:mm')}
                      </span>
                    </div>
                    <div className="mt-1 text-sm whitespace-pre-wrap">{post.content}</div>
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
            <div className="flex gap-3">
              <Textarea
                placeholder={language === "ja" ? "コメントを入力..." : "Write a comment..."}
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                rows={3}
                className="flex-1"
              />
              <Button 
                onClick={createPost} 
                disabled={submitting || !newPostContent.trim()}
                size="icon"
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
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
