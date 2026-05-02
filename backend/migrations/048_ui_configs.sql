-- 048_ui_configs.sql
-- Phase 3: 운영자 GUI 메타 편집기의 영구 저장소
--   ui_configs — 화면/폼/상세 메타 config의 override를 DB에 보관.
--   Frontend useResolvedConfig가 default(코드 import) vs override(이 테이블)을 우선순위로 선택.
--
-- 적용:
--   psql $SUPABASE_DB_URL -f backend/migrations/048_ui_configs.sql
--   psql $SUPABASE_DB_URL -c "NOTIFY pgrst, 'reload schema';"

CREATE TABLE IF NOT EXISTS ui_configs (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  scope       text        NOT NULL,
  config_id   text        NOT NULL,
  config      jsonb       NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid        REFERENCES user_profiles(user_id) ON DELETE SET NULL,
  CONSTRAINT ui_configs_scope_check
    CHECK (scope IN ('screen', 'form', 'detail')),
  CONSTRAINT ui_configs_scope_id_unique UNIQUE (scope, config_id)
);

COMMENT ON TABLE ui_configs IS
  '운영자 GUI 메타 편집기 override 저장소 — 화면/폼/상세 config의 (scope, config_id) 단위 단일 행.';
COMMENT ON COLUMN ui_configs.scope IS
  '''screen'' | ''form'' | ''detail'' — frontend templates의 카테고리';
COMMENT ON COLUMN ui_configs.config_id IS
  '코드 import config의 id 필드 값 (예: ''partners'', ''partner_form_v2'')';
COMMENT ON COLUMN ui_configs.config IS
  'jsonb — 적용 시 default 코드 config를 통째로 대체';

CREATE INDEX IF NOT EXISTS idx_ui_configs_scope_config_id
  ON ui_configs(scope, config_id);

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION sf_touch_ui_config_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ui_configs_updated_at ON ui_configs;
CREATE TRIGGER trg_ui_configs_updated_at
  BEFORE UPDATE ON ui_configs
  FOR EACH ROW EXECUTE FUNCTION sf_touch_ui_config_updated_at();

-- PostgREST 권한
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ui_configs TO anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ui_configs TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ui_configs TO service_role;
  END IF;
END $$;
