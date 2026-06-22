"""
DATRIX — Cognitive Decoder Hub
Streamlit deployment of the Analytics Chatbot.
Converts natural-language questions into SQL, executes them, and visualizes results.
"""

import os
import io
import re
import base64
import datetime

import streamlit as st
import pandas as pd
import duckdb
import plotly.express as px
import plotly.graph_objects as go
from dotenv import load_dotenv
from google import genai

# ─────────────────────────────────────────────
# ENV & CONFIG
# ─────────────────────────────────────────────
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Page configuration — must be the very first Streamlit command
st.set_page_config(
    page_title="DATRIX — Cognitive Decoder Hub",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded",
)


# ─────────────────────────────────────────────
# THEME DEFINITIONS  (matching React ThemeSwitcher.tsx)
# ─────────────────────────────────────────────
THEMES = {
    "RISO CHERRY": {
        "neuBg": "#161824", "neuLight": "#212436", "neuDark": "#0b0c12",
        "primary": "#00D4FF", "accent": "#aaff00", "secondary": "#FF5E7E",
        "textPrimary": "#E2E8F0", "textSecondary": "#7E869C",
        "surface": "#1E202B", "label": "OCEAN",
    },
    "MINT SAGE": {
        "neuBg": "#140a04", "neuLight": "#211106", "neuDark": "#070301",
        "primary": "#ff9500", "accent": "#ffdd00", "secondary": "#ff3300",
        "textPrimary": "#ffe8d6", "textSecondary": "#b08560",
        "surface": "#2d1b0d", "label": "SOLAR",
    },
    "MUSTARD SUN": {
        "neuBg": "#0b1210", "neuLight": "#14211d", "neuDark": "#040706",
        "primary": "#00FFCC", "accent": "#00ddaa", "secondary": "#aa00ff",
        "textPrimary": "#eaf5f2", "textSecondary": "#5a8c82",
        "surface": "#1c2927", "label": "AURORA",
    },
    "SABOTAGE INK": {
        "neuBg": "#110319", "neuLight": "#1d052b", "neuDark": "#05010b",
        "primary": "#ff00aa", "accent": "#00ffff", "secondary": "#ffff00",
        "textPrimary": "#fff0fc", "textSecondary": "#aa7db8",
        "surface": "#2a0442", "label": "TOKYO",
    },
}


def get_current_theme() -> dict:
    """Return the active theme dict."""
    name = st.session_state.get("theme_name", "RISO CHERRY")
    return THEMES.get(name, THEMES["RISO CHERRY"])


# ─────────────────────────────────────────────
# INJECT CUSTOM CSS  (matches index.css neumorphic look)
# ─────────────────────────────────────────────
def inject_css():
    t = get_current_theme()
    st.markdown(f"""
    <style>
    /* ── Google Fonts ── */
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Exo+2:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Share+Tech+Mono&display=swap');

    :root {{
        --neu-bg: {t["neuBg"]};
        --neu-light: {t["neuLight"]};
        --neu-dark: {t["neuDark"]};
        --bio-teal: {t["primary"]};
        --bio-lime: {t["accent"]};
        --bio-coral: {t["secondary"]};
        --bio-ghost: {t["textPrimary"]};
        --bio-dim: {t["textSecondary"]};
        --surface: {t["surface"]};
    }}

    /* ── Global app background ── */
    html, body, [data-testid="stAppViewContainer"],
    .stApp, [data-testid="stApp"] {{
        background-color: var(--neu-bg) !important;
        color: var(--bio-ghost) !important;
        font-family: 'Exo 2', sans-serif !important;
    }}
    .main .block-container {{
        background-color: var(--neu-bg) !important;
        padding-top: 2rem !important;
    }}
    header[data-testid="stHeader"] {{
        background-color: var(--neu-bg) !important;
        border-bottom: 1px solid rgba(255,255,255,0.02);
    }}
    [data-testid="stSidebar"] {{
        background-color: var(--neu-bg) !important;
        border-right: 1px solid {t["primary"]}22;
        box-shadow: 2px 0 20px rgba({_hex_to_rgb(t["primary"])}, 0.05);
    }}
    [data-testid="stSidebar"] * {{
        color: var(--bio-ghost) !important;
    }}

    /* ── Neumorphic scrollbar ── */
    ::-webkit-scrollbar {{ width: 6px; height: 6px; }}
    ::-webkit-scrollbar-track {{ background: transparent; }}
    ::-webkit-scrollbar-thumb {{ background: var(--bio-teal); border-radius: 8px; }}
    ::-webkit-scrollbar-thumb:hover {{ background: var(--bio-coral); }}

    /* ── Headings ── */
    h1, h2, h3, h4, h5, h6 {{
        color: var(--bio-ghost) !important;
        font-family: 'Orbitron', sans-serif !important;
    }}
    p, span, label, div {{
        color: var(--bio-ghost);
    }}

    /* ── Chat messages ── */
    [data-testid="stChatMessage"] {{
        background-color: var(--neu-bg) !important;
        box-shadow: 4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light) !important;
        border: 1px solid {t["primary"]}18 !important;
        border-radius: 18px !important;
        padding: 1rem 1.2rem !important;
        margin-bottom: 1rem !important;
    }}
    [data-testid="stChatMessage"] p {{
        font-family: 'Exo 2', sans-serif !important;
        font-size: 0.88rem !important;
        letter-spacing: 0.3px;
    }}

    /* user message accent */
    [data-testid="stChatMessage"][data-testid-user="user"] {{
        border-left: 3px solid var(--bio-lime) !important;
        box-shadow: 4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light), 0 0 12px rgba({_hex_to_rgb(t["accent"])}, 0.06) !important;
    }}
    /* assistant message accent */
    [data-testid="stChatMessage"][data-testid-user="assistant"] {{
        border-left: 3px solid var(--bio-teal) !important;
        box-shadow: 4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light), 0 0 12px rgba({_hex_to_rgb(t["primary"])}, 0.06) !important;
    }}

    /* ── Chat input ── */
    [data-testid="stChatInput"] textarea,
    .stChatInput textarea {{
        background-color: var(--neu-bg) !important;
        box-shadow: inset 4px 4px 10px var(--neu-dark), inset -4px -4px 10px var(--neu-light) !important;
        border: 1px solid transparent !important;
        border-radius: 12px !important;
        color: var(--bio-ghost) !important;
        font-family: 'Exo 2', sans-serif !important;
        font-size: 0.9rem !important;
    }}
    [data-testid="stChatInput"] textarea:focus {{
        border-color: var(--bio-teal) !important;
    }}

    /* ── Buttons ── */
    .stButton > button {{
        background-color: var(--neu-bg) !important;
        box-shadow: 4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light) !important;
        border: 1px solid {t["primary"]}20 !important;
        border-radius: 12px !important;
        color: var(--bio-ghost) !important;
        font-family: 'Orbitron', sans-serif !important;
        font-size: 0.65rem !important;
        letter-spacing: 2px !important;
        text-transform: uppercase !important;
        padding: 0.6rem 1.2rem !important;
        transition: all 0.25s ease !important;
    }}
    .stButton > button:hover {{
        color: var(--bio-teal) !important;
        border-color: {t["primary"]}50 !important;
        box-shadow: 2px 2px 5px var(--neu-dark), -2px -2px 5px var(--neu-light), 0 0 15px rgba({_hex_to_rgb(t["primary"])}, 0.12) !important;
        transform: translateY(1px);
    }}
    .stButton > button:active {{
        box-shadow: inset 3px 3px 6px var(--neu-dark), inset -3px -3px 6px var(--neu-light) !important;
    }}

    /* ── File uploader ── */
    [data-testid="stFileUploader"] {{
        background-color: var(--neu-bg) !important;
        box-shadow: inset 5px 5px 12px var(--neu-dark), inset -5px -5px 12px var(--neu-light) !important;
        border-radius: 20px !important;
        border: 1px solid {t["primary"]}15 !important;
        padding: 1.5rem !important;
    }}
    [data-testid="stFileUploader"] label {{
        font-family: 'Orbitron', sans-serif !important;
        color: var(--bio-dim) !important;
        font-size: 0.65rem !important;
        letter-spacing: 2px;
        text-transform: uppercase;
    }}
    [data-testid="stFileUploader"] button {{
        background-color: var(--neu-bg) !important;
        box-shadow: 3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light) !important;
        border-radius: 10px !important;
        color: var(--bio-teal) !important;
        border: 1px solid {t["primary"]}25 !important;
    }}

    /* ── Selectbox ── */
    [data-testid="stSelectbox"] div[data-baseweb="select"] > div {{
        background-color: var(--neu-bg) !important;
        box-shadow: inset 3px 3px 8px var(--neu-dark), inset -3px -3px 8px var(--neu-light) !important;
        border: 1px solid transparent !important;
        border-radius: 12px !important;
        color: var(--bio-ghost) !important;
    }}

    /* ── DataFrames / tables ── */
    [data-testid="stDataFrame"], .stDataFrame {{
        border-radius: 16px !important;
        overflow: hidden !important;
    }}
    [data-testid="stDataFrame"] [data-testid="glideDataEditor"] {{
        border-radius: 14px !important;
    }}

    /* ── Neumorphic card helper ── */
    .neu-card {{
        background-color: var(--neu-bg);
        box-shadow: 4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light);
        border: 1px solid {t["primary"]}15;
        border-radius: 16px;
        padding: 1rem 1.2rem;
        margin-bottom: 0.8rem;
    }}
    .neu-inset {{
        background-color: var(--neu-bg);
        box-shadow: inset 4px 4px 10px var(--neu-dark), inset -4px -4px 10px var(--neu-light);
        border: 1px solid {t["primary"]}12;
        border-radius: 16px;
        padding: 1rem 1.2rem;
    }}

    /* ── Metrics / info cards ── */
    [data-testid="stMetric"] {{
        background-color: var(--neu-bg) !important;
        box-shadow: 4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light), 0 0 10px rgba({_hex_to_rgb(t["primary"])}, 0.04) !important;
        border: 1px solid {t["primary"]}18 !important;
        border-radius: 16px !important;
        padding: 1rem !important;
    }}
    [data-testid="stMetricLabel"] {{
        font-family: 'Orbitron', sans-serif !important;
        font-size: 0.55rem !important;
        letter-spacing: 2px;
        text-transform: uppercase;
        color: var(--bio-dim) !important;
    }}
    [data-testid="stMetricValue"] {{
        font-family: 'Share Tech Mono', monospace !important;
        color: var(--bio-teal) !important;
    }}

    /* ── Expander ── */
    [data-testid="stExpander"] {{
        background-color: var(--neu-bg) !important;
        box-shadow: inset 3px 3px 8px var(--neu-dark), inset -3px -3px 8px var(--neu-light) !important;
        border: 1px solid {t["primary"]}15 !important;
        border-radius: 16px !important;
    }}
    [data-testid="stExpander"] summary {{
        font-family: 'Share Tech Mono', monospace !important;
        font-size: 0.75rem !important;
        color: var(--bio-teal) !important;
        letter-spacing: 1px;
    }}

    /* ── Code blocks ── */
    code, pre {{
        font-family: 'Share Tech Mono', monospace !important;
        background-color: rgba(0,0,0,0.2) !important;
        color: var(--bio-teal) !important;
        border-radius: 8px;
    }}

    /* ── Plotly chart container ── */
    .stPlotlyChart {{
        background-color: var(--neu-bg) !important;
        box-shadow: 4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light), 0 0 18px rgba({_hex_to_rgb(t["primary"])}, 0.05) !important;
        border: 1px solid {t["primary"]}20 !important;
        border-radius: 18px !important;
        padding: 0.5rem !important;
    }}

    /* ── Toast / alert ── */
    .stAlert {{
        background-color: var(--surface) !important;
        border-radius: 12px !important;
        border: 1px solid rgba(255,255,255,0.03) !important;
    }}

    /* ── Ambient glow blobs ── */
    .ambient-blob {{
        position: fixed;
        border-radius: 50%;
        filter: blur(100px);
        pointer-events: none;
        z-index: 0;
    }}

    /* ── Pill button row ── */
    .pill-btn {{
        display: inline-block;
        background-color: var(--neu-bg);
        box-shadow: 3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light);
        border-radius: 12px;
        padding: 0.4rem 0.9rem;
        margin: 0.2rem;
        font-family: 'Share Tech Mono', monospace;
        font-size: 0.7rem;
        color: var(--bio-dim);
        cursor: pointer;
        transition: all 0.2s;
    }}
    .pill-btn:hover {{
        color: var(--bio-teal);
    }}

    /* ── Logo image sizing ── */
    .datrix-logo {{
        max-width: 60px;
        filter: drop-shadow(0 0 12px rgba({_hex_to_rgb(t["primary"])}, 0.45));
    }}

    /* ── Theme color circle swatch ── */
    .theme-swatch-row {{
        display: flex;
        justify-content: center;
        gap: 12px;
        margin-top: 0.3rem;
    }}
    .theme-swatch {{
        width: 36px;
        height: 36px;
        border-radius: 50%;
        cursor: pointer;
        border: 2px solid transparent;
        box-shadow: 3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light);
        transition: all 0.25s ease;
        position: relative;
    }}
    .theme-swatch:hover {{
        transform: scale(1.15);
        box-shadow: 0 0 16px rgba(255,255,255,0.15), 3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light);
    }}
    .theme-swatch.active {{
        border-color: white;
        box-shadow: 0 0 20px rgba(255,255,255,0.2), 3px 3px 6px var(--neu-dark), -3px -3px 6px var(--neu-light);
        transform: scale(1.1);
    }}
    .theme-swatch-label {{
        font-family: 'Share Tech Mono', monospace;
        font-size: 0.5rem;
        color: var(--bio-dim);
        text-align: center;
        margin-top: 4px;
        letter-spacing: 0.5px;
    }}

    /* ── Glowing accent keyframes ── */
    @keyframes glowPulse {{
        0%, 100% {{ box-shadow: 0 0 8px rgba({_hex_to_rgb(t["primary"])}, 0.15); }}
        50% {{ box-shadow: 0 0 20px rgba({_hex_to_rgb(t["primary"])}, 0.3); }}
    }}
    @keyframes borderGlow {{
        0%, 100% {{ border-color: {t["primary"]}25; }}
        50% {{ border-color: {t["primary"]}50; }}
    }}

    /* ── Hide default streamlit menu & footer for cleaner look ── */
    #MainMenu {{ visibility: hidden; }}
    footer {{ visibility: hidden; }}

    /* ── Divider ── */
    hr {{
        border: none;
        height: 3px;
        background: linear-gradient(90deg, transparent, {t["primary"]}30, {t["secondary"]}30, transparent);
        box-shadow: inset 2px 2px 5px var(--neu-dark), inset -2px -2px 5px var(--neu-light), 0 0 8px rgba({_hex_to_rgb(t["primary"])}, 0.08);
        border-radius: 99px;
        margin: 1.2rem 0;
    }}

    /* ── Form inputs (login page) ── */
    [data-testid="stTextInput"] input {{
        background-color: var(--neu-bg) !important;
        box-shadow: inset 4px 4px 10px var(--neu-dark), inset -4px -4px 10px var(--neu-light) !important;
        border: 1px solid {t["primary"]}20 !important;
        border-radius: 12px !important;
        color: var(--bio-ghost) !important;
        font-family: 'Exo 2', sans-serif !important;
    }}
    [data-testid="stTextInput"] input:focus {{
        border-color: {t["primary"]}60 !important;
        box-shadow: inset 4px 4px 10px var(--neu-dark), inset -4px -4px 10px var(--neu-light), 0 0 12px rgba({_hex_to_rgb(t["primary"])}, 0.15) !important;
    }}
    [data-testid="stTextInput"] label {{
        font-family: 'Orbitron', sans-serif !important;
        font-size: 0.55rem !important;
        letter-spacing: 2px !important;
        text-transform: uppercase !important;
        color: var(--bio-dim) !important;
    }}

    /* ── Login form submit button glow ── */
    [data-testid="stForm"] .stButton > button {{
        border: 1px solid {t["primary"]}30 !important;
        animation: borderGlow 3s ease-in-out infinite;
    }}
    [data-testid="stForm"] .stButton > button:hover {{
        border-color: {t["primary"]}70 !important;
        box-shadow: 4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light), 0 0 25px rgba({_hex_to_rgb(t["primary"])}, 0.2) !important;
    }}
    </style>

    <!-- Ambient glow blobs -->
    <div class="ambient-blob" style="width:400px;height:400px;background:{t["primary"]};opacity:0.02;top:10%;left:20%;"></div>
    <div class="ambient-blob" style="width:350px;height:350px;background:{t["secondary"]};opacity:0.02;bottom:10%;right:20%;"></div>
    """, unsafe_allow_html=True)


# ─────────────────────────────────────────────
# SESSION STATE INIT
# ─────────────────────────────────────────────
def init_session():
    defaults = {
        "authenticated": False,
        "messages": [],
        "query_count": 0,
        "recent_queries": [],
        "uploaded_df": None,
        "uploaded_filename": None,
        "uploaded_sheets": [],
        "selected_sheet": None,
        "dynamic_suggestions": [],
        "theme_name": "RISO CHERRY",
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v

init_session()


# ─────────────────────────────────────────────
# GEMINI CLIENT  (matching server.ts fallback logic)
# ─────────────────────────────────────────────
def get_genai_client():
    """Lazily create and cache the Google GenAI client."""
    if "genai_client" not in st.session_state:
        st.session_state.genai_client = genai.Client(api_key=GEMINI_API_KEY)
    return st.session_state.genai_client


def generate_content_with_fallback(prompt: str) -> str:
    """Call Gemini with fallback model list — mirrors server.ts logic."""
    models_to_try = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"]
    client = get_genai_client()
    last_error = None

    for model in models_to_try:
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
            )
            text = response.text
            if text:
                return text.strip()
            raise ValueError(f"Empty response from model {model}")
        except Exception as e:
            last_error = e
            continue

    raise last_error or RuntimeError("All fallback models failed.")


# ─────────────────────────────────────────────
# SCHEMA EXTRACTOR  (mirrors schemaExtractor.ts)
# ─────────────────────────────────────────────
def get_schema_text(df: pd.DataFrame) -> str:
    """Build a human-readable schema summary from the dataframe."""
    if df is None or df.empty:
        return "Table Name: data\nTotal Rows: 0\nTotal Columns: 0\n\nColumns:"

    lines = [
        f"Table Name: data",
        f"Total Rows: {len(df)}",
        f"Total Columns: {len(df.columns)}",
        "",
        "Columns:",
    ]
    for col in df.columns:
        non_null = df[col].dropna()
        if non_null.empty:
            dtype = "text"
        elif pd.api.types.is_numeric_dtype(non_null):
            dtype = "number"
        elif pd.api.types.is_bool_dtype(non_null):
            dtype = "boolean"
        else:
            # check date
            sample = str(non_null.iloc[0])
            if re.match(r"^\d{4}[-/]", sample) and 8 <= len(sample) <= 25:
                dtype = "date"
            else:
                dtype = "text"

        samples = [str(v) for v in non_null.unique()[:3]]
        lines.append(f"- {col} ({dtype}): {', '.join(samples)}")

    return "\n".join(lines)


def get_sample_questions(df: pd.DataFrame) -> list[str]:
    """Auto-generate smart question suggestions (mirrors schemaExtractor.ts)."""
    if df is None or df.empty:
        return []

    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    text_cols = df.select_dtypes(include="object").columns.tolist()
    date_cols = []

    # simple date detection from object columns
    for col in text_cols[:]:
        sample = str(df[col].dropna().iloc[0]) if not df[col].dropna().empty else ""
        if re.match(r"^\d{4}[-/]", sample) and 8 <= len(sample) <= 25:
            date_cols.append(col)
            text_cols.remove(col)

    questions: list[str] = []

    if numeric_cols:
        c = numeric_cols[0]
        questions.append(f"What is the total {c}?")
        questions.append(f"Show top 10 rows by highest {c}")
        questions.append(f"What is the average {c}?")

    if text_cols:
        c = text_cols[0]
        questions.append(f"How many unique {c} are there?")
        questions.append(f"Show count of records grouped by {c}")

    if date_cols and numeric_cols:
        if len(questions) >= 5:
            questions.pop()
        questions.append(f"Show trend of {numeric_cols[0]} over time")

    defaults = [
        "Show the first 10 rows",
        "Show record count grouped by active categories",
        "List the columns and search trends",
        "How many total records are loaded?",
        "Summarize average and summary values",
    ]
    while len(questions) < 5:
        nxt = next((q for q in defaults if q not in questions), defaults[0])
        questions.append(nxt)

    return questions[:5]


# ─────────────────────────────────────────────
# NL → SQL → EXECUTE  (mirrors server.ts nl2sqlHandler)
# ─────────────────────────────────────────────
def nl2sql_query(question: str, df: pd.DataFrame) -> dict:
    """
    Translate a natural-language question to SQL using Gemini,
    execute it against the uploaded DataFrame via DuckDB, and return results.
    """
    schema_text = get_schema_text(df)

    prompt = f"""You are a DuckDB/alaSQL expert data analyst.

The user uploaded a custom data file. It is loaded as an in-memory SQL table named exactly 'data' (lowercase).

Schema of the uploaded file:
{schema_text}

User Question: "{question}"

Rules:
1. Return ONLY the raw SQL query — no explanation, no markdown blocks, no backticks.
2. The table name to query is always 'data' (lowercase).
3. Use standard SQL syntax compatible with DuckDB.
4. Use the EXACT column names from the schema provided above.
5. CRITICAL: If a column name has spaces, you MUST wrap it in double quotes: "Column Name".
6. Add LIMIT 50 unless the user asks for a specific limit.
7. For text searches, use standard LIKE/ILIKE operators.
8. If performing aggregations, make sure to include GROUP BY for all non-aggregate columns.
9. Return ONLY the plain SQL string.

SQL:
"""

    try:
        raw_sql = generate_content_with_fallback(prompt)

        # Clean backticks
        raw_sql = raw_sql.strip()
        raw_sql = re.sub(r"^```sql\s*", "", raw_sql, flags=re.IGNORECASE)
        raw_sql = re.sub(r"^```\s*", "", raw_sql)
        raw_sql = re.sub(r"\s*```$", "", raw_sql)
        raw_sql = raw_sql.strip()
        if raw_sql.upper().startswith("SQL:"):
            raw_sql = raw_sql[4:].strip()

        # Execute via DuckDB
        try:
            result_df = duckdb.query(raw_sql).to_df()
            return {"success": True, "sql": raw_sql, "df": result_df, "error": None}
        except Exception as db_err:
            # Fallback: ask Gemini to rewrite
            corrective = (
                f'The SQL query you wrote: "{raw_sql}" failed with error: "{db_err}" on DuckDB.\n'
                f"Re-write it as standard ANSI SQL. The table is called 'data'. "
                f"Avoid complex operators or backticks.\n"
                f'CRITICAL: Double-quote column names that have spaces. Return ONLY the raw SQL.'
            )
            fallback_sql = generate_content_with_fallback(corrective)
            fallback_sql = fallback_sql.strip()
            fallback_sql = re.sub(r"^```sql\s*", "", fallback_sql, flags=re.IGNORECASE)
            fallback_sql = re.sub(r"^```\s*", "", fallback_sql)
            fallback_sql = re.sub(r"\s*```$", "", fallback_sql)
            fallback_sql = fallback_sql.strip()
            if fallback_sql.upper().startswith("SQL:"):
                fallback_sql = fallback_sql[4:].strip()

            try:
                result_df = duckdb.query(fallback_sql).to_df()
                return {"success": True, "sql": fallback_sql, "df": result_df, "error": None}
            except Exception as retry_err:
                return {"success": False, "sql": raw_sql, "df": None, "error": str(retry_err)}

    except Exception as e:
        return {"success": False, "sql": "", "df": None, "error": str(e)}


# ─────────────────────────────────────────────
# AUTO CHART LOGIC  (mirrors CustomChart.tsx)
# ─────────────────────────────────────────────
PLOTLY_PALETTE = ["#00D4FF", "#FF5E7E", "#7B5EA7", "#00FFCC", "#FFA07A", "#8A5CF5"]

def create_auto_chart(df: pd.DataFrame):
    """Automatically pick the best chart type and render with Plotly — matches CustomChart logic."""
    if df is None or df.empty or len(df.columns) < 2:
        return None

    t = get_current_theme()
    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    object_cols = df.select_dtypes(include="object").columns.tolist()

    date_cols = []
    cat_cols = []
    for c in object_cols:
        sample = str(df[c].dropna().iloc[0]) if not df[c].dropna().empty else ""
        if re.match(r"^\d{4}[-/]", sample) or c.lower() in ("date", "month", "year", "order_date"):
            date_cols.append(c)
        else:
            cat_cols.append(c)

    chart_type = "bar"
    if date_cols and numeric_cols:
        chart_type = "line"
    elif len(df.columns) == 2 and len(df) <= 6 and numeric_cols:
        chart_type = "pie"
    elif numeric_cols:
        chart_type = "bar"
    else:
        return None

    plotly_layout = dict(
        paper_bgcolor=t["neuBg"],
        plot_bgcolor=t["neuBg"],
        font=dict(family="Exo 2, sans-serif", color=t["textPrimary"], size=11),
        margin=dict(l=50, r=30, t=50, b=60),
        xaxis=dict(gridcolor="rgba(255,255,255,0.06)", linecolor="rgba(255,255,255,0.15)"),
        yaxis=dict(gridcolor="rgba(255,255,255,0.06)", linecolor="rgba(255,255,255,0.15)"),
        colorway=PLOTLY_PALETTE,
    )

    if chart_type == "bar":
        y_key = numeric_cols[0]
        x_key = cat_cols[0] if cat_cols else (date_cols[0] if date_cols else df.columns[df.columns != y_key][0] if len(df.columns) > 1 else df.columns[0])
        fig = px.bar(df, x=x_key, y=y_key, color_discrete_sequence=PLOTLY_PALETTE)
        fig.update_layout(title=f"📊 {y_key} by {x_key}", **plotly_layout)
        return fig

    elif chart_type == "line":
        x_key = date_cols[0]
        y_key = numeric_cols[0]
        sorted_df = df.sort_values(by=x_key)
        fig = px.line(sorted_df, x=x_key, y=y_key, markers=True, color_discrete_sequence=[t["primary"]])
        fig.update_traces(line=dict(width=3), marker=dict(size=7))
        fig.update_layout(title=f"📈 Trend: {y_key} over {x_key}", **plotly_layout)
        return fig

    elif chart_type == "pie":
        y_key = numeric_cols[0]
        x_key = cat_cols[0] if cat_cols else [c for c in df.columns if c != y_key][0]
        fig = px.pie(df, names=x_key, values=y_key, hole=0.45, color_discrete_sequence=PLOTLY_PALETTE)
        fig.update_layout(title=f"🍩 Distribution: {y_key} by {x_key}", **plotly_layout)
        return fig

    return None


# ─────────────────────────────────────────────
# HELPER — export df to CSV download
# ─────────────────────────────────────────────
def get_csv_download(df: pd.DataFrame, filename: str = "datrix_report.csv") -> bytes:
    return df.to_csv(index=False).encode("utf-8")


# ─────────────────────────────────────────────
# LOGIN PAGE  (mirrors Login.tsx)
# ─────────────────────────────────────────────
def render_login():
    inject_css()
    t = get_current_theme()

    col_left, col_center, col_right = st.columns([1, 1.6, 1])
    with col_center:
        # Logo — bigger and prominent
        logo_path = os.path.join(os.path.dirname(__file__), "public", "logo.png")
        if os.path.exists(logo_path):
            with open(logo_path, "rb") as f:
                logo_b64 = base64.b64encode(f.read()).decode()
            st.markdown(
                f'<div style="text-align:center;margin-bottom:0.1rem;margin-top:0;">'
                f'<img src="data:image/png;base64,{logo_b64}" style="max-width:80px; filter:drop-shadow(0 0 12px rgba({_hex_to_rgb(t["primary"])},0.45));" />'
                f'</div>',
                unsafe_allow_html=True,
            )

        st.markdown(
            f"""
            <div style="text-align:center; margin-bottom:0.2rem;">
                <h1 style="font-size:1.8rem;letter-spacing:6px;margin:0;
                    background: linear-gradient(90deg, {t["primary"]}, {t["secondary"]});
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                    DATRIX
                </h1>
                <div style="font-family:'Share Tech Mono',monospace;font-size:0.6rem;
                    color:{t["textSecondary"]};letter-spacing:4px;text-transform:uppercase;margin-top:0.2rem;">
                    COGNITIVE DECODER HUB
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        st.markdown("---")

        with st.form("login_form"):
            username = st.text_input(
                "CREDENTIAL ID",
                type="password",
                placeholder="Enter identity ID",
            )
            password = st.text_input(
                "PASSPHRASE",
                type="password",
                placeholder="Enter passkey",
            )
            submitted = st.form_submit_button("🚀  LAUNCH TERMINAL", use_container_width=True)

        if submitted:
            if username == "admin" and password == "aria2024":
                st.session_state.authenticated = True
                st.rerun()
            elif username or password:
                st.error("⚠️ Identity decryption mismatch error.")
            else:
                st.warning("Please provide administrative credentials.")

        st.markdown(
            f"""
            <div style="text-align:center;margin-top:1rem;font-size:0.6rem;
                font-family:'Share Tech Mono',monospace;color:{t["textSecondary"]};letter-spacing:3px;">
                <span style="display:inline-block;width:6px;height:6px;border-radius:50%;
                    background:#00FFCC;margin-right:6px;"></span>
                SECURE PROTOCOL ACTIVE
            </div>
            """,
            unsafe_allow_html=True,
        )


# ─────────────────────────────────────────────
# SIDEBAR  (mirrors Left Panel + Right Panel)
# ─────────────────────────────────────────────
def render_sidebar():
    t = get_current_theme()
    with st.sidebar:
        # Logo & branding
        logo_path = os.path.join(os.path.dirname(__file__), "public", "logo.png")
        if os.path.exists(logo_path):
            with open(logo_path, "rb") as f:
                logo_b64 = base64.b64encode(f.read()).decode()
            st.markdown(
                f'<div style="text-align:center;padding:1rem 0 0.3rem 0;">'
                f'<img src="data:image/png;base64,{logo_b64}" style="max-width:110px;'
                f'filter:drop-shadow(0 0 12px rgba({_hex_to_rgb(t["primary"])},0.5));" />'
                f'</div>',
                unsafe_allow_html=True,
            )

        st.markdown(
            f"""<div style="text-align:center;">
                <span style="font-family:'Orbitron',sans-serif;font-size:1.4rem;font-weight:800;
                    letter-spacing:6px;
                    background:linear-gradient(90deg,{t["primary"]},{t["secondary"]});
                    -webkit-background-clip:text;-webkit-text-fill-color:transparent;">
                    DATRIX
                </span>
                <div style="width:56px;height:3px;
                    background:linear-gradient(90deg,{t["primary"]},{t["secondary"]});
                    border-radius:99px;margin:0.4rem auto 0 auto;"></div>
                <div style="font-family:'Share Tech Mono',monospace;font-size:0.55rem;
                    color:{t["textSecondary"]};letter-spacing:3px;margin-top:0.4rem;text-transform:uppercase;">
                    DATA INSIGHT COREDUMP
                </div>
            </div>""",
            unsafe_allow_html=True,
        )

        st.markdown("---")

        # ── Dataset Interface ──
        st.markdown(
            f"""<div style="font-family:'Orbitron',sans-serif;font-size:0.65rem;
                color:{t["primary"]};letter-spacing:2.5px;font-weight:800;text-transform:uppercase;margin-bottom:0.8rem;">
                📊 Dataset Interface
            </div>""",
            unsafe_allow_html=True,
        )

        uploaded_file = st.file_uploader(
            "Upload CSV or Excel dataset",
            type=["csv", "xlsx", "xls"],
            label_visibility="collapsed",
        )

        if uploaded_file is not None and uploaded_file.name != st.session_state.get("uploaded_filename"):
            _process_upload(uploaded_file)

        # Show file info if loaded
        if st.session_state.uploaded_filename:
            st.markdown(
                f"""<div class="neu-card" style="display:flex;align-items:center;gap:0.7rem;">
                    <span style="font-size:1.3rem;">📄</span>
                    <div style="flex:1;min-width:0;">
                        <div style="font-size:0.75rem;font-weight:700;color:white;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                            {st.session_state.uploaded_filename}
                        </div>
                        <div style="font-family:'Share Tech Mono',monospace;font-size:0.6rem;color:{t["secondary"]};margin-top:0.2rem;">
                            {len(st.session_state.uploaded_df)} rows × {len(st.session_state.uploaded_df.columns)} columns
                        </div>
                    </div>
                </div>""",
                unsafe_allow_html=True,
            )

            # Sheet switcher
            if len(st.session_state.uploaded_sheets) > 1:
                new_sheet = st.selectbox(
                    "WORKSHEET SELECTION",
                    st.session_state.uploaded_sheets,
                    index=st.session_state.uploaded_sheets.index(st.session_state.selected_sheet)
                    if st.session_state.selected_sheet in st.session_state.uploaded_sheets else 0,
                )
                if new_sheet != st.session_state.selected_sheet:
                    st.session_state.selected_sheet = new_sheet
                    _process_upload(st.session_state._raw_upload_file, sheet=new_sheet)
                    st.rerun()

            # Data preview
            with st.expander("🔍 LIVE SOURCE PREVIEW", expanded=False):
                st.dataframe(st.session_state.uploaded_df.head(5), use_container_width=True, height=160)

            # Telemetry cards
            col1, col2 = st.columns(2)
            with col1:
                st.metric("Data Count", f"{len(st.session_state.uploaded_df):,}")
            with col2:
                st.metric("Fields", len(st.session_state.uploaded_df.columns))

            # Clear button
            if st.button("🗑️  PURGE DATASET", use_container_width=True):
                st.session_state.uploaded_df = None
                st.session_state.uploaded_filename = None
                st.session_state.uploaded_sheets = []
                st.session_state.selected_sheet = None
                st.session_state.dynamic_suggestions = []
                st.session_state.messages = []
                st.rerun()
        else:
            st.markdown(
                f"""<div class="neu-inset" style="text-align:center;padding:2rem 1rem;">
                    <div style="font-size:2rem;margin-bottom:0.5rem;">📁</div>
                    <div style="font-family:'Share Tech Mono',monospace;font-size:0.7rem;
                        font-weight:700;color:white;letter-spacing:2px;text-transform:uppercase;">
                        Repository Offline
                    </div>
                    <p style="font-size:0.65rem;color:{t["textSecondary"]};margin-top:0.5rem;line-height:1.5;">
                        Introduce a CSV or spreadsheet. Datrix will capture profiles, dimensions, and categories.
                    </p>
                </div>""",
                unsafe_allow_html=True,
            )

        st.markdown("---")

        # ── System Variables ──
        st.markdown(
            f"""<div class="neu-inset" style="font-family:'Share Tech Mono',monospace;font-size:0.65rem;">
                <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;">
                    <span style="color:{t["textSecondary"]};">GATEWAY:</span>
                    <span style="color:#00FFCC;font-weight:700;">● AUTHENTICATED</span>
                </div>
                <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;">
                    <span style="color:{t["textSecondary"]};">COGNITION:</span>
                    <span style="color:{t["primary"]};font-weight:700;">Gemini Flash API</span>
                </div>
                <div style="display:flex;justify-content:space-between;">
                    <span style="color:{t["textSecondary"]};">DISPATCH:</span>
                    <span style="color:{t["secondary"]};font-weight:700;">{st.session_state.query_count} queries</span>
                </div>
            </div>""",
            unsafe_allow_html=True,
        )

        # ── Recent Queries ──
        if st.session_state.recent_queries:
            st.markdown(
                f"""<div style="font-family:'Share Tech Mono',monospace;font-size:0.6rem;
                    color:{t["textSecondary"]};letter-spacing:1.5px;text-transform:uppercase;
                    margin-top:1rem;margin-bottom:0.5rem;">
                    Cognitive Trace History
                </div>""",
                unsafe_allow_html=True,
            )
            for i, q in enumerate(st.session_state.recent_queries[-5:]):
                display_q = q[:30] + "..." if len(q) > 30 else q
                if st.button(f"🔑 {display_q}", key=f"hist_{i}", use_container_width=True):
                    _handle_query(q)

        # ── Theme Switcher — Colored gradient circles ──
        st.markdown("---")
        st.markdown(
            f"""<div style="font-family:'Orbitron',sans-serif;font-size:0.6rem;
                color:{t["textSecondary"]};letter-spacing:2px;text-align:center;
                text-transform:uppercase;margin-bottom:0.5rem;">
                SELECT ACCENT COGNITION
            </div>""",
            unsafe_allow_html=True,
        )

        # Build theme swatch circles as HTML
        current_theme_name = st.session_state.get("theme_name", "RISO CHERRY")
        swatch_html = '<div class="theme-swatch-row">'
        for tname, tcfg in THEMES.items():
            active_cls = "active" if tname == current_theme_name else ""
            swatch_html += (
                f'<div style="text-align:center;">'
                f'<div class="theme-swatch {active_cls}" '
                f'style="background:linear-gradient(135deg, {tcfg["primary"]}, {tcfg["secondary"]});"></div>'
                f'<div class="theme-swatch-label">{tcfg["label"]}</div>'
                f'</div>'
            )
        swatch_html += '</div>'
        st.markdown(swatch_html, unsafe_allow_html=True)

        # Actual clickable buttons (minimal, below the circles)
        theme_cols = st.columns(4)
        for idx, (theme_name, theme_cfg) in enumerate(THEMES.items()):
            with theme_cols[idx]:
                if st.button("●", key=f"theme_{theme_name}", use_container_width=True, help=f"Switch to {theme_cfg['label']}"):
                    st.session_state.theme_name = theme_name
                    st.rerun()

        # ── Disconnect ──
        st.markdown("---")
        if st.button("✕  DISCONNECT", use_container_width=True):
            st.session_state.authenticated = False
            st.session_state.messages = []
            st.session_state.query_count = 0
            st.session_state.recent_queries = []
            st.rerun()


def _hex_to_rgb(hex_color: str) -> str:
    """Convert #RRGGBB to R,G,B string for CSS rgba()."""
    h = hex_color.lstrip("#")
    return f"{int(h[0:2], 16)},{int(h[2:4], 16)},{int(h[4:6], 16)}"


# ─────────────────────────────────────────────
# FILE UPLOAD HANDLER  (mirrors fileLoader.ts)
# ─────────────────────────────────────────────
def _process_upload(uploaded_file, sheet: str | None = None):
    """Parse uploaded CSV/XLSX file into a pandas DataFrame and register it with DuckDB."""
    try:
        name = uploaded_file.name
        ext = name.rsplit(".", 1)[-1].lower()

        if ext == "csv":
            try:
                df = pd.read_csv(uploaded_file, encoding="utf-8")
            except UnicodeDecodeError:
                uploaded_file.seek(0)
                df = pd.read_csv(uploaded_file, encoding="latin-1")
            sheets = []
            sel_sheet = None
        elif ext in ("xlsx", "xls"):
            xls = pd.ExcelFile(uploaded_file)
            sheets = xls.sheet_names
            target_sheet = sheet if sheet and sheet in sheets else sheets[0]
            df = pd.read_excel(xls, sheet_name=target_sheet)
            sel_sheet = target_sheet
        else:
            st.error(f"Unsupported file type: .{ext}")
            return

        if df.empty:
            st.error("No data found in the uploaded file.")
            return

        # Register as DuckDB virtual table
        duckdb.register("data", df)

        st.session_state.uploaded_df = df
        st.session_state.uploaded_filename = name
        st.session_state.uploaded_sheets = sheets
        st.session_state.selected_sheet = sel_sheet
        st.session_state.messages = []
        st.session_state.dynamic_suggestions = get_sample_questions(df)
        st.session_state._raw_upload_file = uploaded_file

    except Exception as e:
        st.error(f"Ingress error: {e}")


# ─────────────────────────────────────────────
# QUERY HANDLER
# ─────────────────────────────────────────────
def _handle_query(question: str):
    """Process a user question: add to chat, call NL2SQL, display results."""
    df = st.session_state.uploaded_df
    if df is None:
        st.warning("Please upload a dataset first.")
        return

    # Ensure DuckDB has latest table registered
    duckdb.register("data", df)

    timestamp = datetime.datetime.now().strftime("%H:%M:%S")

    # Add user message
    st.session_state.messages.append({
        "role": "user",
        "content": question,
        "timestamp": timestamp,
    })

    st.session_state.query_count += 1
    if question not in st.session_state.recent_queries:
        st.session_state.recent_queries = st.session_state.recent_queries[-4:] + [question]

    # NL2SQL
    result = nl2sql_query(question, df)
    bot_ts = datetime.datetime.now().strftime("%H:%M:%S")

    if result["success"]:
        st.session_state.messages.append({
            "role": "assistant",
            "content": "Decoded structural inquiries successfully. Generated matching reports and graphics.",
            "timestamp": bot_ts,
            "sql": result["sql"],
            "df": result["df"],
            "error": None,
        })
    else:
        st.session_state.messages.append({
            "role": "assistant",
            "content": "Execution failed. Understood criteria but database core returned errors.",
            "timestamp": bot_ts,
            "sql": result.get("sql", ""),
            "df": None,
            "error": result.get("error"),
        })


# ─────────────────────────────────────────────
# MAIN CHAT UI  (mirrors the center panel)
# ─────────────────────────────────────────────
def render_main():
    t = get_current_theme()

    # Header
    st.markdown(
        f"""
        <div style="margin-bottom:0.3rem;">
            <h1 style="font-size:2rem;letter-spacing:1.5px;margin:0;">Datrix Decoders</h1>
            <div style="font-family:'Share Tech Mono',monospace;font-size:0.6rem;
                color:{t["textSecondary"]};letter-spacing:2.5px;text-transform:uppercase;margin-top:0.2rem;">
                Natural Language SQL Compiler • Dynamic charts results
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # Status bar
    filename = st.session_state.uploaded_filename
    status_text = f"Analyzing '{filename}'" if filename else "Waiting for custom dataset"
    st.markdown(
        f"""<div class="neu-card" style="display:flex;align-items:center;gap:0.6rem;padding:0.6rem 1rem;">
            <span style="width:8px;height:8px;border-radius:50%;background:#00FFCC;display:inline-block;"></span>
            <span style="font-family:'Share Tech Mono',monospace;font-size:0.6rem;color:#00FFCC;letter-spacing:1px;">
                Active mode: {status_text}
            </span>
        </div>""",
        unsafe_allow_html=True,
    )

    # ── Display chat messages ──
    if not filename and not st.session_state.messages:
        # Empty state — no file
        st.markdown(
            f"""<div style="text-align:center;padding:4rem 2rem;">
                <div style="font-size:2.5rem;margin-bottom:1rem;">📤</div>
                <div style="font-family:'Share Tech Mono',monospace;font-size:0.8rem;
                    font-weight:800;color:white;letter-spacing:1.5px;text-transform:uppercase;">
                    DATA FILES MISSING
                </div>
                <p style="font-size:0.72rem;color:{t["textSecondary"]};margin-top:0.6rem;line-height:1.6;">
                    Please import your CSV or XLSX dataset first using the sidebar to activate automated speech translation.
                </p>
            </div>""",
            unsafe_allow_html=True,
        )
    elif not st.session_state.messages:
        # File loaded, no messages yet
        st.markdown(
            f"""<div style="text-align:center;padding:4rem 2rem;">
                <div style="font-size:2.5rem;margin-bottom:1rem;">🧠</div>
                <div style="font-family:'Share Tech Mono',monospace;font-size:0.7rem;
                    font-weight:700;color:#00FFCC;letter-spacing:2px;text-transform:uppercase;">
                    COGNITIVE TUNNEL STABILIZED
                </div>
                <p style="font-size:0.72rem;color:{t["textSecondary"]};margin-top:0.6rem;line-height:1.6;">
                    Ready to decapsulate. Click recommendations or compose queries below.
                </p>
            </div>""",
            unsafe_allow_html=True,
        )

    # Render conversation
    for idx, msg in enumerate(st.session_state.messages):
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])
            st.caption(f"{msg['timestamp']} {'(DATRIX)' if msg['role'] == 'assistant' else ''}")

            # SQL block
            if msg.get("sql"):
                with st.expander("🔍 DATRIX SYNTHESIZED SQL", expanded=True):
                    st.code(msg["sql"], language="sql")

            # Error
            if msg.get("error"):
                st.error(f"⚠️ {msg['error']}")

            # Data table
            result_df = msg.get("df")
            if result_df is not None and isinstance(result_df, pd.DataFrame) and not result_df.empty:
                st.markdown(
                    f"""<div style="font-family:'Share Tech Mono',monospace;font-size:0.6rem;
                        color:{t["textSecondary"]};letter-spacing:1px;margin-bottom:0.3rem;">
                        Report block results — Row count: {len(result_df)}
                    </div>""",
                    unsafe_allow_html=True,
                )
                st.dataframe(result_df, use_container_width=True, height=min(len(result_df) * 38 + 50, 300))

                # Download button
                csv_bytes = get_csv_download(result_df, f"datrix_block_{idx}.csv")
                st.download_button(
                    label="⬇ Download Dataset Report (.CSV)",
                    data=csv_bytes,
                    file_name=f"datrix_analytics_block_{idx}.csv",
                    mime="text/csv",
                    key=f"dl_{idx}",
                )

                # Auto-chart
                fig = create_auto_chart(result_df)
                if fig is not None:
                    st.plotly_chart(fig, use_container_width=True, key=f"chart_{idx}")

    # ── Suggestion pills ──
    if filename and st.session_state.dynamic_suggestions:
        st.markdown(
            f"""<div style="font-family:'Share Tech Mono',monospace;font-size:0.6rem;
                color:{t["textSecondary"]};letter-spacing:1.5px;text-transform:uppercase;
                margin-top:1rem;margin-bottom:0.5rem;">
                💡 RECOMMENDATION DISCOVERY
            </div>""",
            unsafe_allow_html=True,
        )
        pill_cols = st.columns(min(len(st.session_state.dynamic_suggestions), 5))
        for i, suggestion in enumerate(st.session_state.dynamic_suggestions):
            with pill_cols[i % len(pill_cols)]:
                if st.button(suggestion, key=f"sug_{i}", use_container_width=True):
                    _handle_query(suggestion)
                    st.rerun()

    # ── Chat Input ──
    if filename:
        user_input = st.chat_input("Perform conversational query analytics...")
        if user_input:
            _handle_query(user_input)
            st.rerun()
    else:
        st.chat_input("Install dataset first...", disabled=True)


# ─────────────────────────────────────────────
# APP ENTRY POINT
# ─────────────────────────────────────────────
def main():
    if not st.session_state.authenticated:
        render_login()
    else:
        inject_css()
        render_sidebar()
        render_main()


if __name__ == "__main__":
    main()
