-- ==============================================================================
-- GrabIt Database Performance Indexes & Optimization Migration
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/vhcmjwuhdcdxqmyjvqpz/sql
-- ==============================================================================

-- 1. PRODUCTS TABLE INDEXES
-- Optimizes category filtering, store filtering, sorting, and ILIKE search
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING gin(name gin_trgm_ops);

-- 2. ORDERS TABLE INDEXES
-- Optimizes customer order history, seller store queue, rider active queue, and status queries
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_agent ON public.orders(delivery_agent_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- Composite indexes for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_orders_cust_created ON public.orders(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_store_created ON public.orders(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_rider_status ON public.orders(delivery_agent_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_store_status ON public.orders(store_id, status);

-- 3. STORES TABLE SPATIAL & OWNER INDEXES
-- GiST spatial index accelerates st_dwithin proximity calculations in nearby_stores()
CREATE INDEX IF NOT EXISTS idx_stores_location_gist ON public.stores USING gist(location);
CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON public.stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_stores_is_active ON public.stores(is_active);

-- 4. CART ITEMS INDEXES
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON public.cart_items(product_id);

-- 5. PAYMENTS INDEXES
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- 6. PROFILES INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
