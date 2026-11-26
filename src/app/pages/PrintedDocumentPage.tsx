import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getPrintedDocument } from '../../services/printedDocumentsService';
import { printDocumentPolicy } from '../utils/printedDocument';

export default function PrintedDocumentPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const companyId = user?.company_id;
  const userId = user?.id;
  const { i18n } = useTranslation();
  const arabic = (i18n.resolvedLanguage || i18n.language).startsWith('ar');
  const [result, setResult] = useState<{
    key: string; document: Awaited<ReturnType<typeof getPrintedDocument>>
  }>();
  const key = JSON.stringify([id, companyId, userId]);
  useEffect(() => {
    let active = true;
    if (!id || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id) || !companyId) {
      setResult({ key, document: null });
      return;
    }
    void getPrintedDocument(id, companyId).then(
      (document) => { if (active) setResult({ key, document }); },
      () => { if (active) setResult({ key, document: null }); },
    );
    return () => { active = false; };
  }, [id, companyId, key]);

  if (result?.key !== key) return <p role="status">{arabic ? 'جارٍ فتح المستند…' : 'Opening document…'}</p>;
  if (!result.document) return <p role="alert">{arabic ? 'المستند غير متاح لهذا الحساب.' : 'This document is unavailable to this account.'}</p>;

  // Stored preview markup is treated as untrusted data. This independent CSP
  // applies before the supplied markup, and the iframe has an opaque origin.
  const html = '<!doctype html><meta http-equiv="Content-Security-Policy" content="' +
    printDocumentPolicy + '">' + result.document.html.replace(/^<!doctype html>/i, '');
  return <iframe
    sandbox=""
    referrerPolicy="no-referrer"
    className="block h-dvh w-full bg-white"
    title={result.document.title}
    srcDoc={html}
  />;
}
