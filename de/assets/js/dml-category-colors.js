(function () {
  // Tag the three service-category badges (support / transfer / integration)
  // with a `dml-cat-<key>` class so scss/styles.scss can colour them with the
  // brand strata palette. Quarto renders category badges as plain text with
  // no per-category class, hence this small tagger.
  //
  // German equivalents map to the same key (and therefore the same colour).
  // All other categories are left untouched.
  const CATEGORY_KEYS = {
    support: "support",
    unterstützung: "support",
    transfer: "transfer",
    wissenstransfer: "transfer",
    integration: "integration",
  };

  function tagCategories(root) {
    const badges = (root || document).querySelectorAll(
      ".listing-category, .quarto-category"
    );
    badges.forEach(function (badge) {
      const key = CATEGORY_KEYS[badge.textContent.trim().toLowerCase()];
      if (key) {
        badge.classList.add("dml-cat-" + key);
      }
    });
  }

  function init() {
    tagCategories(document);

    // Quarto listings re-render their items on pagination, filtering and
    // category clicks (List.js), which recreates the badge elements — watch
    // each listing container and re-tag whatever appears.
    document.querySelectorAll(".quarto-listing").forEach(function (listing) {
      new MutationObserver(function () {
        tagCategories(listing);
      }).observe(listing, { childList: true, subtree: true });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
