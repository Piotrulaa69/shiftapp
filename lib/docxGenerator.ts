import { Platform } from 'react-native';

/**
 * Fill {{variable}} placeholders in a DOCX template file and return the
 * filled document as a Blob (web only).
 *
 * Returns null on native or if the file is not a valid DOCX.
 */
export async function generateFilledDocx(
  templateUrl: string,
  variables: Record<string, string>,
): Promise<Blob | null> {
  if (Platform.OS !== 'web') return null;

  try {
    const PizZip = (await import('pizzip')).default;
    const Docxtemplater = (await import('docxtemplater')).default;

    const response = await fetch(templateUrl);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();

    const zip = new PizZip(arrayBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '',
    });

    doc.setData(variables);
    doc.render();

    const blob: Blob = doc.getZip().generate({
      type: 'blob',
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    return blob;
  } catch (e) {
    console.error('generateFilledDocx error:', e);
    return null;
  }
}

/**
 * Trigger a browser download of a Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Returns true if the URL points to a DOCX file.
 */
export function isDocxUrl(url: string): boolean {
  const lower = url.split('?')[0].toLowerCase();
  return lower.endsWith('.docx') || lower.includes('.docx');
}
