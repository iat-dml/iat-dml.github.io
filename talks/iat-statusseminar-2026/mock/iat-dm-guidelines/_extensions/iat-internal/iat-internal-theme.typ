// ============================================================
// IAT Internal Document theme
// Innovation Centre for Agricultural System Transformation
// ============================================================

// Fallback palette for standalone Typst use.
// When rendered through Quarto these bindings are shadowed from _brand.yml.
#let iat-green = rgb("#46A84F")
#let iat-green-light = rgb("#9EBC83")
#let iat-green-mid = rgb("#80BDBD")
#let iat-teal = rgb("#36AE6C")
#let iat-teal-dark = rgb("#356259")
#let iat-olive = rgb("#B1BE4D")
#let iat-sage = rgb("#657A4E")
#let iat-slate = rgb("#465555")
#let iat-white = rgb("#FFFFFF")
#let iat-black = rgb("#1A1A1A")
#let iat-paper = rgb("#F5F3EE")
#let iat-gray-light = rgb("#F5F5F5")
#let iat-gray = rgb("#6C6C6C")

#let iat-logo-path = "assets/logo-iat.png"
#let iat-footer-path = "assets/footer-light.png"

#let iat-cover(
  title: "Document Title",
  date: "",
  cover-image: none,
) = {
  page(
    paper: "a4",
    margin: (left: 0pt, right: 0pt, top: 0pt, bottom: 0pt),
    header: none,
    footer: none,
    {
      place(top + left, dx: 1.6cm, dy: 1.2cm,
        image(iat-logo-path, height: 2.2cm)
      )

      place(top + left, dy: 5.5cm,
        rect(width: 100%, height: 8.6cm, fill: iat-paper, stroke: none)
      )

      place(top + left, dx: 1.83cm, dy: 6.8cm,
        box(width: 100% - 3.66cm, {
          text(
            font: "Segoe UI",
            size: 22pt,
            weight: "semibold",
            fill: iat-teal-dark,
            title,
          )
          if date != "" {
            v(0.55em)
            text(
              font: "Segoe UI",
              size: 10pt,
              fill: iat-slate,
              date,
            )
          }
        })
      )

      if cover-image != none {
        place(top + center, dy: 10.15cm,
          box(
            width: 12.9cm,
            height: 8.41cm,
            clip: true,
            cover-image,
          )
        )
      }

      place(bottom + left, dx: 0cm, dy: 0cm,
        image(iat-footer-path, width: 21cm)
      )
    }
  )
  counter(page).update(0)
}

#let iat-header(title: "", date: "", author: "") = context {
  let page-num = counter(page).get().first()

  if page-num == 1 {
    place(top + left, dy: -5.55cm, {
      box(width: 100%, {
        grid(
          columns: (auto, 1fr),
          gutter: 0.8cm,
          image(iat-logo-path, height: 1.55cm),
          align(right, text(
            font: "Segoe UI",
            size: 9pt,
            fill: iat-slate,
            [Innovation Centre for Agricultural System Transformation],
          )),
        )
      })
    })

    place(top + left, dy: -3.95cm,
      line(length: 100%, stroke: 0.6pt + iat-green)
    )

    place(top + left, dy: -3.45cm, {
      box(width: 100%, {
        set text(font: "Segoe UI", size: 10pt, fill: iat-black)
        grid(
          columns: (1fr, auto),
          {
            text(size: 16pt, weight: "semibold", fill: iat-teal-dark)[#title]
          },
          {
            set align(right)
            text(fill: iat-slate, date)
          },
        )
        if author != "" {
          v(3pt)
          text(fill: iat-green, weight: "semibold")[#author]
        }
      })
    })

    place(top + left, dy: -2.4cm,
      line(length: 100%, stroke: 1.6pt + iat-teal-dark)
    )
  } else {
    set text(font: "Segoe UI", size: 10pt, fill: iat-black)
    text(title)
  }
}

#let iat-footer = context {
  let page-num = counter(page).get().first()

  align(center, image(iat-footer-path, width: 100%))
  v(0.1cm)
  align(center, text(font: "Segoe UI", size: 8pt, fill: iat-gray, str(page-num)))
}

#let iat-internal(
  title: "Document Title",
  date: "",
  author: "",
  lang: "en",
  cover-image: none,
  doc,
) = {
  iat-cover(title: title, date: date, cover-image: cover-image)

  set page(
    paper: "a4",
    margin: (
      left: 1.83cm,
      right: 2.96cm,
      top: 3.5cm,
      bottom: 2.35cm,
    ),
    header: iat-header(title: title, date: date, author: author),
    footer: iat-footer,
  )

  set text(
    font: "Segoe UI",
    size: 10pt,
    fill: iat-black,
    lang: lang,
  )

  set par(
    justify: false,
    leading: 0.75em,
    spacing: 1.2em,
  )

  show heading.where(level: 1): it => block({
    v(0.8em, weak: true)
    text(font: "Segoe UI", weight: "semibold", size: 22pt, fill: iat-teal-dark, upper(it.body))
    v(0.3em, weak: true)
  })

  show heading.where(level: 2): it => block({
    v(0.6em, weak: true)
    text(font: "Segoe UI", size: 16pt, fill: iat-teal-dark, upper(it.body))
    v(0.3em, weak: true)
  })

  show heading.where(level: 3): it => block({
    v(0.5em, weak: true)
    text(font: "Segoe UI", size: 14pt, fill: iat-teal-dark, upper(it.body))
    v(0.25em, weak: true)
  })

  show heading.where(level: 4): it => block({
    v(0.4em, weak: true)
    text(font: "Segoe UI", size: 10pt, weight: "semibold", fill: iat-slate, it.body)
    v(0.2em, weak: true)
  })

  show figure.caption: it => {
    text(font: "Segoe UI", size: 9pt, weight: "semibold", fill: iat-teal-dark, it)
  }

  set footnote.entry(
    separator: line(length: 30%, stroke: 0.5pt + iat-gray-light),
  )
  show footnote.entry: set text(size: 8pt)

  set list(
    indent: 1em,
    body-indent: 0.5em,
    marker: ([#text(20pt, fill: iat-green, baseline: -4pt)[-]], [#text(fill: iat-teal-dark)[>]]),
  )

  set enum(
    indent: 1em,
    body-indent: 0.5em,
  )

  set table(
    stroke: (x, y) => (
      top: 0.4pt + iat-gray-light,
      bottom: if y == 0 { 2.2pt + iat-green } else { 0.4pt + iat-gray-light },
      left: none,
      right: none,
    ),
    fill: (x, y) =>
      if y == 0 { iat-white }
      else if calc.odd(y) { iat-paper }
      else { iat-white },
  )

  show table.header: set text(fill: iat-black, weight: "bold", size: 9pt)
  set table.cell(inset: (x: 6pt, y: 5pt))
  show table: set text(size: 9pt)

  show raw.where(block: true): it => block(
    fill: iat-gray-light,
    stroke: (left: 3pt + iat-green),
    inset: (left: 10pt, right: 8pt, top: 6pt, bottom: 6pt),
    radius: 2pt,
    width: 100%,
    it,
  )

  show raw.where(block: false): it => box(
    fill: iat-gray-light,
    inset: (x: 3pt, y: 1pt),
    radius: 2pt,
    it,
  )

  doc
}

#let accent(body) = text(fill: iat-green, weight: "semibold", body)
#let accent-upper(body) = text(fill: iat-teal-dark, weight: "semibold", upper(body))
