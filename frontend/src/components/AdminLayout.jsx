import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminLayout.css';

function AdminLayout({ children }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    function handleLogout() {
        logout();
        navigate('/');
    }

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="admin-sidebar-header">
                    <Link to="/admin" className="admin-logo">
                        <div className="admin-logo-icon">🧺</div>
                        <span>LaundryVoice</span>
                    </Link>
                    <div className="admin-badge">Admin</div>
                </div>

                <nav className="admin-nav">
                    <NavLink to="/admin" end className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <span className="nav-icon">📊</span>
                        <span>Dashboard</span>
                    </NavLink>
                    <NavLink to="/admin/bookings" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <span className="nav-icon">📋</span>
                        <span>Bookings</span>
                    </NavLink>
                    <NavLink to="/admin/services" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <span className="nav-icon">🧺</span>
                        <span>Services</span>
                    </NavLink>
                    <NavLink to="/admin/users" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <span className="nav-icon">👥</span>
                        <span>Users</span>
                    </NavLink>
                </nav>

                <div className="admin-sidebar-footer">
                    <Link to="/dashboard" className="admin-nav-item back-link">
                        <span className="nav-icon">←</span>
                        <span>User Dashboard</span>
                    </Link>
                    <div className="admin-user">
                        <div className="admin-user-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
                        <div className="admin-user-info">
                            <span className="admin-user-name">{user?.name}</span>
                            <span className="admin-user-email">{user?.email}</span>
                        </div>
                    </div>
                    <button className="btn btn-ghost admin-logout" onClick={handleLogout}>
                        Sign Out
                    </button>
                </div>
            </aside>

            <main className="admin-main">
                {children}
            </main>
        </div>
    );
}

export default AdminLayout;
