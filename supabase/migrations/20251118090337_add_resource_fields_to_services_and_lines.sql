/*
  # Add Resource Fields for vCPU, RAM, and Disk

  1. Changes to `services` table
    - Add `vcpu_count` (decimal, nullable) - Number of vCPUs for BASE options
    - Add `ram_gb` (decimal, nullable) - Amount of RAM in GB for BASE options
    - Add `disk_gb` (decimal, nullable) - Amount of disk in GB for BASE options

  2. Changes to `quote_lines` table
    - Add `vcpu_count` (decimal, nullable) - vCPU count for this line
    - Add `ram_gb` (decimal, nullable) - RAM in GB for this line
    - Add `disk_gb` (decimal, nullable) - Disk in GB for this line

  These fields allow easy extraction of totals for CPU, RAM, and disk resources
  when generating quotes, especially for BASE service types.
*/

-- Add resource fields to services table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'vcpu_count'
  ) THEN
    ALTER TABLE services ADD COLUMN vcpu_count decimal DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'ram_gb'
  ) THEN
    ALTER TABLE services ADD COLUMN ram_gb decimal DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'services' AND column_name = 'disk_gb'
  ) THEN
    ALTER TABLE services ADD COLUMN disk_gb decimal DEFAULT 0;
  END IF;
END $$;

-- Add resource fields to quote_lines table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_lines' AND column_name = 'vcpu_count'
  ) THEN
    ALTER TABLE quote_lines ADD COLUMN vcpu_count decimal DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_lines' AND column_name = 'ram_gb'
  ) THEN
    ALTER TABLE quote_lines ADD COLUMN ram_gb decimal DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_lines' AND column_name = 'disk_gb'
  ) THEN
    ALTER TABLE quote_lines ADD COLUMN disk_gb decimal DEFAULT 0;
  END IF;
END $$;
