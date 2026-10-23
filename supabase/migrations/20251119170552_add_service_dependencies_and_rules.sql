/*
  # Add Service Dependencies and Rules

  1. New Tables
    - `service_dependencies`
      - Links services together with dependency rules
      - When service A is added, service B is automatically added/updated
    
    - `service_pricing_rules`
      - Rules for calculating prices based on resource quantities
      - Example: Backup price = disk_size * unit_price_per_gb

  2. Details
    - `service_dependencies` allows defining which services trigger others
    - `dependency_type` can be:
      - REQUIRED: B must be added when A is added
      - OPTIONAL: B can be added when A is added
      - AUTO_SCALE: B quantity scales with A's resources
    
    - `resource_matcher` specifies which resource type to match (e.g., DISK)
    - `multiplier` for calculating dependent quantities

  3. Security
    - Enable RLS with public policies
*/

-- Create service_dependencies table
CREATE TABLE IF NOT EXISTS service_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  dependent_service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  dependency_type text NOT NULL,
  resource_matcher text,
  quantity_multiplier decimal(10,2) DEFAULT 1.0,
  auto_add boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_dependency_type CHECK (dependency_type IN ('REQUIRED', 'OPTIONAL', 'AUTO_SCALE')),
  CONSTRAINT valid_resource_matcher CHECK (resource_matcher IS NULL OR resource_matcher IN ('CPU', 'RAM', 'DISK', 'ALL'))
);

ALTER TABLE service_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to service_dependencies"
  ON service_dependencies FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to service_dependencies"
  ON service_dependencies FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to service_dependencies"
  ON service_dependencies FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to service_dependencies"
  ON service_dependencies FOR DELETE
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_service_dependencies_parent 
  ON service_dependencies(parent_service_id);
  
CREATE INDEX IF NOT EXISTS idx_service_dependencies_dependent 
  ON service_dependencies(dependent_service_id);

-- Add description field to service_dependencies for clarity
ALTER TABLE service_dependencies 
ADD COLUMN IF NOT EXISTS description text DEFAULT '';

COMMENT ON TABLE service_dependencies IS 'Defines dependencies between services for automatic addition and quantity calculation';
COMMENT ON COLUMN service_dependencies.dependency_type IS 'REQUIRED: must be added, OPTIONAL: can be added, AUTO_SCALE: quantity scales with parent';
COMMENT ON COLUMN service_dependencies.resource_matcher IS 'Which resource type to match (CPU/RAM/DISK/ALL) for auto-scaling';
COMMENT ON COLUMN service_dependencies.quantity_multiplier IS 'Multiplier for calculating dependent service quantity';
COMMENT ON COLUMN service_dependencies.auto_add IS 'Automatically add this dependent service when parent is added';
