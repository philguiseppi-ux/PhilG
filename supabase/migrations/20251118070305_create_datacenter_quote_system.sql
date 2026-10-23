/*
  # Datacenter Quote & Catalog System

  1. New Tables
    - `datacenters`
      - `id` (uuid, primary key)
      - `name` (text) - Datacenter name
      - `code` (text) - Short code for datacenter
      - `address` (text, optional) - Physical address
      - `created_at` (timestamptz)
    
    - `service_categories`
      - `id` (uuid, primary key)
      - `name` (text) - Category name (Compute, Storage, Network, etc.)
      - `description` (text) - Category description
      - `created_at` (timestamptz)
    
    - `services`
      - `id` (uuid, primary key)
      - `code` (text, unique) - Service code (CPU-1VC, RAM-1G, etc.)
      - `name` (text) - Service name
      - `description` (text) - Detailed description
      - `category_id` (uuid, FK) - Links to service_categories
      - `service_type` (text) - UNIT, OPTION, or BASE
      - `billing_scope` (text) - PER_VM, PER_CLIENT, PER_DC, or ONE_SHOT
      - `billing_mode` (text) - MONTHLY, ONE_SHOT, or BOTH
      - `base_price_monthly` (decimal, nullable)
      - `base_price_one_shot` (decimal, nullable)
      - `unit` (text) - vCPU, Go, VM, IP, etc.
      - `is_active` (boolean) - Service availability
      - `sage_item_code` (text) - Sage article code
      - `sage_vat_code` (text) - VAT code (20, 10, 0)
      - `sage_analytic_code` (text, optional)
      - `created_at` (timestamptz)
    
    - `quotes`
      - `id` (uuid, primary key)
      - `quote_number` (text, unique) - Format: YYYY-XXX
      - `client_name` (text)
      - `client_company` (text)
      - `client_email` (text)
      - `client_phone` (text)
      - `valid_until` (date)
      - `status` (text) - DRAFT, SENT, ACCEPTED, LOST
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `quote_lines`
      - `id` (uuid, primary key)
      - `quote_id` (uuid, FK) - Links to quotes
      - `service_id` (uuid, FK) - Links to services
      - `datacenter_id` (uuid, FK, optional) - Links to datacenters
      - `description` (text) - Line description
      - `quantity` (decimal)
      - `billing_selected` (text) - MONTHLY or ONE_SHOT
      - `unit_price` (decimal)
      - `discount_percent` (decimal) - Default 0
      - `total` (decimal) - Calculated total
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create datacenters table
CREATE TABLE IF NOT EXISTS datacenters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE datacenters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read datacenters"
  ON datacenters FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage datacenters"
  ON datacenters FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create service_categories table
CREATE TABLE IF NOT EXISTS service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read categories"
  ON service_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage categories"
  ON service_categories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  category_id uuid NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  service_type text NOT NULL DEFAULT 'UNIT',
  billing_scope text NOT NULL DEFAULT 'PER_VM',
  billing_mode text NOT NULL DEFAULT 'MONTHLY',
  base_price_monthly decimal(10,2),
  base_price_one_shot decimal(10,2),
  unit text NOT NULL,
  is_active boolean DEFAULT true,
  sage_item_code text NOT NULL DEFAULT '',
  sage_vat_code text NOT NULL DEFAULT '20',
  sage_analytic_code text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_service_type CHECK (service_type IN ('UNIT', 'OPTION', 'BASE')),
  CONSTRAINT valid_billing_scope CHECK (billing_scope IN ('PER_VM', 'PER_CLIENT', 'PER_DC', 'ONE_SHOT')),
  CONSTRAINT valid_billing_mode CHECK (billing_mode IN ('MONTHLY', 'ONE_SHOT', 'BOTH'))
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read services"
  ON services FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage services"
  ON services FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text UNIQUE NOT NULL,
  client_name text NOT NULL,
  client_company text NOT NULL DEFAULT '',
  client_email text NOT NULL DEFAULT '',
  client_phone text NOT NULL DEFAULT '',
  valid_until date NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('DRAFT', 'SENT', 'ACCEPTED', 'LOST'))
);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read quotes"
  ON quotes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage quotes"
  ON quotes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create quote_lines table
CREATE TABLE IF NOT EXISTS quote_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  datacenter_id uuid REFERENCES datacenters(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity decimal(10,2) NOT NULL DEFAULT 1,
  billing_selected text NOT NULL,
  unit_price decimal(10,2) NOT NULL,
  discount_percent decimal(5,2) NOT NULL DEFAULT 0,
  total decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_billing_selected CHECK (billing_selected IN ('MONTHLY', 'ONE_SHOT'))
);

ALTER TABLE quote_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read quote lines"
  ON quote_lines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to manage quote lines"
  ON quote_lines FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_code ON services(code);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_quote_lines_quote ON quote_lines(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_lines_service ON quote_lines(service_id);
CREATE INDEX IF NOT EXISTS idx_quotes_number ON quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);