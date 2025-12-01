import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface Celebrity {
  id: string;
  display_name: string;
  avatar_url: string | null;
  belt_history: any;
  organization_id: string | null;
  featured: boolean;
  organization?: {
    id: string;
    name: string;
    name_ja: string;
    name_pt: string;
  };
}

interface LineageNode {
  celebrity: Celebrity;
  students: LineageNode[];
}

interface InteractiveLineageTreeProps {
  roots: LineageNode[];
  isLoading: boolean;
}

export function InteractiveLineageTree({
  roots,
  isLoading,
}: InteractiveLineageTreeProps) {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.2, 0.5));
  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.lineage-tree-content')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  const getBeltName = (beltHistory: any): string => {
    if (!beltHistory || !Array.isArray(beltHistory) || beltHistory.length === 0)
      return "Unknown";
    return beltHistory[beltHistory.length - 1]?.belt || "Unknown";
  };

  const getBeltColor = (belt: string): string => {
    const colors: Record<string, string> = {
      White: "bg-gray-100 text-gray-900",
      Blue: "bg-blue-500 text-white",
      Purple: "bg-purple-500 text-white",
      Brown: "bg-amber-700 text-white",
      Black: "bg-black text-white",
      Coral: "bg-red-300 text-gray-900",
      Red: "bg-red-600 text-white",
    };
    return colors[belt] || "bg-gray-400 text-white";
  };

  const renderNode = (node: LineageNode, depth: number = 0): JSX.Element => {
    const belt = getBeltName(node.celebrity.belt_history);
    const beltColor = getBeltColor(belt);

    return (
      <div key={node.celebrity.id} className="flex flex-col items-center">
        <Link
          to={`/athlete/${node.celebrity.id}`}
          className="group relative mb-4 hover-scale"
        >
          <Card className="w-48 p-4 hover:shadow-xl transition-all duration-300 border-2 hover:border-primary">
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-16 w-16 border-2 border-border group-hover:border-primary transition-colors">
                <AvatarImage
                  src={node.celebrity.avatar_url || ""}
                  alt={node.celebrity.display_name}
                />
                <AvatarFallback>
                  {node.celebrity.display_name.slice(0, 2)}
                </AvatarFallback>
              </Avatar>

              <div className="text-center space-y-1">
                <h3 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors">
                  {node.celebrity.display_name}
                </h3>
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${beltColor}`}
                >
                  {belt}
                </span>
                {node.celebrity.featured && (
                  <div className="text-xs text-muted-foreground">⭐ Featured</div>
                )}
              </div>
            </div>
          </Card>
        </Link>

        {node.students.length > 0 && (
          <div className="relative">
            <div className="absolute left-1/2 top-0 w-0.5 h-6 bg-border -translate-x-1/2" />
            
            <div className="flex gap-8 pt-6">
              {node.students.map((student, index) => (
                <div key={student.celebrity.id} className="relative">
                  {index === 0 && node.students.length > 1 && (
                    <div className="absolute left-1/2 top-0 h-0.5 bg-border" style={{ width: `${(node.students.length - 1) * 192 + (node.students.length - 1) * 32}px`, transform: 'translateX(-50%)' }} />
                  )}
                  <div className="absolute left-1/2 top-0 w-0.5 h-6 bg-border -translate-x-1/2" />
                  {renderNode(student, depth + 1)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="space-y-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (roots.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">
          {t("lineageTree.noResults", "No lineage data found matching your filters.")}
        </p>
      </Card>
    );
  }

  return (
    <div className="relative">
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button size="icon" variant="outline" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="outline" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="outline" onClick={handleReset}>
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      <Card
        ref={containerRef}
        className="p-8 overflow-hidden cursor-move select-none"
        style={{ minHeight: "600px" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <div
          className="lineage-tree-content"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            transformOrigin: "center",
            transition: isDragging ? "none" : "transform 0.2s ease-out",
          }}
        >
          <div className="flex flex-wrap gap-16 justify-center">
            {roots.map((root) => renderNode(root))}
          </div>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground text-center mt-4">
        {t("lineageTree.instructions", "Click and drag to pan • Use zoom controls or scroll to zoom • Click on athletes to view their profiles")}
      </p>
    </div>
  );
}
