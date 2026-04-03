import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { fetchWithAuth } from '@/lib/api';
import type { UserProfile } from '@/types/models';

interface AuthState {
  session: Session | null;
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => void;
}

const INIT_TIMEOUT_MS = 5000;

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,

  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(error.message);
    }

    set({ session: data.session });

    try {
      const profile = await fetchWithAuth<UserProfile>('/api/v1/users/me');
      set({ user: profile });
    } catch (err) {
      console.error('[authStore] 프로필 조회 실패:', err);
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },

  initialize: () => {
    // 타임아웃 안전장치: 5초 내 초기화 실패 시 로딩 해제
    const timeout = setTimeout(() => {
      console.warn('[authStore] 초기화 타임아웃 — 로딩 해제');
      set({ isLoading: false });
    }, INIT_TIMEOUT_MS);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      set({ session });

      if (session) {
        try {
          const profile = await fetchWithAuth<UserProfile>('/api/v1/users/me');
          set({ user: profile, isLoading: false });
        } catch {
          console.warn('[authStore] 프로필 조회 실패 — 세션은 유지');
          set({ isLoading: false });
        }
      } else {
        set({ isLoading: false });
      }
      clearTimeout(timeout);
    }).catch(() => {
      console.error('[authStore] 세션 조회 실패');
      set({ isLoading: false });
      clearTimeout(timeout);
    });

    // 인증 상태 변경 구독
    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session });

      if (session) {
        try {
          const profile = await fetchWithAuth<UserProfile>('/api/v1/users/me');
          set({ user: profile });
        } catch {
          // 프로필 조회 실패 시 무시
        }
      } else {
        set({ user: null });
      }
    });
  },
}));
