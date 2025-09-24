-- Supabase Database Schema for Sandwich POS System
-- Run this in your Supabase SQL Editor to set up the database

-- Create custom types (Supabase handles JWT secrets automatically)
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'transfer', 'qr_code');
CREATE TYPE expense_type AS ENUM ('ingredient', 'equipment', 'utilities', 'labor', 'marketing', 'other');
CREATE TYPE notification_type AS ENUM ('info', 'warning', 'error', 'success');

-- Ingredients table (inventory management)
CREATE TABLE IF NOT EXISTS ingredients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    unit TEXT NOT NULL DEFAULT 'piece',
    cost_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 0,
    minimum_stock INTEGER NOT NULL DEFAULT 5,
    supplier TEXT,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Menu items table
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    category TEXT NOT NULL DEFAULT 'main',
    description TEXT,
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    prep_time INTEGER DEFAULT 10, -- minutes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Recipes table (menu item ingredients)
CREATE TABLE IF NOT EXISTS recipes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity DECIMAL(8,3) NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    UNIQUE(menu_item_id, ingredient_id)
);

-- Sales table (transactions)
CREATE TABLE IF NOT EXISTS sales (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TIME NOT NULL DEFAULT CURRENT_TIME,
    total DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method payment_method DEFAULT 'cash',
    customer_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Sale items table (transaction details)
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(10,2) NOT NULL,
    type expense_type NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    supplier TEXT,
    receipt_url TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Daily operations table (business metrics)
CREATE TABLE IF NOT EXISTS daily_operations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    opening_cash DECIMAL(10,2) DEFAULT 0,
    closing_cash DECIMAL(10,2) DEFAULT 0,
    total_sales DECIMAL(10,2) DEFAULT 0,
    total_expenses DECIMAL(10,2) DEFAULT 0,
    total_profit DECIMAL(10,2) DEFAULT 0,
    customer_count INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    shop_name TEXT DEFAULT 'My Restaurant',
    currency TEXT DEFAULT 'THB',
    tax_rate DECIMAL(4,3) DEFAULT 0.07,
    stock_threshold INTEGER DEFAULT 5,
    notification_settings JSONB DEFAULT '{"email": true, "push": true, "sms": false}',
    theme TEXT DEFAULT 'modern',
    language TEXT DEFAULT 'th',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_sales_date ON sales(date);
CREATE INDEX idx_sales_user_id ON sales(user_id);
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_menu_item_id ON sale_items(menu_item_id);
CREATE INDEX idx_ingredients_user_id ON ingredients(user_id);
CREATE INDEX idx_ingredients_quantity ON ingredients(quantity);
CREATE INDEX idx_menu_items_user_id ON menu_items(user_id);
CREATE INDEX idx_menu_items_category ON menu_items(category);
CREATE INDEX idx_recipes_menu_item_id ON recipes(menu_item_id);
CREATE INDEX idx_recipes_ingredient_id ON recipes(ingredient_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON ingredients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_operations_updated_at BEFORE UPDATE ON daily_operations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (users can only access their own data)
CREATE POLICY "Users can view own ingredients" ON ingredients
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ingredients" ON ingredients
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ingredients" ON ingredients
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ingredients" ON ingredients
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own menu items" ON menu_items
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own menu items" ON menu_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own menu items" ON menu_items
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own menu items" ON menu_items
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own recipes" ON recipes
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recipes" ON recipes
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recipes" ON recipes
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recipes" ON recipes
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sales" ON sales
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sales" ON sales
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sales" ON sales
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sales" ON sales
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sale items" ON sale_items
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sale items" ON sale_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sale items" ON sale_items
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sale items" ON sale_items
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own expenses" ON expenses
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expenses" ON expenses
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON expenses
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON expenses
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own daily operations" ON daily_operations
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily operations" ON daily_operations
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily operations" ON daily_operations
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own daily operations" ON daily_operations
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON notifications
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own preferences" ON user_preferences
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON user_preferences
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own preferences" ON user_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Create useful views for analytics
CREATE OR REPLACE VIEW sales_analytics AS
SELECT
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as transaction_count,
    SUM(total) as total_revenue,
    AVG(total) as average_order_value,
    SUM(tax) as total_tax,
    user_id
FROM sales
GROUP BY DATE_TRUNC('day', created_at), user_id;

CREATE OR REPLACE VIEW inventory_status AS
SELECT
    i.id,
    i.name,
    i.quantity,
    i.minimum_stock,
    i.cost_per_unit,
    i.quantity * i.cost_per_unit as total_value,
    CASE
        WHEN i.quantity <= 0 THEN 'out_of_stock'
        WHEN i.quantity <= i.minimum_stock THEN 'low_stock'
        WHEN i.quantity <= i.minimum_stock * 2 THEN 'reorder_soon'
        ELSE 'in_stock'
    END as status,
    i.user_id
FROM ingredients i;

CREATE OR REPLACE VIEW menu_profitability AS
SELECT
    m.id,
    m.name,
    m.price,
    m.cost,
    m.price - m.cost as profit,
    ROUND(((m.price - m.cost) / m.price) * 100, 2) as profit_margin,
    COUNT(si.id) as times_sold,
    SUM(si.subtotal) as total_revenue,
    m.user_id
FROM menu_items m
LEFT JOIN sale_items si ON m.id = si.menu_item_id
GROUP BY m.id, m.name, m.price, m.cost, m.user_id;

-- Create functions for business logic

-- Function to calculate menu item cost from recipes
CREATE OR REPLACE FUNCTION calculate_menu_item_cost(menu_item_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
    total_cost DECIMAL(10,2) := 0;
BEGIN
    SELECT COALESCE(SUM(r.quantity * i.cost_per_unit), 0)
    INTO total_cost
    FROM recipes r
    JOIN ingredients i ON r.ingredient_id = i.id
    WHERE r.menu_item_id = menu_item_uuid;

    RETURN total_cost;
END;
$$ LANGUAGE plpgsql;

-- Function to update inventory after sale
CREATE OR REPLACE FUNCTION update_inventory_after_sale()
RETURNS TRIGGER AS $$
BEGIN
    -- Decrease ingredient quantities based on recipe
    UPDATE ingredients
    SET quantity = quantity - (NEW.quantity * r.quantity)
    FROM recipes r
    WHERE r.ingredient_id = ingredients.id
    AND r.menu_item_id = NEW.menu_item_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update inventory
CREATE TRIGGER trigger_update_inventory_after_sale
    AFTER INSERT ON sale_items
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_after_sale();

-- Function to create low stock notifications
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS VOID AS $$
DECLARE
    ingredient_record RECORD;
BEGIN
    FOR ingredient_record IN
        SELECT id, name, quantity, minimum_stock, user_id
        FROM ingredients
        WHERE quantity <= minimum_stock
    LOOP
        INSERT INTO notifications (type, title, message, user_id)
        VALUES (
            'warning',
            'Low Stock Alert',
            'Ingredient "' || ingredient_record.name || '" is running low (' || ingredient_record.quantity || ' remaining)',
            ingredient_record.user_id
        )
        ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Sample data for development/testing
INSERT INTO ingredients (name, unit, cost_per_unit, quantity, minimum_stock, supplier, category, user_id) VALUES
('White Bread', 'slice', 2.00, 100, 10, 'Local Bakery', 'bread', auth.uid()),
('Ham', 'slice', 5.00, 50, 5, 'Meat Supplier', 'protein', auth.uid()),
('Cheese', 'slice', 3.00, 40, 8, 'Dairy Co', 'dairy', auth.uid()),
('Lettuce', 'leaf', 1.00, 30, 5, 'Fresh Farm', 'vegetable', auth.uid()),
('Tomato', 'slice', 1.50, 25, 5, 'Fresh Farm', 'vegetable', auth.uid()),
('Butter', 'gram', 0.50, 500, 50, 'Dairy Co', 'dairy', auth.uid())
ON CONFLICT (name) DO NOTHING;

INSERT INTO menu_items (name, price, category, description, user_id) VALUES
('Ham & Cheese Sandwich', 45.00, 'sandwich', 'Classic ham and cheese with lettuce and tomato', auth.uid()),
('Grilled Cheese', 35.00, 'sandwich', 'Perfectly grilled cheese sandwich', auth.uid()),
('Club Sandwich', 65.00, 'sandwich', 'Triple-decker with ham, cheese, lettuce, and tomato', auth.uid()),
('BLT Sandwich', 55.00, 'sandwich', 'Bacon, lettuce, and tomato on toasted bread', auth.uid())
ON CONFLICT DO NOTHING;

-- Insert sample recipes (assuming ingredient and menu item IDs exist)
-- Note: In production, you would use actual UUIDs from your data

COMMENT ON DATABASE postgres IS 'Sandwich POS System Database - Modern restaurant management with real-time analytics';
