import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { MessageSquare, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ja, ptBR } from "date-fns/locale";

interface Comment {
  id: string;
  user_id: string;
  comment: string;
  created_at: string;
  profiles: {
    email: string;
  };
}

interface VideoCommentsProps {
  videoId: string;
  userId: string;
}

export const VideoComments = ({ videoId, userId }: VideoCommentsProps) => {
  const { language } = useLanguage();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [videoId]);

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from("video_comments")
        .select(`
          id,
          user_id,
          comment,
          created_at,
          profiles:user_id (
            email
          )
        `)
        .eq("video_id", videoId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComments(data as any || []);
    } catch (error) {
      console.error("Error loading comments:", error);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("video_comments")
        .insert({
          user_id: userId,
          video_id: videoId,
          comment: newComment.trim(),
        });

      if (error) throw error;

      setNewComment("");
      loadComments();
      toast.success(
        language === "ja" 
          ? "コメントを投稿しました" 
          : language === "pt" 
          ? "Comentário postado" 
          : "Comment posted"
      );
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error(
        language === "ja" 
          ? "コメントの投稿に失敗しました" 
          : language === "pt" 
          ? "Erro ao postar comentário" 
          : "Failed to post comment"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("video_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      loadComments();
      toast.success(
        language === "ja" 
          ? "コメントを削除しました" 
          : language === "pt" 
          ? "Comentário excluído" 
          : "Comment deleted"
      );
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error(
        language === "ja" 
          ? "コメントの削除に失敗しました" 
          : language === "pt" 
          ? "Erro ao excluir comentário" 
          : "Failed to delete comment"
      );
    }
  };

  const getTimeAgo = (dateString: string) => {
    const locale = language === "ja" ? ja : language === "pt" ? ptBR : undefined;
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        <h3 className="text-xl font-medium">
          {language === "ja" ? "コメント" : language === "pt" ? "Comentários" : "Comments"}
          {comments.length > 0 && ` (${comments.length})`}
        </h3>
      </div>

      {/* Comment Form */}
      <div className="space-y-3">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={
            language === "ja" 
              ? "コメントを入力..." 
              : language === "pt" 
              ? "Escreva um comentário..." 
              : "Write a comment..."
          }
          className="min-h-[100px]"
        />
        <Button 
          onClick={handleSubmitComment} 
          disabled={isSubmitting || !newComment.trim()}
        >
          {language === "ja" ? "投稿" : language === "pt" ? "Postar" : "Post"}
        </Button>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {language === "ja" 
              ? "まだコメントがありません" 
              : language === "pt" 
              ? "Ainda não há comentários" 
              : "No comments yet"}
          </p>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} className="p-4">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {comment.profiles?.email?.split("@")[0] || "User"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {getTimeAgo(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {comment.comment}
                  </p>
                </div>
                {comment.user_id === userId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};