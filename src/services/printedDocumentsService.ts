import { isDemoMode, supabase } from '../lib/supabase';

const pngDataUrl = /^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/;

export async function getCompanyLogo(companyId: string) {
  if (isDemoMode) return null;
  const { data, error } = await supabase.from('company_logos')
    .select('image_data').eq('company_id', companyId).maybeSingle();
  if (error) throw error;
  return typeof data?.image_data === 'string' && pngDataUrl.test(data.image_data)
    ? data.image_data
    : null;
}

export async function prepareCompanyLogo(file: File) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    throw new Error('Invalid image');
  }
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 320 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image conversion unavailable');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL('image/png');
    if (image.length > 350000 || !pngDataUrl.test(image)) throw new Error('Invalid image');
    return image;
  } finally {
    bitmap.close();
  }
}

export async function saveCompanyLogo(companyId: string, image: string | null) {
  const query = supabase.from('company_logos');
  const { error } = image
    ? await query.upsert({ company_id: companyId, image_data: image })
    : await query.delete().eq('company_id', companyId);
  if (error) throw error;
}

export async function savePrintedDocument(id: string, companyId: string, title: string, html: string) {
  const { error } = await supabase.from('printed_documents')
    .insert({ id, company_id: companyId, title, html });
  if (error) throw error;
}

export async function getPrintedDocument(id: string, companyId: string) {
  const { data, error } = await supabase.from('printed_documents')
    .select('title,html').eq('id', id).eq('company_id', companyId).maybeSingle();
  if (error) throw error;
  return data as { title: string; html: string } | null;
}
