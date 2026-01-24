import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Check, Plus, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotations, useTechniqueNotations, useAddTechniqueNotation, useRemoveTechniqueNotation } from "@/hooks/useNotations";
import { NOTATION_CATEGORY_LABELS, NOTATION_CATEGORY_SHORT_LABELS, type NotationCategory } from "@/types/notation";

interface NotationSelectorProps {
  techniqueId: string;
  compact?: boolean;
  readOnly?: boolean;
}

export function NotationSelector({ techniqueId, compact = false, readOnly = false }: NotationSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  const { data: allNotations, isLoading: notationsLoading } = useNotations();
  const { data: techniqueNotations, isLoading: linkLoading } = useTechniqueNotations(techniqueId);
  const addNotation = useAddTechniqueNotation();
  const removeNotation = useRemoveTechniqueNotation();

  const linkedNotationIds = new Set(techniqueNotations?.map(tn => tn.notation_id) || []);

  const handleAdd = async (notationId: string) => {
    await addNotation.mutateAsync({ techniqueId, notationId });
  };

  const handleRemove = async (linkId: string) => {
    await removeNotation.mutateAsync({ id: linkId, techniqueId });
  };

  // Group notations by category
  const groupedNotations = (allNotations || []).reduce((acc, n) => {
    if (!acc[n.category]) acc[n.category] = [];
    acc[n.category].push(n);
    return acc;
  }, {} as Record<NotationCategory, typeof allNotations>);

  // Filter by search
  const filteredGrouped = Object.entries(groupedNotations).reduce((acc, [cat, notations]) => {
    const items = notations || [];
    const filtered = items.filter(n => 
      n.code.toLowerCase().includes(search.toLowerCase()) ||
      n.name_ja.includes(search) ||
      n.name_en.toLowerCase().includes(search.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[cat as NotationCategory] = filtered;
    }
    return acc;
  }, {} as Record<NotationCategory, typeof allNotations>);

  if (linkLoading || notationsLoading) {
    return (
      <div className="flex gap-1">
        <Badge variant="outline" className="animate-pulse">...</Badge>
      </div>
    );
  }

  const linkedNotations = techniqueNotations?.map(tn => tn.notation).filter(Boolean) || [];

  return (
    <div className="flex flex-wrap items-center gap-1">
      {/* Display linked notations as badges */}
      {linkedNotations.map((notation) => {
        const link = techniqueNotations?.find(tn => tn.notation_id === notation?.id);
        const categoryLabel = NOTATION_CATEGORY_LABELS[notation?.category as NotationCategory];
        return notation ? (
          <Badge
            key={notation.id}
            variant="secondary"
            className={cn(
              "text-xs font-mono",
              categoryLabel?.color,
              "text-white"
            )}
          >
            {notation.code}
            {!readOnly && link && (
              <button
                onClick={() => handleRemove(link.id)}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </Badge>
        ) : null;
      })}

      {/* Add button with popover */}
      {!readOnly && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn("h-6 px-2 text-xs", compact && "h-5 px-1.5")}
            >
              <Plus className="w-3 h-3" />
              {!compact && <span className="ml-1">略称</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="略称を検索..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8"
                />
              </div>
            </div>
            <div className="h-[300px] overflow-y-auto">
              <div className="p-2 space-y-3">
                {Object.entries(filteredGrouped).map(([category, notations]) => (
                  <div key={category}>
                    <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1 sticky top-0 bg-popover py-1">
                      <span className={cn("w-2 h-2 rounded-full", NOTATION_CATEGORY_LABELS[category as NotationCategory]?.color)} />
                      {NOTATION_CATEGORY_SHORT_LABELS[category as NotationCategory]}
                    </div>
                    <div className="space-y-0.5">
                      {notations?.map((n) => {
                        const isLinked = linkedNotationIds.has(n.id);
                        return (
                          <button
                            key={n.id}
                            onClick={() => !isLinked && handleAdd(n.id)}
                            disabled={isLinked || addNotation.isPending}
                            className={cn(
                              "flex items-center gap-2 w-full px-2 py-1.5 rounded text-left transition-colors",
                              isLinked 
                                ? "bg-primary/20 text-primary cursor-not-allowed" 
                                : "hover:bg-muted cursor-pointer"
                            )}
                          >
                            {isLinked && <Check className="w-3 h-3 flex-shrink-0" />}
                            <span className="font-mono text-xs font-medium w-12 flex-shrink-0">{n.code}</span>
                            <span className="text-sm truncate">{n.name_ja}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {Object.keys(filteredGrouped).length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-4">
                    略称が見つかりません
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
