import * as XLSX from 'xlsx';

export const IMPORT_FORMATS = ['csv', 'xlsx', 'xls', 'json', 'bitwarden', 'keepass'];

function detectCsvSource(rawRows) {
  if (!rawRows?.length) return 'generic';
  const first = rawRows[0] || {};
  const hasTitle = 'Title' in first;
  const hasUsername = 'Username' in first;
  if (hasTitle && hasUsername) return 'keepass-csv';
  return 'generic';
}

export function detectFileFormat(file) {
  const name = (file?.name || '').toLowerCase();

  if (name.endsWith('.csv')) return 'csv';
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return file.type.includes('excel') ? 'excel' : 'excel';
  if (name.endsWith('.json')) return 'json';

  // Bitwarden export is a JSON file
  if (file?.type === 'application/json') return 'json';

  // KeePass is a complex XML-based format (KDBX/KDB). We detect by extension.
  if (name.endsWith('.kdbx') || name.endsWith('.kdb')) return 'keepass';

  return 'unknown';
}

export async function parseImportFile(file) {
  const format = detectFileFormat(file);

  if (format === 'csv' || format === 'excel') {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    // Normalize KeePass CSV columns (Title, Username, Password, URL, Notes,
    // Group) and any other common aliases into our canonical Name/Login/etc.
    const normalized = rawRows.map((r) => ({
      Name: r.Name || r.name || r.Title || r.title || '',
      Login: r.Login || r.login || r.Username || r.username || r.UserName || '',
      Password: r.Password || r.password || '',
      URL: r.URL || r.Url || r.url || r.URI || r.uri || '',
      Note: r.Note || r.note || r.Notes || r.notes || '',
      Tags: r.Tags || r.tags || r.Group || r.group || '',
      Type: 'LOGIN',
    }));

    return {
      rows: normalized,
      format,
      detectedSource: format === 'csv' ? detectCsvSource(rawRows) : 'excel',
    };
  }

  if (format === 'json') {
    const text = await file.text();
    const data = JSON.parse(text);

    // Bitwarden format
    if (data && (Array.isArray(data.items) || data.encrypted !== undefined || data.items)) {
      const bitwardenRows = (data.items || [])
        .filter((item) => item.login?.password || item.secureNote)
        .map((item) => ({
          Name: item.name || '',
          Login: item.login?.username || item.username || '',
          Password: item.login?.password || '',
          URL: item.login?.uris?.[0]?.uri || item.login?.uri || item.uri || '',
          Note: item.notes || item.secureNote?.notes || '',
          Tags: (item.collectionIds || []).join(', ') || '',
          Type: 'LOGIN',
        }));
      return { rows: bitwardenRows, format: 'bitwarden' };
    }

    // Generic array of objects { name, login, password, url, note }
    if (Array.isArray(data)) {
      return {
        rows: data.map((r) => ({
          Name: r.name || r.Name || '',
          Login: r.login || r.Login || r.username || r.Username || '',
          Password: r.password || r.Password || '',
          URL: r.url || r.URL || r.Url || '',
          Note: r.note || r.Note || r.notes || r.Notes || '',
          Tags: r.tags || r.Tags || '',
          Type: 'LOGIN',
        })),
        format: 'json',
      };
    }

    return { rows: [], format };
  }

  if (format === 'keepass') {
    // KeePass KDBX files are binary/XML archives that require the database
    // password to decrypt. Without a full KDBX parser on the client, we
    // provide guidance. For KeePass users, recommend using the KeePass
    // built-in "Export > CSV" then import that CSV for full security.
    throw new Error(
      'Direct KeePass KDBX import is not supported for security reasons. ' +
      'Please export your KeePass database to CSV (File > Export > CSV) and import that file instead.'
    );
  }

  return { rows: [], format };
}

// Convert decrypted internal rows into the requested export format string.
export function buildExportContent(rows, format) {
  if (format === 'csv') {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    return { content: csv, mime: 'text/csv', ext: 'csv' };
  }

  if (format === 'excel') {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Passwords');
    const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    return { content: buffer, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ext: 'xlsx', isBuffer: true };
  }

  if (format === 'bitwarden') {
    const bitwarden = {
      encrypted: false,
      folders: [],
      items: rows.map((r) => ({
        id: `${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 4)}-${Math.random().toString(36).substr(2, 4)}-${Math.random().toString(36).substr(2, 4)}-${Math.random().toString(36).substr(2, 12)}`,
        organizationId: null,
        folderId: null,
        type: 1,
        reprompt: 0,
        name: r.Name || '',
        notes: r.Note || null,
        favorite: false,
        login: {
          uris: r.URL ? [{ match: null, uri: r.URL }] : [],
          username: r.Login || '',
          password: r.Password || '',
        },
        collectionIds: [],
      })),
    };
    return { content: JSON.stringify(bitwarden, null, 2), mime: 'application/json', ext: 'json', isBuffer: false };
  }

  if (format === 'json') {
    return {
      content: JSON.stringify(rows, null, 2),
      mime: 'application/json',
      ext: 'json',
      isBuffer: false,
    };
  }

  return { content: '', mime: 'text/plain', ext: 'txt', isBuffer: false };
}

export function downloadExport(rows, format, filenameBase) {
  const { content, mime, ext, isBuffer } = buildExportContent(rows, format);
  if (!content) return;

  const blob = isBuffer
    ? new Blob([content], { type: mime })
    : new Blob([content], { type: mime || 'text/plain' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filenameBase}.${ext}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
