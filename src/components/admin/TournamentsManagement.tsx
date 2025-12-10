import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Calendar, Trophy } from "lucide-react";
import { format, parseISO } from "date-fns";
import { TournamentResultsManagement } from "./TournamentResultsManagement";

interface Tournament {
  id: string;
  name: string;
  name_ja: string | null;
  date_start: string;
  date_end: string | null;
  location: string;
  location_ja: string | null;
  venue: string | null;
  venue_ja: string | null;
  organizer: string;
  country: string | null;
  is_international: boolean | null;
  category: string | null;
  notes: string | null;
  notes_ja: string | null;
  registration_url: string | null;
  slug: string | null;
}

const emptyTournament: Omit<Tournament, 'id'> = {
  name: '',
  name_ja: '',
  date_start: '',
  date_end: null,
  location: '',
  location_ja: '',
  venue: '',
  venue_ja: '',
  organizer: '',
  country: 'JP',
  is_international: false,
  category: 'domestic',
  notes: '',
  notes_ja: '',
  registration_url: '',
  slug: '',
};

export function TournamentsManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [formData, setFormData] = useState<Omit<Tournament, 'id'>>(emptyTournament);
  const [managingResultsFor, setManagingResultsFor] = useState<Tournament | null>(null);

  const { data: tournaments, isLoading } = useQuery({
    queryKey: ['admin-tournaments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*, weight_classes')
        .order('date_start', { ascending: false });
      if (error) throw error;
      return data as (Tournament & { weight_classes: string[] | null })[];
    }
  });

  // If managing results, show that component
  if (managingResultsFor) {
    return (
      <TournamentResultsManagement 
        tournament={managingResultsFor as Tournament & { weight_classes: string[] | null }}
        onBack={() => setManagingResultsFor(null)}
      />
    );
  }

  const createMutation = useMutation({
    mutationFn: async (data: Omit<Tournament, 'id'>) => {
      const { error } = await supabase.from('tournaments').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tournaments'] });
      toast.success('大会を作成しました');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('エラーが発生しました: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Omit<Tournament, 'id'> }) => {
      const { error } = await supabase.from('tournaments').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tournaments'] });
      toast.success('大会を更新しました');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('エラーが発生しました: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tournaments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tournaments'] });
      toast.success('大会を削除しました');
    },
    onError: (error) => {
      toast.error('エラーが発生しました: ' + error.message);
    }
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTournament(null);
    setFormData(emptyTournament);
  };

  const handleOpenCreate = () => {
    setFormData(emptyTournament);
    setEditingTournament(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (tournament: Tournament) => {
    setEditingTournament(tournament);
    setFormData({
      name: tournament.name,
      name_ja: tournament.name_ja || '',
      date_start: tournament.date_start,
      date_end: tournament.date_end,
      location: tournament.location,
      location_ja: tournament.location_ja || '',
      venue: tournament.venue || '',
      venue_ja: tournament.venue_ja || '',
      organizer: tournament.organizer,
      country: tournament.country || 'JP',
      is_international: tournament.is_international || false,
      category: tournament.category || 'domestic',
      notes: tournament.notes || '',
      notes_ja: tournament.notes_ja || '',
      registration_url: tournament.registration_url || '',
      slug: tournament.slug || '',
    });
    setIsDialogOpen(true);
  };

  const generateSlug = (name: string, dateStart: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    const year = dateStart ? new Date(dateStart).getFullYear() : new Date().getFullYear();
    return `${slug}-${year}`;
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.date_start || !formData.location || !formData.organizer) {
      toast.error('必須項目を入力してください');
      return;
    }

    // Auto-generate slug if empty
    const slug = formData.slug || generateSlug(formData.name, formData.date_start);

    const submitData = {
      ...formData,
      slug,
      date_end: formData.date_end || null,
      name_ja: formData.name_ja || null,
      location_ja: formData.location_ja || null,
      venue: formData.venue || null,
      venue_ja: formData.venue_ja || null,
      notes: formData.notes || null,
      notes_ja: formData.notes_ja || null,
      registration_url: formData.registration_url || null,
    };

    if (editingTournament) {
      updateMutation.mutate({ id: editingTournament.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const filteredTournaments = tournaments?.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.name_ja?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.organizer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryBadge = (category: string | null) => {
    if (category === 'major' || category === 'international') {
      return <Badge className="bg-amber-500">主要</Badge>;
    }
    return <Badge variant="outline">国内</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">大会管理</h2>
          <p className="text-muted-foreground">大会スケジュールの管理</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          新規作成
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="大会名・主催者で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary">{filteredTournaments?.length || 0} 件</Badge>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>大会名</TableHead>
                <TableHead>日程</TableHead>
                <TableHead>主催</TableHead>
                <TableHead>開催地</TableHead>
                <TableHead>カテゴリ</TableHead>
                <TableHead className="w-[100px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTournaments?.map((tournament) => (
                <TableRow key={tournament.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{tournament.name_ja || tournament.name}</p>
                      {tournament.name_ja && (
                        <p className="text-xs text-muted-foreground">{tournament.name}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3" />
                      {format(parseISO(tournament.date_start), 'yyyy/MM/dd')}
                      {tournament.date_end && tournament.date_end !== tournament.date_start && (
                        <span> - {format(parseISO(tournament.date_end), 'MM/dd')}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{tournament.organizer}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {tournament.location_ja || tournament.location}
                  </TableCell>
                  <TableCell>
                    {getCategoryBadge(tournament.category)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setManagingResultsFor(tournament as Tournament & { weight_classes: string[] | null })}
                        title="結果を管理"
                      >
                        <Trophy className="h-4 w-4 text-yellow-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(tournament)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('この大会を削除しますか？')) {
                            deleteMutation.mutate(tournament.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTournament ? '大会を編集' : '新規大会を作成'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>大会名 (英語) *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="World Championship 2025"
                />
              </div>
              <div className="space-y-2">
                <Label>大会名 (日本語)</Label>
                <Input
                  value={formData.name_ja || ''}
                  onChange={(e) => setFormData({ ...formData, name_ja: e.target.value })}
                  placeholder="世界選手権 2025"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>開始日 *</Label>
                <Input
                  type="date"
                  value={formData.date_start}
                  onChange={(e) => setFormData({ ...formData, date_start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>終了日</Label>
                <Input
                  type="date"
                  value={formData.date_end || ''}
                  onChange={(e) => setFormData({ ...formData, date_end: e.target.value || null })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>主催者 *</Label>
                <Select
                  value={formData.organizer}
                  onValueChange={(value) => setFormData({ ...formData, organizer: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="主催者を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IBJJF">IBJJF</SelectItem>
                    <SelectItem value="AJP">AJP</SelectItem>
                    <SelectItem value="ADCC">ADCC</SelectItem>
                    <SelectItem value="JBJJF">JBJJF</SelectItem>
                    <SelectItem value="ASJJF">ASJJF</SelectItem>
                    <SelectItem value="SJJIF">SJJIF</SelectItem>
                    <SelectItem value="JJIF">JJIF</SelectItem>
                    <SelectItem value="PBJJF">PBJJF</SelectItem>
                    <SelectItem value="Other">その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>カテゴリ</Label>
                <Select
                  value={formData.category || 'domestic'}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="major">主要大会</SelectItem>
                    <SelectItem value="international">国際大会</SelectItem>
                    <SelectItem value="domestic">国内大会</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>開催地 (英語) *</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Tokyo, Japan"
                />
              </div>
              <div className="space-y-2">
                <Label>開催地 (日本語)</Label>
                <Input
                  value={formData.location_ja || ''}
                  onChange={(e) => setFormData({ ...formData, location_ja: e.target.value })}
                  placeholder="東京"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>会場 (英語)</Label>
                <Input
                  value={formData.venue || ''}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  placeholder="Tokyo Dome"
                />
              </div>
              <div className="space-y-2">
                <Label>会場 (日本語)</Label>
                <Input
                  value={formData.venue_ja || ''}
                  onChange={(e) => setFormData({ ...formData, venue_ja: e.target.value })}
                  placeholder="東京ドーム"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>国コード</Label>
                <Select
                  value={formData.country || 'JP'}
                  onValueChange={(value) => setFormData({ ...formData, country: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JP">🇯🇵 日本</SelectItem>
                    <SelectItem value="US">🇺🇸 アメリカ</SelectItem>
                    <SelectItem value="BR">🇧🇷 ブラジル</SelectItem>
                    <SelectItem value="AE">🇦🇪 UAE</SelectItem>
                    <SelectItem value="PT">🇵🇹 ポルトガル</SelectItem>
                    <SelectItem value="IT">🇮🇹 イタリア</SelectItem>
                    <SelectItem value="GB">🇬🇧 イギリス</SelectItem>
                    <SelectItem value="PL">🇵🇱 ポーランド</SelectItem>
                    <SelectItem value="TH">🇹🇭 タイ</SelectItem>
                    <SelectItem value="CN">🇨🇳 中国</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex items-center gap-3 pt-6">
                <Switch
                  checked={formData.is_international || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_international: checked })}
                />
                <Label>国際大会</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>スラッグ (URL用)</Label>
              <Input
                value={formData.slug || ''}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                placeholder="world-championship-2025 (空欄時は自動生成)"
              />
              <p className="text-xs text-muted-foreground">
                URL: /tournaments/{formData.date_start ? new Date(formData.date_start).getFullYear() : '年'}/{formData.slug || '自動生成'}
              </p>
            </div>

            <div className="space-y-2">
              <Label>登録URL</Label>
              <Input
                type="url"
                value={formData.registration_url || ''}
                onChange={(e) => setFormData({ ...formData, registration_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>備考 (英語)</Label>
                <Textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>備考 (日本語)</Label>
                <Textarea
                  value={formData.notes_ja || ''}
                  onChange={(e) => setFormData({ ...formData, notes_ja: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              キャンセル
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingTournament ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
