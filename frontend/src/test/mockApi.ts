import { vi } from 'vitest';
import { fetchWithAuth } from '@/lib/api';
import { useAppStore } from '@/stores/appStore';
import { testCompany } from './fixtures';

export function resetAppStore() {
  useAppStore.setState({
    selectedCompanyId: 'all',
    companies: [],
    companiesLoaded: false,
  });
}

export function seedCompanyStore(selectedCompanyId = testCompany.company_id) {
  useAppStore.setState({
    selectedCompanyId,
    companies: [testCompany],
    companiesLoaded: true,
  });
}

export function mockFetchWithAuth(resolver: (path: string, options?: RequestInit) => unknown) {
  vi.mocked(fetchWithAuth).mockImplementation((async (path, options) => (
    resolver(path, options)
  )) as typeof fetchWithAuth);
}

export function parseJsonBody(options?: RequestInit): Record<string, unknown> {
  return JSON.parse(String(options?.body ?? '{}')) as Record<string, unknown>;
}

export function callsFor(path: string) {
  return vi.mocked(fetchWithAuth).mock.calls.filter(([calledPath]) => calledPath === path);
}
