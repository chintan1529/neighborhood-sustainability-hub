<div align="center">

# 🌿 Neighborhood Sustainability Hub

**An AI-powered smart city platform for waste intelligence, civic reporting, and community-driven sustainability.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## 📖 Overview

The **Neighborhood Sustainability Hub (NHS)** is a full-stack smart city application that empowers residents, waste collectors, and city administrators to collaboratively manage and improve waste handling using AI, real-time analytics, and geospatial intelligence.

> Built for scale. Designed for community impact.

---

## ✨ Features

### 👤 Resident Portal
- 📸 **AI Waste Reporter** — Upload a photo; an AI model auto-classifies the waste category
- 🗺️ **Interactive Map** — Pin waste locations with Leaflet geolocation
- 🏆 **Gamification** — Earn points, badges, and streaks for reports
- 📊 **Impact Dashboard** — Track CO₂ saved, waste diverted, and monthly activity
- 💬 **Messaging** — Real-time conversation system with collectors and admins
- 🛒 **Marketplace** — List and trade recyclable materials

### 🚛 Collector Portal
- 🔄 **AI Route Optimizer** — TSP-based optimal pickup route generation
- 📍 **Live Job Queue** — Priority-ranked pickup assignments
- 🗺️ **Collector Map** — Real-time cluster map of pending reports
- ⭐ **Ratings System** — Community feedback loop for collectors

### 🛡️ Admin Dashboard
- 📈 **Analytics Charts** — KPI cards, leaderboards, SLA compliance tracking
- 🔥 **Risk Intelligence Map** — Heatmap of high-risk waste zones (real-time via Supabase Realtime)
- 🤖 **Predictive Engine** — Geohash clustering + adaptive weight optimizer for hotspot prediction
- 🏅 **Badge & Challenge Management**
- 🏪 **Marketplace Oversight**
- 📋 **Report Management** — Full CRUD with AI confirmation pipeline

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript 5 |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (Row Level Security) |
| **Storage** | Supabase Storage |
| **Realtime** | Supabase Realtime subscriptions |
| **Maps** | Leaflet + react-leaflet |
| **AI / ML** | Hugging Face Inference API |
| **Charts** | Recharts |
| **Styling** | TailwindCSS + shadcn/ui |
| **Validation** | Zod + React Hook Form |
| **Animations** | Framer Motion |

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- A [Supabase](https://supabase.com) project
- A [Hugging Face](https://huggingface.co) API key

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/neighborhood-sustainability-hub.git
cd neighborhood-sustainability-hub
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your Supabase and Hugging Face credentials.

### 4. Run database migrations

Apply the SQL migrations from `supabase/migrations/` in your Supabase dashboard or via the Supabase CLI:

```bash
supabase db push
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
neighborhood-sustainability-hub/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── admin/              # Admin dashboard routes
│   │   ├── collector/          # Collector portal routes
│   │   ├── resident/           # Resident portal routes
│   │   ├── api/                # API route handlers
│   │   └── auth/               # Authentication pages
│   ├── components/             # Reusable React components
│   │   ├── admin/              # Admin-specific components
│   │   ├── dashboard/          # Dashboard widgets
│   │   ├── layout/             # Sidebar, navbar, notifications
│   │   ├── marketplace/        # Marketplace components
│   │   ├── messages/           # Chat interface
│   │   ├── report/             # Report wizard
│   │   └── ui/                 # shadcn/ui base components
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Core business logic
│   │   ├── adaptive-weight-optimizer.ts  # ML weight optimizer
│   │   ├── predictive-engine.ts          # Hotspot prediction
│   │   ├── risk-scoring-engine.ts        # Risk zone calculator
│   │   ├── supabase/                     # Client/server helpers
│   │   └── constants.ts                  # App-wide constants
│   └── types/                  # TypeScript type definitions
│       └── database.ts         # Supabase schema types
├── supabase/
│   └── migrations/             # SQL migration files
├── scripts/                    # Utility/data scripts
├── public/                     # Static assets
├── .env.example                # Environment variable template
├── .gitignore
└── README.md
```

---

## 🌿 Branching Strategy

```
main          ← stable, production-ready code
  └── dev     ← integration branch (all features merge here first)
        └── feature/*   ← individual feature branches
```

| Branch | Purpose |
|--------|---------|
| `main` | Production-stable. Only merge from `dev` after testing. |
| `dev` | Active development integration branch. |
| `feature/*` | Short-lived branches for individual features. |

**Commit convention:**
```
feat:     New feature
fix:      Bug fix
refactor: Code restructure without behavior change
chore:    Dependency updates, configs
docs:     Documentation changes
perf:     Performance improvements
```

---

## 🗺️ Roadmap

- [x] AI waste classification (Hugging Face)
- [x] Geohash-based predictive engine
- [x] Adaptive weight optimizer
- [x] Real-time risk zone map
- [x] Route optimization (TSP)
- [x] Gamification (points, badges, streaks)
- [x] Marketplace for recyclables
- [x] Messaging system
- [ ] Push notifications (PWA)
- [ ] Mobile app (React Native)
- [ ] Multi-city / multi-neighborhood support
- [ ] Carbon credit tracking
- [ ] Government API integrations

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">
  Built with ❤️ for smarter, cleaner communities.
</div>
