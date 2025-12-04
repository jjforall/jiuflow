import { Skeleton } from "@/components/ui/skeleton";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

interface PageLoadingSkeletonProps {
  variant?: "default" | "map" | "video" | "profile" | "admin";
}

const PageLoadingSkeleton = ({ variant = "default" }: PageLoadingSkeletonProps) => {
  const renderContent = () => {
    switch (variant) {
      case "map":
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Search bar skeleton */}
            <div className="flex gap-4 flex-wrap">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-32" />
            </div>
            {/* Video grid skeleton */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3" style={{ animationDelay: `${i * 50}ms` }}>
                  <Skeleton className="aspect-video w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        );

      case "video":
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Video player skeleton */}
            <Skeleton className="aspect-video w-full max-w-4xl mx-auto rounded-xl" />
            {/* Title and info */}
            <div className="max-w-4xl mx-auto space-y-4">
              <Skeleton className="h-8 w-2/3" />
              <div className="flex gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-20 w-full" />
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
          <div className="flex animate-fade-in">
            {/* Sidebar skeleton */}
            <div className="w-64 border-r border-border p-4 space-y-4 hidden md:block">
              <Skeleton className="h-8 w-32" />
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
            {/* Main content */}
            <div className="flex-1 p-6 space-y-6">
              <Skeleton className="h-10 w-64" />
              <div className="grid gap-4 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-64 rounded-xl" />
            </div>
          </div>
        );

      default:
        return (
          <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 animate-fade-in">
            {/* Hero section skeleton */}
            <div className="space-y-4">
              <Skeleton className="h-12 w-3/4 max-w-md" />
              <Skeleton className="h-6 w-2/3 max-w-sm" />
            </div>
            {/* Cards grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div 
                  key={i} 
                  className="space-y-3 opacity-0 animate-fade-in"
                  style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'forwards' }}
                >
                  <Skeleton className="h-40 w-full rounded-xl" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
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
