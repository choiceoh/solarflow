import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- 포맷 유틸 ---

export function formatNumber(n: number): string {
  return n.toLocaleString('ko-KR');
}

export function formatUSD(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatKRW(n: number): string {
  return `${n.toLocaleString('ko-KR')}원`;
}

export function formatPercent(n: number): string {
  return `${n.toFixed(2)}%`;
}

export function formatDate(d: string): string {
  if (!d) return '—';
  return d.slice(0, 10);
}

export function formatWp(n: number): string {
  return `${n}Wp`;
}

/**
 * kW 값을 "X.XMW (X,XXXkW)" 형식으로 통일 표시.
 * 용량 표기 = MW 기본 + kW 부수. EA는 알 수 있는 경우 formatCapacity로 추가.
 */
export function formatKw(n: number): string {
  const mw = (n / 1000).toFixed(1);
  const kw = Math.round(n).toLocaleString('ko-KR');
  return `${mw}MW (${kw}kW)`;
}

/**
 * kW + EA(모듈 장수) 함께 표시: "X.XMW (X,XXXkW / X,XXXEA)"
 * ea가 주어지지 않으면 formatKw와 동일.
 */
export function formatCapacity(kw: number, ea?: number): string {
  const base = formatKw(kw);
  if (ea == null || ea === 0) return base;
  return `${base.slice(0, -1)} / ${Math.round(ea).toLocaleString('ko-KR')}EA)`;
}

export function formatMW(n: number): string {
  return `${(n / 1000).toFixed(1)}MW`;
}

export function formatSize(w: number, h: number): string {
  return `${w} x ${h} mm`;
}

// --- 모듈 레이블 ---

// ─── 제조사명 간략 표기 (실무 관행) ────────────────────────────────────────
// "진코솔라" → "진코", "트리나솔라" → "트리나", "LONGi" → "론지" 등
const _MFG_OVERRIDE: Record<string, string> = {
  longi: '론지',
  'longi solar': '론지',
  tongwei: '통웨이',
};
// 제거할 접미사 (긴 것 먼저 매칭)
const _MFG_SUFFIX_RE = /(에너지솔루션|에너지솔라|에너지|솔루션|솔라|[ ]?[Ss]olar[ ]?[Ee]nergy|[ ]?[Ss]olar|[ ]?[Ee]nergy)$/;

/**
 * 제조사 전체명 → 실무 약칭.
 * "진코솔라" → "진코", "트리나솔라" → "트리나", "라이젠에너지" → "라이젠", "LONGi" → "론지"
 */
export function shortMfgName(name: string | null | undefined): string {
  if (!name) return '—';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (_MFG_OVERRIDE[lower]) return _MFG_OVERRIDE[lower];
  return trimmed.replace(_MFG_SUFFIX_RE, '').trim() || trimmed;
}

/**
 * 제조사 약칭 + 사양 조합 레이블. 예: "진코 640W", "트리나 730W"
 * @param mfg   short_name 우선, 없으면 name_kr → shortMfgName 적용
 * @param specWp 모듈 사양(Wp). 없으면 제조사명만 반환
 */
export function moduleLabel(
  mfg: { short_name?: string | null; name_kr?: string | null } | string | null | undefined,
  specWp?: number | null,
): string {
  let name: string;
  if (!mfg) {
    name = '—';
  } else if (typeof mfg === 'string') {
    name = shortMfgName(mfg);   // 문자열은 자동 약칭 처리
  } else {
    // DB short_name이 있으면 그대로, 없으면 name_kr을 약칭 처리
    name = mfg.short_name?.trim() || shortMfgName(mfg.name_kr) || '—';
  }
  if (!specWp) return name;
  return `${name} ${specWp}W`;   // → "진코 640W"
}

/**
 * 제조사 ID로 약칭 조회 후 모듈 레이블 반환.
 * manufacturers 리스트가 있는 페이지 레벨에서 사용.
 */
export function moduleLabelById(
  manufacturers: { manufacturer_id: string; short_name?: string | null; name_kr?: string | null }[],
  manufacturerId: string | null | undefined,
  specWp?: number | null,
): string {
  const mfg = manufacturers.find((m) => m.manufacturer_id === manufacturerId);
  return moduleLabel(mfg ?? null, specWp);
}

// --- PO 정보 박스 공통 라벨 (LC/TT/BL 폼에서 공유) ---

type _POLineLike = {
  product_id?: string;
  product_code?: string;
  product_name?: string;
  spec_wp?: number;
  payment_type?: 'paid' | 'free' | null;
  products?: { product_code?: string; product_name?: string; spec_wp?: number };
};
type _ProductLike = { product_id: string; spec_wp?: number; product_code?: string; product_name?: string };

/**
 * "제조사/규격" 칸 표시용 — 제조사 약칭 + 첫 라인 spec_wp.
 * 예: "진코 640W"
 */
export function poMfgSpecLabel(
  manufacturerName: string | null | undefined,
  lines: _POLineLike[],
  products: _ProductLike[] = [],
): string {
  const first = lines[0];
  const prod = first ? products.find((p) => p.product_id === first.product_id) : undefined;
  const spec = prod?.spec_wp ?? first?.products?.spec_wp ?? first?.spec_wp;
  return moduleLabel(manufacturerName ?? null, spec);
}

/**
 * "품명 / 품번 외 N건" 요약. 기본은 유상(paid) 라인만 카운트 (무상 스페어 제외).
 */
export function poLineSummary(
  lines: _POLineLike[],
  products: _ProductLike[] = [],
  options?: { paidOnly?: boolean },
): { productName: string; productCodeWithCount: string; paidCount: number } {
  const paidOnly = options?.paidOnly !== false;
  const filtered = paidOnly
    ? lines.filter((l) => l.payment_type == null || l.payment_type === 'paid')
    : lines;
  const first = filtered[0];
  const prod = first ? products.find((p) => p.product_id === first.product_id) : undefined;
  const productName = prod?.product_name ?? first?.products?.product_name ?? first?.product_name ?? '—';
  const code = prod?.product_code ?? first?.products?.product_code ?? first?.product_code ?? '—';
  const productCodeWithCount = filtered.length > 1 ? `${code} 외 ${filtered.length - 1}건` : code;
  return { productName, productCodeWithCount, paidCount: filtered.length };
}
