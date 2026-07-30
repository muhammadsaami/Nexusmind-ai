import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import DashboardPage from './pages/Dashboard/DashboardPage';
import ChatPage from './pages/Chat/ChatPage';
import DocumentsPage from './pages/Documents/DocumentsPage';
import RetrievalPage from './pages/Retrieval/RetrievalPage';
import AnalyticsPage from './pages/Analytics/AnalyticsPage';
import GuardrailsPage from './pages/Guardrails/GuardrailsPage';
import SettingsPage from './pages/Settings/SettingsPage';
import LoginPage from './pages/Login/LoginPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/retrieval" element={<RetrievalPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/guardrails" element={<GuardrailsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}