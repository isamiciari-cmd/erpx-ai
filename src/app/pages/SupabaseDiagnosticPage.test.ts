import { describe, expect, it, vi } from 'vitest';
import {
  canRunDiagnosticWrites,
  runDiagnosticSuite,
  type DiagnosticAdapter,
  type DiagnosticEnvironment,
} from './SupabaseDiagnosticPage';

vi.mock('../../lib/supabase', () => ({
  supabase: {},
  hasSupabaseConfig: false,
  isDemoMode: false,
}));
const companyId = '10000000-0000-4000-8000-000000000001';
const userId = '10000000-0000-4000-8000-000000000002';
const productId = '10000000-0000-4000-8000-000000000003';
const runId = '10000000-0000-4000-8000-000000000004';
const environment: DiagnosticEnvironment = {
  development: true,
  appOrigin: 'http://localhost:5173',
  serviceUrl: 'http://127.0.0.1:54321',
  companyId,
  userId,
  enabled: true,
};
function adapter(): DiagnosticAdapter {
  return {
    connection: vi.fn(async () => undefined),
    authenticate: vi.fn(async () => ({ id: userId })),
    read: vi.fn(async () => undefined),
    create: vi.fn(async (payload) => ({ ...payload, id: productId })),
    update: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
  };
}
const suite = (service: DiagnosticAdapter, changes: Partial<DiagnosticEnvironment> = {}) =>
  runDiagnosticSuite({ ...environment, runId, ...changes }, service);

describe('isolated system diagnostics', () => {
  it('requires explicit opt-in and both app and database to be local development', () => {
    expect(canRunDiagnosticWrites(environment)).toBe(true);
    for (const change of [
      { enabled: false },
      { development: false },
      { appOrigin: 'https://www.erpx-ai.com' },
      { serviceUrl: 'https://project.supabase.co' },
      { serviceUrl: 'http://127.0.0.1.attacker.example' },
      { serviceUrl: 'http://user:password@localhost:54321' },
      { companyId: 'demo-company' },
      { userId: '' },
    ])
      expect(canRunDiagnosticWrites({ ...environment, ...change })).toBe(false);
  });
  it('runs read-only checks by default and skips every write', async () => {
    const service = adapter();
    const result = await suite(service, { enabled: false });
    expect(result.results.map((test) => test.status)).toEqual([
      'pass',
      'pass',
      'pass',
      'skipped',
      'skipped',
      'skipped',
    ]);
    expect(service.create).not.toHaveBeenCalled();
    expect(service.update).not.toHaveBeenCalled();
    expect(service.remove).not.toHaveBeenCalled();
  });
  it('never writes to a hosted project even when the checkbox is enabled on localhost', async () => {
    const service = adapter();
    await suite(service, { serviceUrl: 'https://project.supabase.co' });
    expect(service.create).not.toHaveBeenCalled();
  });
  it('shows dependent checks as skipped when connection cannot be confirmed', async () => {
    const service = adapter();
    service.connection = vi.fn(async () => {
      throw new Error('private network data');
    });
    const result = await suite(service);
    expect(result.results.map((test) => test.status)).toEqual([
      'fail',
      'skipped',
      'skipped',
      'skipped',
      'skipped',
      'skipped',
    ]);
    expect(service.authenticate).not.toHaveBeenCalled();
    expect(service.read).not.toHaveBeenCalled();
    expect(service.create).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain('private network data');
  });
  it('refuses a different authenticated identity before any company data read', async () => {
    const service = adapter();
    service.authenticate = vi.fn(async () => ({ id: productId }));
    const result = await suite(service);
    expect(result.results[0].status).toBe('pass');
    expect(result.results[1].status).toBe('fail');
    expect(service.read).not.toHaveBeenCalled();
    expect(service.create).not.toHaveBeenCalled();
  });
  it('does not convert a failed create into a failed connection or attempt unrelated writes', async () => {
    const service = adapter();
    service.create = vi.fn(async () => {
      throw { code: '42501', message: 'secret details' };
    });
    const result = await suite(service);
    expect(result.results.map((test) => test.status)).toEqual([
      'pass',
      'pass',
      'pass',
      'fail',
      'skipped',
      'skipped',
    ]);
    expect(result.results[3].detail).toBe('health.permission');
    expect(JSON.stringify(result)).not.toContain('secret details');
    expect(service.update).not.toHaveBeenCalled();
    expect(service.remove).not.toHaveBeenCalled();
  });
  it('creates a nullable category and inactive non-inventory product, then cleans its exact ownership record', async () => {
    const service = adapter();
    const result = await suite(service);
    expect(service.read).toHaveBeenCalledWith(companyId);
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: companyId,
        created_by: userId,
        category_id: null,
        is_active: false,
        track_inventory: false,
        attributes: { erpx_diagnostic_run: runId },
      }),
    );
    expect(service.remove).toHaveBeenCalledWith({
      id: productId,
      companyId,
      userId,
      runId,
      sku: `DIAG-${runId}`,
      name: `ERPX diagnostic ${runId}`,
    });
    expect(result.results.every((test) => test.status === 'pass')).toBe(true);
    expect(result.cleanup).toBeNull();
  });
  it('attempts own-record cleanup even if the update fails', async () => {
    const service = adapter();
    service.update = vi.fn(async () => {
      throw new Error();
    });
    const result = await suite(service);
    expect(result.results[4].status).toBe('fail');
    expect(result.results[5].status).toBe('pass');
    expect(service.remove).toHaveBeenCalledOnce();
    expect(result.cleanup).toBeNull();
  });
  it('retains only its exact owned identity for an explicit cleanup retry if removal fails', async () => {
    const service = adapter();
    service.remove = vi.fn(async () => {
      throw new Error('raw private failure');
    });
    const result = await suite(service);
    expect(result.cleanup).toMatchObject({ id: productId, companyId, userId, runId });
    expect(result.results[5].detail).toBe('health.cleanupRequired');
    expect(JSON.stringify(result)).not.toContain('raw private failure');
  });
  it('never updates or deletes an unexpected returned record from another company or run', async () => {
    for (const change of [
      { company_id: productId },
      { created_by: productId },
      { sku: 'existing-product' },
      { id: 'invalid-uuid' },
      { attributes: { erpx_diagnostic_run: productId } },
    ]) {
      const service = adapter();
      service.create = vi.fn(async (payload) => ({ ...payload, id: productId, ...change }));
      const result = await suite(service);
      expect(result.results[3].status).toBe('fail');
      expect(service.update).not.toHaveBeenCalled();
      expect(service.remove).not.toHaveBeenCalled();
    }
  });
});
