// typst-template.typ
// Quarto partial: wires YAML front matter and _brand.yml into iat-internal().

#import "_extensions/iat-internal/iat-internal-theme.typ": iat-internal, accent, accent-upper

$if(brand-color)$
#let iat-green = brand-color.green
#let iat-green-light = brand-color.green-light
#let iat-green-mid = brand-color.green-mid
#let iat-teal = brand-color.teal
#let iat-teal-dark = brand-color.teal-dark
#let iat-olive = brand-color.olive
#let iat-sage = brand-color.sage
#let iat-slate = brand-color.slate
#let iat-white = brand-color.white
#let iat-black = brand-color.black
#let iat-paper = brand-color.paper
#let iat-gray-light = brand-color.gray-light
#let iat-gray = brand-color.gray
$else$
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
$endif$

$if(brand-typography-base)$
#let iat-font = "$brand-typography-base.family$"
$else$
#let iat-font = "Segoe UI"
$endif$

$if(cover-image)$
#let _cover-img = image("$cover-image$", width: 12.9cm, height: 8.41cm, fit: "cover")
$else$
#let _cover-img = none
$endif$

#let content = doc => {
  iat-internal(
    title: "$title$",
    date: "$date$",
    author: "$for(by-author)$$it.name.literal$$sep$, $endfor$",
    lang: "$lang$",
    cover-image: _cover-img,
    doc,
  )
}
