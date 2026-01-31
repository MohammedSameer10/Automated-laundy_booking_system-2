import { Router } from 'express';
import db from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { parseVoiceCommand } from '../utils/voiceParser.js';

const router = Router();

// All booking routes require authentication
router.use(authenticateToken);

// Create a new booking
router.post('/', (req, res) => {
    try {
        const { serviceId, pickupDate, pickupTime, deliveryType, notes } = req.body;
        const userId = req.user.id;

        if (!serviceId || !pickupDate || !pickupTime) {
            return res.status(400).json({ error: 'Service, pickup date, and time are required' });
        }

        // Get service details
        const service = db.prepare('SELECT * FROM services WHERE id = ?').get(serviceId);
        if (!service) {
            return res.status(404).json({ error: 'Service not found' });
        }

        // Check slot availability
        const slot = db.prepare(
            'SELECT * FROM time_slots WHERE date = ? AND time_slot = ? AND available_capacity > 0'
        ).get(pickupDate, pickupTime);

        if (!slot) {
            return res.status(400).json({ error: 'Selected time slot is not available' });
        }

        // Calculate total price
        let totalPrice = service.price;
        if (deliveryType === 'express') {
            const expressAddon = db.prepare("SELECT price FROM services WHERE category = 'addon' AND name LIKE '%Express%'").get();
            if (expressAddon) {
                totalPrice += expressAddon.price;
            }
        }

        // Create booking
        const stmt = db.prepare(`
            INSERT INTO bookings (user_id, service_id, pickup_date, pickup_time, delivery_type, total_price, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(userId, serviceId, pickupDate, pickupTime, deliveryType || 'standard', totalPrice, notes || null);

        // Update slot capacity
        db.prepare('UPDATE time_slots SET available_capacity = available_capacity - 1 WHERE id = ?').run(slot.id);

        // Fetch the created booking with service details
        const booking = db.prepare(`
            SELECT b.*, s.name as service_name, s.category as service_category
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            WHERE b.id = ?
        `).get(result.lastInsertRowid);

        res.status(201).json({
            message: 'Booking created successfully',
            booking
        });
    } catch (err) {
        console.error('Create booking error:', err);
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

// Create booking from voice command
router.post('/voice', (req, res) => {
    try {
        const { transcript } = req.body;
        const userId = req.user.id;

        if (!transcript) {
            return res.status(400).json({ error: 'Voice transcript is required' });
        }

        // Parse the voice command
        const parsed = parseVoiceCommand(transcript);

        if (!parsed.intent) {
            return res.json({
                success: false,
                message: "I couldn't understand your request. Try saying something like 'Book a wash and fold for tomorrow at 2 PM'",
                parsed
            });
        }

        // Handle different intents
        if (parsed.intent === 'list_services') {
            const services = db.prepare('SELECT id, name, price, category FROM services WHERE category != ?').all('addon');
            return res.json({
                success: true,
                intent: 'list_services',
                message: `We offer: ${services.map(s => `${s.name} ($${s.price})`).join(', ')}`,
                services
            });
        }

        if (parsed.intent === 'cancel') {
            // Get user's pending bookings
            const pendingBookings = db.prepare(`
                SELECT b.*, s.name as service_name
                FROM bookings b
                JOIN services s ON b.service_id = s.id
                WHERE b.user_id = ? AND b.status IN ('pending', 'confirmed')
                ORDER BY b.pickup_date DESC
                LIMIT 1
            `).all(userId);

            if (pendingBookings.length === 0) {
                return res.json({
                    success: false,
                    message: "You don't have any active bookings to cancel."
                });
            }

            // Cancel the most recent booking
            db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(pendingBookings[0].id);
            
            return res.json({
                success: true,
                intent: 'cancel',
                message: `Your ${pendingBookings[0].service_name} booking for ${pendingBookings[0].pickup_date} has been cancelled.`
            });
        }

        if (parsed.intent === 'book') {
            // Find matching service
            let service = null;
            if (parsed.service) {
                const serviceSearch = parsed.service.toLowerCase();
                service = db.prepare(`
                    SELECT * FROM services 
                    WHERE LOWER(name) LIKE ? OR LOWER(category) LIKE ?
                    AND category != 'addon'
                    LIMIT 1
                `).get(`%${serviceSearch}%`, `%${serviceSearch}%`);
            }

            if (!service) {
                // Default to wash & fold
                service = db.prepare("SELECT * FROM services WHERE category = 'wash' LIMIT 1").get();
            }

            if (!parsed.date || !parsed.time) {
                return res.json({
                    success: false,
                    message: `I found the ${service.name} service. When would you like to schedule the pickup? Please specify a date and time.`,
                    parsed,
                    partialBooking: { service }
                });
            }

            // Check slot availability
            const slot = db.prepare(
                'SELECT * FROM time_slots WHERE date = ? AND time_slot = ? AND available_capacity > 0'
            ).get(parsed.date, parsed.time);

            if (!slot) {
                // Find next available slot
                const nextSlot = db.prepare(`
                    SELECT * FROM time_slots 
                    WHERE date >= ? AND available_capacity > 0
                    ORDER BY date, time_slot
                    LIMIT 1
                `).get(parsed.date);

                return res.json({
                    success: false,
                    message: nextSlot 
                        ? `That time slot isn't available. The next available slot is ${nextSlot.date} at ${nextSlot.time_slot}. Would you like to book that instead?`
                        : "Sorry, there are no available slots. Please try a different date.",
                    parsed,
                    suggestedSlot: nextSlot
                });
            }

            // Calculate price
            let totalPrice = service.price;
            if (parsed.express) {
                const expressAddon = db.prepare("SELECT price FROM services WHERE category = 'addon'").get();
                if (expressAddon) totalPrice += expressAddon.price;
            }

            // Create the booking
            const stmt = db.prepare(`
                INSERT INTO bookings (user_id, service_id, pickup_date, pickup_time, delivery_type, total_price, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            const result = stmt.run(
                userId, 
                service.id, 
                parsed.date, 
                parsed.time, 
                parsed.express ? 'express' : 'standard', 
                totalPrice,
                `Voice booking: "${transcript}"`
            );

            // Update slot capacity
            db.prepare('UPDATE time_slots SET available_capacity = available_capacity - 1 WHERE id = ?').run(slot.id);

            const booking = db.prepare(`
                SELECT b.*, s.name as service_name
                FROM bookings b
                JOIN services s ON b.service_id = s.id
                WHERE b.id = ?
            `).get(result.lastInsertRowid);

            return res.json({
                success: true,
                intent: 'book',
                message: `Perfect! I've booked ${service.name} for ${parsed.date} at ${parsed.time}. ${parsed.express ? 'Express delivery included. ' : ''}Total: $${totalPrice}`,
                booking
            });
        }

        res.json({
            success: false,
            message: "I'm not sure what you'd like to do. You can say things like 'Book wash and fold for tomorrow at 3 PM' or 'What services do you offer?'",
            parsed
        });
    } catch (err) {
        console.error('Voice booking error:', err);
        res.status(500).json({ error: 'Failed to process voice command' });
    }
});

// Get user's bookings
router.get('/', (req, res) => {
    try {
        const userId = req.user.id;
        const { status } = req.query;

        let query = `
            SELECT b.*, s.name as service_name, s.category as service_category, s.description as service_description
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            WHERE b.user_id = ?
        `;
        const params = [userId];

        if (status) {
            query += ' AND b.status = ?';
            params.push(status);
        }

        query += ' ORDER BY b.created_at DESC';

        const bookings = db.prepare(query).all(...params);
        res.json({ bookings });
    } catch (err) {
        console.error('Fetch bookings error:', err);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// Get single booking
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const booking = db.prepare(`
            SELECT b.*, s.name as service_name, s.category as service_category, s.description as service_description
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            WHERE b.id = ? AND b.user_id = ?
        `).get(id, userId);

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        res.json({ booking });
    } catch (err) {
        console.error('Fetch booking error:', err);
        res.status(500).json({ error: 'Failed to fetch booking' });
    }
});

// Update booking status (cancel)
router.patch('/:id/cancel', (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const booking = db.prepare('SELECT * FROM bookings WHERE id = ? AND user_id = ?').get(id, userId);

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (booking.status === 'completed' || booking.status === 'cancelled') {
            return res.status(400).json({ error: 'Cannot cancel this booking' });
        }

        // Cancel booking
        db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(id);

        // Restore slot capacity
        db.prepare(`
            UPDATE time_slots SET available_capacity = available_capacity + 1 
            WHERE date = ? AND time_slot = ?
        `).run(booking.pickup_date, booking.pickup_time);

        res.json({ message: 'Booking cancelled successfully' });
    } catch (err) {
        console.error('Cancel booking error:', err);
        res.status(500).json({ error: 'Failed to cancel booking' });
    }
});

export default router;



