# Flowz v4.3.8

Date: 2026-08-06

## TOEIC Check Voice 5Q

- Changed TOEIC CHECK from 12 scored questions to exactly 5 questions in about 5–8 minutes.
- New scored mix: Listening 3 questions and Reading 2 questions.
- Listening uses one short response, one short conversation, and one short announcement.
- Reading uses one sentence-completion item and one very short passage item.
- Starts one step above the previous basic difficulty and uses more plausible distractors.
- Raises difficulty gradually when the latest two completed checks are both 4/5 or higher.
- Keeps every item usable in Voice Talk by reading choices aloud and keeping reading text short.
- Stops cleanly when requested; incomplete checks do not produce a TOEIC estimate.

## Results and estimate

- Result format is now `FLOWZ TOEIC RESULT: Lx/3 Ry/2`.
- Flowz result entry now accepts Listening /3 and Reading /2.
- New results store their maximum score so legacy 12-question results and new 5-question results can share one normalized trend.
- One completed result uses an approximately 150-point LOW-confidence band.
- Three recent completed results use an approximately 100-point MEDIUM-confidence band.

## UI

- TOEIC CHECK label: `Voice 5Q · L3/R2 · 5–8min`
- TOEIC CHECK icon: `🎯🎤`
- App version: `v4.3.8 (2026.8.6)`
