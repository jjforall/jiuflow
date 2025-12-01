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

interface Organization {
  id: string;
  name: string;
  name_ja: string;
  name_pt: string;
}

interface LineageFiltersProps {
  organizations: Organization[];
  beltLevels: string[];
  selectedOrganization: string | null;
  selectedBeltLevel: string | null;
  showFeaturedOnly: boolean;
  onOrganizationChange: (orgId: string | null) => void;
  onBeltLevelChange: (belt: string | null) => void;
  onFeaturedChange: (featured: boolean) => void;
}

export function LineageFilters({
  organizations,
  beltLevels,
  selectedOrganization,
  selectedBeltLevel,
  showFeaturedOnly,
  onOrganizationChange,
  onBeltLevelChange,
  onFeaturedChange,
}: LineageFiltersProps) {
  const { t, language } = useTranslation();

  const getOrganizationName = (org: Organization) => {
    switch (language) {
      case "ja":
        return org.name_ja;
      case "pt":
        return org.name_pt;
      default:
        return org.name;
    }
  };

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="flex-1 min-w-[200px]">
        <Label>{t("lineageTree.organization", "Organization")}</Label>
        <Select
          value={selectedOrganization || "all"}
          onValueChange={(value) =>
            onOrganizationChange(value === "all" ? null : value)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("lineageTree.allOrganizations", "All Organizations")}
            </SelectItem>
            {organizations.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {getOrganizationName(org)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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

      {(selectedOrganization || selectedBeltLevel || showFeaturedOnly) && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onOrganizationChange(null);
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
