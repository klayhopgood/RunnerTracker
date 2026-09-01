# RunnerTracker — App Store Launch Checklist

Last updated: 1 Sep 2026. This is the working log for getting the app approved on
Google Play and the Apple App Store. Items marked **[KLAY]** need you; items marked
**[AGENT]** are code/config work the agent is doing or will do on request.

---

## 1. Assumptions baked into the site + legal copy (confirm or correct)

| # | Assumption | Where it's used | Status |
|---|------------|-----------------|--------|
| 1 | Support email is `support@runnertracker.app` | /privacy, /terms, /support pages; store listings | **[KLAY]** Mailbox does NOT exist yet — create it or set up email forwarding (GoDaddy/Cloudflare) to your inbox. Reviewers and users will email it. |
| 2 | Operator is you as an individual ("the RunnerTracker team"), no company entity | Legal pages; developer program enrollment type | **[KLAY]** Confirm, or supply ABN/company name to swap in. |
| 3 | Governing law: Queensland, Australia | /privacy, /terms | **[KLAY]** Confirm. |
| 4 | App is free — no ads, no in-app purchases | Legal copy, store forms, this plan | **[KLAY]** Confirm. |
| 5 | Not directed at children under 13 | Privacy policy, store age forms | Assumed fine. |
| 6 | No analytics/ad SDKs; data never sold or used for ad tracking | Privacy policy, Apple privacy label, Google data safety form | True today. If analytics are ever added, update policy + store forms FIRST. |

## 2. Things only you can do (start these early — they're the long poles)

- [ ] **[KLAY]** Create the `support@runnertracker.app` mailbox/forward (see above).
- [ ] **[KLAY]** Enroll in **Google Play Console** — https://play.google.com/console/signup — US$25 one-time, government ID verification (can take days).
- [ ] **[KLAY]** Enroll in **Apple Developer Program** — https://developer.apple.com/programs/enroll/ — US$99/year, individual enrollment, ~48h approval.
- [ ] **[KLAY]** Recruit **12+ closed testers** for Google Play. Personal Play accounts must run a closed test with 12+ testers continuously for **14 days** before production access. Friends/family Gmail addresses work. This is the biggest schedule risk — start as soon as the Play account exists.
- [ ] **[KLAY]** Create a reviewer demo account in the app (e.g. reviewer@runnertracker.app) once signup is stable — needed for Apple review notes.

## 3. Website/legal work (done or in flight)

- [x] **[AGENT]** Privacy policy at `/privacy` (explicit background-location section — both stores check for it).
- [x] **[AGENT]** Terms of service at `/terms` (incl. "not an emergency/safety service" disclaimer).
- [x] **[AGENT]** Support page at `/support`.
- [x] **[AGENT]** Account deletion info page at `/account/delete` (required as a public URL by Google's data safety form).
- [x] **[AGENT]** In-app account deletion (Dashboard → Danger zone) — required by Apple guideline 5.1.1(v) and Google Play.
- [x] **[AGENT]** Site footer linking all of the above (compact overlay on the map homepage).

## 4. App work still to do before submission

- [ ] **[AGENT — queued]** Prominent background-location disclosure screen shown BEFORE the permission prompt on the tracker screen ("RunnerTracker collects location data to enable live run sharing even when the app is closed or not in use. Allow?"). Google requires this exact pattern and a screen recording of it.
- [ ] **[AGENT — queued]** Android release signing: generate a release keystore, store it in GitHub Actions secrets, switch CI from debug APK to a **signed release AAB** (Play only accepts AABs).
- [ ] **[AGENT — on request]** Store graphics: 512px icon + 1024×500 feature graphic (Play), 6.7"/6.5" iPhone screenshots (Apple).
- [ ] Background-tracking + elevation fixes verified on a real run (in flight — retest with the NEW APK once released).

## 5. Google Play submission runbook

1. Play Console → Create app → Free → Health & Fitness.
2. Store listing: name, 80-char short description, full description, 512px icon, 1024×500 feature graphic, 2+ phone screenshots.
3. Privacy policy URL: `https://www.runnertracker.app/privacy`.
4. **Data safety form**: collects email, name, precise location (incl. background); encrypted in transit; deletable; account deletion URL `https://www.runnertracker.app/account/delete`; nothing shared for advertising.
5. Content rating (IARC questionnaire) → expect "Everyone".
6. **Sensitive permissions declaration** for `ACCESS_BACKGROUND_LOCATION`: explain live run sharing needs location with screen off; upload screen-recording video of disclosure → permission prompt → live tracking working.
7. Foreground service (location) declaration — manifest already declares it; form asks why.
8. Upload signed release AAB → Internal testing (verify install) → Closed testing (12+ testers, 14 days) → apply for production → Production release.
9. Review times: days at each gate; background-location review is the slow one.

## 6. Apple App Store submission runbook

1. App Store Connect → New app → bundle ID matching the Capacitor config → SKU.
2. Listing: description, keywords, support URL `https://www.runnertracker.app/support`, marketing URL `https://www.runnertracker.app`, privacy policy URL `/privacy`, 6.7" + 6.5" screenshots.
3. **App Privacy label**: collects email, name, precise location; linked to identity; NOT used for tracking; no third-party ads.
4. Age rating questionnaire → 4+.
5. Export compliance: HTTPS only → exempt.
6. **Review notes**: demo account credentials; explain background `location` mode is the core feature; steps to see it (log in → Dashboard → create session → Start run → lock phone).
7. Xcode: Archive a release build → upload → **TestFlight** (test on your own iPhone first — also your easiest way to verify iOS background tracking) → Submit for review.
8. Review: typically 1–3 days. If they question background location, answer citing the live-sharing feature; the purpose strings are already in Info.plist.

## 7. Common rejection traps (already handled or planned)

- No account deletion → **handled** (in-app + web page).
- Privacy policy missing background-location disclosure → **handled** (dedicated section).
- No demo account for Apple reviewers → on your list (section 2).
- Google prominent disclosure missing before permission prompt → queued agent work (section 4).
- Debug-signed build uploaded to Play → queued agent work: release AAB (section 4).
- Support URL/email dead → on your list (section 2).
