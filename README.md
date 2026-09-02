# Health & Safety Companion

A minimal Next.js app for multimodal first-aid guidance, local-language translation, and browser-only emergency contacts.

## Local setup

1. Copy `.env.example` to `.env.local` and add your Google Gemini API key.
2. Install dependencies with `pnpm install`.
3. Start the app with `pnpm dev`.

## Deploy to Cloud Run

This repository is buildpacks-compatible and does not require a Dockerfile:

```bash
gcloud run deploy health-safety-companion --source . --region us-central1 --allow-unauthenticated
```

Set `GEMINI_API_KEY` in the Cloud Run service environment settings. In an immediate emergency, call 911 first; this app provides general information only.
