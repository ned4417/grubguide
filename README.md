# Grub Guide

**Stop overthinking dinner. We'll pick.**

Grub Guide is a restaurant discovery app that randomly selects a nearby restaurant based on your location and preferred search radius — with an AI-generated vibe description powered by Claude.

🔗 **Live demo:** [eats-picker.vercel.app](https://eats-picker.vercel.app)

---

## Features

- 🎲 **Random restaurant picker** — enter any address or use your current location
- 📍 **Adjustable radius** — slide from 5 to 30 miles
- 🤖 **AI vibe descriptions** — Claude generates a 2-sentence feel for each pick
- 🕐 **Open now badge** — see at a glance if the restaurant is currently open
- 📸 **Cinematic photo carousel** — Ken Burns effect, Stories-style progress bars, swipe-to-navigate
- 🗺️ **One-tap Maps** — deep link opens the restaurant directly in Google Maps
- 📱 **PWA-ready** — installable on iOS and Android via "Add to Home Screen"
- ↩️ **Re-roll** — not feeling it? Hit "Try another" for a new pick

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + DaisyUI (dark theme) |
| Address autocomplete | Google Maps JavaScript API (AutocompleteSuggestion) |
| Restaurant search | Google Places API (New) — Text Search |
| Reverse geocoding | Google Geocoding API |
| AI descriptions | Anthropic Claude API (claude-haiku-4-5) |
| Deployment | Vercel (serverless functions for API routes) |

---

## Project structure

```
grubguide/
├── api/                      # Vercel serverless functions
│   ├── getRestaurants.js     # Places API search + photo URLs
│   ├── getVibeDescription.js # Claude AI vibe generation
│   └── reverseGeocode.js     # Lat/lng → address
├── public/
│   ├── manifest.json         # PWA manifest
│   └── *.jpg                 # Default food photos (fallback)
└── src/
    ├── components/
    │   ├── Carousel.tsx       # Ken Burns carousel with touch + keyboard nav
    │   └── GoogleAddressInput.tsx
    └── App.tsx                # Main layout + state
```

---

## Local development

### Prerequisites
- Node.js 18+
- Google Cloud project with **Maps JavaScript API**, **Places API (New)**, and **Geocoding API** enabled
- Anthropic API key

### Setup

```bash
git clone https://github.com/ned4417/grubguide.git
cd grubguide
npm install
```

Create a `.env.local` file:

```env
VITE_GOOGLE_API_KEY=your_browser_key_here
GOOGLE_SERVER_API_KEY=your_server_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
```

> **Two API keys:** The browser key (`VITE_GOOGLE_API_KEY`) should be HTTP-referrer restricted. The server key (`GOOGLE_SERVER_API_KEY`) is used by Vercel functions and should be IP-restricted or unrestricted.

```bash
npm run dev          # Vite dev server (frontend only)
vercel dev           # Full stack including API routes
```

---

## Deployment

Deployed on Vercel. Set the following environment variables in your project settings:

| Variable | Description |
|---|---|
| `VITE_GOOGLE_API_KEY` | Google Maps key (browser, HTTP-referrer restricted) |
| `GOOGLE_SERVER_API_KEY` | Google Maps key (server, for API routes) |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude vibe descriptions |
