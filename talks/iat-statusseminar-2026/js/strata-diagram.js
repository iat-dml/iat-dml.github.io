/* ============================================================
   DML strata diagram — presentation build.

   Refactored from the production component at
   C:\git\iat-dml.github.io\assets\js\dml-concept-diagram.js

   Geometry, seam curves, palette handling and the theme/background
   resolution are carried over unchanged so this stays visually
   identical to the mark on the website. What differs:

   - No self-mounting, no click-to-toggle. The deck's director owns
     all state (js/director.js); this file only renders what it is
     told. Reveal keeps the keyboard.
   - An imperative API: setActive / setLayout / setVariant / setPark /
     setBackground / reset.
   - SVG element ids are unique per mount. The original hard-codes
     them, which collides the moment a deck has two instances.

   TWO VARIANTS
   ------------
   "panel"   the mark with a detail card beside it, joined by a dotted
             connector. Chrome belongs to the "full" layout only; at
             "aside" and "corner" the disc travels alone.

   "horizon" the strata leave the mark: the two seams continue outward
             and, with a horizon above and a floor below, divide the
             whole slide into three bands. The active band is washed
             and carries the stratum's title to the left of the mark
             and its bullets to the right.

             The bands are drawn into a SEPARATE, untransformed layer
             (see js/director.js and css/stage.css) because they live
             in slide coordinates while the mark lives in the stage's
             transformed layer. That split is what lets the mark keep
             its smooth travel between slides while the bands swap
             underneath it.
   ============================================================ */

(function (global) {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var XHTML_NS = "http://www.w3.org/1999/xhtml";

  /* Canvas + disc geometry (one 1260x720 coordinate space) */
  var W = 1260;
  var H = 720;
  var CX = 630;
  var CY = 372;
  var R = 220;
  var DISC_SIZE = R * 2;   /* the mark's native box, 200 disc-local units */

  /* The panel variant's "full" layout draws the mark larger than its
     native box, so the overview reads at the same size as the horizon
     variant's: 550px rather than 440px. 1.25 is not a free choice -
     "aside" and the horizon variant both render the mark at 550px (see
     css/stage.css and HZ_SCALE), and matching them is what lets the
     mark hold still between the two overviews and on into a project
     slide, changing only what surrounds it.

     Only that one case scales. At "aside" and "corner" the CSS
     transform already sizes the mark, so it stays native there. */
  var FULL_MARK_SCALE = 550 / DISC_SIZE;

  /* The mark's box at a given scale, always centred on (CX, CY), plus
     the two figures the chrome needs from it: one disc-local unit in
     diagram coordinates, and the painted rim's radius. The painted
     circle is r76 inside the 200-unit box, so the rim sits well inside
     half the box - the box is not the circle. */
  function markGeom(scale) {
    var size = DISC_SIZE * scale;
    var unit = size / 200;
    return {
      size: size,
      left: CX - size / 2,
      top: CY - size / 2,
      unit: unit,
      r: 76 * unit
    };
  }

  /* The slide itself, for the horizon variant's band layer. */
  var SLIDE_W = 1280;
  var SLIDE_H = 720;

  /* Deep-soil palette - overridable per deck via CSS custom properties. */
  var DEFAULT_COLORS = {
    support: "#2B5D45",
    transfer: "#3E7775",
    integration: "#A4713D",
    tealDark: "#356259",
    slate: "#465555",
    paper: "#F5F3EE"
  };

  /* Strata geometry (disc-local viewBox 0 0 200 200, r76 @ 100,100) -
     identical seam curves to the production logo. */
  var SEAM1 = "M 14 84 C 58 68, 122 98, 186 78";
  var SEAM2 = "M 14 124 C 70 138, 134 112, 186 126";
  var BAND_B = SEAM1 + " L 186 188 L 14 188 Z";
  var BAND_C = SEAM2 + " L 186 188 L 14 188 Z";
  var REGION = {
    support: "M 14 84 C 58 68, 122 98, 186 78 L 186 8 L 14 8 Z",
    transfer: "M 14 84 C 58 68, 122 98, 186 78 L 186 126 C 134 112, 70 138, 14 124 Z",
    integration: "M 14 124 C 70 138, 134 112, 186 126 L 186 192 L 14 192 Z"
  };
  var LABEL_Y = { support: 50, transfer: 104, integration: 152 };

  /* The same two seams as control-point lists, in the mark's own
     200-unit space. The horizon variant needs them as numbers so it can
     place them at any box position and continue them outward. */
  var SEAM_PTS = {
    s1: [[14, 84], [58, 68], [122, 98], [186, 78]],
    s2: [[14, 124], [70, 138], [134, 112], [186, 126]]
  };

  /* Panels - Support & Integration expand right, Transfer expands left.
     The horizon variant reuses that same rhythm for which side of the
     mark a project slide's content sits on. */
  var PANEL_W = 332;
  var PANEL_MARGIN = 44;
  var PANEL_SIDE = { support: "right", transfer: "left", integration: "right" };

  /* Card tops. Each sits so the connector meets the card in its upper
     third rather than at its very top edge - hence derived from the
     connector's y rather than fixed, so the cards follow the mark when
     it is drawn at FULL_MARK_SCALE. */
  var PANEL_CONNECTOR_DROP = 112;

  var CONTENT = {
    kicker: "IAT Service Working Group",
    title: "Three Strata of Services",
    centerTitle: "Data & Modelling Infrastructure",
    centerSubtitle: "for Living Labs",
    pillars: [
      {
        key: "support",
        label: "Support",
        tagline: "Supporting researchers to manage their research data and software over all the stages of their projects",
        bullets: [
          "Data management plans",
          "Version control and software practice",
          "Archiving and FAIR publication",
          "Training and consulting"
        ]
      },
      {
        key: "transfer",
        label: "Transfer",
        tagline: "Closing the loop between science and practice",
        bullets: [
          "Dashboards and web tools",
          "Stakeholder co-design",
          "Living Lab feedback loops",
          "Open science communication"
        ]
      },
      {
        key: "integration",
        label: "Integration",
        tagline: "Connecting research data and methods across working groups",
        bullets: [
          "Shared data infrastructure",
          "Interoperable methods and models",
          "Cross-group workflows",
          "Common standards and schemas"
        ]
      }
    ]
  };

  var ORDER = CONTENT.pillars.map(function (p) { return p.key; });

  /* ---- element helpers ---- */

  function svgEl(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (k) {
      el.setAttribute(k, String(attrs[k]));
    });
    return el;
  }

  function htmlEl(tag, style, text) {
    var el = document.createElementNS(XHTML_NS, tag);
    if (style) el.setAttribute("style", style);
    if (typeof text === "string") el.textContent = text;
    return el;
  }

  function svgText(attrs, text) {
    var el = svgEl("text", attrs);
    el.textContent = text;
    return el;
  }

  function cssVar(style, name, fallback) {
    var value = style.getPropertyValue(name).trim();
    return value || fallback;
  }

  function getColors(root) {
    var style = getComputedStyle(root);
    return {
      support: cssVar(style, "--dml-support", DEFAULT_COLORS.support),
      transfer: cssVar(style, "--dml-transfer", DEFAULT_COLORS.transfer),
      integration: cssVar(style, "--dml-integration", DEFAULT_COLORS.integration),
      tealDark: cssVar(style, "--dml-teal-dark", DEFAULT_COLORS.tealDark),
      slate: cssVar(style, "--dml-slate", DEFAULT_COLORS.slate),
      paper: cssVar(style, "--dml-paper", DEFAULT_COLORS.paper)
    };
  }

  /* Type, from the deck's own tokens, so a theme that swaps the fonts
     (css/theme-iat.css) reaches the diagram too. */
  function getFonts(root) {
    var style = getComputedStyle(root);
    return {
      body: cssVar(style, "--font-body", '"DM Sans", "Segoe UI", system-ui, sans-serif'),
      heading: cssVar(style, "--font-heading", '"DM Serif Display", Georgia, serif'),
      headingWeight: cssVar(style, "--font-heading-weight", "400")
    };
  }

  /* ---- colour utilities (theme-aware light/dark surfaces) ---- */

  function parseColor(str) {
    if (!str) return null;
    str = String(str).trim();
    if (str[0] === "#") {
      var h = str.slice(1);
      if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
      var n = parseInt(h, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    var m = str.match(/rgba?\(([^)]+)\)/);
    if (m) {
      var p = m[1].split(",").map(function (s) { return parseFloat(s); });
      return { r: p[0], g: p[1], b: p[2] };
    }
    return null;
  }

  function relLum(c) {
    var f = function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }

  function mix(a, b, t) {
    return { r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t };
  }

  function rgbStr(c) {
    return "rgb(" + Math.round(c.r) + ", " + Math.round(c.g) + ", " + Math.round(c.b) + ")";
  }

  /* A translucent wash of a brand colour, for the card ground and the
     horizon bands. On a dark slide the colour disappears into the
     ground, so wash with light instead. */
  function washOf(color, alpha, isDark) {
    if (isDark) return "rgba(255,255,255," + (alpha + 0.01) + ")";
    var c = parseColor(color) || { r: 0, g: 0, b: 0 };
    return "rgba(" + Math.round(c.r) + "," + Math.round(c.g) + "," + Math.round(c.b) + "," + alpha + ")";
  }

  var WHITE = { r: 255, g: 255, b: 255 };

  /* Build a light/dark surface palette from the resolved background. */
  function getTheme(colors, bg) {
    var bgc = parseColor(bg) || { r: 245, g: 243, b: 238 };
    var isDark = relLum(bgc) < 0.4;
    return isDark
      ? {
          isDark: true,
          surface: rgbStr(mix(bgc, WHITE, 0.09)),
          ink: "rgba(245,243,238,0.92)",
          body: "rgba(245,243,238,0.70)",
          muted: "rgba(245,243,238,0.48)",
          line: "rgba(245,243,238,0.26)",
          shadow: "0 14px 34px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.30)"
        }
      : {
          isDark: false,
          surface: "#ffffff",
          ink: colors.tealDark,
          body: colors.slate,
          muted: "#7A817E",
          line: "rgba(70,85,85,0.32)",
          shadow: "0 12px 32px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)"
        };
  }

  /* Walk up the DOM for the first non-transparent background, so seams
     and the disc edge match the page rather than a hard-coded white.
     The director overrides this per slide via setBackground(). */
  function resolveBackground(el) {
    var node = el;
    while (node && node.nodeType === 1) {
      var c = getComputedStyle(node).backgroundColor;
      if (c && c !== "transparent" && !/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/.test(c)) {
        return c;
      }
      node = node.parentElement;
    }
    return null;
  }

  /* ---- geometry helpers ---- */

  var bandScreenY = function (key, geom) {
    return geom.top + LABEL_Y[key] * geom.unit;
  };

  /* Clear air between the painted rim and the connector's dot, so the
     line reads as departing the stratum rather than fused to it. */
  var RIM_GAP = 18;

  /* Where the connector starts: horizontally clear of the PAINTED rim,
     rather than the mark's bounding box. */
  var rimX = function (sy, side, geom) {
    var dy = sy - CY;
    var dx = Math.sqrt(Math.max(0, geom.r * geom.r - dy * dy)) + RIM_GAP;
    return side === "left" ? CX - dx : CX + dx;
  };

  var panelLeftFor = function (key) {
    return PANEL_SIDE[key] === "left" ? PANEL_MARGIN : W - PANEL_MARGIN - PANEL_W;
  };

  var panelTopFor = function (key, geom) {
    return bandScreenY(key, geom) - PANEL_CONNECTOR_DROP;
  };

  /* End of the "aside" connector, in diagram coordinates. css/stage.css
     maps the aside layout as sx = -487.5 + 1.25 * x, and section.project
     starts its column at 46% of the 1280px slide (589px). x = 850 -> sx
     = 575, i.e. stopping just short of that column. The mirrored park
     uses 1260 - 850, which lands the same distance the other way. */
  var ASIDE_CONNECTOR_X = 850;

  /* ---- horizon variant: the strata as full-slide bands ----

     Both boundaries are the mark's own seam plus an extension on each
     side, built from the anchors so any mark position works. Two rules
     govern an extension:

     TANGENT CONTINUITY. The control point nearest an anchor sits back
     along the mark's own tangent at a quarter of its length, so the
     curve leaves the mark without a kink.

     THE WAVE CARRIES ON. Past that point the extension runs a further
     half-wave of its own. Without it a boundary goes flat the moment it
     leaves the disc, which makes the mark look like the only place
     anything happens.

     The horizon is SEAM1 lifted 185 and the floor is SEAM2 dropped 165:
     parallel offsets, so all four boundaries undulate in sympathy the
     way conformable beds do. Those depths are set by the mark, not by
     taste - the horizon has to clear the TOP of the circle and the
     floor its bottom (~21px at the tightest), so the Support band
     contains the whole support region of the disc rather than cutting
     across it. */

  var HZ_SCALE = 2.75;               /* the mark at 550px, as at "aside" */
  var HZ_LIFT = 185;                 /* horizon above SEAM1 */
  var HZ_DROP = 165;                 /* floor below SEAM2 */
  var HZ_EXT = {
    /* dEdge: how much deeper the boundary sits at the slide edge than
       at its anchor. amp: the half-wave's height along the way. */
    s1: { dLeft: -6, ampLeft: 16, dRight: 4.5, ampRight: 14 },
    s2: { dLeft: 14, ampLeft: 16, dRight: 2.5, ampRight: 12 }
  };

  function pt(n) { return Math.round(n * 100) / 100; }

  /* One seam, placed at box (L, T) and continued to both slide edges.
     Returns { fwd, rev } as path data, `rev` being everything after the
     start point so a filled band can close on it exactly. */
  function hzSeam(key, L, T, offset) {
    var s = HZ_SCALE;
    var e = HZ_EXT[key];
    var p = SEAM_PTS[key].map(function (q) {
      return [L + q[0] * s, T + q[1] * s + offset];
    });
    var a = p[0], c1 = p[1], c2 = p[2], b = p[3];

    /* Left extension: leaves the anchor back along the mark's tangent,
       then one half-wave out to x = 0. */
    var lc2 = [a[0] - 0.25 * (c1[0] - a[0]), a[1] - 0.25 * (c1[1] - a[1])];
    var lEnd = [0, a[1] + e.dLeft];
    var lc1 = [0.35 * a[0], lEnd[1] - e.ampLeft];

    /* Right extension: mirror construction out to x = SLIDE_W. */
    var rc1 = [b[0] + 0.25 * (b[0] - c2[0]), b[1] + 0.25 * (b[1] - c2[1])];
    var rEnd = [SLIDE_W, b[1] + e.dRight];
    var rc2 = [b[0] + 0.63 * (SLIDE_W - b[0]), rEnd[1] + e.ampRight];

    var fwd = "M " + pt(lEnd[0]) + " " + pt(lEnd[1]) +
      " C " + pt(lc1[0]) + " " + pt(lc1[1]) + ", " + pt(lc2[0]) + " " + pt(lc2[1]) + ", " + pt(a[0]) + " " + pt(a[1]) +
      " C " + pt(c1[0]) + " " + pt(c1[1]) + ", " + pt(c2[0]) + " " + pt(c2[1]) + ", " + pt(b[0]) + " " + pt(b[1]) +
      " C " + pt(rc1[0]) + " " + pt(rc1[1]) + ", " + pt(rc2[0]) + " " + pt(rc2[1]) + ", " + pt(rEnd[0]) + " " + pt(rEnd[1]);

    var rev =
      " C " + pt(rc2[0]) + " " + pt(rc2[1]) + ", " + pt(rc1[0]) + " " + pt(rc1[1]) + ", " + pt(b[0]) + " " + pt(b[1]) +
      " C " + pt(c2[0]) + " " + pt(c2[1]) + ", " + pt(c1[0]) + " " + pt(c1[1]) + ", " + pt(a[0]) + " " + pt(a[1]) +
      " C " + pt(lc2[0]) + " " + pt(lc2[1]) + ", " + pt(lc1[0]) + " " + pt(lc1[1]) + ", " + pt(lEnd[0]) + " " + pt(lEnd[1]);

    return { fwd: fwd, rev: rev, endY: rEnd[1] };
  }

  /* The four boundaries and the three regions between them, for a mark
     whose 550px box sits at (L, T). */
  function hzProfile(L, T) {
    var h = hzSeam("s1", L, T, -HZ_LIFT);
    var s1 = hzSeam("s1", L, T, 0);
    var s2 = hzSeam("s2", L, T, 0);
    var f = hzSeam("s2", L, T, HZ_DROP);
    return {
      edges: [h, s1, s2, f],
      region: {
        support: h.fwd + " L " + SLIDE_W + " " + pt(s1.endY) + s1.rev + " Z",
        transfer: s1.fwd + " L " + SLIDE_W + " " + pt(s2.endY) + s2.rev + " Z",
        integration: s2.fwd + " L " + SLIDE_W + " " + pt(f.endY) + f.rev + " Z"
      },
      /* Which two boundaries bound each band. */
      live: { support: [0, 1], transfer: [1, 2], integration: [2, 3] }
    };
  }

  /* How far in from each slide edge the bands take to reach full
     strength. A boundary that runs hard into the edge reads as clipped
     -- as though the slide were a window onto a bigger drawing. Fading
     it out instead lets the profile end rather than stop.

     The middle stop is above the linear value (0.55 where linear would
     be 0.40) so the falloff eases rather than ramps.

     The ramp is kept to ~96px on purpose. It has to read on a 2.5px
     boundary stroke without hollowing out the ground under the text:
     the title column starts at x=54, inside the ramp, but it sits on
     an 11% wash, so 67% of 11% is a difference nobody can see. A
     wider, prettier fade would leave the first words of the title
     hanging off the end of their own band. */
  var HZ_FADE = 0.075;       /* ~96px of the 1280 slide */
  var HZ_FADE_KNEE = 0.03;

  /* Where the mark's 550px box sits, per layout and park side. */
  var HZ_BOX = {
    full: { left: 365, top: 97 },
    asideLeft: { left: 25, top: 85 },
    asideRight: { left: SLIDE_W - 25 - 550, top: 85 }
  };

  /* Content columns for the "full" layout. Both are narrower than the
     gap between mark and slide edge: a wider column spans more of the
     wave, and that costs more usable height than the width is worth.
     Each is centred between the HIGHEST point of its band's upper
     boundary and the LOWEST of its lower one across that column's
     x-range - with both boundaries waving those fall at different x, so
     the usable rectangle is well short of the band's thickness. */
  var HZ_TITLE = { left: 54, width: 340 };
  var HZ_LIST = { left: 890, width: 360 };
  var HZ_Y = {
    support: { title: 231, list: 221 },
    transfer: { title: 382, list: 383 },
    integration: { title: 523, list: 532 }
  };

  /* ---- mount ---- */

  var instanceCount = 0;

  function mount(root, options) {
    var opts = options || {};
    var uid = "dmlSt" + (++instanceCount);
    var clipId = uid + "Disc";
    var shadowId = uid + "Shadow";

    var colors = getColors(root);
    var fonts = getFonts(root);
    var content = {
      title: CONTENT.title,
      pillars: CONTENT.pillars.map(function (pillar) {
        return Object.assign({}, pillar, {
          color: colors[pillar.key] || DEFAULT_COLORS[pillar.key]
        });
      })
    };

    var active = null;      // null | "support" | "transfer" | "integration"
    var layout = "full";    // "full" | "aside" | "corner"
    var variant = opts.variant === "horizon" ? "horizon" : "panel";
    var park = "left";      // which side of the slide the mark parks at, "aside" only
    var bgOverride = null;  // set by the director per slide

    var bandsRoot = opts.bands || null;

    root.classList.add("dml-strata-diagram");
    root.innerHTML = "";

    var svg = svgEl("svg", {
      viewBox: "0 0 " + W + " " + H,
      width: "100%",
      role: "img",
      "aria-label": content.title
    });
    svg.style.display = "block";
    svg.style.width = "100%";
    svg.style.height = "auto";
    svg.style.fontFamily = fonts.body;
    root.appendChild(svg);

    function pillarFor(key) {
      return content.pillars.find(function (x) { return x.key === key; });
    }

    /* -- the card, "panel" variant ------------------------------

       The stratum is already named inside the mark and pointed at by
       the connector, so the card carries neither a label nor a numeral:
       just the tagline and the list. Its ground is a wash of the
       stratum colour under a seam-curved top edge, with a solid spine
       on the edge FACING the mark - the card reads as a piece of the
       same ground rather than as a panel floating above it. */
    function buildCard(p, theme, bg) {
      var side = PANEL_SIDE[p.key];
      var accent = theme.isDark
        ? rgbStr(mix(parseColor(p.color) || WHITE, WHITE, 0.5))
        : p.color;
      var wash = washOf(p.color, 0.07, theme.isDark);
      var w = PANEL_W;

      var wrap = htmlEl("div", "font-family:" + fonts.body + ";");

      /* Seam-curved top edge. Same shape as the mark's own seam, at a
         gentle amplitude so a 332px card does not look corrugated. */
      var cap = svgEl("svg", { width: w, height: 16, viewBox: "0 0 " + w + " 16" });
      cap.style.display = "block";
      var seam = "M 0 5 C " + (0.26 * w) + " 0, " + (0.63 * w) + " 9.25, " + w + " 3.25";
      cap.appendChild(svgEl("path", { d: seam + " L " + w + " 16 L 0 16 Z", fill: wash }));
      cap.appendChild(svgEl("path", { d: seam, fill: "none", stroke: accent, "stroke-width": 2.5 }));
      /* The spine's cap, squared off against the seam it starts under. */
      cap.appendChild(svgEl("rect", {
        x: side === "left" ? w - 6 : 0,
        y: side === "left" ? 3 : 4,
        width: 6, height: 13, fill: accent
      }));
      wrap.appendChild(cap);

      var row = htmlEl("div", "display:flex;background:" + wash + ";");
      var spine = htmlEl("div", "width:6px;background:" + accent + ";flex:0 0 auto;");
      var body = htmlEl("div", side === "left"
        ? "padding:20px 20px 22px 22px;"
        : "padding:20px 22px 22px 20px;");

      var tagline = htmlEl("div",
        "font-family:" + fonts.heading + ";font-weight:" + fonts.headingWeight + ";font-size:19px;color:" + theme.ink + ";" +
        "line-height:1.34;", p.tagline);

      var list = htmlEl("div", "display:flex;flex-direction:column;gap:7px;margin-top:18px;");
      p.bullets.forEach(function (b) {
        var li = htmlEl("div", "display:flex;gap:11px;align-items:baseline;");
        li.appendChild(htmlEl("span",
          "width:5px;height:5px;background:" + accent + ";" +
          "flex:0 0 auto;transform:translateY(-2px);"));
        li.appendChild(htmlEl("span",
          "font-size:12.5px;line-height:1.45;color:" + theme.body + ";", b));
        list.appendChild(li);
      });

      body.appendChild(tagline);
      body.appendChild(list);

      /* Spine on the side facing the mark: left-hand cards (Transfer)
         put it on their right, right-hand cards on their left. */
      if (side === "left") {
        row.appendChild(body);
        row.appendChild(spine);
      } else {
        row.appendChild(spine);
        row.appendChild(body);
      }
      wrap.appendChild(row);
      return wrap;
    }

    /* -- the bands, "horizon" variant ---------------------------

       Drawn in slide coordinates into their own untransformed layer.
       At "full" the whole profile shows, with the active band washed
       and the other two left as bare paper; at "aside" only the active
       band is drawn, because on a project slide the job is just "this
       sits in Transfer" and a faint horizon would cut through the
       heading. */
    function renderBands(theme) {
      if (!bandsRoot) return;
      bandsRoot.innerHTML = "";
      if (variant !== "horizon" || layout === "corner") return;

      var box = layout === "aside"
        ? (park === "right" ? HZ_BOX.asideRight : HZ_BOX.asideLeft)
        : HZ_BOX.full;
      var profile = hzProfile(box.left, box.top);
      var isFull = layout === "full";

      var bands = svgEl("svg", {
        viewBox: "0 0 " + SLIDE_W + " " + SLIDE_H,
        width: "100%", height: "100%",
        "aria-hidden": "true", focusable: "false"
      });
      bands.style.display = "block";

      /* The heading belongs to the slide, not to a band, so it shows
         from the first view - before any stratum is active. */
      if (isFull) {
        var head = svgText({
          x: 54, y: 72,
          "font-size": 44,
          "font-family": fonts.heading, "font-weight": fonts.headingWeight,
          fill: theme.ink
        }, content.title);
        bands.appendChild(head);
      }

      if (active) {
        var p = pillarFor(active);
        var accent = theme.isDark
          ? rgbStr(mix(parseColor(p.color) || WHITE, WHITE, 0.5))
          : p.color;
        var live = profile.live[active];

        /* Wash and boundaries fade out together as they run into the
           left and right slide edges, so the profile ends rather than
           looks cropped. One mask over the whole group, so a boundary
           and the ground it bounds fade in step - masking them
           separately would let a line outlive its band. */
        var maskId = uid + "Fade";
        var gradId = uid + "FadeGrad";
        var defs = svgEl("defs", {});
        var grad = svgEl("linearGradient", {
          id: gradId, x1: 0, y1: 0, x2: SLIDE_W, y2: 0,
          gradientUnits: "userSpaceOnUse"
        });
        [
          [0, 0], [HZ_FADE_KNEE, 0.55], [HZ_FADE, 1],
          [1 - HZ_FADE, 1], [1 - HZ_FADE_KNEE, 0.55], [1, 0]
        ].forEach(function (s) {
          grad.appendChild(svgEl("stop", {
            offset: s[0], "stop-color": "#fff", "stop-opacity": s[1]
          }));
        });
        var mask = svgEl("mask", {
          id: maskId, maskUnits: "userSpaceOnUse",
          x: 0, y: 0, width: SLIDE_W, height: SLIDE_H
        });
        mask.appendChild(svgEl("rect", {
          x: 0, y: 0, width: SLIDE_W, height: SLIDE_H, fill: "url(#" + gradId + ")"
        }));
        defs.appendChild(grad);
        defs.appendChild(mask);
        bands.appendChild(defs);

        /* Grouped so the whole profile can fade in as one thing when
           the first stratum is revealed. */
        var g = svgEl("g", {
          class: "strata-bands__group",
          mask: "url(#" + maskId + ")"
        });
        g.appendChild(svgEl("path", {
          d: profile.region[active],
          fill: washOf(p.color, 0.11, theme.isDark)
        }));

        profile.edges.forEach(function (edge, i) {
          var on = live.indexOf(i) !== -1;
          /* At "aside" only the active band's own two boundaries are
             drawn at all. */
          if (!isFull && !on) return;
          g.appendChild(svgEl("path", {
            d: edge.fwd,
            fill: "none",
            stroke: on ? accent : theme.body,
            "stroke-width": on ? 2.5 : 1.2,
            "stroke-opacity": on ? 1 : 0.2
          }));
        });
        bands.appendChild(g);
      }

      bandsRoot.appendChild(bands);

      /* Title left of the mark, bullets right, both inside the band.
         "full" only - at "aside" the slide supplies its own content. */
      if (isFull && active) {
        var pil = pillarFor(active);
        var acc = theme.isDark
          ? rgbStr(mix(parseColor(pil.color) || WHITE, WHITE, 0.5))
          : pil.color;
        var y = HZ_Y[active];

        var titleBox = document.createElement("div");
        titleBox.className = "strata-bands__title";
        titleBox.setAttribute("style",
          "left:" + HZ_TITLE.left + "px;width:" + HZ_TITLE.width + "px;top:" + y.title + "px;" +
          "color:" + acc + ";");
        titleBox.textContent = pil.tagline;
        bandsRoot.appendChild(titleBox);

        var listBox = document.createElement("div");
        listBox.className = "strata-bands__list";
        listBox.setAttribute("style",
          "left:" + HZ_LIST.left + "px;width:" + HZ_LIST.width + "px;top:" + y.list + "px;");
        pil.bullets.forEach(function (b) {
          var row = document.createElement("div");
          row.className = "strata-bands__item";
          var dot = document.createElement("span");
          dot.className = "strata-bands__dot";
          dot.setAttribute("style", "background:" + acc + ";");
          var txt = document.createElement("span");
          txt.setAttribute("style", "color:" + theme.body + ";");
          txt.textContent = b;
          row.appendChild(dot);
          row.appendChild(txt);
          listBox.appendChild(row);
        });
        bandsRoot.appendChild(listBox);
      }
    }

    function render() {
      var bg = bgOverride || resolveBackground(root) || colors.paper;
      var theme = getTheme(colors, bg);
      var isHorizon = variant === "horizon";
      /* Header, connector and card belong to the panel variant's "full"
         layout only. The horizon variant draws its own chrome into the
         bands layer instead. */
      var showChrome = layout === "full" && !isHorizon;

      /* The overview draws the mark at the horizon variant's size; every
         other case leaves it native and lets the CSS transform size it. */
      var geom = markGeom(showChrome ? FULL_MARK_SCALE : 1);

      /* Lighten a brand colour so it stays legible as text on a dark surface. */
      var accent = function (c) {
        return theme.isDark ? rgbStr(mix(parseColor(c) || WHITE, WHITE, 0.5)) : c;
      };

      while (svg.firstChild) svg.removeChild(svg.firstChild);

      /* -- Header (panel + full only) -- */
      if (showChrome) {
        svg.appendChild(svgText({
          x: PANEL_MARGIN,
          y: 72,
          "font-size": 44,
          "font-family": fonts.heading, "font-weight": fonts.headingWeight,
          fill: theme.ink
        }, content.title));
      }

      /* -- Connector from the active band out to its card -- */
      if (showChrome && active) {
        var ap = pillarFor(active);
        var side = PANEL_SIDE[active];
        var sy = bandScreenY(active, geom);
        var ex = rimX(sy, side, geom);
        var px = side === "left" ? PANEL_MARGIN + PANEL_W : panelLeftFor(active);
        svg.appendChild(svgEl("line", {
          x1: ex, y1: sy, x2: px, y2: sy,
          stroke: theme.line,
          "stroke-width": 1.5,
          "stroke-dasharray": "3 4"
        }));
        svg.appendChild(svgEl("circle", { cx: ex, cy: sy, r: 3.5, fill: accent(ap.color) }));
      }

      /* -- Connector out to the slide's own content (panel + aside).
            Runs toward whichever side the project column is on, which
            is the opposite side from the parked mark. -- */
      if (!isHorizon && layout === "aside" && active) {
        var bp = pillarFor(active);
        var by = bandScreenY(active, geom);
        var out = park === "right" ? "left" : "right";
        var bx = rimX(by, out, geom);
        svg.appendChild(svgEl("line", {
          x1: bx, y1: by,
          x2: park === "right" ? W - ASIDE_CONNECTOR_X : ASIDE_CONNECTOR_X,
          y2: by,
          stroke: theme.line,
          "stroke-width": 1.5,
          "stroke-dasharray": "3 4"
        }));
        svg.appendChild(svgEl("circle", { cx: bx, cy: by, r: 3.5, fill: accent(bp.color) }));
      }

      /* -- The strata mark (nested svg so it scales with the canvas) -- */
      var disc = svgEl("svg", {
        x: geom.left, y: geom.top,
        width: geom.size, height: geom.size,
        viewBox: "0 0 200 200"
      });

      var defs = svgEl("defs", {});
      var clip = svgEl("clipPath", { id: clipId });
      clip.appendChild(svgEl("circle", { cx: 100, cy: 100, r: 76 }));
      var filter = svgEl("filter", {
        id: shadowId, x: "-30%", y: "-30%", width: "160%", height: "160%"
      });
      filter.appendChild(svgEl("feDropShadow", {
        dx: 0, dy: 6, stdDeviation: 9, "flood-color": "#2E544B", "flood-opacity": 0.16
      }));
      defs.appendChild(clip);
      defs.appendChild(filter);
      disc.appendChild(defs);

      disc.appendChild(svgEl("circle", {
        cx: 100, cy: 100, r: 76, fill: bg, filter: "url(#" + shadowId + ")"
      }));

      var g = svgEl("g", { "clip-path": "url(#" + clipId + ")" });

      /* Base painted strata. */
      g.appendChild(svgEl("circle", { cx: 100, cy: 100, r: 76, fill: colors.support }));
      g.appendChild(svgEl("path", { d: BAND_B, fill: colors.transfer }));
      g.appendChild(svgEl("path", { d: BAND_C, fill: colors.integration }));
      g.appendChild(svgEl("path", {
        d: SEAM1, fill: "none", stroke: bg, "stroke-width": 5, "stroke-linecap": "round"
      }));
      g.appendChild(svgEl("path", {
        d: SEAM2, fill: "none", stroke: bg, "stroke-width": 5, "stroke-linecap": "round"
      }));

      /* Dimming veils over the inactive strata. No interactivity: the
         director owns state, so these are purely visual. */
      content.pillars.forEach(function (p) {
        var dim = active && active !== p.key;
        var path = svgEl("path", {
          d: REGION[p.key],
          fill: bg,
          "fill-opacity": dim ? 0.5 : 0,
          stroke: "none"
        });
        path.style.transition = "fill-opacity 0.35s";
        g.appendChild(path);
      });

      /* Band labels. */
      content.pillars.forEach(function (p) {
        var dim = active && active !== p.key;
        var label = svgText({
          x: 100,
          y: LABEL_Y[p.key] + 5,
          "text-anchor": "middle",
          "font-family": fonts.heading, "font-weight": fonts.headingWeight,
          "font-size": 14,
          fill: "#FFFFFF",
          opacity: dim ? 0.4 : 1
        }, p.label);
        label.style.transition = "opacity 0.35s";
        g.appendChild(label);
      });

      disc.appendChild(g);
      svg.appendChild(disc);

      /* -- Detail card (panel + full only) -- */
      if (showChrome && active) {
        var p = pillarFor(active);
        var fo = svgEl("foreignObject", {
          x: panelLeftFor(active), y: panelTopFor(active, geom),
          width: PANEL_W, height: 320
        });
        fo.setAttribute("overflow", "visible");
        fo.appendChild(buildCard(p, theme, bg));
        svg.appendChild(fo);
      }

      renderBands(theme);
    }

    render();

    /* ---- imperative API, driven by js/director.js ---- */
    return {
      el: root,
      order: ORDER.slice(),
      setActive: function (key) {
        var next = ORDER.indexOf(key) === -1 ? null : key;
        if (next === active) return;
        active = next;
        render();
      },
      setLayout: function (name) {
        var next = name === "aside" || name === "corner" ? name : "full";
        if (next === layout) return;
        layout = next;
        render();
      },
      setVariant: function (name) {
        var next = name === "horizon" ? "horizon" : "panel";
        if (next === variant) return;
        variant = next;
        render();
      },
      setPark: function (side) {
        var next = side === "right" ? "right" : "left";
        if (next === park) return;
        park = next;
        render();
      },
      setBackground: function (color) {
        var next = color || null;
        if (next === bgOverride) return;
        bgOverride = next;
        render();
      },
      getActive: function () { return active; },
      getLayout: function () { return layout; },
      getVariant: function () { return variant; },
      getPark: function () { return park; },
      reset: function () {
        active = null;
        layout = "full";
        park = "left";
        bgOverride = null;
        render();
      },
      render: render
    };
  }

  global.StrataDiagram = { mount: mount, order: ORDER.slice() };
})(window);
