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

## Next priorities

1. Finish the AI companion using Cloudflare/Supabase only.
2. Add Voice Support for Moms to the Plus companion flow.
3. Restore and finish NurtureMom Voice Moments as the separate encouragement-audio feature.
4. Verify signed-in Plus access end-to-end.
5. Verify Gentle Steps persistence.
6. Verify Plus privacy behavior.
7. Verify weekly care, Little Wins, and weekly letter.
8. Complete mobile polish.
