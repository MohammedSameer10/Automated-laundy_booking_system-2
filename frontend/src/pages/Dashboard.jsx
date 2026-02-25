import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import VoiceChat from '../components/VoiceChat';
import BookingForm from '../components/BookingForm';
import api from '../services/api';
import './Dashboard.css';

function Dashboard() {
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [activeBookings, setActiveBookings] = useState([]);
    const [recentBooking, setRecentBooking] = useState(null);
    const [showBookingForm, setShowBookingForm] = useState(false);
    const [bookingMode, setBookingMode] = useState('voice'); // 'voice' or 'form'
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadActiveBookings();
    }, []);

    async function loadActiveBookings() {
        try {
            const { bookings } = await api.getBookings();
            const active = bookings.filter(b => 
                b.status === 'pending' || b.status === 'confirmed' || b.status === 'in_progress'
            );
            setActiveBookings(active.slice(0, 3));
        } catch (err) {
            console.error('Failed to load bookings:', err);
        } finally {
            setLoading(false);
        }
    }

    function handleBookingCreated(booking) {
        setRecentBooking(booking);
        setShowBookingForm(false);
        loadActiveBookings();
        
        // Clear recent booking notification after 5 seconds
        setTimeout(() => setRecentBooking(null), 5000);
    }

    function handleLogout() {
        logout();
        navigate('/');
    }

    function formatDate(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', { 
            weekday: 'short',
            month: 'short', 
            day: 'numeric' 
        });
    }

    function formatTime(timeStr) {
        const [hours] = timeStr.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:00 ${ampm}`;
    }

    return (
        <div className="dashboard-page">
            <nav className="navbar">
                <div className="container navbar-content">
                    <Link to="/" className="logo">
                        <div className="logo-icon">🧺</div>
                        <span>Laundry Voice Booking System</span>
                    </Link>
                    <div className="nav-links">
                        <Link to="/dashboard" className="nav-link active">Dashboard</Link>
                        <Link to="/bookings" className="nav-link">My Bookings</Link>
                        {isAdmin && <Link to="/admin" className="nav-link admin-link">Admin Panel</Link>}
                        <div className="user-menu">
                            <div className="user-greeting">
                                <div className="user-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
                                <span className="user-name">{user?.name}</span>
                            </div>
                            <button className="btn btn-ghost" onClick={handleLogout}>
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="main-content">
                <div className="container">
                    {recentBooking && (
                        <div className="booking-success-banner">
                            <span>✅</span>
                            <p>
                                <strong>Booking confirmed!</strong> {recentBooking.service_name} scheduled for {formatDate(recentBooking.pickup_date)} at {formatTime(recentBooking.pickup_time)}
                            </p>
                        </div>
                    )}

                    <div className="dashboard-header">
                        <div>
                            <h1>Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
                            <p>Book your laundry service using voice or the form below</p>
                        </div>
                        <div className="booking-mode-toggle">
                            <button 
                                className={`mode-btn ${bookingMode === 'voice' ? 'active' : ''}`}
                                onClick={() => setBookingMode('voice')}
                            >
                                🎤 Voice
                            </button>
                            <button 
                                className={`mode-btn ${bookingMode === 'form' ? 'active' : ''}`}
                                onClick={() => setBookingMode('form')}
                            >
                                📝 Form
                            </button>
                        </div>
                    </div>

                    <div className="dashboard-grid">
                        <div className="dashboard-main">
                            {bookingMode === 'voice' ? (
                                <VoiceChat onBookingCreated={handleBookingCreated} />
                            ) : (
                                <BookingForm onBookingCreated={handleBookingCreated} />
                            )}
                        </div>

                        <div className="dashboard-sidebar">
                            <div className="sidebar-card">
                                <div className="sidebar-card-header">
                                    <h3>📋 Active Bookings</h3>
                                    <Link to="/bookings" className="view-all">View all →</Link>
                                </div>
                                
                                {loading ? (
                                    <div className="loading-state">Loading...</div>
                                ) : activeBookings.length === 0 ? (
                                    <div className="empty-sidebar">
                                        <p>No active bookings</p>
                                        <small>Start by booking a service!</small>
                                    </div>
                                ) : (
                                    <div className="booking-list">
                                        {activeBookings.map(booking => (
                                            <div key={booking.id} className="booking-item">
                                                <div className="booking-item-header">
                                                    <span className="booking-service">{booking.service_name}</span>
                                                    <span className={`status-badge status-${booking.status}`}>
                                                        {booking.status}
                                                    </span>
                                                </div>
                                                <div className="booking-item-details">
                                                    <span>📅 {formatDate(booking.pickup_date)}</span>
                                                    <span>⏰ {formatTime(booking.pickup_time)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="sidebar-card tips-card">
                                <h3>💡 Voice Tips</h3>
                                <ul>
                                    <li>"Book wash and fold for tomorrow at 2 PM"</li>
                                    <li>"Schedule dry cleaning for Saturday"</li>
                                    <li>"I need express delivery"</li>
                                    <li>"Cancel my booking"</li>
                                </ul>
                            </div>

                            <div className="sidebar-card stats-card">
                                <h3>📊 Quick Stats</h3>
                                <div className="stats-grid">
                                    <div className="stat">
                                        <span className="stat-value">{activeBookings.length}</span>
                                        <span className="stat-label">Active</span>
                                    </div>
                                    <div className="stat">
                                        <span className="stat-value">$0</span>
                                        <span className="stat-label">Saved</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Dashboard;



