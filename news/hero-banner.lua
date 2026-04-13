-- hero-banner.lua
-- Reads the document's `image` YAML field and injects it as a JS global
-- (window.__articleHeroImage) so hero-article.html can apply it as the
-- title-block background without relying on an img element in the body.

function Pandoc(doc)
  local m = doc.meta
  if m.image then
    local imagePath = pandoc.utils.stringify(m.image)
    -- Escape backslashes and double-quotes for safe JS string embedding
    imagePath = imagePath:gsub('\\', '\\\\'):gsub('"', '\\"')
    local script = string.format(
      '<script>window.__articleHeroImage = "%s";</script>',
      imagePath
    )
    table.insert(doc.blocks, 1, pandoc.RawBlock('html', script))
  end
  return doc
end
