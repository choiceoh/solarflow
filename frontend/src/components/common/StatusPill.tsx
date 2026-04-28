import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatusPillProps {
  label: ReactNode;
  colorClassName?: string;
  className?: string;
  title?: string;
}

export default function StatusPill({ label, colorClassName, className, title }: StatusPillProps) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap',
        colorClassName ?? 'bg-muted text-muted-foreground',
        className,
      )}
    >
      {label}
    </span>
  );
}
