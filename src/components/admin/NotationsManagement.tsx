import { useState, useMemo } from "react";
import { 
  useNotations, 
  useCreateNotation, 
  useUpdateNotation, 
  useDeleteNotation,
  useNotationStats 
} from "@/hooks/useNotations";
import { BJJNotation, NotationCategory, NOTATION_CATEGORY_LABELS, NOTATION_CATEGORY_SHORT_LABELS } from "@/types/notation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  Video, 
  RefreshCcw,
  AlertTriangle,
  Link2,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// マッピング定義
const SERIES_TO_NOTATION: Record<string, string[]> = {
  'A': ['CG'],  // クローズドガード
  'B': ['CG'],  // クローズドガードブレイク
  'C': ['CB'],  // コンバットベース
  'D': ['MT'],  // マウント
  'E': ['GP'],  // 引き込み
  'F': ['CB'],  // コンバットベース対応
};

const CATEGORY_TO_NOTATION: Record<string, string[]> = {
  'submission': [],  // 動画名から個別判定
  'sweep': ['SW'],
  'escape': ['ESC'],
  'guard-pass': ['P'],
  'control': [],
  'guard pull': ['GP'],
};

const SUBMISSION_KEYWORDS: Record<string, string> = {
  'kimura': 'KIM',
  'armbar': 'AB',
  'arm bar': 'AB',
  'arm-bar': 'AB',
  'jujigatame': 'AB',
  '腕十字': 'AB',
  'triangle': 'TC',
  '三角絞め': 'TC',
  'cross choke': 'CC',
  '十字絞め': 'CC',
  'guillotine': 'GUI',
  'ギロチン': 'GUI',
  'omoplata': 'OMO',
  'オモプラッタ': 'OMO',
  'rear naked': 'RNC',
  '裸絞め': 'RNC',
  'americana': 'AMI',
  'アメリカーナ': 'AMI',
  'ezekiel': 'EZE',
  'エゼキエル': 'EZE',
  'lapel choke': 'LC',
  '送り襟絞め': 'LC',
  'bow and arrow': 'BNA',
  'clock choke': 'CLK',
  'baseball choke': 'BBC',
  'd\'arce': 'DAR',
  'anaconda': 'ANA',
  'heel hook': 'HH',
  'knee bar': 'KB',
  'kneebar': 'KB',
  'ankle lock': 'AL',
  'straight ankle': 'AL',
  'toe hold': 'TH',
  'calf slicer': 'CS',
};

const CATEGORIES: NotationCategory[] = [
  'position', 'action', 'submission', 'grip', 'movement', 'takedown', 'outcome'
];

interface NotationFormData {
  code: string;
  name_ja: string;
  name_en: string;
  category: NotationCategory;
  description: string;
  usage_example: string;
  display_order: number;
  is_active: boolean;
}

const defaultFormData: NotationFormData = {
  code: '',
  name_ja: '',
  name_en: '',
  category: 'position',
  description: '',
  usage_example: '',
  display_order: 0,
  is_active: true,
};

export default function NotationsManagement() {
  const [activeCategory, setActiveCategory] = useState<NotationCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNotation, setEditingNotation] = useState<BJJNotation | null>(null);
  const [formData, setFormData] = useState<NotationFormData>(defaultFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isAutoLinking, setIsAutoLinking] = useState(false);
  const [autoLinkProgress, setAutoLinkProgress] = useState({ current: 0, total: 0, linked: 0 });

  const { data: notations, isLoading, refetch } = useNotations();
  const { data: stats } = useNotationStats();
  const createMutation = useCreateNotation();
  const updateMutation = useUpdateNotation();
  const deleteMutation = useDeleteNotation();

  // 既存動画を一括紐付け
  const handleAutoLinkExistingVideos = async () => {
    if (!notations) {
      toast.error('略称データが読み込まれていません');
      return;
    }

    if (!confirm('既存の動画をシリーズ・カテゴリに基づいて略称に自動紐付けしますか？\n\n※既存の紐付けはそのまま維持されます')) {
      return;
    }

    setIsAutoLinking(true);
    setAutoLinkProgress({ current: 0, total: 0, linked: 0 });

    try {
      // 1. 全techniqueを取得
      const { data: techniques, error: techError } = await supabase
        .from('techniques')
        .select('id, name, name_ja, series_prefix, category');

      if (techError) throw techError;
      if (!techniques || techniques.length === 0) {
        toast.info('動画がありません');
        setIsAutoLinking(false);
        return;
      }

      // 2. 既存の紐付けを取得
      const { data: existingLinks, error: linkError } = await supabase
        .from('technique_notations')
        .select('technique_id, notation_id');

      if (linkError) throw linkError;

      const existingSet = new Set(
        (existingLinks || []).map(l => `${l.technique_id}_${l.notation_id}`)
      );

      // 3. 略称コードからIDへのマップを作成
      const codeToId: Record<string, string> = {};
      notations.forEach(n => {
        codeToId[n.code.toUpperCase()] = n.id;
      });

      // 4. 各動画に対して紐付けを生成
      const linksToCreate: Array<{ technique_id: string; notation_id: string; context: string }> = [];
      setAutoLinkProgress({ current: 0, total: techniques.length, linked: 0 });

      for (let i = 0; i < techniques.length; i++) {
        const tech = techniques[i];
        const notationCodes = new Set<string>();

        // シリーズから略称を取得
        if (tech.series_prefix && SERIES_TO_NOTATION[tech.series_prefix]) {
          SERIES_TO_NOTATION[tech.series_prefix].forEach(code => notationCodes.add(code));
        }

        // カテゴリから略称を取得
        if (tech.category && CATEGORY_TO_NOTATION[tech.category]) {
          CATEGORY_TO_NOTATION[tech.category].forEach(code => notationCodes.add(code));
        }

        // 動画名からサブミッション略称を判定
        const searchName = `${tech.name || ''} ${tech.name_ja || ''}`.toLowerCase();
        Object.entries(SUBMISSION_KEYWORDS).forEach(([keyword, code]) => {
          if (searchName.includes(keyword.toLowerCase())) {
            notationCodes.add(code);
          }
        });

        // 紐付けを作成
        notationCodes.forEach(code => {
          const notationId = codeToId[code.toUpperCase()];
          if (notationId && !existingSet.has(`${tech.id}_${notationId}`)) {
            linksToCreate.push({
              technique_id: tech.id,
              notation_id: notationId,
              context: 'auto-linked',
            });
          }
        });

        setAutoLinkProgress(prev => ({ ...prev, current: i + 1 }));
      }

      // 5. バッチインサート
      if (linksToCreate.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < linksToCreate.length; i += batchSize) {
          const batch = linksToCreate.slice(i, i + batchSize);
          const { error: insertError } = await supabase
            .from('technique_notations')
            .insert(batch);

          if (insertError) {
            console.error('Batch insert error:', insertError);
          }
          setAutoLinkProgress(prev => ({ ...prev, linked: Math.min(i + batchSize, linksToCreate.length) }));
        }

        toast.success(`${linksToCreate.length}件の紐付けを作成しました`);
        refetch();
      } else {
        toast.info('新規の紐付けはありませんでした');
      }
    } catch (error) {
      console.error('Auto-link error:', error);
      toast.error('紐付け処理中にエラーが発生しました');
    } finally {
      setIsAutoLinking(false);
    }
  };

  // Filter notations
  const filteredNotations = useMemo(() => {
    if (!notations) return [];
    
    return notations.filter(n => {
      const matchesCategory = activeCategory === 'all' || n.category === activeCategory;
      const matchesSearch = !search || 
        n.code.toLowerCase().includes(search.toLowerCase()) ||
        n.name_ja.includes(search) ||
        n.name_en.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [notations, activeCategory, search]);

  // Group by category for stats
  const categoryStats = useMemo(() => {
    if (!notations) return {};
    const grouped: Record<string, number> = { all: notations.length };
    notations.forEach(n => {
      grouped[n.category] = (grouped[n.category] || 0) + 1;
    });
    return grouped;
  }, [notations]);

  const openCreateDialog = () => {
    setEditingNotation(null);
    setFormData({
      ...defaultFormData,
      category: activeCategory === 'all' ? 'position' : activeCategory,
      display_order: (filteredNotations.length + 1) * 10,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (notation: BJJNotation) => {
    setEditingNotation(notation);
    setFormData({
      code: notation.code,
      name_ja: notation.name_ja,
      name_en: notation.name_en,
      category: notation.category,
      description: notation.description || '',
      usage_example: notation.usage_example || '',
      display_order: notation.display_order,
      is_active: notation.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.code || !formData.name_ja || !formData.name_en) {
      toast.error('コード、日本語名、英語名は必須です');
      return;
    }

    try {
      if (editingNotation) {
        await updateMutation.mutateAsync({
          id: editingNotation.id,
          ...formData,
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setIsDialogOpen(false);
    } catch {
      // Error handled in mutation
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      setDeleteConfirmId(null);
    } catch {
      // Error handled in mutation
    }
  };

  const getCategoryBadge = (category: NotationCategory) => {
    const label = NOTATION_CATEGORY_LABELS[category];
    return (
      <Badge className={cn(label.color, "text-white text-[10px] whitespace-nowrap px-1.5 py-0.5")}>
        {NOTATION_CATEGORY_SHORT_LABELS[category]}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header with search and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">略称マスター</h1>
          <p className="text-xs text-muted-foreground">
            BJJ略称の管理 • 合計 {notations?.length || 0} 件
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-40">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleAutoLinkExistingVideos}
            disabled={isAutoLinking}
            className="h-8"
          >
            {isAutoLinking ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Link2 className="h-3.5 w-3.5 mr-1" />
            )}
            一括紐付け
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8">
            <RefreshCcw className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" onClick={openCreateDialog} className="h-8">
            <Plus className="h-3.5 w-3.5 mr-1" />
            追加
          </Button>
        </div>
      </div>


      {/* Category filter tabs - horizontal scroll */}
      <ScrollArea className="w-full">
        <div className="flex gap-1 pb-2">
          <Button
            variant={activeCategory === 'all' ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs shrink-0"
            onClick={() => setActiveCategory('all')}
          >
            全て ({categoryStats.all || 0})
          </Button>
          {CATEGORIES.map(cat => (
            <Button
              key={cat}
              variant={activeCategory === cat ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-7 text-xs shrink-0",
                activeCategory === cat && NOTATION_CATEGORY_LABELS[cat].color
              )}
              onClick={() => setActiveCategory(cat)}
            >
              {NOTATION_CATEGORY_SHORT_LABELS[cat]} ({categoryStats[cat] || 0})
            </Button>
          ))}
        </div>
      </ScrollArea>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px] whitespace-nowrap">コード</TableHead>
                  <TableHead className="min-w-[180px]">名称</TableHead>
                  <TableHead className="w-[60px]">分類</TableHead>
                  <TableHead className="w-[50px] text-center">動画</TableHead>
                  <TableHead className="w-[50px] text-center">状態</TableHead>
                  <TableHead className="w-[70px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {search ? '検索結果がありません' : 'データがありません'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNotations.map(notation => (
                    <TableRow key={notation.id} className={cn(!notation.is_active && "opacity-50")}>
                      <TableCell className="font-mono font-bold text-primary text-sm">
                        {notation.code}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{notation.name_ja}</div>
                        <div className="text-xs text-muted-foreground">{notation.name_en}</div>
                      </TableCell>
                      <TableCell>{getCategoryBadge(notation.category)}</TableCell>
                      <TableCell className="text-center">
                        <span className="text-xs font-mono text-muted-foreground">
                          {notation.technique_count || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {notation.is_active ? (
                          <span className="text-[10px] text-green-600">●</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">○</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-0.5">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => openEditDialog(notation)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmId(notation.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingNotation ? '略称を編集' : '新規略称を追加'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>コード *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="CG, HG, TC..."
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label>カテゴリ *</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData({ ...formData, category: v as NotationCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {NOTATION_CATEGORY_SHORT_LABELS[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>日本語名 *</Label>
              <Input
                value={formData.name_ja}
                onChange={(e) => setFormData({ ...formData, name_ja: e.target.value })}
                placeholder="クローズドガード"
              />
            </div>
            <div className="space-y-2">
              <Label>英語名 *</Label>
              <Input
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                placeholder="Closed Guard"
              />
            </div>
            <div className="space-y-2">
              <Label>説明</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="詳細な説明..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>使用例</Label>
              <Input
                value={formData.usage_example}
                onChange={(e) => setFormData({ ...formData, usage_example: e.target.value })}
                placeholder="CG -> CGB -> SC"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>表示順</Label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>有効</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              キャンセル
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingNotation ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              削除の確認
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            この略称を削除してもよろしいですか？動画との関連付けも削除されます。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              キャンセル
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={deleteMutation.isPending}
            >
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
