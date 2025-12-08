import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface LineageFiltersProps {
  beltLevels: string[];
  selectedBeltLevel: string | null;
  onBeltLevelChange: (belt: string | null) => void;
}

export function LineageFilters({
  beltLevels,
  selectedBeltLevel,
  onBeltLevelChange,
}: LineageFiltersProps) {
  const { t } = useTranslation();

  const getBeltTranslation = (belt: string) => {
    return t(`lineageTree.belts.${belt}`, belt);
  };

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
                {getBeltTranslation(belt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedBeltLevel && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onBeltLevelChange(null);
          }}
        >
          <X className="h-4 w-4 mr-1" />
          {t("lineageTree.clearFilters", "Clear Filters")}
        </Button>
      )}
    </div>
  );
}
