# Deploy and test on your phone

The app is a PWA: it must be served over HTTPS for *Add to Home Screen* and push
notifications. Two services, both connected to the GitHub repo so every push redeploys.

## Fastest: two taps from your phone (demo data, no Meta credentials)

**Tap 1 – API on Render (free):**
https://render.com/deploy?repo=https://github.com/AlyassinDyaa/IGAntoScrollApp
Sign in with GitHub, keep the defaults from `render.yaml`, leave `WEB_URL` blank, Apply.
When it finishes, copy the service URL (looks like `https://ig-focus-hub-api.onrender.com`).

**Tap 2 – Web on Vercel (free):**
https://vercel.com/new/clone?repository-url=https://github.com/AlyassinDyaa/IGAntoScrollApp&root-directory=apps/web&project-name=ig-focus-hub&env=NEXT_PUBLIC_API_URL&envDescription=Your%20Render%20API%20URL%20from%20tap%201&envLink=https://github.com/AlyassinDyaa/IGAntoScrollApp/blob/main/docs/DEPLOY.md
Sign in with GitHub, paste the Render URL into `NEXT_PUBLIC_API_URL`, Deploy.

Then open the Vercel URL in Safari → Share → **Add to Home Screen**.
The free Render instance sleeps after 15 minutes idle; the first open after that takes ~30s.

## 1. API on Railway (or Render)

1. https://railway.app → New Project → Deploy from GitHub repo → pick `IGAntoScrollApp`.
2. Settings → Build: **Dockerfile path** `apps/api/Dockerfile`, root directory `/` (repo root).
3. Variables (mock mode, no database needed):
   ```
   MOCK_META=1
   NODE_ENV=production
   PORT=4000
   WEB_URL=https://<your-vercel-domain>        # fill in after step 2
   API_URL=https://<your-railway-domain>
   SESSION_SECRET=<any long random string>
   ```
4. Settings → Networking → Generate Domain. Copy it (this is `API_URL`).
5. Optional: add a Volume mounted at `/data` so uploaded media survives restarts.

Render works the same way (New → Web Service → Docker, Dockerfile path `apps/api/Dockerfile`);
its free tier sleeps after inactivity, so the first open takes ~30s.

## 2. Web on Vercel

1. https://vercel.com → Add New → Project → import `IGAntoScrollApp`.
2. **Root Directory**: `apps/web`. Framework: Next.js (auto). Leave build settings default
   (Vercel detects pnpm workspaces).
3. Environment variable: `NEXT_PUBLIC_API_URL=https://<your-railway-domain>`.
4. Deploy. Copy the `*.vercel.app` URL and set it as `WEB_URL` on Railway (step 1.3), then
   redeploy the API once so CORS allows it.

## 3. On your iPhone

1. Open the Vercel URL in **Safari** (push only works from Safari-installed PWAs on iOS).
2. Share → **Add to Home Screen**.
3. Open it from the Home Screen. Settings → Notifications → Enable (needs VAPID keys, see
   below; in mock mode you can skip this).

## Real Meta mode later

Add Postgres and Redis on Railway (one click each), then set:
```
MOCK_META=0
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
TOKEN_ENCRYPTION_KEY=<32 bytes base64>
META_APP_ID / META_APP_SECRET / META_REDIRECT_URI / META_WEBHOOK_VERIFY_TOKEN
VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT
```
and on Vercel `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. Run `pnpm --filter @ig-focus-hub/db migrate:deploy`
once (Railway → service → Deploy command or a one-off shell). Details in `META_SETUP.md`.

## Costs

| Service | Plan | Cost |
| --- | --- | --- |
| Vercel | Hobby | Free |
| Railway | Hobby | ~$5/month after trial (API + Postgres + Redis fit in it) |
| Render (alternative) | Free web service | Free, sleeps when idle |
