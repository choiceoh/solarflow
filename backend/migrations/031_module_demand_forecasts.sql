-- 031_module_demand_forecasts.sql
-- 운영 forecast: 자체 공사 예정 모듈 수요를 월/모듈군 단위로 저장합니다.

CREATE TABLE IF NOT EXISTS module_demand_forecasts (
    forecast_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id        UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    site_id           UUID REFERENCES construction_sites(site_id) ON DELETE SET NULL,
    site_name         TEXT NOT NULL,
    demand_month      TEXT NOT NULL CHECK (demand_month ~ '^[0-9]{4}-[0-9]{2}$'),
    demand_type       TEXT NOT NULL DEFAULT 'construction'
                      CHECK (demand_type IN ('construction', 'distribution_adjustment', 'other')),
    manufacturer_id   UUID REFERENCES manufacturers(manufacturer_id) ON DELETE SET NULL,
    spec_wp           INTEGER NOT NULL CHECK (spec_wp > 0),
    module_width_mm   INTEGER NOT NULL CHECK (module_width_mm > 0),
    module_height_mm  INTEGER NOT NULL CHECK (module_height_mm > 0),
    required_kw       NUMERIC(12,3) NOT NULL CHECK (required_kw > 0),
    status            TEXT NOT NULL DEFAULT 'planned'
                      CHECK (status IN ('planned', 'confirmed', 'done', 'cancelled')),
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_module_demand_forecasts_company
    ON module_demand_forecasts(company_id);
CREATE INDEX IF NOT EXISTS idx_module_demand_forecasts_month
    ON module_demand_forecasts(demand_month);
CREATE INDEX IF NOT EXISTS idx_module_demand_forecasts_module
    ON module_demand_forecasts(module_width_mm, module_height_mm, spec_wp);

ALTER TABLE module_demand_forecasts DISABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE module_demand_forecasts TO anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE module_demand_forecasts TO authenticated;
    END IF;
END $$;

COMMENT ON TABLE module_demand_forecasts IS
    '운영 forecast용 자체 공사/보정 수요. 확정 수주가 되기 전의 계획 물량을 월/모듈군 단위로 저장한다.';
