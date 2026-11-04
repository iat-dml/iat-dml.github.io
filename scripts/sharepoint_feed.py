"""Build sharepoint-feed.xml for the DML news flow on the IAT intranet.

Reads the news.xml and projects.xml feeds that Quarto writes into the rendered site and
writes one combined RSS feed that Power Automate's standard RSS connector can use. That
connector drops <media:content>, so each item's description starts with the image:

    <img src="https://iat-dml.github.io/assets/....png" />Short teaser text

and its single <category> is "DML News" or "DML Project", which the flow writes into the
SharePoint post's Topic header. The teaser is the article's meta description, or the start
of the item's text when the article has none.

Run after rendering:  python3 scripts/sharepoint_feed.py _site
"""

import html
import re
import sys
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from pathlib import Path

SITE_URL = "https://iat-dml.github.io"
FEEDS = [("news.xml", "DML News"), ("projects.xml", "DML Project")]
# Used when an item has no image, or only an SVG, which SharePoint can't use as a banner.
DEFAULT_IMAGE = f"{SITE_URL}/assets/hero-banner.png"
MEDIA = "{http://search.yahoo.com/mrss/}content"
TEASER_LENGTH = 250


def _plain(fragment: str) -> str:
    text = re.sub(r"<(script|style)\b.*?</\1>", " ", fragment, flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    return " ".join(html.unescape(text).split())


def _shorten(text: str) -> str:
    if len(text) <= TEASER_LENGTH:
        return text
    return text[: TEASER_LENGTH - 1].rsplit(" ", 1)[0] + "…"


def _teaser(site: Path, link: str, description: str) -> str:
    page = site / link.removeprefix(SITE_URL + "/")
    if page.is_file():
        match = re.search(r'<meta name="description" content="([^"]*)"', page.read_text(encoding="utf-8"))
        if match and match.group(1).strip():
            return _shorten(html.unescape(match.group(1)).strip())
    return _shorten(_plain(description))


def _image(item: ET.Element) -> str:
    media = item.find(MEDIA)
    url = media.get("url", "") if media is not None else ""
    if not url or url.lower().endswith(".svg"):
        return DEFAULT_IMAGE
    return url


def _cdata(text: str) -> str:
    return "<![CDATA[" + text.replace("]]>", "]]]]><![CDATA[>") + "]]>"


def build(site: Path) -> str:
    items = []
    for feed, label in FEEDS:
        for item in ET.parse(site / feed).getroot().iter("item"):
            link = (item.findtext("link") or "").strip()
            pub_date = (item.findtext("pubDate") or "").strip()
            items.append(
                {
                    "title": (item.findtext("title") or "").strip(),
                    "link": link,
                    "pubDate": pub_date,
                    "sort": parsedate_to_datetime(pub_date) if pub_date else None,
                    "label": label,
                    "image": _image(item),
                    "teaser": _teaser(site, link, item.findtext("description") or ""),
                }
            )
    items.sort(key=lambda i: (i["sort"] is not None, i["sort"]), reverse=True)
    out = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0">',
        "<channel>",
        "<title>DML news and projects (for SharePoint)</title>",
        f"<link>{SITE_URL}/</link>",
        "<description>News and projects of the DML service group, combined for the IAT intranet news flow.</description>",
    ]
    for i in items:
        description = f'<img src="{html.escape(i["image"], quote=True)}" />{i["teaser"]}'
        out += [
            "<item>",
            f"  <title>{html.escape(i['title'], quote=False)}</title>",
            f"  <link>{html.escape(i['link'], quote=False)}</link>",
            f'  <guid isPermaLink="true">{html.escape(i["link"], quote=False)}</guid>',
            f"  <pubDate>{i['pubDate']}</pubDate>" if i["pubDate"] else "",
            f"  <category>{i['label']}</category>",
            f"  <description>{_cdata(description)}</description>",
            "</item>",
        ]
    out += ["</channel>", "</rss>", ""]
    return "\n".join(line for line in out if line)


if __name__ == "__main__":
    site_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "_site")
    target = site_dir / "sharepoint-feed.xml"
    target.write_text(build(site_dir), encoding="utf-8")
    print(f"Wrote {target}")
