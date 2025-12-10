import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Pencil, Trash2, Trophy, ArrowLeft } from "lucide-react";

interface TournamentResult {
  id: string;
  tournament_id: string;
  weight_class: string;
  position: number;
  athlete_name: string;
  athlete_name_ja: string | null;
  team_name: string | null;
  team_name_ja: string | null;
  notes: string | null;
  notes_ja: string | null;
  user_id: string | null;
  celebrity_id: string | null;
}

interface Tournament {
  id: string;
  name: string;
  name_ja: string | null;
  weight_classes: string[] | null;
}

interface Props {
  tournament: Tournament;
  onBack: () => void;
}

const emptyResult = {
  weight_class: '',
  position: 1,
  athlete_name: '',
  athlete_name_ja: '',
  team_name: '',
  team_name_ja: '',
  notes: '',
  notes_ja: '',
  user_id: null as string | null,
  celebrity_id: null as string | null,
};

const WEIGHT_CLASSES = [
  "ルースター級 (57.5kg以下)",
  "ライトフェザー級 (64kg以下)",
  "フェザー級 (70kg以下)",
  "ライト級 (76kg以下)",
  "ミドル級 (82.3kg以下)",
  "ミディアムヘビー級 (88.3kg以下)",
  "ヘビー級 (94.3kg以下)",
  "スーパーヘビー級 (100.5kg以下)",
  "ウルトラヘビー級 (100.5kg超)",
  "オープンクラス",
  "アブソルート",
];

export function TournamentResultsManagement({ tournament, onBack }: Props) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingResult, setEditingResult] = useState<TournamentResult | null>(null);
  const [formData, setFormData] = useState(emptyResult);

  const { data: results, isLoading } = useQuery({
    queryKey: ['admin-tournament-results', tournament.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournament_results')
        .select('*')
        .eq('tournament_id', tournament.id)
        .order('weight_class')
        .order('position');
      if (error) throw error;
      return data as TournamentResult[];
    }
  });

  const { data: celebrities } = useQuery({
    queryKey: ['admin-celebrities-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('celebrities')
        .select('id, display_name')
        .order('display_name');
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof emptyResult) => {
      const { error } = await supabase.from('tournament_results').insert({
        ...data,
        tournament_id: tournament.id,
        athlete_name_ja: data.athlete_name_ja || null,
        team_name: data.team_name || null,
        team_name_ja: data.team_name_ja || null,
        notes: data.notes || null,
        notes_ja: data.notes_ja || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tournament-results', tournament.id] });
      toast.success('結果を追加しました');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('エラーが発生しました: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof emptyResult }) => {
      const { error } = await supabase.from('tournament_results').update({
        ...data,
        athlete_name_ja: data.athlete_name_ja || null,
        team_name: data.team_name || null,
        team_name_ja: data.team_name_ja || null,
        notes: data.notes || null,
        notes_ja: data.notes_ja || null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tournament-results', tournament.id] });
      toast.success('結果を更新しました');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('エラーが発生しました: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tournament_results').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tournament-results', tournament.id] });
      toast.success('結果を削除しました');
    },
    onError: (error) => {
      toast.error('エラーが発生しました: ' + error.message);
    }
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingResult(null);
    setFormData(emptyResult);
  };

  const handleOpenCreate = () => {
    setFormData(emptyResult);
    setEditingResult(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (result: TournamentResult) => {
    setEditingResult(result);
    setFormData({
      weight_class: result.weight_class,
      position: result.position,
      athlete_name: result.athlete_name,
      athlete_name_ja: result.athlete_name_ja || '',
      team_name: result.team_name || '',
      team_name_ja: result.team_name_ja || '',
      notes: result.notes || '',
      notes_ja: result.notes_ja || '',
      user_id: result.user_id,
      celebrity_id: result.celebrity_id,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.weight_class || !formData.athlete_name) {
      toast.error('階級と選手名は必須です');
      return;
    }

    if (editingResult) {
      updateMutation.mutate({ id: editingResult.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getPositionBadge = (position: number) => {
    switch (position) {
      case 1:
        return <Badge className="bg-yellow-500">🥇 優勝</Badge>;
      case 2:
        return <Badge variant="secondary">🥈 準優勝</Badge>;
      case 3:
        return <Badge variant="outline">🥉 3位</Badge>;
      default:
        return <Badge variant="outline">{position}位</Badge>;
    }
  };

  // Get weight classes from tournament or use default
  const weightClasses = tournament.weight_classes?.length 
    ? tournament.weight_classes 
    : WEIGHT_CLASSES;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            {tournament.name_ja || tournament.name}
          </h2>
          <p className="text-muted-foreground">大会結果の管理</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          結果を追加
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : results && results.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>階級</TableHead>
                <TableHead>順位</TableHead>
                <TableHead>選手名</TableHead>
                <TableHead>所属</TableHead>
                <TableHead className="w-[100px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <TableRow key={result.id}>
                  <TableCell className="font-medium">{result.weight_class}</TableCell>
                  <TableCell>{getPositionBadge(result.position)}</TableCell>
                  <TableCell>
                    <div>
                      <p>{result.athlete_name_ja || result.athlete_name}</p>
                      {result.athlete_name_ja && (
                        <p className="text-xs text-muted-foreground">{result.athlete_name}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {result.team_name_ja || result.team_name || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(result)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('この結果を削除しますか？')) {
                            deleteMutation.mutate(result.id);
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
      ) : (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">まだ結果が登録されていません</p>
          <Button onClick={handleOpenCreate} className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            最初の結果を追加
          </Button>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingResult ? '結果を編集' : '結果を追加'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>階級 *</Label>
                <Select
                  value={formData.weight_class}
                  onValueChange={(value) => setFormData({ ...formData, weight_class: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="階級を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {weightClasses.map((wc) => (
                      <SelectItem key={wc} value={wc}>{wc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>順位 *</Label>
                <Select
                  value={formData.position.toString()}
                  onValueChange={(value) => setFormData({ ...formData, position: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">🥇 優勝</SelectItem>
                    <SelectItem value="2">🥈 準優勝</SelectItem>
                    <SelectItem value="3">🥉 3位</SelectItem>
                    <SelectItem value="4">4位</SelectItem>
                    <SelectItem value="5">5位</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>選手名 (英語) *</Label>
                <Input
                  value={formData.athlete_name}
                  onChange={(e) => setFormData({ ...formData, athlete_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>選手名 (日本語)</Label>
                <Input
                  value={formData.athlete_name_ja}
                  onChange={(e) => setFormData({ ...formData, athlete_name_ja: e.target.value })}
                  placeholder="山田太郎"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>所属 (英語)</Label>
                <Input
                  value={formData.team_name}
                  onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
                  placeholder="Team ABC"
                />
              </div>
              <div className="space-y-2">
                <Label>所属 (日本語)</Label>
                <Input
                  value={formData.team_name_ja}
                  onChange={(e) => setFormData({ ...formData, team_name_ja: e.target.value })}
                  placeholder="チームABC"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>セレブリティとリンク（任意）</Label>
              <Select
                value={formData.celebrity_id || 'none'}
                onValueChange={(value) => setFormData({ ...formData, celebrity_id: value === 'none' ? null : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選手を選択（任意）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">リンクなし</SelectItem>
                  {celebrities?.map((celeb) => (
                    <SelectItem key={celeb.id} value={celeb.id}>{celeb.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {editingResult ? '更新' : '追加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
