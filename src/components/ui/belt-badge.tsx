import { cn } from "@/lib/utils";

interface BeltBadgeProps {
  belt: string;
  className?: string;
}

const getBeltColor = (belt: string): string => {
  const beltLower = belt.toLowerCase();
  
  if (beltLower.includes('白') || beltLower.includes('white')) {
    return 'bg-white text-black border-2 border-gray-300';
  }
  if (beltLower.includes('青') || beltLower.includes('blue')) {
    return 'bg-blue-600 text-white';
  }
  if (beltLower.includes('紫') || beltLower.includes('purple')) {
    return 'bg-purple-600 text-white';
  }
  if (beltLower.includes('茶') || beltLower.includes('brown')) {
    return 'bg-amber-800 text-white';
  }
  if (beltLower.includes('黒') || beltLower.includes('black')) {
    return 'bg-black text-white border border-gray-700';
  }
  
  return 'bg-muted text-foreground';
};

export const BeltBadge = ({ belt, className }: BeltBadgeProps) => {
  return (
    <span className={cn(
      "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold",
      getBeltColor(belt),
      className
    )}>
      {belt}
    </span>
  );
};
