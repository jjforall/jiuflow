import { cn } from "@/lib/utils";

export type SeriesPrefix = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z' | string;

// Get color classes based on series prefix letter
export const getSeriesPrefixColors = (prefix: SeriesPrefix): string => {
  const letter = prefix?.charAt(0)?.toUpperCase() || '';
  
  switch (letter) {
    case 'A':
      return 'bg-blue-500 text-white';
    case 'B':
      return 'bg-emerald-500 text-white';
    case 'C':
      return 'bg-orange-500 text-white';
    case 'D':
      return 'bg-purple-500 text-white';
    case 'E':
      return 'bg-rose-500 text-white';
    case 'F':
      return 'bg-cyan-500 text-white';
    case 'G':
      return 'bg-amber-500 text-white';
    case 'H':
      return 'bg-indigo-500 text-white';
    case 'I':
      return 'bg-pink-500 text-white';
    case 'J':
      return 'bg-teal-500 text-white';
    case 'K':
      return 'bg-lime-600 text-white';
    case 'L':
      return 'bg-fuchsia-500 text-white';
    case 'M':
      return 'bg-sky-500 text-white';
    case 'N':
      return 'bg-red-500 text-white';
    case 'O':
      return 'bg-violet-500 text-white';
    case 'P':
      return 'bg-green-500 text-white';
    case 'Q':
      return 'bg-yellow-600 text-white';
    case 'R':
      return 'bg-blue-600 text-white';
    case 'S':
      return 'bg-emerald-600 text-white';
    case 'T':
      return 'bg-orange-600 text-white';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

// Get slightly lighter hover/watched variant
export const getSeriesPrefixColorsWatched = (prefix: SeriesPrefix): string => {
  const letter = prefix?.charAt(0)?.toUpperCase() || '';
  
  switch (letter) {
    case 'A':
      return 'bg-blue-600 text-white shadow-blue-500/30';
    case 'B':
      return 'bg-emerald-600 text-white shadow-emerald-500/30';
    case 'C':
      return 'bg-orange-600 text-white shadow-orange-500/30';
    case 'D':
      return 'bg-purple-600 text-white shadow-purple-500/30';
    case 'E':
      return 'bg-rose-600 text-white shadow-rose-500/30';
    case 'F':
      return 'bg-cyan-600 text-white shadow-cyan-500/30';
    case 'G':
      return 'bg-amber-600 text-white shadow-amber-500/30';
    case 'H':
      return 'bg-indigo-600 text-white shadow-indigo-500/30';
    case 'I':
      return 'bg-pink-600 text-white shadow-pink-500/30';
    case 'J':
      return 'bg-teal-600 text-white shadow-teal-500/30';
    case 'K':
      return 'bg-lime-700 text-white shadow-lime-500/30';
    case 'L':
      return 'bg-fuchsia-600 text-white shadow-fuchsia-500/30';
    case 'M':
      return 'bg-sky-600 text-white shadow-sky-500/30';
    case 'N':
      return 'bg-red-600 text-white shadow-red-500/30';
    case 'O':
      return 'bg-violet-600 text-white shadow-violet-500/30';
    case 'P':
      return 'bg-green-600 text-white shadow-green-500/30';
    case 'Q':
      return 'bg-yellow-700 text-white shadow-yellow-500/30';
    case 'R':
      return 'bg-blue-700 text-white shadow-blue-500/30';
    case 'S':
      return 'bg-emerald-700 text-white shadow-emerald-500/30';
    case 'T':
      return 'bg-orange-700 text-white shadow-orange-500/30';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

// Get lighter/muted variant for accordion headers
export const getSeriesPrefixColorsLight = (prefix: SeriesPrefix): string => {
  const letter = prefix?.charAt(0)?.toUpperCase() || '';
  
  switch (letter) {
    case 'A':
      return 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30';
    case 'B':
      return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    case 'C':
      return 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30';
    case 'D':
      return 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30';
    case 'E':
      return 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30';
    case 'F':
      return 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30';
    case 'G':
      return 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30';
    case 'H':
      return 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30';
    case 'I':
      return 'bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30';
    case 'J':
      return 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/30';
    case 'K':
      return 'bg-lime-500/20 text-lime-700 dark:text-lime-300 border-lime-500/30';
    case 'L':
      return 'bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/30';
    case 'M':
      return 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/30';
    case 'N':
      return 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30';
    case 'O':
      return 'bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-500/30';
    case 'P':
      return 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30';
    case 'Q':
      return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30';
    case 'R':
      return 'bg-blue-600/20 text-blue-700 dark:text-blue-300 border-blue-600/30';
    case 'S':
      return 'bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border-emerald-600/30';
    case 'T':
      return 'bg-orange-600/20 text-orange-700 dark:text-orange-300 border-orange-600/30';
    default:
      return 'bg-muted/50 text-muted-foreground border-border';
  }
};

interface SeriesBadgeProps {
  prefix: string;
  order?: number;
  watched?: boolean;
  variant?: 'default' | 'light';
  className?: string;
}

export const SeriesBadge = ({ 
  prefix, 
  order, 
  watched = false, 
  variant = 'default',
  className 
}: SeriesBadgeProps) => {
  const colorClass = variant === 'light' 
    ? getSeriesPrefixColorsLight(prefix)
    : watched 
      ? getSeriesPrefixColorsWatched(prefix)
      : getSeriesPrefixColors(prefix);

  const label = order ? `${prefix}-${order}` : prefix;

  return (
    <span className={cn(
      "inline-flex items-center justify-center font-semibold rounded-lg transition-all",
      variant === 'light' 
        ? "px-3 py-1.5 text-sm border" 
        : "min-w-[2.5rem] h-8 md:h-10 px-2 text-xs md:text-sm shadow-sm",
      colorClass,
      watched && variant !== 'light' && "shadow-lg",
      className
    )}>
      {label}
    </span>
  );
};
