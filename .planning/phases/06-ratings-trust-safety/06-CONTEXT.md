# Phase 6: Ratings, Trust & Safety - Context

**Gathered:** 2026-02-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can rate each other after completed rides, report bad behavior, block users, and admins can moderate the platform via a web dashboard. This phase delivers mutual ratings/reviews, reporting, blocking, an admin panel with moderation tools, and basic platform stats.

</domain>

<decisions>
## Implementation Decisions

### Rating & review flow
- Rating prompt appears immediately after driver marks ride as completed (modal); if skipped, prompts again on next app open + push notification reminder
- 14-day window to submit a rating after ride completion, then opportunity expires
- BlaBlaCar-style reveal: reviews are hidden until both parties submit; if only one rates within 14 days, their review becomes visible after the deadline
- 1-5 star overall rating with optional free text review (no category breakdown, no tags)
- Reviews cannot be edited or deleted once submitted (BlaBlaCar approach)
- No replies to reviews — one-way only
- Only completed rides can be rated (cancelled rides cannot be rated)

### Report & block behavior
- Reports are free text only (no predefined categories) — user describes the issue in their own words
- Silent blocking — blocked person receives no notification
- Reports and blocks are separate actions (can report without blocking, can block without reporting)

### Admin panel
- Admin panel lives at /admin route within the existing Next.js web app (not a separate deployment)
- Responsive layout — works on mobile for quick moderation on the go
- Role system with admin role only for now (moderator role deferred until team grows)
- Admins can: view/resolve reports, warn/suspend/ban users, hide/delete offensive reviews, view platform stats
- When banning a user, admin decides per case whether to auto-cancel active rides or let them stand
- Admins receive push + email notifications when new reports come in
- Platform stats: total users, rides, bookings, active reports + daily/weekly trend graphs for signups, rides posted, bookings made

### Profile trust display
- Rating shown on ride cards in search results (BlaBlaCar approach) and on profiles
- Reviews ordered newest first on profile page
- "Experienced" badge for users with 10+ completed rides (in addition to existing phone verified + ID verified badges)

### Claude's Discretion
- New user display (no ratings yet) — pick best approach for indicating unrated users
- Block behavior specifics (full invisibility vs interaction block)
- Unblock policy (reversible from settings vs permanent)
- Rating reminder cadence (number and timing of push reminders)
- Minimum ratings threshold before showing average score
- Star rating display format on profiles (stars + number vs number only)
- Moderation action tiers (warn/suspend/ban levels and suspension durations)

</decisions>

<specifics>
## Specific Ideas

- Follow BlaBlaCar patterns where noted: dual-reveal reviews, ratings on ride cards, no edit/delete, silent blocking
- Admin panel should feel lightweight — not a full CMS, just the moderation essentials plus stats
- "Experienced" badge rewards active community members and builds trust for new users browsing rides

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-ratings-trust-safety*
*Context gathered: 2026-02-15*
