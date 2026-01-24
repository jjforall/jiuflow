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
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  Video, 
  RefreshCcw,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

  const { data: notations, isLoading, refetch } = useNotations();
  const { data: stats } = useNotationStats();
  const createMutation = useCreateNotation();
  const updateMutation = useUpdateNotation();
  const deleteMutation = useDeleteNotation();

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
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8">
            <RefreshCcw className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" onClick={openCreateDialog} className="h-8">
            <Plus className="h-3.5 w-3.5 mr-1" />
            追加
          </Button>
        </div>
      </div>

      {/* Stats Cards - Compact 2 rows on mobile, horizontal scroll on larger */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {CATEGORIES.map(cat => {
            const label = NOTATION_CATEGORY_LABELS[cat];
            const total = stats?.[cat]?.total || 0;
            const linked = stats?.[cat]?.linked || 0;
            return (
              <Card 
                key={cat} 
                className={cn(
                  "cursor-pointer transition-all hover:ring-1 hover:ring-primary/50 shrink-0 w-[100px]",
                  activeCategory === cat && "ring-2 ring-primary bg-primary/5"
                )}
                onClick={() => setActiveCategory(activeCategory === cat ? 'all' : cat)}
              >
                <CardContent className="p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={cn("w-2 h-2 rounded-full shrink-0", label.color)} />
                    <span className="text-[10px] font-medium text-muted-foreground truncate">
                      {NOTATION_CATEGORY_SHORT_LABELS[cat]}
                    </span>
                  </div>
                  <div className="text-lg font-bold leading-none">{total}</div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                    <Video className="h-2.5 w-2.5" />
                    {linked}動画
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

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
                  <TableHead className="min-w-[120px] max-w-[180px]">日本語</TableHead>
                  <TableHead className="min-w-[120px] max-w-[180px]">English</TableHead>
                  <TableHead className="w-[60px]">分類</TableHead>
                  <TableHead className="w-[50px] text-center">動画</TableHead>
                  <TableHead className="w-[50px] text-center">状態</TableHead>
                  <TableHead className="w-[70px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {search ? '検索結果がありません' : 'データがありません'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNotations.map(notation => (
                    <TableRow key={notation.id} className={cn(!notation.is_active && "opacity-50")}>
                      <TableCell className="font-mono font-bold text-primary text-sm">
                        {notation.code}
                      </TableCell>
                      <TableCell className="text-sm truncate max-w-[180px]" title={notation.name_ja}>
                        {notation.name_ja}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[180px]" title={notation.name_en}>
                        {notation.name_en}
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
