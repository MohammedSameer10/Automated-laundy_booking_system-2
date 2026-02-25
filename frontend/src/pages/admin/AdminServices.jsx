import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';
import './Admin.css';

const CATEGORIES = ['wash', 'dry', 'iron', 'dryclean', 'special', 'addon'];

const EMPTY_FORM = { name: '', description: '', price: '', duration_minutes: '60', category: 'wash' };

function AdminServices() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { loadServices(); }, []);

    async function loadServices() {
        try {
            const { services: data } = await api.getAdminServices();
            setServices(data);
        } catch (err) {
            console.error('Failed to load services:', err);
        } finally {
            setLoading(false);
        }
    }

    function startEdit(service) {
        setEditing(service.id);
        setForm({
            name: service.name,
            description: service.description || '',
            price: String(service.price),
            duration_minutes: String(service.duration_minutes),
            category: service.category
        });
        setShowAdd(false);
        setError('');
    }

    function startAdd() {
        setShowAdd(true);
        setEditing(null);
        setForm(EMPTY_FORM);
        setError('');
    }

    function cancelEdit() {
        setEditing(null);
        setShowAdd(false);
        setForm(EMPTY_FORM);
        setError('');
    }

    async function handleSave(e) {
        e.preventDefault();
        if (!form.name || !form.price || !form.category) {
            setError('Name, price, and category are required');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const payload = {
                name: form.name,
                description: form.description,
                price: parseFloat(form.price),
                duration_minutes: parseInt(form.duration_minutes) || 60,
                category: form.category
            };
            if (editing) {
                await api.updateService(editing, payload);
            } else {
                await api.createService(payload);
            }
            cancelEdit();
            loadServices();
        } catch (err) {
            setError(err.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id) {
        if (!confirm('Delete this service? This cannot be undone.')) return;
        try {
            await api.deleteService(id);
            loadServices();
        } catch (err) {
            alert(err.message || 'Cannot delete service');
        }
    }

    if (loading) {
        return <AdminLayout><div className="admin-loading"><div className="loading-spinner"></div><p>Loading services...</p></div></AdminLayout>;
    }

    return (
        <AdminLayout>
            <div className="admin-page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1>Manage Services</h1>
                        <p>Add, edit, or remove laundry services</p>
                    </div>
                    <button className="btn btn-primary" onClick={startAdd}>+ Add Service</button>
                </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {showAdd && (
                <div className="admin-card service-form-card">
                    <h3>New Service</h3>
                    <form className="service-form" onSubmit={handleSave}>
                        <input placeholder="Service name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                        <input placeholder="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                        <input type="number" step="0.01" placeholder="Price" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} required />
                        <input type="number" placeholder="Duration (min)" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value }))} />
                        <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="service-form-actions">
                            <button type="button" className="btn btn-secondary" onClick={cancelEdit}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Create'}</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="services-admin-grid">
                {services.map(s => (
                    <div key={s.id} className="admin-card service-admin-card">
                        {editing === s.id ? (
                            <form className="service-form" onSubmit={handleSave}>
                                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                                <input type="number" step="0.01" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} required />
                                <input type="number" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value }))} />
                                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <div className="service-form-actions">
                                    <button type="button" className="btn btn-secondary" onClick={cancelEdit}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <div className="service-admin-header">
                                    <h4>{s.name}</h4>
                                    <span className={`category-badge cat-${s.category}`}>{s.category}</span>
                                </div>
                                <p className="service-desc">{s.description}</p>
                                <div className="service-admin-meta">
                                    <span className="service-admin-price">${s.price.toFixed(2)}</span>
                                    <span className="service-admin-duration">{s.duration_minutes} min</span>
                                    <span className="service-admin-bookings">{s.booking_count} bookings</span>
                                </div>
                                <div className="service-admin-actions">
                                    <button className="btn btn-secondary btn-sm" onClick={() => startEdit(s)}>Edit</button>
                                    <button className="btn btn-ghost btn-sm cancel-btn" onClick={() => handleDelete(s.id)}>Delete</button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </AdminLayout>
    );
}

export default AdminServices;
