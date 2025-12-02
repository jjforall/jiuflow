import { Suspense, ReactNode } from "react";
import PageLoadingSkeleton from "@/components/PageLoadingSkeleton";

interface SuspenseWrapperProps {
  children: ReactNode;
  variant?: "default" | "map" | "video" | "profile" | "admin";
}

export const SuspenseWrapper = ({ children, variant = "default" }: SuspenseWrapperProps) => {
  return (
    <Suspense fallback={<PageLoadingSkeleton variant={variant} />}>
      {children}
    </Suspense>
  );
};
