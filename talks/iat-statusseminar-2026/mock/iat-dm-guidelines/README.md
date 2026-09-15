# Mock document — IAT Data Management and Protection Guidelines

The guidelines themselves live in a separate repository (`git log` for
"Move data policy to seperate repo"). This directory holds only enough of the
document to render the two page images the deck shows on the guidelines slide:

| Asset | What it is |
|---|---|
| `assets/iat-dm-guidelines-cover.png` | Page 1, the cover, whole |
| `assets/iat-dm-guidelines-inside.png` | A crop of page 2: the section listing what the guidelines cover |

The slide composes them as a spread — see "Templates' other sibling" in
`css/deck.css` for the geometry and why a single A4 cover was not enough.

`_extensions/iat-internal/` is a copy of the IAT internal document template
(`iat-dml/templates/iat-internal-typst`), vendored so the pages render without
a network fetch. Refresh it with:

```bash
quarto use template iat-dml/templates/iat-internal-typst
```

## Rendering

`bibliography: []` in the front matter is not decoration: the repo-root
`_quarto.yml` sets a project bibliography, and the relative path Quarto writes
for it escapes Typst's project sandbox when the `.typ` is compiled straight to
PNG. Remove it and step 2 fails with "would escape the project root".

```bash
# 1. PDF, keeping the intermediate Typst source
quarto render iat-dm-guidelines.qmd -M keep-typ:true

# 2. Both pages to PNG, at roughly the width of the deck's other page assets
quarto typst compile iat-dm-guidelines.typ page-{p}.png --format png --ppi 130

# 3. Crop page 2 to the section the slide shows, and install both
python crop-inside.py
cp page-1.png     ../../assets/iat-dm-guidelines-cover.png
cp inside-crop.png ../../assets/iat-dm-guidelines-inside.png
```

Then delete `page-*.png`, `inside-crop.png`, `iat-dm-guidelines.typ` and
`iat-dm-guidelines.pdf`. All of them are regenerable, and only the two PNGs the
deck loads are committed.

### Why page 2 is cropped

The excerpt lands about 371px wide in a 640px card. A whole A4 page scaled into
that turns its body text into grey texture — the same reason the LCSfFE and
TRANSECT shots on their slide are hero crops rather than whole pages.

`crop-inside.py` holds the crop box and the reasoning behind each edge. It reads
`page-2.png` at 1075x1520 (A4 at 130 ppi), so **re-derive the box if you change
the ppi**, and re-derive it in any case if the document's text changes: the box
is measured against where that text landed, not against fractions of the page.

### One quirk of the template

The first body page gets the *plain* running header (just the title), not the
branded block with the logo, the rules and the author that
`iat-internal-theme.typ` places under `if page-num == 1`. The cover calls
`counter(page).update(0)` after its own `page()`, and the header of the page
that follows resolves the counter before that update lands, so it takes the
`else` branch. Harmless here — the crop is from the middle of the page — but
worth knowing if you ever want that header in a slide image. The fix belongs
upstream in the template repo, not in this vendored copy.
