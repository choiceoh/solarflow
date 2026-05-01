-- 046: 제조사 tier 컬럼 제거
-- 030에서 추가됐으나 정렬·필터·계산 어디에도 쓰이지 않고 목록 표시용으로만 사용됨.
-- 실무자가 글로벌 Tier 분류를 매번 입력할 이유가 없어 제거.

ALTER TABLE manufacturers DROP COLUMN IF EXISTS tier;
