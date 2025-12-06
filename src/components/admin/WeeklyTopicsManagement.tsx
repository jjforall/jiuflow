import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Trophy } from "lucide-react";
import { format } from "date-fns";

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
  created_at: string;
}

export const WeeklyTopicsManagement = () => {
  const [topics, setTopics] = useState<WeeklyTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<WeeklyTopic | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    title_ja: "",
    title_pt: "",
    description: "",
    description_ja: "",
    description_pt: "",
    start_date: "",
    end_date: "",
    is_active: true,
  });

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    try {
      const { data, error } = await supabase
        .from('weekly_topics')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      setTopics(data || []);
    } catch (error) {
      console.error('Error loading topics:', error);
      toast.error("Failed to load weekly topics");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.title_ja || !formData.title_pt || !formData.start_date || !formData.end_date) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      if (editingTopic) {
        const { error } = await supabase
          .from('weekly_topics')
          .update(formData)
          .eq('id', editingTopic.id);

        if (error) throw error;
        toast.success("Weekly topic updated");
      } else {
        const { error } = await supabase
          .from('weekly_topics')
          .insert(formData);

        if (error) throw error;
        toast.success("Weekly topic created");
      }

      setDialogOpen(false);
      resetForm();
      loadTopics();
    } catch (error) {
      console.error('Error saving topic:', error);
      toast.error("Failed to save weekly topic");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this topic?")) return;

    try {
      const { error } = await supabase
        .from('weekly_topics')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Weekly topic deleted");
      loadTopics();
    } catch (error) {
      console.error('Error deleting topic:', error);
      toast.error("Failed to delete weekly topic");
    }
  };

  const openEdit = (topic: WeeklyTopic) => {
    setEditingTopic(topic);
    setFormData({
      title: topic.title,
      title_ja: topic.title_ja,
      title_pt: topic.title_pt,
      description: topic.description || "",
      description_ja: topic.description_ja || "",
      description_pt: topic.description_pt || "",
      start_date: topic.start_date,
      end_date: topic.end_date,
      is_active: topic.is_active,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingTopic(null);
    setFormData({
      title: "",
      title_ja: "",
      title_pt: "",
      description: "",
      description_ja: "",
      description_pt: "",
      start_date: "",
      end_date: "",
      is_active: true,
    });
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Weekly Topics Management</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Topic
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTopic ? "Edit Weekly Topic" : "Create Weekly Topic"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End Date *</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Title (English) *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Half Guard Week"
                />
              </div>

              <div>
                <Label>Title (Japanese) *</Label>
                <Input
                  value={formData.title_ja}
                  onChange={(e) => setFormData({ ...formData, title_ja: e.target.value })}
                  placeholder="e.g., ハーフガード週間"
                />
              </div>

              <div>
                <Label>Title (Portuguese) *</Label>
                <Input
                  value={formData.title_pt}
                  onChange={(e) => setFormData({ ...formData, title_pt: e.target.value })}
                  placeholder="e.g., Semana da Meia Guarda"
                />
              </div>

              <div>
                <Label>Description (English)</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Share your favorite half guard sweeps or ask questions!"
                />
              </div>

              <div>
                <Label>Description (Japanese)</Label>
                <Textarea
                  value={formData.description_ja}
                  onChange={(e) => setFormData({ ...formData, description_ja: e.target.value })}
                  placeholder="お気に入りのハーフガードスイープを共有したり、質問してみよう！"
                />
              </div>

              <div>
                <Label>Description (Portuguese)</Label>
                <Textarea
                  value={formData.description_pt}
                  onChange={(e) => setFormData({ ...formData, description_pt: e.target.value })}
                  placeholder="Compartilhe suas raspagens favoritas da meia guarda!"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Active</Label>
              </div>

              <Button onClick={handleSubmit} className="w-full">
                {editingTopic ? "Update" : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {topics.map((topic) => (
          <Card key={topic.id}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-accent" />
                  <CardTitle className="text-lg">{topic.title_ja}</CardTitle>
                  {topic.is_active && (
                    <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(topic)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(topic.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                {topic.description_ja || topic.description}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(topic.start_date), 'yyyy/MM/dd')} - {format(new Date(topic.end_date), 'yyyy/MM/dd')}
              </p>
            </CardContent>
          </Card>
        ))}

        {topics.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No weekly topics yet. Create one to get started!
          </p>
        )}
      </div>
    </div>
  );
};
