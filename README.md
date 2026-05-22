# Property Tax Appeal Agent

AI-powered property tax appeal assistant. Upload your assessment notice and appeal form, and the agent auto-detects your county, researches the local appeal process, fills out Form 130, and generates a personalized step-by-step roadmap with real statutes, deadlines, and office contacts.

---

## How it works

```
User uploads documents
        │
        ▼
  useAnalysis.run()
  ├─ Encodes files to base64 (utils/file.js)
  ├─ Ticks a fake progress bar while waiting
  ├─ Sends documents + system prompt to Claude (api/claude.js)
  │    └─ Proxied through api/chat.js (keeps API key server-side)
  └─ Parses structured tags from the reply (utils/parser.js)
        │
        ▼
  If reply contains HTML > 300 chars → FormPage (filled form + roadmap)
  Otherwise                          → ChatPage (agent asks follow-up Qs)
```

**Two modes depending on what you upload:**

| Mode | Trigger | What Claude does |
|---|---|---|
| **With process doc** | Supporting doc uploaded | Extracts evidence from your doc; fills form from it |
| **Without process doc** | Only Form 130 + Form 11 | Detects state/county; researches local appeal rules from its training data |

---

## Project structure

```
tax-appeal-agent/
│
├── api/
│   └── chat.js                  ← Vercel serverless proxy (holds ANTHROPIC_API_KEY)
│
├── src/
│   ├── main.jsx                 ← React entry point
│   ├── App.jsx                  ← Thin orchestrator: wires hooks + routes phases
│   │
│   ├── api/
│   │   └── claude.js            ← callClaude() (SSE streaming) + pingClaude() (test ping)
│   │
│   ├── constants/
│   │   ├── steps.js             ← Upload step definitions (appeal / notice / supporting)
│   │   └── prompts.js           ← SYSTEM_DOCS and SYSTEM_NO_DOCS system prompts
│   │
│   ├── utils/
│   │   ├── file.js              ← readB64(file) — FileReader → base64 Promise
│   │   └── parser.js            ← parseReply() — strips FORM_DATA/NEXT_ACTIONS/PROCESS_INFO tags
│   │
│   ├── hooks/
│   │   ├── useAppState.js       ← All shared state + applyParsed() + reset()
│   │   ├── useAnalysis.js       ← Document analysis: progress ticker + Claude call
│   │   ├── useChat.js           ← Chat: send message, stream response, parse reply
│   │   └── useConnectionTest.js ← API connectivity test (ping Claude, show pass/fail)
│   │
│   ├── components/
│   │   ├── DropZone.jsx         ← Drag-and-drop file input with locked/unlocked state
│   │   ├── Bubble.jsx           ← Chat message bubble (user vs assistant)
│   │   ├── ProgressBar.jsx      ← Animated gradient progress bar
│   │   ├── JurisdictionCard.jsx ← County research summary card
│   │   └── NextActions.jsx      ← Appeal roadmap steps with status badges
│   │
│   └── pages/
│       ├── UploadPage.jsx       ← Step 1-3 upload UI + connection test + submit
│       ├── AnalyzingPage.jsx    ← Progress screen shown during Claude analysis
│       ├── ChatPage.jsx         ← Follow-up Q&A chat interface
│       └── FormPage.jsx         ← Filled Form 130 + summary bar + jurisdiction sidebar
│
├── index.html
├── vite.config.js
├── vercel.json                  ← Routes /api/* to serverless functions
├── package.json
├── .env.example                 ← Copy to .env.local and add your API key
└── .gitignore
```

---

## Architecture layers

```
pages/          Pure UI — receive data and callbacks as props, no business logic
    │
hooks/          Business logic — state, API calls, parsing; no JSX
    │
api/ + utils/   Pure functions — fetch, encode, parse; no React
    │
constants/      Static data — step definitions, system prompts
```

`App.jsx` is the only file that touches both hooks and pages. It wires them together and owns the phase routing (`upload → analyzing → chat | form`).

---

## App state & phase transitions

```
phase: "upload"
  │   User uploads Form 130 + Assessment Notice → clicks Submit
  ▼
phase: "analyzing"
  │   useAnalysis.run() encodes docs, calls Claude, parses reply
  │   reply.html > 300 chars ──────────────────────────────────────────┐
  │   reply.html ≤ 300 chars                                           │
  ▼                                                                    ▼
phase: "chat"                                              phase: "form"
  │   Agent asks follow-up questions                        Filled Form 130 shown
  │   User answers until Claude returns full HTML           alongside jurisdiction
  │   → transitions to "form"                              sidebar and roadmap
  ▼
phase: "form"
```

---

## Claude response format

Claude returns a single text reply containing structured tags + HTML:

```
<FORM_DATA>{ ...json fields }</FORM_DATA>
<PROCESS_INFO>{ county, state, filing_office, statutes, ... }</PROCESS_INFO>
<NEXT_ACTIONS>[ { step, status, title, description, deadline, ... } ]</NEXT_ACTIONS>

<html>...3-page Form 130 with inline styles...</html>
```

`parseReply()` in `src/utils/parser.js` extracts each block:
- `FORM_DATA` → `formData` (summary bar values: current/requested totals, deadline)
- `PROCESS_INFO` → `processInfo` (jurisdiction card: statutes, board names, filing office)
- `NEXT_ACTIONS` → `nextActions` (roadmap steps with status done/current/upcoming)
- Everything else after stripping tags → `html` (the actual form to render)

---

## Deploy to Vercel

### Prerequisites
- [Node.js 18+](https://nodejs.org)
- [Git](https://git-scm.com)
- A free [GitHub](https://github.com) account
- A free [Vercel](https://vercel.com) account (sign up with GitHub)
- An [Anthropic API key](https://console.anthropic.com)

### Step 1 — Run locally

```bash
npm install

# Copy env template and add your key
cp .env.example .env.local
# Edit .env.local: ANTHROPIC_API_KEY=sk-ant-your-key-here

npm run dev
# Open http://localhost:5173
```

> **Note:** The dev server does NOT run the `api/chat.js` serverless function.
> To test the full stack locally (including the API proxy), use the Vercel CLI:
> ```bash
> npm install -g vercel
> vercel dev
> ```

### Step 2 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"

# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/tax-appeal-agent.git
git branch -M main
git push -u origin main
```

### Step 3 — Deploy

**Option A — Vercel Dashboard**

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo
2. Under **Environment Variables**, add:
   - Key: `ANTHROPIC_API_KEY` / Value: `sk-ant-your-key-here`
3. Click **Deploy**

**Option B — Vercel CLI**

```bash
npm install -g vercel
vercel
vercel env add ANTHROPIC_API_KEY   # paste your key when prompted
vercel --prod
```

### Step 4 — Every future update

```bash
git add .
git commit -m "your message"
git push
# Vercel auto-deploys on every push to main
```

---

## Security

- `ANTHROPIC_API_KEY` lives **only on Vercel's servers** inside `api/chat.js`
- The browser never sees the key — it POSTs to `/api/chat` which proxies to Anthropic
- Never commit `.env.local` (it's already in `.gitignore`)

---

## Troubleshooting

**Chat opens but shows no response**
Use the **Test API Connection** button on the upload page. It sends a minimal non-streaming ping to Claude and shows the exact error (bad API key, invalid model, quota exceeded, etc.).

**`vite` not found**
Run `npm install` first, then `npx vite build` or `npx vite`.

**Form renders blank**
Claude's reply did not include HTML longer than 300 chars. The app falls back to chat mode so you can answer follow-up questions until the agent has enough data to generate the form.

---

## Cost

- **Vercel**: Free (Hobby plan — unlimited deploys, 100 GB bandwidth/month)
- **Anthropic API**: ~$0.01–$0.05 per full analysis (Claude Sonnet 4.6)
- **Connection test**: ~$0.0001 per click (16 tokens max)
