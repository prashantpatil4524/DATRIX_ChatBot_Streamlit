<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# DATRIX — Cognitive Decoder Hub

This contains everything you need to run the DATRIX Analytics Chatbot locally using Streamlit.

## Run Locally

**Prerequisites:** Python 3.10+

1. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set your Gemini API key in `.env`:
   ```bash
   GEMINI_API_KEY="YOUR_API_KEY"
   ```
4. Run the app:
   ```bash
   streamlit run app.py
   ```