# MedArc question review — 23 October 2026

Status: **individual editorial review remains incomplete**. Every one of the 30,068 records passed automated presentation, routing and answer-key checks. This is not a claim that all questions have been medically validated.

## Work completed

- 1,648 records have presentation corrections.
- 1,037 records have recognized embedded answers, explanations or correctness markers separated from the learner prompt or choices.
- 959 records have inline or misplaced choices recovered as ordinary, unmarked options.
- 1,252 records differ from their source department after the combined routing rules and individual corrections. Automated suggestions remain marked for review.
- 54 records received individual editorial review; 45 previously unanswered questions now have source-checked model answers, explanations and references.
- 1,171 damaged or ambiguous records are withheld from learner practice; their originals remain preserved.
- 664 repeated records are omitted from learner practice without deleting original IDs.

## Remaining work

- 27,698 records have no prepared answer.
- 14,388 records still need a specific topic assignment.
- 17,894 records retain a department or topic review flag. Some flags overlap other categories.
- Existing prepared answers remain provisional. No clinician sign-off is asserted.
- Removing a source answer does not validate it. Unmarked explanations, missing case context, diagrams and complex interleaved documents still require individual reconstruction.

## Preservation and verification

The original bank is unchanged: **30,068 question IDs, 1,201 exam sets, 54,926 memberships and 2,325 original provisional answer records**. Source SHA-256: `eabe9041576475021ea2ef8ba747bab515ac4d023458d6fd55729e1fe19b038c`.

The application derives a cleaned learner version. Removed source text is retained in the original bank and can be reproduced using `prepareLearningQuestion`; it is never automatically trusted as a new key. Individual corrections are bound to exact source fingerprints.

Run `node scripts/export-curation-ledger.mjs` to rebuild the complete CSV and summary from the current source and review overlays. The CSV contains one row per original ID, with source and learner text, routing, cleanup, answer status and review flags.
