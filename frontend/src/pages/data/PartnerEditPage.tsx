import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EditPageShell from '@/components/common/EditPageShell';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { PartnerFormBody, type PartnerFormData } from '@/components/masters/PartnerForm';
import { fetchWithAuth } from '@/lib/api';
import type { Partner } from '@/types/masters';

const FORM_ID = 'partner-form';
const BACK_TO = '/data?kind=partners';

export default function PartnerEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editData, setEditData] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchWithAuth<Partner>(`/api/v1/partners/${id}`);
        if (!cancelled) setEditData(data);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : '불러오기 실패');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleSubmit = async (data: PartnerFormData) => {
    if (!id) return;
    setSaving(true);
    try {
      await fetchWithAuth(`/api/v1/partners/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      navigate(BACK_TO);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner className="h-screen" />;
  if (loadError || !editData) {
    return (
      <EditPageShell eyebrow="DATA · 거래처" title="거래처 수정" backTo={BACK_TO} formId={FORM_ID}>
        <p className="text-sm text-destructive">거래처 정보를 불러올 수 없습니다. {loadError ?? ''}</p>
      </EditPageShell>
    );
  }

  return (
    <EditPageShell
      eyebrow="DATA · 거래처"
      title={`거래처 수정 — ${editData.partner_name}`}
      backTo={BACK_TO}
      formId={FORM_ID}
      saving={saving}
    >
      <PartnerFormBody formId={FORM_ID} editData={editData} onSubmit={handleSubmit} />
    </EditPageShell>
  );
}
