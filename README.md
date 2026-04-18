<div align="center">

# Antigravity Video Extractor

**High-performance YouTube downloader with a sleek, modern UI.**

Paste a URL. Pick a resolution. Download. That's it.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![yt-dlp](https://img.shields.io/badge/yt--dlp-2026.3-FF0000?logo=youtube&logoColor=white)](https://github.com/yt-dlp/yt-dlp)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

</div>

---

## Features

- **One-click downloads** — Paste a YouTube URL, select a format, download the file
- **Full resolution support** — From 144p to 4K+, with automatic video+audio merging
- **Smart container selection** — Automatically picks MP4 or WebM based on codecs (no silent audio loss)
- **Cookie authentication** — Upload `cookies.txt` to bypass YouTube 403 errors
- **Real-time status** — Green/red indicator shows if cookies are loaded
- **Clean format table** — Filters out storyboards and junk, shows only real video formats
- **Auto cleanup** — Temp files are deleted after streaming to the client
- **Docker-ready** — Full stack with one `docker compose up`

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌─────────┐
│   Next.js 16     │────▶│   FastAPI        │────▶│  Redis  │
│   Frontend       │     │   Backend        │     │  7      │
│   :3000          │◀────│   :8000          │     │  :6379  │
└──────────────────┘     └────────┬─────────┘     └─────────┘
                                  │
                         ┌────────▼─────────┐
                         │   yt-dlp + FFmpeg │
                         │   (download engine)│
                         └──────────────────┘
```

| Layer | Tech | Port |
|-------|------|------|
| Frontend | Next.js 16 + Tailwind CSS 4 + TypeScript | 3000 |
| Backend | FastAPI + Pydantic + yt-dlp | 8000 |
| Cache | Redis 7 Alpine | 6379 |

## Quick Start

### Option 1: Docker (Recommended)

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000) and start downloading.

### Option 2: Local Development

**Prerequisites:**
- Python 3.11+
- Node.js 20+ (required by yt-dlp for YouTube JS challenge solving)
- FFmpeg (required for merging video+audio streams)

**Backend:**

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API Reference

### `POST /metadata`

Fetch video metadata and available formats.

```json
// Request
{ "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }

// Response
{
  "title": "Rick Astley - Never Gonna Give You Up",
  "thumbnail": "https://...",
  "duration": 213,
  "formats": [
    {
      "format_id": "137",
      "ext": "mp4",
      "resolution": "1080p",
      "vcodec": "avc1",
      "acodec": "none",
      "format_note": "1080p"
    }
  ]
}
```

### `POST /download`

Download a video in the selected format. Automatically merges video+audio.

```json
// Request
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "format_id": "137",
  "vcodec": "avc1",
  "acodec": "none"
}

// Response: binary file stream (video/mp4 or video/webm)
```

### `POST /cookies`

Upload a `cookies.txt` file to authenticate with YouTube.

```bash
curl -X POST http://localhost:8000/cookies \
  -F "file=@cookies.txt"
```

### `GET /cookies/status`

Check if cookies are currently loaded.

```json
{ "cookies_loaded": true }
```

### `DELETE /cookies`

Remove the uploaded cookies file.

```json
{ "message": "Cookies removed successfully." }
```

## Cookie Authentication (Fixing 403 Errors)

YouTube blocks unauthenticated yt-dlp requests with **HTTP 403 Forbidden**. To fix this:

1. Install the **[Get cookies.txt LOCALLY](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)** browser extension
2. Go to [youtube.com](https://youtube.com) and log in
3. Click the extension → export cookies for youtube.com → saves `cookies.txt`
4. In the app, click **"Upload cookies.txt"** and select the file
5. The status dot turns **green** — downloads will now work

> Cookies are stored in a persistent Docker volume and survive container restarts.

## How Downloads Work

```
YouTube URL
    │
    ▼
┌─────────────────────────┐
│  Metadata fetch          │  yt-dlp extracts format list
│  (POST /metadata)        │  with cookies if available
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  User picks resolution   │  Frontend shows video formats
│  in format table         │  sorted by quality
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Download + merge        │  yt-dlp downloads video stream
│  (POST /download)        │  + best audio stream via FFmpeg
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Stream to browser       │  FileResponse with correct
│  + auto-cleanup          │  media type, then temp file
│                          │  is deleted in background
└─────────────────────────┘
```

Key design decisions:
- **No forced container format** — FFmpeg picks MP4 for H.264+AAC and WebM for VP9+Opus, preventing silent audio loss
- **Always merges best audio** — Even "progressive" formats get `+bestaudio` as a fallback
- **Smart format string** — Video-only streams get merged with audio; audio-only streams download directly

## Project Structure

```
Youtube_Downloader/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI routes (metadata, download, cookies)
│   │   └── services/
│   │       └── downloader.py    # yt-dlp download logic + FFmpeg merging
│   ├── tmp/                     # Temporary download storage (auto-cleaned)
│   ├── Dockerfile               # Python 3.11 + FFmpeg + Node.js 20
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         # Main page (URL input, metadata, download)
│   │   │   ├── layout.tsx       # Root layout
│   │   │   └── globals.css      # Tailwind + custom styles
│   │   └── components/
│   │       ├── UrlInput.tsx     # URL input + validation
│   │       ├── FormatTable.tsx  # Format selection table
│   │       └── CookieUpload.tsx # Cookie upload + status indicator
│   ├── Dockerfile               # Node 20 Alpine
│   └── package.json
├── docker-compose.yml           # Full-stack orchestration
└── README.md
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend URL for frontend API calls |
| `REDIS_URL` | `redis://redis:6379/0` | Redis connection string |
| `COOKIES_DIR` | Backend directory | Directory to store `cookies.txt` (Docker: `/app/data`) |

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| **403 Forbidden** | YouTube blocks unauthenticated requests | Upload `cookies.txt` via the UI |
| **"Requested format not available"** | Outdated yt-dlp or missing JS runtime | Install with `pip install "yt-dlp[default]"` and ensure Node.js is installed |
| **Only storyboards shown** | yt-dlp can't solve JS challenges | Add `'js_runtimes': {'node': {}}` to `ydl_opts` (already configured) |
| **No audio in downloaded file** | Forced MP4 container drops Opus audio | Don't use `merge_output_format: 'mp4'` — let FFmpeg auto-select (already fixed) |
| **"ffmpeg is not installed"** | FFmpeg missing on host | Install FFmpeg and restart backend |

## License

MIT
