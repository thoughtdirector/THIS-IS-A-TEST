-- Role Management
CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

-- Insert default roles
INSERT INTO roles (role_name, description) VALUES
('superadmin', 'System-wide administrator with full access'),
('owner', 'Business owner with location management access'),
('employee', 'Staff member with operational access'),
('parent', 'Parent user with child management access'),
('child', 'Child profile without direct system access');

-- Locations
CREATE TABLE locations (
    location_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(50) NOT NULL,
    state VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users (Parents, Staff, Owners, Admins)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(role_id),
    location_id INTEGER REFERENCES locations(location_id), -- For staff/owners
    email VARCHAR(100) NOT NULL UNIQUE,
    fullname VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    hash_password VARCHAR(255) NOT NULL,
    document_type VARCHAR(20) NOT NULL,
    document_number VARCHAR(30) NOT NULL,
    terms_accepted BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Children Profiles (with integrated medical info)
CREATE TABLE children (
    child_id SERIAL PRIMARY KEY,
    parent_id INTEGER NOT NULL REFERENCES users(user_id),
    fullname VARCHAR(100) NOT NULL,
    birth_date DATE NOT NULL,
    allergies TEXT,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(50),
    special_notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Play Areas/Zones
CREATE TABLE zones (
    zone_id SERIAL PRIMARY KEY,
    location_id INTEGER NOT NULL REFERENCES locations(location_id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    max_capacity INTEGER NOT NULL,
    min_age INTEGER,
    max_age INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    staff_id INTEGER REFERENCES users(user_id) -- Assigned staff
);

-- Service Types and Services Combined
CREATE TABLE services (
    service_id SERIAL PRIMARY KEY,
    location_id INTEGER NOT NULL REFERENCES locations(location_id),
    zone_id INTEGER REFERENCES zones(zone_id),
    service_type VARCHAR(50) NOT NULL, -- 'play_time', 'class', 'party', 'field_trip'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL,
    max_capacity INTEGER NOT NULL,
    min_age INTEGER,
    max_age INTEGER,
    price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service Sessions
CREATE TABLE sessions (
    session_id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL REFERENCES services(service_id),
    staff_id INTEGER REFERENCES users(user_id), -- Assigned staff
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    current_capacity INTEGER DEFAULT 0,
    max_capacity INTEGER NOT NULL,
    is_canceled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service Bundles (Memberships/Packages)
CREATE TABLE bundles (
    bundle_id SERIAL PRIMARY KEY,
    location_id INTEGER NOT NULL REFERENCES locations(location_id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    is_subscription BOOLEAN DEFAULT FALSE,
    duration_days INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bundle Items
CREATE TABLE bundle_services (
    bundle_service_id SERIAL PRIMARY KEY,
    bundle_id INTEGER NOT NULL REFERENCES bundles(bundle_id),
    service_id INTEGER NOT NULL REFERENCES services(service_id),
    quantity INTEGER NOT NULL,
    UNIQUE(bundle_id, service_id)
);

-- Combined Orders and Payments
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    location_id INTEGER NOT NULL REFERENCES locations(location_id),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    subtotal DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending',
    transaction_id VARCHAR(100),
    payment_method VARCHAR(50)
);

-- Order Items with Play Time Credits
CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id),
    item_type VARCHAR(20) NOT NULL, -- 'service', 'bundle', 'play_time'
    item_id INTEGER NOT NULL, -- References services.service_id or bundles.bundle_id
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    minutes_credited INTEGER, -- Only for play_time items
    expiry_date DATE, -- Only for play_time items
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Play Time Credits (Balance tracking)
CREATE TABLE credits (
    credit_id SERIAL PRIMARY KEY,
    parent_id INTEGER NOT NULL REFERENCES users(user_id),
    location_id INTEGER NOT NULL REFERENCES locations(location_id),
    minutes_remaining INTEGER NOT NULL DEFAULT 0,
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Unified Bookings and Check-ins
CREATE TABLE visits (
    visit_id SERIAL PRIMARY KEY,
    child_id INTEGER NOT NULL REFERENCES children(child_id),
    location_id INTEGER NOT NULL REFERENCES locations(location_id),
    zone_id INTEGER REFERENCES zones(zone_id),
    session_id INTEGER REFERENCES sessions(session_id), -- For classes, parties, etc.
    order_item_id INTEGER REFERENCES order_items(order_item_id), -- Associated purchase
    credit_id INTEGER REFERENCES credits(credit_id), -- For play time
    visit_type VARCHAR(20) NOT NULL, -- 'play_time', 'class', 'party', 'field_trip'
    status VARCHAR(20) DEFAULT 'confirmed', -- confirmed, checked_in, completed, canceled
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    minutes_used INTEGER,
    check_in_by INTEGER REFERENCES users(user_id),
    check_out_by INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_location ON users(location_id);
CREATE INDEX idx_children_parent ON children(parent_id);
CREATE INDEX idx_zones_location ON zones(location_id);
CREATE INDEX idx_services_location ON services(location_id);
CREATE INDEX idx_services_type ON services(service_type);
CREATE INDEX idx_sessions_service ON sessions(service_id);
CREATE INDEX idx_sessions_times ON sessions(start_time, end_time);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_credits_parent ON credits(parent_id);
CREATE INDEX idx_visits_child ON visits(child_id);
CREATE INDEX idx_visits_location ON visits(location_id);
CREATE INDEX idx_visits_session ON visits(session_id);
CREATE INDEX idx_visits_times ON visits(check_in_time, check_out_time);

-- Views for common KPI queries

-- Active children count by location
CREATE VIEW view_active_children_by_location AS
SELECT 
    l.location_id,
    l.name AS location_name,
    COUNT(DISTINCT c.child_id) AS active_children_count
FROM
    locations l
LEFT JOIN
    visits v ON l.location_id = v.location_id
LEFT JOIN
    children c ON v.child_id = c.child_id
WHERE
    v.check_in_time >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY
    l.location_id, l.name;

-- Service popularity
CREATE VIEW view_service_popularity AS
SELECT
    l.location_id,
    l.name AS location_name,
    s.service_id,
    s.name AS service_name,
    s.service_type,
    COUNT(v.visit_id) AS visit_count
FROM
    services s
JOIN
    locations l ON s.location_id = l.location_id
LEFT JOIN
    sessions ss ON s.service_id = ss.service_id
LEFT JOIN
    visits v ON ss.session_id = v.session_id
WHERE
    v.created_at >= CURRENT_DATE - INTERVAL '90 days'
    AND v.status != 'canceled'
GROUP BY
    l.location_id, l.name, s.service_id, s.name, s.service_type
ORDER BY
    visit_count DESC;

-- Average play time by child age
CREATE VIEW view_play_time_by_age AS
SELECT
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, c.birth_date)) AS age,
    AVG(v.minutes_used) AS avg_play_minutes,
    COUNT(DISTINCT c.child_id) AS child_count
FROM
    children c
JOIN
    visits v ON c.child_id = v.child_id
WHERE
    v.check_in_time >= CURRENT_DATE - INTERVAL '30 days'
    AND v.check_out_time IS NOT NULL
    AND v.visit_type = 'play_time'
GROUP BY
    age
ORDER BY
    age;

-- Revenue by service type
CREATE VIEW view_revenue_by_service_type AS
SELECT
    l.location_id,
    l.name AS location_name,
    s.service_type,
    SUM(oi.total_price) AS total_revenue
FROM
    order_items oi
JOIN
    orders o ON oi.order_id = o.order_id
JOIN
    locations l ON o.location_id = l.location_id
JOIN
    services s ON (oi.item_type = 'service' AND oi.item_id = s.service_id)
WHERE
    o.payment_status = 'completed'
    AND o.order_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY
    l.location_id, l.name, s.service_type
ORDER BY
    total_revenue DESC;

-- Peak usage times
CREATE VIEW view_peak_usage_times AS
SELECT
    l.location_id,
    l.name AS location_name,
    EXTRACT(DOW FROM v.check_in_time) AS day_of_week,
    EXTRACT(HOUR FROM v.check_in_time) AS hour_of_day,
    COUNT(*) AS check_in_count
FROM
    visits v
JOIN
    locations l ON v.location_id = l.location_id
WHERE
    v.check_in_time >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY
    l.location_id, l.name, day_of_week, hour_of_day
ORDER BY
    l.location_id, check_in_count DESC;