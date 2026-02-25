import { Router } from 'express';
import db from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = Router();

router.use(authenticateToken);
router.use(requireAdmin);

// Allowed forward transitions
const VALID_TRANSITIONS = {
    pending:     ['confirmed', 'cancelled'],
    confirmed:   ['in_progress', 'cancelled'],
    in_progress: ['completed'],
    completed:   [],
    cancelled:   []
};

// ── Dashboard stats ────────────────────────────────────────────
router.get('/dashboard', (req, res) => {
    try {
        const totalBookings = db.prepare('SELECT COUNT(*) as count FROM bookings').get().count;
        const revenue = db.prepare("SELECT COALESCE(SUM(total_price),0) as total FROM bookings WHERE status != 'cancelled'").get().total;
        const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'user'").get().count;
        const pendingApprovals = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'pending'").get().count;

        const statusBreakdown = db.prepare(`
            SELECT status, COUNT(*) as count FROM bookings GROUP BY status
        `).all();

        const revenueByService = db.prepare(`
            SELECT s.name, s.category, COALESCE(SUM(b.total_price),0) as revenue, COUNT(b.id) as booking_count
            FROM services s
            LEFT JOIN bookings b ON b.service_id = s.id AND b.status != 'cancelled'
            WHERE s.category != 'addon'
            GROUP BY s.id
            ORDER BY revenue DESC
        `).all();

        const recentBookings = db.prepare(`
            SELECT b.*, s.name as service_name, u.name as user_name, u.email as user_email
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            JOIN users u ON b.user_id = u.id
            ORDER BY b.created_at DESC
            LIMIT 10
        `).all();

        res.json({
            stats: { totalBookings, revenue, totalUsers, pendingApprovals },
            statusBreakdown,
            revenueByService,
            recentBookings
        });
    } catch (err) {
        console.error('Admin dashboard error:', err);
        res.status(500).json({ error: 'Failed to load dashboard' });
    }
});

// ── All bookings (with search / filter) ────────────────────────
router.get('/bookings', (req, res) => {
    try {
        const { search, status, startDate, endDate, serviceId, deliveryType, sortBy, sortOrder } = req.query;

        let query = `
            SELECT b.*, s.name as service_name, s.category as service_category,
                   u.name as user_name, u.email as user_email
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            JOIN users u ON b.user_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            query += " AND (u.name LIKE ? OR u.email LIKE ? OR s.name LIKE ? OR b.notes LIKE ?)";
            const term = `%${search}%`;
            params.push(term, term, term, term);
        }
        if (status && status !== 'all') {
            query += ' AND b.status = ?';
            params.push(status);
        }
        if (startDate) {
            query += ' AND b.pickup_date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND b.pickup_date <= ?';
            params.push(endDate);
        }
        if (serviceId) {
            query += ' AND b.service_id = ?';
            params.push(serviceId);
        }
        if (deliveryType) {
            query += ' AND b.delivery_type = ?';
            params.push(deliveryType);
        }

        const allowedSort = ['created_at', 'pickup_date', 'total_price', 'status'];
        const col = allowedSort.includes(sortBy) ? `b.${sortBy}` : 'b.created_at';
        const dir = sortOrder === 'asc' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${col} ${dir}`;

        const bookings = db.prepare(query).all(...params);
        res.json({ bookings });
    } catch (err) {
        console.error('Admin bookings error:', err);
        res.status(500).json({ error: 'Failed to load bookings' });
    }
});

// ── Update booking status (pipeline) ──────────────────────────
router.patch('/bookings/:id/status', (req, res) => {
    try {
        const { id } = req.params;
        const { status: newStatus } = req.body;

        const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        const allowed = VALID_TRANSITIONS[booking.status] || [];
        if (!allowed.includes(newStatus)) {
            return res.status(400).json({
                error: `Cannot transition from '${booking.status}' to '${newStatus}'. Allowed: ${allowed.join(', ') || 'none'}`
            });
        }

        db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(newStatus, id);

        if (newStatus === 'cancelled') {
            db.prepare(`
                UPDATE time_slots SET available_capacity = available_capacity + 1
                WHERE date = ? AND time_slot = ?
            `).run(booking.pickup_date, booking.pickup_time);
        }

        const updated = db.prepare(`
            SELECT b.*, s.name as service_name, u.name as user_name, u.email as user_email
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            JOIN users u ON b.user_id = u.id
            WHERE b.id = ?
        `).get(id);

        res.json({ message: `Booking status updated to '${newStatus}'`, booking: updated });
    } catch (err) {
        console.error('Admin status update error:', err);
        res.status(500).json({ error: 'Failed to update booking status' });
    }
});

// ── Users ──────────────────────────────────────────────────────
router.get('/users', (req, res) => {
    try {
        const users = db.prepare(`
            SELECT u.id, u.email, u.name, u.phone, u.role, u.created_at,
                   COUNT(b.id) as booking_count
            FROM users u
            LEFT JOIN bookings b ON b.user_id = u.id
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `).all();
        res.json({ users });
    } catch (err) {
        console.error('Admin users error:', err);
        res.status(500).json({ error: 'Failed to load users' });
    }
});

router.delete('/users/:id', (req, res) => {
    try {
        const { id } = req.params;
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.role === 'admin') return res.status(400).json({ error: 'Cannot delete admin user' });

        db.prepare('DELETE FROM bookings WHERE user_id = ?').run(id);
        db.prepare('DELETE FROM users WHERE id = ?').run(id);
        res.json({ message: 'User deleted' });
    } catch (err) {
        console.error('Admin delete user error:', err);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// ── Services CRUD ──────────────────────────────────────────────
router.get('/services', (req, res) => {
    try {
        const services = db.prepare(`
            SELECT s.*, COUNT(b.id) as booking_count
            FROM services s
            LEFT JOIN bookings b ON b.service_id = s.id
            GROUP BY s.id
            ORDER BY s.category, s.price
        `).all();
        res.json({ services });
    } catch (err) {
        console.error('Admin services error:', err);
        res.status(500).json({ error: 'Failed to load services' });
    }
});

router.post('/services', (req, res) => {
    try {
        const { name, description, price, duration_minutes, category } = req.body;
        if (!name || !price || !category) {
            return res.status(400).json({ error: 'Name, price, and category are required' });
        }
        const result = db.prepare(
            'INSERT INTO services (name, description, price, duration_minutes, category) VALUES (?, ?, ?, ?, ?)'
        ).run(name, description || '', price, duration_minutes || 60, category);
        const service = db.prepare('SELECT * FROM services WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({ message: 'Service created', service });
    } catch (err) {
        console.error('Admin create service error:', err);
        res.status(500).json({ error: 'Failed to create service' });
    }
});

router.put('/services/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, duration_minutes, category } = req.body;
        const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
        if (!existing) return res.status(404).json({ error: 'Service not found' });

        db.prepare(`
            UPDATE services
            SET name = COALESCE(?, name), description = COALESCE(?, description),
                price = COALESCE(?, price), duration_minutes = COALESCE(?, duration_minutes),
                category = COALESCE(?, category)
            WHERE id = ?
        `).run(name, description, price, duration_minutes, category, id);

        const service = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
        res.json({ message: 'Service updated', service });
    } catch (err) {
        console.error('Admin update service error:', err);
        res.status(500).json({ error: 'Failed to update service' });
    }
});

router.delete('/services/:id', (req, res) => {
    try {
        const { id } = req.params;
        const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
        if (!existing) return res.status(404).json({ error: 'Service not found' });

        const hasBookings = db.prepare('SELECT COUNT(*) as c FROM bookings WHERE service_id = ?').get(id).c;
        if (hasBookings > 0) {
            return res.status(400).json({ error: 'Cannot delete service with existing bookings' });
        }

        db.prepare('DELETE FROM services WHERE id = ?').run(id);
        res.json({ message: 'Service deleted' });
    } catch (err) {
        console.error('Admin delete service error:', err);
        res.status(500).json({ error: 'Failed to delete service' });
    }
});

export default router;
