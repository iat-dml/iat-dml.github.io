"""Crop page 2 of the guidelines to the section the deck's guidelines slide
shows: the "WHAT THESE GUIDELINES COVER" heading and the eight topics under it.

Run after `quarto typst compile ... page-{p}.png --ppi 130` (see README.md).

The box is measured against the rendered page, not taken as fractions of it, so
it has to be re-derived whenever the document's text or the ppi changes. To
re-derive: find the rows that carry ink, and pick the widest edges that fall in
the blank gaps either side of the section.

    from PIL import Image
    im = Image.open("page-2.png").convert("RGB"); px = im.load()
    for y in range(im.height):
        if any(min(px[x, y]) < 200 for x in range(0, im.width, 2)):
            print(y)                      # then read off the runs

At 130 ppi the page is 1075x1520 and that gave:

  y 380   the paragraph above ends at 376 and the heading ink starts at 404,
          so 380 is the widest clean top edge
  y 978   the next heading ("WHO IS RESPONSIBLE") starts at 984
  x 24    keeps the page's own left margin, which the cover laps over on the
          slide -- crop tighter and the cover starts eating words
  x 990   the matching right margin; body ink ends at 910
"""
from PIL import Image

BOX = (24, 380, 990, 978)

crop = Image.open("page-2.png").crop(BOX)
crop.save("inside-crop.png")
print("inside-crop.png  %dx%d  aspect %.3f" % (*crop.size, crop.size[0] / crop.size[1]))
