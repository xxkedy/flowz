# kedy Personal Context Layer v1

This branch adds a private preflight instruction layer for kedy's COMMUTE and FREE sessions.

The app never stores HQ, ToDo, Diary, or personal ChatGPT context in the public repository. Instead, the launched ChatGPT session is instructed to read the minimum useful connected Notion context before the first spoken reply when those tools are available.

Leni prompts and Duo Sync are intentionally unchanged.

## Phrase Bank maintenance

- `phrases.html` is a maintained part of Flowz, not a fixed vocabulary dump.
- Order phrases by: recent real usage first, then phrases kedy should use often, then general usefulness.
- Prefer phrases found in recent Flowz/Diary English Logs and repeated correction points.
- Remove stale, overly specific, or near-duplicate phrases; add new useful phrases when recent sessions justify them.
- Every Flowz prompt/UI/code change must include a Phrase Bank review. If no phrase change is needed, explicitly verify that in the change notes.
- Keep the five sections: EVERYDAY / WORK / STUCK / REPLY / KEEP GOING, with higher-priority phrases higher inside each section. KEEP GOING is reserved for short bridge phrases that help kedy extend a real conversation after a backchannel or pause.
