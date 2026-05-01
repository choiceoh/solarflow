import { BL_STATUS_LABEL, BL_STATUS_COLOR, type BLStatus } from '@/types/inbound';

export default function InboundStatusBadge({ status }: { status: BLStatus }) {
  return <span className={BL_STATUS_COLOR[status]}>{BL_STATUS_LABEL[status]}</span>;
}
