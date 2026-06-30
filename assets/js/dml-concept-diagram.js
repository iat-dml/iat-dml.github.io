(function () {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const XHTML_NS = "http://www.w3.org/1999/xhtml";

  /* Canvas + disc geometry (one 1260×720 coordinate space) */
  const W = 1260;
  const H = 720;
  const CX = 630;
  const CY = 372;
  const R = 220;
  const DISC_LEFT = CX - R;
  const DISC_TOP = CY - R;
  const DISC_SIZE = R * 2;
  const SCALE = DISC_SIZE / 200;

  /* Deep-soil palette — overridable per site via CSS custom properties. */
  const DEFAULT_COLORS = {
    support: "#2B5D45",      // top band   · green
    transfer: "#3E7775",     // mid band   · teal
    integration: "#A4713D",  // ground band· earth
    tealDark: "#356259",
    slate: "#465555",
    paper: "#F5F3EE",
  };

  /* Strata geometry (disc-local viewBox 0 0 200 200, r76 @ 100,100) —
     identical seam curves to the production logo. */
  const SEAM1 = "M 14 84 C 58 68, 122 98, 186 78";
  const SEAM2 = "M 14 124 C 70 138, 134 112, 186 126";
  const BAND_B = SEAM1 + " L 186 188 L 14 188 Z";
  const BAND_C = SEAM2 + " L 186 188 L 14 188 Z";
  const REGION = {
    support: "M 14 84 C 58 68, 122 98, 186 78 L 186 8 L 14 8 Z",
    transfer: "M 14 84 C 58 68, 122 98, 186 78 L 186 126 C 134 112, 70 138, 14 124 Z",
    integration: "M 14 124 C 70 138, 134 112, 186 126 L 186 192 L 14 192 Z",
  };
  const LABEL_Y = { support: 50, transfer: 104, integration: 152 };

  /* Panels — Support & Integration expand right, Transfer expands left. */
  const PANEL_W = 332;
  const PANEL_MARGIN = 44;
  const PANEL_SIDE = { support: "right", transfer: "left", integration: "right" };
  const PANEL_TOP = { support: 112, transfer: 276, integration: 440 };

  const CONTENT = {
    en: {
      kicker: "IAT Service Working Group",
      title: "Three strata of services",
      hint: "Click a stratum to expand.",
      collapse: "\u2190 collapse",
      centerTitle: "Data & Modelling Infrastructure",
      centerSubtitle: "for Living Labs",
      pillars: [
        {
          key: "support",
          label: "Support",
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
      kicker: "IAT Service-Arbeitsgruppe",
      title: "Drei Schichten unseres Leistungsangebots",
      hint: "Klicken Sie auf eine Schicht, um Details anzuzeigen.",
      collapse: "\u2190 einklappen",
      centerTitle: "Daten- & Modellierungsinfrastruktur",
      centerSubtitle: "für Living Labs",
      pillars: [
        {
          key: "support",
          label: "Support",
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

  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, String(v)));
    return el;
  }

  function htmlEl(tag, style, text) {
    const el = document.createElementNS(XHTML_NS, tag);
    if (style) el.setAttribute("style", style);
    if (typeof text === "string") el.textContent = text;
    return el;
  }

  function svgText(attrs, text) {
    const el = svgEl("text", attrs);
    el.textContent = text;
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
      transfer: cssVar(style, "--dml-transfer", DEFAULT_COLORS.transfer),
      integration: cssVar(style, "--dml-integration", DEFAULT_COLORS.integration),
      tealDark: cssVar(style, "--dml-teal-dark", DEFAULT_COLORS.tealDark),
      slate: cssVar(style, "--dml-slate", DEFAULT_COLORS.slate),
      paper: cssVar(style, "--dml-paper", DEFAULT_COLORS.paper),
    };
  }

  /* ── Colour utilities (theme-aware light/dark surfaces) ── */
  function parseColor(str) {
    if (!str) return null;
    str = String(str).trim();
    if (str[0] === "#") {
      let h = str.slice(1);
      if (h.length === 3) h = h.split("").map((c) => c + c).join("");
      const n = parseInt(h, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    const m = str.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const p = m[1].split(",").map((s) => parseFloat(s));
      return { r: p[0], g: p[1], b: p[2] };
    }
    return null;
  }
  function relLum(c) {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  function mix(a, b, t) {
    return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
  }
  function rgbStr(c) {
    return "rgb(" + Math.round(c.r) + ", " + Math.round(c.g) + ", " + Math.round(c.b) + ")";
  }
  const WHITE = { r: 255, g: 255, b: 255 };

  /* Build a light/dark surface palette from the resolved background.
     Honours --dml-surface / --dml-ink / --dml-body / --dml-muted / --dml-line
     if the site sets them, otherwise derives a sensible pair. */
  function getTheme(root, colors, bg) {
    const style = getComputedStyle(root);
    const bgc = parseColor(bg) || { r: 245, g: 243, b: 238 };
    const isDark = relLum(bgc) < 0.4;
    const fb = isDark
      ? {
          surface: rgbStr(mix(bgc, WHITE, 0.09)),
          ink: "rgba(245,243,238,0.92)",
          body: "rgba(245,243,238,0.70)",
          muted: "rgba(245,243,238,0.48)",
          line: "rgba(245,243,238,0.26)",
          shadow: "0 14px 34px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.30)",
        }
      : {
          surface: "#ffffff",
          ink: colors.tealDark,
          body: colors.slate,
          muted: "#7A817E",
          line: "rgba(70,85,85,0.32)",
          shadow: "0 12px 32px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)",
        };
    return {
      isDark: isDark,
      surface: cssVar(style, "--dml-surface", fb.surface),
      ink: cssVar(style, "--dml-ink", fb.ink),
      body: cssVar(style, "--dml-body", fb.body),
      muted: cssVar(style, "--dml-muted", fb.muted),
      line: cssVar(style, "--dml-line", fb.line),
      shadow: fb.shadow,
    };
  }

  /* Resolve the effective background colour behind the diagram by walking
     up the DOM until a non-transparent background is found. This lets the
     seams / disc edge match the page (paper on light, dark in dark mode)
     instead of a hard-coded white. Falls back to the --dml-paper value. */
  function resolveBackground(el) {
    let node = el;
    while (node && node.nodeType === 1) {
      const c = getComputedStyle(node).backgroundColor;
      if (c && c !== "transparent" && !/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/.test(c)) {
        return c;
      }
      node = node.parentElement;
    }
    return null;
  }

  /* Re-render every mounted diagram (used when the site toggles theme). */
  const RENDERERS = [];
  function rerenderAll() { RENDERERS.forEach(function (fn) { fn(); }); }
  let themeListenersBound = false;
  function bindThemeListeners() {
    if (themeListenersBound) return;
    themeListenersBound = true;
    if (window.matchMedia) {
      try {
        window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", rerenderAll);
      } catch (e) { /* older browsers */ }
    }
    const watch = { attributes: true, attributeFilter: ["class", "style", "data-theme", "data-bs-theme", "data-mode"] };
    const obs = new MutationObserver(rerenderAll);
    if (document.documentElement) obs.observe(document.documentElement, watch);
    if (document.body) obs.observe(document.body, watch);
  }

  const bandScreenY = (key) => DISC_TOP + LABEL_Y[key] * SCALE;
  const edgeX = (sy, side) => {
    const dy = sy - CY;
    const dx = Math.sqrt(Math.max(0, R * R - dy * dy));
    return side === "left" ? CX - dx : CX + dx;
  };
  const panelLeftFor = (key) =>
    PANEL_SIDE[key] === "left" ? PANEL_MARGIN : W - PANEL_MARGIN - PANEL_W;

  function mountDiagram(root) {
    const lang = root.dataset.lang === "de" ? "de" : "en";
    const colors = getColors(root);
    const base = CONTENT[lang] || CONTENT.en;
    const content = {
      ...base,
      pillars: base.pillars.map(function (pillar) {
        return { ...pillar, color: colors[pillar.key] || DEFAULT_COLORS[pillar.key] };
      }),
    };
    const order = content.pillars.map((p) => p.key);

    let active = null;

    root.classList.add("dml-concept-diagram");
    root.innerHTML = "";
    root.style.position = "relative";
    root.style.width = "100%";
    root.style.maxWidth = W + "px";
    root.style.margin = "0 auto";

    const svg = svgEl("svg", {
      viewBox: `0 0 ${W} ${H}`,
      width: "100%",
      role: "group",
      "aria-label": content.title,
    });
    svg.style.display = "block";
    svg.style.width = "100%";
    svg.style.height = "auto";
    svg.style.fontFamily = '"DM Sans", "Segoe UI", system-ui, sans-serif';
    root.appendChild(svg);

    function setActive(key) { active = key; render(); }

    function render() {
      const bg = resolveBackground(root) || colors.paper;
      const theme = getTheme(root, colors, bg);
      // lighten a brand colour so it stays legible as text on a dark surface
      const accent = (c) => theme.isDark
        ? rgbStr(mix(parseColor(c) || WHITE, WHITE, 0.5))
        : c;
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      /* ── Header ── */
      svg.appendChild(svgText({
        x: PANEL_MARGIN, y: 66, "font-size": 33,
        "font-family": '"DM Serif Display", Georgia, serif', fill: theme.ink,
      }, content.title));

      /* ── Hint / collapse (top-right) ── */
      const hint = svgText({
        x: W - PANEL_MARGIN, y: 50, "text-anchor": "end",
        "font-size": 14, fill: active ? theme.ink : theme.muted,
        "font-weight": active ? 600 : 400,
      }, active ? content.collapse : content.hint);
      if (active) {
        hint.style.cursor = "pointer";
        hint.setAttribute("role", "button");
        hint.setAttribute("tabindex", 0);
        const collapse = function () { setActive(null); };
        hint.addEventListener("click", collapse);
        hint.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); collapse(); }
        });
      }
      svg.appendChild(hint);

      /* ── Connector line (drawn before the disc/panel) ── */
      if (active) {
        const p = content.pillars.find((x) => x.key === active);
        const side = PANEL_SIDE[active];
        const sy = bandScreenY(active);
        const ex = edgeX(sy, side);
        const px = side === "left" ? PANEL_MARGIN + PANEL_W : panelLeftFor(active);
        svg.appendChild(svgEl("line", {
          x1: ex, y1: sy, x2: px, y2: sy,
          stroke: theme.line, "stroke-width": 1.5, "stroke-dasharray": "3 4",
        }));
        svg.appendChild(svgEl("circle", { cx: ex, cy: sy, r: 3.5, fill: accent(p.color) }));
      }

      /* ── The strata mark (nested svg so it scales with the canvas) ── */
      const disc = svgEl("svg", {
        x: DISC_LEFT, y: DISC_TOP, width: DISC_SIZE, height: DISC_SIZE,
        viewBox: "0 0 200 200",
      });

      const defs = svgEl("defs", {});
      const clip = svgEl("clipPath", { id: "dmlStDisc" });
      clip.appendChild(svgEl("circle", { cx: 100, cy: 100, r: 76 }));
      const filter = svgEl("filter", { id: "dmlStShadow", x: "-30%", y: "-30%", width: "160%", height: "160%" });
      filter.appendChild(svgEl("feDropShadow", { dx: 0, dy: 6, stdDeviation: 9, "flood-color": "#2E544B", "flood-opacity": 0.16 }));
      defs.appendChild(clip);
      defs.appendChild(filter);
      disc.appendChild(defs);

      disc.appendChild(svgEl("circle", { cx: 100, cy: 100, r: 76, fill: bg, filter: "url(#dmlStShadow)" }));

      const g = svgEl("g", { "clip-path": "url(#dmlStDisc)" });
      // base painted strata (visual only)
      g.appendChild(svgEl("circle", { cx: 100, cy: 100, r: 76, fill: colors.support, "pointer-events": "none" }));
      g.appendChild(svgEl("path", { d: BAND_B, fill: colors.transfer, "pointer-events": "none" }));
      g.appendChild(svgEl("path", { d: BAND_C, fill: colors.integration, "pointer-events": "none" }));
      g.appendChild(svgEl("path", { d: SEAM1, fill: "none", stroke: bg, "stroke-width": 5, "stroke-linecap": "round", "pointer-events": "none" }));
      g.appendChild(svgEl("path", { d: SEAM2, fill: "none", stroke: bg, "stroke-width": 5, "stroke-linecap": "round", "pointer-events": "none" }));

      // interactive region veils + click targets
      content.pillars.forEach((p) => {
        const isActive = active === p.key;
        const dim = active && !isActive;
        const path = svgEl("path", {
          d: REGION[p.key],
          fill: bg, "fill-opacity": dim ? 0.5 : 0,
          stroke: "none", "stroke-width": 0,
          tabindex: 0, role: "button", "aria-label": p.label,
        });
        path.style.cursor = "pointer";
        path.style.outline = "none";
        path.style.transition = "fill-opacity 0.3s";
        path.addEventListener("click", function () { setActive(isActive ? null : p.key); });
        path.addEventListener("mouseenter", function () {
          if (!active) { path.setAttribute("fill", "#FFFFFF"); path.setAttribute("fill-opacity", "0.16"); }
        });
        path.addEventListener("mouseleave", function () {
          if (!active) { path.setAttribute("fill", bg); path.setAttribute("fill-opacity", "0"); }
        });
        path.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActive(isActive ? null : p.key); }
        });
        g.appendChild(path);
      });

      // band labels (non-interactive)
      content.pillars.forEach((p) => {
        const dim = active && active !== p.key;
        const label = svgText({
          x: 100, y: LABEL_Y[p.key] + 5, "text-anchor": "middle",
          "font-family": '"DM Serif Display", Georgia, serif', "font-size": 14,
          fill: "#FFFFFF", "pointer-events": "none", opacity: dim ? 0.4 : 1,
        }, p.label);
        label.style.transition = "opacity 0.3s";
        g.appendChild(label);
      });

      disc.appendChild(g);
      svg.appendChild(disc);

      /* ── Caption under the disc ── */
      svg.appendChild(svgText({
        x: CX, y: DISC_TOP + DISC_SIZE + 32, "text-anchor": "middle",
        "font-family": '"DM Serif Display", Georgia, serif', "font-size": 21, fill: theme.ink,
      }, content.centerTitle));
      svg.appendChild(svgText({
        x: CX, y: DISC_TOP + DISC_SIZE + 56, "text-anchor": "middle",
        "font-size": 10, "letter-spacing": 2.4, "font-weight": 600, fill: theme.muted,
      }, content.centerSubtitle.toUpperCase()));

      /* ── Detail panel (foreignObject so the rich text scales too) ── */
      if (active) {
        const p = content.pillars.find((x) => x.key === active);
        const idx = order.indexOf(active) + 1;

        const fo = svgEl("foreignObject", {
          x: panelLeftFor(active), y: PANEL_TOP[active],
          width: PANEL_W, height: 300,
        });
        fo.setAttribute("overflow", "visible");

        const card = htmlEl("div",
          "background:" + theme.surface + ";border-radius:10px;padding:22px 26px;box-sizing:border-box;" +
          "box-shadow:" + theme.shadow + ";" +
          "border-top:4px solid " + accent(p.color) + ";" +
          'font-family:"DM Sans","Segoe UI",system-ui,sans-serif;');

        const head = htmlEl("div", "display:flex;align-items:center;gap:10px;");
        head.appendChild(htmlEl("div",
          "width:24px;height:24px;border-radius:50%;background:" + p.color + ";" +
          "display:flex;align-items:center;justify-content:center;color:#fff;" +
          'font-family:"DM Serif Display",Georgia,serif;font-size:13px;', String(idx)));
        head.appendChild(htmlEl("div",
          "font-size:9.5px;letter-spacing:0.22em;text-transform:uppercase;" +
          "font-weight:700;color:" + accent(p.color) + ";", p.label));

        const tagline = htmlEl("div",
          'font-family:"DM Serif Display",Georgia,serif;font-size:17px;color:' + theme.ink + ";" +
          "line-height:1.32;margin-top:12px;", p.tagline);

        const ul = htmlEl("ul",
          "margin:16px 0 0 0;padding:0;list-style:none;font-size:12.5px;color:" + theme.body + ";line-height:1.85;");
        p.bullets.forEach((b) => {
          const li = htmlEl("li", "display:flex;gap:10px;align-items:baseline;");
          li.appendChild(htmlEl("span",
            "width:5px;height:5px;border-radius:50%;background:" + accent(p.color) + ";" +
            "flex-shrink:0;transform:translateY(-2px);"));
          li.appendChild(htmlEl("span", "", b));
          ul.appendChild(li);
        });

        card.appendChild(head);
        card.appendChild(tagline);
        card.appendChild(ul);
        fo.appendChild(card);
        svg.appendChild(fo);
      }
    }

    render();
    RENDERERS.push(render);
    bindThemeListeners();
  }

  function init() {
    document.querySelectorAll("[data-dml-concept-diagram]").forEach(mountDiagram);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
