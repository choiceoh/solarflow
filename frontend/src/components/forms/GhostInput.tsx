// GhostInput — Cursor 스타일 인라인 자동완성 input/textarea.
// 사용자가 입력 중이면 800ms 멈춤 후 백엔드 /api/v1/assistant/completion 호출,
// 응답을 회색 ghost text 로 input 위에 layered overlay. Tab 으로 수락, ESC 로 거부.
//
// MetaForm 의 text/textarea 필드 렌더에서 일반 Input/Textarea 대신 사용.
// 폼의 다른 필드 값들은 watch() 로 한 번에 받아 백엔드에 컨텍스트로 전달 (C1).

import { useEffect, useRef, useState } from 'react';
import type { FieldValues, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { streamFetchWithAuth } from '@/lib/api';
import { cn } from '@/lib/utils';
import { trimGhostToFit } from './ghostInputHelpers';

export { trimGhostToFit };

interface GhostInputProps {
  fieldKey: string;
  fieldLabel?: string;
  multiline?: boolean;
  placeholder?: string;
  disabled?: boolean;
  formId?: string;
  maxLength?: number;
  register: UseFormRegister<FieldValues>;
  watch: UseFormWatch<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
}

const DEBOUNCE_MS = 800;
const ENDPOINT = '/api/v1/assistant/completion';

export function GhostInput({
  fieldKey,
  fieldLabel,
  multiline,
  placeholder,
  disabled,
  formId,
  maxLength,
  register,
  watch,
  setValue,
}: GhostInputProps) {
  const value = (watch(fieldKey) as string | undefined) ?? '';
  const [ghost, setGhost] = useState('');
  const aborterRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);

  // 빈 값일 때는 자동 호출 스킵 — 사용자가 첫 글자라도 입력한 후부터 작동.
  // (빈 폼 열기만 해도 분당 백엔드 호출 누적되는 것 방지.)
  // 또 maxLength 초과 시점에도 더 호출하지 않음.
  const shouldCall = !disabled && value.length > 0 && (!maxLength || value.length < maxLength);

  // value 변경 시 — 진행 중 호출 abort + ghost 클리어 + 새 debounce 예약.
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    aborterRef.current?.abort();
    setGhost('');

    if (!shouldCall) return;

    debounceRef.current = window.setTimeout(() => {
      const ac = new AbortController();
      aborterRef.current = ac;
      void fetchGhost(ac);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, shouldCall]);

  // 컴포넌트 unmount 시 진행 중 호출 abort.
  useEffect(
    () => () => {
      aborterRef.current?.abort();
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    },
    [],
  );

  const fetchGhost = async (ac: AbortController) => {
    // watch() 호출은 fetch 시점에 한 번 — 이후 폼 변경은 다음 debounce 가 처리.
    const allValues = watch() as Record<string, unknown>;
    try {
      const res = await streamFetchWithAuth(ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({
          fieldKey,
          fieldLabel,
          currentValue: value,
          context: allValues,
          formId,
          maxLength,
        }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      while (true) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(chunk, { stream: true });
        if (ac.signal.aborted) return;
        // maxLength 초과분은 trim — 모델이 길게 응답해도 폼 검증 실패 방지.
        setGhost(trimGhostToFit(value, acc, maxLength));
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      // 네트워크/서버 실패는 무시 — ghost 가 안 뜨는 것뿐, 사용자 입력엔 영향 없음.
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!ghost) return;
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const accepted = trimGhostToFit(value, ghost, maxLength);
      setValue(fieldKey, value + accepted, { shouldDirty: true, shouldValidate: true });
      setGhost('');
      aborterRef.current?.abort();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setGhost('');
      aborterRef.current?.abort();
    }
    // 다른 키는 통과 → onChange → 새 debounce.
  };

  const reg = register(fieldKey);

  // shadcn Input/Textarea 의 패딩에 맞춰 ghost overlay 정렬.
  // Input: px-3 py-1 (h-9). Textarea: px-3 py-2 (min-h-[60px]).
  const overlayPadding = multiline ? 'px-3 py-2' : 'px-3 py-1';

  return (
    <div className="relative">
      {multiline ? (
        <Textarea
          {...reg}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
        />
      ) : (
        <Input
          {...reg}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
        />
      )}
      {ghost && !disabled && (
        <div
          aria-hidden
          data-testid="ghost-overlay"
          className={cn(
            'pointer-events-none absolute inset-0 overflow-hidden rounded-md text-base text-muted-foreground/50',
            overlayPadding,
            multiline ? 'whitespace-pre-wrap break-words' : 'whitespace-nowrap',
          )}
        >
          <span className="invisible">{value}</span>
          <span>{ghost}</span>
          <span className="ml-2 rounded bg-muted/50 px-1.5 py-0.5 align-middle text-[10px] font-medium text-muted-foreground">
            Tab
          </span>
        </div>
      )}
    </div>
  );
}
