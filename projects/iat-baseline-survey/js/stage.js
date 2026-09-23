// ============================================================================
// stage.js -- the persistent SVG and everything drawn on it.
//
// ONE renderer for the layout lab and the presentation, so the two cannot
// drift apart. Lifted out of lab.html verbatim; the lab keeps its panel,
// diagnostics and freeze button, the deck keeps its beat list and shell.
//
// The stage is a function of (view, opts) over a frozen layout: show() says
// what the audience should be looking at, and every element is joined by a
// stable key so a change between two states is a tween, never a redraw
// (SPEC 2.1). It knows nothing about sliders, keys or clickers.
//
//   const stage = createStage(svgElement, { model });
//   stage.setLayout(layout, params);
//   stage.show('uc', { ...opts, interest: true }, { animate: true });
// ============================================================================

import * as T from './theme.js';
import { arc, wedgePath } from './layout.js';
import { dodge, wrap2, measure } from './labels.js';
import { drawGlyph, scaleFor } from './icons.js';

/**
 * @param {SVGSVGElement} svgEl  1920x1080 viewBox, owned by the stage from now on
 * @param {object} o
 * @param {object} o.model       from loadModel()
 */
export function createStage(svgEl, { model }) {
  const svg = d3.select(svgEl);
  let layout = null;
  let params = null;
  let view = null;
  let opts = {};
  // The scene the stage is currently showing. A render where this differs from
  // `view` is a SCENE CHANGE and gets the morph; so is any render asked to
  // animate, which is how a beat inside one scene (0.5b, 1.2, 4.3, 4.5b) moves
  // rather than cuts. A slider drag in the lab asks for neither.
  let renderedView = null;
  let animateNext = false;

  // layers, created once and in painting order
  const L = {};
  // Painting order. nodeText comes AFTER labels on purpose: a theme label's
  // paper halo would otherwise knock out the count printed inside a neighbouring
  // node, and the number inside a node has to win -- it is the value, the label
  // is only its name.
  for (const name of ['ground', 'map', 'nuts3', 'labPoly', 'links', 'bubbles',
                      'nodes', 'icons', 'labels', 'nodeText', 'cloud',
                      'chrome', 'legend']) {
    L[name] = svg.append('g').attr('class', `layer-${name}`);
  }

  // Baselines along the foot of the stage, shared so scene 6's headline and
  // the legend under it cannot drift into each other.
  const LEGEND_FOOT_Y = 1052;
  const MONITORING_HEADLINE_Y = 1000;

  // An explicit paper ground, painted once, behind everything.
  //
  // It is the same colour as the page, so it changes nothing visually -- but it
  // gives the stage a DEFINED backdrop, and that is what makes
  // `mix-blend-mode: multiply` predictable for the logos with painted-in white
  // backgrounds. Blending against a transparent SVG root depends on how the
  // browser isolates the stacking context; blending against a rect we painted
  // ourselves does not. It also means a screenshot or a video capture carries
  // its own background instead of inheriting the page's.
  L.ground.append('rect')
    .attr('x', 0).attr('y', 0)
    .attr('width', T.STAGE.w).attr('height', T.STAGE.h)
    .attr('fill', T.paper());

  // The closing slide's ground: the IAT hero gradient, painted over the paper
  // rather than instead of it, so the scene arrives by fading the dark ground
  // UP while the word cloud shrinks away. A fill cannot tween from a colour to
  // a url(), which is why this is a second rect and not a swapped attribute.
  svg.append('defs').append('linearGradient')
    .attr('id', 'iat-hero')
    .attr('x1', '0').attr('y1', '0').attr('x2', '1').attr('y2', '0')
    .selectAll('stop')
    .data(T.iatHero().map((c, i) => ({ c, o: i / 2 })))
    .join('stop')
    .attr('offset', d => d.o)
    .attr('stop-color', d => d.c);

  L.ground.append('rect').attr('class', 'hero-ground')
    .attr('x', 0).attr('y', 0)
    .attr('width', T.STAGE.w).attr('height', T.STAGE.h)
    .attr('fill', 'url(#iat-hero)')
    .attr('opacity', 0);

  // ===========================================================================
  // multi-lab dots are PIES, not rings
  // ===========================================================================
  // A researcher in two Living Labs used to be drawn as their first lab's colour
  // with an accent ring around it. Two things were wrong with that:
  //
  //   1. `--accent` (#EB5B25) is byte-identical to `--lab-0` (East Brandenburg)
  //      in BOTH palettes, so a bridging researcher in lab-0 got an orange ring
  //      on an orange fill -- invisible, and invisible in the projector variant
  //      too. The one group scene 2 exists to call out was the one group that
  //      could disappear.
  //   2. "First lab" is an artefact of the order the survey listed the options,
  //      not a fact about the person. Painting the dot one lab's colour asserts
  //      a primary affiliation the data does not record.
  //
  // So the dot is divided: one wedge per lab, equal angles. Both memberships are
  // stated, and neither is subordinate to the other. The accent ring stays
  // available for beat 2.3's callout, but it is now redundant emphasis on top of
  // an encoding that already works -- never the only thing carrying the fact.
  //
  // Wedges are inset to `r - sw/2` so they fill the interior WITHOUT covering
  // the circle's own stroke: the paper hairline that separates neighbouring dots
  // has to survive, or a cluster of pies reads as one blob.
  // Wedges live in a nested <g> positioned by TRANSFORM, while the circle beside
  // them is positioned by cx/cy. That is deliberate: the respondent radius is
  // the same in every scene, so wedge geometry never changes and only the
  // translate has to tween. Tweening a `d` string across scenes would risk the
  // path interpolator walking through shapes that are not circles.
  function paintPie(sel, T) {
    sel.each(function (d) {
      const g = d3.select(this);
      const labs = d.labs;
      let pie = g.select('g.pie');
      if (!labs || labs.length < 2) { pie.remove(); return; }
      if (pie.empty()) {
        // The circle beside us is the source of truth for where this dot IS
        // right now -- mid-flight included, since d3 writes cx/cy every frame.
        const c = g.select('circle');
        const at = c.empty() ? { x: d.x, y: d.y }
          : { x: Number(c.attr('cx')) || d.x, y: Number(c.attr('cy')) || d.y };
        pie = g.append('g').attr('class', 'pie')
          .attr('transform', `translate(${at.x},${at.y})`)
          .attr('opacity', 0)
          .each(function () { this.__enter = true; });
      }
      const rr = Math.max(0.5, d.r - (d.sw ?? 1) / 2);
      const w = pie.selectAll('path').data(
        labs.map((labId, i) => ({ labId, d: wedgePath(i, labs.length, rr) })),
        x => x.labId);
      w.exit().remove();
      w.enter().append('path').merge(w)
        // Per-element fill, never a CSS rule: a `path { fill }` declaration
        // would beat every one of these attributes. See the CSS trap in README.
        .attr('d', x => x.d)
        .attr('fill', x => T.labColour(x.labId))
        .attr('stroke', 'none');
    });
  }

  // Lab cells inside a highlighted theme / stakeholder node (review of
  // 16 September 2026). Geometry is frozen at unit radius in layout.json, so
  // the group is placed and SCALED by one transform, like the pie wedges.
  // Inset by half the ring's stroke so the emphasis ring stays whole. The
  // separating hairlines are non-scaling, or they would grow with the node.
  function paintCells(sel, morph) {
    sel.each(function (d) {
      const g = d3.select(this);
      let cells = g.select('g.cells');
      const tf = `translate(${d.x},${d.y}) scale(${Math.max(0.5, d.r - (d.sw ?? 1) / 2)})`;
      if (!d.cells) {
        if (cells.empty()) return;
        if (morph) cells.transition().duration(params.fadeMs)
          .attr('opacity', 0).remove();
        else cells.remove();
        return;
      }
      if (cells.empty()) {
        cells = g.append('g').attr('class', 'cells')
          .attr('transform', tf).attr('opacity', 0);
      }
      cells.interrupt().attr('transform', tf);
      cells.selectAll('path').data(d.cells, c => c.lab)
        .join('path')
        .attr('d', c => c.d)
        .attr('fill', c => T.labColour(c.lab))
        .attr('stroke', T.paper()).attr('stroke-width', 2)
        .attr('vector-effect', 'non-scaling-stroke');
      if (morph) {
        cells.transition().duration(params.morphMs * 0.6)
          .ease(d3.easeCubicInOut).attr('opacity', 1);
      } else {
        cells.attr('opacity', 1);
      }
    });
  }

  // ===========================================================================
  // render
  // ===========================================================================
  function render() {
    if (!layout) return;

    // THE MORPH. Every node is joined by a stable key (SPEC 2.1), so a scene
    // change is a tween on cx/cy of elements that already exist -- the same
    // fifty dots visibly travel to their new arrangement rather than one chart
    // cutting to another. Entering nodes fade in at their destination instead of
    // flying in from the origin.
    //
    // DECLARED FIRST, deliberately: `anim` is used by the link, node, number and
    // icon blocks below, and a const read before its declaration is a temporal
    // dead zone ReferenceError -- thrown inside the requestAnimationFrame that
    // drives every recompute, where it is easy to miss.
    const morph = opts.morph && renderedView !== null
      && (renderedView !== view || animateNext);
    // The morph wave. Keyed to the DATUM's own index where it has one, not to
    // the position in the selection: a respondent's pie wedges live in a
    // different selection from their circle (12 bridges against 49 dots), and
    // indexing by selection position would start the wedges up to 300 ms after
    // the dot they belong to -- the colour visibly sliding off its own dot.
    // Falls back to selection order for everything that carries no `si`.
    const staggerOf = (d, i) => ((d?.si ?? i) % 50) * params.morphStagger;
    const anim = sel => morph
      ? sel.transition()
          .duration(params.morphMs)
          .delay((d, i) => staggerOf(d, i))
          .ease(d3.easeCubicInOut)
      : sel;


    // Theme and use case nodes GROW from nothing rather than fading in at full
    // size, and they wait until the outgoing scene has cleared.
    // A tspan's datum wraps its parent label's datum, so `kind` may be one level
    // down. Everything that schedules a transition goes through this.
    const kindOf = d => d && (d.kind ?? (d.d && d.d.kind));
    const growsFromZero = d => {
      const k = kindOf(d);
      return k === 'theme' || k === 'usecase' || k === 'stakeholder'
          || k === 'monitoring'
          // An unanswered invitation has nowhere to travel to, so beat 0.5b
          // shrinks it away where it stands rather than sliding it off stage.
          || k === 'xdot';
    };
    const enterDelay = d => growsFromZero(d) ? params.stageDelayMs : 0;

    // A lab node's radius changes only on the way into or out of scene 2, and
    // that resize has to FINISH before the themes start arriving -- so it runs
    // at stage speed rather than the full morph.
    const updDuration = d => (kindOf(d) === 'lab'
        && (view === 'people' || renderedView === 'people'))
      ? params.stageDelayMs : params.morphMs;

    // Transition that treats entering and updating elements differently.
    // Entering elements are marked __enter by the enter block; this reads that
    // flag to give them the staged delay while updating elements move at once.
    // d3 evaluates duration/delay eagerly per element, so the flag can safely be
    // cleared straight after scheduling.
    const animStaged = sel => {
      // Clear the flag even on the no-morph path. Returning early without
      // clearing meant every element created on the FIRST render -- when morph is
      // necessarily false, because there is no previous scene -- kept __enter set
      // for the rest of the session, so the lab nodes were treated as entering
      // forever and never got their fast resize.
      if (!morph) {
        sel.each(function () { this.__enter = false; });
        return sel;
      }
      const tr = sel.transition()
        .duration(function (d) {
          return this.__enter ? params.morphMs : updDuration(d);
        })
        .delay(function (d, i) {
          return (this.__enter ? enterDelay(d) : 0) + staggerOf(d, i);
        })
        .ease(d3.easeCubicInOut);
      sel.each(function () { this.__enter = false; });
      return tr;
    };
    const show = {
      invite: view === 'invite',
      map: view === 'map',
      // Defined by exclusion: the respondent dots persist through every scene
      // that hangs a satellite layer off them, scene 6 included. Scene 0.5 is
      // excluded because it positions those same dots itself, at recipient
      // slots rather than at their labs.
      people: view !== 'invite' && view !== 'map'
        && view !== 'matrix' && view !== 'swarm' && view !== 'spine'
        && view !== 'part' && view !== 'mon' && view !== 'cloud'
        && view !== 'thanks',
      themes: view === 'themes',
      stake: view === 'stake',
      uc: view === 'uc',
      matrix: view === 'matrix',
      swarm: view === 'swarm',
      // The 49 respondent dots multiply into 294 statement dots here, so the
      // network/roster dots are NOT built -- see show.people below.
      spine: view === 'spine',
      part: view === 'part',
      mon: view === 'mon',
      // Scene 7 draws no people at all: the answers were coded by hand, so
      // there is no dot to carry over, and every dot leaves.
      cloud: view === 'cloud',
      // The closing slide. Nothing but the dark ground and one sentence: every
      // other layer is empty by exclusion, the way scene 7 empties the dots.
      thanks: view === 'thanks',
    };

    drawLegend();
    L.ground.select('rect').attr('fill', T.paper());
    anim(L.ground.select('rect.hero-ground'))
      .attr('opacity', show.thanks ? 1 : 0);

    // ---- map layers -------------------------------------------------------
    const mapVisible = view === 'map' || view === 'people' || view === 'themes';

    // Beat 1.1 vs 1.2. With "true position" on we are looking at the overview:
    // the projection is fitted to the five labs (SPEC 6.1), so the whole country
    // only fits once this group transform zooms out. Turning it off returns to
    // identity and lets the per-lab contraction transforms do their work.
    const mapT = overviewOn() ? layout.overview.transform : null;
    for (const layer of [L.map, L.nuts3, L.labPoly]) {
      anim(layer).attr('transform', mapT);
    }

    // The Germany outline and the NUTS3 underlay are GEOGRAPHIC FRAMES: they only
    // mean anything while the labs sit at projected positions. In state-grouped
    // mode the anchors are a diagram, so a country outline around them would
    // assert a spatial relationship that is no longer true. Drop both; keep the
    // lab polygons, which are shapes rather than positions and still help the
    // audience recognise a lab by its outline.
    const geographic = sceneIsGeographic();

    L.map.selectAll('path').data(mapVisible && geographic ? [layout.paths.germany] : [])
      .join('path')
      .attr('class', 'map-outline')
      .attr('d', d => d)
      .attr('vector-effect', 'non-scaling-stroke')
      .attr('opacity', view === 'map' ? 1 : 0.45);

    // NUTS3 underlay, at true position only (it is provenance, not a diagram)
    L.nuts3.selectAll('path')
      .data(opts.nuts3 && mapVisible && geographic
              ? Object.entries(layout.paths.nuts3) : [], d => d[0])
      .join('path')
      .attr('class', 'nuts3-poly')
      .attr('d', d => d[1]);

    // Lab polygons. §6.4 recession ladder: full colour -> desaturated ->
    // outline -> gone.
    const labPolyData = mapVisible ? model.labs : [];
    L.labPoly.selectAll('path').data(labPolyData, d => d.id)
      .join('path')
      .attr('d', d => layout.paths.labs[d.id])
      .attr('class', 'lab-poly')
      // overviewOn(), NOT opts.truePos: the checkbox stays ticked when you move to
      // scene 2, and gating on it directly left the polygons parked at their true
      // projected positions while the anchors had already snapped to the
      // state-grouped rows -- polygons and dots in two different places.
      //
      // Animated, so scene 1 -> 2 the regions FLY from their true positions into
      // their row slots. d3 decomposes a transform string to translate/scale and
      // interpolates that, so this is the beat 1.2 move carried into the rows.
      .call(sel => anim(sel)
        .attr('transform', d => overviewOn() ? null : labSet()[d.id].transform))
      .attr('fill', d => view === 'map' ? T.labColour(d.id)
                       : view === 'people' ? T.mapFillMute() : 'none')
      .attr('fill-opacity', view === 'map' ? 0.82 : 1)
      .attr('stroke', view === 'themes' ? T.mapStroke() : T.paper())
      .attr('stroke-width', view === 'themes' ? 1.5 : 1.5);

    // ---- links ------------------------------------------------------------
    const links = buildLinks(show);
    const linkSel = L.links.selectAll('path').data(links, d => d.id);

    // WHEN AN INCOMING LINK STARTS DRAWING.
    //
    // A link's `d` is built from FINAL positions, so it may only draw once BOTH
    // endpoints have stopped moving. On every transition where the respondent
    // dots travel -- into or out of scene 1, the matrix or the beeswarm -- a
    // line drawing during the flight would grow out of the spot its dot is
    // heading for rather than out of the dot, untethered at both ends. SPEC
    // beats 2.1 ("dots enter and settle") and 2.2 ("links draw in") are two
    // beats for exactly this reason, so those transitions wait for the landing.
    //
    // Between the network scenes the respondent positions are frozen (the rule
    // at the end of scene 2), so only the target node has to arrive. Waiting for
    // it to finish growing would put scene 3 past two and a half seconds;
    // starting partway through, once the node is unambiguously there, keeps the
    // whole assembly under two.
    const dotsHold = NETWORK_VIEWS.has(view) && NETWORK_VIEWS.has(renderedView);
    // A press INSIDE one scene (6.2 -> 6.2+) moves nothing, so its lines draw
    // at once rather than waiting out a morph that is not happening.
    const linkGrowDelay = renderedView === view ? 0
      : dotsHold
        ? params.stageDelayMs + params.linkGrowOverlap * params.morphMs
        : params.morphMs;

    // STAGGER BY TARGET, not by index. `(i % 50) * morphStagger` spread 145
    // theme links over 290 ms, which is simultaneous enough to read as one
    // diffuse bloom. Grouping by target instead means every link into a theme
    // draws with its siblings and the themes arrive in turn -- the sweep says
    // which people each theme drew, which is information rather than movement.
    //
    // Indexed WITHIN each link kind. In scene 3 the array holds five lab groups
    // before the sixteen theme groups, but the lab links are persisting updates
    // that never stagger -- counting them would push every theme link late and
    // squash the spread into what was left of the window.
    const groupIndex = new Map();
    const kindCount = new Map();
    for (const l of links) {
      if (groupIndex.has(l.drawGroup)) continue;
      const kind = l.drawGroup.slice(0, l.drawGroup.indexOf(':'));
      const n = kindCount.get(kind) || 0;
      groupIndex.set(l.drawGroup, n);
      kindCount.set(kind, n + 1);
    }
    // Spread over a fixed window rather than a fixed per-group step, so the
    // stagger costs the same at five labs as at sixteen themes.
    const staggerStep = params.linkStaggerWindow
      / Math.max(1, Math.max(1, ...kindCount.values()) - 1);
    const linkStagger = d => (groupIndex.get(d.drawGroup) ?? 0) * staggerStep;

    // Draw bright, settle to the resting opacity. Never DIMMER than the target,
    // or dragging linkOpacity above the draw value would make the line fade up
    // instead of down.
    const growOpacity = d => Math.max(params.linkGrowOpacity, d.o);

    // --- exit ---------------------------------------------------------------
    // Links leave the way their nodes do -- fadeMs, not morphMs. A link has
    // nowhere to travel to, and cutting it while the theme node it lands on
    // takes fadeMs to shrink away would leave that node briefly floating with no
    // connections, which reads as a fault rather than as a scene change. Both
    // ends of the pair depart together.
    if (morph) {
      linkSel.exit().transition()
        .duration(params.fadeMs).ease(d3.easeCubicInOut)
        .style('stroke-opacity', 0);
      linkSel.exit().transition().delay(params.fadeMs).remove();
    } else {
      linkSel.exit().remove();
    }

    // --- enter --------------------------------------------------------------
    // pathLength=1 makes every dash length a FRACTION of the path, so one pair
    // of numbers retracts a 40 px lab link and a 600 px use case link alike --
    // no getTotalLength(), which would force geometry on ~200 paths per scene
    // change. It also survives the `d` tween below: when the string interpolator
    // walks the endpoints, "the whole path" is still 1, so a link that persists
    // into the next scene cannot be left part-drawn by its own movement.
    //
    // dasharray 1 is one dash covering the path followed by an equal gap;
    // dashoffset 1 slides that gap over the path, so the link starts invisible
    // and draws from M forward -- from the respondent.
    const linkEnter = linkSel.enter().append('path').attr('class', 'link')
      .attr('pathLength', 1)
      .attr('stroke-dasharray', 1)
      .attr('stroke-dashoffset', 1)
      .attr('d', d => d.d)
      // Set at once, NOT tweened up. Tweening opacity across the draw would
      // spend the first third of it under the threshold where the line is
      // visible at all, so the growth would begin invisibly. The dash hides the
      // link until it is drawn, so nothing leaks by setting this immediately.
      .style('stroke-opacity', d => morph ? growOpacity(d) : d.o);

    if (morph) {
      const draw = linkEnter.transition()
        .duration(params.linkGrowMs)
        .delay(d => linkGrowDelay + linkStagger(d))
        // easeCubicOut, not the easeCubicInOut everything else uses: a drawing
        // line with an eased-in start reads as stalling halfway.
        .ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0);
      // Chained, so each line starts cooling the moment IT finishes rather than
      // when the last one does. transition.transition() inherits the ease and
      // duration, so both are restated.
      draw.transition()
        .duration(params.linkSettleMs)
        .ease(d3.easeCubicInOut)
        .style('stroke-opacity', d => d.o);
    } else {
      linkEnter.attr('stroke-dashoffset', 0);
    }

    // --- update -------------------------------------------------------------
    // interrupt() FIRST. A link that left and came back inside fadeMs is still
    // in the DOM, so the keyed join matches it here, as an update, with the
    // exit's remove() still pending -- a presenter flipping back to a scene
    // inside a quarter second would watch live links delete themselves. The same
    // call resolves a draw cut short by a re-render, which would otherwise sit
    // part-drawn for the rest of the session.
    linkSel.interrupt().attr('stroke-dashoffset', 0);

    // stroke and stroke-opacity go through style(), not attr(): theme.css gives
    // .link both, and a stylesheet declaration beats a presentation attribute,
    // so the attr() form was silently inert. Every link painted at
    // --link-opacity regardless, which took beat 3.1's dulling and the opacity
    // slider with it.
    linkEnter.merge(linkSel).order();
    linkEnter
      .style('stroke', d => d.stroke)
      .attr('stroke-width', d => d.w);

    // Link `d` strings tween because arc() always emits the same command
    // structure, so d3's default string interpolator walks the numbers. That
    // only holds while arcCurvature > 0; at exactly 0 it emits an L path and the
    // structure changes, which interpolates as a jump rather than a slide.
    //
    // Stroke and width tween with it. Beat 4.3 is these same elements
    // re-weighting from experience to interest, and SPEC asks for the
    // thickness to morph -- set outside the transition, it jumped.
    anim(linkSel)
      .attr('d', d => d.d)
      .style('stroke', d => d.stroke)
      .attr('stroke-width', d => d.w)
      .style('stroke-opacity', d => d.o);

    // ---- nodes ------------------------------------------------------------
    const nodes = buildNodes(show);
    // Direct children only: selectAll('g') also caught each node's own g.pie
    // and g.cells, whose inherited keys then fell into exit on every render.
    const join = L.nodes.selectChildren('g').data(nodes, d => d.key);

    // A node that was leaving and is wanted again -- the presenter pressed back
    // before its exit finished. Its group still has the delayed remove() queued
    // and its circle is still fading to 0, and nothing below schedules a
    // transition on the group itself, so without this the dot is deleted a
    // moment after it was re-bound and stays gone until the next press.
    join.filter(function () { return this.__exiting; }).each(function () {
      this.__exiting = false;
      const g = d3.select(this);
      g.interrupt();
      g.selectChildren().interrupt();
    });

    // --- exit -------------------------------------------------------------
    // Respondent and matrix dots have somewhere to TRAVEL, so they get the full
    // morph. Theme nodes at the end of scene 3 and use case nodes at the end of
    // scene 4 have nowhere to go -- holding them for 1.1 s just delays the next
    // scene, so they shrink away quickly instead.
    if (morph) {
      join.exit().each(function () { this.__exiting = true; });
      // Into scene 7 even the dots have nowhere to travel, so they clear at
      // fade speed rather than holding the word cloud back for a full morph.
      const dur = d => view !== 'cloud' && (d.kind === 'mdot'
                     || d.kind === 'resp' || d.kind === 'sdot'
                     || d.kind === 'pdot' || d.kind === 'modot')
        ? params.morphMs : params.fadeMs;
      join.exit().select('circle').transition()
        .duration(dur).ease(d3.easeCubicInOut)
        .attr('cx', d => exitPos(d).x).attr('cy', d => exitPos(d).y)
        .attr('r', d => growsFromZero(d) ? 0 : d.r)
        .attr('opacity', 0);
      // The wedges leave WITH their circle. Without this the pie would sit at
      // the old position, still fully opaque, while the dot it belongs to flew
      // off to the matrix -- a colour left behind by its own dot.
      join.exit().select('g.cells').transition()
        .duration(params.fadeMs).attr('opacity', 0);
      join.exit().select('g.pie').transition()
        .duration(dur).ease(d3.easeCubicInOut)
        .attr('transform', d => `translate(${exitPos(d).x},${exitPos(d).y})`)
        .attr('opacity', 0);
      join.exit().transition().delay(dur).remove();
    } else {
      join.exit().remove();
    }

    // --- enter ------------------------------------------------------------
    // Dots enter AT the place they are coming from -- that is what turns one
    // respondent dot into several matrix dots instead of cutting between two
    // different pictures. Theme and use case nodes enter at radius 0 so they
    // grow rather than materialise.
    const ent = join.enter().append('g');
    ent.append('circle')
      .attr('cx', d => enterPos(d).x).attr('cy', d => enterPos(d).y)
      .attr('r', d => growsFromZero(d) ? 0 : d.r)
      .attr('opacity', 0)
      .each(function () { this.__enter = true; });

    // --- both -------------------------------------------------------------
    const allC = ent.merge(join).select('circle')
      .attr('stroke-dasharray', d => d.dash || null);

    // Wedges are built BEFORE the circle's move is scheduled, so a pie created
    // on this render can read its own dot's CURRENT position off the sibling
    // circle and start from there. Otherwise a pie appearing on the scene 1 -> 2
    // change would sit at the destination while its dot was still in flight.
    const allNodes = ent.merge(join);
    paintPie(allNodes, T);
    paintCells(allNodes, morph);
    animStaged(allNodes.select('g.pie'))
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .attr('opacity', 1);

    animStaged(allC)
      .attr('cx', d => d.x).attr('cy', d => d.y).attr('r', d => d.r)
      .attr('opacity', 1)
      // Fill is inside the transition on purpose: it is how the scene 1 roster
      // greys become lab colours on the way to scene 2.
      .attr('fill', d => d.fill)
      .attr('stroke', d => d.stroke)
      .attr('stroke-width', d => d.sw);

    // ---- numbers inside nodes (scene 3) -----------------------------------
    const inner = [];
    if (show.themes) {
      const em = shown(themeEmphasis());
      for (const th of model.themes) {
        const p = layout.themes[th.id];
        // A node split into lab cells has no room for its count; it moves
        // under the label instead (see buildLabels).
        if (cellsOf('theme', th.id)) continue;
        inner.push({
          key: 'ti-' + th.id, kind: 'theme', x: p.x, y: p.y, text: String(th.n),
          top: em.top.has(th.id), low: em.low.has(th.id),
          // Shrink the digits on the smallest nodes rather than let a two-digit
          // count spill outside its own circle.
          size: Math.min(T.fs.label(), Math.max(T.fs.min() * 0.8, p.r * 0.95)),
        });
      }
    }
    if (show.stake) {
      const em = shown(stakeholderEmphasis());
      for (const sg of model.stakeholders) {
        const p = layout.stakeholders[sg.id];
        if (!p) continue;
        if (cellsOf('stakeholder', sg.id)) continue;
        inner.push({
          key: 'si-' + sg.id, kind: 'stakeholder', x: p.x, y: p.y,
          text: String(sg.n),
          top: em.top.has(sg.id), low: em.low.has(sg.id),
          size: Math.min(T.fs.label(), Math.max(T.fs.min() * 0.8, p.r * 0.95)),
        });
      }
    }
    // SCENE 2 ONLY: each lab's cohort size, inside its node. Leaving scene 2 the
    // numbers vanish and the nodes shrink to a uniform size, which is the whole
    // 2 -> 3 transition: the labs stop being the subject.
    if (view === 'people') {
      for (const l of model.labs) {
        const p = labPt(l.id);
        inner.push({
          key: 'li-' + l.id, kind: 'lab', x: p.x, y: p.y, text: String(l.n),
          top: false, low: false, onLab: true,
          size: Math.min(T.fs.head(), Math.max(T.fs.min(), layout.labs[l.id].r * 0.85)),
        });
      }
    }
    // Enter AT the node centre at zero size, then grow. Joining plainly left the
    // numbers with no x/y on enter, so they animated in from the origin -- which
    // on screen looks like text flying in from the top-left of the stage.
    L.nodeText.selectAll('text').data(inner, d => d.key)
      .join(
        enter => enter.append('text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('x', d => d.x).attr('y', d => d.y)
          .attr('font-size', 0)
          .attr('opacity', 0)
          // Marked so the number grows on the same delayed schedule as the node
          // it sits in, rather than arriving before its circle exists.
          .each(function () { this.__enter = true; }),
        update => update,
        exit => exit.remove())
      .attr('font-weight', d => d.top ? 700 : 600)
      // A lab number sits on the lab's own fill, so it is knocked out in WHITE.
      // Two of the five lab colours are light (lime #9BC72D, terracotta
      // #C18F59), where white alone is weak, so the number also gets a dark
      // halo -- see the stroke below. Theme numbers sit on paper and take brand
      // ink instead.
      .attr('fill', d => d.onLab ? '#FFFFFF'
                       : d.top ? T.emphasis() : d.low ? T.inkMute() : T.ink())
      // Dark halo behind a lab number so pure white stays legible on the light
      // lab colours. Theme numbers sit on paper and need no halo.
      .attr('paint-order', d => d.onLab ? 'stroke' : null)
      .attr('stroke', d => d.onLab ? 'rgba(0,0,0,0.34)' : null)
      .attr('stroke-width', d => d.onLab ? Math.max(2.5, d.size * 0.12) : null)
      .attr('stroke-linejoin', 'round')
      .text(d => d.text)
      .call(sel => animStaged(sel)
        .attr('x', d => d.x).attr('y', d => d.y)
        .attr('font-size', d => d.size)
        .attr('opacity', 1));

    // ---- node icons (scenes 4 and 6) --------------------------------------
    // `kind` is needed so the glyph inherits its node's stage delay, and `pos`
    // is carried on the datum so one join serves both scenes rather than being
    // hardwired to a single position table.
    const iconData = !opts.icons ? []
      : show.uc
        ? model.useCases.map(u => ({
            ...u, kind: 'usecase', pos: layout.useCases[u.id] }))
        : [];
    // Which node, if any, gets the emphasis colour. Scene 6 may legitimately
    // have no leader at all -- see monitoringLead().
    const leadIds = !opts.highlight ? new Set()
      : show.uc ? new Set([useCaseLead().id])
      : new Set();
    // Two nested groups: the outer one positions, the inner one scales. That
    // separation is what lets an entering icon start at scale(0) ON the node
    // centre and grow, instead of sliding in from the stage origin.
    //
    // Stroke width is the SAME for every icon, leader included. The callout
    // belongs to the node's ring; thickening the glyph as well made the leader
    // read as a different kind of thing rather than the same thing emphasised.
    const iconSel = L.icons.selectAll('g.icon').data(iconData, d => d.id);
    const iconEnter = iconSel.enter().append('g').attr('class', 'icon')
      .attr('transform', d => `translate(${d.pos.x},${d.pos.y})`);
    iconEnter.append('g').attr('class', 'glyph').attr('transform', 'scale(0)')
      .each(function () { this.__enter = true; });
    iconSel.exit().remove();

    iconEnter.merge(iconSel)
      .attr('color', d => leadIds.has(d.id) ? T.emphasis() : T.ink())
      .call(sel => anim(sel)
        .attr('transform', d => `translate(${d.pos.x},${d.pos.y})`))
      .each(function (d) {
        const p = d.pos;
        const glyph = d3.select(this).select('g.glyph');
        drawGlyph(glyph, d.id, 1.7);
        // Grows with its node, on the same staged schedule.
        animStaged(glyph).attr('transform',
          `scale(${scaleFor(p.r * 1.25).toFixed(4)})`);
      });

    // ---- labels -----------------------------------------------------------
    // Nodes never move to make room for text (SPEC 3: position must stay
    // honest). Only the text moves, and anything pushed far enough to lose its
    // node gets a leader line back to it.
    const labels = opts.labels ? buildLabels(show) : [];
    // State row labels are structural furniture, not node labels -- dodging
    // them would detach a row heading from its row.
    const pinned = labels.filter(d => d.pinned);
    const dodgeable = labels.filter(d => !d.pinned);
    dodge(dodgeable, { bounds: { x0: 0, y0: 40, x1: 1920, y1: 1040 } });
    // A pinned label normally has nothing to point at: it sits where it belongs
    // and its anchor is its own position. `keepAnchor` is the exception -- a
    // label that names a CLUSTER rather than a node, and so still needs the
    // leader line back to it.
    for (const d of pinned) {
      if (d.keepAnchor) continue;
      d.ax = d.x; d.ay = d.y; d.moved = 0;
    }

    L.labels.selectAll('line').data(labels.filter(d => d.moved > 6), d => d.key)
      .join('line')
      .attr('x1', d => d.ax).attr('y1', d => d.ay)
      .attr('x2', d => d.x).attr('y2', d => d.y)
      .attr('stroke', T.rule()).attr('stroke-width', 1.2)
      .attr('stroke-opacity', 0.9);

    // Labels grow with the node they name, on the same staged schedule: they
    // enter at font-size 0 with their line spacing collapsed, then both grow.
    // Animating font-size alone would leave two-line labels with final-size gaps
    // between zero-size lines, so the tspan dy is tweened too.
    const labSel = L.labels.selectAll('text').data(labels, d => d.key);
    labSel.exit().remove();
    const labEnter = labSel.enter().append('text')
      .attr('x', d => d.x).attr('y', d => d.y)
      .attr('font-size', 0)
      .attr('opacity', 0)
      .each(function () { this.__enter = true; });

    labEnter.merge(labSel)
      .attr('text-anchor', d => d.anchor || 'middle')
      .attr('font-weight', d => d.weight || 600)
      .attr('fill', d => d.fill || T.ink())
      // Paper halo behind every label. The dodge separates labels vertically,
      // which cannot fully resolve sixteen theme names in a crowded centre, and
      // a label crossing a link or another label becomes unreadable. Painting
      // the stroke first knocks a paper outline out behind the glyphs, so the
      // text stays legible over whatever it lands on. paint-order is the whole
      // trick -- without it the stroke covers the fill.
      .attr('paint-order', 'stroke')
      .attr('stroke', T.paper())
      .attr('stroke-width', d => Math.max(3, d.size * 0.16))
      .attr('stroke-linejoin', 'round')
      .each(function (d) {
        // One tspan per line. Re-binding on every render keeps x in step when a
        // slider moves the node underneath.
        const entering = this.__enter;
        const sel = d3.select(this).selectAll('tspan')
          .data(d.lines.map((ln, i) => ({ ln, i, d })))
          .join(enter => enter.append('tspan')
            .attr('x', p => p.d.x)
            .attr('dy', 0)
            .each(function () { this.__enter = entering; }));
        sel.text(p => p.ln);
        animStaged(sel)
          .attr('x', p => p.d.x)
          .attr('dy', p => (p.i === 0 ? 0 : p.d.size * 1.05));
      })
      .call(sel => animStaged(sel)
        .attr('x', d => d.x).attr('y', d => d.y)
        .attr('font-size', d => d.size)
        .attr('opacity', 1));

    // ---- chrome (axes, matrix, readouts) ---------------------------------
    L.chrome.selectAll('*').remove();
    if (!show.matrix && !show.part && !show.mon) {
      L.bubbles.selectAll('circle').remove();
    }
    if (show.invite) drawRecipients();
    if (show.matrix) drawMatrix();
    if (view === 'map') drawRosterHeader();
    drawSceneHeader();
    if (show.swarm) drawSwarmAxis();
    if (show.spine) drawSpine();
    if (show.part) drawParticipation();
    if (show.themes) drawThemeStats();
    if (show.mon) drawMonitoringReadout();
    // Every render, not only in scene 7: leaving the scene is what shrinks
    // the words away.
    drawWordCloud(show, morph);
    if (show.cloud) drawWordCloudCaption();
    if (show.thanks) drawThanks(morph);

    renderedView = view;
  }

  // True-position overview is a SCENE 1 control only. In scenes 2-5 the
  // respondent positions are baked against the contracted anchors, so zooming
  // the map without them would put every dot in the wrong place.
  function overviewOn() {
    // Beat 1.1 shows the country with labs at true position -- only meaningful
    // while anchors are geographic.
    // Scene 1 is always geographic, so the overview is available there
    // regardless of the anchor mode the rest of the deck uses.
    return opts.truePos && view === 'map';
  }

  /**
   * Which anchor set the current scene uses.
   *
   * SCENE 1 IS ALWAYS GEOGRAPHIC. Beat 1.1 puts the polygons at their true
   * position and 1.2 contracts them; neither means anything on a state-grouped
   * diagram, and the audience has to see the real map before it is allowed to
   * become one. The grouped rows come in from scene 2.
   */
  function labSet() {
    return view === 'map' ? layout.labsGeographic : layout.labs;
  }

  /** Is the CURRENT scene showing geographic positions? */
  function sceneIsGeographic() {
    return view === 'map' || layout.anchorMode === 'geographic';
  }

  /** Display position of a lab anchor, following the overview zoom when on. */
  function labPt(id) {
    const p = labSet()[id];
    if (!overviewOn()) return { x: p.x, y: p.y };
    const o = layout.overview;
    return { x: o.x + o.scale * p.trueX, y: o.y + o.scale * p.trueY };
  }

  // The scenes whose respondent dots sit in the network arrangement. Scene 4.5
  // and scene 5 are the two that rearrange them.
  // Scene 6 left this set on review (17 September 2026): its dots are packed
  // into the monitoring bubbles, not at their network positions.
  const NETWORK_VIEWS = new Set(['people', 'themes', 'stake', 'uc']);

  /** Mean position of a respondent's matrix dots, or null if they have none. */
  const matrixCentroidCache = new Map();
  // Where a researcher's statement dots sit as a group, cached. Scene 5.2
  // multiplies each of the 49 respondent dots into six, so the reverse trip has
  // to converge on something -- the same trick the matrix uses, and the same
  // reason: without it the change is a cut between two unrelated pictures.
  const spineCentroidCache = new Map();
  function spineCentroid(rid) {
    if (spineCentroidCache.has(rid)) return spineCentroidCache.get(rid);
    if (!layout.spine) return null;
    let sx = 0, sy = 0, n = 0;
    for (const d of Object.values(layout.spine.dots)) {
      if (d.rid === rid) { sx += d.x; sy += d.y; n++; }
    }
    const v = n ? { x: sx / n, y: sy / n } : null;
    spineCentroidCache.set(rid, v);
    return v;
  }

  // Respondents by id. buildNodes and buildLinks both need to go from a
  // statement dot back to its person, and a linear find() per dot is 294 scans
  // of a 49-element array on every render.
  const respById = new Map();

  // Where a researcher's participation-matrix dots sit, for the morph in and
  // out of scene 5.2 -- the same multiply / converge trick as the matrix.
  const monCentroidCache = new Map();
  function monCentroid(rid) {
    if (monCentroidCache.has(rid)) return monCentroidCache.get(rid);
    if (!layout.monBubbles) return null;
    let sx = 0, sy = 0, n = 0;
    for (const d of Object.values(layout.monBubbles.dots)) {
      if (d.respondent === rid) { sx += d.x; sy += d.y; n++; }
    }
    const v = n ? { x: sx / n, y: sy / n } : null;
    monCentroidCache.set(rid, v);
    return v;
  }
  const partCentroidCache = new Map();
  function partCentroid(rid) {
    if (partCentroidCache.has(rid)) return partCentroidCache.get(rid);
    if (!layout.part) return null;
    let sx = 0, sy = 0, n = 0;
    for (const d of Object.values(layout.part.dots)) {
      if (d.respondent === rid) { sx += d.x; sy += d.y; n++; }
    }
    const v = n ? { x: sx / n, y: sy / n } : null;
    partCentroidCache.set(rid, v);
    return v;
  }

  function matrixCentroid(rid) {
    if (matrixCentroidCache.has(rid)) return matrixCentroidCache.get(rid);
    let sx = 0, sy = 0, n = 0;
    for (const d of Object.values(layout.matrix.dots)) {
      if (d.respondent === rid) { sx += d.x; sy += d.y; n++; }
    }
    const v = n ? { x: sx / n, y: sy / n } : null;
    matrixCentroidCache.set(rid, v);
    return v;
  }

  /**
   * WHERE A DOT COMES FROM, AND WHERE IT GOES.
   *
   * Scene 4 has 49 respondent dots; scene 4.5 has 191, one per (researcher, lab,
   * use case) with experience. There is no one-to-one mapping, so a plain keyed
   * join would simply cut. Instead each entering matrix dot STARTS at its own
   * researcher's network position -- so one dot visibly becomes several and they
   * fan out into the bubbles -- and on the way to the beeswarm they converge back
   * onto that researcher's single swarm position and fade, while the one
   * surviving respondent dot enters from the centre of the cluster it came from.
   *
   * Multiplication on the way in, convergence on the way out.
   */
  function enterPos(d) {
    if (d.kind === 'modot' && renderedView) {
      if (renderedView === 'part') return partCentroid(d.rid) || d;
      if (renderedView === 'matrix') return matrixCentroid(d.rid) || d;
      if (NETWORK_VIEWS.has(renderedView)) return layout.respondents[d.rid] || d;
    }
    if ((d.kind === 'pdot' || d.kind === 'resp' || d.kind === 'mdot')
        && renderedView === 'mon') {
      return monCentroid(d.rid) || d;
    }
    if (d.kind === 'pdot' && renderedView) {
      if (renderedView === 'matrix') return matrixCentroid(d.rid) || d;
      if (NETWORK_VIEWS.has(renderedView)) return layout.respondents[d.rid] || d;
      if (renderedView === 'swarm') return layout.swarm.positions[d.rid] || d;
    }
    if (d.kind === 'mdot' && renderedView === 'part') {
      return partCentroid(d.rid) || d;
    }
    if (d.kind === 'resp' && renderedView === 'part') {
      return partCentroid(d.rid) || d;
    }
    if (d.kind === 'mdot' && renderedView) {
      if (NETWORK_VIEWS.has(renderedView)) return layout.respondents[d.rid] || d;
      if (renderedView === 'swarm') return layout.swarm.positions[d.rid] || d;
    }
    // Each statement dot enters AT its own researcher, so one dot visibly
    // becomes six and they fan out to their rows.
    if (d.kind === 'sdot' && renderedView) {
      if (renderedView === 'swarm') return layout.swarm.positions[d.rid] || d;
      if (NETWORK_VIEWS.has(renderedView)) return layout.respondents[d.rid] || d;
      // The deck goes straight from the matrix to the wall: each person's
      // statement dots grow out of the middle of their own matrix dots.
      if (renderedView === 'matrix') return matrixCentroid(d.rid) || d;
    }
    if (d.kind === 'resp' && renderedView === 'matrix') {
      return matrixCentroid(d.rid) || d;
    }
    // Coming back from the wall, the one surviving dot enters from the centre
    // of the column it came from.
    if (d.kind === 'resp' && renderedView === 'spine') {
      return spineCentroid(d.rid) || d;
    }
    return d;
  }

  function exitPos(d) {
    if (d.kind === 'modot') {
      if (view === 'part') return partCentroid(d.rid) || d;
      if (view === 'matrix') return matrixCentroid(d.rid) || d;
      if (NETWORK_VIEWS.has(view)) return layout.respondents[d.rid] || d;
    }
    if ((d.kind === 'pdot' || d.kind === 'resp' || d.kind === 'mdot')
        && view === 'mon') {
      return monCentroid(d.rid) || d;
    }
    if (d.kind === 'pdot') {
      if (view === 'matrix') return matrixCentroid(d.rid) || d;
      if (NETWORK_VIEWS.has(view)) return layout.respondents[d.rid] || d;
      if (view === 'swarm') return layout.swarm.positions[d.rid] || d;
    }
    if (d.kind === 'mdot' && view === 'part') return partCentroid(d.rid) || d;
    if (d.kind === 'resp' && view === 'part') return partCentroid(d.rid) || d;
    if (d.kind === 'mdot') {
      if (view === 'swarm') return layout.swarm.positions[d.rid] || d;
      if (NETWORK_VIEWS.has(view)) return layout.respondents[d.rid] || d;
      if (view === 'spine') return spineCentroid(d.rid) || d;
    }
    // On the way out the six converge back onto their researcher's single dot.
    if (d.kind === 'sdot') {
      if (view === 'swarm') return layout.swarm.positions[d.rid] || d;
      if (NETWORK_VIEWS.has(view)) return layout.respondents[d.rid] || d;
    }
    if (d.kind === 'resp' && view === 'matrix') {
      return matrixCentroid(d.rid) || d;
    }
    if (d.kind === 'resp' && view === 'spine') {
      return spineCentroid(d.rid) || d;
    }
    return d;
  }

  /**
   * Which themes get called out in scene 3.
   *
   * TIES ARE INCLUDED, NOT BROKEN. On the synthetic set the counts run
   * 14, 13, 11, 11, 11, 11, ... -- a four-way tie for third. Taking a flat
   * slice(0, 3) would bold one of those four and leave the other three plain,
   * and the first person to read the numbers off the screen would ask why. So
   * the rule is "count >= the third-highest count", which is defensible out
   * loud even when it emphasises more than three nodes.
   *
   * `tie` reports when that happened so the diagnostics panel can say so and
   * the presenter is not surprised by six bold nodes on stage.
   */
  // Shared by the themes scene and the stakeholder scene: the same question
  // asked of a different node set, so the same rule and the same tie handling.
  //
  // TIES ARE INCLUDED, not broken. On the synthetic themes the counts run
  // 14, 13, 11, 11, 11, 11 -- a four-way tie for third. A flat slice(0, 3) would
  // bold one of those four and leave three identical numbers plain, and the
  // first person to read the screen would ask why. `tie` reports when that
  // widened the callout, so six bold nodes is never a surprise on stage.
  function nodeEmphasis(items) {
    if (!items.length) {
      return { top: new Set(), low: new Set(), minN: 0, cut: 0, tie: false };
    }
    const counts = [...new Set(items.map(t => t.n))].sort((a, b) => b - a);
    const cut = counts[Math.min(2, counts.length - 1)];
    const top = new Set(items.filter(t => t.n >= cut).map(t => t.id));

    const minN = Math.min(...items.map(t => t.n));
    const low = new Set(items.filter(t => t.n === minN).map(t => t.id));

    return { top, low, minN, cut, tie: top.size > 3 };
  }

  function themeEmphasis() { return nodeEmphasis(model.themes); }
  function stakeholderEmphasis() { return nodeEmphasis(model.stakeholders); }

  // THE HIGHLIGHT PRESS (review of 16 September 2026). Every callout -- the
  // top/bottom rings, bold labels, row leaders, the "nobody" cells -- waits
  // for its own press, so the presenter can explain the diagram first and
  // then point at the result. The rules above still compute the same answer
  // (the lab diagnostics read them directly); the stage just does not draw
  // it until opts.highlight is on.
  const NO_EMPHASIS = { top: new Set(), low: new Set() };
  function shown(em) { return opts.highlight ? em : { ...em, ...NO_EMPHASIS }; }

  // The lab cells a node shows right now, or null. Only the called-out top
  // nodes, and only on the highlight press. To split EVERY node instead,
  // drop the emphasis test here.
  function cellsOf(kind, id) {
    if (!opts.highlight || !layout) return null;
    const em = kind === 'theme' ? themeEmphasis() : stakeholderEmphasis();
    if (!em.top.has(id)) return null;
    const cells = (kind === 'theme' ? layout.themeCells
                                    : layout.stakeholderCells)?.[id];
    return cells?.length ? cells : null;
  }
  // ...and its count, moved out of the node and under the name.
  function withCount(lines, kind, item) {
    return cellsOf(kind, item.id) ? [...lines, String(item.n)] : lines;
  }

  /**
   * The use case with the most links in the CURRENTLY DISPLAYED weighting.
   * Beat 4.3 morphs experience -> interest, and the leader can change between
   * the two -- which is itself the point of the beat, so it is not pinned to
   * experience.
   */
  function useCaseLead() {
    const key = opts.interest ? 'nInterested' : 'nExperienced';
    let best = null;
    for (const u of model.useCases) if (!best || u[key] > best[key]) best = u;
    return { id: best?.id, key, n: best?.[key] ?? 0 };
  }

  // --- links -----------------------------------------------------------------
  function buildLinks(show) {
    const out = [];
    const R = layout.respondents, LB = layout.labs;
    const c = params.arcCurvature, base = params.linkOpacity;

    // SPEC beat 3.1 wants these dulled rather than removed -- they explain why
    // respondents sit where they do. The switch exists to test the other
    // reading: at 145 theme links plus 60 lab links the scene may simply be
    // busier than it is informative.
    // Every scene that hangs a satellite layer off the respondent dots dulls
    // these rather than dropping them (SPEC beat 3.1): they are the reason each
    // dot sits where it does.
    const satellites = show.themes || show.stake || show.uc || show.mon;
    const showLabLinks = show.people && (opts.labLinks || !satellites);

    if (showLabLinks) {
      const o = satellites ? T.linkDull() : base;
      for (const l of model.links.respondentLab) {
        const a = R[l.source], b = LB[l.target];
        if (!a || !b) continue;
        out.push({ id: 'rl-' + l.id, d: arc(a.x, a.y, b.x, b.y, c),
          drawGroup: 'lab:' + l.target,
          stroke: T.labColour(l.target), w: 1.2, o });
      }
    }
    if (show.themes) {
      for (const l of model.links.respondentTheme) {
        const a = R[l.source], b = layout.themes[l.target];
        if (!a || !b) continue;
        out.push({ id: 'rt-' + l.id, d: arc(a.x, a.y, b.x, b.y, c),
          drawGroup: 'theme:' + l.target,
          stroke: T.linkInk(), w: 1.1, o: base });
      }
    }
    if (show.stake) {
      for (const l of model.links.respondentStakeholder) {
        const a = R[l.source], b = layout.stakeholders[l.target];
        if (!a || !b) continue;
        // Stagger keyed to the TARGET node, like the theme links: every link
        // into a group draws with its siblings and the groups arrive in turn,
        // so the sweep says which people each group drew. Group index is
        // counted within kind, so adding a fourth link kind costs nothing.
        out.push({ id: 'rs-' + l.id, d: arc(a.x, a.y, b.x, b.y, c),
          drawGroup: 'stake:' + l.target,
          stroke: T.linkInk(), w: 1.1, o: base });
      }
    }
    if (show.spine && layout.spine) {
      // The spine, one segment per group. `M` is at the SHALLOWEST affirmation
      // and the line runs to the deepest, so it draws upward -- the same
      // "participant reaching out" direction every other link in the deck has.
      //
      // Never one line across both groups: that would span the gap the layout
      // opens to say the modes are not higher rungs, and undo it.
      for (const [key, sp] of Object.entries(layout.spine.spines)) {
        const r = respById.get(sp.rid);
        if (!r) continue;
        out.push({
          id: 'sp-' + key,
          d: `M${sp.x},${sp.y1}L${sp.x},${sp.y0}`,
          drawGroup: 'spine:' + sp.kind,
          // The person's own lab colour, so a spine belongs visibly to the dots
          // it joins rather than reading as separate furniture.
          stroke: T.labColour(r.primaryLab), w: 2, o: 0.55,
        });
      }
    }
    if (show.mon && opts.monThemes && opts.highlight && layout.monBubbles) {
      // Scene 6, third press: one line per theme x topic pair, bubble edge to
      // theme edge. WIDTH is the number of the theme's researchers who are
      // very interested in the topic; the largest group per topic is green.
      const MB = layout.monBubbles;
      const edge = (p, r, to) => {
        const a = Math.atan2(to.y - p.y, to.x - p.x);
        return { x: p.x + r * Math.cos(a), y: p.y + r * Math.sin(a) };
      };
      for (const l of MB.links) {
        const b = MB.bubbles[l.topic], th = layout.themes[l.theme];
        if (!b || !th) continue;
        const p = edge(b, b.r, th), q = edge(th, th.r * MON_THEME_SCALE, b);
        out.push({ id: `mt-${l.theme}|${l.topic}`,
          d: arc(p.x, p.y, q.x, q.y, 0.22),
          drawGroup: 'montheme:' + l.topic,
          stroke: l.strong ? T.emphasis() : T.ink(),
          w: 1 + l.both * 1.2,
          o: l.strong ? 0.6 : 0.2 });
      }
    }
    if (show.uc) {
      // beat 4.2 -> 4.3: same elements, weight morphs. Zero-weight links are
      // kept out of the DOM entirely (see model.js) so the topology stays
      // readable when experience is 0 but interest is not.
      for (const l of model.links.respondentUseCase) {
        const a = R[l.source], b = layout.useCases[l.target];
        if (!a || !b) continue;
        const wv = opts.interest ? l.interest : l.experience;
        if (!wv) continue;
        out.push({ id: 'ru-' + l.id, d: arc(a.x, a.y, b.x, b.y, c),
          drawGroup: 'uc:' + l.target,
          stroke: opts.interest ? T.gain() : T.linkInk(),
          w: wv * params.weightScale, o: base });
      }
    }
    return out;
  }

  // --- nodes -----------------------------------------------------------------
  function buildNodes(show) {
    const out = [];

    // SCENE 0.5: one dot per person the survey was sent to.
    //
    // Two populations, drawn identically on purpose: 49 real respondents keyed
    // `r-<id>` and the rest anonymous. You cannot tell which is which, and that
    // is the question the beat answers. The respondents are the SAME DOM
    // circles that go on to the roster, their lab, the matrix and the beeswarm,
    // so object constancy now starts at the first slide (SPEC 2.1).
    if (show.invite && layout.recipients) {
      const RC = layout.recipients;
      // BEAT 0.5b MOVES NOBODY. Every dot stays in its slot; the unanswered
      // invitations fade to a pale grey and the people who answered keep the
      // grey they had, so the answer is picked out of the block where it
      // stands. The fill is inside the stage transition, so the fade animates.
      //
      // The survivors fly to the scene 1 roster on the NEXT press, where the
      // pale dots shrink away.
      for (const r of model.respondents) {
        const p = RC.responses[r.id];
        if (!p) continue;
        out.push({
          key: 'r-' + r.id, kind: 'resp', rid: r.id, si: r.index,
          x: p.x, y: p.y, r: RC.dotR,
          // No `labs`, so no pie, and uniform grey: nothing about a person is
          // known on this slide except whether they answered.
          fill: T.inkMute(), stroke: T.paper(), sw: 1,
        });
      }
      for (const e of RC.extra) {
        out.push({
          key: 'x-' + e.i, kind: 'xdot', si: e.i,
          x: e.x, y: e.y, r: RC.dotR,
          fill: opts.responses ? T.rule() : T.inkMute(),
          stroke: T.paper(), sw: 1,
        });
      }
    }

    // SCENE 1: every respondent already on stage, in a tidy grid. Same keys as
    // every later scene, so scene 2 is these dots flying to their lab rather
    // than 49 dots materialising.
    if (view === 'map') {
      for (const r of model.respondents) {
        const p = layout.roster.positions[r.id];
        if (!p) continue;
        out.push({
          key: 'r-' + r.id, kind: 'resp', rid: r.id, si: r.index,
          x: p.x, y: p.y, r: params.respondentRadius,
          // No `labs` here, so no pie: a divided dot in scene 1 would give away
          // the multi-lab answer before the question has been asked. The wedges
          // are created on the way to scene 2 and fade in as the dots fly, the
          // same trick the fill already uses.
          // UNIFORM grey in scene 1. Nobody has been assigned to anywhere yet,
          // and colouring them by lab here would give away scene 2's answer
          // before the question has been asked. The fill is inside the morph
          // transition, so moving to scene 2 the dots take on their lab colour
          // as they fly.
          fill: T.inkMute(),
          stroke: T.paper(), sw: 1,
        });
      }
    }
    if (show.people || show.themes || show.uc) {
      for (const r of model.respondents) {
        const p = layout.respondents[r.id];
        if (!p) continue;
        out.push({
          key: 'r-' + r.id, kind: 'resp', rid: r.id, si: r.index,
          x: p.x, y: p.y, r: params.respondentRadius,
          // One wedge per lab (see paintPie). The circle's own fill still shows
          // through while the pie fades in, so it stays the primary lab's hue.
          labs: r.labIds,
          fill: T.labColour(r.primaryLab),
          // A bridge is now marked by SHAPE -- a divided dot -- so the ring is
          // redundant emphasis and deliberately takes no hue. Both obvious
          // candidates collide with a lab colour: `--accent` is byte-identical
          // to `--lab-0`, and `--emphasis` (#0E5C3A) is a near-match for
          // `--lab-3` (#225E43), indistinguishable in the projector variant.
          // Whichever hue is chosen, one of the five labs loses its callout, so
          // the callout is thickness against paper instead.
          stroke: opts.bridge && r.flagged ? T.flag() : T.paper(),
          sw: opts.bridge && (r.isBridge || r.flagged) ? 2 : 1,
          dash: opts.bridge && r.flagged && !r.isBridge ? '2 2' : null,
        });
      }
    }
    // Beat 4.5a0 is the grid and the empty cohort bubbles: the room reads the
    // two axes and how big each lab is before it is asked to count anyone.
    if (show.matrix && opts.matrixDots) {
      // One dot per (researcher, lab, use case) with experience. Keyed by
      // person, so these are the elements that morph in and out of the network
      // and the beeswarm rather than being redrawn.
      for (const [key, d] of Object.entries(layout.matrix.dots)) {
        // Beat one is experience only. The demand rings are simply not built
        // until the beat arrives, so they enter from their own researcher's
        // network position like every other matrix dot.
        const demand = d.role === 'demand';
        if (demand && !opts.demand) continue;
        out.push({
          key: 'md-' + key, kind: 'mdot', rid: d.respondent,
          x: d.x, y: d.y, r: layout.matrix.dotR,
          // Hollow, in the lab's own hue: "we want this" against the solid
          // "we have this". Same colour, so the pair reads as one population
          // split by state rather than two unrelated things -- and the shape,
          // not the colour, carries which is which.
          fill: demand ? 'none' : T.labColour(d.lab),
          stroke: demand ? T.labColour(d.lab) : T.paper(),
          sw: demand ? 1.4 : 0.9,
        });
      }
    }
    if (show.part && opts.partCells && layout.part) {
      // Solid = "Like me" / "Very much like me"; hollow = "Unsure" or lower.
      // Same marks as scene 4.5, so the slide reads as its sibling.
      for (const [key, d] of Object.entries(layout.part.dots)) {
        const hollow = d.role === 'not';
        out.push({
          key: 'pd-' + key, kind: 'pdot', rid: d.respondent,
          si: respById.get(d.respondent)?.index,
          x: d.x, y: d.y, r: layout.part.dotR,
          fill: hollow ? 'none' : T.labColour(d.lab),
          stroke: hollow ? T.labColour(d.lab) : T.paper(),
          sw: hollow ? 1.4 : 0.9,
        });
      }
    }
    if (show.spine && layout.spine) {
      const SPL = layout.spine;
      // FOUR states, not two. "Unsure" is a real answer on a five-point scale
      // and collapsing it into a no would overstate the negative; an
      // unanswered cell is not a no either. So: filled for an affirmation,
      // hollow for unsure, a small faint dot for a no, and a smaller one still
      // for no answer -- a gradient of presence rather than a binary.
      //
      // Filled dots take the LAB colour, so the wall keeps carrying lab
      // identity without needing a second legend.
      for (const [key, d] of Object.entries(SPL.dots)) {
        const r = respById.get(d.rid);
        if (!r) continue;
        const lab = T.labColour(r.primaryLab);
        const style =
          d.level === 'affirm'
            ? { fill: lab, stroke: T.paper(), sw: 1, rr: SPL.dotR }
          : d.level === 'unsure'
            ? { fill: 'none', stroke: lab, sw: 1.6, rr: SPL.dotR - 0.5 }
          : d.level === 'no'
            ? { fill: T.inkMute(), stroke: 'none', sw: 0, rr: SPL.dotR * 0.34 }
            : { fill: T.inkMute(), stroke: 'none', sw: 0, rr: SPL.dotR * 0.18 };
        out.push({
          key: 'sd-' + key, kind: 'sdot', rid: d.rid, si: r.index,
          x: d.x, y: d.y, r: style.rr,
          fill: style.fill, stroke: style.stroke, sw: style.sw,
        });
      }
    }
    if (show.swarm) {
      for (const r of model.respondents) {
        const p = layout.swarm.positions[r.id];
        if (!p) continue;
        out.push({
          key: 'r-' + r.id, kind: 'resp', rid: r.id, si: r.index,
          x: p.x, y: p.y, r: params.respondentRadius,
          // Membership is identity, not emphasis, so the pie persists here too.
          labs: r.labIds,
          fill: T.labColour(r.primaryLab),
          stroke: opts.bridge && r.flagged ? T.flag() : T.paper(),
          sw: opts.bridge && r.flagged ? 2 : 1,
          dash: opts.bridge && r.flagged ? '2 2' : null,
        });
      }
    }
    // Lab anchor points. §6.4 keeps five labelled anchors through scenes 4-5
    // after the map is dropped. They are suppressed in the matrix (which has its
    // own row headers) and in the beeswarm, where they land on top of the swarm
    // itself and the colour legend already carries lab identity.
    // NOTE: this is a deliberate deviation from §6.4 for scene 5 -- see README,
    // open decision. Re-enable by dropping 'swarm' from this test.
    // Nobody has been assigned to a lab yet in scene 0.5, so there are no lab
    // anchors to show -- the labs are introduced by scene 1. They are dropped
    // again wherever the dots have left their geography behind: the matrix has
    // its own row headers, and the beeswarm and the wall are arranged by
    // something other than place, so five anchors would sit on top of the
    // picture claiming a position they no longer have.
    if (view !== 'invite' && view !== 'matrix' && view !== 'swarm'
        && view !== 'spine' && view !== 'part' && view !== 'mon'
        && view !== 'cloud' && view !== 'thanks') {
      for (const l of model.labs) {
        const p = labPt(l.id);
        // Scene 1 a small anchor; scene 2 sized by cohort with the count inside;
        // scene 3+ back to uniform so the labs recede (SPEC 6.4). Never sized by
        // NUTS3 area -- that is the §6.3 caveat and a different quantity.
        const r = view === 'map' ? params.labRadiusScene1
                : view === 'people' ? layout.labs[l.id].r
                : params.labRadiusLate;
        out.push({
          key: 'l-' + l.id, kind: 'lab',
          x: p.x, y: p.y, r,
          fill: T.labColour(l.id), stroke: T.paper(), sw: 2.5,
        });
      }
    }
    if (show.themes) {
      const em = shown(themeEmphasis());
      for (const t of model.themes) {
        const p = layout.themes[t.id];
        const isTop = em.top.has(t.id), isLow = em.low.has(t.id);
        out.push({ key: 't-' + t.id, kind: 'theme', x: p.x, y: p.y, r: p.r,
          cells: cellsOf('theme', t.id),
          // Top: heavy ring in the emphasis green -- the SAME token the label and
          // the inner number use, so ring and text cannot disagree.
          // Thinnest: hollow and dashed, so it reads as an absence rather than
          // just a smaller presence.
          fill: isLow ? 'none' : T.paper(),
          stroke: isTop ? T.emphasis() : isLow ? T.inkMute() : T.ink(),
          sw: isTop ? 5 : isLow ? 1.5 : 2,
          dash: isLow ? '5 4' : null });
      }
    }
    if (show.stake) {
      // Same marks as the themes scene: radius encodes respondent count, the
      // count is printed inside, the strongest get a heavy emphasis ring and
      // the thinnest goes hollow and dashed so it reads as an absence rather
      // than merely a smaller presence.
      const em = shown(stakeholderEmphasis());
      for (const sg of model.stakeholders) {
        const p = layout.stakeholders[sg.id];
        if (!p) continue;
        const isTop = em.top.has(sg.id), isLow = em.low.has(sg.id);
        out.push({ key: 'sg-' + sg.id, kind: 'stakeholder',
          x: p.x, y: p.y, r: p.r, cells: cellsOf('stakeholder', sg.id),
          fill: isLow ? 'none' : T.paper(),
          stroke: isTop ? T.emphasis() : isLow ? T.inkMute() : T.ink(),
          sw: isTop ? 5 : isLow ? 1.5 : 2,
          dash: isLow ? '5 4' : null });
      }
    }
    if (show.mon && layout.monBubbles) {
      const MB = layout.monBubbles;
      // One dot per interested participant, in their lab colour; larger for
      // "very interested". They fly in from wherever the person last was.
      for (const [key, d] of Object.entries(MB.dots)) {
        const r = respById.get(d.respondent);
        if (!r) continue;
        out.push({ key: 'mo-' + key, kind: 'modot', rid: d.respondent,
          si: r.index, x: d.x, y: d.y,
          r: d.very ? MB.dotVery : MB.dotSome,
          fill: T.labColour(r.primaryLab), stroke: T.paper(), sw: 1 });
      }
      // Second press: the research themes from slide 3, receded, at their
      // slide 3 positions. Third press: the strongly linked ones light up.
      if (opts.monThemes) {
        const strong = monStrongThemes();
        for (const t of model.themes) {
          const p = layout.themes[t.id];
          if (!p) continue;
          const on = strong.has(t.id);
          out.push({ key: 'mt-' + t.id, kind: 'theme', x: p.x, y: p.y,
            r: p.r * MON_THEME_SCALE, fill: T.paper(),
            stroke: on ? T.emphasis() : T.mapStroke(), sw: on ? 4 : 1.5 });
        }
      }
    }
    if (show.uc) {
      const lead = useCaseLead();
      for (const u of model.useCases) {
        const p = layout.useCases[u.id];
        const isLead = opts.highlight && u.id === lead.id;
        out.push({ key: 'u-' + u.id, kind: 'usecase', x: p.x, y: p.y, r: p.r,
          fill: T.paper(),
          stroke: isLead ? T.emphasis() : T.ink(),
          sw: isLead ? 6 : 2.5 });
      }
    }
    return out;
  }

  // --- labels ----------------------------------------------------------------
  function buildLabels(show) {
    const out = [];
    const min = T.fs.min();

    // WHICH LABELS APPEAR WHEN
    //   scene 1 (map)     lab names, then respondent counts  (beats 1.3, 1.4)
    //   scene 2 (people)  counts ONLY -- the names were learned in scene 1 and
    //                     colour plus a fixed anchor carry identity from here on
    //   scenes 3-4        neither: the stage belongs to themes and use cases,
    //                     and lab identity is already in the dot colours
    // Names in scene 1 only. The respondent COUNT is never printed under a lab
    // any more: scene 1 states the total once, above the roster, and scene 2
    // puts each lab's count inside its own node.
    const showLabNames = view === 'map';
    const showLabCounts = false;

    if (showLabNames || showLabCounts) {
      // Lab labels are placed RADIALLY OUTWARD from the centre. Centring them on
      // the anchor makes Havelland and East Brandenburg overprint as soon as k
      // drops. Pushing each away along its own bearing keeps them apart.
      const C = layout.contractionCentre;
      for (const l of model.labs) {
        const p = labPt(l.id);
        let dx = p.x - C.x, dy = p.y - C.y;
        const d = Math.hypot(dx, dy);
        if (d < 1) { dx = 0; dy = -1; } else { dx /= d; dy /= d; }
        const off = (view === 'map' ? 26 : 30);
        const lx = p.x + dx * off, ly = p.y + dy * off;
        // Anchor the text on the side away from C so it never runs back over
        // the node it belongs to.
        const anchor = dx > 0.35 ? 'start' : dx < -0.35 ? 'end' : 'middle';

        if (showLabNames) {
          out.push({ key: 'll-' + l.id, kind: 'lab',
            x: lx, y: ly + (dy > 0 ? 20 : -6),
            lines: [l.short], size: T.fs.label(), fill: T.ink(), anchor });
        }
        if (showLabCounts) {
          // With the name suppressed in scene 2 the count moves up into its
          // place, rather than floating where the name used to be.
          const dyCount = showLabNames ? (dy > 0 ? 48 : 22) : (dy > 0 ? 22 : -4);
          out.push({ key: 'ln-' + l.id, x: lx, y: ly + dyCount,
            lines: [`n = ${l.n}`], size: showLabNames ? min : T.fs.label(),
            weight: showLabNames ? 400 : 600,
            fill: showLabNames ? T.inkMute() : T.ink(), anchor });
        }
      }
    }

    // State row labels, scene 2 ONLY (review of 14 September 2026). They state
    // the abstraction outright -- the rows ARE the federal states -- on the
    // slide where the map becomes rows. From scene 3 the stage belongs to the
    // satellite nodes and the headings would compete with them.
    if (view === 'people' && layout.anchorMode === 'grouped') {
      for (const r of layout.stateRows) {
        out.push({ key: 'sr-' + r.code, x: r.x0 - 150, y: r.y + 8,
          lines: [r.name], size: T.fs.label(), weight: 600,
          fill: T.inkMute(), anchor: 'end', pinned: true });
      }
    }

    // The dots BETWEEN the two rows (scene 2, grouped mode). A researcher in
    // labs in BOTH federal states is pulled toward an anchor in each row, so
    // they settle in the gap -- the one group on stage whose position no row
    // heading explains, and until now the one group with nothing naming it.
    //
    // Careful with the count. 12 respondents belong to more than one lab, but
    // only the 9 who cross the STATE boundary land in the gap; the other 3
    // bridge two labs inside one state and sit within that row, visually
    // indistinguishable from their single-lab neighbours. A label reading "12"
    // anchored on a band holding 9 is the kind of small lie that the first
    // person to count the dots will catch, so the band is labelled with what is
    // actually in it and the remainder is stated rather than absorbed.
    //
    // Scene 2 only. From scene 3 the stage belongs to themes and use cases, and
    // a standing label out to the right would compete with their node labels.
    //
    // SPEC 4.1 Branch B: with no multi-lab respondents there is no such group,
    // and a label pointing at an empty band is worse than no label at all.
    if (view === 'people' && layout.anchorMode === 'grouped'
        && model.branch.id === 'A') {
      const stateOf = new Map(model.labs.map(l => [l.id, l.state]));
      const inBand = [], inRow = [];
      for (const r of model.respondents) {
        if (!r.isBridge) continue;
        const p = layout.respondents[r.id];
        if (!p) continue;
        (new Set(r.labIds.map(id => stateOf.get(id))).size > 1 ? inBand : inRow)
          .push(p);
      }
      if (inBand.length) {
        // Anchored on where those dots ACTUALLY are, not on the arithmetic
        // midpoint between the rows: the cluster sits wherever the link forces
        // left it, and a leader line to the wrong spot is worse than none.
        const cx = d3.mean(inBand, p => p.x);
        const cy = d3.mean(inBand, p => p.y);
        const rowRight = d3.max(layout.stateRows, r => r.x1) ?? cx;
        const lines = [`${inBand.length} work across both states`];
        if (inRow.length)
          lines.push(`${inRow.length} more bridge two labs in one state`);
        // Start-anchored, so the longest line must END inside the stage. A
        // fixed cap clipped the text once the type scale went up.
        const longest = Math.max(...lines.map(
          ln => measure(ln, T.fs.label()).w));
        out.push({
          key: 'bridge-band', x: Math.min(rowRight + 70, 1890 - longest), y: cy,
          lines, size: T.fs.label(), weight: 600,
          fill: T.ink(), anchor: 'start', pinned: true,
          // Pinned, so it never dodges away from the band it names -- but it
          // DOES need the leader line, so it carries its own anchor rather than
          // taking the default "anchor equals position" reset below.
          keepAnchor: true, ax: cx, ay: cy, moved: 999,
        });
      }
    }

    if (show.themes) {
      // Seed alternating above/below. The dodge converges far better from a
      // spread start than from sixteen labels all stacked on the same side.
      const ordered = model.themes.slice()
        .sort((x, y) => layout.themes[x.id].x - layout.themes[y.id].x);
      const em = shown(themeEmphasis());
      ordered.forEach((t, i) => {
        const p = layout.themes[t.id];
        // On the ring (p.ox set), labels push radially outward exactly like the
        // stakeholder ring's, so the two scenes label identically.
        if (p.ox != null) {
          out.push(ringLabel('tl-' + t.id, 'theme', p,
            withCount(wrap2(t.short, 12), 'theme', t),
            em.top.has(t.id), em.low.has(t.id)));
          return;
        }
        const above = i % 2 === 0;
        // The count now lives INSIDE the node, so the label is the name alone.
        // 10, not 15: at 15 "Climate science", "Farm economics" and "Soil
        // health" all stayed on one line and kept colliding.
        const lines = withCount(wrap2(t.short, 10), 'theme', t);
        // Two-line labels grow downward, so a label placed ABOVE its node has to
        // start higher by the extra line or it lands back on top of the node.
        const rise = (lines.length - 1) * min * 1.05;
        const isTop = em.top.has(t.id), isLow = em.low.has(t.id);
        out.push({ key: 'tl-' + t.id, kind: 'theme',
          x: p.x, y: p.y + (above ? -(p.r + 17) - rise : p.r + 29),
          lines,
          // Top three read bold and in the accent; the thinnest reads muted.
          // Weight and colour together, because weight alone is too subtle
          // through a projector and colour alone fails SPEC 7.
          size: isTop ? min * 1.15 : min,
          weight: isTop ? 700 : isLow ? 400 : 600,
          fill: isTop ? T.emphasis() : isLow ? T.inkMute() : T.ink() });
      });
    }

    if (show.stake) {
      // The group name only -- the count is inside the node, as in scene 3, so
      // the label outside is the name alone.
      //
      // These are the longest option strings in the survey, so they lean on
      // `short` from src/options.py and wrap to two balanced lines. Placed
      // radially outward from the ellipse (p.ox / p.oy say which way is away
      // from the centre): on a fourteen-node ring the sides matter as much as
      // the top and bottom, so a label on the left is anchored to end and one
      // on the right to start, rather than every block stacking downward into
      // its neighbour.
      const em = shown(stakeholderEmphasis());
      for (const sg of model.stakeholders) {
        const p = layout.stakeholders[sg.id];
        if (!p) continue;
        out.push(ringLabel('sl-' + sg.id, 'stakeholder', p,
          withCount(wrap2(sg.short, 12), 'stakeholder', sg),
          em.top.has(sg.id), em.low.has(sg.id)));
      }
    }
    if (show.mon && layout.monBubbles) {
      const MB = layout.monBubbles;
      const size = T.fs.label();
      // Pinned: the row is laid out by hand, and the dodge would shove a
      // topic name away from its own bubble.
      for (const t of model.monitoring) {
        const b = MB.bubbles[t.id];
        if (!b) continue;
        // Always two balanced lines, centred (review of 17 September 2026), so
        // the five names read as one row whatever their length.
        const lines = wrap2(t.short, 1);
        // Above the bubble on the first press; from the second press the
        // totals are gone and the name slides BELOW, out of the way of the
        // theme lines, which mostly leave the row upwards (the ring has more
        // themes above the row than below it).
        out.push({ key: 'ml-' + t.id, kind: 'monitoring', pinned: true,
          x: b.x, y: opts.monThemes
            ? b.y + b.r + size + 4
            : b.y - b.r - 14 - (lines.length - 1) * size * 1.05,
          lines, size, weight: 700, fill: T.ink() });
        // Totals on the first press only: the second press hands the space
        // round the bubbles to the themes.
        if (!opts.monThemes) {
          out.push({ key: 'mv-' + t.id, kind: 'monitoring', pinned: true,
            x: b.x, y: b.y + b.r + min + 6,
            lines: [`${b.n} interested`, `${b.nVery} very`],
            size: min, weight: 600, fill: T.inkBody() });
        }
      }
      if (opts.monThemes) {
        const strong = monStrongThemes();
        for (const t of model.themes) {
          const p = layout.themes[t.id];
          if (!p) continue;
          const on = strong.has(t.id);
          out.push({ ...ringLabel('mtl-' + t.id, 'theme',
            { ...p, r: p.r * MON_THEME_SCALE }, wrap2(t.short, 12), on, !on),
            pinned: true });
        }
      }
    }
    if (show.uc) {
      const lead = useCaseLead();
      for (const u of model.useCases) {
        const p = layout.useCases[u.id];
        const v = opts.interest ? u.interest : u.experience;
        const nConn = u[lead.key];
        const isLead = opts.highlight && u.id === lead.id;
        const lines = wrap2(u.short, 13);
        // On the ring, push each block radially OUTWARD (p.oy tells us which way
        // is away from the centre) so labels lean away from each other instead
        // of all stacking downward into their neighbours.
        const outward = p.oy != null ? p.oy : 1;
        const above = outward < -0.25;
        const rise = lines.length * min * 1.15;
        const y0 = above
          ? p.y - p.r - 26 - rise - min * 1.15
          : p.y + p.r + 28;
        out.push({ key: 'ul-' + u.id, kind: 'usecase', x: p.x, y: y0,
          lines, size: isLead ? min * 1.2 : min,
          weight: isLead ? 700 : 600,
          fill: isLead ? T.emphasis() : T.ink() });
        out.push({ key: 'uv-' + u.id, kind: 'usecase',
          x: p.x, y: y0 + rise,
          lines: [`${nConn} researchers · ${opts.interest ? 'int' : 'exp'} ${v}`],
          size: min, weight: 400,
          fill: isLead ? T.emphasis() : T.inkMute() });
      }
    }
    return out;
  }

  // A node label on an ellipse, pushed radially outward (p.ox / p.oy say which
  // way is away from the centre). On a many-node ring the sides matter as much
  // as the top and bottom, so a label on the left is anchored to end and one on
  // the right to start, rather than every block stacking downward into its
  // neighbour. Shared by the themes and stakeholder rings.
  function ringLabel(key, kind, p, lines, isTop, isLow) {
    const min = T.fs.min();
    const ox = p.ox ?? 0, oy = p.oy ?? 1;
    const sideways = Math.abs(ox) > 0.6;
    const size = isTop ? min * 1.1 : min;
    // Lines step by size * 1.05 (see the tspan dy), so a block ABOVE the node
    // puts its LAST baseline a fixed gap over the node, however many lines --
    // the moved count on a highlighted node is a third line.
    const x = sideways ? p.x + ox * (p.r + 20) : p.x;
    const y = sideways
      ? p.y - (lines.length - 1) * size * 0.5
      : (oy < 0 ? p.y - p.r - 18 - (lines.length - 1) * size * 1.05
                : p.y + p.r + 26);
    return { key, kind, x, y,
      lines, size,
      weight: isTop ? 700 : isLow ? 400 : 600,
      fill: isTop ? T.emphasis() : isLow ? T.inkMute() : T.ink(),
      anchor: sideways ? (ox > 0 ? 'start' : 'end') : 'middle' };
  }

  // --- scene headers ---------------------------------------------------------
  // A short standing title in the top right, so a latecomer or a distracted
  // audience can always tell which question is on screen. Scene 0.5 has none.
  const SCENE_HEADERS = {
    map: 'Living Labs',
    people: 'Links to Living Labs',
    themes: 'Research Themes',
    stake: 'Stakeholder groups',
    uc: 'Innovation fields',
    matrix: 'Experience in innovation fields',
    swarm: 'Participation and co-design',
    spine: 'Participation and Co-design',
    part: 'Participation and Co-design',
    mon: 'Monitoring interest',
    // The survey's own question, in full, so the room reads what was asked
    // rather than a summary of it. Hand-set on two lines: one line runs
    // 1713 units at the head size, nearly the whole stage, and the cloud's
    // top-right codes start only 168 units down.
    cloud: ['Which data do you think are most important',
            'to collect in every Living Lab?'],
  };

  function drawSceneHeader() {
    // Beat 4.5b changes the question from what we have to what we want.
    const text = view === 'matrix' && opts.demand
      ? 'Where we want to gain experience'
      : SCENE_HEADERS[view];
    if (!text) return;
    const lines = Array.isArray(text) ? text : [text];
    // A wrapped header drops to the body size so its second line clears the
    // scene below; a one-line header keeps the head size it always had.
    const size = lines.length > 1 ? T.fs.body() : T.fs.head();
    lines.forEach((ln, i) => L.chrome.append('text')
      .attr('x', 1856).attr('y', 92 + i * size * 1.08)
      .attr('text-anchor', 'end')
      .attr('font-size', size)
      .attr('font-weight', 600)
      .attr('fill', T.ink())
      .text(ln));
  }

  // --- scene 3's corner stat ----------------------------------------------------
  // How many themes one participant selected, bottom right (review of
  // 16 September 2026). Every respondent counts, including anyone who picked
  // none, so the range starts where the data does.
  function drawThemeStats() {
    const counts = model.respondents.map(r => r.themeIds.length);
    if (!counts.length) return;
    const mean = d3.mean(counts);
    L.chrome.append('text')
      .attr('x', 1856).attr('y', 968)
      .attr('text-anchor', 'end').attr('font-size', T.fs.min())
      .attr('fill', T.inkMute())
      .text('Per participant');
    L.chrome.append('text')
      .attr('x', 1856).attr('y', 968 + T.fs.label() * 1.2)
      .attr('text-anchor', 'end').attr('font-size', T.fs.label())
      .attr('font-weight', 600).attr('fill', T.ink())
      .text(`${mean.toFixed(1)} themes on average `
        + `(range ${d3.min(counts)}–${d3.max(counts)})`);
  }

  // --- the roster header (scene 1) -------------------------------------------
  // States the total once, here, so no lab has to carry a count under its label.
  function drawRosterHeader() {
    const R = layout.roster;
    L.chrome.append('text')
      .attr('x', R.header.x).attr('y', R.header.y)
      .attr('text-anchor', 'start').attr('font-size', T.fs.head())
      .attr('font-weight', 600).attr('fill', T.ink())
      .text(`${R.n} respondents`);

    // No consent-exclusion line here. It is a data-protection fact about the
    // pipeline, not a finding, and it invites a question that derails the
    // opening. `quality.excluded_no_consent` is still checked on every parse
    // run -- see the README.
  }

  // --- beeswarm axis ---------------------------------------------------------
  function drawSwarmAxis() {
    const g = L.chrome, a = layout.swarm.axis;
    // Tick labels come FROM THE DATA (SPEC section 3: never a hard-coded scale
    // label). These four were literals, which is not pedantry -- a reworded
    // statement would have shown one thing on the axis and scored another, with
    // nothing to catch it.
    //
    // Level 0 is the only one with no statement behind it: it means no rung was
    // endorsed at all, which is an absence rather than an answer.
    const rungShort = new Map(
      (model.engagement.scale ?? []).map(r => [r.rung, r.short ?? r.label]));
    const labels = [0, 1, 2, 3].map(lv =>
      lv === 0 ? '0 · none' : `${lv} · ${rungShort.get(lv) ?? lv}`);
    g.append('line')
      .attr('x1', a.ticks[0].x - 70).attr('x2', a.ticks[3].x + 70)
      .attr('y1', a.y + 190).attr('y2', a.y + 190)
      .attr('stroke', T.rule()).attr('stroke-width', 1.5);
    for (const t of a.ticks) {
      g.append('text').attr('x', t.x).attr('y', a.y + 226)
        .attr('text-anchor', 'middle').attr('font-size', T.fs.min())
        .attr('fill', T.inkMute()).text(labels[t.level]);
      g.append('text').attr('x', t.x).attr('y', a.y + 258)
        .attr('text-anchor', 'middle').attr('font-size', T.fs.min())
        .attr('font-weight', 600).attr('fill', T.ink())
        .text(`n = ${model.engagement.counts[t.level]}`);
    }
    // SPEC BEAT 5.2 asks for a median marker, and `engagement.median` has been
    // computed all along -- it just never reached the stage. Drawn as a rule
    // above the axis with its own label, in the accent that is reserved for
    // structural callouts like this one (bridges, gaps, medians).
    const med = model.engagement.median;
    if (med != null) {
      // The median is a LEVEL, so it sits at that level's tick rather than at
      // an interpolated x -- there is no meaningful space between two rungs.
      const tick = a.ticks.find(t => t.level === Math.round(med));
      if (tick) {
        g.append('line')
          .attr('x1', tick.x).attr('x2', tick.x)
          .attr('y1', a.y - 150).attr('y2', a.y + 176)
          .attr('stroke', T.accent()).attr('stroke-width', 2)
          .attr('stroke-dasharray', '6 5');
        g.append('text').attr('x', tick.x).attr('y', a.y - 166)
          .attr('text-anchor', 'middle').attr('font-size', T.fs.min())
          .attr('font-weight', 600).attr('fill', T.accent())
          .attr('stroke', T.paper()).attr('stroke-width', 5)
          .style('paint-order', 'stroke')
          .text(`median ${med}`);
      }
    }

    // SPEC 4.3: state the excluded count on the slide, do not hide it.
    g.append('text').attr('x', 960).attr('y', 130)
      .attr('text-anchor', 'middle').attr('font-size', T.fs.body())
      .attr('font-weight', 600).attr('fill', T.ink())
      .text(`n = ${model.engagement.nCounted} of ${model.respondents.length}` +
        (model.engagement.nExcluded
          ? `; ${model.engagement.nExcluded} internally inconsistent` : ''));
  }

  // --- 5 x 6 bubble matrix (candidate beat 4.5) ------------------------------
  // Positions come from layout.matrix (see layout.js). The DOTS are not drawn
  // here -- they are keyed nodes in the shared node layer so they can morph into
  // and out of the network and the beeswarm. This function draws only the
  // bubbles behind them and the headers around them.
  // Scene 4.5: which use case is this lab's STRONGEST, row by row.
  //
  // Counted from model.matrix[].cells[].nExperienced -- whole researchers per
  // lab -- and deliberately NOT from useCases[].weights, which splits a
  // bridging researcher fractionally across their labs. The weights are right
  // for positioning a node between labs; they are wrong here, because the
  // audience can count the dots in the bubble and the callout has to agree with
  // what they can count.
  //
  // TIES ARE INCLUDED, not broken, the same rule as themeEmphasis(). Two use
  // cases level on 11 researchers and a ring around only one of them is the
  // first thing anybody would query. Note useCaseLead() does NOT do this -- it
  // takes the first maximum it finds -- so do not copy that one.
  //
  // A row where nobody has any experience at all gets NO leader: the maximum is
  // zero, and ringing a zero would claim a strength that does not exist.
  //
  // `measure` picks what "strongest" means. Beat 4.5a rings the most
  // experience; beat 4.5b rings the most unmet demand -- the cohort with the
  // most hollow dots, i.e. where the lab most wants to gain experience (review
  // of 14 September 2026). Same tie and zero rules for both.
  function labLeaders(measure = 'nExperienced') {
    const keys = new Set();
    const ties = [];
    for (const row of model.matrix) {
      const best = Math.max(...row.cells.map(c => c[measure]));
      if (best <= 0) continue;
      const won = row.cells.filter(c => c[measure] === best);
      for (const c of won) keys.add(`${row.labId}|${c.useCaseId}`);
      if (won.length > 1) ties.push({ labId: row.labId, n: best, k: won.length });
    }
    return { keys, ties };
  }

  // Scene 6's callout -- or the absence of one.
  //
  // SPEC 4.5 flagged monitoring interest as having a hard floor and told us to
  // revisit it with real numbers. The numbers say: interest counts run 25-32 of
  // 49 across the five areas, the top two differ by ONE respondent, and the
  // "any interest" and "very interested" rankings are near inverses -- Data
  // integration is second on the first measure and LAST on the second.
  //
  // So this returns null unless the top area leads by `monitoringLeadMargin`.
  // Below that the scene says nothing stands out, because nothing does. A ring
  // around a one-respondent lead would be the visualisation inventing a result.
  function monitoringLead() {
    const items = model.monitoring ?? [];
    if (items.length < 2) return { id: null, margin: 0, flat: true };
    const byN = [...items].sort((x, y) => y.n - x.n);
    const margin = byN[0].n - byN[1].n;
    const flat = margin < params.monitoringLeadMargin;
    // Ties are included for the same reason they are in nodeEmphasis: two areas
    // level at the top and a ring around one of them is indefensible.
    const top = new Set(items.filter(t => t.n === byN[0].n).map(t => t.id));
    return { id: flat ? null : byN[0].id, top: flat ? new Set() : top,
             margin, flat, best: byN[0], runnerUp: byN[1] };
  }

  // Scene 5.2 -- the participation wall.
  //
  // The text does a lot of work here, and deliberately. The picture answers
  // "does anybody do several of these" by its shape; what it cannot show is
  // WHICH statements are on which scale, and SPEC 4.2 is emphatic that the
  // three modes are not higher rungs of the ladder. So the rule is stated in
  // the gap that separates them, where it cannot be missed.
  function drawSpine() {
    const SPL = layout.spine;
    const SP = model.spine;
    if (!SPL || !SP) return;
    const g = L.chrome;
    const min = T.fs.min();
    const midX = (SPL.bounds.x0 + SPL.bounds.x1) / 2;

    // --- row labels ---------------------------------------------------------
    // Right-aligned to the left of the first column, wrapped to two lines. The
    // full survey wording, not an abbreviation: these are the claims people
    // agreed or disagreed with, and paraphrasing them on screen would change
    // what the audience thinks was asked.
    for (const row of SPL.rows) {
      const lines = wrap2(row.label, 24);
      const t = g.append('text')
        .attr('x', SPL.labelX)
        .attr('y', row.y - (lines.length - 1) * min * 0.55)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'central')
        .attr('font-size', min)
        .attr('font-weight', row.kind === 'ladder' ? 600 : 400)
        .attr('fill', T.ink());
      lines.forEach((line, i) => t.append('tspan')
        .attr('x', SPL.labelX).attr('dy', i ? min * 1.1 : 0).text(line));

      // The row's own total, at the far right, so a row can be read across
      // without counting dots.
      g.append('text')
        .attr('x', SPL.bounds.x1 + 30).attr('y', row.y)
        .attr('dominant-baseline', 'central')
        .attr('font-size', min).attr('fill', T.inkMute())
        .text(`${row.nAffirm}`);
    }

    // --- the rule that separates the two scales -----------------------------
    const ladder = SPL.groups.find(x => x.kind === 'ladder');
    const modes = SPL.groups.find(x => x.kind === 'mode');
    if (ladder && modes) {
      const ruleY = (ladder.y1 + modes.y0) / 2;
      g.append('line')
        .attr('x1', SPL.labelX - 260).attr('x2', SPL.bounds.x1 + 40)
        .attr('y1', ruleY).attr('y2', ruleY)
        .attr('stroke', T.rule()).attr('stroke-width', 1);
      // Paper halo so the caption knocks the rule out behind it rather than
      // sitting on top of a line through its own middle.
      g.append('text')
        .attr('x', midX).attr('y', ruleY)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
        .attr('font-size', min).attr('fill', T.inkMute())
        .attr('stroke', T.paper()).attr('stroke-width', 6)
        .style('paint-order', 'stroke')
        .text('above: an intensity ladder, rungs 1–3 · '
          + 'below: lateral modes, not higher rungs');
    }

    // The four dot states, named. A novel encoding needs a key even in a deck
    // that otherwise refuses them -- filled, hollow and faint are not
    // self-evident the way five fixed lab colours are.
    const scale = model.scales?.participatory ?? [];
    g.append('text').attr('x', midX).attr('y', 220)
      .attr('text-anchor', 'middle').attr('font-size', min)
      .attr('fill', T.inkMute())
      .text(`● ${scale[3] ?? 'like me'} or ${scale[4] ?? 'very much like me'}`
        + `　　○ ${scale[2] ?? 'unsure'}　　· not like me　　`
        + `(smaller) no answer`);

    // --- the breadth axis, with the headline on it ----------------------------
    // The headline sits between the two ends of the axis it summarises, under
    // the wall rather than above it, so it is read after the picture.
    //
    // No contradiction markers or text on this slide: the §4.3 flags were cut
    // on review (14 September 2026). The count is still in the lab diagnostics.
    const axisY = SPL.filterY + 40;
    g.append('text').attr('x', SPL.bounds.x0).attr('y', axisY)
      .attr('text-anchor', 'start').attr('font-size', min)
      .attr('fill', T.inkMute()).text('← does fewer of these');
    g.append('text').attr('x', SPL.bounds.x1).attr('y', axisY)
      .attr('text-anchor', 'end').attr('font-size', min)
      .attr('fill', T.inkMute()).text('does more of these →');
    g.append('text').attr('x', midX).attr('y', axisY)
      .attr('text-anchor', 'middle').attr('font-size', T.fs.body())
      .attr('font-weight', 600).attr('fill', T.ink())
      .text(`${SP.nBroad} of ${model.respondents.length} affirm four or more `
        + `of the six`);
    // `values_no_convo` (double-barrelled, SPEC 4.2) is no longer reported on
    // the slide -- cut on review, 14 September 2026.
  }

  // Scene 0.5 -- the logo grid and the read-out.
  //
  // The logos are drawn from the MANIFEST (out/data/logos.json via the model),
  // never by concatenating a slug and an extension. The files are third-party
  // trademarks and are not committed, so a fresh clone has none; an <image>
  // with a missing href fails silently in SVG, which would leave a row of empty
  // boxes and no clue why. Asking the manifest what exists means the scene is
  // correct either way: a logo where there is a file, its short name where there
  // is not.
  function drawRecipients() {
    const RC = layout.recipients;
    const R = model.recipients;
    if (!RC || !R) return;
    const g = L.chrome;
    const min = T.fs.min();

    // Centred over the logo grid rather than over the stage: the grid is on the
    // right and the dots are on the left, so each half carries its own heading.
    const logoMidX = (RC.logoGrid.x0 + RC.logoGrid.x1) / 2;
    g.append('text').attr('x', logoMidX).attr('y', RC.logoGrid.y0 - 34)
      .attr('text-anchor', 'middle').attr('font-size', min)
      .attr('fill', T.inkMute())
      .text(R.nLogos === R.institutions.length
        ? `Invitations went to ${R.institutions.length} institutions`
        // Honest about its own gaps rather than quietly showing fewer logos.
        : `Invitations went to ${R.institutions.length} institutions `
          + `(${R.nLogos} logos available)`);

    const boxes = g.selectAll('g.logo').data(RC.logos, d => d.slug)
      .join(enter => enter.append('g').attr('class', 'logo'));
    boxes.each(function (box) {
      const inst = R.institutions.find(i => i.slug === box.slug);
      const cell = d3.select(this);
      if (inst?.file) {
        // preserveAspectRatio keeps a wordmark from being stretched -- these
        // are trademarks and squashing one is worse than omitting it.
        const img = cell.append('image')
          .attr('href', inst.file)
          .attr('x', box.x).attr('y', box.y)
          .attr('width', box.w).attr('height', box.h)
          .attr('preserveAspectRatio', 'xMidYMid meet');
        // Five of the sixteen were supplied with a white rectangle painted in
        // instead of transparency, and on the warm paper ground (#F5F3EE) that
        // reads as a printing error. `multiply` maps white to the backdrop and
        // leaves the artwork alone: white x paper = paper, dark ink x paper =
        // dark ink. In the projector palette the paper IS white, so it is a
        // no-op there -- which is why the problem only showed up on screen.
        //
        // Per logo, not blanket: multiply would also slightly darken the eleven
        // that are already transparent. And it is predictable only because the
        // stage paints its own paper ground -- see L.ground.
        //
        // This is a presentation-time repair, not a fix. The fix is a
        // transparent file from the institution.
        if (inst.opaqueBg) img.style('mix-blend-mode', 'multiply');
      } else {
        // No file: the name carries the identity instead, wrapped to fit.
        const lines = wrap2(inst?.short ?? box.slug, 16);
        const t = cell.append('text')
          .attr('x', box.x + box.w / 2)
          .attr('y', box.y + box.h / 2 - (lines.length - 1) * min * 0.55)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'central')
          .attr('font-size', min).attr('fill', T.inkMute());
        lines.forEach((line, i) => t.append('tspan')
          .attr('x', box.x + box.w / 2)
          .attr('dy', i ? min * 1.1 : 0)
          .text(line));
      }
    });

    // --- the read-out ------------------------------------------------------
    // Over the dot block on the left, so the number and the thing it counts sit
    // in the same half of the stage.
    const blockMidX = (RC.block.x0 + RC.block.x1) / 2;
    const pct = Math.round(R.rate * 100);
    g.append('text').attr('x', blockMidX).attr('y', RC.block.y0 - 96)
      .attr('text-anchor', 'middle').attr('font-size', T.fs.head())
      .attr('font-weight', 600).attr('fill', T.ink())
      .text(opts.responses
        ? `${R.nResponded} of ${R.invitedTotal} answered`
        : `${R.invitedTotal} people were invited`);

    g.append('text').attr('x', blockMidX).attr('y', RC.block.y0 - 54)
      .attr('text-anchor', 'middle').attr('font-size', min)
      .attr('fill', T.inkMute())
      .text(opts.responses
        ? `${pct}% response rate`
        : 'One dot per person · press to show who answered');

  }

  // Scene 6's read-out. This scene's honest answer is a negative one, so the
  // text does most of the work: SPEC 4.5 warned that monitoring interest might
  // have a hard floor, and the measured spread says nothing separates the five
  // areas.
  //
  // One line, under the ring. The margin and the second-measure reordering were
  // cut on review (14 September 2026); each node's label still prints both
  // counts, so the numbers behind the headline stay on the slide.
  // Theme nodes in scene 6 are drawn smaller than on slide 3: they are
  // context here, not the subject.
  const MON_THEME_SCALE = 0.75;

  // Themes with a strong line on the third press.
  function monStrongThemes() {
    if (!opts.highlight || !opts.monThemes || !layout?.monBubbles) return new Set();
    return new Set(layout.monBubbles.links.filter(l => l.strong).map(l => l.theme));
  }

  // Scene 6: the bubbles behind the dots, and one caption line per press.
  function drawMonitoringReadout() {
    const MB = layout.monBubbles;
    if (!MB) return;
    // SOLID, not the matrix's translucent grey: the third press draws lines
    // behind the bubbles, and they must not show through the dots.
    const fill = d3.interpolateRgb(T.paper(), T.inkMute())(0.13);
    L.bubbles.selectAll('circle')
      .data(Object.entries(MB.bubbles), d => 'mon|' + d[0])
      .join('circle')
      .attr('cx', d => d[1].x).attr('cy', d => d[1].y).attr('r', d => d[1].r)
      .attr('fill', fill).attr('fill-opacity', 1)
      .attr('stroke', T.rule()).attr('stroke-width', 1)
      .attr('stroke-dasharray', null);
    L.chrome.append('text').attr('x', 960).attr('y', MONITORING_HEADLINE_Y)
      .attr('text-anchor', 'middle').attr('font-size', T.fs.min())
      .attr('fill', T.inkMute())
      .text(opts.monThemes && opts.highlight
        ? `Line width = researchers with the theme who are very interested `
          + `(${params.monLinkMinN} or more) · green = the largest group per topic`
        : opts.monThemes ? 'Around them: the research themes from earlier'
        : 'Large dot = very interested · small dot = somewhat interested · '
          + 'one dot per participant');
  }

  // Scene 7: the shared-data word cloud (review of 17 September 2026).
  //
  // Press one, the five coding dimensions; press two, every tier-1 code in its
  // dimension's colour, packed around it. Positions are frozen for the second
  // press (see layoutWordCloud), so the dimensions never move and the codes
  // simply grow into the room left for them.
  //
  // Each word is a <g> positioned and SCALED by one transform, like the pie
  // wedges: it grows from its own centre, and a two-line word keeps its line
  // spacing all the way up instead of collapsing through font-size 0.
  function drawWordCloud(show, morph) {
    const C = layout.cloud;
    const words = !show.cloud || !C ? []
      : [...Object.values(C.dims),
         ...(opts.cloudTerms ? Object.values(C.terms) : [])];
    const at = (d, k) => `translate(${d.x},${d.y}) scale(${k})`;

    const sel = L.cloud.selectAll('g.word').data(words, d => d.id);
    if (morph) {
      sel.exit().interrupt().transition()
        .duration(params.fadeMs).ease(d3.easeCubicIn)
        .attr('transform', d => at(d, 0))
        .remove();
    } else {
      sel.exit().remove();
    }

    const ent = sel.enter().append('g')
      .attr('class', d => `word word--${d.kind}`)
      .attr('transform', d => at(d, morph ? 0 : 1));
    ent.append('text').attr('text-anchor', 'middle');

    const all = ent.merge(sel);
    all.select('text')
      .attr('font-size', d => d.size)
      .attr('font-weight', d => d.weight)
      // The dimension's lab hue for the dimension AND its codes, so a cluster
      // reads as one thing; weight and size say which word is the heading.
      .attr('fill', d => T.labColour(d.colour))
      .selectAll('tspan')
      .data(d => d.lines.map((ln, i) => ({ ln, i, d })))
      .join('tspan')
      .attr('x', 0)
      .attr('y', p => r1(p.d.y0 + p.i * p.d.size * p.d.lh))
      .text(p => p.ln);

    // First press only: each dimension's response count, centred under it in
    // its own colour. Gone on the second press, whose codes pack right up to
    // the dimension's box and would sit on top of it.
    ent.filter(d => d.kind === 'dim').append('text')
      .attr('class', 'word-count').attr('text-anchor', 'middle')
      .attr('opacity', opts.cloudTerms ? 0 : 1);
    const countSize = T.fs.min();
    all.select('text.word-count')
      .attr('y', d => r1(d.h / 2 + countSize * 1.1))
      .attr('font-size', countSize)
      .attr('fill', d => T.labColour(d.colour))
      .text(d => `${d.n} ${d.n === 1 ? 'response' : 'responses'}`)
      .interrupt()
      .transition().duration(morph ? params.fadeMs : 0)
      .attr('opacity', opts.cloudTerms ? 0 : 1);

    if (!morph) {
      all.interrupt().attr('transform', d => at(d, 1));
      return;
    }
    // A word that was shrinking away and is wanted again: its remove() is
    // cancelled by the interrupt, and it grows back from wherever it got to.
    sel.interrupt().transition().duration(params.fadeMs)
      .attr('transform', d => at(d, 1));

    // Arriving from another scene, the outgoing one clears first. The
    // dimensions then come in clockwise, and on the second press the codes
    // fill one cluster at a time, most-cited first, so the audience can see
    // which dimension each belongs to as it lands.
    const arriving = renderedView !== 'cloud';
    const base = arriving ? params.stageDelayMs : 0;
    const DIM_STEP = 140, CLUSTER_STEP = 260, TERM_STEP = 45;
    // A deep link straight to the second press brings both in: the codes
    // wait for the last dimension.
    const termBase = base + (arriving && C ? Object.keys(C.dims).length * DIM_STEP : 0);
    ent.transition()
      .delay(d => d.kind === 'dim'
        ? base + d.order * DIM_STEP
        : termBase + d.order * CLUSTER_STEP + d.rank * TERM_STEP)
      .duration(d => d.kind === 'dim' ? params.morphMs : 700)
      .ease(d3.easeCubicOut)
      .attr('transform', d => at(d, 1));
  }
  const r1 = v => Math.round(v * 10) / 10;

  // Scene 7's caption, under the cloud.
  function drawWordCloudCaption() {
    const C = layout.cloud;
    if (!C) return;
    L.chrome.append('text')
      .attr('x', 960).attr('y', Math.min(1052, C.bounds.y1 + 70))
      .attr('text-anchor', 'middle').attr('font-size', T.fs.min())
      .attr('fill', T.inkMute())
      .text(opts.cloudTerms
        ? 'Around each dimension, the codes within it · size = number of responses'
        : 'Free-text answers, coded into five dimensions · size = number of responses');
  }

  // The closing slide, in the IAT corporate design the statusseminar deck
  // closes on (talks/iat-statusseminar-2026, section.closing-slide under
  // html[data-theme="iat"]): the hero gradient, and one centred sentence in
  // Segoe UI semibold on white. The mark, the QR code, the contact pills and
  // the affiliation line are deliberately left off -- this slide is a full
  // stop, not a call to action.
  //
  // Sized from the original: 1.8em of a 32 px root on a 1280-wide slide is
  // 57.6 px, which is 86.4 units on this 1920-wide stage. The break is hand
  // set, the way every other header in this deck is, so it cannot rewrap in
  // front of the room.
  const THANKS_LINES = ['Thank you for your attention',
                        'and we welcome any questions'];

  function drawThanks(morph) {
    const size = 86.4;
    const gap = size * 1.15;              // the closing slide's line-height
    const cap = size * 0.72;
    const n = THANKS_LINES.length;
    const top = T.STAGE.h / 2 - ((n - 1) * gap + cap) / 2;

    const t = L.chrome.append('text')
      .attr('text-anchor', 'middle')
      .attr('font-size', size)
      .attr('font-weight', 600)
      .attr('letter-spacing', -0.005 * size)
      .attr('fill', T.paperRaised())
      .attr('opacity', morph ? 0 : 1);
    THANKS_LINES.forEach((ln, i) => t.append('tspan')
      .attr('x', T.STAGE.w / 2)
      .attr('y', Math.round(top + cap + i * gap))
      .text(ln));
    // After the outgoing scene has cleared, like every other arriving mark.
    if (morph) {
      t.transition().delay(params.stageDelayMs).duration(params.morphMs)
        .attr('opacity', 1);
    }
  }

  // Scene 5.2's callout: in each lab, the activity with the most researchers
  // on BOTH sides -- experienced ("like me") and not yet -- i.e. the largest
  // min(solid, hollow). That is where the most people could be paired up to
  // pass the skill on (review of 16 September 2026). Ties included; a lab
  // with nobody on one side of every activity gets no ring.
  function partLeaders() {
    const P = layout?.part;
    const keys = new Set();
    if (!P) return { keys };
    for (const row of P.rows) {
      const cells = P.cols.map(c => [`${row.labId}|${c.key}`,
        P.cells[`${row.labId}|${c.key}`]]);
      const score = c => Math.min(c.nAffirm, c.nNot);
      const best = Math.max(0, ...cells.map(([, c]) => score(c)));
      if (best <= 0) continue;
      for (const [k, c] of cells) if (score(c) === best) keys.add(k);
    }
    return { keys };
  }

  // Hand-set line breaks, so every header keeps the survey's own wording and
  // still fits a 250 px column at the label size.
  const PART_HEADER_LINES = {
    cointerpret: ['Co-interprets', 'findings'],
    codesign: ['Involves', 'practitioners in', 'study design'],
    indepth_convo: ['In-depth', 'conversations', 'guide agenda'],
    uses_pract_data: ['Uses practitioner/', 'citizen-collected', 'data'],
    advises: ['Advises', 'practitioners', 'on decisions'],
    brokers: ['Brokers researcher-', 'practitioner', 'connections'],
  };

  function drawParticipation() {
    const P = layout.part;
    if (!P) return;
    const g = L.chrome;
    const min = T.fs.min();
    const lh = min * 1.08;
    const lead = opts.highlight ? partLeaders().keys : new Set();

    // Beat 5.2a is the empty grid: the two axes are read first, and the
    // cohorts and their dots land on the next press. An empty join, not a
    // skipped one, so the bubbles left over from the matrix still exit.
    L.bubbles.selectAll('circle')
      .data(opts.partCells ? Object.entries(P.cells) : [], d => d[0])
      .join('circle')
      .attr('cx', d => d[1].x).attr('cy', d => d[1].y).attr('r', d => d[1].r)
      .attr('fill', T.inkMute()).attr('fill-opacity', 0.13)
      .attr('stroke', d => lead.has(d[0]) ? T.emphasis() : T.rule())
      .attr('stroke-width', d => lead.has(d[0]) ? 4 : 1)
      .attr('stroke-dasharray', null);

    // Column headers, bottom-aligned on headerY so 2- and 3-line headers share
    // a baseline, and a group heading with a rule over each group.
    const maxLines = Math.max(...P.cols.map(c =>
      (PART_HEADER_LINES[c.key] ?? wrap2(c.label, 14)).length));
    for (const c of P.cols) {
      const lines = PART_HEADER_LINES[c.key] ?? wrap2(c.label, 14);
      lines.forEach((ln, i) => g.append('text')
        .attr('x', c.x)
        .attr('y', P.headerY - (lines.length - 1 - i) * lh)
        .attr('text-anchor', 'middle').attr('font-size', min)
        .attr('font-weight', 600).attr('fill', T.ink())
        .text(ln));
    }
    const groupY = P.headerY - maxLines * lh - 22;
    for (const grp of P.groups) {
      g.append('line')
        .attr('x1', grp.x0 + 12).attr('x2', grp.x1 - 12)
        .attr('y1', groupY + 12).attr('y2', groupY + 12)
        .attr('stroke', T.inkMute()).attr('stroke-width', 1.5);
      g.append('text')
        .attr('x', (grp.x0 + grp.x1) / 2).attr('y', groupY)
        .attr('text-anchor', 'middle').attr('font-size', T.fs.label())
        .attr('font-weight', 700).attr('fill', T.inkMute())
        .text(grp.label);
    }

    // Row headers: lab name in its own colour, cohort size under it.
    for (const row of P.rows) {
      const lab = model.labs.find(l => l.id === row.labId);
      const lines = wrap2(lab.short, 12);
      const top = row.y - (lines.length * lh) / 2;
      lines.forEach((ln, i) => g.append('text')
        .attr('x', P.labelX).attr('y', top + i * lh)
        .attr('text-anchor', 'end').attr('font-size', min)
        .attr('font-weight', 600).attr('fill', T.labColour(lab.id))
        .text(ln));
      g.append('text')
        .attr('x', P.labelX).attr('y', top + lines.length * lh)
        .attr('text-anchor', 'end').attr('font-size', min)
        .attr('fill', T.inkMute())
        .text(`n = ${lab.n}`);
    }

    // The dot key would name marks that are not on stage yet, so 5.2a says
    // what the grid is instead.
    const below = Math.min(1062,
      (d3.max(Object.values(P.cells), c => c.y + c.r) ?? 900) + 50);
    g.append('text').attr('x', 960).attr('y', below)
      .attr('text-anchor', 'middle').attr('font-size', min)
      .attr('fill', T.inkMute())
      .text(!opts.partCells
        ? 'Each Living Lab against six ways of working with practitioners'
        : opts.highlight
        ? 'Ringed: where each lab has the most researchers with AND without '
          + 'this experience, to pair up'
        : 'Solid = like me / very much like me · hollow = unsure or not like me');
  }

  function drawMatrix() {
    const M = layout.matrix;
    const g = L.chrome;

    // Cohort bubbles. Their own layer, behind the dots, keyed by cell so they
    // survive a re-render rather than flickering.
    // The leader's ring is the emphasis green, the same token scenes 3 and 4 use
    // for a callout, so "this is the one" reads identically everywhere. Ring
    // only: the fill is the cohort and the dots are the measurement, so neither
    // may change to carry emphasis.
    const lead = opts.highlight
      ? labLeaders(opts.demand ? 'nDemand' : 'nExperienced').keys : new Set();
    // An empty cell is the matrix's "lowest", so its red callout waits for the
    // highlight press too.
    const voidOn = c => opts.highlight && c.isVoid;
    L.bubbles.selectAll('circle')
      .data(Object.entries(M.cells), d => d[0])
      .join('circle')
      .attr('cx', d => d[1].x).attr('cy', d => d[1].y).attr('r', d => d[1].r)
      .attr('fill', T.inkMute()).attr('fill-opacity', 0.13)
      .attr('stroke', d => lead.has(d[0]) ? T.emphasis()
                         : voidOn(d[1]) ? T.flag() : T.rule())
      .attr('stroke-width', d => lead.has(d[0]) ? 4 : voidOn(d[1]) ? 2 : 1)
      .attr('stroke-dasharray', d => voidOn(d[1]) ? '5 4' : null);

    // column headers
    // Beat 4.5b: the use case with the most unmet demand summed across all
    // five labs -- the most hollow dots in its column -- is named in bold and
    // the emphasis green, the same callout the other scenes give their leader.
    // Ties included; a column total of zero is never called out.
    const demandLead = new Set();
    if (opts.demand && opts.highlight) {
      const totals = new Map();
      for (const row of model.matrix) {
        for (const c of row.cells) {
          totals.set(c.useCaseId, (totals.get(c.useCaseId) ?? 0) + c.nDemand);
        }
      }
      const best = Math.max(0, ...totals.values());
      if (best > 0) {
        for (const [id, n] of totals) if (n === best) demandLead.add(id);
      }
    }
    model.useCases.forEach((u, j) => {
      const col = M.cols[j];
      const isLead = demandLead.has(u.id);
      wrap2(u.short, 13).forEach((ln, li) => {
        g.append('text')
          .attr('class', isLead ? 'matrix-col-lead' : null)
          .attr('x', col.x).attr('y', M.headerY + li * T.fs.min() * 1.08)
          .attr('text-anchor', 'middle').attr('font-size', T.fs.min())
          .attr('font-weight', isLead ? 800 : 600)
          .attr('fill', isLead ? T.emphasis() : T.ink())
          .text(ln);
      });
    });

    // row headers -- the only place the cohort size is written down, now that
    // the per-cell "11/19" captions are gone
    M.rows.forEach(row => {
      const lab = model.labs.find(l => l.id === row.labId);
      g.append('text')
        .attr('x', M.labelX).attr('y', row.y - T.fs.min() * 0.25)
        .attr('text-anchor', 'end').attr('font-size', T.fs.min())
        .attr('font-weight', 600).attr('fill', T.labColour(lab.id))
        .text(lab.short);
      g.append('text')
        .attr('x', M.labelX).attr('y', row.y + T.fs.min() * 0.85)
        .attr('text-anchor', 'end').attr('font-size', T.fs.min())
        .attr('font-weight', 400).attr('fill', T.inkMute())
        .text(`n = ${lab.n}`);
    });

    // the empty cells, called out by name
    Object.entries(M.cells).forEach(([, c]) => {
      if (!voidOn(c)) return;
      // Under the bubble, not across it: an empty cohort can be too small to
      // hold the word, and text over its dashed ring hid both.
      g.append('text')
        .attr('x', c.x).attr('y', c.y + Math.max(c.r, 12) + T.fs.min() * 0.95)
        .attr('text-anchor', 'middle').attr('font-size', T.fs.min())
        .attr('font-weight', 600).attr('fill', T.flag())
        .text('nobody');
    });

    const voids = Object.values(M.cells).filter(c => c.isVoid).length;
    // How many cells want more than they have. This is the whole point of the
    // second beat, so it is stated rather than left to be inferred from the
    // ratio of hollow to solid.
    const short = Object.values(M.cells)
      .filter(c => c.nDemand > c.nExperienced).length;
    // The rule the picture follows, under the picture. A hollow ring is a
    // specific claim -- wants experience AND has none -- and leaving the
    // audience to guess whether the two populations overlap would undermine
    // the count. No headline above: the scene header carries the question.
    const below = Math.min(1040,
      (d3.max(Object.values(M.cells), c => c.y + c.r) ?? 900) + 64);
    g.append('text').attr('x', 960).attr('y', below)
      .attr('text-anchor', 'middle').attr('font-size', T.fs.min())
      .attr('fill', T.inkMute())
      .text(!opts.matrixDots
        ? `Each Living Lab against six innovation fields · `
          + `bubble = the lab's cohort`
        : opts.demand
        ? `Solid = has experience · hollow = wants it and has none · `
          + `${short} of 30 cells want more than they have`
        : `Bubble = the lab's cohort · one dot per researcher with experience · `
          + `${voids} of 30 cells have nobody at all`);
  }

  // --- legend ----------------------------------------------------------------
  // Drawn IN the SVG, in viewBox units, so its position is a stage coordinate
  // like everything else: centring it under the lab rows is arithmetic, and it
  // scales with the stage at any screen size.
  //
  // WHERE, per scene (reviews of 14 September 2026):
  //   0.5, 1, 4.5   none -- nothing to key yet, or the matrix row headers
  //                 already name each lab in its own colour
  //   2             centred under the two rows of lab polygons
  //   5.2           centred, pulled up close under the wall's axis text
  //   3, 3.5, 4, 6  centred at the foot of the stage
  //   everything else  bottom left
  function legendPlacement() {
    // Scene 7 borrows the lab hues for its five dimensions, so a lab key
    // there would assert a meaning the colours no longer carry.
    if (view === 'invite' || view === 'map' || view === 'matrix'
        || view === 'part' || view === 'cloud' || view === 'thanks') return null;
    const foot = { x: 960, y: LEGEND_FOOT_Y, anchor: 'middle' };
    if (view === 'people') {
      const rows = layout.stateRows ?? [];
      const x = rows.length
        ? d3.mean(rows, r => (r.x0 + r.x1) / 2) : 960;
      // Below the lowest respondent dot, which sits below the polygons.
      const bottom = d3.max(Object.values(layout.respondents), p => p.y) ?? 0;
      return { x, y: Math.min(bottom + 64, LEGEND_FOOT_Y), anchor: 'middle' };
    }
    if (view === 'spine' && layout.spine) {
      return { ...foot, y: Math.min(layout.spine.filterY + 40 + 84, LEGEND_FOOT_Y) };
    }
    if (view === 'themes' || view === 'stake' || view === 'uc'
        || view === 'mon') return foot;
    return { x: 48, y: LEGEND_FOOT_Y, anchor: 'start' };
  }

  function drawLegend() {
    L.legend.selectAll('*').remove();
    const at = opts.legend ? legendPlacement() : null;
    if (!at) return;
    // NO counts by default. `l.n` counts MEMBERSHIPS, so a bridging researcher
    // is in the total for every lab they belong to and the five numbers sum to
    // 61 against 49 people -- see the note on `legendCounts` in layout.js. The
    // count still has a home: scene 2 prints each cohort size inside its own
    // lab node, where it cannot be mistaken for a share of the whole.
    const withN = params.legendCounts;
    const items = model.labs.map(l => ({
      c: T.labColour(l.id), t: withN ? `${l.short} (${l.n})` : l.short,
    }));
    if (model.branch.nNoLab) {
      items.push({
        c: T.labNone(),
        t: withN ? `no lab (${model.branch.nNoLab})` : 'no lab',
      });
    }
    // One <text>, so text-anchor centres the whole key as a unit. Each entry
    // is a coloured dot glyph and its name; the gap before every dot after the
    // first is an em space's worth of dx.
    // The label size, not the floor: the key has to be readable from the back
    // of a large room (review of 16 September 2026).
    const size = T.fs.label();
    const text = L.legend.append('text')
      .attr('x', at.x).attr('y', at.y)
      .attr('text-anchor', at.anchor)
      .attr('font-size', size);
    items.forEach((d, i) => {
      text.append('tspan')
        .attr('class', 'legend-dot')
        .attr('dx', i ? size * 1.4 : 0)
        .attr('fill', d.c)
        .text('●');
      text.append('tspan')
        .attr('class', 'legend-label')
        .attr('dx', size * 0.35)
        .attr('fill', T.inkBody())
        .text(d.t);
    });
  }

  function setLayout(nextLayout, nextParams = nextLayout.params) {
    layout = nextLayout;
    params = nextParams;
    matrixCentroidCache.clear();      // positions just changed
    partCentroidCache.clear();
    monCentroidCache.clear();
    spineCentroidCache.clear();
    respById.clear();
    for (const r of model.respondents) respById.set(r.id, r);
  }

  function show(nextView, nextOpts, { animate = false } = {}) {
    view = nextView;
    opts = nextOpts;
    animateNext = animate;
    render();
  }

  return {
    setLayout,
    show,
    get view() { return view; },
    // Read by the lab's diagnostics panel, so the numbers it prints are the
    // numbers the stage emphasised.
    themeEmphasis,
    stakeholderEmphasis,
    useCaseLead,
    monitoringLead,
    labLeaders,
    partLeaders,
  };
}
