# Account Testing

This repo never needs raw account passwords or browser cookies. Use official developer apps and OAuth tokens where the platform allows server-side publishing.

## Required Inputs

| Platform | What I need from you | Notes |
| --- | --- | --- |
| X | `X_USER_ACCESS_TOKEN` for a developer app with post/media write access | Text posts can be tested first with `draft-003`. |
| YouTube | `YOUTUBE_ACCESS_TOKEN` with `youtube.upload` scope | Keep `YOUTUBE_PRIVACY_STATUS=private` for first tests. |
| Douyin | `DOUYIN_ACCESS_TOKEN` and `DOUYIN_OPEN_ID` for an app approved for `video.create.bind` | Published videos still go through Douyin review. |
| Bilibili | Approved Open Platform app token and the official upload/create endpoint available to that app | This stays blocked until application approval is complete. |
| Xiaohongshu | Test account and share-open-platform/mobile confirmation path | The repo exports a publish package; it does not bypass the official app. |

## Local Setup

Create `.env.local` from `.env.example` and fill only the platforms you want to test.

```bash
npm run publish:check
npm run publish:dry-run -- --draft draft-001
npm run publish:live -- --platform x --draft draft-003
```

For YouTube, Douyin, and X media tests, add real local files to each asset by setting `path` in the draft data, or pass a media root that contains files matching the asset paths:

```bash
npm run publish:live -- --platform youtube --draft draft-001 --media-root /absolute/path/to/media
```

Use a private/unlisted throwaway test video for the first live run.
