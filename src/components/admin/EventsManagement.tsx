import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar, Trash2, Edit } from "lucide-react";

export function EventsManagement() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_type: "",
    event_date: "",
    location: "",
    price: 0,
    max_participants: null as number | null,
    is_public: true,
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("イベント取得エラー:", error);
      toast.error("イベントの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingEvent) {
        const { error } = await supabase
          .from("events")
          .update(formData)
          .eq("id", editingEvent.id);

        if (error) throw error;
        toast.success("イベントを更新しました");
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("未認証");

        const { error } = await supabase
          .from("events")
          .insert([{ ...formData, organizer_id: user.id }]);

        if (error) throw error;
        toast.success("イベントを作成しました");
      }

      setDialogOpen(false);
      resetForm();
      fetchEvents();
    } catch (error) {
      console.error("イベント保存エラー:", error);
      toast.error("イベントの保存に失敗しました");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このイベントを削除しますか？")) return;

    try {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
      toast.success("イベントを削除しました");
      fetchEvents();
    } catch (error) {
      console.error("イベント削除エラー:", error);
      toast.error("イベントの削除に失敗しました");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      event_type: "",
      event_date: "",
      location: "",
      price: 0,
      max_participants: null,
      is_public: true,
    });
    setEditingEvent(null);
  };

  const handleEdit = (event: any) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      event_type: event.event_type,
      event_date: event.event_date ? format(new Date(event.event_date), "yyyy-MM-dd'T'HH:mm") : "",
      location: event.location || "",
      price: event.price,
      max_participants: event.max_participants,
      is_public: event.is_public,
    });
    setDialogOpen(true);
  };

  if (loading) {
    return <div>読み込み中...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          イベント管理
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>新規イベント作成</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEvent ? "イベント編集" : "新規イベント作成"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">タイトル</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="event_type">イベント種類</Label>
                <Input
                  id="event_type"
                  value={formData.event_type}
                  onChange={(e) =>
                    setFormData({ ...formData, event_type: e.target.value })
                  }
                  placeholder="例: セミナー、大会、交流会"
                  required
                />
              </div>
              <div>
                <Label htmlFor="event_date">開催日時</Label>
                <Input
                  id="event_date"
                  type="datetime-local"
                  value={formData.event_date}
                  onChange={(e) =>
                    setFormData({ ...formData, event_date: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="location">場所</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="price">参加費（円）</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: parseInt(e.target.value) })
                  }
                  min={0}
                />
              </div>
              <div>
                <Label htmlFor="max_participants">最大参加者数</Label>
                <Input
                  id="max_participants"
                  type="number"
                  value={formData.max_participants || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_participants: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  min={1}
                />
              </div>
              <div>
                <Label htmlFor="description">説明</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={formData.is_public}
                  onChange={(e) =>
                    setFormData({ ...formData, is_public: e.target.checked })
                  }
                />
                <Label htmlFor="is_public">公開イベント</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  キャンセル
                </Button>
                <Button type="submit">
                  {editingEvent ? "更新" : "作成"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>タイトル</TableHead>
              <TableHead>種類</TableHead>
              <TableHead>開催日時</TableHead>
              <TableHead>場所</TableHead>
              <TableHead>参加費</TableHead>
              <TableHead>公開</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell>{event.title}</TableCell>
                <TableCell>{event.event_type}</TableCell>
                <TableCell>
                  {event.event_date
                    ? format(new Date(event.event_date), "yyyy/MM/dd HH:mm", {
                        locale: ja,
                      })
                    : "-"}
                </TableCell>
                <TableCell>{event.location || "-"}</TableCell>
                <TableCell>¥{event.price.toLocaleString()}</TableCell>
                <TableCell>{event.is_public ? "公開" : "非公開"}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(event)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(event.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
