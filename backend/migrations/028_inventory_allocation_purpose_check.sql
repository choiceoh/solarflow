-- 028_inventory_allocation_purpose_check.sql
-- 공사사용 배정 purpose 값과 DB 체크 제약 동기화

ALTER TABLE inventory_allocations
    DROP CONSTRAINT IF EXISTS inventory_allocations_purpose_check;

ALTER TABLE inventory_allocations
    ADD CONSTRAINT inventory_allocations_purpose_check
    CHECK (
        purpose IN (
            'sale',
            'construction',
            'construction_own',
            'construction_epc',
            'other'
        )
    );
