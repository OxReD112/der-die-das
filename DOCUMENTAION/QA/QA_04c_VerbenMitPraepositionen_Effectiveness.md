# QA 04c · Verben mit Präpositionen — Effectiveness check

**Date:** 2026-09-25 · **File:** `deutsch-home/praepositionen/verben_mit_praepositionen/verben_mit_praepositionen.js` (*`verbs.js` since v3.13*)
**Related:** `QA_04_VerbenMitPraepositionen.md` (content)
**Status:** ✅ Applied 2026-09-25 · browser-tested · to test on phone

## 1. Goal (set by Alena)
Memorise which preposition (and case) goes with a verb — little logic, mostly memory.

## 2. Rating: 9 / 10
- Verb + meaning (RU/EN) → type the preposition (recall) → pick the case → example sentence as anchor.
- The Russian prompt trains exactly the interference (думать **о** → *denken **an***).
- Same-verb pairs (freuen auf/über, denken an/über, sprechen mit/über …) are separated by their meanings — good contrasts.
- Case step: real per-verb knowledge for two-way prepositions (an/auf/über/in/vor/unter); free repetition of Fester Kasus for the others.
- 61 verbs = not too long (B1 lists 100–150); each verb every ~6 rounds of 10, mistakes more often.

## 3. Changes applied (list usefulness)
| Change | Items |
|---|---|
| Removed (less frequent) | *schmecken nach*, *leiden unter*, *bestehen auf* |
| Added (very frequent) | *Lust haben auf* (Akk) · *telefonieren mit* · *helfen bei* · *sich unterhalten mit* · *sich unterhalten über* (Akk) · *diskutieren über* (Akk) · *achten auf* (Akk) — ids vmp_069–075 |

**Result: 61 → 65 cards.** English meanings follow the file rule (no English twin of the German preposition).
Files: `verben_mit_praepositionen.js?v=4`, page v3.3, hub link `verben_mit_praepositionen/index.html?v=6`, Home tile `praepositionen/?v=7`. Copies before: `…_before-effectiveness.js/.html`, `praepositionen/index_before-vmp-eff.html`, `Home/index_before-vmp-eff.html`.
Browser-tested: all 7 new cards (preposition + case + example), wrong preposition marked wrong, no errors.
