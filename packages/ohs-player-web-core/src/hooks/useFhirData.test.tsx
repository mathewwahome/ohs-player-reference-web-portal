import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCustomGet = vi.fn();
const mockCustomPut = vi.fn();

vi.mock('../providers/FhirClientProvider', () => ({
  useFhirClient: () => ({ customGet: mockCustomGet, customPut: mockCustomPut }),
}));

const { useCustomResource, useCustomEndpoint } = await import('./useFhirData');

function wrapper({ children }: { children: ReactNode }): React.ReactElement {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useCustomResource', () => {
  beforeEach(() => {
    mockCustomGet.mockReset().mockResolvedValue({ ok: true });
  });

  it('GETs the alias with the given params and resolves the body', async () => {
    const { result } = renderHook(
      () => useCustomResource('practitionerDetails', { 'practitioner-id': 'p1' }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data).toEqual({ ok: true }));
    expect(mockCustomGet).toHaveBeenCalledTimes(1);
    expect(mockCustomGet).toHaveBeenCalledWith('practitionerDetails', { 'practitioner-id': 'p1' });
  });

  it('calls the alias with no params for the self-lookup form', async () => {
    const { result } = renderHook(() => useCustomResource('practitionerDetails'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCustomGet).toHaveBeenCalledWith('practitionerDetails', undefined);
  });

  it('does not fetch while disabled', () => {
    const { result } = renderHook(
      () => useCustomResource('practitionerDetails', undefined, { enabled: false }),
      { wrapper },
    );

    expect(mockCustomGet).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it('surfaces a rejected request as the query error', async () => {
    const failure = new Error('gateway down');
    mockCustomGet.mockReset().mockRejectedValue(failure);

    const { result } = renderHook(() => useCustomResource('practitionerDetails'), { wrapper });

    await waitFor(() => expect(result.current.error).toBe(failure));
  });
});

it('keeps memberships for different practitioners in separate cache entries', async () => {
  mockCustomGet.mockImplementation((_alias, _params, segments: string[]) =>
    Promise.resolve([{ id: segments[0] }]),
  );
  const { result } = renderHook(
    () => ({
      first: useCustomResource('users', undefined, { pathSegments: ['p1', 'groups'] }),
      second: useCustomResource('users', undefined, { pathSegments: ['p2', 'groups'] }),
    }),
    { wrapper },
  );
  await waitFor(() => expect(result.current.first.data).toEqual([{ id: 'p1' }]));
  await waitFor(() => expect(result.current.second.data).toEqual([{ id: 'p2' }]));
});

it('refreshes membership reads even when PUT reports a partial failure', async () => {
  mockCustomGet
    .mockReset()
    .mockResolvedValueOnce([{ id: 'g1' }])
    .mockResolvedValue([]);
  mockCustomPut.mockRejectedValue(new Error('Profile saved, groups failed'));
  const { result } = renderHook(
    () => ({
      groups: useCustomResource('users', undefined, { pathSegments: ['p1', 'groups'] }),
      put: useCustomEndpoint('users').put,
    }),
    { wrapper },
  );
  await waitFor(() => expect(result.current.groups.data).toEqual([{ id: 'g1' }]));
  await act(async () => {
    await result.current.put
      .mutateAsync({ id: 'p1', body: { groupIds: [] } })
      .catch(() => undefined);
  });
  await waitFor(() => expect(result.current.groups.data).toEqual([]));
});
