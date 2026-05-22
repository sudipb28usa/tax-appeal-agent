# ⚖️ Property Tax Appeal Agent

AI-powered property tax appeal form generator. Upload your assessment notice, get a filled Form 130 with a personalized county-specific appeal roadmap.

---

## 🚀 Deploy to Vercel (Free) — Step by Step

### Prerequisites
- [Node.js 18+](https://nodejs.org) installed
- [Git](https://git-scm.com) installed
- A free [GitHub](https://github.com) account
- A free [Vercel](https://vercel.com) account (sign up with GitHub)
- An [Anthropic API key](https://console.anthropic.com)

---

### Step 1 — Set up locally

```bash
# 1. Extract this zip into a folder, then install dependencies
npm install

# 2. Copy the env template
cp .env.example .env.local

# 3. Edit .env.local and add your Anthropic API key
#    ANTHROPIC_API_KEY=sk-ant-your-key-here

# 4. Run locally to test
npm run dev
# Open http://localhost:5173
```

---

### Step 2 — Push to GitHub

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/tax-appeal-agent.git
git branch -M main
git push -u origin main
```

---

### Step 3 — Deploy to Vercel

**Option A — Vercel Dashboard (easiest)**

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Click **Environment Variables** and add:
   - Key: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-your-key-here`
4. Click **Deploy**

Done! Your app is live at `https://your-project.vercel.app`

**Option B — Vercel CLI**

```bash
npm install -g vercel
vercel

# Follow prompts, then add your env var:
vercel env add ANTHROPIC_API_KEY
# Paste your key when prompted

vercel --prod
```

---

### Step 4 — Every future update

```bash
git add .
git commit -m "Update"
git push
# Vercel auto-deploys on every push to main
```

---

## 🔐 Security

- Your `ANTHROPIC_API_KEY` lives **only on Vercel's servers** in `api/chat.js`
- The browser never sees the key — it calls `/api/chat` which proxies to Anthropic
- Never commit `.env.local` (it's in `.gitignore`)

---

## 📁 Project Structure

```
tax-appeal-agent/
├── api/
│   └── chat.js          ← Vercel serverless function (holds API key)
├── public/
│   └── favicon.svg
├── src/
│   ├── main.jsx         ← React entry point
│   └── App.jsx          ← Full agent application
├── index.html
├── vite.config.js
├── vercel.json          ← Vercel routing config
├── package.json
├── .env.example         ← Template — copy to .env.local
└── .gitignore
```

---

## ✨ Features

- **With process docs**: extracts procedural steps from your uploaded document
- **Without process docs**: auto-detects your state/county from the assessment notice and researches the full local appeal process
- Fills all 3 pages of Form 130 with persuasive language
- Shows personalized appeal roadmap with real statutes, deadlines, office contacts
- Print-ready output

---

## 💰 Cost

- **Vercel**: Free (Hobby plan — unlimited deployments, 100GB bandwidth/month)
- **Anthropic API**: ~$0.01–0.05 per appeal analysis (Claude Sonnet 4)
