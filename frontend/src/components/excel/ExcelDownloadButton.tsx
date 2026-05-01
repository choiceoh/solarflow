import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
}

export default function ExcelDownloadButton({ onClick, loading, disabled }: Props) {
  return (
    <Button
      variant="outline"
      size="xs"
      onClick={onClick}
      disabled={disabled || loading}
    >
      <Download className="mr-1 h-3 w-3" />
      {loading ? '생성 중...' : '양식 다운로드'}
    </Button>
  );
}
