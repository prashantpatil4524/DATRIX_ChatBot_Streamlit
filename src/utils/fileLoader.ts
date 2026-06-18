import * as XLSX from 'xlsx';

export interface FileLoadingResult {
  rows: any[];
  preview: any[];
  sheets: string[];
  error: string | null;
}

export async function load_file(file: File, selectedSheet?: string): Promise<FileLoadingResult> {
  return new Promise((resolve) => {
    const sizeInMB = file.size / (1024 * 1024);
    if (sizeInMB > 500) {
      console.warn(`File is heavy (${sizeInMB.toFixed(1)}MB). Attempting to load...`);
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    const reader = new FileReader();

    if (extension === 'json') {
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          let parsed = JSON.parse(text);
          if (!Array.isArray(parsed)) {
            if (typeof parsed === 'object' && parsed !== null) {
              const arrayKey = Object.keys(parsed).find(key => Array.isArray(parsed[key]));
              if (arrayKey) {
                parsed = parsed[arrayKey];
              } else {
                parsed = [parsed];
              }
            } else {
              throw new Error("JSON must be array or records object.");
            }
          }
          resolve({
            rows: parsed,
            preview: parsed.slice(0, 5),
            sheets: [],
            error: null
          });
        } catch (err: any) {
          resolve({ rows: [], preview: [], sheets: [], error: `JSON Parse error: ${err.message}` });
        }
      };
      reader.onerror = () => resolve({ rows: [], preview: [], sheets: [], error: "FileReader failed to load JSON." });
      reader.readAsText(file, "UTF-8");
      return;
    }

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        let workbook: XLSX.WorkBook;

        if (extension === 'csv') {
          // Let's first parse with UTF-8 decoding, if not try Latin-1
          try {
            const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
            const text = utf8Decoder.decode(data as ArrayBuffer);
            workbook = XLSX.read(text, { type: 'string' });
          } catch (utfError) {
            console.warn("UTF-8 decoding failed, falling back to Latin-1 encoding.");
            const latinDecoder = new TextDecoder("windows-1252"); // Latin-1 fallback
            const text = latinDecoder.decode(data as ArrayBuffer);
            workbook = XLSX.read(text, { type: 'string' });
          }
        } else {
          const arr = new Uint8Array(data as ArrayBuffer);
          workbook = XLSX.read(arr, { type: 'array' });
        }

        const sheetNames = workbook.SheetNames;
        if (sheetNames.length === 0) {
          throw new Error("Excel workbook contains no sheets.");
        }

        const activeSheet = selectedSheet && sheetNames.includes(selectedSheet)
          ? selectedSheet
          : sheetNames[0];

        const worksheet = workbook.Sheets[activeSheet];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (rows.length === 0) {
          throw new Error("No data found in the active worksheet.");
        }

        resolve({
          rows,
          preview: rows.slice(0, 5),
          sheets: sheetNames,
          error: null
        });
      } catch (err: any) {
        resolve({ rows: [], preview: [], sheets: [], error: `File conversion failed: ${err.message}` });
      }
    };

    reader.onerror = () => resolve({ rows: [], preview: [], sheets: [], error: "FileReader read error." });
    
    if (extension === 'csv' || extension === 'xlsx' || extension === 'xls') {
      reader.readAsArrayBuffer(file);
    } else if (extension === 'parquet') {
      resolve({
        rows: [],
        preview: [],
        sheets: [],
        error: "Parquet format reading is supported on our high-performance query pipelines. For local sandbox interactive use, please upload Excel, CSV, or formatted JSON data files."
      });
    } else {
      resolve({
        rows: [],
        preview: [],
        sheets: [],
        error: `Unsupported file extension (.${extension}). Use Excel (.xlsx, .xls), CSV (.csv), or JSON (.json).`
      });
    }
  });
}
