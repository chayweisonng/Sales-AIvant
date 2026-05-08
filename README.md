# Sales AIVANT 

Sales AIVANT is an enterprise-grade AI Sales Assistant management portal and real-time conversation engine. It empowers businesses to deploy intelligent AI agents that handle lead interactions, query a custom knowledge base (RAG), and manage dynamic sales-specific configurations.

The system features real-time agent setting controls, custom RAG document parsers, lead analytics, and integrated Telegram bot capabilities with high-reliability polling and automatic webhook recovery on start.

---

## Repo Structure

Sales AIVANT is built as a monorepo containing:

```
├── backend/                # Node.js/Express.js Server
│   ├── src/
│   │   ├── app.js          # App routes, middleware & handlers
│   │   ├── index.js        # Server start & lifecycle events
│   │   ├── services/       # AI agents, document ingestion, Telegram integration
│   │   └── lib/            # Shared logic & Supabase helpers
│   └── tests/              # Test suites
│
├── frontend/               # Vite + React (Ant Design v6) Web App
│   ├── src/
│   │   ├── pages/          # Conversations, Leads, Documents, Settings, Overview
│   │   ├── components/     # Custom UI elements (including SalesAivantLogo)
│   │   ├── context/        # Global Auth and State Providers
│   │   └── lib/            # Supabase Realtime & API Clients
│   └── index.html          # Web App Entrypoint
│
└── supabase/               # Migrations, Edge Functions, Schema configuration
```

---

## Tech Stack

### Frontend
* **Core:** React 19, React Router v7, Vite
* **UI/Styles:** Ant Design v6 (modernized tokens, no deprecated properties), Vanilla CSS (responsive grid & flex patterns)
* **Real-time:** Supabase Realtime client integrations for instant chat updates

### Backend
* **Core:** Node.js, Express.js (CommonJS)
* **Integrations:**
  * **Google GenAI:** AI response pipelines
  * **Telegraf:** Robust Telegram Bot SDK with active polling & webhook capabilities
  * **Supabase Client:** Database operations and authentication
  * **Multer & PDF-Parse:** Secure multipart upload and text extraction from documents

---

## Local Development Setup

To run Sales AIVANT locally, follow these simple setup instructions.

### 1. Prerequisites
Ensure you have [Node.js (v18+)](https://nodejs.org/) installed.

### 2. Configure Environment Variables

#### Backend Configuration
Create a `backend/.env` file:
```ini
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE=your-supabase-service-role-key
GEMINI_API_KEY=your-gemini-api-key
```

#### Frontend Configuration
Create a `frontend/.env` file:
```ini
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_URL=http://localhost:3000
```

### 3. Install & Start Services

#### Run Backend:
```bash
cd backend
npm install
npm run dev
```

#### Run Frontend:
```bash
cd frontend
npm install
npm run dev
```
