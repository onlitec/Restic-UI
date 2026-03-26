import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Snapshots from './pages/Snapshots';
import Jobs from './pages/Jobs';
import Schedules from './pages/Schedules';
import Users from './pages/Users';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh'
            }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <WebSocketProvider>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/" element={
                            <ProtectedRoute>
                                <Layout />
                            </ProtectedRoute>
                        }>
                            <Route index element={<Dashboard />} />
                            <Route path="snapshots" element={<Snapshots />} />
                            <Route path="jobs" element={<Jobs />} />
                            <Route path="schedules" element={<Schedules />} />
                            <Route path="users" element={<Users />} />
                        </Route>
                    </Routes>
                </WebSocketProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
