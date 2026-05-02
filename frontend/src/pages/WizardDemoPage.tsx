// Phase 4 보강: 다단계 wizard 데모 페이지
// MetaFormConfig.wizard=true 시 step 별 분리 렌더 + 진행률 + step 검증.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import MetaForm from '@/templates/MetaForm';
import wizardConfig from '@/config/forms/wizard_demo';

export default function WizardDemoPage() {
  const [open, setOpen] = useState(true);
  const [submitted, setSubmitted] = useState<Record<string, unknown> | null>(null);

  const handleSubmit = async (data: Record<string, unknown>) => {
    setSubmitted(data);
    console.log('[wizard-demo] submit', data);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-4">
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
        <div className="font-semibold mb-1">PoC · 다단계 wizard 모드</div>
        <p>
          <code>MetaFormConfig.wizard: true</code> 활성 시 각 section.title 이 step 이 되어
          한 번에 한 step 만 노출. 이전/다음 네비게이션 + 진행률 막대 + step 단위 검증.
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-0.5">
          <li>4 step (기본 정보 / 사양 / 가격 / 추가 정보)</li>
          <li>"다음" 버튼: 현재 step 의 필드만 검증 (zod), 통과해야 진행</li>
          <li>"이전" 버튼: 검증 없이 후퇴</li>
          <li>마지막 step: "저장" 버튼 (전체 검증 후 제출)</li>
          <li>section title 이 step 라벨로 자동 표시 (wizard 모드에선 본문에 중복 표시 안 됨)</li>
        </ul>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => { setOpen(true); setSubmitted(null); }}>다이얼로그 다시 열기</Button>
      </div>

      {submitted && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">제출 payload:</p>
          <pre className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs overflow-auto">
{JSON.stringify(submitted, null, 2)}
          </pre>
        </div>
      )}

      <MetaForm
        config={wizardConfig}
        open={open}
        onOpenChange={setOpen}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
