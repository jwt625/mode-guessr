# 010 — Player feedback round

Date: 2026-09-14. Status: implemented. Source: play-test feedback on the C2 UI.

Scope: UI/UX-only changes against the shipped analytic bank. No physics claims,
solver eligibility or cache schema changes are involved.

| ID | Feedback | Implementation |
|---|---|---|
| F1 | Gallery waits for the whole bank before showing anything. | Stream analytic questions: fetch the manifest, render the grid shell, then append each question as it arrives. Waveguide mode manifest loads in parallel instead of after the bank. |
| F2 | The speedrun is fixed at 20 questions. | Add a 10-question option alongside 20; bucket quotas scale to the chosen length. |
| F3 | Default A/B toggle rate is too fast. | Default `flashSettings.rateHz` lowered from 3 Hz to 2 Hz. |
| F4 | The Submit button is far from the slider; the Next button then jumps elsewhere. | Submit follows the slider thumb horizontally; Next appears at the same spot using a fixed action width and shared position. |
| F5 | Field display options need keyboard shortcuts. | `i` intensity, `a` amplitude, `s` sign, `p` phase. Shortcut shown in the control titles. |

Acceptance: F1 shows the first cards before the bank is complete; F2 offers and
runs a 10-question run with balanced buckets; F3 defaults to 2 Hz; F4 keeps
Submit and Next at one fixed-width track position; F5 changes the field
component without a pointer click and never while typing in an input.

Verified: `npm test` (81 pass, incl. streamed-bank and length-10 quota checks),
`npm run check` (0 errors, 0 warnings), `NODE_ENV=production npm run build`.

Not in scope: solver/vector work (C3), cache schema, or scoring rules.
