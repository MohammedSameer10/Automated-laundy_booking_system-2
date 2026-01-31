import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './BookingHistory.css';

function BookingHistory() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [cancelling, setCancelling] = useState(null);

    useEffect(() => {
        loadBookings();
    }, []);

    async function loadBookings() {
        try {
            const { bookings: fetchedBookings } = await api.getBookings();
            setBookings(fetchedBookings);
        } catch (err) {
            console.error('Failed to load bookings:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleCancel(bookingId) {
        if (!confirm('Are you sure you want to cancel this booking?')) return;
        
        setCancelling(bookingId);
        try {
            await api.cancelBooking(bookingId);
            loadBookings();
        } catch (err) {
            alert('Failed to cancel booking');
        } finally {
            setCancelling(null);
        }
    }

    function handleLogout() {
        logout();
        navigate('/');
    }

    function formatDate(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long', 
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

    function formatCreatedAt(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    const filteredBookings = filter === 'all' 
        ? bookings 
        : bookings.filter(b => b.status === filter);

    const statusCounts = {
        all: bookings.length,
        pending: bookings.filter(b => b.status === 'pending').length,
        confirmed: bookings.filter(b => b.status === 'confirmed').length,
        in_progress: bookings.filter(b => b.status === 'in_progress').length,
        completed: bookings.filter(b => b.status === 'completed').length,
        cancelled: bookings.filter(b => b.status === 'cancelled').length
    };

    return (
        <div className="bookings-page">
            <nav className="navbar">
                <div className="container navbar-content">
                    <Link to="/" className="logo">
                        <div className="logo-icon">🧺</div>
                        <span>LaundryVoice</span>
                    </Link>
                    <div className="nav-links">
                        <Link to="/dashboard" className="nav-link">Dashboard</Link>
                        <Link to="/bookings" className="nav-link active">My Bookings</Link>
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
                    <div className="page-header">
                        <h1 className="page-title">📋 Booking History</h1>
                        <p className="page-subtitle">View and manage all your laundry bookings</p>
                    </div>

                    <div className="filter-tabs">
                        {['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(status => (
                            <button
                                key={status}
                                className={`filter-tab ${filter === status ? 'active' : ''}`}
                                onClick={() => setFilter(status)}
                            >
                                <span className="filter-label">
                                    {status === 'all' ? 'All' : status.replace('_', ' ')}
                                </span>
                                <span className="filter-count">{statusCounts[status]}</span>
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="loading-state">
                            <div className="loading-spinner"></div>
                            <p>Loading your bookings...</p>
                        </div>
                    ) : filteredBookings.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📭</div>
                            <h3>No bookings found</h3>
                            <p>
                                {filter === 'all' 
                                    ? "You haven't made any bookings yet." 
                                    : `No ${filter.replace('_', ' ')} bookings.`}
                            </p>
                            <Link to="/dashboard" className="btn btn-primary">
                                Make a Booking
                            </Link>
                        </div>
                    ) : (
                        <div className="bookings-list">
                            {filteredBookings.map(booking => (
                                <div key={booking.id} className="booking-card">
                                    <div className="booking-card-header">
                                        <div className="booking-info">
                                            <h3>{booking.service_name}</h3>
                                            <span className={`status-badge status-${booking.status}`}>
                                                {booking.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div className="booking-price">
                                            ${booking.total_price.toFixed(2)}
                                        </div>
                                    </div>

                                    <div className="booking-card-body">
                                        <div className="booking-detail">
                                            <span className="detail-icon">📅</span>
                                            <div>
                                                <span className="detail-label">Pickup Date</span>
                                                <span className="detail-value">{formatDate(booking.pickup_date)}</span>
                                            </div>
                                        </div>
                                        <div className="booking-detail">
                                            <span className="detail-icon">⏰</span>
                                            <div>
                                                <span className="detail-label">Pickup Time</span>
                                                <span className="detail-value">{formatTime(booking.pickup_time)}</span>
                                            </div>
                                        </div>
                                        <div className="booking-detail">
                                            <span className="detail-icon">🚚</span>
                                            <div>
                                                <span className="detail-label">Delivery</span>
                                                <span className="detail-value">
                                                    {booking.delivery_type === 'express' ? 'Express (Same Day)' : 'Standard'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {booking.notes && (
                                        <div className="booking-notes">
                                            <span className="notes-label">Notes:</span> {booking.notes}
                                        </div>
                                    )}

                                    <div className="booking-card-footer">
                                        <span className="booking-created">
                                            Booked on {formatCreatedAt(booking.created_at)}
                                        </span>
                                        {(booking.status === 'pending' || booking.status === 'confirmed') && (
                                            <button
                                                className="btn btn-ghost cancel-btn"
                                                onClick={() => handleCancel(booking.id)}
                                                disabled={cancelling === booking.id}
                                            >
                                                {cancelling === booking.id ? 'Cancelling...' : 'Cancel Booking'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default BookingHistory;



