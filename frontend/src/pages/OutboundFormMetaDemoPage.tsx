// Phase 2 PoC 한계선 데모 — OutboundForm 부분 메타화
// 실제 출고 등록에 사용하지 않음. 메타로 표현 가능한 영역(단순 필드 7개)과
// 메타 한계 영역(복잡 입력·계산·side effect)을 시각적으로 구분해 보여준다.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formComponents } from '@/templates/registry';

export default function OutboundFormMetaDemoPage() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState<Record<string, unknown> | null>(null);
  const FormComp = formComponents.outbound_form_simple;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">PoC · Phase 2</div>
        <h1 className="text-2xl font-semibold mt-1">출고 폼 메타 한계선 데모</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          기존 OutboundForm.tsx (599줄)을 분석한 결과, 메타로 깨끗하게 표현 가능한 영역은 약 30%입니다.
          이 페이지는 그 영역(단순 필드 7개)만 메타로 그려 메타 한계선을 시각적으로 입증합니다.
          실제 출고 등록에는 사용하지 않습니다 — 수량·창고·품번·B/L 연결 등 핵심 필드는 코드 폼에 남아 있습니다.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <div className="font-semibold text-emerald-700 mb-2">메타 가능 (이 데모)</div>
          <ul className="space-y-1 text-emerald-900 list-disc list-inside">
            <li>출고일 (date, required)</li>
            <li>용도 (select enum, required)</li>
            <li>현장명 / 현장 주소 (text)</li>
            <li>ERP 출고번호 (text)</li>
            <li>그룹내 거래 (switch)</li>
            <li>상대법인 (visibleIf: 그룹거래 켜짐)</li>
            <li>메모 (textarea)</li>
          </ul>
        </div>
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
          <div className="font-semibold text-amber-700 mb-2">메타 불가 — 코드 폼에 남김</div>
          <ul className="space-y-1 text-amber-900 list-disc list-inside">
            <li>수량 (천 단위 콤마 + raw value 분리)</li>
            <li>용량 kW (수량 × 모듈 출력 자동 계산)</li>
            <li>품번 + 정보 패널 (제조사·품명·규격)</li>
            <li>창고 (단일이면 자동 선택, BL 기반 자동 추천)</li>
            <li>B/L 연결 (다중 행 + 행별 select+qty + 상태 색상)</li>
            <li>수주 연결 (선택 시 자동 채움 side effect)</li>
            <li>order/editData 컨텍스트 lock 모드</li>
            <li>도메인 검증 (수량 ≤ 잔량, BL 합계 = 수량)</li>
          </ul>
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={() => setOpen(true)}>메타 폼 열기</Button>
        {submitted ? (
          <span className="text-xs text-muted-foreground self-center">
            마지막 제출: {JSON.stringify(submitted)}
          </span>
        ) : null}
      </div>

      {FormComp ? (
        <FormComp
          open={open}
          onOpenChange={setOpen}
          onSubmit={async (data) => {
            // 실제 API 호출 안 함 — 데모용. 제출 페이로드만 화면에 표시
            setSubmitted(data);
          }}
        />
      ) : (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          outbound_form_simple이 registry에 등록되지 않았습니다.
        </div>
      )}

      <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 space-y-2">
        <div className="font-semibold">결론</div>
        <p>
          이 폼은 50% 이상이 도메인 의존성·계산 필드·다중 행 입력이라 메타화의 가치 대비 복잡도가 큽니다.
          단순 폼(<code>PartnerForm</code>)은 100% 메타화 가능했지만, 복잡 폼은 부분 메타화도 의미가 제한적입니다.
        </p>
        <p>
          향후 다른 도메인(예: InboundForm, ReceiptForm)에서 단순/복잡 비율이 어느 쪽인지에 따라
          MetaForm 적용 여부를 결정하면 됩니다. <code>config/forms/outbound_simple.ts</code>의 주석이
          그 판단 기준을 제공합니다.
        </p>
      </div>
    </div>
  );
}
