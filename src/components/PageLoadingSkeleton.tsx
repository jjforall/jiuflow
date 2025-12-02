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
          <div className="space-y-6 animate-fade-in">
            {/* Cover image */}
            <Skeleton className="h-48 w-full rounded-xl" />
            {/* Profile info */}
            <div className="flex gap-6 items-start -mt-16 px-6">
              <Skeleton className="h-32 w-32 rounded-full border-4 border-background" />
              <div className="space-y-3 pt-20 flex-1">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
                <div className="flex gap-4">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            </div>
            {/* Content sections */}
            <div className="grid gap-6 md:grid-cols-2 px-6">
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
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
