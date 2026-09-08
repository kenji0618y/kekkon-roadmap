import { HashRouter, Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import { AmbientBg } from './components/fx/AmbientBg';
import { BottomNav } from './components/BottomNav';
import { useAppState } from './hooks/useAppState';
import { Edit } from './pages/Edit';
import { Roadmap } from './pages/Roadmap';
import { StampDetail } from './pages/StampDetail';

function PreserveRedirect({ to }: { to: string }) {
  const [params] = useSearchParams();
  const q = params.toString();
  return <Navigate to={q ? `${to}?${q}` : to} replace />;
}

export default function App() {
  const state = useAppState();

  return (
    <HashRouter>
      <div className="app-shell">
        <AmbientBg />
        <div className="app-content">
          <Routes>
            <Route path="/" element={<Roadmap state={state} />} />
            <Route path="/deadlines" element={<Roadmap state={state} />} />
            <Route path="/know" element={<Roadmap state={state} />} />
            <Route path="/stamps" element={<Navigate to="/" replace />} />
            <Route path="/stamp/:id" element={<StampDetail state={state} />} />
            <Route path="/map" element={<Navigate to="/" replace />} />
            <Route path="/map/deadlines" element={<Navigate to="/deadlines" replace />} />
            <Route path="/map/know" element={<PreserveRedirect to="/know" />} />
            <Route path="/edit" element={<Edit state={state} />} />
            <Route path="/now" element={<Navigate to="/" replace />} />
            <Route path="/timeline" element={<Navigate to="/" replace />} />
            <Route path="/search" element={<PreserveRedirect to="/know" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </HashRouter>
  );
}
