/*
  # Add base quantity field to quote_lines

  1. Changes
    - Add `base_quantity` column to track original quantity before multipliers
    - Update existing rows to set base_quantity = quantity
    - This allows multipliers to recalculate correctly

  2. Notes
    - When a line is added, base_quantity stores the original value
    - The quantity field contains the final multiplied value
    - Multipliers always apply to base_quantity, not current quantity
*/

-- Add base_quantity column
ALTER TABLE quote_lines 
ADD COLUMN IF NOT EXISTS base_quantity decimal(10,2);

-- Set base_quantity to current quantity for existing rows
UPDATE quote_lines 
SET base_quantity = quantity 
WHERE base_quantity IS NULL;

-- Set default for new rows
ALTER TABLE quote_lines 
ALTER COLUMN base_quantity SET DEFAULT 1.0;

COMMENT ON COLUMN quote_lines.base_quantity IS 'Original quantity before multipliers are applied';
