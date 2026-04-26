-- 030: 제조사 내부 우선순위와 Tier 관리
-- 대시보드, 수급전망, 필터 드롭다운에서 영업상 우선순위를 일관되게 사용한다.

ALTER TABLE manufacturers
  ADD COLUMN IF NOT EXISTS tier integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS priority_rank integer NOT NULL DEFAULT 999;

UPDATE manufacturers
SET
  tier = CASE
    WHEN COALESCE(short_name, name_kr, name_en) ILIKE '%진코%' OR COALESCE(short_name, name_kr, name_en) ILIKE '%jinko%' THEN 1
    WHEN COALESCE(short_name, name_kr, name_en) ILIKE '%트리나%' OR COALESCE(short_name, name_kr, name_en) ILIKE '%trina%' THEN 1
    WHEN COALESCE(short_name, name_kr, name_en) ILIKE '%론지%' OR COALESCE(short_name, name_kr, name_en) ILIKE '%longi%' THEN 1
    WHEN COALESCE(short_name, name_kr, name_en) ILIKE '%라이젠%' OR COALESCE(short_name, name_kr, name_en) ILIKE '%risen%' THEN 2
    ELSE tier
  END,
  priority_rank = CASE
    WHEN COALESCE(short_name, name_kr, name_en) ILIKE '%진코%' OR COALESCE(short_name, name_kr, name_en) ILIKE '%jinko%' THEN 10
    WHEN COALESCE(short_name, name_kr, name_en) ILIKE '%트리나%' OR COALESCE(short_name, name_kr, name_en) ILIKE '%trina%' THEN 20
    WHEN COALESCE(short_name, name_kr, name_en) ILIKE '%론지%' OR COALESCE(short_name, name_kr, name_en) ILIKE '%longi%' THEN 30
    WHEN COALESCE(short_name, name_kr, name_en) ILIKE '%라이젠%' OR COALESCE(short_name, name_kr, name_en) ILIKE '%risen%' THEN 40
    ELSE priority_rank
  END;
