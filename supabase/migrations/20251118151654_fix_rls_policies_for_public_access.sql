/*
  # Fix RLS Policies for Public Access

  1. Changes
    - Drop existing restrictive policies that require authentication
    - Create new policies that allow public access to all tables
    - This is necessary since the application doesn't have authentication implemented

  2. Security Notes
    - In a production environment, authentication should be implemented
    - These policies allow anonymous access for development purposes
*/

-- Drop existing policies for service_categories
DROP POLICY IF EXISTS "Allow authenticated users to read categories" ON service_categories;
DROP POLICY IF EXISTS "Allow authenticated users to manage categories" ON service_categories;

-- Create public policies for service_categories
CREATE POLICY "Allow public read access to categories"
  ON service_categories FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to categories"
  ON service_categories FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to categories"
  ON service_categories FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to categories"
  ON service_categories FOR DELETE
  USING (true);

-- Drop existing policies for services
DROP POLICY IF EXISTS "Allow authenticated users to read services" ON services;
DROP POLICY IF EXISTS "Allow authenticated users to manage services" ON services;

-- Create public policies for services
CREATE POLICY "Allow public read access to services"
  ON services FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to services"
  ON services FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to services"
  ON services FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to services"
  ON services FOR DELETE
  USING (true);

-- Drop existing policies for datacenters
DROP POLICY IF EXISTS "Allow authenticated users to read datacenters" ON datacenters;
DROP POLICY IF EXISTS "Allow authenticated users to manage datacenters" ON datacenters;

-- Create public policies for datacenters
CREATE POLICY "Allow public read access to datacenters"
  ON datacenters FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to datacenters"
  ON datacenters FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to datacenters"
  ON datacenters FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to datacenters"
  ON datacenters FOR DELETE
  USING (true);

-- Drop existing policies for quotes
DROP POLICY IF EXISTS "Allow authenticated users to read quotes" ON quotes;
DROP POLICY IF EXISTS "Allow authenticated users to manage quotes" ON quotes;

-- Create public policies for quotes
CREATE POLICY "Allow public read access to quotes"
  ON quotes FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to quotes"
  ON quotes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to quotes"
  ON quotes FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to quotes"
  ON quotes FOR DELETE
  USING (true);

-- Drop existing policies for quote_lines
DROP POLICY IF EXISTS "Allow authenticated users to read quote lines" ON quote_lines;
DROP POLICY IF EXISTS "Allow authenticated users to manage quote lines" ON quote_lines;

-- Create public policies for quote_lines
CREATE POLICY "Allow public read access to quote_lines"
  ON quote_lines FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to quote_lines"
  ON quote_lines FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to quote_lines"
  ON quote_lines FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to quote_lines"
  ON quote_lines FOR DELETE
  USING (true);
