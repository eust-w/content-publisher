# Content Publisher Design

## Goal

Build a low-cost content operations repo for managing text, image, image-plus-text, short-video, and long-video publishing across Xiaohongshu, Douyin, Bilibili, YouTube, and X.

## Architecture

The first version is local-first: a React + Vite dashboard with pure TypeScript domain logic for platform readiness and publish package generation. It does not pretend every platform has the same publishing API. YouTube and X are treated as official API targets, Douyin and Bilibili are prepared for official authorization flows, and Xiaohongshu starts as manual-review export because a stable public note-publishing API should not be assumed.

## Components

- Dashboard shell: sidebar, top commands, content pipeline, selected draft inspector.
- Domain model: content draft, assets, platforms, capability map, validation, package builder.
- Publish package: per-platform copy, tags, assets, readiness, next action.
- Docs: cost-control assumptions, rollout plan, platform boundaries.

## Data Flow

1. A draft stores title, body, kind, assets, hashtags, target platforms, and status.
2. Platform capability rules validate the draft.
3. Package generation returns per-platform instructions and automation mode.
4. The UI shows what is ready, what needs manual review, and what can later move to API jobs.

## Cost Control

Keep hosting optional at first. Use static hosting for the dashboard and local files for exports until real team login or scheduled jobs are needed. Avoid paid SaaS until the API credentials and posting volume justify it.

## Next Integrations

1. X API posting with media upload behind environment variables.
2. YouTube upload via OAuth and Data API quota controls.
3. Bilibili/Douyin official capability applications and upload adapters.
4. Manual package exporter for Xiaohongshu with reminders and mobile handoff.
