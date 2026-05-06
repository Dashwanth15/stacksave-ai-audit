import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LazyMotion, domAnimation } from 'framer-motion';
import LandingPage from './pages/LandingPage';
import AuditPage from './pages/AuditPage';
import ResultsPage from './pages/ResultsPage';
import SharedAuditPage from './pages/SharedAuditPage';

export default function App() {
  return (
    <LazyMotion features={domAnimation} strict>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/results/:id" element={<ResultsPage />} />
          <Route path="/audit/:id" element={<SharedAuditPage />} />
          <Route path="*" element={
            <div className="min-h-screen grid-bg flex items-center justify-center text-center px-4">
              <div>
                <div className="text-6xl mb-4">🔍</div>
                <h1 className="text-3xl font-bold mb-4">Page not found</h1>
                <a href="/" className="text-indigo-400 hover:text-indigo-300">← Back to StackSave</a>
              </div>
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </LazyMotion>
  );
}
