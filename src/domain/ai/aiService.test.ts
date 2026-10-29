import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  processAIRequest,
} from './aiService';

describe('ERPX-AI Core', () => {
  it('allows an admin to access sales analysis', async () => {
    const result = await processAIRequest({
      type: 'analysis',
      message: 'Show me the sales summary',
      context: {
        userId: 'admin-test',
        companyId: 'company-test',
        role: 'admin',
      },
    });

    expect(result.ok).toBe(true);
    expect(result.toolCalls?.[0]?.tool).toBe(
      'get_sales_summary',
    );
  });

  it('rejects requests without company or tenant scope', async () => {
    const result = await processAIRequest({
      type: 'analysis',
      message: 'Show me the sales summary',
      context: {
        userId: 'admin-test',
        role: 'admin',
      },
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain(
      'Company or tenant scope is required',
    );
  });

  it('restricts financial analysis for cashier role', async () => {
    const result = await processAIRequest({
      type: 'analysis',
      message: 'Show me the financial summary',
      context: {
        userId: 'cashier-test',
        companyId: 'company-test',
        role: 'cashier',
      },
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain(
      'not authorized',
    );
  });

  it('does not authorize critical actions automatically', async () => {
    const result = await processAIRequest({
      type: 'automation',
      message: 'Execute business action',
      context: {
        userId: 'owner-test',
        companyId: 'company-test',
        role: 'owner',
      },
    });

    expect(result.ok).toBe(true);
    expect(result.toolCalls?.[0]?.approved).toBe(false);
  });

  it('handles requests without a recognized business tool', async () => {
    const result = await processAIRequest({
      type: 'chat',
      message: 'Hello ERPX-AI',
      context: {
        userId: 'admin-test',
        companyId: 'company-test',
        role: 'admin',
      },
    });

    expect(result.ok).toBe(true);
    expect(result.toolCalls).toBeUndefined();
  });
  it('selects the specific low-stock tool before the broad inventory tool', async () => {
    const response = await processAIRequest({ type: 'analysis', message: 'show low stock inventory', context: {userId:'user',companyId:'company',role:'admin'} });
    expect(response.toolCalls?.[0]?.tool).toBe('get_low_stock_products');
  });

});
