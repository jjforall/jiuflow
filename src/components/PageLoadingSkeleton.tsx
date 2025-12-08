import { Skeleton } from "@/components/ui/skeleton";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { User, Video, BookOpen, Users, Settings, Loader2 } from "lucide-react";

interface PageLoadingSkeletonProps {
  variant?: "default" | "map" | "video" | "profile" | "admin";
}

const PageLoadingSkeleton = ({ variant = "default" }: PageLoadingSkeletonProps) => {
  const renderContent = () => {
    switch (variant) {
      case "map":
        return (
          <div className="space-y-6 px-4 sm:px-6 pt-8">
            {/* Search bar */}
            <div className="flex gap-4 flex-wrap">
              <Skeleton className="h-10 w-64 rounded-lg" />
              <Skeleton className="h-10 w-32 rounded-lg" />
            </div>
            
            {/* Video grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div 
                  key={i} 
                  className="space-y-3 opacity-0 animate-fade-in"
                  style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'forwards' }}
                >
                  <Skeleton className="aspect-video w-full rounded-xl" />
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
            <Skeleton className="aspect-video w-full max-w-4xl mx-auto rounded-xl" />
            
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
          <div className="max-w-4xl mx-auto px-3 sm:px-6 pt-20 sm:pt-24 pb-12">
            {/* Loading indicator at top */}
            <div className="flex items-center justify-center gap-2 mb-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">読み込み中...</span>
            </div>
            
            {/* Cover image */}
            <div className="relative mb-8 sm:mb-12">
              <Skeleton className="h-32 sm:h-44 md:h-56 w-full rounded-xl sm:rounded-2xl" />
              
              {/* Profile header */}
              <div className="px-3 sm:px-6 -mt-10 sm:-mt-14">
                <div className="flex items-end justify-between gap-2">
                  {/* Avatar with user icon placeholder */}
                  <div className="relative">
                    <div className="h-20 w-20 sm:h-28 sm:w-28 rounded-full border-4 border-background bg-muted flex items-center justify-center shadow-lg">
                      <User className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground/50" />
                    </div>
                  </div>
                  
                  {/* Action buttons placeholder */}
                  <div className="flex gap-2 mb-1">
                    <Skeleton className="h-8 sm:h-9 w-20 rounded-md" />
                  </div>
                </div>
                
                {/* Name and info */}
                <div className="mt-3 sm:mt-4 space-y-2">
                  <Skeleton className="h-6 sm:h-8 w-36 sm:w-48" />
                  <Skeleton className="h-4 w-full max-w-sm" />
                </div>
              </div>
            </div>
            
            {/* Tabs - simple clean design */}
            <div className="mt-6 sm:mt-8">
              <div className="flex gap-1 p-1 bg-muted/60 rounded-lg mb-6">
                {[
                  { icon: Video, label: "動画" },
                  { icon: BookOpen, label: "練習" },
                  { icon: BookOpen, label: "履歴" },
                  { icon: Users, label: "フォロー" },
                  { icon: Settings, label: "設定" }
                ].map((tab, i) => (
                  <div 
                    key={i} 
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-md text-xs sm:text-sm ${i === 0 ? 'bg-background shadow-sm' : 'text-muted-foreground/60'}`}
                  >
                    <tab.icon className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </div>
                ))}
              </div>
              
              {/* Content placeholder */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div 
                    key={i} 
                    className="space-y-3 opacity-0 animate-fade-in"
                    style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'forwards' }}
                  >
                    <Skeleton className="aspect-video rounded-lg" />
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
            <div className="rounded-2xl p-8 sm:p-12 bg-muted/30">
              <div className="space-y-4">
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
                  className="opacity-0 animate-fade-in"
                  style={{ animationDelay: `${100 + i * 60}ms`, animationFillMode: 'forwards' }}
                >
                  <Skeleton className="aspect-[4/3] rounded-lg" />
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

