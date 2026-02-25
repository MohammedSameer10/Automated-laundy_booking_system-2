import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';
import './Admin.css';

function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(null);

    useEffect(() => { loadUsers(); }, []);

    async function loadUsers() {
        try {
            const { users: data } = await api.getAdminUsers();
            setUsers(data);
        } catch (err) {
            console.error('Failed to load users:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id) {
        if (!confirm('Delete this user and all their bookings? This cannot be undone.')) return;
        setDeleting(id);
        try {
            await api.deleteUser(id);
            loadUsers();
        } catch (err) {
            alert(err.message || 'Failed to delete user');
        } finally {
            setDeleting(null);
        }
    }

    function formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    }

    if (loading) {
        return <AdminLayout><div className="admin-loading"><div className="loading-spinner"></div><p>Loading users...</p></div></AdminLayout>;
    }

    return (
        <AdminLayout>
            <div className="admin-page-header">
                <h1>Manage Users</h1>
                <p>{users.length} registered users</p>
            </div>

            <div className="admin-card">
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Role</th>
                                <th>Bookings</th>
                                <th>Joined</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td className="td-mono">#{u.id}</td>
                                    <td><strong>{u.name}</strong></td>
                                    <td>{u.email}</td>
                                    <td>{u.phone || '—'}</td>
                                    <td>
                                        <span className={`role-badge ${u.role}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="td-mono">{u.booking_count}</td>
                                    <td>{formatDate(u.created_at)}</td>
                                    <td>
                                        {u.role !== 'admin' ? (
                                            <button
                                                className="btn btn-ghost btn-sm cancel-btn"
                                                onClick={() => handleDelete(u.id)}
                                                disabled={deleting === u.id}
                                            >
                                                {deleting === u.id ? '...' : 'Delete'}
                                            </button>
                                        ) : (
                                            <span className="no-actions">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}

export default AdminUsers;
