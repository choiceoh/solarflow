// Phase 4 보강: 다단계 wizard 데모 폼
// MetaFormConfig.wizard=true 시 각 section.title 이 step 이 됨.
// 이전/다음 네비게이션 + 진행률 표시 + step 단위 검증.

import type { MetaFormConfig } from '@/templates/types';

const wizardDemo: MetaFormConfig = {
  id: 'wizard_demo',
  title: { create: '다단계 마법사 데모', edit: '다단계 마법사 데모' },
  dialogSize: 'lg',
  wizard: true, // ← 핵심
  sections: [
    {
      title: '1단계: 기본 정보',
      tone: 'ink',
      cols: 1,
      fields: [
        { key: 'product_name', label: '제품명', type: 'text', required: true, placeholder: '예: 데모 모듈' },
        { key: 'product_code', label: '품번 코드', type: 'text', required: true, minLength: 3, placeholder: '예: DM-001' },
      ],
    },
    {
      title: '2단계: 사양',
      tone: 'solar',
      cols: 2,
      fields: [
        { key: 'spec_wp', label: '규격 (Wp)', type: 'number', required: true, minValue: 1 },
        { key: 'manufacturer', label: '제조사', type: 'text', required: true },
      ],
    },
    {
      title: '3단계: 가격',
      tone: 'info',
      cols: 2,
      fields: [
        { key: 'unit_price', label: '단가', type: 'number', required: true, minValue: 0, numberFormat: 'krw' },
        { key: 'quantity', label: '수량', type: 'number', required: true, minValue: 1 },
      ],
    },
    {
      title: '4단계: 추가 정보',
      tone: 'pos',
      cols: 1,
      fields: [
        { key: 'notes', label: '메모', type: 'textarea' },
        { key: 'is_active', label: '활성', type: 'switch', defaultValue: true },
      ],
    },
  ],
};

export default wizardDemo;
