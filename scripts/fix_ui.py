from pathlib import Path
import re, json

root = Path("/Users/honglei/Documents/jev-emoji-demo")
p = root / "public" / "index.html"
t = p.read_text()

# Force sticker size to text-relative
t = re.sub(
    r"\.xhs-sticker\{[^}]*\}",
    ".xhs-sticker{height:1.15em;width:1.15em;object-fit:contain;vertical-align:-0.2em;margin:0 0.05em;user-select:none;-webkit-user-drag:none;display:inline-block}",
    t,
    count=1,
)
t = re.sub(
    r"\.hist-sticker\{[^}]*\}",
    ".hist-sticker{height:1.15em;width:1.15em;object-fit:contain;vertical-align:-0.2em}",
    t,
    count=1,
)

if ".xhs-sticker-sprite{" not in t:
    t = t.replace(
        ".xhs-sticker{height:1.15em;",
        ".xhs-sticker-sprite{display:inline-block;height:1.15em;width:1.15em;vertical-align:-0.2em;margin:0 0.05em;"
        "background-image:url(/sprites/sheet.png);background-repeat:no-repeat;"
        "background-size:var(--sheet-w) var(--sheet-h);user-select:none}\n.xhs-sticker{height:1.15em;",
    )

# Replace loadStickers
new_load = """async function loadStickers() {
  const [d, atlas] = await Promise.all([
    fetch('/xhs-small/map.json?v=5').then(r => r.json()),
    fetch('/sprites/atlas.json?v=5').then(r => r.json()).catch(() => null)
  ]);
  stickers = Object.fromEntries(d.items.map(x => [x.name, x]));
  window.__stickerAtlas = atlas;
  if (atlas) {
    const w = atlas.cols * (atlas.cell + atlas.pad) + atlas.pad;
    const h = atlas.rows * (atlas.cell + atlas.pad) + atlas.pad;
    document.documentElement.style.setProperty('--sheet-w', w + 'px');
    document.documentElement.style.setProperty('--sheet-h', h + 'px');
  }
}"""
t2, nload = re.subn(r"async function loadStickers\(\) \{[\s\S]*?\n\}", new_load, t, count=1)
print("loadStickers", nload)
t = t2

new_ins = """function insertSticker(marker, name) {
  if (!marker || !marker.isConnected || !stickers[name]) return false;
  const atlas = window.__stickerAtlas;
  const entry = atlas && atlas.items && atlas.items.find(it => it.name === name);
  let node;
  if (entry) {
    const span = document.createElement('span');
    span.className = 'xhs-sticker xhs-sticker-sprite';
    span.title = name;
    span.dataset.sticker = name;
    span.contentEditable = 'false';
    span.style.backgroundPosition = '-' + entry.x + 'px -' + entry.y + 'px';
    node = span;
  } else {
    const img = document.createElement('img');
    img.className = 'xhs-sticker';
    img.src = stickers[name].src;
    img.alt = '[' + name + ']';
    img.title = name;
    img.dataset.sticker = name;
    img.contentEditable = 'false';
    img.draggable = false;
    node = img;
  }
  marker.before(node);
  marker.before(document.createTextNode('\\u00a0'));
  marker.remove();
  const s = getSelection();
  if (s) {
    const r = document.createRange();
    r.setStartAfter(node.nextSibling || node);
    r.collapse(true);
    s.removeAllRanges();
    s.addRange(r);
  }
  if (typeof syncEmptyUI === 'function') syncEmptyUI();
  else if (typeof updatePlaceholderAndCaret === 'function') updatePlaceholderAndCaret();
  if (typeof flash === 'function') flash();
  return true;
}"""
# real nbsp
new_ins = new_ins.replace("\\u00a0", "\u00a0")

t2, nins = re.subn(r"function insertSticker\(marker, name\) \{[\s\S]*?\n\}", new_ins, t, count=1)
print("insertSticker", nins)
t = t2

# broaden selectors from img.xhs-sticker to .xhs-sticker where appropriate
t = t.replace("img.xhs-sticker", ".xhs-sticker")
t = t.replace("querySelector('img')", "querySelector('.xhs-sticker, img')")

p.write_text(t)

# Update server criteria from map
server_path = root / "server.js"
server = server_path.read_text()
mp = json.loads((root / "public" / "xhs-small" / "map.json").read_text())
lines = ["  none: 'The sentence has no clear meaning/mood/topic for a Xiaohongshu sticker',"]
for it in mp["items"]:
    name = it["name"].replace("\\", "\\\\").replace("'", "\\'")
    crit = (it.get("criteria") or f"Xiaohongshu sticker {name}").replace("\\", "\\\\").replace("'", "\\'")
    lines.append(f"  '{name}': '{crit}',")
block = "const EMOJI_CRITERIA = {\n" + "\n".join(lines) + "\n};"
server2, n = re.subn(r"const EMOJI_CRITERIA = \{[\s\S]*?\n\};", block, server, count=1)
print("criteria", n, "items", len(mp["items"]))
server_path.write_text(server2)

# syntax check
import subprocess
s = re.search(r"<script>([\s\S]*)</script>", t).group(1)
Path("/tmp/jev-check.js").write_text(s)
r = subprocess.run(["node", "--check", "/tmp/jev-check.js"], capture_output=True, text=True)
print("syntax", r.returncode, (r.stderr or "ok")[:200])
print("has 1.15em", "1.15em" in t)
print("has sprite", "xhs-sticker-sprite" in t)
