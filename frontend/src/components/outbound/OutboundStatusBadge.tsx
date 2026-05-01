import { OUTBOUND_STATUS_LABEL, OUTBOUND_STATUS_COLOR, type OutboundStatus } from '@/types/outbound';

export default function OutboundStatusBadge({ status }: { status: OutboundStatus }) {
  return <span className={OUTBOUND_STATUS_COLOR[status]}>{OUTBOUND_STATUS_LABEL[status]}</span>;
}
