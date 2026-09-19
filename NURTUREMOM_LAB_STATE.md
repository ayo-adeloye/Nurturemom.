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

Current release blockers, in order:
1. Restore Cloudflare deployment credentials and prove production is serving the intended commit.
2. Verify/implement Plus and Founder entitlement gating across the entire Plus hub.
3. User-scope or server-scope private companion and Gentle Steps persistence; retest shared-device privacy.
4. Add Voice Moments pause/resume behavior and retest all 5/10/15-minute flows.
5. Make Weekly Care and Weekly Letter genuinely adaptive to the current week and user data.
6. Prove the live Supabase AI companion response for a signed-in Plus/Founder account.
7. Finish Android/background notification verification, accessibility, mobile polish, and final acceptance testing.

## Next priorities

1. Finish the AI companion using Cloudflare/Supabase only.
2. Add Voice Support for Moms to the Plus companion flow.
3. Restore and finish NurtureMom Voice Moments as the separate encouragement-audio feature.
4. Verify signed-in Plus access end-to-end.
5. Verify Gentle Steps persistence.
6. Verify Plus privacy behavior.
7. Verify weekly care, Little Wins, and weekly letter.
8. Complete mobile polish.
