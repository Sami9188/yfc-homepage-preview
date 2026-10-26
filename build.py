#!/usr/bin/env python3
"""Builds the static site: wraps each page in src/pages with the shared head,
icons, header and footer from src/partials and writes it to the repo root.

Run:  python3 build.py          (every page)
      python3 build.py --live   (only the pages in LIVE, as published on main)
Each page starts with a meta comment:
<!--meta {"title": "...", "description": "...", "nav": "story"} -->
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
PARTIALS = SRC / "partials"
MORE = {"renu", "partnerships", "recognition", "contact"}
# Inner pages. In the homepage-only live build (python3 build.py --live), links to
# these pages either point at the matching homepage section (data-live-href) or
# show the "planned for the next phase" notice (data-soon).
INNER = {"our-story": "Our Story", "impact": "Impact and Stories", "solutions": "Solutions",
         "technology": "Technology", "industries": "Industries", "re-nu": "YFC Re-Nu",
         "partnerships": "Partnerships", "insights": "Insights", "recognition": "Recognition",
         "contact": "Contact"}
# Pages published on the live site (main). Add a page here to make it live.
LIVE = {"index", "our-story", "impact", "solutions"}
LINK = re.compile(r'<a\b[^>]*>')


def live_links(html, slug):
    """Rewrite links for the live build of page `slug`: links to live pages stay,
    links to pages that are not live yet go to the matching homepage section
    (data-live-href) or show the "next phase" notice."""
    home = "" if slug == "index" else "index.html"

    def fix(m):
        tag = m.group(0)
        href = re.search(r'href="([^"]*)"', tag)
        live = re.search(r' data-live-href="([^"]*)"', tag)
        soon = re.search(r' data-live-soon="([^"]*)"', tag)
        tag = re.sub(r' data-live-(href|soon)="[^"]*"', "", tag)
        if not href:
            return tag
        target = href.group(1)
        if target == "index.html" and slug == "index":
            return tag.replace('href="index.html"', 'href="#top"')
        page = re.match(r"([a-z-]+)\.html", target)
        if not page or page.group(1) not in INNER or page.group(1) in LIVE:
            return tag
        if page.group(1) == "contact":
            # Until the Contact page is live, enquiries use the homepage form,
            # keeping the enquiry type (?type=...) so the form opens on the right route.
            query = re.match(r"contact\.html(\?[^#]*)?", target).group(1) or ""
            return tag.replace(f'href="{target}"', f'href="{home}{query}#contact"')
        if live:
            return tag.replace(f'href="{target}"', f'href="{home}{live.group(1)}"')
        name = soon.group(1) if soon else INNER[page.group(1)]
        return tag.replace(f'href="{target}"', f'href="#" data-soon="{name}"')
    return LINK.sub(fix, html)


def strip_live(html):
    return re.sub(r' data-live-(href|soon)="[^"]*"', "", html)

HEAD = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{description}">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{og_description}">
  <meta property="og:image" content="{og}">
  <link rel="icon" href="assets/yfc-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,400;0,500;0,600;0,700;0,800;1,700;1,800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/styles.css">
  <link rel="stylesheet" href="css/pages.css">
</head>
<body class="page-{slug}">
"""


def read(p):
    return (PARTIALS / p).read_text()


def header_for(nav, slug):
    h = read("header.html")
    if slug == "index":
        h = h.replace("{{HOME_HREF}}", "#top").replace("{{CTA_HREF}}", "#contact").replace("{{CTA_ATTR}}", "")
    elif slug == "contact":
        h = h.replace("{{HOME_HREF}}", "index.html").replace("{{CTA_HREF}}", "#enquiry").replace("{{CTA_ATTR}}", " data-focus-form")
    else:
        h = h.replace("{{HOME_HREF}}", "index.html").replace("{{CTA_HREF}}", "contact.html#enquiry").replace("{{CTA_ATTR}}", ' data-live-href="#contact"')
    if nav:
        h = h.replace(f'data-nav="{nav}"', f'data-nav="{nav}" aria-current="page"', 1)
        parent = "more" if nav in MORE else nav if nav == "solutions" else None
        if parent:
            h = h.replace(f'data-nav="{parent}"', f'data-nav="{parent}" class="is-current"', 1)
    return h


def build(live=False):
    symbols = read("symbols.html")
    footer = read("footer.html")
    built = []
    for src in sorted((SRC / "pages").glob("*.html")):
        if src.name.startswith("_") or (live and src.stem not in LIVE):
            continue
        text = src.read_text()
        m = re.match(r"\s*<!--meta\s*(\{.*?\})\s*-->\s*", text, re.S)
        if not m:
            raise SystemExit(f"{src.name}: missing meta comment")
        meta = json.loads(m.group(1))
        body = text[m.end():].rstrip() + "\n"
        slug = src.stem
        head = HEAD.format(
            title=meta["title"],
            description=meta["description"],
            og_description=meta.get("og_description", meta["description"]),
            og=meta.get("og", "assets/hero-seedling-globe.jpg"),
            slug=slug,
        )
        page = (
            head + "\n" + symbols + "\n" + header_for(meta.get("nav"), slug) + "\n<main>\n\n" + body +
            "\n</main>\n\n" + footer + "\n<script src=\"js/main.js\" defer></script>\n<script src=\"js/pages.js\" defer></script>\n</body>\n</html>\n"
        )
        if live:
            page = live_links(page, slug).replace(
                f'<body class="page-{slug}">', f'<body class="page-{slug}" data-live-pages="{" ".join(sorted(LIVE))}">', 1)
        else:
            page = strip_live(page)
        (ROOT / f"{slug}.html").write_text(page)
        built.append(slug)
    print("built" + (" (live pages only)" if live else "") + ":", ", ".join(built))


if __name__ == "__main__":
    build(live="--live" in sys.argv)
