import { Skeleton } from "@/components/ui/skeleton";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

interface PageLoadingSkeletonProps {
  variant?: "default" | "map" | "video" | "profile" | "admin";
}

const ShimmerOverlay = () => (
  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite] -translate-x-full" />
);

const PageLoadingSkeleton = ({ variant = "default" }: PageLoadingSkeletonProps) => {
  const renderContent = () => {
    switch (variant) {
      case "map":
        return (
          <div className="space-y-6 px-4 sm:px-6 pt-8">
            {/* Search bar with shimmer */}
            <div className="flex gap-4 flex-wrap">
              <div className="relative h-10 w-64 rounded-lg bg-muted overflow-hidden">
                <ShimmerOverlay />
              </div>
              <div className="relative h-10 w-32 rounded-lg bg-muted overflow-hidden">
                <ShimmerOverlay />
              </div>
            </div>
            
            {/* Video grid with staggered animation */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div 
                  key={i} 
                  className="space-y-3 opacity-0 animate-fade-in"
                  style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'forwards' }}
                >
                  <div className="relative aspect-video w-full rounded-xl bg-gradient-to-br from-muted to-muted/60 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
                    <ShimmerOverlay />
                    {/* Play button indicator */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-background/20 backdrop-blur-sm animate-pulse" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "video":
        return (
          <div className="space-y-6 px-4 sm:px-6 pt-8">
            {/* Video player with cinematic shimmer */}
            <div className="relative aspect-video w-full max-w-4xl mx-auto rounded-xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-muted to-accent/10" />
              <ShimmerOverlay />
              {/* Play button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-background/30 backdrop-blur-md flex items-center justify-center animate-pulse">
                  <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-foreground/50 border-b-8 border-b-transparent ml-1" />
                </div>
              </div>
              {/* Progress bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/50">
                <div className="h-full w-1/3 bg-primary/50 animate-pulse" />
              </div>
            </div>
            
            {/* Title and info */}
            <div className="max-w-4xl mx-auto space-y-4">
              <Skeleton className="h-8 w-2/3" />
              <div className="flex gap-4 items-center">
                <div className="relative">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="absolute inset-0 rounded-full bg-primary/10 blur-md animate-pulse" />
                </div>
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-20 rounded-full" />
                  <Skeleton className="h-9 w-9 rounded-full" />
                </div>
              </div>
              
              {/* Description card */}
              <div className="relative rounded-xl bg-muted/30 p-4 overflow-hidden">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
                <ShimmerOverlay />
              </div>
            </div>
          </div>
        );

      case "profile":
        return (
          <div className="max-w-4xl mx-auto px-3 sm:px-6 pt-12 sm:pt-16">
            {/* Cover image with shimmer effect */}
            <div className="relative mb-8 sm:mb-16">
              <div className="h-28 sm:h-40 md:h-56 rounded-t-xl sm:rounded-t-2xl overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20 animate-pulse" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite] translate-x-[-100%]" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
              </div>
              
              {/* Profile header */}
              <div className="px-3 sm:px-6 -mt-10 sm:-mt-16">
                <div className="flex items-end justify-between gap-2">
                  {/* Avatar with glow effect */}
                  <div className="relative">
                    <div className="h-20 w-20 sm:h-32 sm:w-32 rounded-full border-3 sm:border-4 border-background bg-gradient-to-br from-primary/30 to-accent/30 animate-pulse shadow-xl">
                      <div className="absolute inset-2 rounded-full bg-muted animate-pulse" />
                    </div>
                    <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
                  </div>
                  
                  {/* Action buttons skeleton */}
                  <div className="flex gap-2 mb-2 sm:mb-4">
                    <Skeleton className="h-8 sm:h-9 w-20 sm:w-28 rounded-md" />
                    <Skeleton className="h-8 sm:h-9 w-16 sm:w-24 rounded-md" />
                  </div>
                </div>
                
                {/* Name and bio */}
                <div className="mt-3 sm:mt-4 space-y-3">
                  <Skeleton className="h-7 sm:h-9 w-48 sm:w-64" />
                  <Skeleton className="h-4 w-32 sm:w-40" />
                  
                  {/* Stats row */}
                  <div className="flex gap-4 sm:gap-6 pt-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-8" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-8" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-8" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tabs skeleton */}
            <div className="mb-6">
              <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton 
                    key={i} 
                    className="h-9 w-16 sm:w-20 rounded-md" 
                    style={{ animationDelay: `${i * 100}ms` }}
                  />
                ))}
              </div>
            </div>
            
            {/* Content grid with staggered animation */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div 
                  key={i} 
                  className="space-y-3 opacity-0 animate-fade-in"
                  style={{ animationDelay: `${200 + i * 80}ms`, animationFillMode: 'forwards' }}
                >
                  <div className="aspect-video rounded-xl bg-gradient-to-br from-muted to-muted/50 animate-pulse relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_2s_infinite] translate-x-[-100%]" />
                  </div>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        );

      case "admin":
        return (
          <div className="flex min-h-[calc(100vh-4rem)]">
            {/* Sidebar with gradient */}
            <div className="w-64 border-r border-border bg-gradient-to-b from-muted/30 to-background p-4 space-y-4 hidden md:block">
              <div className="relative h-8 w-32 rounded-md bg-muted overflow-hidden">
                <ShimmerOverlay />
              </div>
              <div className="space-y-2 pt-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div 
                    key={i} 
                    className="relative h-10 w-full rounded-md bg-muted/60 overflow-hidden opacity-0 animate-fade-in"
                    style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'forwards' }}
                  >
                    <ShimmerOverlay />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Main content */}
            <div className="flex-1 p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-64" />
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-24 rounded-md" />
                  <Skeleton className="h-9 w-9 rounded-md" />
                </div>
              </div>
              
              {/* Stats cards with glow */}
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div 
                    key={i} 
                    className="relative rounded-xl p-4 overflow-hidden opacity-0 animate-fade-in"
                    style={{ animationDelay: `${100 + i * 80}ms`, animationFillMode: 'forwards' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl" />
                    <div className="relative space-y-3">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </div>
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <ShimmerOverlay />
                  </div>
                ))}
              </div>
              
              {/* Data table skeleton */}
              <div className="relative rounded-xl border border-border overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-muted/20 to-transparent" />
                <div className="p-4 border-b border-border flex gap-4">
                  <Skeleton className="h-9 w-64" />
                  <Skeleton className="h-9 w-32" />
                </div>
                <div className="divide-y divide-border">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="p-4 flex items-center gap-4 opacity-0 animate-fade-in"
                      style={{ animationDelay: `${300 + i * 50}ms`, animationFillMode: 'forwards' }}
                    >
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-4 w-40 flex-1" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8">
            {/* Hero section with elegant gradient */}
            <div className="relative rounded-2xl overflow-hidden p-8 sm:p-12">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-50" />
              <ShimmerOverlay />
              <div className="relative space-y-4">
                <Skeleton className="h-10 sm:h-14 w-3/4 max-w-lg" />
                <Skeleton className="h-5 sm:h-6 w-2/3 max-w-md" />
                <div className="flex gap-3 pt-4">
                  <Skeleton className="h-11 w-32 rounded-full" />
                  <Skeleton className="h-11 w-28 rounded-full" />
                </div>
              </div>
            </div>
            
            {/* Cards grid with staggered reveal */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div 
                  key={i} 
                  className="relative rounded-xl overflow-hidden opacity-0 animate-fade-in group"
                  style={{ animationDelay: `${150 + i * 100}ms`, animationFillMode: 'forwards' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-muted/50 to-muted/20" />
                  <div className="relative p-1">
                    <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-muted to-muted/60 overflow-hidden">
                      <ShimmerOverlay />
                    </div>
                    <div className="p-4 space-y-3">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                      <div className="flex items-center gap-2 pt-2">
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-16">
        {renderContent()}
      </main>
      <Footer />
    </div>
  );
};

export default PageLoadingSkeleton;
