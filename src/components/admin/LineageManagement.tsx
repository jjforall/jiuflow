import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Edit, Trash2, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Lineage {
  id: string;
  instructor_id: string;
  student_id: string;
  belt_level: string | null;
  notes: string | null;
  started_at: string | null;
  ended_at: string | null;
  instructor: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
  student: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
}

interface Celebrity {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export const LineageManagement = () => {
  const [lineages, setLineages] = useState<Lineage[]>([]);
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingLineage, setEditingLineage] = useState<Lineage | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    instructor_id: "",
    student_id: "",
    belt_level: "",
    notes: "",
    started_at: "",
    ended_at: "",
  });

  useEffect(() => {
    loadLineages();
    loadCelebrities();
  }, []);

  const loadLineages = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('celebrity_lineage')
        .select(`
          *,
          instructor:celebrities!celebrity_lineage_instructor_id_fkey(id, display_name, avatar_url),
          student:celebrities!celebrity_lineage_student_id_fkey(id, display_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLineages(data || []);
    } catch (error) {
      console.error('Error loading lineages:', error);
      toast.error('系統関係の読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCelebrities = async () => {
    try {
      const { data, error } = await supabase
        .from('celebrities')
        .select('id, display_name, avatar_url')
        .order('display_name');

      if (error) throw error;
      setCelebrities(data || []);
    } catch (error) {
      console.error('Error loading celebrities:', error);
    }
  };

  const openEditDialog = (lineage?: Lineage) => {
    if (lineage) {
      setEditingLineage(lineage);
      setFormData({
        instructor_id: lineage.instructor_id,
        student_id: lineage.student_id,
        belt_level: lineage.belt_level || "",
        notes: lineage.notes || "",
        started_at: lineage.started_at || "",
        ended_at: lineage.ended_at || "",
      });
    } else {
      setEditingLineage(null);
      setFormData({
        instructor_id: "",
        student_id: "",
        belt_level: "",
        notes: "",
        started_at: "",
        ended_at: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.instructor_id || !formData.student_id) {
      toast.error('師範と弟子を選択してください');
      return;
    }

    if (formData.instructor_id === formData.student_id) {
      toast.error('師範と弟子は異なる選手を選択してください');
      return;
    }

    try {
      const lineageData = {
        instructor_id: formData.instructor_id,
        student_id: formData.student_id,
        belt_level: formData.belt_level || null,
        notes: formData.notes || null,
        started_at: formData.started_at || null,
        ended_at: formData.ended_at || null,
      };

      if (editingLineage) {
        const { error } = await supabase
          .from('celebrity_lineage')
          .update(lineageData)
          .eq('id', editingLineage.id);

        if (error) throw error;
        toast.success('系統関係を更新しました');
      } else {
        const { error } = await supabase
          .from('celebrity_lineage')
          .insert(lineageData);

        if (error) throw error;
        toast.success('系統関係を追加しました');
      }

      setIsDialogOpen(false);
      loadLineages();
    } catch (error) {
      console.error('Error saving lineage:', error);
      toast.error('保存に失敗しました');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('本当に削除しますか？')) return;

    try {
      const { error } = await supabase
        .from('celebrity_lineage')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('系統関係を削除しました');
      loadLineages();
    } catch (error) {
      console.error('Error deleting lineage:', error);
      toast.error('削除に失敗しました');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">系統関係管理</h2>
        <Button onClick={() => openEditDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          系統関係を追加
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">読み込み中...</div>
      ) : (
        <div className="grid gap-4">
          {lineages.map((lineage) => (
            <Card key={lineage.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={lineage.instructor.avatar_url || undefined} />
                        <AvatarFallback>{lineage.instructor.display_name[0]}</AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium mt-2">{lineage.instructor.display_name}</p>
                      <p className="text-xs text-muted-foreground">師範</p>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <ArrowRight className="h-6 w-6 text-muted-foreground" />
                      {lineage.belt_level && (
                        <span className="text-xs bg-secondary px-2 py-1 rounded">
                          {lineage.belt_level}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col items-center">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={lineage.student.avatar_url || undefined} />
                        <AvatarFallback>{lineage.student.display_name[0]}</AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium mt-2">{lineage.student.display_name}</p>
                      <p className="text-xs text-muted-foreground">弟子</p>
                    </div>

                    {lineage.notes && (
                      <div className="ml-6 max-w-md">
                        <p className="text-sm text-muted-foreground">{lineage.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(lineage)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(lineage.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLineage ? '系統関係を編集' : '系統関係を追加'}
            </DialogTitle>
            <DialogDescription>
              師範と弟子の関係を登録してください
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>師範 *</Label>
              <Select
                value={formData.instructor_id}
                onValueChange={(value) => setFormData({ ...formData, instructor_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="師範を選択" />
                </SelectTrigger>
                <SelectContent>
                  {celebrities.map((celebrity) => (
                    <SelectItem key={celebrity.id} value={celebrity.id}>
                      {celebrity.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>弟子 *</Label>
              <Select
                value={formData.student_id}
                onValueChange={(value) => setFormData({ ...formData, student_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="弟子を選択" />
                </SelectTrigger>
                <SelectContent>
                  {celebrities.map((celebrity) => (
                    <SelectItem key={celebrity.id} value={celebrity.id}>
                      {celebrity.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>帯レベル</Label>
              <Input
                value={formData.belt_level}
                onChange={(e) => setFormData({ ...formData, belt_level: e.target.value })}
                placeholder="例：Black Belt"
              />
            </div>

            <div className="space-y-2">
              <Label>備考</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="系統関係についての詳細..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>開始日</Label>
                <Input
                  type="date"
                  value={formData.started_at}
                  onChange={(e) => setFormData({ ...formData, started_at: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>終了日</Label>
                <Input
                  type="date"
                  value={formData.ended_at}
                  onChange={(e) => setFormData({ ...formData, ended_at: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit">
                {editingLineage ? '更新' : '追加'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
