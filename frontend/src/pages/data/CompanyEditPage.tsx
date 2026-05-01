import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EditPageShell from '@/components/common/EditPageShell';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { CompanyFormBody, type CompanyFormData } from '@/components/masters/CompanyForm';
import { fetchWithAuth } from '@/lib/api';
import type { Company } from '@/types/masters';

const FORM_ID = 'company-form';
const BACK_TO = '/data?kind=companies';

export default function CompanyEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editData, setEditData] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const company = await fetchWithAuth<Company>(`/api/v1/companies/${id}`);
        if (!cancelled) setEditData(company);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : '불러오기 실패');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleSubmit = async (data: CompanyFormData) => {
    if (!id) return;
    setSaving(true);
    try {
      await fetchWithAuth(`/api/v1/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      navigate(BACK_TO);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner className="h-screen" />;
  if (loadError || !editData) {
    return (
      <EditPageShell eyebrow="DATA · 법인" title="법인 수정" backTo={BACK_TO} formId={FORM_ID}>
        <p className="text-sm text-destructive">법인 정보를 불러올 수 없습니다. {loadError ?? ''}</p>
      </EditPageShell>
    );
  }

  return (
    <EditPageShell
      eyebrow="DATA · 법인"
      title={`법인 수정 — ${editData.company_name}`}
      description="등록된 법인 정보를 수정합니다."
      backTo={BACK_TO}
      formId={FORM_ID}
      saving={saving}
    >
      <CompanyFormBody formId={FORM_ID} editData={editData} onSubmit={handleSubmit} />
    </EditPageShell>
  );
}
