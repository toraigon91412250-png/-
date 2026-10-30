# UI / media / save audit — authoritative uploaded source

Date: 2026-10-20. Read-only audit of `/workspace/irena-quality-latest/irena-reborn`.
Authoritative ZIP SHA256: `4f5723705eec13c67dc7eb02594fdca652d966c0bfd750aba83e97c0d286806d`.
No game source or tests modified. No deployment / GitHub operations.

## Reproduced P1: generic cut-in accepts re-entry from focused underlying command

- URL: `http://127.0.0.1:4180/index.html`.
- Browser: system Chromium 154.0.8037.57 / Playwright, viewport390×664, mobile/touch emulation, animations enabled.
- Start → 開発者 → 全機能開放 → 専用いれーな → 終極殲滅 → Enter twice during750ms cut-in.
- Underlying annihilate button retains focus. End state: `BATTLE / TURN 2` plus uncaught `CT 4` exception. Duplicate callback runs after first action applied its cooldown.
- `App.js:66`: generic cinema completion guard is per invocation only.
- `App.js:103`: global handle blocks only when combatAnimating is true.
- `App.js:127–128`: generic feather/ultimate/meteor/annihilate and route cinematics do not set that lock. Alignment at `:69–79` does set and clear it, so its protection does not cover all cinematics.
- Safe fix: unify input/cinematic lifecycle lock, focus skip control, restore focus when finished, capture current battle identity before deferred action, release lock on exceptions. Existing data/counters/multipliers unchanged.
- Test native keyboard + tap spam, skip and natural completion race, exactly one turn and exactly one skill resource usage, no pageerror, controls resume. Preserve alignment200ms commitment and one-turn route semantics.

## Reproduced P2: import reports successful restoration after write failure

- Same browser/source URL,390×664. Begin fresh, retain original localStorage value. Simulate QuotaExceededError by overriding Storage.prototype.setItem. Import valid JSON with level7 and confirm.
- Observed: visible level7, old storage unchanged, persistent warning `自動保存失敗。JSONを書き出してください。`, but toast `JSONから復元しました`.
- `App.js:17` catches write errors without returning status; `:102` unconditionally displays successful import toast.
- Screenshot: `new-import-failure-message.png` in this audit folder.
- Safe fix: distinguish memory restoration from persisted restoration, retain backup/export and failure banner. No save format changes needed.

## Measured mobile battle UX concern (not a broken control)

Fresh normal battle at scrollY0:

| Viewport | stage top–bottom | portrait height | commands top–bottom | fixed nav top |
|---|---|---|---|---|
|320×568|209.7–535.7|195|639.8–871.8|496|
|390×664|209.7–568.5|225|672.6–904.6|592|
|768×900|249.9–702.1|280|806.2–1054.2|none|

All commands start below the initial mobile viewport. Once scrolled to commands, the portrait/hit effects and HP are partly above the viewport, weakening action-feedback connection. Native scrolling works and no horizontal overflow observed at320/390/768. This is a quality candidate, not proof of unusability. Keep character presence; prefer compact combat header / status near commands / thoughtful controls positioning over simply shrinking art. Verify320×568 and390×664 with live damage feedback after any adjustment.

Screenshots: `new-320-normal.png`, `new-390-normal.png`, `new-768-normal.png`.

## Actual newer media connections confirmed

- `App.js:7–9`: normal Irena, final God/Fallen/neutral Irena, and Stella mapped to five existing runtime WebPs. Final portrait follows balance sign from first±15; no numeric unlock stage changes.
- `App.js:8`: victory, feather, Stella cut-ins, God/Fallen crests mapped to five existing runtime WebPs.
- `App.js:58`: battle uses battlePortrait and appropriate stage class. Enemy still deliberate SVG substitute while artwork is pending.
- `App.js:60`: normal Irena victory image connected only on win.
- `App.js:69–79`: God/Fallen alignment uses matching crest and standing image, commits actual turn after200ms, skip exactly-once guard.
- `App.js:82–98`: white blade strike, independent dealt/taken numbers, recoil, MISS feedback connected. Render no longer repeats old damage on unrelated navigation.
- `App.js:58`: heavy warning follows turn%4 and excludes fixed-damage Stella mode.
- `App.js:127`: feather and meteor use correct cut-ins. God/Fallen ultimate uses key art / fallen icon respectively as in source; preserve supplied mapping unless a later media instruction changes it.
- Runtime assets total about2.2MB across ten new WebPs; originals in ZIP are retained untouched.
- Preloader `App.js:149` still decodes only ART/keyArt/fallen icons, not PORTRAITS/SCENES. Cold first use may decode during animation, a performance concern to measure before changing. Avoid unnecessary blanket re-encoding or replacement.

## Preserved good behavior / testing gaps

- Final UI filters unavailable techniques and omits technique descriptions/tooltips; route choices remain only names. Keep previous explicit user preference.
- Storage validation remains v4 schema / v3 key with v1/v2 lookup; whitelists owned/equipped IDs, clamps resources, limits slots, rejects corrupt JSON and future versions. No schema changes required for selected fixes.
- Invalid JSON load blocks overwriting. A thrown storage read error only sets warning and not saveBlocked (`App.js:15`); consider recoverable-read robustness, not a reproduced device issue.
- Tests visual-effects.test.js cover alignment lock and200ms timing. They do not test generic cinema re-entry; combat-feedback.test.js uses isolated VM functions, not full browser action/animation integration.
- Current regression tools often assume immediate combat, while feather now has1000ms cut-in. Tests should await committed turn/outcome explicitly; do not delete meaningful assertions when adapting to the authoritative build.
- Older ui-regression whole-file byte comparisons against previous-version absolute scratch paths are historical protection from a UI-only pass. Replace with specific protected invariants if the new audit changes authorized code; don't quietly remove checks to force green.

Real iPhone hardware has NOT been tested. All browser evidence here is simulated viewport/input on Linux Chromium. WebKit audit is for parent/global QA.
