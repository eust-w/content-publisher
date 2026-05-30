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

For login-based storage, first configure developer app credentials:

| Platform | Developer-app values | Callback URL to register |
| --- | --- | --- |
| X | `X_CLIENT_ID`, `X_CLIENT_SECRET` | `http://127.0.0.1:4788/auth/x/callback` |
| YouTube | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET` | `http://127.0.0.1:4788/auth/youtube/callback` |
| Douyin | `DOUYIN_CLIENT_KEY`, `DOUYIN_CLIENT_SECRET` | `http://127.0.0.1:4788/auth/douyin/callback` |

Then start the local OAuth/MongoDB token vault:

```bash
npm run auth:server
```

Open the dashboard and use **Account connections** to log in. The callback stores encrypted tokens in local MongoDB collection `content_publisher.platform_accounts`. A local `.content-publisher.key` file is generated for encryption and is gitignored.

If you already have tokens in `.env.local`, import them into MongoDB:

```bash
npm run accounts:import-env
npm run accounts:list
```

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
