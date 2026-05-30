# Syllabus Tracker

An end-to-end full-stack AI application that extracts unstructured deadlines from academic syllabus PDFs and seamlessly syncs them to Google Calendar with color-coded priorities and AI-generated study plans.

## Features
* **AI PDF Extraction:** Utilizes `PyPDF` and the OpenAI API to parse chaotic, unstructured syllabus text into clean, predictable JSON data.
* **Human-in-the-Loop Review:** Provides a fully editable Next.js data grid, allowing users to QA the AI's extraction, modify dates, and adjust priorities before pushing to production.
* **Native Google Calendar Sync:** Implements a secure OAuth2 flow to programmatically map assignments to Google Calendar events.
* **Smart Color-Coding:** AI intelligently assigns High, Medium, or Low priorities to assignments, which are visually translated into specific Google Calendar event colors.
* **AI Study Coach:** Generates dynamic, spaced-repetition study strategies for high-priority exams using generative AI.

## Tech Stack
* **Frontend:** Next.js, React, Tailwind CSS
* **Backend:** Python, Flask, Flask-CORS
* **AI & Parsing:** OpenAI API (`gpt-4o-mini`), PyPDF
* **Integrations:** Google Calendar API, Google OAuth2

## Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/syllabus-sync.git
cd syllabus-sync
```

### 2. Backend Environment (Flask)
Navigate to the backend directory, set up your virtual environment, and install dependencies:
\`\`\`bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
\`\`\`

You will need to add two security files to the `backend/` directory:
1. An `.env` file containing your `OPENAI_API_KEY=your_key_here`.
2. A `credentials.json` file downloaded from your Google Cloud Console (with Calendar API enabled).

Start the server:
\`\`\`bash
python app.py
\`\`\`

### 3. Frontend Environment (Next.js)
Open a new terminal window, navigate to the frontend directory, and start the development server:
\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`
Visit `http://localhost:3000` to interact with the application.

## Architecture & Data Flow
1. **Ingestion:** User authenticates via Google OAuth, then drags and drops a PDF syllabus.
2. **Parsing:** Flask receives the multipart/form-data, extracts raw text, and prompts the LLM to return a structured JSON array of assignments.
3. **Review:** Next.js renders the JSON into a custom UI for user verification and priority assignment.
4. **Synchronization:** Upon approval, Flask uses the stored Google OAuth session credentials to batch-insert the deadlines into the user's primary calendar.
