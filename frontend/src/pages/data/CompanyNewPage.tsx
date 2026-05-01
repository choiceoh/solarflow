import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EditPageShell from '@/components/common/EditPageShell';
import { CompanyFormBody, type CompanyFormData } from '@/components/masters/CompanyForm';
import { fetchWithAuth } from '@/lib/api';

const FORM_ID = 'company-form';
const BACK_TO = '/data?kind=companies';

export default function CompanyNewPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (data: CompanyFormData) => {
    setSaving(true);
    try {
      await fetchWithAuth('/api/v1/companies', { method: 'POST', body: JSON.stringify(data) });
      navigate(BACK_TO);
    } finally {
      setSaving(false);
    }
  };

  return (
    <EditPageShell
      eyebrow="DATA · 법인"
      title="법인 등록"
      description="새로운 법인 기준정보를 등록합니다."
      backTo={BACK_TO}
      formId={FORM_ID}
      saving={saving}
    >
      <CompanyFormBody formId={FORM_ID} onSubmit={handleSubmit} />
    </EditPageShell>
  );
}
