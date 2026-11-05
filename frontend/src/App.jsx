import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Loader from './components/Loader';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import TermsAndConditions from './pages/TermsAndConditions';
import Services from './pages/Services';
import ServiceView from './pages/ServiceView';
import TrendPostPage from './features/trends/TrendPostPage';

const PostJobPage = lazy(() => import('./features/openings/PostJobPage'));
const ExpiredJobsPage = lazy(() => import('./features/openings/ExpiredJobsPage'));

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="services" element={<Services />} />
        <Route path="services/:slug" element={<ServiceView />} />
        <Route path="post-job" element={<Suspense fallback={<Loader />}><PostJobPage /></Suspense>} />
        <Route path="company/expired-jobs" element={<Suspense fallback={<Loader />}><ExpiredJobsPage /></Suspense>} />
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
