# MedArc Health Sciences

Next.js educational question practice, examinations, anatomy practical, and provisional answer library.

## Run
Node 22 or newer. Run `npm ci`, `npm run test:all`, `npm run build`, then `npm start`.

The complete original bank is stored losslessly in `data/bank.parts/*.part` to accommodate upload limits. The installation script restores `data/bank.json` only after verifying its original SHA-256 hash. All 30,068 questions, 1,201 exam sets, 54,926 memberships, and 2,325 provisional mappings are preserved.

## Content limitations
Answers are provisional educational material; no record has been clinically approved. 27,743 questions have no prepared answer, and 892 option rationales are incomplete. Imported question text has no supplied redistribution-license evidence; no third-party license is asserted by this repository.

University of Michigan / BlueLink anatomy photographs are excluded. Their source attribution and restricted status are retained in CONTENT_RIGHTS.md; no permission to republish them is implied. The public anatomy syllabus and private local-image practical remain available without bundled photographs.

Learner preferences and attempts are saved in browser local storage. Do not enter patient information. This application does not provide prescribing or patient care advice.

## Student-focused visuals (2026-10-22)
Two AI-generated group portraits and 20 transparent WebP study illustrations are bundled in `public/medarc/`. The `/visual-learning` route links every illustration to existing learning pathways. Motivational feedback in `QuestionCard` is conditional on *provisional* draft matches and must never be interpreted as verified clinical assessment. These illustrations are not authentic patient/specimen imagery or diagnostic evidence. The source visual package was generated for MedArc in the ChatGPT design conversation; metadata for restricted anatomical imagery continues to be governed separately in `CONTENT_RIGHTS.md`.

Run `npm run test` and `npm run build` before release. The new `tests/medarc-visuals.test.mjs` file enforces presence, file signatures, and non-scoring behavior.
