/** Local fixture transport. It returns tool calls and never contacts a provider. */
export function createPreviewFetch(): typeof fetch {
  const sent = new Set<string>();
  return async (_input, init) => {
    const body = JSON.parse(String(init?.body));
    const question = String(body.input);
    const available = new Set<string>(body.tools.map((tool: { name: string }) => tool.name));
    if (/\[qa:429\]/i.test(question) && !sent.has('429')) {
      sent.add('429');
      return Response.json({}, { status: 429 });
    }
    if (/\[qa:timeout\]/i.test(question) && !sent.has('timeout')) {
      sent.add('timeout');
      const signal = init?.signal;
      return await new Promise<Response>((_resolve, reject) => {
        if (signal?.aborted) reject(signal.reason);
        else signal?.addEventListener('abort', () => reject(signal.reason), { once: true });
      });
    }
    let name = 'unavailable';
    let args: Record<string, unknown> = {};
    if (/navigate|navigation|افتح|تنقل/i.test(question)) {
      name = 'navigation';
      args = { destination: /pos|نقطة البيع/i.test(question) ? 'pos' : /inventory|مخزون/i.test(question) ? 'inventory' : 'dashboard' };
    } else if (/overdue|receivables|الذمم|المتأخرة/i.test(question)) {
      name = 'overdue_receivables';
    } else if (/inventory|stock|المخزون/i.test(question)) {
      name = 'low_stock';
    } else if (/shift|الوردية/i.test(question)) {
      name = 'shift_summary';
    } else if (/invoice|فاتورة/i.test(question)) {
      const number = question.match(/(?:invoice|الفاتورة|فاتورة)\s+(?:#\s*)?([A-Z0-9][A-Z0-9._/-]{1,99})/i)?.[1];
      if (number && /\d/.test(number)) {
        name = 'find_invoice';
        args = { invoice_number: number };
      }
    } else if (/sales|المبيعات/i.test(question)) {
      name = 'sales_summary';
      const dayCount = question.match(/\b(\d{1,2})\s*(?:days?|يوم)/i)?.[1];
      args = { days: dayCount ? Number(dayCount) : 1 };
    }
    if (!available.has(name)) { name = 'unavailable'; args = {}; }
    return Response.json({ status: 'completed', output: [{ type: 'function_call', name, arguments: JSON.stringify(args) }] });
  };
}
