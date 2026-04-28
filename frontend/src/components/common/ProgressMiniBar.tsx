import { cn } from '@/lib/utils';

interface ProgressMiniBarProps {
  value?: number | null;
  total?: number | null;
  percent?: number | null;
  colorClassName?: string;
  trackClassName?: string;
  className?: string;
  barClassName?: string;
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export default function ProgressMiniBar({
  value,
  total,
  percent,
  colorClassName = 'bg-primary',
  trackClassName = 'bg-muted',
  className,
  barClassName,
}: ProgressMiniBarProps) {
  const resolvedPercent = percent ?? (
    total && total > 0 && value != null ? (value / total) * 100 : 0
  );
  const width = clampPercent(resolvedPercent);

  return (
    <div className={cn('h-2 rounded bg-muted overflow-hidden', trackClassName, className)}>
      <div className={cn('h-full rounded', colorClassName, barClassName)} style={{ width: `${width}%` }} />
    </div>
  );
}
