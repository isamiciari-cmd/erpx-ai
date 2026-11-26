import { getCompanyLogo, savePrintedDocument } from '../../services/printedDocumentsService';

export const printDocumentPolicy =
  "default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'";

export async function preparePrintedDocument(doc: Document, companyId: string, arabic: boolean) {
  const id = crypto.randomUUID();
  const address = new URL('/printed-documents/' + id, window.location.origin);
  const [{ default: createQr }, logo] = await Promise.all([import('qrcode-generator'), getCompanyLogo(companyId)]);
  const qr = createQr(0, 'M');
  qr.addData(address.href);
  qr.make();
  const policy = doc.createElement('meta');
  policy.httpEquiv = 'Content-Security-Policy';
  policy.content = printDocumentPolicy;
  doc.head.prepend(policy);
  const style = doc.createElement('style');
  style.textContent = `
    body { isolation: isolate; }
    .erpx-watermark {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      max-width: 45%; max-height: 45%; width: 42%; object-fit: contain;
      opacity: .30; z-index: -1; pointer-events: none;
    }
    .erpx-document-qr { margin: 12px 0; width: max-content; text-align: center; break-inside: avoid; }
    .erpx-document-qr img { display: block; width: 25mm; height: 25mm; }
  `;
  doc.head.append(style);
  if (logo) {
    const watermark = doc.createElement('img');
    watermark.className = 'erpx-watermark';
    watermark.src = logo;
    watermark.alt = '';
    doc.body.prepend(watermark);
  }
  const figure = doc.createElement('figure');
  figure.className = 'erpx-document-qr';
  const image = doc.createElement('img');
  image.src = qr.createDataURL(5, 20);
  image.alt = '';
  const caption = doc.createElement('figcaption');
  caption.textContent = arabic ? 'عرض المستند' : 'View document';
  figure.append(image, caption);
  doc.body.append(figure);
  const title = doc.title.trim().slice(0, 500) || 'ERPX-AI';
  const html = '<!doctype html>' + doc.documentElement.outerHTML;
  await savePrintedDocument(id, companyId, title, html);
  return html;
}

export function printPreparedDocument(html: string, title: string) {
  const frame = document.createElement('iframe');
  frame.title = title;
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:1100px;height:800px;border:0';
  frame.addEventListener('load', () => {
    const win = frame.contentWindow;
    if (!win) { frame.remove(); return; }
    win.addEventListener('afterprint', () => frame.remove(), { once: true });
    win.focus();
    win.print();
  }, { once: true });
  frame.srcdoc = html;
  document.body.appendChild(frame);
  window.setTimeout(() => frame.remove(), 120000);
}
