# Flowz v4.8.6 — Verified Diary Sync

Date: 2026-08-22

## Changed
- Added a mandatory Diary Sync Gate for kedy Flowz prompts.
- `Wrap up` / `まとめて` now requires updating the existing Diary page and re-fetching it before the coach may claim the Diary was recorded.
- The existing yellow `🗽 English Log` block must be updated in place; duplicate Diary pages and duplicate English Log blocks are forbidden.
- The compact English Log contains 2–3 diary sentences, one Phrase, up to three Fix lines, and Coach Assessment / next focus when available.
- If Notion is unavailable or verification fails, the coach must explicitly report `Diary未記録` and return copy-ready log text instead of pretending the write succeeded.

## Hotfix r2 — 2026-08-27
- Added an explicit low-load shadowing override for kedy COMMUTE.
- When kedy clearly asks for more shadowing, says he does not want to use his brain, or asks to keep shadowing until work/home, that request now overrides the normal 90/10 ratio and the planned 2–3 sentence shadowing limit.
- Low-load shadowing gives exactly one new short natural sentence per coach turn, waits for one repetition, then moves directly to a different sentence.
- While kedy is asking to continue, the coach must not insert questions, advice, recaps, conversation switches, or stopping language such as `one last one` / `no more shadowing`.
- Repeated phrases are avoided unless kedy asks for review; low-load shadowing continues until he clearly returns to conversation, changes topic, or ends the session.

## Hotfix r3 — 2026-09-02
- Strengthened kedy COMMUTE from simple continuity into conversation quality: the coach must react to the specific thing kedy said, add its own short opinion / observation / joke / mini-story, and actively extend the topic.
- `lead me` / `you lead` / `lead us` / `talk to me` / `会話を広げて` now explicitly switch to coach-led conversation with roughly 2–4 short audio-friendly sentences of concrete content before any question.
- Generic praise, motivational filler, and counselling-style lines such as `You've got this` / `one step at a time` are discouraged when they add no conversational content.
- Voice direction now asks for varied tone, rhythm, pacing, pauses, surprise, amusement, mild teasing, or disagreement when appropriate instead of a flat therapeutic delivery.
- Unusual phrases, complaints, titles, and strong wording should become material for the conversation rather than being merely repeated or praised.
- If kedy is bored or irritated, the coach changes content domain immediately instead of defending or rephrasing the same coaching frame.
- Immediate safety hazards may briefly interrupt the conversation, but once the hazard is resolved and kedy wants English again, generic `stop` / `breathe` / `stay safe` loops should not continue unless a new immediate hazard appears.
- COMMUTE adapter cache token bumped to `v4.8.6-r3` and regression assertions extended.
- The top-right badge now visually shows `v4.8.6 r3 · 09/02` and carries `data-release="4.8.6-r3"`, so the loaded hotfix can be checked immediately on iPhone.
- The old bottom `Last updated` line is hidden from the UI, leaving one visible release indicator at the top-right. Its underlying DOM marker remains only for compatibility with the existing release-stability contract.
- Root no-cache + timestamp cache busting remains unchanged; the COMMUTE adapter itself continues to use the explicit `v4.8.6-r3` cache token.

## Hotfix r4 — 2026-09-04
- Added mandatory dead-air prevention for minimal replies such as `Yeah`, `Mm-hm`, `Right`, or a short agreement: the coach must carry the next beat with 1–3 short sentences of real content instead of mirroring a one-word acknowledgement.
- Expanded coach-led triggers to include `say something`, `some talk`, and ordinary `another` continuation.
- `I'm still commuting` / `I'm still riding` / `I'm not there yet` are explicit continuation cues and must not lead to passive listening or premature stopping.
- Low-load shadowing treats `another` as the next new sentence, not the final repetition.
- COMMUTE adapter cache token and visible badge moved to `v4.8.6-r4`.

## Hotfix r5 — 2026-09-04
- Strengthened the ending contract after a real COMMUTE failure: only explicit requests such as `Wrap up` / `まとめて` / `I want to end` may trigger recap, XP, or session closure.
- Arrival language such as `Take me home`, `I'm home`, `I'm almost home`, or route-home talk is never treated as an ending cue; ambiguous cues default to continued conversation.
- When kedy says he cannot carry the conversation because he is a beginner and asks the coach to talk, that now explicitly enters persistent coach-led conversation rather than reassurance or mini-lessons.
- Voice-recognition ambiguity is handled with at most one short confirmation for meaning-changing nouns or ideas; guessed word substitution is forbidden.
- Repeated comfort/coaching filler after beginner difficulty is discouraged; after one brief acknowledgement the coach must contribute actual conversational content.
- COMMUTE adapter cache token and visible badge moved to `v4.8.6-r5`, and regression assertions were updated from stale r3 markers.

## Hotfix r6 — 2026-09-09
- Added a final-priority COMMUTE override after the ordinary prompt and Feedback Loop so continuation behavior is not diluted by earlier coaching text.
- Explicit continuation cues such as `continue`, `Let's talk something`, `talk to me`, `I want to speak English`, and `I am still commuting` require the coach to keep talking and supply 2–4 short sentences of real content before any question.
- Stopping or safety-management filler such as `That's enough`, `Then rest`, `Just arrive`, `we can talk later`, `focus on the road`, and `breathe` is forbidden as session management unless there is a concrete immediate hazard.
- Topic-switch requests now require a genuinely different concrete domain instead of returning to weather, current tasks, production ToDos, mood, or commute conditions.
- A1 fallback must simplify the same meaning without collapsing into one-word drills, color prompts, or repeated A/B choices.
- Mentioning a task such as comping no longer gives the coach permission to manage kedy's day or tell him a task is enough for today.
- `too slow` / `faster` now explicitly changes spoken pace while preserving useful 2–4 sentence content.
- COMMUTE adapter cache token and visible badge moved to `v4.8.6-r6`.

## Scope
- Base release remains Flowz v4.8.6.
- Hotfix r6 changes kedy COMMUTE prompt behavior only; the deployment badge change only affects release visibility.
- Duo Sync, XP, history, TOEIC, FREE, Leni modes, storage behavior, and Diary Sync Gate are unchanged.


## r7 — 2026-09-09
- TALK PREPのkedy用PHRASE操作を分離。左のPHRASEは頻出フレーズ集へ、右↻は従来どおり次フレーズへ進む。
- `phrases.html`を追加し、EVERYDAY / WORK / STUCK / REPLYの4分類で英語＋自然な和訳を一覧表示。
- 既存COMMUTE r6 prompt、Duo Sync、XP、TOEIC、FREE、Leni側の挙動は変更しない。


## r8 — 2026-09-09
- Frequent Phrasesを「上ほど優先」へ変更。最近の実使用／Diary Phrase・Fix／今後の会話価値で並べる。
- 9/2〜9/8の実ログを反映し、`I'm on my way home.`／`I'm almost there.`／`When I get home, I'll ___.`／`I need to figure it out.`／`That's what I meant.`などを上位へ。
- `What should I say?`／`Can you say it more simply?`／`Let's talk about something else.`等を追加。
- 近い意味で重複していた`Could you say that again?`、`I'm done for today.`、`I'll be there soon.`等を整理。
- 今後はFlowzのprompt／UI／code変更ごとにPhrase Bankも必ずレビューし、変更不要ならその旨を変更記録で明示する。
- COMMUTE conversation adapterはr6のまま変更なし。


## r9 — 2026-09-09
- TALK PREP左の`PHRASE`を`📚 PHRASE ›`の独立ボタンとして視認しやすくし、枠・背景・押下反応を追加。右`↻`は従来どおり独立操作。
- Frequent Phrasesは早見表の1列コンパクト構造を維持したまま、カテゴリごとの色アクセント、短い日本語カテゴリ名、各カテゴリ上位3件の⭐表示を追加。
- Phrase Bankの37件・順序・追加削除をレビュー。今回の目的はUI視認性改善のため、フレーズ内容／優先順はr8から変更不要と確認。
- COMMUTE adapter r6、Duo Sync、XP、TOEIC、FREE、Leni側の挙動は変更なし。


## r10 — 2026-09-09
- Phrase Bankに`🔗 KEEP GOING`を追加。短い相づちの後に会話を伸ばすBridge Phraseを集約。
- 早見表上部へ`REACT → ADD → RETURN`の会話拡張パターンを追加。例：`Yeah, exactly. → For me, ... → What about you?`
- `What about you?`をREPLYからKEEP GOINGへ移し、`Can you tell me more?`／`Why do you think so?`／`For me, ...`／`Actually, ...`／`That reminds me...`／`What happened next?`／`By the way, ...`を追加。Phrase Bankは37→44件、5分類へ。
- COMMUTE adapter r7で、kedyが`Yeah`／`Exactly`／`That makes sense`等の後に詰まった時、文脈に合うBridge Phraseを1個だけ提示して会話へ戻す。ドリル化はしない。
- Coach自身も相づちだけでターンを閉じず、1〜2文の実内容または自然な次展開を続ける。
- r9 UIはkedy実機で「いい感じ」と確認済み。Duo Sync／XP／TOEIC／FREE／Leni側は変更なし。


## r11 — 2026-09-09
- Phrase Bankの分類を5→3へ整理し、探す手間を減らした：`🚲 COMMUTE`／`🗣️ NATIVE`／`💬 REPLY + PRACTICAL`。
- EVERYDAY＋WORK＋Flowz操作系をCOMMUTEへ統合、KEEP GOING＋STUCK＋旧REPLYを`REPLY + PRACTICAL`へ統合。カテゴリを増やさず広い3分類で維持する。
- kedyが実際によく言う`I want to do some shadowing.`／`Give me some useful phrases.`／`I want to practice some common phrases.`／`Give me another phrase.`／`Let's keep going.`／`Let's just talk.`／`You lead the conversation.`／`Speak a little faster.`をCOMMUTE上位へ追加。
- Native頻出枠に`Sounds good.`／`I see.`／`Kind of.`を追加。古い仕事個別表現や重複を整理し、総数は44→45件。
- COMMUTE adapter r8で、kedyが「useful/common phrases」「phrases I use a lot」等を求めた時は、実生活に合う短い1〜3フレーズだけ即提示し、`another phrase`なら次の別フレーズへ進む。
- Phrase Bank保守ルールも「原則3分類。新カテゴリは既存3つで本当に収まらない時だけ」に更新。


## r12 — 2026-09-09
- kedyの`CURRENT ENGLISH`カードをロードマップ入口化。右上に`ROADMAP ›`を追加し、カード全体タップでも`roadmap.html`へ移動する。
- English Hubの現行目標をFlowz内で見える化：2026-09 A1+〜low A2 → 2026-12 A2 → 2027-09 B1 → 2028-12 B2。
- TOEICは別レーンとして長期900目標／現在NOT TESTED／来年に大分で初回測定→実スコア後にL&R設計、と表示。Flowz推定値と公式スコアは分離する。
- NOW→DECEMBERにCOMMUTE／mikan・金フレ／VOICE REVIEWの3本だけを表示し、ホーム画面の情報量は増やさない。
- Phrase Bankレビュー実施：r11の3分類・45件・優先順は今回変更不要と確認。
- COMMUTE adapter r8、Duo Sync、XP、TOEIC 5問、FREE、Leni側の挙動は変更なし。


## r13 — 2026-09-09
- CURRENT ENGLISHの`ROADMAP`をamberの立体ボタンへ変更し、枠・グラデーション・shadow・押下沈み込みでボタン感を強化。
- CURRENT ENGLISHの中央指標をTOEIC推定から`B1 · MAIN GOAL`へ変更。日常画面からTOEIC圧を下げ、`CONVERSATION FIRST`を明示。
- English RoadmapはB1日常会話を主目標へ再設計。A2は次のcheckpoint、B1をMAIN、B2はその先として表示。
- TOEIC 900の大きな目標表示をRoadmapから外し、試験全般を`EXAM READINESS · LATER`へ変更。期限で追わず、AIが準備OKの時だけ受験提案する。
- AI受験判断は5問Flowz TOEICだけでは行わない。最近のVOICE REVIEWでB1相当が複数回安定し、試験を考える段階で十分な長さの模試／L&R確認を行い、会話＋模試の両方を根拠に提案する。
- Phrase Bankレビュー実施：3分類・45件・順序は今回変更不要。
- COMMUTE adapter r8、Duo Sync、XP、TOEIC 5問モード、FREE、Leni側は変更なし。
