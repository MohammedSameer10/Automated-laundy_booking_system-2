import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import BookingHistory from './pages/BookingHistory';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminBookings from './pages/admin/AdminBookings';
import AdminServices from './pages/admin/AdminServices';
import AdminUsers from './pages/admin/AdminUsers';
import './App.css';

function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return <LoadingScreen />;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return children;
}

function AdminRoute({ children }) {
    const { isAuthenticated, isAdmin, loading } = useAuth();
    if (loading) return <LoadingScreen />;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (!isAdmin) return <Navigate to="/dashboard" replace />;
    return children;
}

function PublicRoute({ children }) {
    const { isAuthenticated, isAdmin, loading } = useAuth();
    if (loading) return <LoadingScreen />;
    if (isAuthenticated) {
        return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />;
    }
    return children;
}

function LoadingScreen() {
    return (
        <div className="loading-screen">
            <div className="loading-spinner"></div>
            <p>Loading...</p>
        </div>
    );
}

function App() {
    return (
        <div className="app">
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/bookings" element={<ProtectedRoute><BookingHistory /></ProtectedRoute>} />

                {/* Admin routes */}
                <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                <Route path="/admin/bookings" element={<AdminRoute><AdminBookings /></AdminRoute>} />
                <Route path="/admin/services" element={<AdminRoute><AdminServices /></AdminRoute>} />
                <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}

export default App;
