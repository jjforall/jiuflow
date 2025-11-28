import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Edit2, Trash2, Plus, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface Dojo {
  id: string;
  name: string;
  name_ja: string;
  name_pt: string;
  description: string | null;
  description_ja: string | null;
  description_pt: string | null;
  location: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  phone: string | null;
  email: string | null;
  is_verified: boolean;
  created_at: string;
}

export default function DojosManagement() {
  const { language } = useLanguage();
  const [dojos, setDojos] = useState<Dojo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDojo, setEditingDojo] = useState<Dojo | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    name_ja: "",
    name_pt: "",
    description: "",
    description_ja: "",
    description_pt: "",
    location: "",
    website: "",
    instagram: "",
    facebook: "",
    phone: "",
    email: "",
    is_verified: false
  });

  useEffect(() => {
    loadDojos();
  }, []);

  const loadDojos = async () => {
    try {
      const { data, error } = await supabase
        .from('dojos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDojos(data || []);
    } catch (error) {
      console.error('Error loading dojos:', error);
      toast.error(language === "ja" ? "道場の読み込みに失敗しました" : "Failed to load dojos");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingDojo) {
        const { error } = await supabase
          .from('dojos')
          .update(formData)
          .eq('id', editingDojo.id);

        if (error) throw error;
        toast.success(language === "ja" ? "道場を更新しました" : "Dojo updated");
      } else {
        const { error } = await supabase
          .from('dojos')
          .insert([formData]);

        if (error) throw error;
        toast.success(language === "ja" ? "道場を作成しました" : "Dojo created");
      }

      setIsDialogOpen(false);
      resetForm();
      loadDojos();
    } catch (error) {
      console.error('Error saving dojo:', error);
      toast.error(language === "ja" ? "保存に失敗しました" : "Failed to save");
    }
  };

  const handleEdit = (dojo: Dojo) => {
    setEditingDojo(dojo);
    setFormData({
      name: dojo.name,
      name_ja: dojo.name_ja,
      name_pt: dojo.name_pt,
      description: dojo.description || "",
      description_ja: dojo.description_ja || "",
      description_pt: dojo.description_pt || "",
      location: dojo.location || "",
      website: dojo.website || "",
      instagram: dojo.instagram || "",
      facebook: dojo.facebook || "",
      phone: dojo.phone || "",
      email: dojo.email || "",
      is_verified: dojo.is_verified
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === "ja" ? "本当に削除しますか？" : "Are you sure?")) return;

    try {
      const { error } = await supabase
        .from('dojos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success(language === "ja" ? "道場を削除しました" : "Dojo deleted");
      loadDojos();
    } catch (error) {
      console.error('Error deleting dojo:', error);
      toast.error(language === "ja" ? "削除に失敗しました" : "Failed to delete");
    }
  };

  const resetForm = () => {
    setEditingDojo(null);
    setFormData({
      name: "",
      name_ja: "",
      name_pt: "",
      description: "",
      description_ja: "",
      description_pt: "",
      location: "",
      website: "",
      instagram: "",
      facebook: "",
      phone: "",
      email: "",
      is_verified: false
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{language === "ja" ? "道場管理" : "Dojos Management"}</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                {language === "ja" ? "新規追加" : "Add New"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingDojo 
                    ? (language === "ja" ? "道場を編集" : "Edit Dojo")
                    : (language === "ja" ? "道場を追加" : "Add Dojo")
                  }
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>名前 (EN)</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>名前 (JA)</Label>
                    <Input
                      value={formData.name_ja}
                      onChange={(e) => setFormData({ ...formData, name_ja: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>名前 (PT)</Label>
                    <Input
                      value={formData.name_pt}
                      onChange={(e) => setFormData({ ...formData, name_pt: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label>説明 (EN)</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>

                <div>
                  <Label>説明 (JA)</Label>
                  <Textarea
                    value={formData.description_ja}
                    onChange={(e) => setFormData({ ...formData, description_ja: e.target.value })}
                    rows={2}
                  />
                </div>

                <div>
                  <Label>説明 (PT)</Label>
                  <Textarea
                    value={formData.description_pt}
                    onChange={(e) => setFormData({ ...formData, description_pt: e.target.value })}
                    rows={2}
                  />
                </div>

                <div>
                  <Label>{language === "ja" ? "場所" : "Location"}</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{language === "ja" ? "ウェブサイト" : "Website"}</Label>
                    <Input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Instagram</Label>
                    <Input
                      value={formData.instagram}
                      onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                      placeholder="username"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Facebook</Label>
                    <Input
                      value={formData.facebook}
                      onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{language === "ja" ? "電話番号" : "Phone"}</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label>{language === "ja" ? "メールアドレス" : "Email"}</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_verified}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_verified: checked })}
                  />
                  <Label>{language === "ja" ? "公認道場" : "Verified Dojo"}</Label>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {language === "ja" ? "キャンセル" : "Cancel"}
                  </Button>
                  <Button type="submit">
                    {language === "ja" ? "保存" : "Save"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            {language === "ja" ? "読み込み中..." : "Loading..."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{language === "ja" ? "名前" : "Name"}</TableHead>
                <TableHead>{language === "ja" ? "場所" : "Location"}</TableHead>
                <TableHead>{language === "ja" ? "ステータス" : "Status"}</TableHead>
                <TableHead className="text-right">{language === "ja" ? "操作" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dojos.map((dojo) => (
                <TableRow key={dojo.id}>
                  <TableCell className="font-medium">{dojo.name_ja || dojo.name}</TableCell>
                  <TableCell>{dojo.location}</TableCell>
                  <TableCell>
                    {dojo.is_verified && (
                      <Badge variant="secondary">
                        {language === "ja" ? "公認" : "Verified"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(dojo)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(dojo.id)}
                      >
                        <Trash2 className="w-4 h-4" />
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
