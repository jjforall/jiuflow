import { lazy } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { RoutePrefetcher } from "./components/RoutePrefetcher";
import { FloatingVideoProvider } from "./contexts/FloatingVideoContext";
import { FloatingVideoPlayer } from "./components/FloatingVideoPlayer";
import { MusicProvider } from "./contexts/MusicContext";
import GlobalMusicPlayer from "./components/GlobalMusicPlayer";
import PageLoadingSkeleton from "@/components/PageLoadingSkeleton";
import { SuspenseWrapper } from "@/components/SuspenseWrapper";
import CookieConsentBanner from "./components/CookieConsentBanner";

// Lazy load route components for better performance
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Logout = lazy(() => import("./pages/Logout"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const UpdatePassword = lazy(() => import("./pages/UpdatePassword"));
const Map = lazy(() => import("./pages/Map"));
const Video = lazy(() => import("./pages/Video"));
const About = lazy(() => import("./pages/About"));
const Join = lazy(() => import("./pages/Join"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCanceled = lazy(() => import("./pages/PaymentCanceled"));
const PaymentError = lazy(() => import("./pages/PaymentError"));
const MyPage = lazy(() => import("./pages/MyPage"));
const VideoUploadInfo = lazy(() => import("./pages/VideoUploadInfo"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminStats = lazy(() => import("./pages/AdminStats"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const Dojos = lazy(() => import("./pages/Dojos"));
const DojoNew = lazy(() => import("./pages/DojoNew"));
const Dojo = lazy(() => import("./pages/Dojo"));
const DojoOrProfile = lazy(() => import("./pages/DojoOrProfile"));
const Contact = lazy(() => import("./pages/Contact"));
const FounderTrial = lazy(() => import("./pages/FounderTrial"));
const GenerateImages = lazy(() => import("./pages/GenerateImages"));
const Athletes = lazy(() => import("./pages/Athletes"));
const LineageTree = lazy(() => import("./pages/LineageTree"));
const Athlete = lazy(() => import("./pages/Athlete"));
const PracticeRecordsPage = lazy(() => import("./pages/PracticeRecordsPage"));
const OpenMatPage = lazy(() => import("./pages/OpenMatPage"));
const Shop = lazy(() => import("./pages/Shop"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Terms = lazy(() => import("./pages/Terms"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Sonner position="top-center" richColors closeButton />
            <BrowserRouter>
              <AuthProvider>
                <FloatingVideoProvider>
                <MusicProvider>
                <RoutePrefetcher />
                <Routes>
                  {/* Default pages */}
                  <Route path="/" element={<SuspenseWrapper><Home /></SuspenseWrapper>} />
                  <Route path="/login" element={<SuspenseWrapper><Login /></SuspenseWrapper>} />
                  <Route path="/logout" element={<SuspenseWrapper><Logout /></SuspenseWrapper>} />
                  <Route path="/reset-password" element={<SuspenseWrapper><ResetPassword /></SuspenseWrapper>} />
                  <Route path="/update-password" element={<SuspenseWrapper><UpdatePassword /></SuspenseWrapper>} />
                  <Route path="/about" element={<SuspenseWrapper><About /></SuspenseWrapper>} />
                  <Route path="/contact" element={<SuspenseWrapper><Contact /></SuspenseWrapper>} />
                  <Route path="/join" element={<SuspenseWrapper><Join /></SuspenseWrapper>} />
                  <Route path="/payment-success" element={<SuspenseWrapper><PaymentSuccess /></SuspenseWrapper>} />
                  <Route path="/payment-canceled" element={<SuspenseWrapper><PaymentCanceled /></SuspenseWrapper>} />
                  <Route path="/payment-error" element={<SuspenseWrapper><PaymentError /></SuspenseWrapper>} />
                  <Route path="/founder-trial" element={<SuspenseWrapper><FounderTrial /></SuspenseWrapper>} />
                  <Route path="/shop" element={<SuspenseWrapper><Shop /></SuspenseWrapper>} />
                  <Route path="/privacy" element={<SuspenseWrapper><PrivacyPolicy /></SuspenseWrapper>} />
                  <Route path="/terms" element={<SuspenseWrapper><Terms /></SuspenseWrapper>} />

                  {/* Map/Video grid pages */}
                  <Route path="/map" element={
                    <ProtectedRoute>
                      <SuspenseWrapper variant="map"><Map /></SuspenseWrapper>
                    </ProtectedRoute>
                  } />
                  <Route path="/dojos" element={<SuspenseWrapper variant="map"><Dojos /></SuspenseWrapper>} />
                  <Route path="/athletes" element={<SuspenseWrapper variant="map"><Athletes /></SuspenseWrapper>} />
                  <Route path="/lineage-tree" element={<SuspenseWrapper variant="map"><LineageTree /></SuspenseWrapper>} />

                  {/* Video pages */}
                  <Route path="/video/:id" element={
                    <ProtectedRoute>
                      <SuspenseWrapper variant="video"><Video /></SuspenseWrapper>
                    </ProtectedRoute>
                  } />
                  <Route path="/video-upload-info" element={
                    <ProtectedRoute>
                      <SuspenseWrapper variant="video"><VideoUploadInfo /></SuspenseWrapper>
                    </ProtectedRoute>
                  } />

                  {/* Profile pages */}
                  <Route path="/mypage" element={
                    <ProtectedRoute>
                      <SuspenseWrapper variant="profile"><MyPage /></SuspenseWrapper>
                    </ProtectedRoute>
                  } />
                  <Route path="/dojos/new" element={
                    <ProtectedRoute>
                      <SuspenseWrapper variant="profile"><DojoNew /></SuspenseWrapper>
                    </ProtectedRoute>
                  } />
                  <Route path="/dojo/:id" element={<SuspenseWrapper variant="profile"><Dojo /></SuspenseWrapper>} />
                  <Route path="/athlete/:slugOrUsername" element={<SuspenseWrapper variant="profile"><Athlete /></SuspenseWrapper>} />
                  <Route path="/ryozo" element={<SuspenseWrapper variant="profile"><Athlete /></SuspenseWrapper>} />
                  <Route path="/:slugOrUsername" element={<SuspenseWrapper variant="profile"><DojoOrProfile /></SuspenseWrapper>} />
                  <Route path="/practice-records" element={
                    <ProtectedRoute>
                      <SuspenseWrapper variant="map"><PracticeRecordsPage /></SuspenseWrapper>
                    </ProtectedRoute>
                  } />
                  <Route path="/open-mat" element={
                    <ProtectedRoute>
                      <SuspenseWrapper variant="map"><OpenMatPage /></SuspenseWrapper>
                    </ProtectedRoute>
                  } />

                  {/* Admin pages */}
                  <Route path="/admin" element={<SuspenseWrapper variant="admin"><AdminLogin /></SuspenseWrapper>} />
                  <Route path="/admin-dashboard" element={
                    <ProtectedRoute requireAdmin>
                      <SuspenseWrapper variant="admin"><AdminStats /></SuspenseWrapper>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/dashboard" element={
                    <ProtectedRoute requireAdmin>
                      <SuspenseWrapper variant="admin"><AdminStats /></SuspenseWrapper>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/techniques" element={
                    <ProtectedRoute requireAdmin>
                      <SuspenseWrapper variant="admin"><AdminDashboard /></SuspenseWrapper>
                    </ProtectedRoute>
                  } />
                  <Route path="/generate-images" element={
                    <ProtectedRoute requireAdmin>
                      <SuspenseWrapper variant="admin"><GenerateImages /></SuspenseWrapper>
                    </ProtectedRoute>
                  } />

                  {/* 404 */}
                  <Route path="*" element={<SuspenseWrapper><NotFound /></SuspenseWrapper>} />
                </Routes>
              <FloatingVideoPlayer />
              <GlobalMusicPlayer />
              <CookieConsentBanner />
            </MusicProvider>
            </FloatingVideoProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </LanguageProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
