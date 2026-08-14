from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 exact match, got {count}")
    return text.replace(old, new, 1)

# CSS: make only the tappable TODAY / REUSE rows visibly interactive.
css_path = Path('flowz-v3-duo.css')
css = css_path.read_text()
anchor = ".prep-row small{display:block;margin-top:2px;color:var(--muted);font-size:10px}\n"
addition = anchor + """.prep-row[data-prep-action]{position:relative;cursor:pointer;padding-right:38px;transition:background .15s ease,border-color .15s ease,transform .08s ease,filter .15s ease}\n.prep-row[data-prep-action]::after{content:\"↻\";position:absolute;right:13px;top:50%;transform:translateY(-50%);font-size:16px;font-weight:950;opacity:.82}\n.prep-row[data-prep-action=\"today\"]{background:linear-gradient(135deg,rgba(255,158,44,.17),rgba(255,107,53,.07));border-color:rgba(255,158,44,.50)}\n.prep-row[data-prep-action=\"today\"]>span{color:#ffc36e}\n.prep-row[data-prep-action=\"today\"]::after{color:var(--amber)}\n.prep-row[data-prep-action=\"reuse\"]{background:linear-gradient(135deg,rgba(39,211,223,.16),rgba(39,211,223,.055));border-color:rgba(39,211,223,.46)}\n.prep-row[data-prep-action=\"reuse\"]>span{color:#7fe8ef}\n.prep-row[data-prep-action=\"reuse\"]::after{color:var(--cyan)}\n.prep-row[data-prep-action]:active{transform:scale(.99);filter:brightness(1.18)}\n"""
css = replace_once(css, anchor, addition, 'Talk Prep tappable CSS anchor')
css_path.write_text(css)

# Release + cache bust. Keep all app data/storage keys untouched.
app_path = Path('flowz-app.js')
app = app_path.read_text()
app = app.replace("number:'4.5.1'", "number:'4.5.2'")
app = app.replace("label:'v4.5.1 (2026.8.14)'", "label:'v4.5.2 (2026.8.14)'")
app = app.replace("title:'Flowz v4.5.1 · Duo Battle'", "title:'Flowz v4.5.2 · Duo Battle'")
app = app.replace("footer:'✅ Last updated 2026.08.14 · Flowz v4.5.1 Unified Build'", "footer:'✅ Last updated 2026.08.14 · Flowz v4.5.2 Unified Build'")
app_path.write_text(app)

for path in ['flowz-v3-duo.html', 'index.html']:
    p = Path(path)
    text = p.read_text()
    text = text.replace('4.5.1', '4.5.2')
    p.write_text(text)

for path in ['package.json', 'package-lock.json']:
    p = Path(path)
    text = p.read_text().replace('"version": "4.5.1"', '"version": "4.5.2"')
    p.write_text(text)

# Update existing version assertions and add one regression for the visual affordance.
tests_path = Path('tests/stability.spec.js')
tests = tests_path.read_text()
tests = tests.replace('v4.5.1 (2026.8.14)', 'v4.5.2 (2026.8.14)')
tests = tests.replace('Flowz v4.5.1 · Duo Battle', 'Flowz v4.5.2 · Duo Battle')
anchor_test = "test('a linked Duo Room renders as a compact status strip', async ({ page }) => {"
new_test = r'''test('Talk Prep TODAY and REUSE look tappable without coloring OPEN', async ({ page }) => {
  await seed(page, {});
  await page.goto(`${baseURL}/flowz-v3-duo.html`);
  await page.waitForSelector('#flowzTalkPrep [data-prep-action="today"]');

  const styles = await page.evaluate(() => {
    const today = document.querySelector('[data-prep-action="today"]');
    const reuse = document.querySelector('[data-prep-action="reuse"]');
    const open = document.querySelector('.prep-row:not([data-prep-action])');
    const read = (el) => {
      const cs = getComputedStyle(el);
      const after = getComputedStyle(el, '::after');
      return {
        bg: cs.backgroundImage,
        border: cs.borderTopColor,
        cursor: cs.cursor,
        after: after.content
      };
    };
    return { today: read(today), reuse: read(reuse), open: read(open) };
  });

  expect(styles.today.bg).toContain('linear-gradient');
  expect(styles.reuse.bg).toContain('linear-gradient');
  expect(styles.today.cursor).toBe('pointer');
  expect(styles.reuse.cursor).toBe('pointer');
  expect(styles.today.after).toContain('↻');
  expect(styles.reuse.after).toContain('↻');
  expect(styles.today.border).not.toBe(styles.open.border);
  expect(styles.reuse.border).not.toBe(styles.open.border);
});

'''
if anchor_test not in tests:
    raise SystemExit('test insertion anchor missing')
tests = tests.replace(anchor_test, new_test + anchor_test, 1)
tests_path.write_text(tests)

Path('CHANGELOG-v4.5.2.md').write_text('''# Flowz v4.5.2\n\n- TALK PREP の TODAY を薄い amber、REUSE を薄い cyan に着色。\n- 1pxの色付きborderと ↻ を追加し、タップ可能であることを視覚化。\n- OPEN は従来のニュートラル表示のまま。\n- Duo Sync / XP / 履歴 / Feedback Loop / TOEIC / FREE / Leni は変更なし。\n''')

print('Flowz v4.5.2 Talk Prep tappable color patch applied')
