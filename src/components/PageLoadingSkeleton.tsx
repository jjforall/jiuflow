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
            {/* Search bar */}
            <div className="flex gap-4 flex-wrap">
              <div className="relative h-10 w-64 rounded-lg bg-muted overflow-hidden">
                <ShimmerOverlay />
              </div>
              <div className="relative h-10 w-32 rounded-lg bg-muted overflow-hidden">
                <ShimmerOverlay />
              </div>
            </div>
            
            {/* Video grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div 
                  key={i} 
                  className="space-y-3 opacity-0 animate-fade-in"
                  style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'forwards' }}
                >
                  <div className="relative aspect-video w-full rounded-xl bg-muted overflow-hidden">
                    <ShimmerOverlay />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-background/20 animate-pulse" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          </div>
        );

      case "video":
        return (
          <div className="space-y-6 px-4 sm:px-6 pt-8">
            {/* Video player */}
            <div className="relative aspect-video w-full max-w-4xl mx-auto rounded-xl overflow-hidden">
              <div className="absolute inset-0 bg-muted" />
              <ShimmerOverlay />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-background/30 animate-pulse" />
              </div>
            </div>
            
            {/* Title and info */}
            <div className="max-w-4xl mx-auto space-y-4">
              <Skeleton className="h-8 w-2/3" />
              <div className="flex gap-4 items-center">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          </div>
        );

      case "profile":
        return (
          <div className="max-w-4xl mx-auto px-3 sm:px-6 pt-20 sm:pt-32 pb-12">
            {/* Cover image - matches MyPage exactly */}
            <div className="relative mb-8 sm:mb-16">
              <div className="h-32 sm:h-44 md:h-64 rounded-xl sm:rounded-2xl overflow-hidden relative bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20">
                <ShimmerOverlay />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
              </div>
              
              {/* Profile header - positioned like MyPage */}
              <div className="px-3 sm:px-6 -mt-10 sm:-mt-16">
                <div className="flex items-end justify-between gap-2">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="h-20 w-20 sm:h-32 sm:w-32 rounded-full border-3 sm:border-4 border-background bg-muted animate-pulse shadow-xl" />
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex gap-2 mb-0">
                    <Skeleton className="h-8 sm:h-9 w-20 sm:w-24 rounded-md" />
                    <Skeleton className="h-8 sm:h-9 w-16 sm:w-20 rounded-md" />
                  </div>
                </div>
                
                {/* Name and bio */}
                <div className="mt-3 sm:mt-4 space-y-2">
                  <Skeleton className="h-7 sm:h-9 w-40 sm:w-56" />
                  <Skeleton className="h-4 w-full max-w-md" />
                  
                  {/* Stats row */}
                  <div className="flex gap-4 sm:gap-6 pt-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-4 w-6" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-4 w-6" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Skeleton className="h-4 w-6" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Visibility toggle bar */}
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-32 hidden sm:block" />
                </div>
              </div>
              <Skeleton className="h-5 w-9 rounded-full" />
            </div>
            
            {/* Profile card */}
            <div className="mb-6 sm:mb-8 border border-border/50 rounded-lg overflow-hidden shadow-lg">
              <div className="bg-gradient-to-r from-accent/10 via-primary/5 to-accent/10 border-b border-border/50 p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg" />
                  <Skeleton className="h-6 sm:h-7 w-24 sm:w-32" />
                </div>
              </div>
              <div className="p-3 sm:p-6 md:p-8 space-y-4">
                {/* Belt history section */}
                <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                  <div className="flex items-center justify-between mb-3">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </div>
                
                {/* Other sections */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                    <Skeleton className="h-5 w-20 mb-3" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                    <Skeleton className="h-5 w-24 mb-3" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tabs - matches exactly 5 tabs like MyPage */}
            <div className="mt-6 sm:mt-12">
              <div className="grid w-full grid-cols-5 h-auto p-1 bg-muted rounded-lg mb-4 sm:mb-6">
                {["動画", "練習", "履歴", "フォロー", "設定"].map((tab, i) => (
                  <div 
                    key={i} 
                    className={`flex items-center justify-center text-[10px] sm:text-sm px-1 sm:px-3 py-1.5 sm:py-2 rounded-md ${i === 0 ? 'bg-background shadow-sm' : ''}`}
                  >
                    <Skeleton className="h-3 sm:h-4 w-8 sm:w-12" />
                  </div>
                ))}
              </div>
              
              {/* Video content grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div 
                    key={i} 
                    className="space-y-3 opacity-0 animate-fade-in"
                    style={{ animationDelay: `${100 + i * 60}ms`, animationFillMode: 'forwards' }}
                  >
                    <div className="aspect-video rounded-xl bg-muted relative overflow-hidden">
                      <ShimmerOverlay />
                    </div>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "admin":
        return (
          <div className="flex min-h-[calc(100vh-4rem)]">
            {/* Sidebar */}
            <div className="w-64 border-r border-border bg-muted/20 p-4 space-y-4 hidden md:block">
              <Skeleton className="h-8 w-32" />
              <div className="space-y-2 pt-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton 
                    key={i} 
                    className="h-10 w-full rounded-md opacity-0 animate-fade-in"
                    style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'forwards' }}
                  />
                ))}
              </div>
            </div>
            
            {/* Main content */}
            <div className="flex-1 p-6 space-y-6">
              <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-9 w-24 rounded-md" />
              </div>
              
              {/* Stats cards */}
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div 
                    key={i} 
                    className="rounded-xl p-4 border border-border/50 opacity-0 animate-fade-in"
                    style={{ animationDelay: `${50 + i * 50}ms`, animationFillMode: 'forwards' }}
                  >
                    <Skeleton className="h-4 w-20 mb-3" />
                    <Skeleton className="h-8 w-24 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
              
              {/* Table */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="p-4 border-b border-border flex gap-4 bg-muted/30">
                  <Skeleton className="h-9 w-64" />
                  <Skeleton className="h-9 w-32" />
                </div>
                <div className="divide-y divide-border">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="p-4 flex items-center gap-4 opacity-0 animate-fade-in"
                      style={{ animationDelay: `${150 + i * 30}ms`, animationFillMode: 'forwards' }}
                    >
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-4 w-40 flex-1" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-16 rounded-full" />
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
            {/* Hero section */}
            <div className="relative rounded-2xl overflow-hidden p-8 sm:p-12 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10">
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
            
            {/* Cards grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div 
                  key={i} 
                  className="relative rounded-xl overflow-hidden opacity-0 animate-fade-in p-1"
                  style={{ animationDelay: `${100 + i * 60}ms`, animationFillMode: 'forwards' }}
                >
                  <div className="aspect-[4/3] rounded-lg bg-muted overflow-hidden">
                    <ShimmerOverlay />
                  </div>
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
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

