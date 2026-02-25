import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Layout from "@/components/Layout";
import HomePage from "@/pages/HomePage";
import ParticipantsPage from "@/pages/ParticipantsPage";
import ParticipantDetailPage from "@/pages/ParticipantDetailPage";
import BookingPage from "@/pages/BookingPage";
import ReviewsPage from "@/pages/ReviewsPage";
import FAQPage from "@/pages/FAQPage";
import TopicPage from "@/pages/TopicPage";
import LoginPage from "@/pages/admin/LoginPage";
import AdminLayout from "@/components/AdminLayout";
import DashboardPage from "@/pages/admin/DashboardPage";
import ApplicationsAdmin from "@/pages/admin/ApplicationsAdmin";
import ParticipantsAdmin from "@/pages/admin/ParticipantsAdmin";
import ReviewsAdmin from "@/pages/admin/ReviewsAdmin";
import FAQAdmin from "@/pages/admin/FAQAdmin";
import PagesAdmin from "@/pages/admin/PagesAdmin";
import SEOAdmin from "@/pages/admin/SEOAdmin";
import ContactsAdmin from "@/pages/admin/ContactsAdmin";
import SettingsAdmin from "@/pages/admin/SettingsAdmin";

function App() {
  return (
    <BrowserRouter>
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
        </Route>

        {/* Public Routes */}
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/uchastniki" element={<ParticipantsPage />} />
              <Route path="/uchastniki/:slug" element={<ParticipantDetailPage />} />
              <Route path="/zapis-na-priem" element={<BookingPage />} />
              <Route path="/otzyvy" element={<ReviewsPage />} />
              <Route path="/voprosy-i-otvety" element={<FAQPage />} />
              {/* Topic pages */}
              <Route path="/porcha" element={<TopicPage />} />
              <Route path="/proklyatie" element={<TopicPage />} />
              <Route path="/sglaz" element={<TopicPage />} />
              <Route path="/venets-bezbrachiya" element={<TopicPage />} />
              <Route path="/privorot" element={<TopicPage />} />
              <Route path="/zaklyatie" element={<TopicPage />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
