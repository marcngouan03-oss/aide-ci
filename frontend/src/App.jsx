import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { PageLoader } from './components/ui/index';
import SplashScreen from './components/SplashScreen';

// Auth
import { LoginPage, RegisterPage } from './pages/auth/AuthPages';

// Demandeur
import HomePage from './pages/demandeur/HomePage';
import MapPage  from './pages/demandeur/MapPage';
import ChatPage from './pages/demandeur/ChatPage';
import {
  PaymentPage, TrackingPage, MissionsPage, PrestataireProfilePage
} from './pages/demandeur/Pages';

// Prestataire + shared
import { PrestataireDashboard, ProfilePage } from './pages/prestataire/Pages';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';

// ── ROUTE GUARDS ──────────────────────────────────────────────
function redirect(role) {
  if (role === 'admin')       return '/admin';
  if (role === 'prestataire') return '/dashboard';
  return '/home';
}

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader/>;
  if (!user) return <Navigate to="/login" replace/>;
  if (roles && !roles.includes(user.role)) return <Navigate to={redirect(user.role)} replace/>;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader/>;
  if (user) return <Navigate to={redirect(user.role)} replace/>;
  return children;
}

// ── ROUTES ────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={<PublicRoute><LoginPage/></PublicRoute>}/>
      <Route path="/register" element={<PublicRoute><RegisterPage/></PublicRoute>}/>

      {/* Demandeur */}
      <Route path="/home"              element={<PrivateRoute roles={['demandeur']}><HomePage/></PrivateRoute>}/>
      <Route path="/map"               element={<PrivateRoute roles={['demandeur','prestataire']}><MapPage/></PrivateRoute>}/>
      <Route path="/chat/:userId"      element={<PrivateRoute><ChatPage/></PrivateRoute>}/>
      <Route path="/payment/:missionId" element={<PrivateRoute roles={['demandeur']}><PaymentPage/></PrivateRoute>}/>
      <Route path="/tracking/:missionId" element={<PrivateRoute><TrackingPage/></PrivateRoute>}/>
      <Route path="/missions"          element={<PrivateRoute><MissionsPage/></PrivateRoute>}/>
      <Route path="/prestataire/:id"   element={<PrivateRoute><PrestataireProfilePage/></PrivateRoute>}/>

      {/* Prestataire */}
      <Route path="/dashboard" element={<PrivateRoute roles={['prestataire']}><PrestataireDashboard/></PrivateRoute>}/>

      {/* Admin */}
      <Route path="/admin" element={<PrivateRoute roles={['admin']}><AdminDashboard/></PrivateRoute>}/>

      {/* Shared */}
      <Route path="/profile" element={<PrivateRoute><ProfilePage/></PrivateRoute>}/>

      {/* Redirects */}
      <Route path="/"   element={<Navigate to="/login" replace/>}/>
      <Route path="*"   element={<Navigate to="/login" replace/>}/>
    </Routes>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────
export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const onSplashDone = useCallback(() => setSplashDone(true), []);

  return (
    <>
      {!splashDone && <SplashScreen onDone={onSplashDone}/>}
      <div style={{ visibility: splashDone ? 'visible' : 'hidden' }}>
        <BrowserRouter>
          <AuthProvider>
            <SocketProvider>
              <AppRoutes/>
            </SocketProvider>
          </AuthProvider>
        </BrowserRouter>
      </div>
    </>
  );
}
