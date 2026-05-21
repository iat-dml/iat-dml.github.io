(function () {
  const DEFAULT_COLORS = {
    paper: "#F5F3EE",
    support: "#2D6A4F",
    integration: "#C18F59",
    transfer: "#458484",
    tealDark: "#356259",
    slate: "#465555",
    muted: "#6C706D",
  };

  const CONTENT = {
    en: {
      title: "Support tiers for our services",
      intro:
        "Choose the level of collaboration that fits your question, project timeline, and expected level of involvement.",
      hint: "Click a tier to expand the details.",
      collapse: "Hide details",
      tierPrefix: "Tier",
      effortLabel: "Typical commitment",
      examplesLabel: "Examples",
      expectationLabel: "What this usually involves",
      tiers: [
        {
          key: "support",
          step: "01",
          label: "Light-touch consultation",
          effort: "Hours to a few days",
          summary:
            "Quick advice for well-scoped questions where a short exchange or one follow-up is enough to unblock the next step.",
          expectation:
            "Best for orientation, quick feedback, and early-stage problem framing without a longer delivery commitment.",
          bullets: [
            "Consultations on data management or workflow choices",
            "Quick advice on tools, standards, and next steps",
            "Pointers to relevant resources, templates, or contacts",
          ],
        },
        {
          key: "integration",
          step: "02",
          label: "Direct assistance",
          effort: "Days to several weeks",
          summary:
            "Hands-on support when implementation work is needed, such as improving software, preparing data, or translating research outputs into usable products.",
          expectation:
            "Suited to scoped support tasks with agreed deliverables, shared coordination, and active exchange during the work.",
          bullets: [
            "Research software support and workflow improvements",
            "Data assistance, curation, and preparation for reuse",
            "Science transfer outputs such as dashboards or web tools",
          ],
        },
        {
          key: "transfer",
          step: "03",
          label: "Structured project support",
          effort: "Months or longer collaboration",
          summary:
            "Embedded collaboration for larger initiatives where our contribution becomes part of the project structure rather than an isolated support request.",
          expectation:
            "Usually planned as a formal collaboration with in-kind funding for support and, where appropriate, co-authorship or comparable recognition.",
          bullets: [
            "Longer-term collaboration across a project lifecycle",
            "Joint planning of methods, infrastructure, or transfer outputs",
            "Shared responsibility for delivery, documentation, and visibility",
          ],
        },
      ],
    },
    de: {
      title: "Unterstützungsstufen unserer Leistungen",
      intro:
        "Wählen Sie die Form der Zusammenarbeit, die zu Ihrer Frage, Ihrem Projektzeitraum und dem gewünschten Unterstützungsgrad passt.",
      hint: "Klicken Sie auf eine Stufe, um die Details zu öffnen.",
      collapse: "Details ausblenden",
      tierPrefix: "Stufe",
      effortLabel: "Typischer Aufwand",
      examplesLabel: "Beispiele",
      expectationLabel: "Was das in der Regel bedeutet",
      tiers: [
        {
          key: "support",
          step: "01",
          label: "Kurzberatung",
          effort: "Stunden bis wenige Tage",
          summary:
            "Schnelle Beratung für klar umrissene Fragen, bei denen ein kurzer Austausch oder eine einzelne Rückmeldung ausreicht, um den nächsten Schritt zu ermöglichen.",
          expectation:
            "Geeignet für Orientierung, schnelles Feedback und frühe Problemklärung ohne längerfristige Umsetzungsverpflichtung.",
          bullets: [
            "Beratung zu Datenmanagement oder Workflow-Entscheidungen",
            "Kurze Hinweise zu Tools, Standards und nächsten Schritten",
            "Verweise auf passende Ressourcen, Vorlagen oder Kontakte",
          ],
        },
        {
          key: "integration",
          step: "02",
          label: "Direkte Unterstützung",
          effort: "Tage bis mehrere Wochen",
          summary:
            "Praktische Unterstützung, wenn konkrete Umsetzungsarbeit nötig ist, etwa bei Software, Datenaufbereitung oder dem Transfer von Forschungsergebnissen in nutzbare Produkte.",
          expectation:
            "Geeignet für klar abgegrenzte Unterstützungsaufgaben mit abgestimmten Ergebnissen, gemeinsamer Koordination und aktivem Austausch während der Umsetzung.",
          bullets: [
            "Support für Forschungssoftware und Verbesserungen von Workflows",
            "Datenunterstützung, Kuratierung und Aufbereitung zur Nachnutzung",
            "Transferformate wie Dashboards oder Web-Tools",
          ],
        },
        {
          key: "transfer",
          step: "03",
          label: "Strukturierte Projektbegleitung",
          effort: "Monate oder längere Zusammenarbeit",
          summary:
            "Eingebettete Zusammenarbeit für größere Vorhaben, bei denen unser Beitrag Teil der Projektstruktur wird und nicht nur eine einzelne Unterstützungsanfrage bleibt.",
          expectation:
            "In der Regel als formalisierte Zusammenarbeit mit In-kind-Finanzierung für den Support und, wo angemessen, Co-Autorenschaft oder vergleichbarer Anerkennung geplant.",
          bullets: [
            "Längerfristige Zusammenarbeit über den gesamten Projektverlauf",
            "Gemeinsame Planung von Methoden, Infrastruktur oder Transferformaten",
            "Geteilte Verantwortung für Umsetzung, Dokumentation und Sichtbarkeit",
          ],
        },
      ],
    },
  };

  function createEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) {
      el.className = className;
    }
    if (typeof text === "string") {
      el.textContent = text;
    }
    return el;
  }

  function cssVar(style, name, fallback) {
    const value = style.getPropertyValue(name).trim();
    return value || fallback;
  }

  function getColors(root) {
    const style = getComputedStyle(root);
    return {
      paper: cssVar(style, "--dml-paper", DEFAULT_COLORS.paper),
      support: cssVar(style, "--dml-support", DEFAULT_COLORS.support),
      integration: cssVar(style, "--dml-integration", DEFAULT_COLORS.integration),
      transfer: cssVar(style, "--dml-transfer", DEFAULT_COLORS.transfer),
      tealDark: cssVar(style, "--dml-teal-dark", DEFAULT_COLORS.tealDark),
      slate: cssVar(style, "--dml-slate", DEFAULT_COLORS.slate),
      muted: cssVar(style, "--dml-muted", DEFAULT_COLORS.muted),
    };
  }

  function mountDiagram(root) {
    const lang = root.dataset.lang === "de" ? "de" : "en";
    const colors = getColors(root);
    const content = {
      ...CONTENT[lang],
      tiers: CONTENT[lang].tiers.map(function (tier) {
        return {
          ...tier,
          color: colors[tier.key] || colors.tealDark,
        };
      }),
    };
    let active = null;

    root.classList.add("dml-support-tiers");
    root.innerHTML = "";

    const header = createEl("div", "dml-support-tiers__header");
    const headerCopy = createEl("div", "dml-support-tiers__header-copy");
    headerCopy.appendChild(createEl("div", "dml-support-tiers__title", content.title));
    headerCopy.appendChild(createEl("p", "dml-support-tiers__intro", content.intro));
    const hint = createEl("div", "dml-support-tiers__hint", content.hint);
    header.appendChild(headerCopy);
    header.appendChild(hint);

    const steps = createEl("div", "dml-support-tiers__steps");
    const detail = createEl("div", "dml-support-tiers__detail");

    root.appendChild(header);
    root.appendChild(steps);
    root.appendChild(detail);

    function render() {
      steps.innerHTML = "";
      detail.innerHTML = "";

      content.tiers.forEach(function (tier, index) {
        const isActive = active === tier.key;
        const button = createEl("button", "dml-support-tiers__step");
        button.type = "button";
        button.dataset.step = String(index + 1);
        button.dataset.state = isActive ? "active" : "idle";
        button.style.setProperty("--tier-color", tier.color);
        button.setAttribute("aria-expanded", isActive ? "true" : "false");

        const eyebrow = createEl(
          "div",
          "dml-support-tiers__eyebrow",
          `${content.tierPrefix} ${tier.step}`
        );
        const label = createEl("div", "dml-support-tiers__label", tier.label);
        const effort = createEl("div", "dml-support-tiers__effort");
        effort.appendChild(createEl("span", "dml-support-tiers__effort-label", content.effortLabel));
        effort.appendChild(createEl("strong", "dml-support-tiers__effort-value", tier.effort));

        const pips = createEl("div", "dml-support-tiers__pips");
        for (let i = 0; i < 3; i += 1) {
          const pip = createEl("span", "dml-support-tiers__pip");
          if (i <= index) {
            pip.dataset.on = "true";
          }
          pips.appendChild(pip);
        }

        effort.appendChild(pips);
        button.appendChild(eyebrow);
        button.appendChild(label);
        button.appendChild(effort);
        button.addEventListener("click", function () {
          active = isActive ? null : tier.key;
          render();
        });
        steps.appendChild(button);
      });

      if (!active) {
        hint.textContent = content.hint;
        return;
      }

      const tier = content.tiers.find(function (item) {
        return item.key === active;
      });
      hint.textContent = content.collapse;

      const panel = createEl("section", "dml-support-tiers__panel");
      panel.style.setProperty("--tier-color", tier.color);

      const panelHeader = createEl("div", "dml-support-tiers__panel-header");
      const badge = createEl("div", "dml-support-tiers__badge", tier.step);
      const titleWrap = createEl("div", "dml-support-tiers__panel-copy");
      titleWrap.appendChild(createEl("div", "dml-support-tiers__panel-label", tier.label));
      titleWrap.appendChild(createEl("p", "dml-support-tiers__panel-summary", tier.summary));
      panelHeader.appendChild(badge);
      panelHeader.appendChild(titleWrap);

      const meta = createEl("div", "dml-support-tiers__meta");
      const commitment = createEl("div", "dml-support-tiers__meta-card");
      commitment.appendChild(createEl("div", "dml-support-tiers__meta-kicker", content.effortLabel));
      commitment.appendChild(createEl("div", "dml-support-tiers__meta-value", tier.effort));

      const expectation = createEl("div", "dml-support-tiers__meta-card");
      expectation.appendChild(
        createEl("div", "dml-support-tiers__meta-kicker", content.expectationLabel)
      );
      expectation.appendChild(createEl("p", "dml-support-tiers__meta-text", tier.expectation));

      meta.appendChild(commitment);
      meta.appendChild(expectation);

      const examples = createEl("div", "dml-support-tiers__examples");
      examples.appendChild(createEl("div", "dml-support-tiers__meta-kicker", content.examplesLabel));
      const list = createEl("ul", "dml-support-tiers__list");
      tier.bullets.forEach(function (bullet) {
        const li = createEl("li");
        const dot = createEl("span", "dml-support-tiers__dot");
        dot.style.background = tier.color;
        li.appendChild(dot);
        li.appendChild(document.createTextNode(bullet));
        list.appendChild(li);
      });
      examples.appendChild(list);

      panel.appendChild(panelHeader);
      panel.appendChild(meta);
      panel.appendChild(examples);
      detail.appendChild(panel);
    }

    render();
  }

  function init() {
    const nodes = document.querySelectorAll("[data-dml-support-tiers]");
    nodes.forEach(mountDiagram);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
