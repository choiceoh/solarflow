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

  // value 변경 시 — 진행 중 호출 abort + ghost 클리어 + 새 debounce 예약.
  useEffect(() => {
    if (disabled) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    aborterRef.current?.abort();
    setGhost('');

    debounceRef.current = window.setTimeout(() => {
      const ac = new AbortController();
      aborterRef.current = ac;
      void fetchGhost(ac);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, disabled]);

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
        setGhost(acc);
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
      setValue(fieldKey, value + ghost, { shouldDirty: true, shouldValidate: true });
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

  return (
    <div className="relative">
      {multiline ? (
        <Textarea
          {...reg}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="font-sans"
        />
      ) : (
        <Input
          {...reg}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="font-sans"
        />
      )}
      {ghost && !disabled && (
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 overflow-hidden rounded-md px-3 py-2 text-base text-muted-foreground/50',
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
