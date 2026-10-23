/*
  # Add Service Multipliers System

  1. New Tables
    - `service_multipliers`
      - Defines services that act as multipliers (like PRA)
      - Links to categories they affect
      - Specifies the multiplication factor
    
  2. Changes to services table
    - Add `is_multiplier` flag to identify multiplier services
    - Add `multiplier_value` to store the multiplication factor

  3. Use Cases
    - PRA option multiplies compute/storage categories by 2
    - Backup options might multiply by specific factors
    - Disaster recovery services

  4. Security
    - Enable RLS with public policies
*/

-- Add fields to services table for multiplier functionality
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS is_multiplier boolean DEFAULT false;

ALTER TABLE services 
ADD COLUMN IF NOT EXISTS multiplier_value decimal(10,2) DEFAULT 1.0;

COMMENT ON COLUMN services.is_multiplier IS 'True if this service acts as a multiplier (e.g., PRA doubles infrastructure)';
COMMENT ON COLUMN services.multiplier_value IS 'Multiplication factor applied to affected categories (e.g., 2.0 for PRA)';

-- Create service_multipliers table to define which categories are affected
CREATE TABLE IF NOT EXISTS service_multipliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  affected_category_id uuid NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  multiplier_factor decimal(10,2) DEFAULT 2.0,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(service_id, affected_category_id)
);

ALTER TABLE service_multipliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to service_multipliers"
  ON service_multipliers FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to service_multipliers"
  ON service_multipliers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to service_multipliers"
  ON service_multipliers FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to service_multipliers"
  ON service_multipliers FOR DELETE
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_service_multipliers_service 
  ON service_multipliers(service_id);
  
CREATE INDEX IF NOT EXISTS idx_service_multipliers_category 
  ON service_multipliers(affected_category_id);

CREATE INDEX IF NOT EXISTS idx_services_is_multiplier
  ON services(is_multiplier) WHERE is_multiplier = true;

COMMENT ON TABLE service_multipliers IS 'Defines which categories are affected by multiplier services like PRA';
COMMENT ON COLUMN service_multipliers.multiplier_factor IS 'Factor to multiply quantities by (e.g., 2.0 for doubling)';
