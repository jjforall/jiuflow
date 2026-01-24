import { useState, useMemo } from "react";
import { 
  useNotations, 
  useCreateNotation, 
  useUpdateNotation, 
  useDeleteNotation,
  useNotationStats 
} from "@/hooks/useNotations";
import { BJJNotation, NotationCategory, NOTATION_CATEGORY_LABELS } from "@/types/notation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  Video, 
  BarChart3,
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
      <Badge className={cn(label.color, "text-white text-xs")}>
        {label.ja}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">略称マスター</h1>
          <p className="text-sm text-muted-foreground">
            BJJ略称の管理 • 合計 {notations?.length || 0} 件
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCcw className="h-4 w-4 mr-1" />
            更新
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-1" />
            新規追加
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {CATEGORIES.map(cat => {
          const label = NOTATION_CATEGORY_LABELS[cat];
          const total = stats?.[cat]?.total || 0;
          const linked = stats?.[cat]?.linked || 0;
          return (
            <Card 
              key={cat} 
              className={cn(
                "cursor-pointer transition-all hover:ring-2 hover:ring-primary/50",
                activeCategory === cat && "ring-2 ring-primary"
              )}
              onClick={() => setActiveCategory(cat)}
            >
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <span className={cn("w-2 h-2 rounded-full", label.color)} />
                  {label.ja}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="text-2xl font-bold">{total}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Video className="h-3 w-3" />
                  {linked} 動画
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Tabs 
          value={activeCategory} 
          onValueChange={(v) => setActiveCategory(v as NotationCategory | 'all')}
          className="flex-1"
        >
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all" className="text-xs">
              全て ({categoryStats.all || 0})
            </TabsTrigger>
            {CATEGORIES.map(cat => (
              <TabsTrigger key={cat} value={cat} className="text-xs">
                {NOTATION_CATEGORY_LABELS[cat].ja} ({categoryStats[cat] || 0})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">コード</TableHead>
                <TableHead>日本語</TableHead>
                <TableHead>English</TableHead>
                <TableHead className="w-24">カテゴリ</TableHead>
                <TableHead className="w-16 text-center">動画</TableHead>
                <TableHead className="w-16 text-center">状態</TableHead>
                <TableHead className="w-24">操作</TableHead>
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
                    <TableCell className="font-mono font-bold text-primary">
                      {notation.code}
                    </TableCell>
                    <TableCell>{notation.name_ja}</TableCell>
                    <TableCell className="text-muted-foreground">{notation.name_en}</TableCell>
                    <TableCell>{getCategoryBadge(notation.category)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono">
                        {notation.technique_count || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {notation.is_active ? (
                        <Badge variant="default" className="bg-green-500">有効</Badge>
                      ) : (
                        <Badge variant="secondary">無効</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => openEditDialog(notation)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirmId(notation.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
                        {NOTATION_CATEGORY_LABELS[cat].ja}
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
