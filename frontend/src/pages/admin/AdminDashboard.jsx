import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';
import './Admin.css';

function AdminDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    async function loadDashboard() {
        try {
            const d = await api.getAdminDashboard();
            setData(d);
        } catch (err) {
            console.error('Failed to load admin dashboard:', err);
        } finally {
            setLoading(false);
        }
    }

    function formatTime(timeStr) {
        const [hours] = timeStr.split(':');
        const h = parseInt(hours);
        return `${h % 12 || 12}:00 ${h >= 12 ? 'PM' : 'AM'}`;
    }

    if (loading) {
        return (
            <AdminLayout>
                <div className="admin-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading dashboard...</p>
                </div>
            </AdminLayout>
        );
    }

    const { stats, statusBreakdown, revenueByService, recentBookings } = data || {};
    const maxRevenue = Math.max(...(revenueByService || []).map(s => s.revenue), 1);

    return (
        <AdminLayout>
            <div className="admin-page-header">
                <h1>Admin Dashboard</h1>
                <p>Overview of your laundry business</p>
            </div>

            <div className="stats-cards">
                <div className="stat-card">
                    <div className="stat-card-icon blue">📋</div>
                    <div>
                        <div className="stat-card-value">{stats?.totalBookings || 0}</div>
                        <div className="stat-card-label">Total Bookings</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon green">💰</div>
                    <div>
                        <div className="stat-card-value">${(stats?.revenue || 0).toFixed(2)}</div>
                        <div className="stat-card-label">Revenue</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon purple">👥</div>
                    <div>
                        <div className="stat-card-value">{stats?.totalUsers || 0}</div>
                        <div className="stat-card-label">Users</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon orange">⏳</div>
                    <div>
                        <div className="stat-card-value">{stats?.pendingApprovals || 0}</div>
                        <div className="stat-card-label">Pending Approval</div>
                    </div>
                </div>
            </div>

            <div className="admin-grid-2">
                <div className="admin-card">
                    <div className="admin-card-header">
                        <h3>Booking Status Breakdown</h3>
                    </div>
                    <div className="status-bars">
                        {(statusBreakdown || []).map(s => (
                            <div key={s.status} className="status-bar-row">
                                <span className={`status-badge status-${s.status}`}>{s.status.replace('_', ' ')}</span>
                                <div className="status-bar-track">
                                    <div
                                        className={`status-bar-fill status-fill-${s.status}`}
                                        style={{ width: `${(s.count / (stats?.totalBookings || 1)) * 100}%` }}
                                    ></div>
                                </div>
                                <span className="status-bar-count">{s.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="admin-card">
                    <div className="admin-card-header">
                        <h3>Revenue by Service</h3>
                    </div>
                    <div className="revenue-bars">
                        {(revenueByService || []).map(s => (
                            <div key={s.name} className="revenue-bar-row">
                                <div className="revenue-label">
                                    <span>{s.name}</span>
                                    <span className="revenue-amount">${s.revenue.toFixed(2)}</span>
                                </div>
                                <div className="revenue-bar-track">
                                    <div
                                        className="revenue-bar-fill"
                                        style={{ width: `${(s.revenue / maxRevenue) * 100}%` }}
                                    ></div>
                                </div>
                                <span className="revenue-bookings">{s.booking_count} bookings</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="admin-card">
                <div className="admin-card-header">
                    <h3>Recent Bookings</h3>
                    <Link to="/admin/bookings" className="view-all-link">View all →</Link>
                </div>
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>User</th>
                                <th>Service</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(recentBookings || []).map(b => (
                                <tr key={b.id}>
                                    <td className="td-mono">#{b.id}</td>
                                    <td>
                                        <div className="user-cell">
                                            <span>{b.user_name}</span>
                                            <small>{b.user_email}</small>
                                        </div>
                                    </td>
                                    <td>{b.service_name}</td>
                                    <td>{b.pickup_date} {formatTime(b.pickup_time)}</td>
                                    <td><span className={`status-badge status-${b.status}`}>{b.status.replace('_', ' ')}</span></td>
                                    <td className="td-mono">${b.total_price.toFixed(2)}</td>
                                </tr>
                            ))}
                            {(!recentBookings || recentBookings.length === 0) && (
                                <tr><td colSpan="6" className="td-empty">No bookings yet</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}

export default AdminDashboard;
