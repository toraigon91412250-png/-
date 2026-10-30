# Browser harness changes

The attached `irena-REBORN-Codex-light.zip` is the baseline. Its SHA256 is `4f5723705eec13c67dc7eb02594fdca652d966c0bfd750aba83e97c0d286806d`.

No behavioral assertions were deleted. Existing browser tools needed these changes to exercise the updated game reliably:

- Wait for the public `data-combat-busy` state and cinema completion, instead of clicking through active alignment reveals or short recovery windows.
- The baseline regression's skip helper could race the 50ms reduced-motion completion. It now clicks a skip button synchronously if still present, then waits for readiness. The separate cut-in-title assertion remains intact.
- Enter Fallen before using the now Fallen-only grasp. The God-side high-speed layout check still combines grasp's permanent1000x speed with God's999x speed; it now uses three God stance choices after -15 to reach+30. The engine's resulting action list is still compared exactly with UI commands.
- Keep the four iPhone viewport profiles, native touch input, image loading, text-size, target-size, save/reload, and all menu checks.
- Replace a prior-task absolute byte-equality check against an older workspace with a portable fixture of this authoritative ZIP. Every data table remains exact except the explicitly authorized grasp side/text change. Progression and storage files remain byte-exact. All core functions outside the three authorized changes (`available`, `finalAction`, `settle`) remain exact function-body hashes. Existing unit and system tests still cover the modified functions.
- All tools accept `GAME_URL`. The default remains port4173 to match `npm run dev`.

Files: `browser-actions.mjs`, `browser-e2e.mjs`, `iphone-qa.mjs`, `ui-regression.mjs`, `quality-review.mjs`, `lab-retry-check.mjs`, `quality-baseline.json`.

No browser or iPhone hardware validation is implied by these source changes. Executed results are recorded separately.

## Executed verification

- Existing browser regression:119pass/0fail.
- UI/engine equivalence and protected invariants:389pass/0fail.
- Laboratory retry:3pass/0fail.
- Chromium mobile profiles:441pass/0fail,100screens.
- Linux WebKit mobile profiles:441pass/0fail,100screens.
- Full menu review:27screens,zero browser exceptions and horizontal overflow.
- Physical iPhone was not used. Direct file:// navigation remains blocked by administrator policy and unverified.

Exact commands, browser versions, profiles, and HTML hashes: `existing-browser-results.json`.

## Final artifact rerun

A presentation-only fix hides the expired deadline notice after a battle result. All suites were rerun against HTML SHA256 `c49775500a237d19d5b1d086d2793dca87c1f9c6f25d51ab02bfaf543d739d15`. Under parallel load, the old 50ms reduced-motion title locator also raced auto-close. Its failure is preserved in `final-browser-transient-title-failure.json`. The title assertion now observes the actual cinema DOM mutation and checks the same exact 羽弾 title, preserving coverage without depending on sampling a 50ms element.

## Resumed verification — 2026-10-20

After recovering the interrupted task, all six existing browser suites were executed again against the frozen HTML SHA256 `0e1c46474e94d489f810a164b513ad7a9cd3e17c6c4ce08b8c1d1789baf0c58e` (5,232,605 bytes / 19 embedded images). The only remaining production correction was made by the parent: display the earned level increase independently of later training.

- Browser regression:119 pass,0 fail,0 browser errors.
- UI/engine equivalence and protected invariants:389 pass,0 fail.
- Laboratory retry:3 pass,0 fail.
- Chromium154 mobile profiles:441 pass,0 fail,100 screens (320/375/390/430px).
- Linux WebKit26 mobile profiles:441 pass,0 fail,100 screens (same profiles).
- Full menu review:27 screens,0 browser errors,0 horizontal overflow.

Every suite records the SHA256 of its actual loaded HTTP document. No browser harness or production source edits were needed for this resumed validation. Prior JSON records were archived under `history-pre-resume-*` before rerunning. Exact commands, durations, logs, and final hashes are in `existing-browser-results.json` and `resume-*.txt`.

Physical iPhone hardware remains untested. Managed-browser policy still blocks direct `file://` navigation; this remains explicitly unverified. The WebKit environment flag skips only its host-library precheck for existing local dependencies; no assertions are skipped.
