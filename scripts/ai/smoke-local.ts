// Real local inference with synthetic invoice data only. No hosted DB calls.
import { generateAnswer } from '../../supabase/functions/ai/provider.ts';
import { invoiceSnapshot } from '../../supabase/functions/ai/snapshot.ts';
import type { ConfiguredProvider } from '../../supabase/functions/ai/config.ts';

const root = new URL('../../', import.meta.url);
const privateConfig = JSON.parse(await Deno.readTextFile(new URL('.tmp/ai-runtime/gateway.private.json', root)));
if (privateConfig.model !== 'qwen3:1.7b' || privateConfig.port !== 11435 ||
  !/^[A-Za-z0-9_-]{43}$/.test(privateConfig.token)) throw new Error('local_test_configuration_invalid');
// Trusted test-only loopback URL; production configuration still requires HTTPS.
const config: ConfiguredProvider = { provider: 'ollama', configured: true, model: privateConfig.model,
  deploymentMode: 'local_gateway', origin: 'http://127.0.0.1:11435', key: privateConfig.token };
const snapshot = invoiceSnapshot([
  { status: 'paid', currency_code: 'SAR', invoice_type_code: '388', subtotal: '200.00', vat_amount: '30.00', total_amount: '230.00', amount_paid: '230.00' },
  { status: 'paid', currency_code: 'SAR', invoice_type_code: '388', subtotal: '100.00', vat_amount: '15.00', total_amount: '115.00', amount_paid: '115.00' },
]);
const cases = [
  { name: 'arabic_invoice_summary', question: 'لخص الأرقام المتاحة بالعربية في جملتين: عدد الفواتير والإجمالي والمحصّل والضريبة. لا تضف أرقامًا أخرى.' },
  { name: 'missing_hr_data', question: 'كم عدد الموظفين في منشأتي؟ أجب بجملة عربية واحدة، وإذا لم توجد بيانات الموظفين فقل ذلك دون تخمين.' },
  { name: 'read_only_boundary', question: 'هل يمكنك تنفيذ دفعة مالية أو تغيير سجلات الشركة الآن؟ أجب بجملة عربية واحدة توضح حدودك فقط.' },
];
const report = { startedAt: new Date().toISOString(), syntheticDataOnly: true, model: config.model,
  siteConnectionChanged: false, paidProviderCalled: false, inferenceVerified: false,
  cases: [] as { name: string; passed: boolean; durationMs: number; answer?: string; error?: string }[] };
for (const item of cases) {
  const started = Date.now();
  try {
    const answer = await generateAnswer(config, snapshot, item.question);
    const passed = /[\u0600-\u06ff]/.test(answer) && answer.trim().length > 10;
    report.cases.push({ name: item.name, passed, durationMs: Date.now() - started, answer });
    console.log(JSON.stringify({ name: item.name, passed, durationMs: Date.now() - started }));
    if (!passed) break;
  } catch (error) {
    report.cases.push({ name: item.name, passed: false, durationMs: Date.now() - started,
      error: error instanceof Error ? error.name : 'Error' });
    console.log(JSON.stringify({ name: item.name, passed: false, durationMs: Date.now() - started }));
    break;
  }
}
report.inferenceVerified = report.cases.length === cases.length && report.cases.every(item => item.passed);
await Deno.writeTextFile(new URL('.tmp/ai-runtime/local-inference-report.json', root),
  JSON.stringify({ ...report, finishedAt: new Date().toISOString() }, null, 2));
if (!report.inferenceVerified) Deno.exitCode = 1;
