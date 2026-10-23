/*
  # Add Service Resource Details

  1. New Table
    - `service_resource_details`
      - `id` (uuid, primary key)
      - `service_id` (uuid, FK) - Links to services
      - `resource_type` (text) - Type of resource: CPU, RAM, DISK
      - `quantity` (decimal) - Amount of resource
      - `unit` (text) - Unit (vCPU, GB, TB, etc.)
      - `description` (text) - Description of this resource line
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on the table
    - Add policies for public access

  This allows a BASE service to have multiple resource detail lines,
  making it easy to specify complex configurations like:
  - 4 vCPU
  - 16 GB RAM
  - 100 GB SSD System Disk
  - 500 GB HDD Data Disk
*/

-- Create service_resource_details table
CREATE TABLE IF NOT EXISTS service_resource_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  resource_type text NOT NULL,
  quantity decimal(10,2) NOT NULL DEFAULT 0,
  unit text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_resource_type CHECK (resource_type IN ('CPU', 'RAM', 'DISK'))
);

ALTER TABLE service_resource_details ENABLE ROW LEVEL SECURITY;

-- Create public policies for service_resource_details
CREATE POLICY "Allow public read access to service_resource_details"
  ON service_resource_details FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to service_resource_details"
  ON service_resource_details FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to service_resource_details"
  ON service_resource_details FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to service_resource_details"
  ON service_resource_details FOR DELETE
  USING (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_service_resource_details_service_id 
  ON service_resource_details(service_id);
