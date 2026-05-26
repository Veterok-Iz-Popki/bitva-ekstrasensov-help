import "@/App.css";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import { Toaster } from "@/components/ui/sonner";
import Layout from "@/components/Layout";
import HomePage from "@/pages/HomePage";

// === Public pages — lazy (below-the-fold / non-landing) ===
const ParticipantDetailPage = lazy(() => import("@/pages/ParticipantDetailPage"));
const BookingPage = lazy(() => import("@/pages/BookingPage"));
const FAQPage = lazy(() => import("@/pages/FAQPage"));
const TopicPage = lazy(() => import("@/pages/TopicPage"));
const ServicePage = lazy(() => import("@/pages/ServicePage"));
const GalleryPage = lazy(() => import("@/pages/GalleryPage"));
const VideoPage = lazy(() => import("@/pages/VideoPage"));

// === Admin pages — lazy (only loaded when admin opens /admin/*) ===
const LoginPage = lazy(() => import("@/pages/admin/LoginPage"));
const AdminLayout = lazy(() => import("@/components/AdminLayout"));
const DashboardPage = lazy(() => import("@/pages/admin/DashboardPage"));
const ApplicationsAdmin = lazy(() => import("@/pages/admin/ApplicationsAdmin"));
const ParticipantsAdmin = lazy(() => import("@/pages/admin/ParticipantsAdmin"));
const ReviewsAdmin = lazy(() => import("@/pages/admin/ReviewsAdmin"));
const FAQAdmin = lazy(() => import("@/pages/admin/FAQAdmin"));
const PagesAdmin = lazy(() => import("@/pages/admin/PagesAdmin"));
const SEOAdmin = lazy(() => import("@/pages/admin/SEOAdmin"));
const ContactsAdmin = lazy(() => import("@/pages/admin/ContactsAdmin"));
const SettingsAdmin = lazy(() => import("@/pages/admin/SettingsAdmin"));
const GalleryAdmin = lazy(() => import("@/pages/admin/GalleryAdmin"));
const VideoAdmin = lazy(() => import("@/pages/admin/VideoAdmin"));

// Fallback в стиле существующих loading-экранов
function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center pt-20" data-testid="route-suspense">
      <div className="text-white/40 font-body">Загрузка...</div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0a0a0a',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#ededed',
          },
        }}
      />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Admin Routes */}
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="applications" element={<ApplicationsAdmin />} />
            <Route path="participants" element={<ParticipantsAdmin />} />
            <Route path="reviews" element={<ReviewsAdmin />} />
            <Route path="faq" element={<FAQAdmin />} />
            <Route path="pages" element={<PagesAdmin />} />
            <Route path="seo" element={<SEOAdmin />} />
            <Route path="contacts" element={<ContactsAdmin />} />
            <Route path="settings" element={<SettingsAdmin />} />
            <Route path="gallery" element={<GalleryAdmin />} />
            <Route path="video" element={<VideoAdmin />} />
          </Route>

          {/* Public Routes */}
          <Route path="/*" element={
            <Layout>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/uchastniki/:slug" element={<ParticipantDetailPage />} />
                  <Route path="/zapis-na-priem" element={<BookingPage />} />
                  <Route path="/voprosy-i-otvety" element={<FAQPage />} />
                  {/* Topic pages */}
                  <Route path="/porcha" element={<TopicPage />} />
                  <Route path="/proklyatie" element={<TopicPage />} />
                  <Route path="/sglaz" element={<TopicPage />} />
                  <Route path="/venets-bezbrachiya" element={<TopicPage />} />
                  <Route path="/privorot" element={<TopicPage />} />
                  <Route path="/zaklyatie" element={<TopicPage />} />
                  {/* Service pages */}
                  <Route path="/finansovaya-magiya" element={<ServicePage />} />
                  <Route path="/lyubovnaya-magiya" element={<ServicePage />} />
                  <Route path="/magiya-zhizni" element={<ServicePage />} />
                  <Route path="/magicheskaya-zashchita" element={<ServicePage />} />
                  <Route path="/foto-galereya" element={<GalleryPage />} />
                  <Route path="/video" element={<VideoPage />} />
                </Routes>
              </Suspense>
            </Layout>
          } />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
