# FurnishView — Test Plan

## Overview

This document outlines the testing strategy for FurnishView, covering both **formative** and **summative** evaluation phases. The formative phase tested lo-fi wireframes to identify early usability issues; the summative phase tests the final working application to measure overall usability and validate that formative improvements were effective.

---

## Test Environment

- **Browsers:** Chrome 90+, Firefox 88+, Edge 90+
- **Screen Sizes:** Desktop (1920x1080, 1366x768)
- **Test Credentials:** designer1 / password123
- **Device:** Laptop / desktop with mouse input

---

## Part A — Formative Testing

### Goals

- Identify usability issues early in the design process
- Validate core user flows on lo-fi wireframes (LF-1 through LF-8)
- Gather qualitative feedback to inform hi-fi prototype design

### Method

- **Think-Aloud Protocol** — Participants verbalise their thought process while completing tasks
- **Justification:** Think-aloud was chosen because it reveals cognitive processes during interaction, enabling identification of usability issues that pure observation cannot capture (Preece et al., 2019)
- **Participants:** 2 (P1 — Interior Design Consultant; P2 — Retail Sales Associate)

### Test Tasks (Formative)

| Task | Description | Success Criteria |
| --- | --- | --- |
| T1 — Login | Log in using provided credentials | Reaches dashboard |
| T2 — Create Room | Create a new 5m x 4m room with light grey walls | Room appears on canvas with correct dimensions |
| T3 — Place Furniture | Drag a sofa, table, and 2 chairs onto the canvas | All 4 items placed within room boundary |
| T4 — Switch to 3D | Transition from 2D editor to 3D view | 3D view renders with placed furniture visible |
| T5 — Save + Verify | Save the design and confirm it appears on the dashboard | Design card visible on dashboard |

### Formative Metrics Collected

- Task completion (pass/fail)
- Task completion time (seconds)
- Number of errors per task
- Whether facilitator help was requested
- Direct quotes (think-aloud)

### Formative Findings Summary

The formative study identified 7 findings (see `formative-docs/formative-summary.md`). The highest-severity issue was **label ambiguity** on the "Visualise" button (F1 — High), which both participants hesitated at. All findings were mapped to specific hi-fi design changes (F1–F7).

---

## Part B — Summative Testing

### Goals

- Measure the usability of the **final working application** (hi-fi implementation)
- Validate that design changes made after formative testing (F1–F7) resolved the identified issues
- Obtain a standardised usability score via the System Usability Scale (SUS)
- Collect quantitative performance data (time, errors, completion rate) for comparison with formative baseline

### Method

- **Think-Aloud Protocol** + **System Usability Scale (SUS) Questionnaire**
- **Justification:** Think-aloud was chosen because it reveals cognitive processes during interaction, enabling identification of usability issues that pure observation cannot capture (Preece et al., 2019). SUS provides a standardised quantitative usability metric that allows comparison with industry benchmarks (Brooke, 1996). The combination of qualitative think-aloud data and quantitative SUS scores provides a comprehensive evaluation of system usability.
- **Participants:** 2 new participants (P3, P4) who did not participate in formative testing, to avoid learning effects

### Test Tasks (Summative)

The same 5 core tasks are used, now performed on the **working application** rather than lo-fi wireframes:

| Task | Description | Success Criteria | Formative Change Being Validated |
| --- | --- | --- | --- |
| T1 — Login | Log in using provided credentials (designer1 / password123) | Reaches dashboard within 30s | F4 — Enlarged Sign In button |
| T2 — Create Room | Create a new 5m x 4m room with light grey walls | Room appears on canvas with correct dimensions | F3 — Enlarged "Create New Design" CTA; F6 — "Room Presets" label |
| T3 — Place Furniture | Drag a sofa, table, and 2 chairs onto the canvas | All 4 items placed within room boundary | F7 — Visible undo button |
| T4 — Switch to 3D | Transition from 2D editor to 3D view | 3D view renders with placed furniture visible | F1 — "3D Preview" button label; F5 — Tooltip in 3D view |
| T5 — Save + Verify | Save the design and confirm it appears on the dashboard | Design card visible on dashboard | F2 — Prominent Save + auto-save indicator |

### Summative Metrics Collected

| Metric | Description | Target |
| --- | --- | --- |
| Task completion rate | Percentage of tasks completed successfully | > 95% |
| Task completion time | Time in seconds from task start to completion | Improvement over formative baseline |
| Error rate | Number of errors per task | Reduction from formative baseline |
| Help requests | Whether the participant needed facilitator help | 0 per task |
| SUS score | Standardised usability score (0–100) | > 68 (industry "Good" threshold) |

### Summative Procedure

1. **Pre-session:** Welcome participant, explain think-aloud protocol, obtain informed consent
2. **Task execution:** Participant completes T1–T5 on the working application while thinking aloud; observer records time, errors, quotes, and behavioural notes
3. **SUS questionnaire:** Immediately after tasks, participant completes the 10-item SUS questionnaire (see `docs/evaluation/sus-questionnaire.md`)
4. **Post-session interview:** Semi-structured interview covering ease of use, confusing elements, and suggestions for improvement
5. **Debrief:** Thank participant, explain study purpose

### Comparison Framework

Results will be compared against formative baseline data:

| Metric | Formative Baseline (P1, P2) | Summative Target |
| --- | --- | --- |
| Task completion rate | 100% (10/10) | 100% |
| Average task time (P1) | 39s | < 35s |
| Average task time (P2) | 38s | < 35s |
| Total errors (P1) | 5 | < 3 |
| Total errors (P2) | 2 | < 2 |
| "Visualise" hesitation | 4–5s (both participants) | 0s (renamed to "3D Preview") |
| Save button discovery | 6s sidebar search (P1) | Immediate (prominent + auto-save) |
| Confidence (1–5) | 4, 4 | >= 4 |
| SUS score | Not collected | > 68 |

---

## Test Sessions Overview

| Session | Phase | Participants | Prototype Tested | Focus |
| --- | --- | --- | --- | --- |
| Session 1–2 | Formative | P1, P2 | Lo-fi wireframes (LF-1–LF-8) | Core navigation, label clarity, discoverability |
| Session 3–4 | Summative | P3, P4 | Working application (hi-fi) | Full application usability, SUS score, formative fix validation |

---

## Documentation & Deliverables

| Document | Location |
| --- | --- |
| Formative participant notes | `formative-docs/P1.md`, `formative-docs/P2.md` |
| Formative observer sheet | `formative-docs/observer-sheet.md` |
| Formative summary | `formative-docs/formative-summary.md` |
| SUS questionnaire | `docs/evaluation/sus-questionnaire.md` |
| Summative participant notes | `docs/evaluation/summative/participant-P3.md`, `participant-P4.md` |
| Summative summary | `docs/evaluation/summative/summative-summary.md` |
| Consent forms | `docs/evaluation/consent-forms/` |

---

## References

- Brooke, J. (1996). *SUS: A "Quick and Dirty" Usability Scale.* Usability Evaluation in Industry, 189, 4–7.
- Preece, J., Rogers, Y., & Sharp, H. (2019). *Interaction Design: Beyond Human-Computer Interaction* (5th ed.). Wiley.
- Nielsen, J. (1994). *Usability Engineering.* Morgan Kaufmann.
