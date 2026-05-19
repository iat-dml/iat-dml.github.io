(function () {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const W = 1100;
  const H = 720;
  const CX = W / 2;
  const CY = 360;
  const INNER_R = 140;
  const OUTER_R = 250;
  const OUTER_R_ACTIVE = 286;
  const HALF_SPAN = 56;

  const DEFAULT_COLORS = {
    support: "#2D6A4F",
    integration: "#C18F59",
    transfer: "#458484",
    tealDark: "#356259",
    slate: "#465555",
  };

  const CONTENT = {
    en: {
      title: "Three pillars of services",
      hint: "Click a petal to expand.",
      collapse: "\u2190 collapse",
      centerTitle: "Data & Modelling Infrastructure",
      centerSubtitle: "for Living Labs",
      pillarPrefix: "PILLAR",
      pillars: [
        {
          key: "support",
          label: "Support",
          angle: 210,
          tagline:
            "Supporting researchers to manage their research data and software over all the stages of their projects.",
          bullets: [
            "Data management plans",
            "Version control and software practice",
            "Archiving and FAIR publication",
            "Training and consulting",
          ],
        },
        {
          key: "transfer",
          label: "Transfer",
          angle: 330,
          tagline: "Closing the loop between science and practice.",
          bullets: [
            "Dashboards and web tools",
            "Stakeholder co-design",
            "Living Lab feedback loops",
            "Open science communication",
          ],
        },
        {
          key: "integration",
          label: "Integration",
          angle: 90,
          tagline:
            "Connecting research data and methods across working groups.",
          bullets: [
            "Shared data infrastructure",
            "Interoperable methods and models",
            "Cross-group workflows",
            "Common standards and schemas",
          ],
        },
      ],
    },
    de: {
      title: "Drei Säulen unseres Leistungsangebots",
      hint: "Klicken Sie auf ein Segment, um Details anzuzeigen.",
      collapse: "\u2190 einklappen",
      centerTitle: "Daten- & Modellierungsinfrastruktur",
      centerSubtitle: "für Living Labs",
      pillarPrefix: "SÄULE",
      pillars: [
        {
          key: "support",
          label: "Support",
          angle: 210,
          tagline:
            "Unterstützung für Forschende beim Management ihrer Forschungsdaten und Software über alle Projektphasen hinweg.",
          bullets: [
            "Datenmanagementpläne",
            "Versionskontrolle und Softwarepraxis",
            "Archivierung und FAIR-Veröffentlichung",
            "Schulungen und Beratung",
          ],
        },
        {
          key: "transfer",
          label: "Transfer",
          angle: 330,
          tagline:
            "Den Kreislauf zwischen Wissenschaft und Praxis schließen.",
          bullets: [
            "Dashboards und Web-Tools",
            "Co-Design mit Stakeholdern",
            "Living-Lab-Feedbackschleifen",
            "Kommunikation für Open Science",
          ],
        },
        {
          key: "integration",
          label: "Integration",
          angle: 90,
          tagline:
            "Verknüpfung von Forschungsdaten und Methoden über Arbeitsgruppen hinweg.",
          bullets: [
            "Gemeinsame Dateninfrastruktur",
            "Interoperable Methoden und Modelle",
            "Arbeitsgruppenübergreifende Workflows",
            "Gemeinsame Standards und Schemata",
          ],
        },
      ],
    },
  };

  function polar(cx, cy, r, deg) {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function annularSector(cx, cy, rIn, rOut, startA, endA) {
    const p1 = polar(cx, cy, rOut, startA);
    const p2 = polar(cx, cy, rOut, endA);
    const p3 = polar(cx, cy, rIn, endA);
    const p4 = polar(cx, cy, rIn, startA);
    const large = (endA - startA) % 360 > 180 ? 1 : 0;
    return [
      "M", p1.x, p1.y,
      "A", rOut, rOut, 0, large, 1, p2.x, p2.y,
      "L", p3.x, p3.y,
      "A", rIn, rIn, 0, large, 0, p4.x, p4.y,
      "Z",
    ].join(" ");
  }

  function createSvgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      el.setAttribute(key, String(value));
    });
    return el;
  }

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
      support: cssVar(style, "--dml-support", DEFAULT_COLORS.support),
      integration: cssVar(style, "--dml-integration", DEFAULT_COLORS.integration),
      transfer: cssVar(style, "--dml-transfer", DEFAULT_COLORS.transfer),
      tealDark: cssVar(style, "--dml-teal-dark", DEFAULT_COLORS.tealDark),
      slate: cssVar(style, "--dml-slate", DEFAULT_COLORS.slate),
    };
  }

  function panelAnchorX(key) {
    if (key === "support") {
      return 320;
    }
    if (key === "transfer") {
      return W - 320;
    }
    return CX;
  }

  function panelAnchorY(key) {
    return key === "integration" ? H - 140 : 200;
  }

  function mountDiagram(root) {
    const lang = root.dataset.lang === "de" ? "de" : "en";
    const colors = getColors(root);
    const content = {
      ...CONTENT[lang],
      pillars: CONTENT[lang].pillars.map(function (pillar) {
        return {
          ...pillar,
          color: colors[pillar.key] || DEFAULT_COLORS[pillar.key],
        };
      }),
    };
    let active = null;

    root.classList.add("dml-concept-diagram");
    root.innerHTML = "";

    const header = createEl("div", "dml-concept-diagram__header");
    const heading = createEl("div");
    heading.appendChild(createEl("div", "dml-concept-diagram__title", content.title));
    const hint = createEl("div", "dml-concept-diagram__hint");
    header.appendChild(heading);
    header.appendChild(hint);

    const svg = createSvgEl("svg", {
      class: "dml-concept-diagram__svg",
      viewBox: `0 0 ${W} ${H}`,
      "aria-hidden": "true",
    });

    const ring = createSvgEl("circle", {
      cx: CX,
      cy: CY,
      r: OUTER_R - 4,
      fill: "none",
      stroke: "rgba(53,98,89,0.08)",
      "stroke-width": 1,
      "stroke-dasharray": "3 5",
    });
    svg.appendChild(ring);

    const overlay = createEl("div", "dml-concept-diagram__overlay");

    const center = createEl("div", "dml-concept-diagram__center");
    center.appendChild(
      createEl("div", "dml-concept-diagram__center-title", content.centerTitle)
    );
    center.appendChild(
      createEl("div", "dml-concept-diagram__center-subtitle", content.centerSubtitle)
    );

    root.appendChild(header);
    root.appendChild(svg);
    root.appendChild(center);
    root.appendChild(overlay);

    function render() {
      hint.innerHTML = "";
      if (active) {
        const button = createEl("button", null, content.collapse);
        button.type = "button";
        button.addEventListener("click", function () {
          active = null;
          render();
        });
        hint.appendChild(button);
      } else {
        hint.textContent = content.hint;
      }

      while (svg.childNodes.length > 1) {
        svg.removeChild(svg.lastChild);
      }

      overlay.innerHTML = "";

      content.pillars.forEach((pillar, index) => {
        const isActive = active === pillar.key;
        const isDim = active && !isActive;
        const startA = pillar.angle - HALF_SPAN;
        const endA = pillar.angle + HALF_SPAN;
        const rOut = isActive ? OUTER_R_ACTIVE : OUTER_R;
        const labelR = (INNER_R + rOut) / 2;
        const labelPos = polar(CX, CY, labelR, pillar.angle);

        const group = createSvgEl("g", {
          opacity: isDim ? 0.3 : 1,
          tabindex: 0,
          role: "button",
          "aria-label": pillar.label,
        });
        group.style.cursor = "pointer";
        group.style.outline = "none";

        group.addEventListener("click", function () {
          active = isActive ? null : pillar.key;
          render();
        });
        group.addEventListener("mousedown", function () {
          group.blur();
        });
        group.addEventListener("keydown", function (event) {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            active = isActive ? null : pillar.key;
            render();
          }
        });

        if (isActive) {
          group.appendChild(
            createSvgEl("path", {
              d: annularSector(CX, CY, INNER_R - 8, rOut + 10, startA, endA),
              fill: pillar.color,
              opacity: 0.12,
            })
          );
        }

        group.appendChild(
          createSvgEl("path", {
            d: annularSector(CX, CY, INNER_R, rOut, startA, endA),
            fill: pillar.color,
          })
        );

        const labelSmall = createSvgEl("text", {
          x: labelPos.x,
          y: labelPos.y - 4,
          "text-anchor": "middle",
          "font-family": '"DM Sans", sans-serif',
          "font-size": 9.5,
          "font-weight": 700,
          "letter-spacing": 3,
          fill: "rgba(255,255,255,0.78)",
        });
        labelSmall.textContent = `${content.pillarPrefix} · ${index + 1}`;
        group.appendChild(labelSmall);

        const labelLarge = createSvgEl("text", {
          x: labelPos.x,
          y: labelPos.y + 20,
          "text-anchor": "middle",
          "font-family": '"DM Serif Display", serif',
          "font-size": 28,
          fill: "#fff",
        });
        labelLarge.textContent = pillar.label;
        group.appendChild(labelLarge);
        svg.appendChild(group);
      });

      if (!active) {
        return;
      }

      const pillar = content.pillars.find(function (item) {
        return item.key === active;
      });
      const anchor = polar(CX, CY, OUTER_R_ACTIVE + 30, pillar.angle);

      const lineSvg = createSvgEl("svg", {
        class: "dml-concept-diagram__overlay",
        viewBox: `0 0 ${W} ${H}`,
        "aria-hidden": "true",
      });
      lineSvg.appendChild(
        createSvgEl("line", {
          x1: anchor.x,
          y1: anchor.y,
          x2: panelAnchorX(pillar.key),
          y2: panelAnchorY(pillar.key),
          stroke: pillar.color,
          "stroke-width": 1,
          "stroke-dasharray": "3 4",
          opacity: 0.45,
        })
      );
      overlay.appendChild(lineSvg);

      const panel = createEl("div", "dml-concept-diagram__panel");
      panel.dataset.position = pillar.key;
      panel.style.borderTop = `4px solid ${pillar.color}`;

      const panelHeader = createEl("div", "dml-concept-diagram__panel-header");
      const badge = createEl("div", "dml-concept-diagram__panel-badge", String(
        content.pillars.findIndex(function (item) {
          return item.key === pillar.key;
        }) + 1
      ));
      badge.style.background = pillar.color;
      const panelLabel = createEl("div", "dml-concept-diagram__panel-label", pillar.label);
      panelLabel.style.color = pillar.color;
      panelHeader.appendChild(badge);
      panelHeader.appendChild(panelLabel);

      const panelTagline = createEl(
        "div",
        "dml-concept-diagram__panel-tagline",
        pillar.tagline
      );

      const list = createEl("ul", "dml-concept-diagram__panel-list");
      pillar.bullets.forEach(function (bullet) {
        const li = createEl("li");
        const dot = createEl("span", "dml-concept-diagram__panel-dot");
        dot.style.background = pillar.color;
        li.appendChild(dot);
        li.appendChild(document.createTextNode(bullet));
        list.appendChild(li);
      });

      panel.appendChild(panelHeader);
      panel.appendChild(panelTagline);
      panel.appendChild(list);
      overlay.appendChild(panel);
    }

    render();
  }

  function init() {
    const nodes = document.querySelectorAll("[data-dml-concept-diagram]");
    nodes.forEach(mountDiagram);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
