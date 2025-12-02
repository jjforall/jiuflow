import { Suspense, lazy } from "react";
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
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

// Lazy load route components for better performance
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
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
                <Suspense
                  fallback={
                    <div className="min-h-screen bg-background">
                      <Navigation />
                      <main className="pt-16">
                        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-16">
                          <div className="h-10 w-40 animate-pulse rounded-full bg-muted" />
                          <div className="grid gap-6 md:grid-cols-2">
                            <div className="h-40 animate-pulse rounded-xl bg-muted" />
                            <div className="h-40 animate-pulse rounded-xl bg-muted" />
                          </div>
                          <div className="space-y-4">
                            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                          </div>
                        </div>
                      </main>
                      <Footer />
                    </div>
                  }
                >
                  <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/update-password" element={<UpdatePassword />} />
                  <Route path="/map" element={
                    <ProtectedRoute>
                      <Map />
                    </ProtectedRoute>
                  } />
                  <Route path="/video/:id" element={
                    <ProtectedRoute>
                      <Video />
                    </ProtectedRoute>
                  } />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/join" element={<Join />} />
                  <Route path="/payment-success" element={<PaymentSuccess />} />
                  <Route path="/payment-canceled" element={<PaymentCanceled />} />
                  <Route path="/payment-error" element={<PaymentError />} />
                  <Route path="/mypage" element={
                    <ProtectedRoute>
                      <MyPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/video-upload-info" element={
                    <ProtectedRoute>
                      <VideoUploadInfo />
                    </ProtectedRoute>
                  } />
                  <Route path="/dojos" element={<Dojos />} />
                  <Route path="/dojos/new" element={
                    <ProtectedRoute>
                      <DojoNew />
                    </ProtectedRoute>
                  } />
                  <Route path="/dojo/:id" element={<Dojo />} />
            <Route path="/athletes" element={<Athletes />} />
            <Route path="/lineage-tree" element={<LineageTree />} />
                  <Route path="/practice-records" element={
                    <ProtectedRoute>
                      <PracticeRecordsPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/athlete/:slugOrUsername" element={<Athlete />} />
                  <Route path="/ryozo" element={<Athlete />} />
                  <Route path="/:slugOrUsername" element={<DojoOrProfile />} />
                  <Route path="/founder-trial" element={<FounderTrial />} />
                  <Route path="/admin" element={<AdminLogin />} />
                  <Route path="/admin-dashboard" element={
                    <ProtectedRoute requireAdmin>
                      <AdminDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/dashboard" element={
                    <ProtectedRoute requireAdmin>
                      <AdminDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/generate-images" element={
                    <ProtectedRoute requireAdmin>
                      <GenerateImages />
                    </ProtectedRoute>
                  } />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <FloatingVideoPlayer />
              <GlobalMusicPlayer />
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
