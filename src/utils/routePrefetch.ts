// Route prefetching utility for better loading performance

const prefetchCache = new Set<string>();

// Lazy load and preload route components
export const prefetchRoute = async (routePath: string) => {
  if (prefetchCache.has(routePath)) return;
  prefetchCache.add(routePath);

  try {
    switch (routePath) {
      case '/':
        await import('../pages/Home');
        break;
      case '/login':
        await import('../pages/Login');
        break;
      case '/map':
        await import('../pages/Map');
        break;
      case '/video':
        await import('../pages/Video');
        break;
      case '/about':
        await import('../pages/About');
        break;
      case '/join':
        await import('../pages/Join');
        break;
      case '/mypage':
        await import('../pages/MyPage');
        break;
      case '/admin':
        await import('../pages/AdminLogin');
        break;
      case '/admin/dashboard':
        await import('../pages/AdminDashboard');
        break;
    }
  } catch (error) {
    console.warn(`Failed to prefetch route: ${routePath}`, error);
    prefetchCache.delete(routePath);
  }
};

// Prefetch multiple routes (for initial page load)
export const prefetchCriticalRoutes = async () => {
  const criticalRoutes = ['/', '/map', '/about', '/join', '/login'];
  await Promise.all(criticalRoutes.map(route => prefetchRoute(route)));
};