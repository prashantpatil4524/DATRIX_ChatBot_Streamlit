export function get_schema_text(rows: any[]): string {
  if (!rows || rows.length === 0) return "Table Name: data\nTotal Rows: 0\nTotal Columns: 0\n\nColumns:";

  const totalRows = rows.length;
  const columnsSet = new Set<string>();
  
  // Scan up to 10 rows to gather column names
  const scanLimit = Math.min(rows.length, 20);
  for (let i = 0; i < scanLimit; i++) {
    const row = rows[i];
    if (row && typeof row === 'object') {
      Object.keys(row).forEach(k => columnsSet.add(k));
    }
  }
  
  const columns = Array.from(columnsSet);
  const totalColumns = columns.length;
  const columnDetails: string[] = [];

  columns.forEach(col => {
    // Fetch non-empty, defined values
    const values = rows
      .map(r => r?.[col])
      .filter(v => v !== undefined && v !== null && v !== "");

    let detectedType = "text";
    if (values.length > 0) {
      const firstVal = values[0];
      const typeStr = typeof firstVal;

      if (typeStr === 'number') {
        detectedType = "number";
      } else if (typeStr === 'boolean') {
        detectedType = "boolean";
      } else if (typeStr === 'string') {
        const isDateString = !isNaN(Date.parse(firstVal)) &&
          (firstVal.includes('-') || firstVal.includes('/')) &&
          firstVal.length >= 8 && firstVal.length <= 25 &&
          /^\d{4}/.test(firstVal); // YYYY-MM-DD or similar standard format
        
        if (isDateString) {
          detectedType = "date";
        } else {
          detectedType = "text";
        }
      }
    }

    // Extract 3 unique non-null samples
    const uniqueSamples: string[] = [];
    for (const val of values) {
      const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
      if (!uniqueSamples.includes(valStr)) {
        uniqueSamples.push(valStr);
      }
      if (uniqueSamples.length >= 3) break;
    }

    columnDetails.push(`- ${col} (${detectedType}): ${uniqueSamples.join(", ")}`);
  });

  return [
    `Table Name: data`,
    `Total Rows: ${totalRows}`,
    `Total Columns: ${totalColumns}`,
    ``,
    `Columns:`,
    ...columnDetails
  ].join("\n");
}

export function get_sample_questions(rows: any[]): string[] {
  if (!rows || rows.length === 0) return [];

  const columnsSet = new Set<string>();
  const scanLimit = Math.min(rows.length, 20);
  for (let i = 0; i < scanLimit; i++) {
    const row = rows[i];
    if (row && typeof row === 'object') {
      Object.keys(row).forEach(k => columnsSet.add(k));
    }
  }

  const columns = Array.from(columnsSet);
  const numericCols: string[] = [];
  const textCols: string[] = [];
  const dateCols: string[] = [];

  columns.forEach(col => {
    const values = rows
      .map(r => r?.[col])
      .filter(v => v !== undefined && v !== null && v !== "");

    if (values.length > 0) {
      const firstVal = values[0];
      const typeStr = typeof firstVal;
      if (typeStr === 'number') {
        numericCols.push(col);
      } else if (typeStr === 'string') {
        const isDateString = !isNaN(Date.parse(firstVal)) &&
          (firstVal.includes('-') || firstVal.includes('/')) &&
          firstVal.length >= 8 && firstVal.length <= 25 &&
          /^\d{4}/.test(firstVal);
        
        if (isDateString) {
          dateCols.push(col);
        } else {
          textCols.push(col);
        }
      }
    }
  });

  const questions: string[] = [];

  if (numericCols.length > 0) {
    const colName = numericCols[0];
    questions.push(`What is the total ${colName}?`);
    questions.push(`Show top 10 rows by highest ${colName}`);
    questions.push(`What is the average ${colName}?`);
  }

  if (textCols.length > 0) {
    const colName = textCols[0];
    questions.push(`How many unique ${colName} are there?`);
    questions.push(`Show count of records grouped by ${colName}`);
  }

  if (dateCols.length > 0 && numericCols.length > 0) {
    const dateCol = dateCols[0];
    const numCol = numericCols[0];
    if (questions.length >= 5) questions.pop();
    questions.push(`Show trend of ${numCol} over time`);
  }

  // Decoy/Safety defaults
  const defaults = [
    "Show the first 10 rows",
    "Show record count grouped by active categories",
    "List the columns and search trends",
    "How many total records are loaded?",
    "Summarize average and summary values"
  ];

  while (questions.length < 5) {
    const nextDefault = defaults.find(q => !questions.includes(q)) || defaults[0];
    questions.push(nextDefault);
  }

  return questions.slice(0, 5);
}
