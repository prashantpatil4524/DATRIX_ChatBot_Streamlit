import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import alasql from "alasql";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ limit: "500mb", extended: true }));

let PORT = parseInt(process.env.PORT || '3000', 10);

// Initialize Gemini Client using system skill guidelines
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Resilient helper to handle temporary model demand spikes (e.g. 503 errors) by falling back to other models
async function generateContentWithFallback(params: { contents: string; config?: any }) {
  const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      console.log(`Attempting Gemini API generation with model: ${model}...`);
      const response = await ai.models.generateContent({
        ...params,
        model: model,
      });
      if (response && response.text) {
        console.log(`Success with model: ${model}`);
        return response;
      }
      throw new Error(`Empty response from model ${model}`);
    } catch (err: any) {
      lastError = err;
      const errMsg = err.message || String(err);
      console.warn(`Model ${model} failed: ${errMsg}.`);
    }
  }

  throw lastError || new Error("All fallback models failed to generate content.");
}

// ==================== IN-MEMORY SEED DATABASES SETUP ====================
function setupInMemoryDatabase() {
  console.log("Initializing local SQL database engine (alasql)...");
  
  // Create tables
  alasql(`
    CREATE TABLE products (
      product_id INT IDENTITY(1,1) PRIMARY KEY,
      product_name STRING,
      category STRING,
      price NUMERIC
    );
  `);
  
  alasql(`
    CREATE TABLE customers (
      customer_id INT IDENTITY(1,1) PRIMARY KEY,
      name STRING,
      city STRING,
      age INT,
      gender STRING
    );
  `);
  
  alasql(`
    CREATE TABLE orders (
      order_id INT IDENTITY(1,1) PRIMARY KEY,
      customer_id INT,
      product_id INT,
      quantity INT,
      order_date STRING,
      total_amount NUMERIC
    );
  `);

  // Seeding Table 1: 15 Products
  const productsList = [
    { name: "Quantum Wireless Earbuds", category: "Electronics", price: 2499.00 },
    { name: "Nebula Smart Watch", category: "Electronics", price: 5999.00 },
    { name: "Aura Bluetooth Speaker", category: "Electronics", price: 3499.00 },
    { name: "Vortex Power Bank", category: "Electronics", price: 1499.00 },
    { name: "Apex Gaming Mouse", category: "Electronics", price: 1999.00 },
    
    { name: "Indigo Denim Jacket", category: "Clothing", price: 2999.00 },
    { name: "Aether Breathable Tee", category: "Clothing", price: 899.00 },
    { name: "Metro Slim Fit Chinos", category: "Clothing", price: 1799.00 },
    { name: "Solar Dynamic Hoodie", category: "Clothing", price: 2499.00 },
    { name: "Terra Trail Running Shoes", category: "Clothing", price: 3999.00 },
    
    { name: "Organic Darjeeling Tea Infusion", category: "Food", price: 450.00 },
    { name: "Artisanal Himalayan Honey", category: "Food", price: 650.00 },
    { name: "Spiced Roasted Cashews Premium", category: "Food", price: 550.00 },
    { name: "Dark Cocoa Almond Butter", category: "Food", price: 750.00 },
    { name: "Gourmet Woodfired Granola", category: "Food", price: 499.00 }
  ];

  productsList.forEach(p => {
    alasql('INSERT INTO products (product_name, category, price) VALUES (?, ?, ?)', [p.name, p.category, p.price]);
  });

  // Seeding Table 2: 100 Customers (Indian named contexts)
  const firstNamesM = ["Aarav", "Rohan", "Rahul", "Amit", "Rajesh", "Kunal", "Vikram", "Deepak", "Aman", "Arjun", "Aditya", "Pranav", "Siddharth", "Manish", "Sanjay", "Vivek", "Kiran", "Suresh", "Manoj", "Ajay"];
  const firstNamesF = ["Ananya", "Neha", "Priya", "Shreya", "Deepika", "Kriti", "Aditi", "Pooja", "Simran", "Riya", "Kajal", "Aishwarya", "Sneha", "Tanvi", "Divya", "Swati", "Nisha", "Kavita", "Jyoti", "Sunita"];
  const lastNames = ["Patel", "Sharma", "Singh", "Joshi", "Verma", "Kumar", "Iyer", "Nair", "Reddy", "Mehta", "Sen", "Gupta", "Rao", "Das", "Choudhury", "Pillai", "Deshmukh", "Bose", "Misra", "Pandey"];
  const cities = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Pune"];

  for (let i = 0; i < 100; i++) {
    const isMale = Math.random() > 0.5;
    const name = (isMale ? firstNamesM[Math.floor(Math.random() * firstNamesM.length)] : firstNamesF[Math.floor(Math.random() * firstNamesF.length)]) + " " + lastNames[Math.floor(Math.random() * lastNames.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const age = Math.floor(Math.random() * 43) + 18; // Age 18-60
    const gender = isMale ? "Male" : "Female";
    
    alasql('INSERT INTO customers (name, city, age, gender) VALUES (?, ?, ?, ?)', [name, city, age, gender]);
  }

  // Seeding Table 3: 500 Orders
  // Helper to generate a random date in YYYY-MM-DD during 2024
  function getRandomDate2024() {
    const start = new Date("2024-01-01").getTime();
    const end = new Date("2024-12-31").getTime();
    const randomTime = start + Math.random() * (end - start);
    const d = new Date(randomTime);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `2024-${month}-${day}`;
  }

  const productsInDb = alasql('SELECT product_id, price FROM products') as any[];
  for (let i = 0; i < 500; i++) {
    const customerId = Math.floor(Math.random() * 100) + 1;
    const prod = productsInDb[Math.floor(Math.random() * productsInDb.length)];
    const productId = prod.product_id;
    const price = prod.price;
    const quantity = Math.floor(Math.random() * 5) + 1; // 1-5 quantity
    const orderDate = getRandomDate2024();
    const totalAmount = parseFloat((price * quantity).toFixed(2));
    
    alasql('INSERT INTO orders (customer_id, product_id, quantity, order_date, total_amount) VALUES (?, ?, ?, ?, ?)', [customerId, productId, quantity, orderDate, totalAmount]);
  }
  
  console.log("In-memory SQL Database successfully seeded: 15 Products, 100 Customers, 500 Orders.");
}

// Boot local DB memory context
setupInMemoryDatabase();

// ==================== API BACKEND ENDPOINTS ====================

// Server Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Authentication controller
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "aria2024") {
    res.json({ authenticated: true });
  } else {
    res.status(401).json({ error: "Identity decryption mismatch error." });
  }
});

// Retrieves full database schema representation
app.get("/api/database/schema", (req, res) => {
  const schemaSummary = 
    `Table: products → Columns: product_id (integer), product_name (text), category (text), price (numeric)\n` +
    `Table: customers → Columns: customer_id (integer), name (text), city (text), age (integer), gender (text)\n` +
    `Table: orders → Columns: order_id (integer), customer_id (integer) REFERENCES customers(customer_id), ` +
    `product_id (integer) REFERENCES products(product_id), quantity (integer), order_date (date), total_amount (numeric)`;
  res.json({ schema: schemaSummary });
});

// Endpoint to upload a custom parsed data file as columns/rows
app.post("/api/database/upload", (req, res) => {
  const { rows } = req.body;
  if (!rows || !Array.isArray(rows)) {
    return res.status(400).json({ error: "Invalid data format. Expected an array of rows." });
  }

  try {
    console.log(`Loading custom dataset... received ${rows.length} rows.`);

    // 1. Wipe existing custom data
    alasql('DROP TABLE IF EXISTS data');
    
    // 2. Create target table
    alasql('CREATE TABLE data');
    
    // 3. Select rows into data
    alasql('SELECT * INTO data FROM ?', [rows]);

    console.log(`Database engine loaded custom dataset of ${rows.length} rows successfully.`);
    res.json({ success: true, count: rows.length });
  } catch (err: any) {
    console.error("AlaSQL custom file load error: ", err);
    res.status(500).json({ error: `Failed to load data table: ${err.message}` });
  }
});

// Plain English questions to SQL + Execution
const nl2sqlHandler = async (req: express.Request, res: express.Response) => {
  const { question, schemaText } = req.body;
  if (!question || !question.trim()) {
    return res.status(400).json({ error: "Telemetry parsed an empty query identity text." });
  }

  // Guard API Key gracefully
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ 
      error: "GEMINI_API_KEY environment helper variable is missing in system secrets." 
    });
  }

  const isCustomFile = !!schemaText;
  const activeSchema = schemaText || (
    `Table: products → Columns: product_id (integer), product_name (text), category (text), price (numeric)\n` +
    `Table: customers → Columns: customer_id (integer), name (text), city (text), age (integer), gender (text)\n` +
    `Table: orders → Columns: order_id (integer), customer_id (integer) REFERENCES customers(customer_id), ` +
    `product_id (integer) REFERENCES products(product_id), quantity (integer), order_date (date), total_amount (numeric)`
  );

  // Custom prompt tailored specifically for customer schema structures
  const prompt = isCustomFile ? `You are a DuckDB/alaSQL expert data analyst.

The user uploaded a custom data file. It is loaded as an in-memory SQL table named exactly 'data' (lowercase).

Schema of the uploaded file:
${activeSchema}

User Question: "${question}"

Rules:
1. Return ONLY the raw SQL query — no explanation, no markdown blocks, no backticks.
2. The table name to query is always 'data' (lowercase).
3. Use standard SQL syntax compatible with alaSQL/sqlite.
4. Use the EXACT column names from the schema provided above. 
5. CRITICAL: If a column name has spaces, you MUST wrap it in double quotes: "Column Name".
6. Add LIMIT 50 unless the user asks for a specific limit.
7. For text searches, use standard LIKE/ILIKE operators.
8. If performing aggregations, make sure to include GROUP BY for all non-aggregate columns.
9. Return ONLY the plain SQL string.

SQL:
` : `You are an expert SQL analyst working with PostgreSQL on Supabase.

Database Schema:
${activeSchema}

User Question: "${question}"

Rules:
1. Return ONLY the raw SQL query — no explanation, no markdown, no backticks.
2. Use only tables and columns listed in the schema above.
3. Use proper JOINs when data spans multiple tables.
4. Use standard ANSI SQL syntax compatible with Postgres.
5. Keep queries highly optimized.
6. Always add LIMIT 20 unless user specifies a number.

SQL:
`;

  try {
    // Generate code using our robust fallback system
    const response = await generateContentWithFallback({
      contents: prompt,
    });

    let rawSql = response.text || "";
    
    // Clean backticks or custom text tags
    rawSql = rawSql.trim();
    rawSql = rawSql.replace(/^```sql\s*/i, "");
    rawSql = rawSql.replace(/^```\s*/, "");
    rawSql = rawSql.replace(/\s*```$/, "");
    rawSql = rawSql.trim();
    if (rawSql.toUpperCase().startsWith("SQL:")) {
      rawSql = rawSql.substring(4).trim();
    }

    console.log(`Executed translation for context: '${question}' -> SQL: [${rawSql}]`);

    let parsedSql = rawSql;
    
    // Execute query with alaSQL
    try {
      const dbResults = alasql(parsedSql);
      res.json({
        success: true,
        sql: rawSql,
        rows: dbResults,
        data: dbResults,
        error: null
      });
    } catch (dbError: any) {
      console.error("Alasql compilations failure direct retry: ", dbError);
      
      // Fallback: If alasql had trouble with a specific SQL syntax, ask Gemini to rewrite as standard SQL.
      const correctivePrompt = isCustomFile ? `The SQL query you wrote: "${rawSql}" failed with error: "${dbError.message}" on alaSQL.
Re-write it as standard ANSI SQL. The table is called 'data'. Avoid complex operators, proprietary casts, or backticks.
Make it compatible with standard sqlite/alaSQL. 
CRITICAL: Double-quote column names that have spaces (e.g. "Column Name"). Return ONLY the raw SQL.` : `The SQL query you wrote: "${rawSql}" failed with error: "${dbError.message}". 
Re-write it as simple ANSI-92 standard SQL (no Postgres-specific date operators or casts). Use joins, count, sum, group by.
Keep it compatible with alasql/sqlite. Return ONLY the raw SQL.`;

      const fallbackResponse = await generateContentWithFallback({
        contents: correctivePrompt,
      });

      let cleanFallbackSql = fallbackResponse.text || "";
      cleanFallbackSql = cleanFallbackSql.trim().replace(/^```sql\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
      if (cleanFallbackSql.toUpperCase().startsWith("SQL:")) {
        cleanFallbackSql = cleanFallbackSql.substring(4).trim();
      }
      
      try {
        const fallbackResults = alasql(cleanFallbackSql);
        res.json({
          success: true,
          sql: cleanFallbackSql,
          rows: fallbackResults,
          data: fallbackResults,
          error: null
        });
      } catch (retryError: any) {
        // Return helpful suggestions if column not found
        let friendlyErr = retryError.message;
        if (friendlyErr.toLowerCase().includes("column") || friendlyErr.toLowerCase().includes("undefined")) {
          friendlyErr = `Column name mismatch or incorrect logic: ${retryError.message}. Double-check your column spellings or uppercase/lowercase values.`;
        }
        res.json({
          success: false,
          sql: rawSql,
          rows: [],
          data: [],
          error: friendlyErr
        });
      }
    }
    
  } catch (err: any) {
    console.error("Gemini compilation exception: ", err);
    res.status(500).json({ error: `Cognition engine translation failure: ${err.message}` });
  }
};

app.post("/api/nl2sql/chat", nl2sqlHandler);
app.post("/api/database/query", nl2sqlHandler);

// ==================== VITE DEVELOPMENT INTERFACE MIDDLEWARE ====================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const startListening = () => {
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Bioluminescent server booting! 🚀`);
      console.log(`➜  Local:   http://localhost:${PORT}/`);
    });

    server.on('error', (e: any) => {
      if (e.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is in use, trying port ${PORT + 1}...`);
        PORT++;
        startListening();
      } else {
        console.error(e);
      }
    });
  };

  startListening();
}

startServer();
