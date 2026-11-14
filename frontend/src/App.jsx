import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Loader from './components/Loader';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import TermsAndConditions from './pages/TermsAndConditions';
import Services from './pages/Services';
import ServiceView from './pages/ServiceView';
import TrendPostPage from './features/trends/TrendPostPage';
import { PeopleAuthForm, usePeopleAuth } from './context/PeopleAuthContext';
import { CompanyAuthForm } from './context/CompanyAuthContext';

const PostJobPage = lazy(() => import('./features/openings/PostJobPage'));
const ExpiredJobsPage = lazy(() => import('./features/openings/ExpiredJobsPage'));
const HappeningDetailsPage = lazy(() => import('./features/happenings/HappeningDetailsPage'));
const SuperAdminLogin = lazy(() => import('./features/super-admin/SuperAdminLogin'));
const SuperAdminDashboard = lazy(() => import('./features/super-admin/SuperAdminDashboard'));

function CompanyOnlyPage({ children }) {
  const { person } = usePeopleAuth();
  return person ? <Navigate to="/services/openings" replace /> : children;
}

function AccountPage() {
  const location = useLocation();
  const mode = location.pathname === '/sign-up' ? 'signup' : 'signin';
  return new URLSearchParams(location.search).get('type') === 'company'
    ? <CompanyAuthForm key={`company-${mode}`} initialMode={mode} unified />
    : <PeopleAuthForm key={`individual-${mode}`} initialMode={mode} unified />;
}

function LegacyAccountRedirect({ type, mode }) {
  const location = useLocation();
  return <Navigate to={`/${mode === 'signup' ? 'sign-up' : 'sign-in'}?type=${type}`} state={location.state} replace />;
}

function AccountRedirect() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  return <Navigate to={`/${params.get('mode') === 'signup' ? 'sign-up' : 'sign-in'}?type=${params.get('type') === 'company' ? 'company' : 'individual'}`} state={location.state} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="super-admin/login" element={<Suspense fallback={<Loader />}><SuperAdminLogin /></Suspense>} />
      <Route path="super-admin" element={<Suspense fallback={<Loader />}><SuperAdminDashboard /></Suspense>} />
      <Route path="super-admin/overview/:metric" element={<Suspense fallback={<Loader />}><SuperAdminDashboard mode="readonly-detail" /></Suspense>} />
      <Route path="super-admin/stories/new" element={<Suspense fallback={<Loader />}><SuperAdminDashboard mode="publish" /></Suspense>} />
      <Route path="super-admin/jobs/new" element={<Suspense fallback={<Loader />}><SuperAdminDashboard mode="create-job" /></Suspense>} />
      <Route path="super-admin/events/new" element={<Suspense fallback={<Loader />}><SuperAdminDashboard mode="create-event" /></Suspense>} />
      <Route path="super-admin/:section" element={<Suspense fallback={<Loader />}><SuperAdminDashboard /></Suspense>} />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="services" element={<Services />} />
        <Route path="services/happenings/:eventId" element={<Suspense fallback={<Loader />}><HappeningDetailsPage /></Suspense>} />
        <Route path="services/:slug" element={<ServiceView />} />
        <Route path="sign-in" element={<AccountPage />} />
        <Route path="sign-up" element={<AccountPage />} />
        <Route path="account" element={<AccountRedirect />} />
        <Route path="people/sign-up" element={<LegacyAccountRedirect type="individual" mode="signup" />} />
        <Route path="people/sign-in" element={<LegacyAccountRedirect type="individual" mode="signin" />} />
        <Route path="company/sign-up" element={<LegacyAccountRedirect type="company" mode="signup" />} />
        <Route path="company/sign-in" element={<LegacyAccountRedirect type="company" mode="signin" />} />
        <Route path="post-job" element={<CompanyOnlyPage><Suspense fallback={<Loader />}><PostJobPage /></Suspense></CompanyOnlyPage>} />
        <Route path="company/expired-jobs" element={<CompanyOnlyPage><Suspense fallback={<Loader />}><ExpiredJobsPage /></Suspense></CompanyOnlyPage>} />
        <Route path="contact" element={<Contact />} />
        <Route path="terms-and-conditions" element={<TermsAndConditions />} />
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route
          path="/services/trends/:slug"
          element={<TrendPostPage />}
        />
      </Route>
    </Routes>
  );
}
