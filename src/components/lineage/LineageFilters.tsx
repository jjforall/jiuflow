import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";

interface LineageFiltersProps {
  beltLevels: string[];
  selectedBeltLevel: string | null;
  onBeltLevelChange: (belt: string | null) => void;
  showLivingOnly: boolean;
  onShowLivingOnlyChange: (value: boolean) => void;
}

export function LineageFilters({
  beltLevels,
  selectedBeltLevel,
  onBeltLevelChange,
  showLivingOnly,
  onShowLivingOnlyChange,
}: LineageFiltersProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const getBeltTranslation = (belt: string) => {
    return t(`lineageTree.belts.${belt}`, belt);
  };

  const getLivingOnlyLabel = () => {
    switch (language) {
      case 'ja': return '故人を除く';
      case 'pt': return 'Excluir falecidos';
      case 'es': return 'Excluir fallecidos';
      case 'fr': return 'Exclure les décédés';
      case 'de': return 'Verstorbene ausschließen';
      case 'zh': return '排除已故者';
      case 'ko': return '고인 제외';
      case 'it': return 'Escludi deceduti';
      case 'ru': return 'Исключить умерших';
      default: return 'Exclude Deceased';
    }
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

      <div className="flex items-center space-x-2 pb-1">
        <Checkbox
          id="livingOnly"
          checked={showLivingOnly}
          onCheckedChange={(checked) => onShowLivingOnlyChange(checked === true)}
        />
        <Label htmlFor="livingOnly" className="cursor-pointer text-sm">
          {getLivingOnlyLabel()}
        </Label>
      </div>

      {(selectedBeltLevel || showLivingOnly) && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onBeltLevelChange(null);
            onShowLivingOnlyChange(false);
          }}
        >
          <X className="h-4 w-4 mr-1" />
          {t("lineageTree.clearFilters", "Clear Filters")}
        </Button>
      )}
    </div>
  );
}
