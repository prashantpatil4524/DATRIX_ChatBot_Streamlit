import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Upload, 
  Trash2, 
  Download, 
  Database, 
  LogOut, 
  HelpCircle, 
  ArrowRight, 
  Send,
  FileText,
  Settings,
  Grid,
  TrendingUp,
  Cpu
} from 'lucide-react';
import Login from './components/Login';
import Avatar, { BrandLogoSvg } from './components/Avatar';
import ThemeSwitcher from './components/ThemeSwitcher';
import CustomChart from './components/CustomChart';
import { load_file } from './utils/fileLoader';
import { get_schema_text, get_sample_questions } from './utils/schemaExtractor';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sql?: string;
  df?: any[];
  error?: string;
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [queryCount, setQueryCount] = useState(0);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  
  // File upload state controls
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedRows, setUploadedRows] = useState<any[]>([]);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [dfPreview, setDfPreview] = useState<any[] | null>(null);
  
  const [fileError, setFileError] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<string>('DEEP OCEAN');
  const [sidebarHistoryVisible, setSidebarHistoryVisible] = useState(true);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  // Handle local CSV/XLSX file Ingestion
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    setLoading(true);

    try {
      // 1. Parsing file client-side using XLSX library
      const parseResult = await load_file(file);
      if (parseResult.error) {
        setFileError(parseResult.error);
        setLoading(false);
        return;
      }

      // 2. Transmitting parsed rows directly to the backend database engine
      const response = await fetch('/api/database/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parseResult.rows }),
      });

      const uploadData = await response.json();
      if (response.ok) {
        setUploadedFile(file);
        setUploadedFileName(file.name);
        setUploadedRows(parseResult.rows);
        setSheetNames(parseResult.sheets || []);
        setSelectedSheet(parseResult.sheets?.[0] || '');
        setDfPreview(parseResult.preview || []);
        setMessages([]);

        // Generate dynamic suggestions based on parsed columns
        const suggestions = get_sample_questions(parseResult.rows);
        setDynamicSuggestions(suggestions);
      } else {
        setFileError(uploadData.error || 'Failed loading records into system SQL engine.');
      }
    } catch (err: any) {
      setFileError(`Ingress error: ${err.message || 'Connection interrupted.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSheetSwitch = async (sheet: string) => {
    if (!uploadedFile) return;
    setLoading(true);
    setSelectedSheet(sheet);

    try {
      // 1. Re-parse workbook with selected sheet
      const parseResult = await load_file(uploadedFile, sheet);
      if (parseResult.error) {
        setFileError(parseResult.error);
        setLoading(false);
        return;
      }

      // 2. Reload database engine table
      const response = await fetch('/api/database/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parseResult.rows }),
      });

      const uploadData = await response.json();
      if (response.ok) {
        setUploadedRows(parseResult.rows);
        setDfPreview(parseResult.preview || []);
        setMessages([]);
        
        // Generate dynamic suggestions for new sheet
        const suggestions = get_sample_questions(parseResult.rows);
        setDynamicSuggestions(suggestions);
      } else {
        setFileError(uploadData.error || 'Worksheet matrix switch error.');
      }
    } catch (err: any) {
      setFileError(`Sheet selection failed: ${err.message || 'Terminal connection offline.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleQuerySubmit = async (queryText: string) => {
    if (!queryText.trim() || loading || !uploadedFileName) return;

    const trimmedQuery = queryText.trim();
    setInputText('');
    setLoading(true);

    const timestamp = new Date().toLocaleTimeString();
    
    // Add User Message
    const userMsg: Message = {
      role: 'user',
      content: trimmedQuery,
      timestamp,
    };

    setMessages(prev => [...prev, userMsg]);
    setQueryCount(prev => prev + 1);
    
    if (!recentQueries.includes(trimmedQuery)) {
      setRecentQueries(prev => [...prev.slice(-4), trimmedQuery]);
    }

    // Extract the schema text from uploaded rows
    const schemaText = get_schema_text(uploadedRows);

    try {
      const response = await fetch('/api/database/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmedQuery, schemaText }),
      });

      const data = await response.json();
      const botTimestamp = new Date().toLocaleTimeString();

      if (response.ok) {
        const assistantMsg: Message = {
          role: 'assistant',
          content: data.error 
            ? 'Execution failed. Understood criteria but database core returned errors.' 
            : 'Decoded structural inquiries successfully. Generated matching reports and graphics.',
          timestamp: botTimestamp,
          sql: data.sql,
          df: data.rows || data.data,
          error: data.error,
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        const errAnswer: Message = {
          role: 'assistant',
          content: 'Datrix parser exception. Data connection failed or server is offline.',
          timestamp: botTimestamp,
          error: data.error || 'System pipeline breakdown.',
        };
        setMessages(prev => [...prev, errAnswer]);
      }
    } catch (err: any) {
      const serverErr: Message = {
        role: 'assistant',
        content: 'Server error: Connection refused compiled.',
        timestamp: new Date().toLocaleTimeString(),
        error: err.message,
      };
      setMessages(prev => [...prev, serverErr]);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = (rows: any[], index: number) => {
    if (!rows || rows.length === 0) return;
    const columns = Object.keys(rows[0]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [columns.join(","), ...rows.map(r => columns.map(col => `"${String(r[col]).replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `datrix_analytics_block_${index}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearData = () => {
    setUploadedFile(null);
    setUploadedFileName(null);
    setUploadedRows([]);
    setDynamicSuggestions([]);
    setSelectedSheet('');
    setSheetNames([]);
    setDfPreview(null);
    setMessages([]);
    setFileError(null);
  };

  if (!authenticated) {
    return <Login onLoginSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--neu-bg)] text-zinc-100 font-sans relative transition-colors duration-300">
      
      {/* Decorative subtle ambient lights */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute w-[400px] h-[400px] rounded-full bg-[#00D4FF] opacity-[0.02] filter blur-[100px] top-[10%] left-[20%]" />
        <div className="absolute w-[350px] h-[350px] rounded-full bg-[#8A5CF5] opacity-[0.02] filter blur-[100px] bottom-[10%] right-[20%]" />
      </div>

      {/* ==================== ROW 1: CHATGPT STYLE NAVIGATION NAVBAR ==================== */}
      <header className="relative z-50 h-[64px] shrink-0 w-full bg-[var(--neu-bg)] [box-shadow:0_4px_12px_var(--neu-dark)] px-6 flex items-center justify-between select-none border-b border-white/[0.01]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-[34px] h-[34px]">
              <BrandLogoSvg className="w-full h-full filter drop-shadow-[0_0_5px_rgba(0,212,255,0.4)]" />
            </div>
            
            <span className="font-hero text-xl font-black tracking-[4px] text-transparent bg-clip-text bg-gradient-to-r from-[#00D4FF] to-[#7B5EA7]">
              DATRIX
            </span>
          </div>
        </div>

        {/* Global horizontal rail actions list */}
        <div className="hidden md:flex items-center gap-4">
          <button 
            onClick={() => { setMessages([]); }}
            className="text-[10px] font-bold text-zinc-400 hover:text-[#00D4FF] px-4 py-2.5 rounded-xl h-[38px] neumorphic-btn hover:border-[#00D4FF]/25 hover:text-[#00D4FF] transition-all cursor-pointer uppercase tracking-[1.5px]"
          >
            ✨ NEW CHAT
          </button>
          <button 
            onClick={() => { alert('Datatables inventory connection online.'); }}
            className="text-[10px] font-bold text-zinc-400 hover:text-[#00D4FF] px-4 py-2.5 rounded-xl h-[38px] neumorphic-btn hover:border-[#00D4FF]/25 hover:text-[#00D4FF] transition-all cursor-pointer uppercase tracking-[1.5px]"
          >
            📁 MY FILES
          </button>
          <button 
            onClick={() => { alert('Terminal specifications online.'); }}
            className="text-[10px] font-bold text-zinc-400 hover:text-[#00D4FF] px-4 py-2.5 rounded-xl h-[38px] neumorphic-btn hover:border-[#00D4FF]/25 hover:text-[#00D4FF] transition-all cursor-pointer uppercase tracking-[1.5px]"
          >
            ⚙️ SETTINGS
          </button>
        </div>

        {/* User admin profile disconnect & sidebar history toggle */}
        <div className="flex items-center gap-4">
          {/* Hamburger Menu slide controller */}
          <button 
            onClick={() => setSidebarHistoryVisible(prev => !prev)}
            title="Toggle context history menu"
            className="text-zinc-400 hover:text-[#00D4FF] h-[36px] w-[36px] rounded-xl flex items-center justify-center neumorphic-btn border border-transparent hover:border-[#00D4FF]/20 active:border-[#00D4FF]/30 cursor-pointer transition-all duration-200 text-lg"
          >
            ☰
          </button>

          <div className="flex items-center gap-2 bg-[var(--neu-bg)] [box-shadow:inset_2px_2px_5px_var(--neu-dark),inset_-2px_-2px_5px_var(--neu-light)] px-3.5 py-1.5 rounded-full text-[9px] font-mono text-[#00FFCC] font-bold uppercase tracking-wider select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00FFCC] animate-pulse" />
            <span>admin</span>
          </div>
          <button 
            onClick={() => setAuthenticated(false)}
            className="text-[9.5px] font-mono font-bold text-rose-400 hover:text-white px-3.5 py-2.5 rounded-xl h-[36px] neumorphic-btn hover:border-rose-500/25 active:scale-95 transition-all cursor-pointer uppercase"
          >
            DISCONNECT ✕
          </button>
        </div>
      </header>

      {/* ==================== ROW 2: ACTIVE THREE-COLUMN LAYOUT PANEL ==================== */}
      <main className="flex flex-1 w-full overflow-hidden relative z-10 bg-[var(--neu-bg)]">
        
        {/* COLUMN 1: INTERACTIVE DATA FILE INDEXER (LEFT SIDE - 25%) */}
        <section className="w-[25%] shrink-0 h-full flex flex-col p-6 overflow-y-auto select-none border-r border-[#1a1d2b]/20">
          <h3 className="text-[11px] text-[var(--bio-teal)] tracking-[2.5px] font-black uppercase mb-5 font-hero">
            📊 Dataset Interface
          </h3>

          {!uploadedFileName ? (
            <div className="flex flex-col gap-5 mt-2">
              <label className="flex flex-col items-center justify-center rounded-[24px] bg-[var(--neu-bg)] [box-shadow:inset_5px_5px_12px_var(--neu-dark),inset_-5px_-5px_12px_var(--neu-light)] py-11 px-4 text-center cursor-pointer group border border-transparent hover:border-[#00D4FF]/20 hover:scale-[1.01] transition-all duration-200">
                <Upload className="w-8 h-8 text-zinc-400 group-hover:text-[#00D4FF] group-hover:scale-110 transition-transform mb-3" />
                <span className="text-[12px] font-bold text-white mb-1 tracking-[0.2px]">Drag & drop dataset</span>
                <span className="text-[9px] text-[#7E869C] uppercase font-bold tracking-wider mt-1">CSV, Excel (Max 500MB)</span>
                <input 
                  type="file" 
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden" 
                />
              </label>
              
              {fileError && (
                <div className="p-4 bg-red-950/20 border border-red-500/10 rounded-xl text-[10px] font-mono text-red-400 leading-normal">
                  ⚠️ {fileError}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Active info cards */}
              <div className="bg-[var(--neu-bg)] [box-shadow:4px_4px_10px_var(--neu-dark),-4px_-4px_10px_var(--neu-light)] rounded-2xl p-4 flex items-start gap-3.5 border border-white/[0.01]">
                <div className="p-2.5 rounded-xl bg-[var(--neu-bg)] [box-shadow:inset_2px_2px_5px_var(--neu-dark),inset_-2px_-2px_5px_var(--neu-light)]">
                  <FileText className="w-5 h-5 text-[#00D4FF]" />
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] font-bold truncate text-white" title={uploadedFileName}>{uploadedFileName}</div>
                  <div className="text-[9px] font-mono text-rose-400 font-bold mt-1.5">Size: {(uploadedFile?.size ? uploadedFile.size / (1024*1024) : 1.22).toFixed(2)} MB</div>
                </div>
                
                <button 
                  onClick={handleClearData}
                  className="text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer p-1 rounded-lg hover:bg-zinc-800/10"
                  title="Purge cache"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Sheet Switcher */}
              {sheetNames.length > 1 && (
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-[1.5px] pl-1">Worksheet Selection:</label>
                  <div className="w-full bg-[var(--neu-bg)] [box-shadow:inset_3px_3px_8px_var(--neu-dark),inset_-3px_-3px_8px_var(--neu-light)] rounded-xl px-2.5 py-1 flex items-center">
                    <select
                      value={selectedSheet}
                      onChange={(e) => handleSheetSwitch(e.target.value)}
                      className="w-full bg-transparent text-xs text-zinc-200 outline-none font-mono font-bold cursor-pointer border-none py-1.5"
                    >
                      {sheetNames.map((sheet, idx) => (
                        <option key={idx} value={sheet} className="bg-[#12141F] text-zinc-200">{sheet}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Data Table Review */}
              {dfPreview && dfPreview.length > 0 && (
                <div className="flex flex-col gap-2 w-full">
                  <label className="text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-[1.5px] pl-1">Live Source Preview:</label>
                  <div className="max-h-[140px] overflow-auto [box-shadow:inset_3px_3px_8px_var(--neu-dark),inset_-3px_-3px_8px_var(--neu-light)] rounded-xl text-[9.5px] bg-transparent scrollbar-thin">
                    <table className="w-full text-left font-mono border-collapse">
                      <thead className="bg-[#1E202B]/30 text-zinc-300 sticky top-0 font-bold border-b border-white/[0.02]">
                        <tr>
                          {Object.keys(dfPreview[0]).slice(0, 3).map((col, idx) => (
                            <th key={idx} className="p-2 px-3 truncate max-w-[80px]" title={col}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/20 text-zinc-400">
                        {dfPreview.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-white/[0.01]">
                            {Object.keys(dfPreview[0]).slice(0, 3).map((col, cIdx) => (
                              <td key={cIdx} className="p-2 px-3 truncate max-w-[80px]" title={String(row[col])}>
                                {String(row[col])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Telemetry Profiles info */}
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-[1.5px] pl-1">Telemetry parameters:</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[var(--neu-bg)] [box-shadow:4px_4px_10px_var(--neu-dark),-4px_-4px_10px_var(--neu-light)] p-3 rounded-xl text-center border border-white/[0.01]">
                    <span className="text-[8.5px] text-[#7E869C] uppercase font-bold tracking-wide">Data count</span>
                    <span className="block text-[14px] font-bold text-white font-mono mt-1">{dfPreview?.length ? dfPreview.length * 20 : 1344}</span>
                  </div>
                  <div className="bg-[var(--neu-bg)] [box-shadow:4px_4px_10px_var(--neu-dark),-4px_-4px_10px_var(--neu-light)] p-3 rounded-xl text-center border border-white/[0.01]">
                    <span className="text-[8.5px] text-[#7E869C] uppercase font-bold tracking-wide">Fields</span>
                    <span className="block text-[14px] font-bold text-[#00D4FF] font-mono mt-1">{dfPreview?.length ? Object.keys(dfPreview[0]).length : 12}</span>
                  </div>
                </div>
              </div>

              {/* Metric Card layout blocks */}
              <div className="mt-2 space-y-3">
                <div className="relative bg-[var(--neu-bg)] [box-shadow:4px_4px_10px_var(--neu-dark),-4px_-4px_10px_var(--neu-light)] p-4 rounded-xl overflow-hidden group border border-white/[0.01]">
                  <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-[#00D4FF]" />
                  <span className="text-[8.5px] font-bold text-[#7E869C] font-mono uppercase tracking-[1.5px] pl-2">Data block ingestion</span>
                  <span className="block text-[14px] font-bold text-white mt-1 pl-2">High Intensity Pipeline</span>
                </div>
                <div className="relative bg-[var(--neu-bg)] [box-shadow:4px_4px_10px_var(--neu-dark),-4px_-4px_10px_var(--neu-light)] p-4 rounded-xl overflow-hidden group border border-white/[0.01]">
                  <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-[#7B5EA7]" />
                  <span className="text-[8.5px] font-bold text-[#7E869C] font-mono uppercase tracking-[1.5px] pl-2">Translation matrix</span>
                  <span className="block text-[14px] font-bold text-white mt-1 pl-2">Schema Auto-Matched</span>
                </div>
              </div>
            </div>
          )}

          {!uploadedFileName && (
            <div className="mt-5 text-center p-6 bg-[var(--neu-bg)] [box-shadow:inset_4px_4px_10px_var(--neu-dark),inset_-4px_-4px_10px_var(--neu-light)] rounded-2xl border border-transparent">
              <div className="text-3xl mb-2.5">📁</div>
              <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-widest">Repository offline</h5>
              <p className="text-[9.5px] text-zinc-500 leading-normal mt-2">
                Introduce a CSV or spreadsheet layout. Datrix decryption algorithms will capture profiles, dimensions, and categories.
              </p>
            </div>
          )}
        </section>

        {/* COLUMN 2: CENTER TIMELINE DIALOGUE STREAM (55%) */}
        <section className="w-[55%] h-full flex flex-col p-6 overflow-y-auto relative border-r border-[#1a1d2b]/20 bg-[var(--neu-bg)]">
          <div className="mb-4">
            <h1 className="text-[2.2rem] font-black tracking-[1.5px] text-white uppercase font-hero">
              Datrix Decoders
            </h1>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[2.5px] mt-1">
              Natural Language SQL Compiler • Dynamic charts results
            </p>
          </div>

          {/* Dialog Container Area - Inset Neumorphic Arena */}
          <div className="flex-1 bg-[var(--neu-bg)] [box-shadow:inset_8px_8px_20px_var(--neu-dark),inset_-8px_-8px_20px_var(--neu-light)] rounded-[24px] flex flex-col overflow-hidden min-h-[380px] border border-white/[0.01]">
            
            {/* Context badging header */}
            <div className="h-[58px] px-5 bg-[var(--neu-bg)] [box-shadow:0_3px_8px_var(--neu-dark)] flex items-center justify-between border-b border-white/[0.01] z-[5]">
              <div className="flex items-center gap-3">
                <Avatar size="mini" />
                <div className="flex flex-col">
                  <h4 className="text-[11px] font-bold text-white uppercase tracking-[1px] font-hero">
                    DATRIX ANALYTICAL TIMELINE
                  </h4>
                  <div className="flex items-center gap-1.5 text-[8.2px] text-[#00FFCC] font-mono font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00FFCC] animate-ping" />
                    <span>Active mode: {uploadedFileName ? `Analyzing '${uploadedFileName}'` : "Waiting for custom dataset"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* In-view messages lists */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
              {!uploadedFileName && messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto mt-12 select-none">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--neu-bg)] [box-shadow:4px_4px_10px_var(--neu-dark),-4px_-4px_10px_var(--neu-light)] flex items-center justify-center text-[#00D4FF] mb-5">
                    <Upload className="w-6 h-6 animate-bounce" />
                  </div>
                  <h3 className="text-[13px] font-extrabold uppercase font-mono text-white tracking-[1.5px]">Data files missing</h3>
                  <p className="text-[11px] text-[#7E869C] mt-2 leading-relaxed">
                    Please import your CSV or XLSX dataset first inside the left deck to activate automated speech translation.
                  </p>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-sm mx-auto mt-20 select-none">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--neu-bg)] [box-shadow:4px_4px_10px_var(--neu-dark),-4px_-4px_10px_var(--neu-light)] flex items-center justify-center text-[#00FFCC] mb-5">
                    <Cpu className="w-6 h-6 animate-pulse" />
                  </div>
                  <h4 className="text-[10.5px] text-[#00FFCC] font-mono font-bold uppercase tracking-wider">COGNITIVE TUNNEL STABILIZED</h4>
                  <p className="text-[11.5px] text-[#7E869C] mt-2.5 leading-relaxed">
                     Ready to decapsulate. Double click recommendations or compose queries below.
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className="flex flex-col gap-3.5">
                    <div className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={
                        msg.role === 'user'
                          ? 'max-w-[85%] bg-[var(--neu-bg)] [box-shadow:4px_4px_10px_var(--neu-dark),-4px_-4px_10px_var(--neu-light)] border border-[#7B5EA7]/20 rounded-[18px_6px_18px_18px] px-4.5 py-3.5 text-zinc-100 font-sans text-xs tracking-[0.2px] leading-relaxed select-text'
                          : 'max-w-[85%] bg-[var(--neu-bg)] [box-shadow:4px_4px_10px_var(--neu-dark),-4px_-4px_10px_var(--neu-light)] border border-white/[0.01] border-l-3 border-l-[#00D4FF] rounded-[6px_18px_18px_18px] px-4.5 py-4 font-bot text-zinc-250 text-xs tracking-[0.4px] leading-relaxed select-text'
                      }>
                        {msg.content}
                        <div className="text-[8px] font-mono text-zinc-500 text-right mt-2 select-none">
                          {msg.timestamp} {msg.role === 'assistant' ? '(DATRIX)' : ''}
                        </div>
                      </div>
                    </div>

                    {/* SQL view */}
                    {msg.sql && (
                      <div className="bg-[var(--neu-bg)] [box-shadow:inset_3px_3px_8px_var(--neu-dark),inset_-3px_-3px_8px_var(--neu-light)] rounded-2xl p-4 border border-white/[0.01]">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.02] text-[9.5px] font-mono font-bold text-[#00D4FF] select-none">
                          <span>🔍 DATRIX SYNTHESIZED SQL:</span>
                        </div>
                        <pre className="font-mono text-[9px] text-[#00D4FF] bg-black/10 p-2.5 border border-black/15 rounded-lg overflow-x-auto">
                          <code>{msg.sql}</code>
                        </pre>
                      </div>
                    )}

                    {/* Report Table view */}
                    {msg.df && msg.df.length > 0 && (
                      <div className="bg-[var(--neu-bg)] [box-shadow:4px_4px_10px_var(--neu-dark),-4px_-4px_10px_var(--neu-light)] p-4 rounded-xl space-y-3.5 border border-white/[0.01]">
                        <div className="flex items-center justify-between pb-1 text-[8.5px] font-mono font-bold text-zinc-400 select-none border-b border-white/[0.02] pb-2">
                          <span>Report block results:</span>
                          <span className="text-zinc-500">Row index count: {msg.df.length}</span>
                        </div>
                        
                        <div className="max-h-[140px] overflow-auto [box-shadow:inset_3px_3px_8px_var(--neu-dark),inset_-3px_-3px_8px_var(--neu-light)] rounded-xl text-[9.5px] bg-[#12141F]/10 scrollbar-thin">
                          <table className="w-full text-left font-mono border-collapse">
                            <thead className="bg-[#1B1D2B]/20 text-zinc-300 sticky top-0 border-b border-white/[0.02] font-bold">
                              <tr>
                                {Object.keys(msg.df[0]).slice(0, 4).map((col, cId) => (
                                  <th key={cId} className="p-2 px-3">{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/10 text-zinc-400">
                              {msg.df.map((row, rId) => (
                                <tr key={rId} className="hover:bg-white/[0.01]">
                                  {Object.keys(msg.df[0]).slice(0, 4).map((col, colId) => (
                                    <td key={colId} className="p-2 px-3">{String(row[col])}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        
                        <button
                          onClick={() => exportCSV(msg.df!, idx)}
                          className="neumorphic-btn flex items-center gap-2 text-[9.5px] font-mono text-[#00FFCC] px-4 py-2 hover:text-white cursor-pointer select-none"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download Dataset report (.CSV)
                        </button>
                      </div>
                    )}

                    {/* Chart graphics */}
                    {msg.df && msg.df.length > 0 && (
                      <CustomChart data={msg.df} />
                    )}
                  </div>
                ))
              )}

              {/* Loader animation Concentric Rings */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-6 select-none animate-pulse">
                  <div className="relative w-12 h-12 mb-3.5 flex items-center justify-center">
                    <div className="absolute w-12 h-12 border-2 border-dashed border-[#00D4FF] rounded-full animate-[spin_5s_linear_infinite] opacity-70" />
                    <div className="absolute w-8 h-8 border-2 border-dashed border-[#7B5EA7] rounded-full animate-[spin_3s_linear_infinite_reverse] opacity-70" />
                    <div className="w-3.5 h-3.5 bg-rose-400 rounded-full animate-ping" />
                  </div>
                  <span className="text-[9px] font-mono font-bold tracking-[2.5px] uppercase text-zinc-400">DATRIX CORE IS RE-INDEXING...</span>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Dialogue typing prompt sticky bottom */}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleQuerySubmit(inputText); }}
              className="p-4 bg-[var(--neu-bg)] [box-shadow:0_-3px_10px_var(--neu-dark)] border-t border-white/[0.01] flex gap-3 z-10"
            >
              <input 
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={uploadedFileName ? "Perform conversational query analytics..." : "Install dataset..."}
                disabled={loading || !uploadedFileName}
                className="flex-1 neumorphic-inp text-[13px] px-4.5 py-3.5 text-zinc-200"
              />
              <button 
                type="submit"
                disabled={loading || !inputText.trim() || !uploadedFileName}
                className="p-3.5 neumorphic-btn text-white hover:text-[#00D4FF] disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center w-[46px] h-[46px] cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Quick select recommendation row */}
          {uploadedFileName && (
            <div className="mt-5 select-none">
              <span className="text-[9.5px] font-mono text-zinc-400 font-bold uppercase tracking-[1.5px] mb-2.5 block">💡 RECOMMENDATION DISCOVERY:</span>
              <div className="flex flex-wrap gap-2.5">
                {(dynamicSuggestions && dynamicSuggestions.length > 0 
                  ? dynamicSuggestions 
                  : ['Select * from data LIMIT 5', 'Show sum of quantities', 'Plot metric category profiles']
                ).map((q, qId) => (
                  <button 
                    key={qId}
                    onClick={() => handleQuerySubmit(q)}
                    className="text-[9px] font-mono bg-[var(--neu-bg)] [box-shadow:3px_3px_6px_var(--neu-dark),-3px_-3px_6px_var(--neu-light)] active:[box-shadow:inset_2px_2px_4px_var(--neu-dark),inset_-2px_-2px_4px_var(--neu-light)] text-zinc-300 hover:text-[#00D4FF] px-3 py-2 rounded-xl cursor-pointer transition-all border border-transparent"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* COLUMN 3: UTILITY CONFIG BAR (RIGHT SIDE - 20%) */}
        {sidebarHistoryVisible && (
          <section className="w-[20%] shrink-0 h-full bg-[var(--neu-bg)] flex flex-col p-6 overflow-y-auto select-none border-l border-[#1a1d2b]/20">
            
            {/* Glowing scannable avatar */}
            <div className="mb-4">
              <Avatar size="full" />
            </div>

            {/* System variables stats row */}
            <div className="p-4 bg-[var(--neu-bg)] [box-shadow:inset_3px_3px_8px_var(--neu-dark),inset_-3px_-3px_8px_var(--neu-light)] rounded-2xl space-y-3.5 text-[10px] font-mono leading-none border border-black/5">
              <div className="flex items-center justify-between text-zinc-400">
                <span>GATEWAY:</span>
                <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  AUTHENTICATED
                </span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>COGNITION:</span>
                <span className="text-[#00D4FF] font-bold">1.5 Flash API</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>DISPATCH:</span>
                <span className="text-rose-400 font-bold">{queryCount} queries</span>
              </div>
            </div>

            {/* Cognitive tracers trace lists history */}
            <div className="mt-6 flex-1 flex flex-col min-h-[140px]">
              <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-[1.5px] mb-3 block pl-1">
                Cognitive trace history
              </span>
              {recentQueries.length > 0 ? (
                <div className="space-y-2">
                  {recentQueries.map((qPast, idx) => (
                    <button 
                      key={idx}
                      onClick={() => handleQuerySubmit(qPast)}
                      className="w-full text-left font-mono text-[9px] text-zinc-400 hover:text-[#00D4FF] bg-[var(--neu-bg)] [box-shadow:3px_3px_6px_var(--neu-dark),-3px_-3px_6px_var(--neu-light)] active:[box-shadow:inset_2px_2px_4px_var(--neu-dark),inset_-2px_-2px_4px_var(--neu-light)] p-2.5 rounded-xl truncate cursor-pointer transition-all block border border-white/[0.01]"
                      title={qPast}
                    >
                      🔑 {qPast.length > 25 ? qPast.slice(0, 25) + '...' : qPast}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="text-[10px] text-zinc-650 font-mono italic pl-1">No cached history traces found</span>
              )}
            </div>

            {/* Swatch Switcher */}
            <div className="mt-auto pt-4 border-t border-zinc-800/10">
              <ThemeSwitcher currentTheme={currentTheme as any} onThemeChange={setCurrentTheme} />
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
