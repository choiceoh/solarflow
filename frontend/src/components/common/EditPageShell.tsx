import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EditPageShellProps {
  eyebrow?: string;
  title: string;
  description?: string;
  backTo: string;
  formId: string;
  saveLabel?: string;
  saving?: boolean;
  children: ReactNode;
}

export default function EditPageShell({
  eyebrow,
  title,
  description,
  backTo,
  formId,
  saveLabel = '저장',
  saving = false,
  children,
}: EditPageShellProps) {
  const navigate = useNavigate();

  return (
    <div className="sf-page">
      <div className="sf-page-header">
        <div className="min-w-0">
          {eyebrow ? <div className="sf-eyebrow">{eyebrow}</div> : null}
          <h1 className="sf-page-title">{title}</h1>
          {description ? <p className="sf-page-description">{description}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(backTo)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />뒤로
          </Button>
        </div>
      </div>

      <div className="card mx-auto w-full max-w-2xl p-6">
        {children}
        <div className="mt-6 flex items-center justify-end gap-2 border-t border-[var(--line)] pt-4">
          <Button type="button" variant="outline" onClick={() => navigate(backTo)} disabled={saving}>취소</Button>
          <Button type="submit" form={formId} disabled={saving}>
            {saving ? '저장 중...' : saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
