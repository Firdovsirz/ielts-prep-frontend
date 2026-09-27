import { authFetch } from '../api/client';

/** Downloads the full study record via the authenticated export endpoint. */
export async function downloadExport(format: 'json' | 'csv') {
  const res = await authFetch(`/api/export?format=${format}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ielts-export-${new Date().toISOString().slice(0, 10)}.${format === 'csv' ? 'zip' : 'json'}`;
  a.click();
  URL.revokeObjectURL(url);
}
