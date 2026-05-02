// trimGhostToFit — value + ghost 가 maxLength 초과하면 ghost 를 잘라 fit.
// maxLength 미지정/0 시 ghost 그대로 반환.
//
// pure helper — supabase/api 의존 없이 단위 테스트 가능하도록 별도 모듈로 분리.
export function trimGhostToFit(value: string, ghost: string, maxLength?: number): string {
  if (!maxLength || maxLength <= 0) return ghost;
  const remaining = Math.max(0, maxLength - value.length);
  return ghost.length > remaining ? ghost.slice(0, remaining) : ghost;
}
