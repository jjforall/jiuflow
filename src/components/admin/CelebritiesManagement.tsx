import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Star, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Celebrity {
  id: string;
  user_id: string | null;
  display_name: string;
  bio: string | null;
  bio_ja: string | null;
  bio_en: string | null;
  bio_pt: string | null;
  bio_es: string | null;
  bio_fr: string | null;
  bio_de: string | null;
  bio_zh: string | null;
  bio_ko: string | null;
  bio_it: string | null;
  bio_ru: string | null;
  bio_ar: string | null;
  bio_hi: string | null;
  avatar_url: string | null;
  belt_history: any;
  titles: any;
  organization_id: string | null;
  home_dojo: string | null;
  social_links: any;
  stats: any;
  featured: boolean;
  sort_order: number;
}

interface Organization {
  id: string;
  name: string;
  name_ja: string;
  name_pt: string;
}

export const CelebritiesManagement = () => {
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCelebrity, setEditingCelebrity] = useState<Celebrity | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    display_name: "",
    bio: "",
    bio_ja: "",
    bio_en: "",
    bio_pt: "",
    bio_es: "",
    bio_fr: "",
    bio_de: "",
    bio_zh: "",
    bio_ko: "",
    bio_it: "",
    bio_ru: "",
    bio_ar: "",
    bio_hi: "",
    avatar_url: "",
    home_dojo: "",
    organization_id: "",
    featured: false,
    belt_history: [] as Array<{ belt: string; year: string | null; organization: string }>,
    titles: [] as Array<{ title: string; year: string | null; event: string }>,
  });

  useEffect(() => {
    loadCelebrities();
    loadOrganizations();
  }, []);

  const loadCelebrities = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('celebrities')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('display_name', { ascending: true });

      if (error) throw error;
      setCelebrities(data || []);
    } catch (error) {
      console.error('Error loading celebrities:', error);
      toast.error('選手の読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const loadOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, name_ja, name_pt')
        .order('name_ja');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error loading organizations:', error);
    }
  };

  const openEditDialog = (celebrity?: Celebrity) => {
    if (celebrity) {
      setEditingCelebrity(celebrity);
      setFormData({
        display_name: celebrity.display_name,
        bio: celebrity.bio || "",
        bio_ja: celebrity.bio_ja || "",
        bio_en: celebrity.bio_en || "",
        bio_pt: celebrity.bio_pt || "",
        bio_es: celebrity.bio_es || "",
        bio_fr: celebrity.bio_fr || "",
        bio_de: celebrity.bio_de || "",
        bio_zh: celebrity.bio_zh || "",
        bio_ko: celebrity.bio_ko || "",
        bio_it: celebrity.bio_it || "",
        bio_ru: celebrity.bio_ru || "",
        bio_ar: celebrity.bio_ar || "",
        bio_hi: celebrity.bio_hi || "",
        avatar_url: celebrity.avatar_url || "",
        home_dojo: celebrity.home_dojo || "",
        organization_id: celebrity.organization_id || "",
        featured: celebrity.featured,
        belt_history: celebrity.belt_history || [],
        titles: celebrity.titles || [],
      });
    } else {
      setEditingCelebrity(null);
      setFormData({
        display_name: "",
        bio: "",
        bio_ja: "",
        bio_en: "",
        bio_pt: "",
        bio_es: "",
        bio_fr: "",
        bio_de: "",
        bio_zh: "",
        bio_ko: "",
        bio_it: "",
        bio_ru: "",
        bio_ar: "",
        bio_hi: "",
        avatar_url: "",
        home_dojo: "",
        organization_id: "",
        featured: false,
        belt_history: [],
        titles: [],
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCelebrity) {
        const { error } = await supabase
          .from('celebrities')
          .update({
            display_name: formData.display_name,
            bio: formData.bio || null,
            bio_ja: formData.bio_ja || null,
            bio_en: formData.bio_en || null,
            bio_pt: formData.bio_pt || null,
            bio_es: formData.bio_es || null,
            bio_fr: formData.bio_fr || null,
            bio_de: formData.bio_de || null,
            bio_zh: formData.bio_zh || null,
            bio_ko: formData.bio_ko || null,
            bio_it: formData.bio_it || null,
            bio_ru: formData.bio_ru || null,
            bio_ar: formData.bio_ar || null,
            bio_hi: formData.bio_hi || null,
            avatar_url: formData.avatar_url || null,
            home_dojo: formData.home_dojo || null,
            organization_id: formData.organization_id || null,
            featured: formData.featured,
            belt_history: formData.belt_history,
            titles: formData.titles,
          })
          .eq('id', editingCelebrity.id);

        if (error) throw error;
        toast.success('選手情報を更新しました');
      } else {
        const { error } = await supabase
          .from('celebrities')
          .insert({
            display_name: formData.display_name,
            bio: formData.bio || null,
            bio_ja: formData.bio_ja || null,
            bio_en: formData.bio_en || null,
            bio_pt: formData.bio_pt || null,
            bio_es: formData.bio_es || null,
            bio_fr: formData.bio_fr || null,
            bio_de: formData.bio_de || null,
            bio_zh: formData.bio_zh || null,
            bio_ko: formData.bio_ko || null,
            bio_it: formData.bio_it || null,
            bio_ru: formData.bio_ru || null,
            bio_ar: formData.bio_ar || null,
            bio_hi: formData.bio_hi || null,
            avatar_url: formData.avatar_url || null,
            home_dojo: formData.home_dojo || null,
            organization_id: formData.organization_id || null,
            featured: formData.featured,
            belt_history: formData.belt_history,
            titles: formData.titles,
          });

        if (error) throw error;
        toast.success('選手を追加しました');
      }

      setIsDialogOpen(false);
      loadCelebrities();
    } catch (error) {
      console.error('Error saving celebrity:', error);
      toast.error('保存に失敗しました');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('本当に削除しますか？')) return;

    try {
      const { error } = await supabase
        .from('celebrities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('選手を削除しました');
      loadCelebrities();
    } catch (error) {
      console.error('Error deleting celebrity:', error);
      toast.error('削除に失敗しました');
    }
  };

  const updateSortOrder = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = celebrities.findIndex(c => c.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= celebrities.length) return;

    const current = celebrities[currentIndex];
    const swap = celebrities[newIndex];

    try {
      await Promise.all([
        supabase.from('celebrities').update({ sort_order: swap.sort_order }).eq('id', current.id),
        supabase.from('celebrities').update({ sort_order: current.sort_order }).eq('id', swap.id),
      ]);

      loadCelebrities();
    } catch (error) {
      console.error('Error updating sort order:', error);
      toast.error('並び順の更新に失敗しました');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">有名選手管理</h2>
        <Button onClick={() => openEditDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          選手を追加
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">読み込み中...</div>
      ) : (
        <div className="grid gap-4">
          {celebrities.map((celebrity, index) => (
            <Card key={celebrity.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={celebrity.avatar_url || undefined} />
                      <AvatarFallback>{celebrity.display_name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl">{celebrity.display_name}</CardTitle>
                        {celebrity.featured && (
                          <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      {celebrity.home_dojo && (
                        <p className="text-sm text-muted-foreground">{celebrity.home_dojo}</p>
                      )}
                      {celebrity.titles && celebrity.titles.length > 0 && (
                        <Badge variant="secondary" className="mt-1">
                          🏆 {celebrity.titles.length} タイトル
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateSortOrder(celebrity.id, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateSortOrder(celebrity.id, 'down')}
                      disabled={index === celebrities.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    {celebrity.user_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a href={`/${celebrity.user_id}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(celebrity)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(celebrity.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {celebrity.bio && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{celebrity.bio}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCelebrity ? '選手情報を編集' : '選手を追加'}
            </DialogTitle>
            <DialogDescription>
              有名選手の情報を入力してください
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
              <Label>自己紹介（日本語）</Label>
              <Textarea
                value={formData.bio_ja}
                onChange={(e) => setFormData({ ...formData, bio_ja: e.target.value })}
                placeholder="選手の経歴や実績について..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Bio (English)</Label>
              <Textarea
                value={formData.bio_en}
                onChange={(e) => setFormData({ ...formData, bio_en: e.target.value })}
                placeholder="About the athlete..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Bio (Português)</Label>
              <Textarea
                value={formData.bio_pt}
                onChange={(e) => setFormData({ ...formData, bio_pt: e.target.value })}
                placeholder="Sobre o atleta..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Bio (Español)</Label>
              <Textarea
                value={formData.bio_es}
                onChange={(e) => setFormData({ ...formData, bio_es: e.target.value })}
                placeholder="Sobre el atleta..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Bio (Français)</Label>
              <Textarea
                value={formData.bio_fr}
                onChange={(e) => setFormData({ ...formData, bio_fr: e.target.value })}
                placeholder="À propos de l'athlète..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Bio (Deutsch)</Label>
              <Textarea
                value={formData.bio_de}
                onChange={(e) => setFormData({ ...formData, bio_de: e.target.value })}
                placeholder="Über den Athleten..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Bio (中文)</Label>
              <Textarea
                value={formData.bio_zh}
                onChange={(e) => setFormData({ ...formData, bio_zh: e.target.value })}
                placeholder="关于运动员..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Bio (한국어)</Label>
              <Textarea
                value={formData.bio_ko}
                onChange={(e) => setFormData({ ...formData, bio_ko: e.target.value })}
                placeholder="선수에 대해..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Bio (Italiano)</Label>
              <Textarea
                value={formData.bio_it}
                onChange={(e) => setFormData({ ...formData, bio_it: e.target.value })}
                placeholder="Sull'atleta..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Bio (Русский)</Label>
              <Textarea
                value={formData.bio_ru}
                onChange={(e) => setFormData({ ...formData, bio_ru: e.target.value })}
                placeholder="О спортсмене..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Bio (العربية)</Label>
              <Textarea
                value={formData.bio_ar}
                onChange={(e) => setFormData({ ...formData, bio_ar: e.target.value })}
                placeholder="عن الرياضي..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Bio (हिन्दी)</Label>
              <Textarea
                value={formData.bio_hi}
                onChange={(e) => setFormData({ ...formData, bio_hi: e.target.value })}
                placeholder="एथलीट के बारे में..."
                rows={3}
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
              <Label>所属団体</Label>
              <Select
                value={formData.organization_id}
                onValueChange={(value) => setFormData({ ...formData, organization_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="団体を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">なし</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name_ja}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="featured"
                checked={formData.featured}
                onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
              />
              <Label htmlFor="featured">注目選手として表示</Label>
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
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit">
                {editingCelebrity ? '更新' : '追加'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
