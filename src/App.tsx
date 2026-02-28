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
import { LanguageRoute } from "./components/LanguageRoute";
import { GoogleAnalytics } from "./components/GoogleAnalytics";
import { UploadProvider } from "./contexts/UploadContext";
import { GlobalUploadIndicator } from "./components/GlobalUploadIndicator";
import TrialBanner from "./components/TrialBanner";

// Lazy load route components for better performance
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Logout = lazy(() => import("./pages/Logout"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const UpdatePassword = lazy(() => import("./pages/UpdatePassword"));
const Map = lazy(() => import("./pages/Map"));
const MapLegacy = lazy(() => import("./pages/MapLegacy"));
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
const Tournaments = lazy(() => import("./pages/Tournaments"));
const TournamentDetail = lazy(() => import("./pages/TournamentDetail"));
const Venues = lazy(() => import("./pages/Venues"));
const VenueDetail = lazy(() => import("./pages/VenueDetail"));
const OrganizationDetail = lazy(() => import("./pages/OrganizationDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Glossary = lazy(() => import("./pages/Glossary"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Blog = lazy(() => import("./pages/Blog"));
const VideoList = lazy(() => import("./pages/VideoList"));
const TranscriptionDetail = lazy(() => import("./pages/TranscriptionDetail"));
const SharedVideo = lazy(() => import("./pages/SharedVideo"));
const OAuthAuthorize = lazy(() => import("./pages/OAuthAuthorize"));
const TechniqueEdit = lazy(() => import("./pages/TechniqueEdit"));
const Curriculum = lazy(() => import("./pages/Curriculum"));
const KataJudge = lazy(() => import("./pages/KataJudge"));

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="system" storageKey="jiuflow-theme" enableSystem={false}>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Sonner position="top-center" richColors closeButton />
            <BrowserRouter>
              <AuthProvider>
                <FloatingVideoProvider>
                <MusicProvider>
                <UploadProvider>
                <RoutePrefetcher />
                <GoogleAnalytics />
                <TrialBanner />
                <Routes>
                  {/* Language prefixed routes - only match valid 2-letter language codes */}
                  <Route path="/:lang" element={<LanguageRoute />}>
                    <Route index element={<SuspenseWrapper><Home /></SuspenseWrapper>} />
                    <Route path="login" element={<SuspenseWrapper><Login /></SuspenseWrapper>} />
                    <Route path="logout" element={<SuspenseWrapper><Logout /></SuspenseWrapper>} />
                    <Route path="reset-password" element={<SuspenseWrapper><ResetPassword /></SuspenseWrapper>} />
                    <Route path="update-password" element={<SuspenseWrapper><UpdatePassword /></SuspenseWrapper>} />
                    <Route path="about" element={<SuspenseWrapper><About /></SuspenseWrapper>} />
                    <Route path="contact" element={<SuspenseWrapper><Contact /></SuspenseWrapper>} />
                    <Route path="join" element={<SuspenseWrapper><Join /></SuspenseWrapper>} />
                    <Route path="payment-success" element={<SuspenseWrapper><PaymentSuccess /></SuspenseWrapper>} />
                    <Route path="payment-canceled" element={<SuspenseWrapper><PaymentCanceled /></SuspenseWrapper>} />
                    <Route path="payment-error" element={<SuspenseWrapper><PaymentError /></SuspenseWrapper>} />
                    <Route path="founder-trial" element={<SuspenseWrapper><FounderTrial /></SuspenseWrapper>} />
                    <Route path="shop" element={<SuspenseWrapper><Shop /></SuspenseWrapper>} />
                    <Route path="privacy" element={<SuspenseWrapper><PrivacyPolicy /></SuspenseWrapper>} />
                    <Route path="terms" element={<SuspenseWrapper><Terms /></SuspenseWrapper>} />
                    <Route path="glossary" element={<SuspenseWrapper><Glossary /></SuspenseWrapper>} />
                    <Route path="faq" element={<SuspenseWrapper><FAQ /></SuspenseWrapper>} />
                    <Route path="blog" element={<SuspenseWrapper><Blog /></SuspenseWrapper>} />
                    <Route path="curriculum" element={<SuspenseWrapper><Curriculum /></SuspenseWrapper>} />
                    <Route path="tournaments" element={<SuspenseWrapper><Tournaments /></SuspenseWrapper>} />
                    <Route path="tournaments/:year/:slug" element={<SuspenseWrapper><TournamentDetail /></SuspenseWrapper>} />
                    <Route path="venues" element={<SuspenseWrapper><Venues /></SuspenseWrapper>} />
                    <Route path="venue/:id" element={<SuspenseWrapper><VenueDetail /></SuspenseWrapper>} />
                    <Route path="organization/:slug" element={<SuspenseWrapper><OrganizationDetail /></SuspenseWrapper>} />
                    <Route path="map" element={
                      <ProtectedRoute>
                        <SuspenseWrapper variant="map"><MapLegacy /></SuspenseWrapper>
                      </ProtectedRoute>
                    } />
                    <Route path="map/new" element={
                      <ProtectedRoute>
                        <SuspenseWrapper variant="map"><Map /></SuspenseWrapper>
                      </ProtectedRoute>
                    } />
                    <Route path="dojos" element={<SuspenseWrapper variant="map"><Dojos /></SuspenseWrapper>} />
                    <Route path="athletes" element={<SuspenseWrapper variant="map"><Athletes /></SuspenseWrapper>} />
                    <Route path="lineage-tree" element={<SuspenseWrapper variant="map"><LineageTree /></SuspenseWrapper>} />
                    <Route path="video/:id" element={
                      <SuspenseWrapper variant="video"><Video /></SuspenseWrapper>
                    } />
                    <Route path="lists/:slug" element={<SuspenseWrapper variant="map"><VideoList /></SuspenseWrapper>} />
                    <Route path="video-upload-info" element={
                      <ProtectedRoute>
                        <SuspenseWrapper variant="video"><VideoUploadInfo /></SuspenseWrapper>
                      </ProtectedRoute>
                    } />
                    <Route path="mypage" element={
                      <ProtectedRoute>
                        <SuspenseWrapper variant="profile"><MyPage /></SuspenseWrapper>
                      </ProtectedRoute>
                    } />
                    <Route path="dojos/new" element={
                      <ProtectedRoute>
                        <SuspenseWrapper variant="profile"><DojoNew /></SuspenseWrapper>
                      </ProtectedRoute>
                    } />
                    <Route path="dojo/:id" element={<SuspenseWrapper variant="profile"><Dojo /></SuspenseWrapper>} />
                    <Route path="athlete/:slugOrUsername" element={<SuspenseWrapper variant="profile"><Athlete /></SuspenseWrapper>} />
                    <Route path="ryozo" element={<SuspenseWrapper variant="profile"><Athlete /></SuspenseWrapper>} />
                    <Route path="practice-records" element={
                      <ProtectedRoute>
                        <SuspenseWrapper variant="map"><PracticeRecordsPage /></SuspenseWrapper>
                      </ProtectedRoute>
                    } />
                    <Route path="open-mat" element={
                      <ProtectedRoute>
                        <SuspenseWrapper variant="map"><OpenMatPage /></SuspenseWrapper>
                      </ProtectedRoute>
                    } />
                    <Route path="kata-judge" element={<SuspenseWrapper><KataJudge /></SuspenseWrapper>} />
                    <Route path="admin" element={<SuspenseWrapper variant="admin"><AdminLogin /></SuspenseWrapper>} />
                    <Route path="admin-dashboard" element={
                      <ProtectedRoute requireAdmin>
                        <SuspenseWrapper variant="admin"><AdminStats /></SuspenseWrapper>
                      </ProtectedRoute>
                    } />
                    <Route path="admin/dashboard" element={
                      <ProtectedRoute requireAdmin>
                        <SuspenseWrapper variant="admin"><AdminStats /></SuspenseWrapper>
                      </ProtectedRoute>
                    } />
                    <Route path="admin/techniques" element={
                      <ProtectedRoute requireAdmin>
                        <SuspenseWrapper variant="admin"><AdminDashboard /></SuspenseWrapper>
                      </ProtectedRoute>
                    } />
                    <Route path="admin/technique/:id" element={
                      <ProtectedRoute requireAdmin>
                        <SuspenseWrapper variant="admin"><TechniqueEdit /></SuspenseWrapper>
                      </ProtectedRoute>
                    } />
                    <Route path="admin/transcription/:id" element={
                      <ProtectedRoute requireAdmin>
                        <SuspenseWrapper variant="admin"><TranscriptionDetail /></SuspenseWrapper>
                      </ProtectedRoute>
                    } />
                    <Route path="generate-images" element={
                      <ProtectedRoute requireAdmin>
                        <SuspenseWrapper variant="admin"><GenerateImages /></SuspenseWrapper>
                      </ProtectedRoute>
                    } />
                    {/* Profile/Dojo slug - must be last in language routes */}
                    <Route path=":slugOrUsername" element={<SuspenseWrapper variant="profile"><DojoOrProfile /></SuspenseWrapper>} />
                  </Route>

                  {/* Default pages (no language prefix) */}
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
                  <Route path="/glossary" element={<SuspenseWrapper><Glossary /></SuspenseWrapper>} />
                  <Route path="/faq" element={<SuspenseWrapper><FAQ /></SuspenseWrapper>} />
                  <Route path="/blog" element={<SuspenseWrapper><Blog /></SuspenseWrapper>} />
                  <Route path="/curriculum" element={<SuspenseWrapper><Curriculum /></SuspenseWrapper>} />
                  <Route path="/tournaments" element={<SuspenseWrapper><Tournaments /></SuspenseWrapper>} />
                  <Route path="/tournaments/:year/:slug" element={<SuspenseWrapper><TournamentDetail /></SuspenseWrapper>} />
                  <Route path="/venues" element={<SuspenseWrapper><Venues /></SuspenseWrapper>} />
                  <Route path="/venue/:id" element={<SuspenseWrapper><VenueDetail /></SuspenseWrapper>} />
                  <Route path="/organization/:slug" element={<SuspenseWrapper><OrganizationDetail /></SuspenseWrapper>} />

                  {/* Map/Video grid pages */}
                  <Route path="/map" element={
                    <ProtectedRoute>
                      <SuspenseWrapper variant="map"><MapLegacy /></SuspenseWrapper>
                    </ProtectedRoute>
                   } />
                  <Route path="/map/new" element={
                    <ProtectedRoute>
                      <SuspenseWrapper variant="map"><Map /></SuspenseWrapper>
                    </ProtectedRoute>
                  } />
                  <Route path="/dojos" element={<SuspenseWrapper variant="map"><Dojos /></SuspenseWrapper>} />
                  <Route path="/athletes" element={<SuspenseWrapper variant="map"><Athletes /></SuspenseWrapper>} />
                  <Route path="/lineage-tree" element={<SuspenseWrapper variant="map"><LineageTree /></SuspenseWrapper>} />

                  {/* Video pages */}
                  <Route path="/video/:id" element={
                    <SuspenseWrapper variant="video"><Video /></SuspenseWrapper>
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
                  <Route path="/lists/:slug" element={<SuspenseWrapper variant="map"><VideoList /></SuspenseWrapper>} />
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
                  <Route path="/kata-judge" element={<SuspenseWrapper><KataJudge /></SuspenseWrapper>} />

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
                  <Route path="/admin/technique/:id" element={
                    <ProtectedRoute requireAdmin>
                      <SuspenseWrapper variant="admin"><TechniqueEdit /></SuspenseWrapper>
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/transcription/:id" element={
                    <ProtectedRoute requireAdmin>
                      <SuspenseWrapper variant="admin"><TranscriptionDetail /></SuspenseWrapper>
                    </ProtectedRoute>
                  } />
                  <Route path="/generate-images" element={
                    <ProtectedRoute requireAdmin>
                      <SuspenseWrapper variant="admin"><GenerateImages /></SuspenseWrapper>
                    </ProtectedRoute>
                  } />

                  {/* Shared Video - public access via share token */}
                  <Route path="/shared/:token" element={<SuspenseWrapper variant="video"><SharedVideo /></SuspenseWrapper>} />

                  {/* 404 */}
                  <Route path="*" element={<SuspenseWrapper><NotFound /></SuspenseWrapper>} />
                </Routes>
              <FloatingVideoPlayer />
              <GlobalMusicPlayer />
              <GlobalUploadIndicator />
              <CookieConsentBanner />
            </UploadProvider>
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
