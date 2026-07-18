import { BrowserRouter, Routes, Route, useLocation, Navigate, useParams } from 'react-router-dom';
import { LazyMotion, domAnimation } from 'framer-motion';
import { useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import AuditPage from './pages/AuditPage';
import ResultsPage from './pages/ResultsPage';
import ReAuditDiffPage from './pages/ReAuditDiffPage';
import NotFoundPage from './pages/NotFoundPage';
import ChatBot from './components/ChatBot';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function LegacyResultsRedirect() {
  const { id } = useParams();
  return <Navigate to={`/audit/${id}`} replace />;
}

function LegacyReauditRedirect() {
  const { id } = useParams();
  return <Navigate to={`/audit/${id}`} replace />;
}

export default function App() {
  return (
    <LazyMotion features={domAnimation} strict>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/audit/:id" element={<ResultsPage />} />
          <Route path="/audit/:id/diff" element={<ReAuditDiffPage />} />
          <Route path="/results/:id" element={<LegacyResultsRedirect />} />
          <Route path="/reaudit/:id" element={<LegacyReauditRedirect />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <ChatBot />
      </BrowserRouter>
    </LazyMotion>
  );
}

