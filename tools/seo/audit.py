#!/usr/bin/env python3
"""Static indexability audit of every URL in sitemap.xml (no network, no JS).

Checks: file exists, one <title> (<=70 chars), meta description (<=200 chars),
canonical == sitemap URL, not noindex, one <h1>, og:image + twitter:card,
unique titles/descriptions, and reciprocal hreflang pairs. Exits 1 on problems.

    python3 tools/seo/audit.py
"""
import collections
import pathlib
import re
import sys
import xml.dom.minidom as minidom

ROOT = pathlib.Path(__file__).resolve().parents[2]
SITE = "https://www.mariocornejo.com"


def page_file(url):
    path = url[len(SITE):]
    if path.endswith("/"):
        path += "index.html"
    return ROOT / path.lstrip("/")


def main():
    doc = minidom.parse(str(ROOT / "sitemap.xml"))
    locs = [u.getElementsByTagName("loc")[0].firstChild.data for u in doc.getElementsByTagName("url")]
    issues, info = [], {}
    titles, descs = collections.Counter(), collections.Counter()
    for url in locs:
        f = page_file(url)
        if not f.exists():
            issues.append(f"{url}: no file at {f.relative_to(ROOT)}")
            continue
        s = f.read_text()
        title = re.search(r"<title>(.*?)</title>", s, re.S)
        title = title.group(1).strip() if title else None
        desc = re.search(r'<meta name="description" content="([^"]*)"', s)
        desc = desc.group(1) if desc else None
        canon = re.search(r'<link rel="canonical" href="([^"]*)"', s)
        canon = canon.group(1) if canon else None
        robots = re.search(r'<meta name="robots" content="([^"]*)"', s)
        alts = dict(re.findall(r'<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"', s))
        info[url] = alts
        titles[title] += 1
        descs[desc] += 1
        if not title:
            issues.append(f"{url}: no <title>")
        elif len(title) > 70:
            issues.append(f"{url}: title is {len(title)} chars")
        if not desc:
            issues.append(f"{url}: no meta description")
        elif len(desc) > 200:
            issues.append(f"{url}: description is {len(desc)} chars")
        if canon != url:
            issues.append(f"{url}: canonical is {canon}")
        if robots and "noindex" in robots.group(1):
            issues.append(f"{url}: noindex but listed in sitemap")
        if len(re.findall(r"<h1\b", s)) != 1:
            issues.append(f"{url}: expected exactly one <h1>")
        if 'og:image"' not in s:
            issues.append(f"{url}: no og:image")
        if "twitter:card" not in s:
            issues.append(f"{url}: no twitter:card")
    for url, alts in info.items():
        for lang, href in alts.items():
            other = info.get(href)
            if other is None:
                issues.append(f"{url}: hreflang {lang} -> {href} is not a sitemap URL")
            elif url not in other.values() or other.get("x-default") != alts.get("x-default"):
                issues.append(f"{url}: hreflang not reciprocal with {href}")
    issues += [f"duplicate title: {t}" for t, n in titles.items() if n > 1]
    issues += [f"duplicate description: {d[:60]}" for d, n in descs.items() if n > 1]
    print(f"{len(locs)} sitemap URLs checked")
    for i in issues:
        print("  -", i)
    if not issues:
        print("no issues")
    return 1 if issues else 0


if __name__ == "__main__":
    sys.exit(main())
