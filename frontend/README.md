# StackSave AI — Frontend Client

The modern frontend client for **StackSave AI**, built with **React 19**, **TypeScript**, **Vite 8**, and **Tailwind CSS v4**.

> For the comprehensive system architecture, engine documentation, and screenshots, refer to the [Root Project README](../README.md).

---

## Features

- **Marketing & Spend Simulator**: Interactive savings simulator with live optimization breakdowns.
- **Build My Stack Wizard**: 4-step progressive specification for operating domain, budget, capability profiles, and strategic mandates.
- **Alternative Architecture Carousel**: Horizontal scroll carousel with unified pointer drag-to-scroll support.
- **Portal Metric Tooltips**: High-end fixed tooltips explaining **Domain Fit** vs. **Requirement Match** without clipping.
- **Audit Tool Matrix**: Categorized tool selection matrix with seat calculators and instant audit triggers.
- **AI Offers Directory**: 6-category verified promotion directory with provider filters and live status chips.
- **AI Spend Assistant**: Interactive floating advisor powered by streaming chat APIs.
- **Client-Side PDF Generation**: Exports executive-ready procurement reports via `jsPDF`.

---

## Tech Stack

- **Framework**: React 19.2 + TypeScript 5.4+
- **Bundler**: Vite 8.1
- **Styling**: Tailwind CSS v4 + `@tailwindcss/vite`
- **Animations**: Framer Motion 12.38
- **Data Visualization**: Recharts 3.8
- **Routing**: React Router DOM v7
- **HTTP Client**: Axios
- **Document Export**: jsPDF

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Ensure `VITE_API_BASE_URL` points to your active backend:
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_API_URL=http://localhost:5000/api
```

### 3. Start Development Server
```bash
npm run dev
# Running at http://localhost:5173
```

### 4. Build for Production
```bash
npm run typecheck
npm run build
```
The optimized client bundle will be generated in `dist/`.
