import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

vi.mock('../../lib/supabase', () => {
  const salesData = [
    {
      id: 'sale-1',
      total_amount: 100,
      status: 'completed',
      sale_date: '2026-09-28T10:00:00Z',
      branch_id: 'branch-1',
    },
    {
      id: 'sale-2',
      total_amount: 250,
      status: 'completed',
      sale_date: '2026-09-28T11:00:00Z',
      branch_id: 'branch-1',
    },
    {
      id: 'sale-3',
      total_amount: 50,
      status: 'refunded',
      sale_date: '2026-09-28T12:00:00Z',
      branch_id: 'branch-1',
    },
  ];

  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.gte.mockReturnValue(query);
  query.lte.mockReturnValue(query);

  Object.defineProperty(query, 'then', {
    value: (
      resolve: (
        value: {
          data: typeof salesData;
          error: null;
        },
      ) => unknown,
    ) =>
      Promise.resolve(
        resolve({
          data: salesData,
          error: null,
        }),
      ),
  });

  const supabase = {
    from: vi.fn(() => query),
  };

  return {
    supabase,
    isDemoMode: false,
  };
});

import {
  executeAITool,
} from './aiToolExecutor';

describe('ERPX-AI Sales Tool', () => {
  it('retrieves and calculates the sales summary from Supabase data', async () => {
    const result = await executeAITool(
      {
        userId: 'admin-test',
        companyId: 'company-test',
        branchId: 'branch-1',
        role: 'admin',
      },
      {
        tool: 'get_sales_summary',
        arguments: {},
      },
    );

    expect(result.ok).toBe(true);
    expect(result.tool).toBe('get_sales_summary');

    expect(result.result).toMatchObject({
      companyId: 'company-test',
      branchId: 'branch-1',
      transactionCount: 2,
      totalSales: 350,
      totalRefunds: 50,
      netSales: 300,
      currency: 'SAR',
    });
  });
});
