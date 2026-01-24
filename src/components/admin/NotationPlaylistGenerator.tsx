import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Tag, ListPlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotations } from "@/hooks/useNotations";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NOTATION_CATEGORY_LABELS, NOTATION_CATEGORY_SHORT_LABELS, type NotationCategory } from "@/types/notation";

interface NotationPlaylistGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  existingTechniqueIds: string[];
  onVideosAdded: () => void;
}

interface MatchedTechnique {
  id: string;
  name: string;
  name_ja: string;
  series_prefix: string | null;
  series_order: number | null;
  thumbnail_url: string | null;
}

export function NotationPlaylistGenerator({
  open,
  onOpenChange,
  listId,
  existingTechniqueIds,
  onVideosAdded,
}: NotationPlaylistGeneratorProps) {
  const [selectedNotations, setSelectedNotations] = useState<string[]>([]);
  const [matchedTechniques, setMatchedTechniques] = useState<MatchedTechnique[]>([]);
  const [selectedTechniques, setSelectedTechniques] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const { data: allNotations, isLoading } = useNotations();

  // Group notations by category
  const groupedNotations = (allNotations || []).reduce((acc, n) => {
    if (!n.is_active) return acc;
    if (!acc[n.category]) acc[n.category] = [];
    acc[n.category].push(n);
    return acc;
  }, {} as Record<NotationCategory, NonNullable<typeof allNotations>>);

  const toggleNotation = (notationId: string) => {
    setSelectedNotations(prev =>
      prev.includes(notationId)
        ? prev.filter(id => id !== notationId)
        : [...prev, notationId]
    );
    // Clear search results when selection changes
    setMatchedTechniques([]);
    setSelectedTechniques(new Set());
  };

  const handleSearch = async () => {
    if (selectedNotations.length === 0) {
      toast.error("略称を1つ以上選択してください");
      return;
    }

    setIsSearching(true);
    try {
      // Get technique IDs that have ALL selected notations
      const { data: links, error: linksError } = await supabase
        .from("technique_notations")
        .select("technique_id, notation_id")
        .in("notation_id", selectedNotations);

      if (linksError) throw linksError;

      // Count how many selected notations each technique has
      const techCounts: Record<string, number> = {};
      links?.forEach(link => {
        techCounts[link.technique_id] = (techCounts[link.technique_id] || 0) + 1;
      });

      // Filter techniques that have at least one of the selected notations
      // (change to `=== selectedNotations.length` for AND logic)
      const matchingIds = Object.entries(techCounts)
        .filter(([_, count]) => count >= 1)
        .map(([id]) => id)
        .filter(id => !existingTechniqueIds.includes(id));

      if (matchingIds.length === 0) {
        setMatchedTechniques([]);
        toast.info("条件に一致する動画がありません");
        return;
      }

      // Fetch technique details
      const { data: techniques, error: techError } = await supabase
        .from("techniques")
        .select("id, name, name_ja, series_prefix, series_order, thumbnail_url")
        .in("id", matchingIds)
        .order("series_prefix", { ascending: true })
        .order("series_order", { ascending: true });

      if (techError) throw techError;

      setMatchedTechniques(techniques || []);
      setSelectedTechniques(new Set(techniques?.map(t => t.id) || []));
    } catch (error) {
      console.error("Search error:", error);
      toast.error("検索に失敗しました");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddToList = async () => {
    if (selectedTechniques.size === 0) {
      toast.error("動画を選択してください");
      return;
    }

    setIsAdding(true);
    try {
      // Get current max display_order
      const { data: existingItems } = await supabase
        .from("video_list_items")
        .select("display_order")
        .eq("list_id", listId)
        .order("display_order", { ascending: false })
        .limit(1);

      let nextOrder = (existingItems?.[0]?.display_order || 0) + 1;

      // Insert items
      const itemsToInsert = Array.from(selectedTechniques).map(techniqueId => ({
        list_id: listId,
        technique_id: techniqueId,
        display_order: nextOrder++,
      }));

      const { error } = await supabase
        .from("video_list_items")
        .insert(itemsToInsert);

      if (error) throw error;

      toast.success(`${selectedTechniques.size}件の動画を追加しました`);
      onVideosAdded();
      onOpenChange(false);
      
      // Reset state
      setSelectedNotations([]);
      setMatchedTechniques([]);
      setSelectedTechniques(new Set());
    } catch (error) {
      console.error("Add error:", error);
      toast.error("追加に失敗しました");
    } finally {
      setIsAdding(false);
    }
  };

  const toggleTechnique = (id: string) => {
    setSelectedTechniques(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedTechniques(new Set(matchedTechniques.map(t => t.id)));
  };

  const selectNone = () => {
    setSelectedTechniques(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            略称から動画を追加
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 space-y-4">
          {/* Notation selection */}
          <div className="space-y-2">
            <div className="text-sm font-medium">略称を選択（OR条件）</div>
            <ScrollArea className="h-[180px] border rounded-lg p-3">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(groupedNotations).map(([category, notations]) => (
                    <div key={category}>
                      <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                        <span className={cn("w-2 h-2 rounded-full", NOTATION_CATEGORY_LABELS[category as NotationCategory]?.color)} />
                        {NOTATION_CATEGORY_SHORT_LABELS[category as NotationCategory]}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(notations || []).map(n => (
                          <Badge
                            key={n.id}
                            variant={selectedNotations.includes(n.id) ? "default" : "outline"}
                            className={cn(
                              "cursor-pointer transition-all",
                              selectedNotations.includes(n.id) && NOTATION_CATEGORY_LABELS[category as NotationCategory]?.color,
                              selectedNotations.includes(n.id) && "text-white"
                            )}
                            onClick={() => toggleNotation(n.id)}
                          >
                            {n.code}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {selectedNotations.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedNotations.length}件選択中
                </span>
                <Button size="sm" onClick={handleSearch} disabled={isSearching}>
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <Search className="w-4 h-4 mr-1" />
                  )}
                  動画を検索
                </Button>
              </div>
            )}
          </div>

          {/* Matched techniques */}
          {matchedTechniques.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  該当動画: {matchedTechniques.length}件
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll}>
                    すべて選択
                  </Button>
                  <Button variant="ghost" size="sm" onClick={selectNone}>
                    選択解除
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-[200px] border rounded-lg">
                <div className="p-2 space-y-1">
                  {matchedTechniques.map(tech => (
                    <label
                      key={tech.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedTechniques.has(tech.id)}
                        onCheckedChange={() => toggleTechnique(tech.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {tech.series_prefix && (
                            <span className="text-xs font-mono text-primary">
                              {tech.series_prefix}-{tech.series_order}
                            </span>
                          )}
                          <span className="text-sm truncate">{tech.name_ja || tech.name}</span>
                        </div>
                      </div>
                      {tech.thumbnail_url && (
                        <img
                          src={tech.thumbnail_url}
                          alt=""
                          className="w-12 h-8 object-cover rounded"
                        />
                      )}
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleAddToList}
            disabled={selectedTechniques.size === 0 || isAdding}
          >
            {isAdding ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <ListPlus className="w-4 h-4 mr-1" />
            )}
            {selectedTechniques.size}件を追加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
