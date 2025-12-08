import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Plus, Edit2, Trash2, CalendarIcon, Clock, Star, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { HealthDataConsent, getHealthDataConsent } from "@/components/HealthDataConsent";

interface PracticeRecord {
  id: string;
  user_id: string;
  technique_id: string | null;
  user_video_id: string | null;
  practice_date: string;
  duration_minutes: number | null;
  notes: string | null;
  difficulty_rating: number | null;
  success_rating: number | null;
  created_at: string;
  techniques?: {
    name: string;
    name_ja: string;
    category: string;
  };
  user_videos?: {
    title: string;
    thumbnail_url: string | null;
  };
}

interface Technique {
  id: string;
  name: string;
  name_ja: string;
  category: string;
}

interface UserVideo {
  id: string;
  title: string;
  thumbnail_url: string | null;
}

export function PracticeRecords() {
  const [records, setRecords] = useState<PracticeRecord[]>([]);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [userVideos, setUserVideos] = useState<UserVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PracticeRecord | null>(null);
  const [healthConsent, setHealthConsent] = useState(getHealthDataConsent());
  const [formData, setFormData] = useState({
    technique_id: "",
    user_video_id: "",
    practice_date: new Date(),
    duration_minutes: "",
    notes: "",
    difficulty_rating: "",
    success_rating: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 練習記録を取得
      const { data: recordsData, error: recordsError } = await supabase
        .from("practice_records")
        .select(`
          *,
          techniques (name, name_ja, category),
          user_videos (title, thumbnail_url)
        `)
        .eq("user_id", user.id)
        .order("practice_date", { ascending: false });

      if (recordsError) throw recordsError;
      setRecords(recordsData || []);

      // 技術リストを取得
      const { data: techniquesData, error: techniquesError } = await supabase
        .from("techniques")
        .select("id, name, name_ja, category")
        .order("name_ja");

      if (techniquesError) throw techniquesError;
      setTechniques(techniquesData || []);

      // ユーザー動画を取得
      const { data: videosData, error: videosError } = await supabase
        .from("user_videos")
        .select("id, title, thumbnail_url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (videosError) throw videosError;
      setUserVideos(videosData || []);
    } catch (error) {
      console.error("データ取得エラー:", error);
      toast.error("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (record?: PracticeRecord) => {
    if (record) {
      setEditingRecord(record);
      setFormData({
        technique_id: record.technique_id || "",
        user_video_id: record.user_video_id || "",
        practice_date: new Date(record.practice_date),
        duration_minutes: record.duration_minutes?.toString() || "",
        notes: record.notes || "",
        difficulty_rating: record.difficulty_rating?.toString() || "",
        success_rating: record.success_rating?.toString() || "",
      });
    } else {
      setEditingRecord(null);
      setFormData({
        technique_id: "",
        user_video_id: "",
        practice_date: new Date(),
        duration_minutes: "",
        notes: "",
        difficulty_rating: "",
        success_rating: "",
      });
    }
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingRecord(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("ログインが必要です");
        return;
      }

      const recordData = {
        user_id: user.id,
        technique_id: formData.technique_id || null,
        user_video_id: formData.user_video_id || null,
        practice_date: format(formData.practice_date, "yyyy-MM-dd"),
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        notes: formData.notes || null,
        difficulty_rating: formData.difficulty_rating ? parseInt(formData.difficulty_rating) : null,
        success_rating: formData.success_rating ? parseInt(formData.success_rating) : null,
      };

      if (editingRecord) {
        const { error } = await supabase
          .from("practice_records")
          .update(recordData)
          .eq("id", editingRecord.id);

        if (error) throw error;
        toast.success("練習記録を更新しました");
      } else {
        const { error } = await supabase
          .from("practice_records")
          .insert([recordData]);

        if (error) throw error;
        toast.success("練習記録を追加しました");
      }

      closeDialog();
      fetchData();
    } catch (error) {
      console.error("保存エラー:", error);
      toast.error("保存に失敗しました");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この練習記録を削除しますか？")) return;

    try {
      const { error } = await supabase
        .from("practice_records")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("練習記録を削除しました");
      fetchData();
    } catch (error) {
      console.error("削除エラー:", error);
      toast.error("削除に失敗しました");
    }
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-muted-foreground text-sm">未評価</span>;
    return (
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              "w-4 h-4",
              i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted"
            )}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            練習記録
          </CardTitle>
          <Button onClick={() => openDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            記録を追加
          </Button>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center py-12">
              <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">まだ練習記録がありません</p>
              <Button onClick={() => openDialog()}>最初の記録を追加</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">
                          {format(new Date(record.practice_date), "yyyy年MM月dd日(E)", { locale: ja })}
                        </span>
                        {record.duration_minutes && (
                          <>
                            <Clock className="w-4 h-4 text-muted-foreground ml-2" />
                            <span className="text-sm text-muted-foreground">
                              {record.duration_minutes}分
                            </span>
                          </>
                        )}
                      </div>
                      
                      {record.techniques && (
                        <div className="mb-2">
                          <Badge variant="secondary" className="text-xs">
                            技術: {record.techniques.name_ja}
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({record.techniques.category})
                          </span>
                        </div>
                      )}

                      {record.user_videos && (
                        <div className="mb-2 flex items-center gap-2">
                          {record.user_videos.thumbnail_url && (
                            <img
                              src={record.user_videos.thumbnail_url}
                              alt={record.user_videos.title}
                              className="w-16 h-12 object-cover rounded"
                            />
                          )}
                          <span className="text-sm">
                            動画: {record.user_videos.title}
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">難易度</p>
                          {renderStars(record.difficulty_rating)}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">成功度</p>
                          {renderStars(record.success_rating)}
                        </div>
                      </div>

                      {record.notes && (
                        <div className="mt-3 p-2 bg-muted/30 rounded text-sm">
                          <p className="text-muted-foreground whitespace-pre-wrap">{record.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDialog(record)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(record.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={closeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? "練習記録を編集" : "練習記録を追加"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>日付 *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.practice_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.practice_date, "yyyy年MM月dd日", { locale: ja })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.practice_date}
                    onSelect={(date) => date && setFormData({ ...formData, practice_date: date })}
                    locale={ja}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>技術（オプション）</Label>
              <Select
                value={formData.technique_id || undefined}
                onValueChange={(value) => setFormData({ ...formData, technique_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="技術を選択（任意）" />
                </SelectTrigger>
                <SelectContent>
                  {techniques.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.name_ja} ({tech.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>動画（オプション）</Label>
              <Select
                value={formData.user_video_id || undefined}
                onValueChange={(value) => setFormData({ ...formData, user_video_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="動画を選択（任意）" />
                </SelectTrigger>
                <SelectContent>
                  {userVideos.map((video) => (
                    <SelectItem key={video.id} value={video.id}>
                      {video.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>練習時間（分）</Label>
              <Input
                type="number"
                placeholder="例: 60"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                min="1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>難易度（1-5）</Label>
                <Select
                  value={formData.difficulty_rating || undefined}
                  onValueChange={(value) => setFormData({ ...formData, difficulty_rating: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選択（任意）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">⭐ とても簡単</SelectItem>
                    <SelectItem value="2">⭐⭐ 簡単</SelectItem>
                    <SelectItem value="3">⭐⭐⭐ 普通</SelectItem>
                    <SelectItem value="4">⭐⭐⭐⭐ 難しい</SelectItem>
                    <SelectItem value="5">⭐⭐⭐⭐⭐ とても難しい</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>成功度（1-5）</Label>
                <Select
                  value={formData.success_rating || undefined}
                  onValueChange={(value) => setFormData({ ...formData, success_rating: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選択（任意）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">⭐ 全然できなかった</SelectItem>
                    <SelectItem value="2">⭐⭐ あまりできなかった</SelectItem>
                    <SelectItem value="3">⭐⭐⭐ まあまあできた</SelectItem>
                    <SelectItem value="4">⭐⭐⭐⭐ よくできた</SelectItem>
                    <SelectItem value="5">⭐⭐⭐⭐⭐ 完璧にできた</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>メモ</Label>
              <Textarea
                placeholder="練習内容や気づいたことを記録..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
              />
            </div>

            {/* GDPR Health Data Consent */}
            <HealthDataConsent 
              onConsentChange={setHealthConsent}
              className="mt-2"
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                キャンセル
              </Button>
              <Button type="submit" disabled={!healthConsent}>
                {editingRecord ? "更新" : "追加"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
