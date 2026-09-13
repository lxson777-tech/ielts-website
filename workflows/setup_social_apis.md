# Workflow: Social Platform API Setup

One-time setup to give `tools/social_publish.py` credentials. Do Instagram
first — it can be working this week. TikTok's public posting needs an audit
that takes 2-4 weeks, so start that clock early but don't wait on it.

Everything below produces values for `.env`. None of it is reversible-by-
accident, but the tokens are real credentials: treat them like the Supabase
keys already in there.

---

## Instagram

### What it requires
- An Instagram **Business** or **Creator** account (a personal account will
  not work).
- That account **linked to a Facebook Page**.
- A Meta developer app.

### Steps

1. **Convert the account.** Instagram app → Settings → Account type and
   tools → Switch to professional account → Business. Free, reversible, and
   it does not change how the profile looks to students.

2. **Link a Facebook Page.** Instagram → Settings → Business tools → link or
   create a Page for the centre. The API authenticates *through* the Page,
   so this step is not optional.

3. **Create the Meta app.** <https://developers.facebook.com/apps> → Create
   App → type **Business**. Add the **Instagram** product.

4. **Add yourself as a test user.** App → App Roles → Roles. Add the
   Instagram account as an Instagram Tester, and accept the invite from
   Instagram → Settings → Apps and websites → Tester invites.

   > **This is the step that avoids App Review.** In development mode, an
   > app can publish to accounts explicitly listed as testers. Since you're
   > posting to your own centre's account, you likely never need to submit
   > for review at all. App Review (with its screencast requirement) only
   > becomes necessary if you ever publish on behalf of *other people's*
   > accounts.

5. **Generate a token.** Graph API Explorer → select your app → request
   permissions `instagram_basic`, `instagram_content_publish`,
   `pages_show_list`, `pages_read_engagement` → Generate Access Token.

6. **Make the token long-lived.** The default expires in ~1 hour. Exchange
   it for a 60-day token:

   ```
   curl -s "https://graph.facebook.com/v21.0/oauth/access_token\
   ?grant_type=fb_exchange_token\
   &client_id=<APP_ID>\
   &client_secret=<APP_SECRET>\
   &fb_exchange_token=<SHORT_LIVED_TOKEN>"
   ```

   Set a calendar reminder to refresh it. A silently-expired token is the
   most likely way this pipeline breaks months from now.

7. **Get the Instagram user id.**

   ```
   curl -s "https://graph.facebook.com/v21.0/me/accounts?access_token=<TOKEN>"
   # take the Page id, then:
   curl -s "https://graph.facebook.com/v21.0/<PAGE_ID>?fields=instagram_business_account&access_token=<TOKEN>"
   ```

8. **Add to `.env`:**

   ```
   IG_USER_ID=<instagram_business_account id>
   IG_ACCESS_TOKEN=<long-lived token>
   ```

### Verify
```
python tools/social_publish.py --job <id> --stage --platforms instagram
```
A container id means it worked. Nothing is public yet.

---

## TikTok

### What it requires
- A TikTok account for the centre.
- A registered app at <https://developers.tiktok.com>.
- For **public** posting: passing the Content Posting audit.

### Steps

1. **Register the app.** <https://developers.tiktok.com> → Manage apps →
   Create. Add the **Content Posting API** product.

2. **Request scopes.** `video.upload` at minimum. `video.publish` is the one
   that allows public direct-posting and is what the audit gates.

3. **Add the redirect URI** for OAuth. For a local one-off authorisation
   `http://localhost:8080/callback` is fine.

4. **Complete the OAuth flow** to get a user access token. TikTok tokens
   expire in 24h and must be refreshed with the refresh token, which is a
   meaningfully shorter leash than Instagram's 60 days. Any regular
   scheduled use will need a refresh step.

5. **Add to `.env`:**

   ```
   TIKTOK_ACCESS_TOKEN=<access token>
   TIKTOK_REFRESH_TOKEN=<refresh token>
   ```

6. **Submit for audit** when you want public posting. Requirements that
   catch people out:
   - The UI must show the creator's username and avatar before posting.
   - The creator must be able to pick a privacy level per post.
   - Both are verified during review, not merely recommended.

Until the audit passes, everything posts `SELF_ONLY`. That is usable: the
video lands in the account, you review it on a phone, and flip it public by
hand. The pipeline is written to expect exactly this.

---

## Video hosting

Both platforms **fetch** the video from a public HTTPS URL. Neither accepts
a file upload from this script, so a rendered video sitting in
`marketing/assets/` is not directly postable.

The simplest path is to pass Higgsfield's own output URL straight through
via `social_render.py --ingest-url`, which is what the default flow does.
If those URLs turn out to be short-lived or auth-gated, the fallback is to
host the file somewhere public — the existing Supabase project's storage
bucket is the least new-infrastructure option.

---

## Security notes
- These tokens post publicly as the centre. Keep them out of git —
  `.env` is already gitignored; verify before committing.
- For GitHub Actions, add them as repository secrets, never inline.
- If a token leaks, revoke it: Meta → App → Settings, TikTok → app →
  credentials. Rotating is cheap; a compromised posting token is not.
