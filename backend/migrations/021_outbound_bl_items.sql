-- outbound_bl_items: 출고-B/L 다대다 연결 (분할선적 지원)
-- 하나의 출고건이 두 BL 이상 걸치는 경우를 표현하기 위한 테이블

CREATE TABLE IF NOT EXISTS outbound_bl_items (
  outbound_bl_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outbound_id         uuid NOT NULL REFERENCES outbounds(outbound_id) ON DELETE CASCADE,
  bl_id               uuid NOT NULL REFERENCES bl_shipments(bl_id),
  quantity            int  NOT NULL CHECK (quantity > 0),
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outbound_bl_items_outbound ON outbound_bl_items (outbound_id);
CREATE INDEX IF NOT EXISTS idx_outbound_bl_items_bl ON outbound_bl_items (bl_id);

-- 기존 outbounds.bl_id 데이터 마이그레이션
INSERT INTO outbound_bl_items (outbound_id, bl_id, quantity)
SELECT outbound_id, bl_id, quantity
FROM outbounds
WHERE bl_id IS NOT NULL
ON CONFLICT DO NOTHING;
