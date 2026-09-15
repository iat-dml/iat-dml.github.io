// typst-show.typ
// Quarto partial: the #show rule that applies the template.

#show bibliography: it => context {
  if query(<iat-has-citations>).len() > 0 {
    it
  }
}

#show cite: it => [#metadata(true) <iat-has-citations>#it]

#show: content
