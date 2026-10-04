# Meta setup (Facebook Login for Instagram Platform)

## 1. Prepare the accounts

For each of the three Instagram accounts:

1. Switch it to a **Professional** account (Business or Creator).
2. Create (or pick) a Facebook Page and link the Instagram account to it
   (Instagram → Settings → Business tools and controls → Connect a Facebook Page).
3. Make sure the Facebook user who will log in is an admin of all three Pages.

## 2. Create the Meta app

1. https://developers.facebook.com/apps → Create app → type **Business**.
2. Add product **Instagram** → choose *API setup with Facebook login*.
3. Add product **Webhooks**.
4. Note **App ID** and **App Secret** → `META_APP_ID`, `META_APP_SECRET`.
5. Facebook Login → Settings → Valid OAuth Redirect URIs:
   `https://<your-api-domain>/auth/meta/callback` (and `http://localhost:4000/auth/meta/callback` for dev).

## 3. Permissions

Requested scopes (`packages/meta/src/oauth.ts`):

```
instagram_basic, instagram_manage_messages, instagram_content_publish,
instagram_manage_comments, instagram_manage_insights,
pages_show_list, pages_read_engagement, pages_manage_metadata,
pages_messaging, business_management
```

While the app is in **Development** mode these work for app admins/testers only. For
production use submit **App Review** with screen recordings of each flow (inbox reply,
publish, comment reply). Audio API access may require a separate request.

## 4. Webhooks

1. Webhooks → Instagram → Callback URL `https://<api>/webhooks/meta`,
   Verify token = `META_WEBHOOK_VERIFY_TOKEN`.
2. Subscribe to fields: `messages`, `messaging_postbacks`, `message_reactions`,
   `messaging_seen`, `comments`, `mentions`.
3. After an account connects, subscribe its Page:
   `POST /{page-id}/subscribed_apps?subscribed_fields=...` (todo in `/auth/meta/select`).

## 5. Environment

```
MOCK_META=0
META_APP_ID=...
META_APP_SECRET=...
META_GRAPH_VERSION=v24.0
META_REDIRECT_URI=https://<api>/auth/meta/callback
META_WEBHOOK_VERIFY_TOKEN=<random>
TOKEN_ENCRYPTION_KEY=<32 bytes base64>
SESSION_SECRET=<random>
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / NEXT_PUBLIC_VAPID_PUBLIC_KEY   (pnpm --filter @ig-focus-hub/api vapid)
```

## 6. Connect from the app

Settings → *Connect Instagram account* → Facebook login → pick up to three linked
accounts → done. Tokens are stored encrypted; the page token used for every call never
expires while the user token stays valid.

## Known constraints

- Businesses generally cannot start a DM with someone who has never messaged them.
- Group threads are not available to third-party apps.
- The Audio API catalog depends on account, region and licensing.
- Media for publishing must be reachable by Meta over public HTTPS (use object storage in production).
