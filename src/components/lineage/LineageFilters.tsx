import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface LineageFiltersProps {
  beltLevels: string[];
  selectedBeltLevel: string | null;
  showFeaturedOnly: boolean;
  onBeltLevelChange: (belt: string | null) => void;
  onFeaturedChange: (featured: boolean) => void;
}

export function LineageFilters({
  beltLevels,
  selectedBeltLevel,
  showFeaturedOnly,
  onBeltLevelChange,
  onFeaturedChange,
}: LineageFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="flex-1 min-w-[200px]">
        <Label>{t("lineageTree.beltLevel", "Belt Level")}</Label>
        <Select
          value={selectedBeltLevel || "all"}
          onValueChange={(value) =>
            onBeltLevelChange(value === "all" ? null : value)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("lineageTree.allBelts", "All Belts")}
            </SelectItem>
            {beltLevels.map((belt) => (
              <SelectItem key={belt} value={belt}>
                {belt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="featured"
          checked={showFeaturedOnly}
          onCheckedChange={onFeaturedChange}
        />
        <Label htmlFor="featured">
          {t("lineageTree.featuredOnly", "Featured Only")}
        </Label>
      </div>

      {(selectedBeltLevel || showFeaturedOnly) && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onBeltLevelChange(null);
            onFeaturedChange(false);
          }}
        >
          <X className="h-4 w-4 mr-1" />
          {t("lineageTree.clearFilters", "Clear Filters")}
        </Button>
      )}
    </div>
  );
}
