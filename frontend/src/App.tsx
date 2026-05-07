import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LazyMotion, domAnimation } from 'framer-motion';
import LandingPage from './pages/LandingPage';
import AuditPage from './pages/AuditPage';
import ResultsPage from './pages/ResultsPage';
import SharedAuditPage from './pages/SharedAuditPage';
import NotFoundPage from './pages/NotFoundPage';
import ChatBot from './components/ChatBot';

export default function App() {
  return (
    <LazyMotion features={domAnimation} strict>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/results/:id" element={<ResultsPage />} />
          <Route path="/audit/:id" element={<SharedAuditPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <ChatBot />
      </BrowserRouter>
    </LazyMotion>
  );
}
