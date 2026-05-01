// Phase 2 PoC: 출고 폼 — 메타 한계선 입증용 부분 메타화
// ───────────────────────────────────────────────────────────────────────────
// OutboundForm.tsx (599줄) 분석 결과 메타로 깨끗하게 표현 가능한 영역은
// 전체의 약 30%(아래 7개 필드). 나머지는 코드 폼에 남긴다.
//
// 메타 가능 (이 파일):
//   - outbound_date (date, required)
//   - usage_category (select enum, required)
//   - site_name, site_address (text)
//   - erp_outbound_no (text)
//   - memo (textarea)
//   - group_trade (switch)
//   - target_company_id (select, visibleIf: group_trade===true) ← 마스터 옵션 필요
//
// 메타로 가능하지만 어댑터 추가 필요:
//   - product_id, warehouse_id, order_id (master select + 커스텀 라벨)
//
// 메타 불가 — 코드 영역:
//   - quantity (천 단위 콤마 표시 + raw value 분리)
//   - capacity_kw (quantity × wattage_kw 자동 계산 readOnly)
//   - 품번 정보 패널 (제조사·품명·규격 그리드)
//   - B/L 연결 (다중 행 add/remove + 상태별 색상)
//   - order 자동 채움 side effect
//   - 창고 자동 선택 (단일/order BL 기반)
//   - order/editData 컨텍스트 lock 모드 (Lock 아이콘)
//   - submitError 배너
//   - 도메인 검증 (수량 ≤ 수주 잔량, BL 합계 = 수량)
//   - payload 후처리 (group_trade=false면 target_company_id drop)
//
// 결론: 이 폼은 50% 이상이 도메인 의존성·계산 필드·다중 행 입력이라
// 메타화의 가치 대비 복잡도가 크다. 단순 폼(PartnerForm)과의 차이를 보여주는
// 한계선 입증용 산출물로만 의미를 가진다.
// ───────────────────────────────────────────────────────────────────────────

import type { MetaFormConfig } from '@/templates/types';

const outboundSimple: MetaFormConfig = {
  id: 'outbound_form_simple',
  title: { create: '출고 등록 (메타 한계선 데모)', edit: '출고 수정 (메타 한계선 데모)' },
  sections: [
    {
      cols: 2,
      fields: [
        { key: 'outbound_date', label: '출고일', type: 'date', required: true },
        {
          key: 'usage_category', label: '용도', type: 'select', required: true,
          optionsFrom: 'enum', enumKey: 'USAGE_CATEGORY_LABEL',
        },
      ],
    },
    {
      cols: 2,
      fields: [
        { key: 'site_name', label: '현장명', type: 'text' },
        { key: 'site_address', label: '현장 주소', type: 'text' },
      ],
    },
    {
      cols: 1,
      fields: [
        { key: 'erp_outbound_no', label: 'ERP 출고번호', type: 'text' },
      ],
    },
    {
      cols: 1,
      fields: [
        { key: 'group_trade', label: '그룹내 거래', type: 'switch' },
      ],
    },
    {
      cols: 1,
      fields: [
        // visibleIf로 group_trade=true일 때만 노출
        // 단, target_company_id는 회사 마스터에서 자기 법인 제외 필터가 필요해
        // 현재 masterSources 어댑터로는 부족 (`companies.exclude_self` 같은 추가 필요)
        // 따라서 PoC에서는 일단 static 옵션 placeholder로 표기
        {
          key: 'target_company_id', label: '상대법인', type: 'select',
          required: true,
          optionsFrom: 'static',
          staticOptions: [
            { value: '__placeholder', label: '— 회사 마스터 어댑터 추가 필요 —' },
          ],
          visibleIf: { field: 'group_trade', value: 'true' },
        },
      ],
    },
    {
      cols: 1,
      fields: [
        { key: 'memo', label: '메모', type: 'textarea' },
      ],
    },
  ],
};

export default outboundSimple;
