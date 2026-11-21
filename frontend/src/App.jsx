import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { AppProvider } from './context/AppContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Todos from './pages/Todos.jsx';
import Files from './pages/Files.jsx';
import ActivityLogs from './pages/ActivityLogs.jsx';
import Toast from './components/Toast.jsx';
import './App.css';

const PROTECTED_ROUTES = [
  { path: '/', Page: Dashboard },
  { path: '/todos', Page: Todos },
  { path: '/files', Page: Files },
  { path: '/logs', Page: ActivityLogs },
];

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            {PROTECTED_ROUTES.map(({ path, Page }) => (
              <Route
                key={path}
                path={path}
                element={
                  <ProtectedRoute>
                    <Page />
                  </ProtectedRoute>
                }
              />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toast />
        </AppProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
