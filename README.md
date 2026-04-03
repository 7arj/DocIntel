# DocIntel: Enterprise Document Intelligence Platform

DocIntel is a modern, full-stack Document Intelligence Platform that leverages AI to instantly extract structured intelligence, perform risk assessments, and highlight key entities from uploaded documents (PDF, TXT, MD). 

Built with a sleek, enterprise-grade Next.js frontend and a highly concurrent Go backend, it uses **Server-Sent Events (SSE)** to stream real-time insights from the Gemini 2.5 Flash API directly to the user's dashboard.

##  Key Features

- **Real-Time Streaming Analysis:** Watch as the AI streams structural breakdowns, executive summaries, and key points to the UI in real-time.
- **Flawless Entity Extraction:** Identifies and extracts people, organizations, locations, dates, and events, allowing click-to-highlight navigation within the original document viewer.
- **Intelligent Risk Assessment:** Automatically flags sensitive, alarming, or legally significant content, categorized by severity (High, Medium, Low).
- **Enterprise Design System:** Features a highly professional, responsive "Dark Emerald" B2B SaaS UI built with Tailwind CSS and Framer Motion.
- **Robust PDF Parsing:** Utilizes pure-Go heuristic extraction to perfectly preserve word boundaries and spacing from complex PDF layouts.

##  Tech Stack

**Frontend:**
- [Next.js 14](https://nextjs.org/) (App Router, React, TypeScript)
- [Tailwind CSS](https://tailwindcss.com/) (Styling)
- [Framer Motion](https://www.framer.com/motion/) (Micro-animations & transitions)

**Backend:**
- [Go (Golang)](https://golang.org/) (High-performance API server)
- [Gemini 2.5 Flash API](https://deepmind.google/technologies/gemini/) (LLM Intelligence Engine)
- [Supabase](https://supabase.com/) (PostgreSQL persistence & telemetry)
- Server-Sent Events (SSE) architecture for live data streaming.



