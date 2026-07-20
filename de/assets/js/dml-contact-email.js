(function () {
  // Single source of truth for the "Discuss your project with us" contact
  // email. The hero / call-to-action buttons (marked with `.dml-contact`) and
  // the envelope icon in the navbar all have their `mailto:` href generated
  // from the template below, so the wording is only maintained in one place.
  //
  // The questions mirror the mandatory "Basic Information" fields of the
  // service-request issue template, so requests arrive with the same details
  // we capture when logging them as GitHub issues.
  const RECIPIENT = "iat-dml@zalf.de";

  const TEMPLATE = {
    en: {
      subject: "DML service request",
      body: [
        "Hello DML Working Group,",
        "",
        "I would like to request your support. A few basics about my request:",
        "",
        "Name(s): ",
        "Affiliation / institution (IAT research group / university): ",
        "Email: ",
        "Project name / title: ",
        "",
        "Short description (2-3 sentences on the nature of the request): ",
        "",
        "",
        "Service type (please delete those that do not apply):",
        "- Research Data Management",
        "- Research Software Support",
        "- Science Transfer / Communication",
        "- Training / Workshop",
        "- Other: ",
        "",
        "Thank you!",
      ],
    },
    de: {
      subject: "Anfrage für DML-Dienstleistung",
      body: [
        "Hallo DML-Arbeitsgruppe,",
        "",
        "ich möchte Ihre Unterstützung anfragen. Einige Eckdaten zu meiner Anfrage:",
        "",
        "Name(n): ",
        "Einrichtung / Institution (IAT-Forschungsgruppe / Universität): ",
        "E-Mail: ",
        "Projektname / Titel: ",
        "",
        "Kurzbeschreibung (2-3 Sätze zur Art der Anfrage): ",
        "",
        "",
        "Art der Leistung (Nichtzutreffendes bitte löschen):",
        "- Forschungsdatenmanagement",
        "- Unterstützung bei Forschungssoftware",
        "- Wissenstransfer / Kommunikation",
        "- Schulung / Workshop",
        "- Sonstiges: ",
        "",
        "Vielen Dank!",
      ],
    },
  };

  function buildMailto(lang) {
    const template = TEMPLATE[lang] || TEMPLATE.en;
    // CRLF line breaks (%0D%0A) for the widest mail-client compatibility,
    // including Outlook desktop.
    const subject = encodeURIComponent(template.subject);
    const body = encodeURIComponent(template.body.join("\r\n"));
    return "mailto:" + RECIPIENT + "?subject=" + subject + "&body=" + body;
  }

  function applyTemplate() {
    const lang = document.documentElement.lang === "de" ? "de" : "en";
    const href = buildMailto(lang);
    const nodes = document.querySelectorAll(
      "a.dml-contact, .navbar a[href^='mailto:']"
    );
    nodes.forEach(function (node) {
      node.setAttribute("href", href);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyTemplate);
  } else {
    applyTemplate();
  }
})();
