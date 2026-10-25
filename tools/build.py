"""Bundle the game into one self-contained HTML file.

Usage:
    python3 tools/build.py              -> dist/evoquest.html (a complete page you can open or share)
    python3 tools/build.py --fragment   -> dist/evoquest-fragment.html (no <html>/<head> wrapper, for hosts that add their own)

The bundle inlines css/style.css and every script listed in index.html, in the same order,
wrapped in one function so nothing leaks into the page's global scope.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(rel):
    # drop any ?v= cache-busting version from the path
    with open(os.path.join(ROOT, rel.split('?')[0]), encoding='utf-8') as f:
        return f.read()


def build(fragment=False):
    index = read('index.html')
    scripts = re.findall(r'<script\s+src="([^"]+)"\s*></script>', index)
    if not scripts:
        sys.exit('No <script src> tags found in index.html')
    js = '\n'.join(f'// ---- {s} ----\n' + read(s) for s in scripts)
    # The debug hook is only for automated tests; leave it out of the shared build.
    js = re.sub(r'\n// read-only window into the running game.*?\nwindow\.EvoQuestDebug = .*?\n};\n', '\n', js, flags=re.S)
    css = read('css/style.css')

    title = re.search(r'<title>(.*?)</title>', index, re.S).group(1).strip()
    fonts = re.search(r'href="(https://fonts\.googleapis\.com[^"]+)"', index).group(1)
    body = index[index.index('<body>') + 6:index.index('</body>')]
    body = re.sub(r'\s*<script\s+src="[^"]+"\s*></script>', '', body).strip()

    script = f'<script>\n(() => {{\n{js}\n}})();\n</script>'
    if fragment:
        out = (f'<title>{title}</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'
               f'<link rel="stylesheet" href="{fonts}">\n<style>\n{css}</style>\n{body}\n{script}\n')
        name = 'evoquest-fragment.html'
    else:
        out = (f'<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
               f'<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
               f'<title>{title}</title>\n<link rel="stylesheet" href="{fonts}">\n<style>\n{css}</style>\n</head>\n'
               f'<body>\n{body}\n{script}\n</body>\n</html>\n')
        name = 'evoquest.html'
    os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
    path = os.path.join(ROOT, 'dist', name)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(out)
    print(f'Wrote {os.path.relpath(path, ROOT)} ({len(out) // 1024} KB)')


if __name__ == '__main__':
    build(fragment='--fragment' in sys.argv)
