from pathlib import Path
import re, json, subprocess

root = Path("/Users/honglei/Documents/jev-emoji-demo")
p = root / "public" / "index.html"
t = p.read_text()

# Ensure text-sized stickers
t = re.sub(
    r"\.xhs-sticker\{[^}]*\}",
    ".xhs-sticker{height:1.15em;width:1.15em;object-fit:contain;vertical-align:-0.2em;margin:0 0.05em;user-select:none;-webkit-user-drag:none;display:inline-block}",
    t,
    count=1,
)

sprite_css = (
    ".xhs-sticker-sprite{display:inline-block;height:1.15em;width:1.15em;vertical-align:-0.2em;margin:0 0.05em;"
    "background-image:url(/sprites/sheet.png);background-repeat:no-repeat;"
    "background-size:calc(var(--sheet-w) * 1.15em / var(--cell)) calc(var(--sheet-h) * 1.15em / var(--cell));"
    "user-select:none;pointer-events:none}"
)
if ".xhs-sticker-sprite{" in t:
    t = re.sub(r"\.xhs-sticker-sprite\{[^}]*\}", sprite_css, t, count=1)
else:
    t = t.replace(".xhs-sticker{height:1.15em;", sprite_css + "\n.xhs-sticker{height:1.15em;")

# Fix background position to em-based if still px
t = t.replace(
    "span.style.backgroundPosition = '-' + entry.x + 'px -' + entry.y + 'px';",
    "const cell = (window.__stickerAtlas && window.__stickerAtlas.cell) || 64;\n"
    "    span.style.backgroundPosition = 'calc(-' + entry.x + ' * 1.15em / ' + cell + ') calc(-' + entry.y + ' * 1.15em / ' + cell + ')';",
)

# Ensure --cell is set
if "setProperty('--cell'" not in t and 'setProperty("--cell"' not in t:
    t = t.replace(
        "document.documentElement.style.setProperty('--sheet-h', h + 'px');",
        "document.documentElement.style.setProperty('--sheet-h', h + 'px');\n"
        "    document.documentElement.style.setProperty('--cell', String(atlas.cell || 64));",
    )
    t = t.replace(
        'document.documentElement.style.setProperty("--sheet-h", h + "px");',
        'document.documentElement.style.setProperty("--sheet-h", h + "px");\n'
        '    document.documentElement.style.setProperty("--cell", String(atlas.cell || 64));',
    )

p.write_text(t)
print("html sticker size/sprite:", "1.15em" in t, "xhs-sticker-sprite" in t)

# Server env key
s = (root / "server.js").read_text()
for needle, insert_after in [
    ("async function getApiKey() {", "async function getApiKey() {\n  if (process.env.TYPESAFE_API_KEY) return process.env.TYPESAFE_API_KEY;\n  if (process.env.JEV_API_KEY) return process.env.JEV_API_KEY;"),
    ("async function loadApiKey() {", "async function loadApiKey() {\n  if (process.env.TYPESAFE_API_KEY) return process.env.TYPESAFE_API_KEY;\n  if (process.env.JEV_API_KEY) return process.env.JEV_API_KEY;"),
]:
    if needle in s and "TYPESAFE_API_KEY" not in s:
        s = s.replace(needle, insert_after, 1)
        print("wired env after", needle)
        break
else:
    print("env key status:", "TYPESAFE_API_KEY" in s)

# Export app for vercel if not already
if "export default app" not in s:
    # wrap listen
    if "app.listen(" in s and "VERCEL" not in s:
        s = s.replace(
            "const server = app.listen(",
            "export default app;\nif (!process.env.VERCEL) {\nconst server = app.listen(",
        )
        # close brace at end
        if not s.rstrip().endswith("}"):
            s = s.rstrip() + "\n}\n"
        else:
            # find last listen error block and add closing
            s = s + "\n}\n"
        print("wrapped listen for vercel")
(root / "server.js").write_text(s)

(root / "api").mkdir(exist_ok=True)
(root / "api" / "index.js").write_text("import app from '../server.js';\nexport default app;\n")
(root / "vercel.json").write_text("""{
  "version": 2,
  "builds": [
    { "src": "api/index.js", "use": "@vercel/node" },
    { "src": "public/**", "use": "@vercel/static" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "api/index.js" },
    { "src": "/(.*)", "dest": "/public/$1" }
  ]
}
""")

# package.json scripts
pkg = json.loads((root / "package.json").read_text())
pkg["name"] = "jev-xhs-emoji-demo"
pkg["private"] = False
pkg["description"] = "Xiaohongshu-style emoji prediction demo powered by TypeSafe Jev"
pkg["scripts"] = {
    "start": "node server.js",
    "build:sprites": "python3 scripts/build_sprites.py",
    "dev": "node server.js"
}
(root / "package.json").write_text(json.dumps(pkg, indent=2) + "\n")

# syntax check html script
html = p.read_text()
script = re.search(r"<script>([\\s\\S]*)</script>", html).group(1)
Path("/tmp/jev-check.js").write_text(script)
r = subprocess.run(["node", "--check", "/tmp/jev-check.js"], capture_output=True, text=True)
print("syntax", r.returncode, (r.stderr or "ok").strip()[:200])
print("plane in map", any(i["name"]=="飞机" for i in json.loads((root/"public/xhs-small/map.json").read_text())["items"]))
