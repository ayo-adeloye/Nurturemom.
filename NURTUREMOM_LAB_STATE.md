# NurtureMom Lab — Canonical Working State

Last updated: 2026-09-19

## Canonical workflow

The `lab` branch is the canonical NurtureMom working source.

For every future NurtureMom update:
1. Resume from the latest `lab` branch state.
2. Make incremental changes only.
3. Save every approved update back to `lab`.
4. Never rebuild from an older ZIP, preview, or stale deployment snapshot.
5. Preserve the approved NurtureMom UX unless the user explicitly asks for a redesign.
6. Promote approved Lab changes through the existing GitHub → Cloudflare deployment workflow.

## Hosting and backend

NurtureMom uses:
- GitHub for source control.
- Cloudflare for production hosting/deployment.
- Supabase for authentication, database, RPCs, Edge Functions, and backend services.

NurtureMom does NOT use AppDeploy.
- Do not deploy NurtureMom through AppDeploy.
- Do not use AppDeploy as a backend dependency.
- Do not use AppDeploy previews as a source of truth.
- Do not resume NurtureMom work from AppDeploy snapshots.

## Current source baseline

Current canonical Lab head:
- `4d314c9f26ad2b49c67ab33e48d0a0caaae0731d` — Rebuild and validate NurtureMom Voice Moments
- Verified on 2026-09-19: `lab` and `main` were identical at this commit before this QA-note update.

Lab was originally created from:
- `b38ba99c5c93ba84f63fce062e5ab4ad1480a4e2` — Refresh NurtureMom Plus runtime after QA fixes

Approved UX restoration:
- `996a964e47b59544a74e47eced56647e960debba` — Restore canonical approved NurtureMom UX

Plus hub integration:
- `613d7d6bf598531958e43086cc073f1bf3d035c4` — Add elegant opt-in NurtureMom Plus hub

## Supabase companion state

`nm-ai-companion` is currently deployed as Edge Function version 4 with JWT verification enabled.

The temporary AppDeploy dependency was removed.

Current companion behavior:
- Auth and Plus access remain enforced through Supabase.
- The function uses a server-side `OPENAI_API_KEY` when configured.
- If that key is absent, it returns `companion_not_configured`.
- Cloudflare currently does not expose a working POST `/api/nm-companion` route; the companion should be completed using Cloudflare/Supabase infrastructure only.

## Approved Plus features

Keep:
- Ask NurtureMom private AI companion
- Weekly gentle care plan
- Gentle Steps
- Little Wins
- Personalized weekly care letter
- A Little Something for Mom
- Voice Support for Moms
  - Voice-to-text inside Ask NurtureMom so moms can speak instead of type.
  - Optional spoken AI replies / read-aloud mode.
  - Gentle voice check-ins for mood, recovery, hydration, sleep, movement, and support needs.
  - Hands-free friendly use for feeding, pumping, holding baby, or resting.
  - Voice content remains private and is never shared with the Village unless the mom explicitly chooses to share something.
  - Keep voice interactions supportive and wellness-focused, not diagnostic or emergency care.
- NurtureMom Voice Moments
  - A separate on-demand audio encouragement experience for NurtureMom Plus.
  - 5 minutes — “I need a lift”: short, warm encouragement.
  - 10 minutes — “Stay with me”: reassurance for loneliness, overwhelm, feeding, resting, or winding down.
  - 15 minutes — “Pour into me”: deeper nurturing focused on encouragement, self-worth, rest, hope, and feeling cared for.
  - Mom can pause, resume, replay, or leave at any time with no completion pressure.
  - Voice direction: soothing, comforting, reassuring, gentle, emotionally present, and motivating without being pushy or clinical.
  - Baby may provide context, but Mom remains the focus. Messages should recognize she may be nursing, feeding, rocking, changing, holding, or caring for her baby without turning the message into baby advice.
  - Messages should refresh and personalize over time, rotating themes and avoiding near-duplicates.
  - Intended entry points: Plus home, A Little Something for Mom, 2 A.M./middle-of-the-night care, after a difficult check-in, after a completed walk/recovery activity, and an optional “I need encouragement” button.
  - Voice Moments can surface through “Care for right now” and adapt to recovery stage, sleep, energy, meals, mood, and support needs.
  - Private Companion conversations are excluded from Voice Moments personalization unless Mom explicitly opts in.
- Future Mom Community concept
- Future telehealth/consultation concept

## Approved core UX

Lock these five core screens unless explicitly changed:
- Home
- Recovery
- My Village
- Requests
- Schedule

Maintain the warm, elegant, premium motherhood aesthetic and realistic mother/baby imagery.


## QA continuation — 2026-09-19

Verified against the latest committed app state before this QA-note update:
- The approved five-screen UX remains the protected baseline.
- The current app bundle contains the Plus hub, private companion, Weekly Care, Gentle Steps, Little Wins, Weekly Letter, A Little Something for Mom, and Voice Moments.
- Voice Moments currently offers 5/10/15-minute browser speech playback and a Stop control.
- Pause and Resume controls are not implemented in the current shipped bundle, despite being part of the approved Voice Moments behavior.
- Plus entitlement is enforced by the companion backend response (`plus_required`), but the shipped frontend bundle does not contain a visible `nm_plus_access`/Founder entitlement check for the rest of the Plus hub. Treat hub-wide entitlement gating as release-blocking until verified or implemented.
- Companion history and Gentle Steps use device-local keys (`nurturemom.private.companion.v1` and `nurturemom.gentle.steps.v1`) that are not user-scoped. Treat cross-account/shared-device privacy and persistence as release-blocking until fixed and retested.
- The shipped Weekly Care screen currently shows static weekly invitations. The Weekly Letter uses name/check-in/movement state, but it is not yet a genuinely week-specific, rotating personalized letter. Keep weekly personalization as incomplete.
- `index.html` loads the compiled Next app bundle directly. Standalone helper files such as `ai-companion.js`, `weekly-care.js`, and `premium-checkin.js` are not referenced by the shipped index and must not be assumed to represent current production behavior.
- GitHub Pages successfully published commit `4d314c9`, but the Cloudflare deployment for that same commit failed in the Wrangler step because `CLOUDFLARE_API_TOKEN` was not available to the workflow. Cloudflare production parity with `4d314c9` is therefore not verified.
- The Supabase AI endpoint still needs an end-to-end signed-in Plus test to prove a real reply rather than `companion_not_configured` or another backend error.


### Supabase QA findings — 2026-09-19

- Supabase project `ocorbzbkzfdmurolngdf` is ACTIVE_HEALTHY.
- `nm-ai-companion` is ACTIVE at version 4 with JWT verification enabled.
- `nm_plus_access()` reads the signed-in user's row in `nm_entitlements` and returns plan, Plus access, Founder access, and a combined `has_access` flag.
- RLS is enabled on the core entitlement/profile/recovery/member/request tables reviewed. The entitlement read policy is scoped to the signed-in user's own row; recovery/profile policies are owner-scoped.
- A live companion reply is still not proven because the current tools do not expose whether `OPENAI_API_KEY` is present and no signed-in Plus session was exercised during this QA pass.
- Supabase Security Advisor currently reports hardening items that require review: leaked-password protection is disabled; two RLS-enabled internal tables (`nm_deliveries`, `nm_notification_config`) have no policies; and several `SECURITY DEFINER` RPCs are executable by authenticated users. Some RPC exposure may be intentional because their bodies enforce ownership/access checks, so review individually rather than treating every warning as a defect.
- `nm_invite_preview(p_token text)` is also flagged as anon-executable `SECURITY DEFINER`; confirm that the token-only preview behavior is intentionally public and returns only minimal invitation metadata.

Current release blockers, in order:
1. Restore Cloudflare deployment credentials and prove production is serving the intended commit.
2. Verify/implement Plus and Founder entitlement gating across the entire Plus hub.
3. User-scope or server-scope private companion and Gentle Steps persistence; retest shared-device privacy.
4. Add Voice Moments pause/resume behavior and retest all 5/10/15-minute flows.
5. Make Weekly Care and Weekly Letter genuinely adaptive to the current week and user data.
6. Prove the live Supabase AI companion response for a signed-in Plus/Founder account.
7. Finish Android/background notification verification, accessibility, mobile polish, and final acceptance testing.


## Plus concern fixes implemented in Lab — 2026-09-19

Implemented without changing the approved five-screen UX:
- Plus/Founder entry gating now checks the live Supabase `nm_plus_access` RPC before opening the Plus hub.
- Private Companion history and Gentle Steps local persistence are now scoped to the signed-in user ID. Unscoped legacy values are no longer read by the app, preventing one account from inheriting another account's private local data.
- Account-switch detection reloads the app when a different signed-in user replaces the current session, preventing private in-memory Plus state from carrying across accounts.
- Voice Moments now adds Pause, Resume, and Replay transport controls around the existing browser speech experience. The enhancement fails safely on embedded browsers that expose non-writable speech methods.
- Weekly Care recommendations now adapt to the current week's available recovery data (rest, support, meals, hydration, discomfort) instead of always showing the same three invitations.
- The Weekly Letter now reflects current-week check-ins, week-over-week rest/support trends when available, Gentle Steps activity, and a rotating weekly closing.
- The hardening runtime is loaded before the compiled Next app via `index.html`, so private-storage scoping is active before the app reads Companion or Gentle Steps data.

Lab implementation commits:
- `b5ab3cd1a528c5db357f316cf309f55535a7b48f` — Add NurtureMom Plus QA runtime hardening
- `bed56b45305ba6e797434385273e808379cacffd` — Load Plus QA hardening before NurtureMom app
- `7e35021c154f135203f487d5b234bbb828ce3df4` — Harden Voice Moments controls for embedded browsers
- `197da79bf122bbf84c6c9e6a08421655c73adcf2` — Add automated Lab QA checks

Validation status:
- These fixes are committed on `lab` only and are not promoted to `main` or Cloudflare production yet.
- The Lab-only GitHub Actions QA workflow has not started a run, so automated syntax/runtime ordering is not yet marked passed.
- End-to-end acceptance still needs: Founder access, Plus access, free-account denial, shared-device account switch, all three Voice Moment lengths, weekly content with/without check-ins, and a live AI reply.

Backend security review:
- Core Plus entitlement/profile/recovery tables remain RLS-enabled and owner-scoped.
- `nm_deliveries` is intentionally client-denied by RLS and is used as an internal delivery queue through controlled functions/triggers; its no-policy advisor notice is informational rather than a reason to expose it.
- The public `nm_invite_preview` SECURITY DEFINER RPC is intentionally usable before sign-in via a high-entropy invitation token and returns invitation metadata. Keep this design under periodic review because it includes the invited email address.
- Supabase leaked-password protection remains disabled. Current Supabase documentation says this setting is configured in Auth settings and is available on Pro Plan and above. The current connector does not expose the Auth-config write needed to enable it.

Remaining release blockers after the Lab fixes:
1. Get a successful Lab acceptance pass for the new runtime behavior.
2. Restore the GitHub `CLOUDFLARE_API_TOKEN` (and confirm `CLOUDFLARE_ACCOUNT_ID`) so Cloudflare deployment can succeed.
3. Prove a live signed-in Plus/Founder AI companion response; the Edge Function is active but its server secret cannot be inspected with the current connector.
4. Verify Android/background notifications, accessibility, and final mobile polish.
5. Enable Supabase leaked-password protection in Auth settings if the project plan supports it.


## Founder / Plus acceptance pass — 2026-09-19

Automated Lab acceptance is now green.

Verified on GitHub Actions run `35442088203` against Lab commit `1d046b95ec8514ca161cf8675f95f5f0ad5bdd38`:
- Plus QA runtime syntax passed.
- Behavioral Plus acceptance suite passed.
- Hardening runtime loads before the compiled Next app bundle.
- Protected Plus feature markers passed.
- Private Companion and Gentle Steps storage isolation passed for two simulated signed-in users.
- Free entitlement is denied by the frontend access parser.
- Plus entitlement is allowed by the frontend access parser.
- Founder entitlement is allowed by the frontend access parser.
- Voice Moments Pause, Resume, and Replay behavior passed.
- Weekly Care adaptation passed against a difficult current-week recovery profile.
- Weekly Letter personalization passed, including Mom's first name, current-week check-in context, difficult-moment acknowledgement, and Gentle Steps minutes.

Live Supabase backend entitlement verification:
- Existing Founder/Plus entitlement returned `has_access: true` from the live `nm_plus_access()` RPC.
- Existing non-entitled/free account returned `has_access: false` from the live `nm_plus_access()` RPC.
- Current entitlement data contains one Founder/Plus account and one free/non-entitled account, matching the intended access model.

Not yet considered fully end-to-end:
- Live AI Companion response still requires a real signed-in Plus/Founder browser session because the Edge Function requires a valid user JWT and its server-side OpenAI secret is intentionally not exposed.
- Cloudflare production deployment is still blocked until the repository has a working `CLOUDFLARE_API_TOKEN` and confirmed `CLOUDFLARE_ACCOUNT_ID`.
- Android/background notification acceptance and final device accessibility/mobile polish remain outstanding.

Acceptance conclusion:
- The Lab fixes for entitlement handling, account-scoped private persistence, Voice Moments transport, and weekly personalization have passed automated behavioral QA and live backend entitlement validation.
- Keep these changes in Lab until the remaining live-session and deployment checks are completed.


## AI Companion + background notification acceptance — 2026-09-19

### AI Companion live E2E

A protected synthetic-account QA Edge Function was deployed as `nm-ai-e2e-qa` version 2 and its exact source is saved in Lab at:
- `supabase/functions/nm-ai-e2e-qa/index.ts`

The test:
1. Creates a temporary confirmed QA mom account.
2. Signs in through Supabase Auth and obtains a real user JWT.
3. Confirms a free user receives `plus_required`.
4. Grants Plus and calls the real `nm-ai-companion` Edge Function.
5. When possible, switches the same QA user to Founder access and calls the companion again.
6. Deletes the temporary user and all QA data in `finally`.

Live result:
- ✅ Authenticated QA sign-in works.
- ✅ Free account is denied by the real companion endpoint.
- ✅ Plus entitlement reaches the AI-provider stage.
- ❌ The current blocker is specifically `OPENAI_API_KEY` missing from Supabase Edge Function secrets.
- The live function returns `companion_not_configured`, surfaced by QA as `openai_secret_missing`.
- Founder AI reply cannot complete until the same missing secret is configured.
- Cleanup verified: 0 leftover QA users, 0 leftover QA push devices, and 0 leftover QA care routines.

Current Supabase documentation confirms production Edge Function secrets are added through the Edge Function Secrets page (or `supabase secrets set`), and secrets are available immediately without redeploying the function.

### Background notifications

The previous compiled NurtureMom app only requested browser notification permission and scheduled reminders with an in-page timer. The shipped UI explicitly stated reminders worked only while the app was open.

Lab now contains a real background push runtime:
- `notification-runtime.js`
- loaded before the compiled app by `index.html`
- `sw.js` upgraded for background push display and notification-click focus/navigation
- visible notification copy updated from "while the app is open" to background-capable wording

The runtime now:
- registers `/sw.js`
- retrieves the live VAPID public key from `nm-notifications`
- registers the signed-in device through `nm_push_register`
- removes the device through `nm_push_remove`
- creates/updates/disables a daily `nm-care-routines` reminder using the mom's selected reminder time and browser timezone
- keeps the push subscription when daily reminders are off so Village push events can still work when device notifications remain enabled
- unsubscribes the browser push endpoint when device notifications are turned off or the session is removed
- refreshes an expired Supabase session before background-sync calls when a refresh token is available

Live Supabase notification E2E passed:
- ✅ authenticated VAPID configuration
- ✅ push registration persistence
- ✅ push removal
- ✅ authenticated Care Routine creation and deletion
- ✅ notification worker cron remains active every minute
- ✅ care-reminder notification click route corrected from the invalid `#Care Routine` route to `#Recovery`
- `nm-notifications` is now ACTIVE version 5
- exact deployed source is saved in Lab at `supabase/functions/nm-notifications/index.ts`

GitHub Lab QA:
- Run `35443304035` passed after correcting the test debounce timing.
- Notification runtime syntax passed.
- Notification browser-runtime behavioral acceptance passed.
- Existing Plus behavioral acceptance remained green.
- Runtime ordering and protected feature-marker checks remained green.
- Later Lab runs after saving the Supabase function sources also remained green.

What is still not fully device-verified:
- A real Android device must still confirm a push arrives while NurtureMom is backgrounded/closed and that tapping it opens the expected screen.
- This is now a physical-device acceptance check, not a missing backend/runtime implementation.

### Remaining blockers after this pass

1. Add `OPENAI_API_KEY` to Supabase Edge Function Secrets, then rerun `nm-ai-e2e-qa` to prove both Plus and Founder receive live companion replies.
2. Perform one real Android background/cold-start push delivery acceptance check.
3. Restore GitHub Cloudflare deployment credentials (`CLOUDFLARE_API_TOKEN` and confirm `CLOUDFLARE_ACCOUNT_ID`) and deploy the approved Lab build.
4. Complete final accessibility/mobile polish acceptance.
5. Enable Supabase leaked-password protection if the project plan supports it.


## AI Companion + notification acceptance continuation — 2026-09-19

AI Companion:
- Verified current Supabase guidance for authenticated Edge Functions: signed-in client calls use the user's JWT in `Authorization`, and the API key belongs in `apikey`.
- Confirmed `nm-ai-companion` remains ACTIVE version 4 with JWT verification enabled.
- Confirmed the shipped compiled app calls `/functions/v1/nm-ai-companion` with the signed-in session access token and the publishable API key.
- Added `window.NurtureMomCompanionQA.preflight()` to the Lab hardening runtime. It re-checks `nm_plus_access`, then makes a real authenticated Companion request using the current signed-in browser session. It does not contain, create, or expose a test password/token.
- Added behavioral QA for the preflight contract; GitHub Actions run `35443449839` passed the Plus suite.
- A real OpenAI-backed response still requires opening the Lab build while a real Founder/Plus session is signed in; the connector cannot mint or extract a user's session token.

Notifications:
- `notification-runtime.js` is loaded before the compiled app and registers `/sw.js`, creates a PushManager subscription, calls `nm_push_register`, and synchronizes the daily recovery reminder through `nm-care-routines`.
- The Lab workflow now syntax-checks and behavior-tests the notification runtime; GitHub Actions run `35443449839` passed both notification QA steps.
- Supabase currently contains one registered `nm_push_devices` row, proving at least one device has completed backend push registration.
- Supabase delivery history contains a delivery with state `sent` and no error code, proving the backend delivery pipeline has successfully processed at least one notification delivery.
- No `nm_care_routines` row currently exists, so the new automatic daily recovery reminder has not yet been created by a signed-in device with reminders enabled.
- Final Android acceptance still needs a real device check for permission allow/deny, background/cold-start delivery, notification tap/open behavior, and restart persistence.

Latest green Lab QA:
- Run: `35443449839`
- Head: `6ef227f5c478150c4b73a983cfc9fc602f34d260`
- Plus behavioral acceptance: passed
- Notification runtime syntax: passed
- Notification runtime behavioral acceptance: passed
- Runtime ordering and protected markers: passed

## Next priorities

1. Finish the AI companion using Cloudflare/Supabase only.
2. Add Voice Support for Moms to the Plus companion flow.
3. Restore and finish NurtureMom Voice Moments as the separate encouragement-audio feature.
4. Verify signed-in Plus access end-to-end.
5. Verify Gentle Steps persistence.
6. Verify Plus privacy behavior.
7. Verify weekly care, Little Wins, and weekly letter.
8. Complete mobile polish.


## Cloudflare deployment retry — 2026-09-19

- Approved production candidate remains commit `ecf7e5e898d9f19e478f68c9ffdf93c6d156b786` on `main`.
- Existing automated QA remains green; no application source changes were made during this deployment retry.
- Re-ran GitHub Actions workflow **Deploy NurtureMom to Cloudflare**, run `35443666335`, attempt 2.
- Checkout and Wrangler installation completed successfully.
- Deployment failed again only at `wrangler deploy` because the NurtureMom repository still does not provide `CLOUDFLARE_API_TOKEN` to the workflow environment.
- Exact GitHub log error: Wrangler requires `CLOUDFLARE_API_TOKEN` in a non-interactive environment.
- The workflow also references `CLOUDFLARE_ACCOUNT_ID`; both values should be configured as repository Actions secrets for NurtureMom, using the same Cloudflare account credentials already configured for the HoV repository when appropriate.
- Do not modify or rebuild the approved UX to resolve this deployment issue; it is a repository credential/configuration blocker, not an app-code failure.
- Once the Cloudflare secrets exist in the NurtureMom repository, rerun failed workflow run `35443666335` and verify `mynurturemom.com` against commit `ecf7e5e8`.


## Production deployment checkpoint — 2026-09-19

- **Status: LIVE on Cloudflare production.**
- Production source branch: `main`.
- Approved app baseline before deployment packaging changes: `ecf7e5e898d9f19e478f68c9ffdf93c6d156b786`.
- Cloudflare packaging fix commit: `943c315655612e4839c33f05993c69758934e902`.
- Final custom-domain routing commit: `b96e1ba34832fc5692b474aba16e5604383c8116`.
- GitHub Actions workflow: **Deploy NurtureMom to Cloudflare**.
- Successful production run: `35461535571` (run #22).
- Cloudflare Worker: `damp-queen-a49b`.
- Cloudflare Worker production version: `e905e362-492c-49e5-8534-e5778a2407b2`.
- Static deployment package prepared **57 assets** and excludes repository tooling such as `node_modules`, QA sources, Supabase function sources, and repository metadata.
- Production routes successfully deployed:
  - `mynurturemom.com/*`
  - `www.mynurturemom.com/*`
- The earlier 25 MiB asset failure was resolved by deploying only the curated `cloudflare-site` static bundle instead of the repository root.
- `CLOUDFLARE_API_TOKEN` is now being received correctly by the GitHub workflow.
- No approved NurtureMom UX/Plus feature work was rolled back during this deployment fix.

### Production source-of-truth rule

Treat commit `b96e1ba34832fc5692b474aba16e5604383c8116` plus the approved NurtureMom Lab state as the current production checkpoint. Do not restore older V1/V5/export snapshots over this build. Future changes should branch from this production state and be recorded in the Lab before and after deployment.
