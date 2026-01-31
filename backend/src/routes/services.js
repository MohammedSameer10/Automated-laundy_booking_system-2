import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// Get all services
router.get('/', (req, res) => {
    try {
        const services = db.prepare('SELECT * FROM services ORDER BY category, price').all();
        res.json({ services });
    } catch (err) {
        console.error('Fetch services error:', err);
        res.status(500).json({ error: 'Failed to fetch services' });
    }
});

// Get services by category
router.get('/category/:category', (req, res) => {
    try {
        const { category } = req.params;
        const services = db.prepare('SELECT * FROM services WHERE category = ? ORDER BY price').all(category);
        res.json({ services });
    } catch (err) {
        console.error('Fetch services by category error:', err);
        res.status(500).json({ error: 'Failed to fetch services' });
    }
});

// Get single service
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const service = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
        
        if (!service) {
            return res.status(404).json({ error: 'Service not found' });
        }
        
        res.json({ service });
    } catch (err) {
        console.error('Fetch service error:', err);
        res.status(500).json({ error: 'Failed to fetch service' });
    }
});

// Get available time slots
router.get('/slots/available', (req, res) => {
    try {
        const { date } = req.query;
        
        let query = `
            SELECT * FROM time_slots 
            WHERE available_capacity > 0 
            AND date >= date('now')
        `;
        const params = [];
        
        if (date) {
            query += ' AND date = ?';
            params.push(date);
        }
        
        query += ' ORDER BY date, time_slot LIMIT 100';
        
        const slots = db.prepare(query).all(...params);
        res.json({ slots });
    } catch (err) {
        console.error('Fetch slots error:', err);
        res.status(500).json({ error: 'Failed to fetch time slots' });
    }
});

// Get slots for a specific date range
router.get('/slots/range', (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }
        
        const slots = db.prepare(`
            SELECT * FROM time_slots 
            WHERE date BETWEEN ? AND ? 
            AND available_capacity > 0
            ORDER BY date, time_slot
        `).all(startDate, endDate);
        
        res.json({ slots });
    } catch (err) {
        console.error('Fetch slots range error:', err);
        res.status(500).json({ error: 'Failed to fetch time slots' });
    }
});

export default router;



