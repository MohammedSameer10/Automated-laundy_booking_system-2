import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';
import './Admin.css';

const VALID_TRANSITIONS = {
    pending:     ['confirmed', 'cancelled'],
    confirmed:   ['in_progress', 'cancelled'],
    in_progress: ['completed'],
    completed:   [],
    cancelled:   []
};

function AdminBookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: '', status: 'all', startDate: '', endDate: '', deliveryType: ''
    });
    const [updating, setUpdating] = useState(null);

    useEffect(() => { loadBookings(); }, []);

    async function loadBookings() {
        setLoading(true);
        try {
            const params = {};
            if (filters.search) params.search = filters.search;
            if (filters.status !== 'all') params.status = filters.status;
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;
            if (filters.deliveryType) params.deliveryType = filters.deliveryType;

            const { bookings: data } = await api.getAdminBookings(params);
            setBookings(data);
        } catch (err) {
            console.error('Failed to load bookings:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleStatusChange(bookingId, newStatus) {
        setUpdating(bookingId);
        try {
            await api.updateBookingStatus(bookingId, newStatus);
            loadBookings();
        } catch (err) {
            alert(err.message || 'Failed to update status');
        } finally {
            setUpdating(null);
        }
    }

    function handleFilterChange(key, value) {
        setFilters(prev => ({ ...prev, [key]: value }));
    }

    function handleSearch(e) {
        e.preventDefault();
        loadBookings();
    }

    function formatTime(timeStr) {
        const [hours] = timeStr.split(':');
        const h = parseInt(hours);
        return `${h % 12 || 12}:00 ${h >= 12 ? 'PM' : 'AM'}`;
    }

    return (
        <AdminLayout>
            <div className="admin-page-header">
                <h1>Manage Bookings</h1>
                <p>View, search, and update all booking statuses</p>
            </div>

            <form className="admin-filters" onSubmit={handleSearch}>
                <input
                    type="text"
                    placeholder="Search by user, service, or notes..."
                    value={filters.search}
                    onChange={e => handleFilterChange('search', e.target.value)}
                    className="admin-search-input"
                />
                <select value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
                <input type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} />
                <input type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} />
                <select value={filters.deliveryType} onChange={e => handleFilterChange('deliveryType', e.target.value)}>
                    <option value="">All Delivery</option>
                    <option value="standard">Standard</option>
                    <option value="express">Express</option>
                </select>
                <button type="submit" className="btn btn-primary">Filter</button>
            </form>

            {loading ? (
                <div className="admin-loading"><div className="loading-spinner"></div><p>Loading bookings...</p></div>
            ) : (
                <div className="admin-card">
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>User</th>
                                    <th>Service</th>
                                    <th>Pickup</th>
                                    <th>Delivery</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bookings.map(b => {
                                    const transitions = VALID_TRANSITIONS[b.status] || [];
                                    return (
                                        <tr key={b.id}>
                                            <td className="td-mono">#{b.id}</td>
                                            <td>
                                                <div className="user-cell">
                                                    <span>{b.user_name}</span>
                                                    <small>{b.user_email}</small>
                                                </div>
                                            </td>
                                            <td>{b.service_name}</td>
                                            <td className="td-nowrap">{b.pickup_date}<br/><small>{formatTime(b.pickup_time)}</small></td>
                                            <td><span className={`delivery-badge ${b.delivery_type}`}>{b.delivery_type}</span></td>
                                            <td className="td-mono">${b.total_price.toFixed(2)}</td>
                                            <td><span className={`status-badge status-${b.status}`}>{b.status.replace('_', ' ')}</span></td>
                                            <td>
                                                {transitions.length > 0 ? (
                                                    <div className="action-buttons">
                                                        {transitions.map(t => (
                                                            <button
                                                                key={t}
                                                                className={`action-btn action-${t}`}
                                                                onClick={() => handleStatusChange(b.id, t)}
                                                                disabled={updating === b.id}
                                                            >
                                                                {t === 'confirmed' && 'Approve'}
                                                                {t === 'in_progress' && 'Pick Up'}
                                                                {t === 'completed' && 'Complete'}
                                                                {t === 'cancelled' && 'Cancel'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="no-actions">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {bookings.length === 0 && (
                                    <tr><td colSpan="8" className="td-empty">No bookings found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

export default AdminBookings;
