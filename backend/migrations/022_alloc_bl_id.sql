-- inventory_allocations에 BL 연결 추가
-- 미착품 예약 시 어떤 BL에서 올지 지정하거나,
-- 현재고 예약 시 어떤 BL에서 출고될지 미리 지정하기 위함

ALTER TABLE inventory_allocations
  ADD COLUMN IF NOT EXISTS bl_id uuid REFERENCES bl_shipments(bl_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_alloc_bl_id ON inventory_allocations (bl_id);
