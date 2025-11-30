import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Celebrity {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  home_dojo: string | null;
  belt_history: any;
  titles: any;
}

interface CelebrityEditRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  celebrity: Celebrity;
}

export const CelebrityEditRequestDialog = ({
  open,
  onOpenChange,
  celebrity,
}: CelebrityEditRequestDialogProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    display_name: "",
    bio: "",
    avatar_url: "",
    home_dojo: "",
    belt_history: [] as any[],
    titles: [] as any[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (celebrity) {
      setFormData({
        display_name: celebrity.display_name,
        bio: celebrity.bio || "",
        avatar_url: celebrity.avatar_url || "",
        home_dojo: celebrity.home_dojo || "",
        belt_history: celebrity.belt_history || [],
        titles: celebrity.titles || [],
      });
    }
  }, [celebrity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("ログインが必要です");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('celebrity_edit_requests')
        .insert({
          celebrity_id: celebrity.id,
          requested_by: user.id,
          display_name: formData.display_name,
          bio: formData.bio || null,
          avatar_url: formData.avatar_url || null,
          home_dojo: formData.home_dojo || null,
          belt_history: formData.belt_history,
          titles: formData.titles,
          status: 'pending',
        });

      if (error) throw error;

      toast.success('編集リクエストを送信しました。管理者の承認をお待ちください。');
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting edit request:', error);
      toast.error('編集リクエストの送信に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>プロフィール編集リクエスト</DialogTitle>
          <DialogDescription>
            変更内容は管理者の承認後に反映されます
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>表示名 *</Label>
            <Input
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              placeholder="例：中井祐樹"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>プロフィール画像URL</Label>
            <Input
              value={formData.avatar_url}
              onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label>自己紹介</Label>
            <Textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="あなたの経歴や実績について..."
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <Label>所属道場</Label>
            <Input
              value={formData.home_dojo}
              onChange={(e) => setFormData({ ...formData, home_dojo: e.target.value })}
              placeholder="例：トライフォース赤坂"
            />
          </div>

          <div className="space-y-2">
            <Label>帯履歴（JSON形式）</Label>
            <Textarea
              value={JSON.stringify(formData.belt_history, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setFormData({ ...formData, belt_history: parsed });
                } catch (err) {
                  // Invalid JSON, don't update
                }
              }}
              placeholder='[{"belt": "Black Belt", "year": "2000", "organization": "BJJ"}]'
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              例: {`[{"belt": "Black Belt", "year": "2000", "organization": "Brazilian Jiu-Jitsu"}]`}
            </p>
          </div>

          <div className="space-y-2">
            <Label>タイトル（JSON形式）</Label>
            <Textarea
              value={JSON.stringify(formData.titles, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setFormData({ ...formData, titles: parsed });
                } catch (err) {
                  // Invalid JSON, don't update
                }
              }}
              placeholder='[{"title": "World Champion", "year": "2010", "event": "IBJJF Worlds"}]'
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              例: {`[{"title": "World Champion", "year": "2010", "event": "IBJJF Worlds"}]`}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '送信中...' : '編集リクエストを送信'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
