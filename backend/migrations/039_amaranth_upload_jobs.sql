-- 039_amaranth_upload_jobs.sql
-- 아마란스 웹 RPA 업로드 작업 대기열
-- 실제 .xlsx 파일은 로컬 파일시스템에 저장하고, DB에는 추적/중복방지 정보만 둔다.

CREATE TABLE IF NOT EXISTS amaranth_upload_jobs (
  job_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type         text NOT NULL,
  status           text NOT NULL DEFAULT 'pending',
  company_id       uuid,
  date_from        date,
  date_to          date,
  file_name        text NOT NULL,
  stored_name      text NOT NULL,
  stored_path      text NOT NULL,
  content_type     text NOT NULL DEFAULT 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  size_bytes       bigint NOT NULL DEFAULT 0,
  file_sha256      text NOT NULL,
  row_count        integer NOT NULL DEFAULT 0,
  created_by       text,
  created_by_email text,
  attempts         integer NOT NULL DEFAULT 0,
  upload_message   text,
  last_error       text,
  rpa_started_at   timestamptz,
  uploaded_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT amaranth_upload_jobs_type_check
    CHECK (job_type IN ('outbound')),
  CONSTRAINT amaranth_upload_jobs_status_check
    CHECK (status IN ('pending', 'running', 'uploaded', 'failed', 'manual_required', 'cancelled')),
  CONSTRAINT amaranth_upload_jobs_hash_unique
    UNIQUE (job_type, file_sha256)
);

COMMENT ON TABLE amaranth_upload_jobs IS '아마란스 웹 엑셀 업로드 RPA 작업 대기열';
COMMENT ON COLUMN amaranth_upload_jobs.file_sha256 IS '동일 엑셀 파일 중복 업로드 방지용 해시';
COMMENT ON COLUMN amaranth_upload_jobs.status IS 'pending/running/uploaded/failed/manual_required/cancelled';

CREATE INDEX IF NOT EXISTS idx_amaranth_upload_jobs_status
  ON amaranth_upload_jobs(job_type, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_amaranth_upload_jobs_company_period
  ON amaranth_upload_jobs(company_id, date_from, date_to, created_at DESC);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    GRANT SELECT, INSERT, UPDATE ON TABLE amaranth_upload_jobs TO anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT SELECT, INSERT, UPDATE ON TABLE amaranth_upload_jobs TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT, INSERT, UPDATE ON TABLE amaranth_upload_jobs TO service_role;
  END IF;
END $$;
