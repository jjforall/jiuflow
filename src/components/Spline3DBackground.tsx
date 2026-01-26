import { Suspense, lazy, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

// Lazy load Spline for performance
const Spline = lazy(() => import('@splinetool/react-spline'));

interface Spline3DBackgroundProps {
  scene: string;
  className?: string;
  fallbackClassName?: string;
}

export const Spline3DBackground = ({ 
  scene, 
  className,
  fallbackClassName = "bg-gradient-to-br from-primary/5 via-background to-secondary/5"
}: Spline3DBackgroundProps) => {
  const [isMobile, setIsMobile] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Check if mobile and disable 3D for performance
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fallback for mobile or errors
  if (isMobile || hasError) {
    return (
      <div className={cn("absolute inset-0", fallbackClassName, className)}>
        {/* Animated gradient fallback */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}>
      <Suspense 
        fallback={
          <div className={cn("absolute inset-0", fallbackClassName)}>
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-secondary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>
        }
      >
        <Spline 
          scene={scene} 
          onError={() => setHasError(true)}
          style={{ width: '100%', height: '100%' }}
        />
      </Suspense>
    </div>
  );
};

export default Spline3DBackground;
