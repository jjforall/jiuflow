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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, Trash2, Plus, ArrowUpDown, Users } from "lucide-react";
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
  mission: string | null;
  mission_ja: string | null;
  mission_pt: string | null;
  target_audience: string | null;
  target_audience_ja: string | null;
  target_audience_pt: string | null;
  features: any;
  classes: any;
  pricing: any;
  schedule: any;
  instructors: any;
  facilities: any;
  opening_hours: any;
  access_info: string | null;
  access_info_ja: string | null;
  access_info_pt: string | null;
  trial_info: any;
  faq: any;
  testimonials: any;
  gallery: any;
  news: any;
  rules: string | null;
  rules_ja: string | null;
  rules_pt: string | null;
  safety_measures: string | null;
  safety_measures_ja: string | null;
  safety_measures_pt: string | null;
  perks: any;
  media_coverage: any;
  online_resources: string | null;
  online_resources_ja: string | null;
  online_resources_pt: string | null;
  youtube: string | null;
  twitter: string | null;
  line: string | null;
  blog_url: string | null;
  location: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  phone: string | null;
  email: string | null;
  is_verified: boolean;
  created_at: string;
  member_count?: number;
}

interface DojoMember {
  id: string;
  user_dojo_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  relationship_type: string;
  joined_at: string | null;
}

export default function DojosManagement() {
  const { language } = useLanguage();
  const [dojos, setDojos] = useState<Dojo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDojo, setEditingDojo] = useState<Dojo | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sortByMembers, setSortByMembers] = useState<'asc' | 'desc' | null>(null);
  const [viewingMembers, setViewingMembers] = useState<{ dojo: Dojo; members: DojoMember[] } | null>(null);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const [formData, setFormData] = useState<any>({
    name: "",
    name_ja: "",
    name_pt: "",
    description: "",
    description_ja: "",
    description_pt: "",
    mission: "",
    mission_ja: "",
    mission_pt: "",
    target_audience: "",
    target_audience_ja: "",
    target_audience_pt: "",
    features: [],
    classes: [],
    pricing: {},
    schedule: [],
    instructors: [],
    facilities: {},
    opening_hours: {},
    access_info: "",
    access_info_ja: "",
    access_info_pt: "",
    trial_info: {},
    faq: [],
    testimonials: [],
    gallery: [],
    news: [],
    rules: "",
    rules_ja: "",
    rules_pt: "",
    safety_measures: "",
    safety_measures_ja: "",
    safety_measures_pt: "",
    perks: [],
    media_coverage: [],
    online_resources: "",
    online_resources_ja: "",
    online_resources_pt: "",
    youtube: "",
    twitter: "",
    line: "",
    blog_url: "",
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

      // 各道場の会員数を取得
      const dojosWithMemberCount = await Promise.all(
        (data || []).map(async (dojo) => {
          const { count } = await supabase
            .from('user_dojos')
            .select('*', { count: 'exact', head: true })
            .eq('dojo_id', dojo.id);

          return {
            ...dojo,
            member_count: count || 0
          };
        })
      );

      setDojos(dojosWithMemberCount);
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
      mission: dojo.mission || "",
      mission_ja: dojo.mission_ja || "",
      mission_pt: dojo.mission_pt || "",
      target_audience: dojo.target_audience || "",
      target_audience_ja: dojo.target_audience_ja || "",
      target_audience_pt: dojo.target_audience_pt || "",
      features: dojo.features || [],
      classes: dojo.classes || [],
      pricing: dojo.pricing || {},
      schedule: dojo.schedule || [],
      instructors: dojo.instructors || [],
      facilities: dojo.facilities || {},
      opening_hours: dojo.opening_hours || {},
      access_info: dojo.access_info || "",
      access_info_ja: dojo.access_info_ja || "",
      access_info_pt: dojo.access_info_pt || "",
      trial_info: dojo.trial_info || {},
      faq: dojo.faq || [],
      testimonials: dojo.testimonials || [],
      gallery: dojo.gallery || [],
      news: dojo.news || [],
      rules: dojo.rules || "",
      rules_ja: dojo.rules_ja || "",
      rules_pt: dojo.rules_pt || "",
      safety_measures: dojo.safety_measures || "",
      safety_measures_ja: dojo.safety_measures_ja || "",
      safety_measures_pt: dojo.safety_measures_pt || "",
      perks: dojo.perks || [],
      media_coverage: dojo.media_coverage || [],
      online_resources: dojo.online_resources || "",
      online_resources_ja: dojo.online_resources_ja || "",
      online_resources_pt: dojo.online_resources_pt || "",
      youtube: dojo.youtube || "",
      twitter: dojo.twitter || "",
      line: dojo.line || "",
      blog_url: dojo.blog_url || "",
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
      mission: "",
      mission_ja: "",
      mission_pt: "",
      target_audience: "",
      target_audience_ja: "",
      target_audience_pt: "",
      features: [],
      classes: [],
      pricing: {},
      schedule: [],
      instructors: [],
      facilities: {},
      opening_hours: {},
      access_info: "",
      access_info_ja: "",
      access_info_pt: "",
      trial_info: {},
      faq: [],
      testimonials: [],
      gallery: [],
      news: [],
      rules: "",
      rules_ja: "",
      rules_pt: "",
      safety_measures: "",
      safety_measures_ja: "",
      safety_measures_pt: "",
      perks: [],
      media_coverage: [],
      online_resources: "",
      online_resources_ja: "",
      online_resources_pt: "",
      youtube: "",
      twitter: "",
      line: "",
      blog_url: "",
      location: "",
      website: "",
      instagram: "",
      facebook: "",
      phone: "",
      email: "",
      is_verified: false
    });
  };

  const handleSortByMembers = () => {
    const sorted = [...dojos].sort((a, b) => {
      const countA = a.member_count || 0;
      const countB = b.member_count || 0;
      
      if (sortByMembers === 'asc') {
        return countB - countA; // 降順
      } else {
        return countA - countB; // 昇順
      }
    });
    
    setDojos(sorted);
    setSortByMembers(sortByMembers === 'asc' ? 'desc' : 'asc');
  };

  const handleViewMembers = async (dojo: Dojo) => {
    try {
      const { data, error } = await supabase
        .from('user_dojos')
        .select(`
          id,
          relationship_type,
          joined_at,
          user_id,
          profiles:user_id (
            id,
            display_name,
            email,
            avatar_url
          )
        `)
        .eq('dojo_id', dojo.id);

      if (error) throw error;

      const members: DojoMember[] = (data || []).map((item: any) => ({
        id: item.profiles?.id || '',
        user_dojo_id: item.id,
        display_name: item.profiles?.display_name,
        email: item.profiles?.email,
        avatar_url: item.profiles?.avatar_url,
        relationship_type: item.relationship_type,
        joined_at: item.joined_at
      }));

      setViewingMembers({ dojo, members });
      setIsMembersDialogOpen(true);
    } catch (error) {
      console.error('Error loading members:', error);
      toast.error(language === "ja" ? "会員リストの取得に失敗しました" : "Failed to load members");
    }
  };

  const handleUpdateMemberRole = async (userDojoId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('user_dojos')
        .update({ relationship_type: newRole })
        .eq('id', userDojoId);

      if (error) throw error;

      toast.success(language === "ja" ? "役割を更新しました" : "Role updated");
      
      // Refresh member list
      if (viewingMembers) {
        await handleViewMembers(viewingMembers.dojo);
      }
    } catch (error) {
      console.error('Error updating member role:', error);
      toast.error(language === "ja" ? "役割の更新に失敗しました" : "Failed to update role");
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'instructor':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return language === "ja" ? "道場長" : "Owner";
      case 'instructor':
        return language === "ja" ? "インストラクター" : "Instructor";
      case 'member':
        return language === "ja" ? "会員" : "Member";
      default:
        return role;
    }
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
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingDojo 
                    ? (language === "ja" ? "道場を編集" : "Edit Dojo")
                    : (language === "ja" ? "道場を追加" : "Add Dojo")
                  }
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid grid-cols-5 lg:grid-cols-9 w-full">
                    <TabsTrigger value="basic">基本</TabsTrigger>
                    <TabsTrigger value="mission">理念</TabsTrigger>
                    <TabsTrigger value="classes">クラス</TabsTrigger>
                    <TabsTrigger value="instructors">講師</TabsTrigger>
                    <TabsTrigger value="facilities">施設</TabsTrigger>
                    <TabsTrigger value="trial">体験</TabsTrigger>
                    <TabsTrigger value="faq">FAQ</TabsTrigger>
                    <TabsTrigger value="social">SNS</TabsTrigger>
                    <TabsTrigger value="other">その他</TabsTrigger>
                  </TabsList>

                  {/* Basic Info */}
                  <TabsContent value="basic" className="space-y-4 mt-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>名前 (EN)</Label>
                        <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                      </div>
                      <div>
                        <Label>名前 (JA)</Label>
                        <Input value={formData.name_ja} onChange={(e) => setFormData({ ...formData, name_ja: e.target.value })} required />
                      </div>
                      <div>
                        <Label>名前 (PT)</Label>
                        <Input value={formData.name_pt} onChange={(e) => setFormData({ ...formData, name_pt: e.target.value })} required />
                      </div>
                    </div>
                    <div><Label>説明 (EN)</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} /></div>
                    <div><Label>説明 (JA)</Label><Textarea value={formData.description_ja} onChange={(e) => setFormData({ ...formData, description_ja: e.target.value })} rows={2} /></div>
                    <div><Label>説明 (PT)</Label><Textarea value={formData.description_pt} onChange={(e) => setFormData({ ...formData, description_pt: e.target.value })} rows={2} /></div>
                    <div><Label>場所</Label><Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>電話</Label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
                      <div><Label>メール</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={formData.is_verified} onCheckedChange={(checked) => setFormData({ ...formData, is_verified: checked })} />
                      <Label>PR道場</Label>
                    </div>
                  </TabsContent>

                  {/* Mission */}
                  <TabsContent value="mission" className="space-y-4 mt-4">
                    <div><Label>理念・ミッション (EN)</Label><Textarea value={formData.mission} onChange={(e) => setFormData({ ...formData, mission: e.target.value })} rows={3} /></div>
                    <div><Label>理念・ミッション (JA)</Label><Textarea value={formData.mission_ja} onChange={(e) => setFormData({ ...formData, mission_ja: e.target.value })} rows={3} /></div>
                    <div><Label>理念・ミッション (PT)</Label><Textarea value={formData.mission_pt} onChange={(e) => setFormData({ ...formData, mission_pt: e.target.value })} rows={3} /></div>
                    <div><Label>対象者 (EN)</Label><Textarea value={formData.target_audience} onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })} rows={2} /></div>
                    <div><Label>対象者 (JA)</Label><Textarea value={formData.target_audience_ja} onChange={(e) => setFormData({ ...formData, target_audience_ja: e.target.value })} rows={2} /></div>
                    <div><Label>対象者 (PT)</Label><Textarea value={formData.target_audience_pt} onChange={(e) => setFormData({ ...formData, target_audience_pt: e.target.value })} rows={2} /></div>
                    <div><Label>特徴 (JSON配列)</Label><Textarea value={JSON.stringify(formData.features, null, 2)} onChange={(e) => { try { setFormData({ ...formData, features: JSON.parse(e.target.value) }); } catch {} }} rows={4} placeholder='["少人数制", "清潔な施設"]' /></div>
                  </TabsContent>

                  {/* Classes */}
                  <TabsContent value="classes" className="space-y-4 mt-4">
                    <div><Label>クラス情報 (JSON配列)</Label><Textarea value={JSON.stringify(formData.classes, null, 2)} onChange={(e) => { try { setFormData({ ...formData, classes: JSON.parse(e.target.value) }); } catch {} }} rows={6} placeholder='[{"name":"初心者クラス","time":"19:00-20:30","level":"初級"}]' /></div>
                    <div><Label>料金体系 (JSON)</Label><Textarea value={JSON.stringify(formData.pricing, null, 2)} onChange={(e) => { try { setFormData({ ...formData, pricing: JSON.parse(e.target.value) }); } catch {} }} rows={6} placeholder='{"入会金": 10000, "月会費": 12000}' /></div>
                    <div><Label>スケジュール (JSON配列)</Label><Textarea value={JSON.stringify(formData.schedule, null, 2)} onChange={(e) => { try { setFormData({ ...formData, schedule: JSON.parse(e.target.value) }); } catch {} }} rows={6} placeholder='[{"day":"月","time":"19:00-20:30","class":"基礎"}]' /></div>
                  </TabsContent>

                  {/* Instructors */}
                  <TabsContent value="instructors" className="space-y-4 mt-4">
                    <div><Label>講師情報 (JSON配列)</Label><Textarea value={JSON.stringify(formData.instructors, null, 2)} onChange={(e) => { try { setFormData({ ...formData, instructors: JSON.parse(e.target.value) }); } catch {} }} rows={8} placeholder='[{"name":"田中太郎","bio":"黒帯","photo_url":""}]' /></div>
                  </TabsContent>

                  {/* Facilities */}
                  <TabsContent value="facilities" className="space-y-4 mt-4">
                    <div><Label>施設情報 (JSON)</Label><Textarea value={JSON.stringify(formData.facilities, null, 2)} onChange={(e) => { try { setFormData({ ...formData, facilities: JSON.parse(e.target.value) }); } catch {} }} rows={6} placeholder='{"更衣室":"男女別","シャワー":"有","駐車場":"有"}' /></div>
                    <div><Label>営業時間 (JSON)</Label><Textarea value={JSON.stringify(formData.opening_hours, null, 2)} onChange={(e) => { try { setFormData({ ...formData, opening_hours: JSON.parse(e.target.value) }); } catch {} }} rows={4} placeholder='{"月":"10:00-22:00","火":"10:00-22:00"}' /></div>
                    <div><Label>アクセス情報 (EN)</Label><Textarea value={formData.access_info} onChange={(e) => setFormData({ ...formData, access_info: e.target.value })} rows={2} /></div>
                    <div><Label>アクセス情報 (JA)</Label><Textarea value={formData.access_info_ja} onChange={(e) => setFormData({ ...formData, access_info_ja: e.target.value })} rows={2} /></div>
                    <div><Label>アクセス情報 (PT)</Label><Textarea value={formData.access_info_pt} onChange={(e) => setFormData({ ...formData, access_info_pt: e.target.value })} rows={2} /></div>
                  </TabsContent>

                  {/* Trial */}
                  <TabsContent value="trial" className="space-y-4 mt-4">
                    <div><Label>体験案内 (JSON)</Label><Textarea value={JSON.stringify(formData.trial_info, null, 2)} onChange={(e) => { try { setFormData({ ...formData, trial_info: JSON.parse(e.target.value) }); } catch {} }} rows={6} placeholder='{"price":0,"duration":"60分","required":"動きやすい服装"}' /></div>
                  </TabsContent>

                  {/* FAQ */}
                  <TabsContent value="faq" className="space-y-4 mt-4">
                    <div><Label>FAQ (JSON配列)</Label><Textarea value={JSON.stringify(formData.faq, null, 2)} onChange={(e) => { try { setFormData({ ...formData, faq: JSON.parse(e.target.value) }); } catch {} }} rows={8} placeholder='[{"q":"初心者でも大丈夫？","a":"はい、大丈夫です"}]' /></div>
                    <div><Label>会員の声 (JSON配列)</Label><Textarea value={JSON.stringify(formData.testimonials, null, 2)} onChange={(e) => { try { setFormData({ ...formData, testimonials: JSON.parse(e.target.value) }); } catch {} }} rows={6} placeholder='[{"name":"山田太郎","text":"とても良い"}]' /></div>
                    <div><Label>ギャラリー (JSON配列)</Label><Textarea value={JSON.stringify(formData.gallery, null, 2)} onChange={(e) => { try { setFormData({ ...formData, gallery: JSON.parse(e.target.value) }); } catch {} }} rows={4} placeholder='[{"url":"","caption":"練習風景"}]' /></div>
                  </TabsContent>

                  {/* Social */}
                  <TabsContent value="social" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Website</Label><Input type="url" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} /></div>
                      <div><Label>Instagram</Label><Input value={formData.instagram} onChange={(e) => setFormData({ ...formData, instagram: e.target.value })} placeholder="username" /></div>
                      <div><Label>Facebook</Label><Input value={formData.facebook} onChange={(e) => setFormData({ ...formData, facebook: e.target.value })} /></div>
                      <div><Label>YouTube</Label><Input value={formData.youtube} onChange={(e) => setFormData({ ...formData, youtube: e.target.value })} /></div>
                      <div><Label>Twitter/X</Label><Input value={formData.twitter} onChange={(e) => setFormData({ ...formData, twitter: e.target.value })} /></div>
                      <div><Label>LINE</Label><Input value={formData.line} onChange={(e) => setFormData({ ...formData, line: e.target.value })} /></div>
                    </div>
                    <div><Label>ブログURL</Label><Input type="url" value={formData.blog_url} onChange={(e) => setFormData({ ...formData, blog_url: e.target.value })} /></div>
                  </TabsContent>

                  {/* Other */}
                  <TabsContent value="other" className="space-y-4 mt-4">
                    <div><Label>お知らせ (JSON配列)</Label><Textarea value={JSON.stringify(formData.news, null, 2)} onChange={(e) => { try { setFormData({ ...formData, news: JSON.parse(e.target.value) }); } catch {} }} rows={6} placeholder='[{"title":"新クラス開設","date":"2024-01-01","content":"..."}]' /></div>
                    <div><Label>規約 (EN)</Label><Textarea value={formData.rules} onChange={(e) => setFormData({ ...formData, rules: e.target.value })} rows={3} /></div>
                    <div><Label>規約 (JA)</Label><Textarea value={formData.rules_ja} onChange={(e) => setFormData({ ...formData, rules_ja: e.target.value })} rows={3} /></div>
                    <div><Label>規約 (PT)</Label><Textarea value={formData.rules_pt} onChange={(e) => setFormData({ ...formData, rules_pt: e.target.value })} rows={3} /></div>
                    <div><Label>安全対策 (EN)</Label><Textarea value={formData.safety_measures} onChange={(e) => setFormData({ ...formData, safety_measures: e.target.value })} rows={3} /></div>
                    <div><Label>安全対策 (JA)</Label><Textarea value={formData.safety_measures_ja} onChange={(e) => setFormData({ ...formData, safety_measures_ja: e.target.value })} rows={3} /></div>
                    <div><Label>安全対策 (PT)</Label><Textarea value={formData.safety_measures_pt} onChange={(e) => setFormData({ ...formData, safety_measures_pt: e.target.value })} rows={3} /></div>
                    <div><Label>会員特典 (JSON配列)</Label><Textarea value={JSON.stringify(formData.perks, null, 2)} onChange={(e) => { try { setFormData({ ...formData, perks: JSON.parse(e.target.value) }); } catch {} }} rows={4} placeholder='["家族割引", "紹介制度"]' /></div>
                    <div><Label>メディア掲載 (JSON配列)</Label><Textarea value={JSON.stringify(formData.media_coverage, null, 2)} onChange={(e) => { try { setFormData({ ...formData, media_coverage: JSON.parse(e.target.value) }); } catch {} }} rows={4} placeholder='[{"media":"新聞","date":"2024-01-01"}]' /></div>
                    <div><Label>オンライン教材 (EN)</Label><Textarea value={formData.online_resources} onChange={(e) => setFormData({ ...formData, online_resources: e.target.value })} rows={2} /></div>
                    <div><Label>オンライン教材 (JA)</Label><Textarea value={formData.online_resources_ja} onChange={(e) => setFormData({ ...formData, online_resources_ja: e.target.value })} rows={2} /></div>
                    <div><Label>オンライン教材 (PT)</Label><Textarea value={formData.online_resources_pt} onChange={(e) => setFormData({ ...formData, online_resources_pt: e.target.value })} rows={2} /></div>
                  </TabsContent>
                </Tabs>

                <div className="flex gap-2 justify-end pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>キャンセル</Button>
                  <Button type="submit">保存</Button>
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
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSortByMembers}
                    className="flex items-center gap-1 -ml-3"
                  >
                    {language === "ja" ? "会員数" : "Members"}
                    <ArrowUpDown className="w-3 h-3" />
                  </Button>
                </TableHead>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewMembers(dojo)}
                      className="flex items-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      <Badge variant="outline">
                        {dojo.member_count || 0}人
                      </Badge>
                    </Button>
                  </TableCell>
                  <TableCell>
                    {dojo.is_verified && (
                      <Badge variant="secondary">
                        PR
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

      {/* Members List Dialog */}
      <Dialog open={isMembersDialogOpen} onOpenChange={setIsMembersDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewingMembers?.dojo.name_ja || viewingMembers?.dojo.name} - 会員リスト
            </DialogTitle>
          </DialogHeader>
          {viewingMembers && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                総会員数: {viewingMembers.members.length}人
              </p>
              {viewingMembers.members.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  この道場にはまだ会員がいません
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名前</TableHead>
                      <TableHead>メールアドレス</TableHead>
                      <TableHead>役割</TableHead>
                      <TableHead>参加日</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingMembers.members.map((member) => (
                      <TableRow key={member.user_dojo_id}>
                        <TableCell className="font-medium">
                          {member.display_name || member.email || '名前なし'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {member.email || '-'}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={member.relationship_type}
                            onValueChange={(value) => handleUpdateMemberRole(member.user_dojo_id, value)}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue>
                                <Badge variant={getRoleBadgeVariant(member.relationship_type)}>
                                  {getRoleLabel(member.relationship_type)}
                                </Badge>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">会員</Badge>
                                </div>
                              </SelectItem>
                              <SelectItem value="instructor">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">インストラクター</Badge>
                                </div>
                              </SelectItem>
                              <SelectItem value="owner">
                                <div className="flex items-center gap-2">
                                  <Badge variant="default">道場長</Badge>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm">
                          {member.joined_at 
                            ? new Date(member.joined_at).toLocaleDateString('ja-JP')
                            : '-'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
