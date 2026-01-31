-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    category TEXT NOT NULL CHECK (category IN ('wash', 'dry', 'iron', 'dryclean', 'special', 'addon'))
);

-- Time slots table
CREATE TABLE IF NOT EXISTS time_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    available_capacity INTEGER DEFAULT 5,
    UNIQUE(date, time_slot)
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    pickup_date TEXT NOT NULL,
    pickup_time TEXT NOT NULL,
    delivery_type TEXT DEFAULT 'standard' CHECK (delivery_type IN ('standard', 'express')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    total_price REAL NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (service_id) REFERENCES services(id)
);

-- Insert default services
INSERT OR IGNORE INTO services (id, name, description, price, duration_minutes, category) VALUES
(1, 'Wash & Fold', 'Professional washing and folding service', 15.00, 60, 'wash'),
(2, 'Dry Only', 'Machine drying service', 10.00, 45, 'dry'),
(3, 'Wash & Iron', 'Washing with professional ironing', 25.00, 90, 'iron'),
(4, 'Dry Cleaning', 'Premium dry cleaning for delicate fabrics', 35.00, 120, 'dryclean'),
(5, 'Special Care', 'Specialized care for delicate and luxury items', 45.00, 150, 'special'),
(6, 'Express Delivery', 'Same-day delivery addon', 10.00, 0, 'addon');

-- Generate time slots for the next 14 days
INSERT OR IGNORE INTO time_slots (date, time_slot, available_capacity)
SELECT 
    date(datetime('now', '+' || day || ' days')) as date,
    time_slot,
    5 as available_capacity
FROM 
    (SELECT 0 as day UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
     UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 
     UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13),
    (SELECT '08:00' as time_slot UNION SELECT '09:00' UNION SELECT '10:00' 
     UNION SELECT '11:00' UNION SELECT '12:00' UNION SELECT '13:00' 
     UNION SELECT '14:00' UNION SELECT '15:00' UNION SELECT '16:00' 
     UNION SELECT '17:00' UNION SELECT '18:00');



