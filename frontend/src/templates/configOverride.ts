// Phase 3: 메타 config 오버라이드 — DB(`ui_configs`) 백엔드 + localStorage 캐시
// ───────────────────────────────────────────────────────────────────────────
// 운영자가 GUI에서 화면/폼/상세 config를 편집하면 Go API → ui_configs 테이블에 저장.
// localStorage는 캐시 — 같은 탭의 즉시 렌더용 + 네트워크 일시 장애 시 폴백.
//
// useResolvedConfig 흐름:
//   1) mount 시점에 캐시(localStorage)로 즉시 렌더 (override 또는 default)
//   2) 백그라운드로 API GET → 200이면 캐시 갱신 + 상태 업데이트, 204면 캐시 삭제 + default 폴백
//   3) 'sf-ui-config-changed' 이벤트 발생 시 (편집기에서 저장/삭제) 재fetch
//
// API 명세 (router.go에 등록됨):
//   GET    /api/v1/ui-configs                       (인증) — 활성 override 목록 (scope, config_id)
//   GET    /api/v1/ui-configs/:scope/:id            (인증) — 단건 (없으면 204)
//   PUT    /api/v1/ui-configs/:scope/:id            (admin) — upsert
//   DELETE /api/v1/ui-configs/:scope/:id            (admin) — override 제거
// ───────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/api';

const CACHE_PREFIX = 'sf.ui-config-cache:';

export type ConfigKind = 'screen' | 'form' | 'detail';

function cacheKey(kind: ConfigKind, id: string): string {
  return `${CACHE_PREFIX}${kind}:${id}`;
}

// ─── localStorage 캐시 (동기) — 즉시 렌더 / 오프라인 폴백 ────────────────
function readCache<T>(kind: ConfigKind, id: string): T | null {
  try {
    const raw = localStorage.getItem(cacheKey(kind, id));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeCache<T>(kind: ConfigKind, id: string, value: T): void {
  try {
    localStorage.setItem(cacheKey(kind, id), JSON.stringify(value));
  } catch {
    // localStorage가 막혀 있어도 기능은 유지 — API가 진실 공급원이므로 캐시는 옵션
  }
}

function deleteCache(kind: ConfigKind, id: string): void {
  try {
    localStorage.removeItem(cacheKey(kind, id));
  } catch {
    // 위와 동일
  }
}

// ─── API 호출 (비동기) ─────────────────────────────────────────────────────
// fetchWithAuth는 204 시 undefined 반환.
// 응답이 배열이거나 객체가 아니면 "override 없음"으로 간주
// (devMockApi는 미등록 경로에 빈 배열을 반환하므로 그것도 폴백)
async function fetchOverride<T>(kind: ConfigKind, id: string): Promise<T | null> {
  const res = await fetchWithAuth<T | undefined>(`/api/v1/ui-configs/${kind}/${id}`);
  if (!res || typeof res !== 'object' || Array.isArray(res)) return null;
  return res;
}

// ─── Public API: editor가 호출 (await 가능) ────────────────────────────────
export async function loadOverride<T>(kind: ConfigKind, id: string): Promise<T | null> {
  try {
    const remote = await fetchOverride<T>(kind, id);
    if (remote) {
      writeCache(kind, id, remote);
      return remote;
    }
    // 서버에 override 없음 — 캐시도 정리
    deleteCache(kind, id);
    return null;
  } catch {
    // 네트워크/서버 장애 — 캐시로 폴백
    return readCache<T>(kind, id);
  }
}

export async function saveOverride<T>(kind: ConfigKind, id: string, value: T): Promise<void> {
  // PUT이 진실 공급원. 실패 시 throw — editor가 에러 표시
  await fetchWithAuth(`/api/v1/ui-configs/${kind}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(value),
  });
  writeCache(kind, id, value);
  window.dispatchEvent(new CustomEvent('sf-ui-config-changed', { detail: { kind, id } }));
}

export async function clearOverride(kind: ConfigKind, id: string): Promise<void> {
  await fetchWithAuth(`/api/v1/ui-configs/${kind}/${id}`, { method: 'DELETE' });
  deleteCache(kind, id);
  window.dispatchEvent(new CustomEvent('sf-ui-config-changed', { detail: { kind, id } }));
}

export async function listOverrides(): Promise<{ kind: ConfigKind; id: string }[]> {
  try {
    const rows = await fetchWithAuth<{ scope: ConfigKind; config_id: string }[]>('/api/v1/ui-configs');
    return (rows ?? []).map((r) => ({ kind: r.scope, id: r.config_id }));
  } catch {
    return [];
  }
}

// ─── 훅: 캐시(즉시) → API(백그라운드) ────────────────────────────────────
export function useResolvedConfig<T extends { id: string }>(
  defaultConfig: T,
  kind: ConfigKind,
): T {
  const [override, setOverride] = useState<T | null>(() =>
    readCache<T>(kind, defaultConfig.id),
  );

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const remote = await fetchOverride<T>(kind, defaultConfig.id);
        if (cancelled) return;
        if (remote) {
          writeCache(kind, defaultConfig.id, remote);
          setOverride(remote);
        } else {
          deleteCache(kind, defaultConfig.id);
          setOverride(null);
        }
      } catch {
        // 네트워크 실패 — 캐시(현재 상태) 유지
      }
    };

    refresh();

    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ kind: ConfigKind; id: string }>).detail;
      if (detail.kind === kind && detail.id === defaultConfig.id) {
        refresh();
      }
    };
    window.addEventListener('sf-ui-config-changed', onChange);
    return () => {
      cancelled = true;
      window.removeEventListener('sf-ui-config-changed', onChange);
    };
  }, [kind, defaultConfig.id]);

  return override ?? defaultConfig;
}
