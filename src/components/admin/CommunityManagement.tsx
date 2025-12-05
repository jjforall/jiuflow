import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical, MessageCircle, HelpCircle, Lightbulb, Users, Trophy, BookOpen } from "lucide-react";

interface Category {
  id: string;
  name: string;
  name_ja: string;
  name_pt: string;
  description: string | null;
  description_ja: string | null;
  description_pt: string | null;
  icon: string | null;
  sort_order: number | null;
}

const iconOptions = [
  { value: "MessageCircle", label: "メッセージ", icon: MessageCircle },
  { value: "HelpCircle", label: "質問", icon: HelpCircle },
  { value: "Lightbulb", label: "アイデア", icon: Lightbulb },
  { value: "Users", label: "ユーザー", icon: Users },
  { value: "Trophy", label: "トロフィー", icon: Trophy },
  { value: "BookOpen", label: "本", icon: BookOpen },
];

const getIconComponent = (iconName: string | null) => {
  const iconOption = iconOptions.find(opt => opt.value === iconName);
  if (iconOption) {
    const IconComp = iconOption.icon;
    return <IconComp className="h-4 w-4" />;
  }
  return <MessageCircle className="h-4 w-4" />;
};

export function CommunityManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    name_ja: "",
    name_pt: "",
    description: "",
    description_ja: "",
    description_pt: "",
    icon: "MessageCircle",
    sort_order: 0,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("community_categories")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error loading categories:", error);
      toast.error("カテゴリの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name || !formData.name_ja || !formData.name_pt) {
        toast.error("名前は必須です");
        return;
      }

      if (editingCategory) {
        const { error } = await supabase
          .from("community_categories")
          .update({
            name: formData.name,
            name_ja: formData.name_ja,
            name_pt: formData.name_pt,
            description: formData.description || null,
            description_ja: formData.description_ja || null,
            description_pt: formData.description_pt || null,
            icon: formData.icon,
            sort_order: formData.sort_order,
          })
          .eq("id", editingCategory.id);

        if (error) throw error;
        toast.success("カテゴリを更新しました");
      } else {
        const { error } = await supabase
          .from("community_categories")
          .insert({
            name: formData.name,
            name_ja: formData.name_ja,
            name_pt: formData.name_pt,
            description: formData.description || null,
            description_ja: formData.description_ja || null,
            description_pt: formData.description_pt || null,
            icon: formData.icon,
            sort_order: formData.sort_order,
          });

        if (error) throw error;
        toast.success("カテゴリを追加しました");
      }

      setIsDialogOpen(false);
      resetForm();
      loadCategories();
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("保存に失敗しました");
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      name_ja: category.name_ja,
      name_pt: category.name_pt,
      description: category.description || "",
      description_ja: category.description_ja || "",
      description_pt: category.description_pt || "",
      icon: category.icon || "MessageCircle",
      sort_order: category.sort_order || 0,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このカテゴリを削除しますか？関連するスレッドも削除されます。")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("community_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("カテゴリを削除しました");
      loadCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("削除に失敗しました");
    }
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({
      name: "",
      name_ja: "",
      name_pt: "",
      description: "",
      description_ja: "",
      description_pt: "",
      icon: "MessageCircle",
      sort_order: 0,
    });
  };

  const openNewDialog = () => {
    resetForm();
    setFormData(prev => ({
      ...prev,
      sort_order: categories.length,
    }));
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div className="p-8 text-center">読み込み中...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>オープンマット カテゴリ管理</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="h-4 w-4 mr-2" />
              カテゴリ追加
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "カテゴリ編集" : "新規カテゴリ"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>名前 (英語)</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="General Discussion"
                  />
                </div>
                <div className="space-y-2">
                  <Label>名前 (日本語)</Label>
                  <Input
                    value={formData.name_ja}
                    onChange={(e) => setFormData({ ...formData, name_ja: e.target.value })}
                    placeholder="雑談"
                  />
                </div>
                <div className="space-y-2">
                  <Label>名前 (ポルトガル語)</Label>
                  <Input
                    value={formData.name_pt}
                    onChange={(e) => setFormData({ ...formData, name_pt: e.target.value })}
                    placeholder="Discussão Geral"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>説明 (英語)</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="General BJJ discussion"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>説明 (日本語)</Label>
                  <Textarea
                    value={formData.description_ja}
                    onChange={(e) => setFormData({ ...formData, description_ja: e.target.value })}
                    placeholder="柔術についての雑談"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>説明 (ポルトガル語)</Label>
                  <Textarea
                    value={formData.description_pt}
                    onChange={(e) => setFormData({ ...formData, description_pt: e.target.value })}
                    placeholder="Discussão geral sobre BJJ"
                    rows={2}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>アイコン</Label>
                  <div className="flex flex-wrap gap-2">
                    {iconOptions.map((opt) => {
                      const IconComp = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, icon: opt.value })}
                          className={`p-2 rounded border transition-colors ${
                            formData.icon === opt.value
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                          title={opt.label}
                        >
                          <IconComp className="h-5 w-5" />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>表示順</Label>
                  <Input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={handleSubmit}>
                  {editingCategory ? "更新" : "追加"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            カテゴリがありません
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">順序</TableHead>
                <TableHead className="w-12">アイコン</TableHead>
                <TableHead>名前 (日本語)</TableHead>
                <TableHead>名前 (英語)</TableHead>
                <TableHead>説明</TableHead>
                <TableHead className="w-24">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      {category.sort_order}
                    </div>
                  </TableCell>
                  <TableCell>{getIconComponent(category.icon)}</TableCell>
                  <TableCell className="font-medium">{category.name_ja}</TableCell>
                  <TableCell>{category.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                    {category.description_ja || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(category.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
