// ============================================================================
// model.js -- data.json + geo.json  ->  the graph the scenes actually draw.
//
// Pure. No D3, no DOM, no forces, no coordinates. Given the same two files it
// returns the same object every time, which is what makes the layout lab and
// the presentation agree.
//
// It exists because data.json is a faithful record of the SURVEY, keyed by
// human-readable option strings, while the scenes need a graph keyed by stable
// node ids (SPEC 2.1: data joins keyed by stable node id). This is the one
// place that translation happens.
//
// It also encodes the derived measures from SPEC section 4 -- the three-rung
// ladder, the contradiction exclusion, the Branch A/B test -- so that no scene
// re-derives them and gets a different answer.
// ============================================================================

/** Load both artefacts and build the model. */
export async function loadModel({
  dataUrl = 'data/data.json',
  geoUrl = 'data/geo.json',
  logosUrl = 'data/logos.json',
  wordcloudUrl = 'data/wordcloud.json',
} = {}) {
  const [data, geo, logos, wordcloud] = await Promise.all([
    fetch(dataUrl).then(r => ok(r, dataUrl)),
    fetch(geoUrl).then(r => ok(r, geoUrl)),
    // OPTIONAL, and its absence is the normal case. The logo files are
    // third-party trademarks and are not committed, so a fresh clone has no
    // manifest -- scene 0.5 then captions every institution by name and draws
    // no images, which is a correct rendering rather than a degraded one.
    // Generate it with `python src/build_logos.py`.
    fetch(logosUrl).then(r => (r.ok ? r.json() : null)).catch(() => null),
    // Optional too: scene 7's hand-coded free-text answers, from
    // `python src/build_wordcloud.py`. Without it scene 7 is simply empty.
    fetch(wordcloudUrl).then(r => (r.ok ? r.json() : null)).catch(() => null),
  ]);
  return buildModel(data, geo, logos, wordcloud);
}

function ok(r, url) {
  if (!r.ok) {
    throw new Error(
      `could not load ${url} (${r.status}). ` +
      `Serve the folder over HTTP -- fetch() does not work on file://. ` +
      `From the repo root: python -m http.server 8000`
    );
  }
  return r.json();
}

// ============================================================================

export function buildModel(data, geo, logos = null, wordcloud = null) {
  assertSchema(data, geo);

  // --- id lookups ----------------------------------------------------------
  // data.json references labs / themes / use cases by their full option
  // string. Everything downstream uses ids.
  const labByName = new Map(data.living_labs.map(l => [l.name, l]));
  const themeByName = new Map(data.themes.map(t => [t.name, t]));
  const ucByName = new Map(data.use_cases.map(u => [u.name, u]));
  // Absent under schema 1.0, so scene 3.5 simply has no nodes there rather
  // than throwing -- the deck degrades a scene, it does not fail to load.
  const stakeholderCat = data.stakeholder_groups ?? [];
  const monitoringTopics = data.monitoring_topics ?? [];
  const sgByName = new Map(stakeholderCat.map(x => [x.name, x]));

  // Geometry, joined onto the lab records by id. build_geo.py already
  // guarantees one feature per lab in LIVING_LABS order, but join by id
  // rather than index so a reordering cannot silently mis-map a colour.
  const geoById = new Map(geo.labs.features.map(f => [f.properties.id, f]));

  const labs = data.living_labs.map(l => {
    const f = geoById.get(l.id);
    if (!f) throw new Error(`geo.json has no feature for ${l.id} (${l.name})`);
    return {
      id: l.id,
      kind: 'lab',
      name: l.name,
      short: l.short,
      nuts3: l.nuts3,
      // Federal state, from the NUTS3 prefix (DE4 Brandenburg, DE7 Hessen).
      // The state-grouped anchor mode rows labs by this.
      state: f.properties.state,
      stateName: f.properties.state_name,
      // lon/lat -- the projection turns this into the fixed anchor (fx/fy).
      centroid: f.properties.centroid,
      areaKm2: f.properties.area_km2,
      feature: f,
      n: 0,          // respondents, filled below
      nSole: 0,      // respondents for whom this is their only lab
    };
  });
  const labById = new Map(labs.map(l => [l.id, l]));

  // --- respondents ---------------------------------------------------------
  const ladder = data.participatory_statements
    .filter(s => s.kind === 'ladder')
    .sort((a, b) => a.rung - b.rung);
  const modes = data.participatory_statements.filter(s => s.kind === 'mode');

  // The six SCORED statements, in the order scene 5.2 stacks them: the three
  // ladder rungs deepest-first, then the three lateral modes.
  //
  // The other two are excluded, and SPEC 4.2 is why. `values_no_convo` is
  // double-barrelled -- anyone who DOES converse must reject it whatever they
  // think of the first clause -- so it is a noisy inverse of rung 1 and is
  // excluded from all scoring. `no_practitioners` is a FILTER, logically
  // incompatible with any rung, so it is not a row either; scene 5.2 marks
  // the people who endorsed it under their own column instead, which puts
  // SPEC 4.3's contradictions on screen rather than hiding them.
  const scored = [...[...ladder].reverse(), ...modes];

  // "Like me" or "Very much like me" -- indices 3 and 4 of the five-point
  // scale. Read from the scale length rather than hard-coded, so a change to
  // the instrument cannot silently move the threshold (SPEC 3).
  const AFFIRM_FROM = (data.scales?.participatory?.length ?? 5) - 2;
  const affirms = v => v != null && v >= AFFIRM_FROM;

  const respondents = data.respondents.map((r, i) => {
    const labIds = r.living_labs
      .map(n => labByName.get(n))
      .filter(Boolean)
      .map(l => l.id);

    const themeIds = r.themes.map(n => themeByName.get(n))
      .filter(Boolean).map(t => t.id);

    // Scene 3.5. `practitioner_groups` has been in data.json since 1.0 but
    // was dropped here, so nothing downstream could see it.
    const stakeholderIds = (r.practitioner_groups ?? [])
      .map(n => sgByName.get(n)).filter(Boolean).map(x => x.id);

    return {
      id: r.id,                    // pseudonymous, straight from data.json
      kind: 'respondent',
      index: i,
      labIds,
      // Where the dot settles when a single anchor is needed. For a bridging
      // researcher the link forces pull it between labs anyway; this is only
      // the seed and the colour key.
      primaryLab: labIds.length ? labIds[0] : null,
      isBridge: labIds.length > 1,
      noLab: !!r.no_lab,
      unplaced: labIds.length === 0,
      themeIds,
      stakeholderIds,
      useCases: r.use_cases.map(u => ({
        id: ucByName.get(u.use_case)?.id ?? null,
        experience: u.experience,
        interest: u.interest,
      })).filter(u => u.id),
      participatory: r.participatory,
      // Scene 5.2. `breadth` is the count of the six scored statements this
      // person affirms -- the number the whole scene is sorted by, and the
      // answer to "is one person doing several of these, or is each person
      // doing one?" that a single 0-3 engagement level cannot give.
      affirm: Object.fromEntries(
        scored.map(st => [st.key, affirms(r.participatory[st.key])])),
      breadth: scored.filter(st => affirms(r.participatory[st.key])).length,
      // The filter statement, kept separate from the score on purpose.
      noPractitioners: affirms(r.participatory.no_practitioners),
      engagement: r.engagement_level,
      regionalScale: r.regional_scale_experience,
      monitoring: r.monitoring_interest ?? {},
      flags: r.flags ?? [],
      // SPEC 4.3: flagged respondents are RENDERED, but excluded from the
      // engagement distribution. Never silently dropped.
      flagged: (r.flags ?? []).length > 0,
    };
  });

  // lab counts
  for (const r of respondents) {
    for (const id of r.labIds) labById.get(id).n += 1;
    if (r.labIds.length === 1) labById.get(r.labIds[0]).nSole += 1;
  }

  // --- themes: counts, per-lab breakdown, and the SPEC 3 weighting ---------
  // "Compute theme position as the weighted centroid of its respondents'
  // labs, then run a collision pass only." The weights live here; layout.js
  // turns them into coordinates once the projection is known.
  const themes = data.themes.map(t => {
    const holders = respondents.filter(r => r.themeIds.includes(t.id));
    const byLab = new Map(labs.map(l => [l.id, 0]));
    let noLabCount = 0;
    for (const r of holders) {
      if (!r.labIds.length) { noLabCount += 1; continue; }
      // A bridging researcher contributes a FRACTION to each of their labs,
      // not a whole unit to each. Otherwise multi-lab respondents would drag
      // every theme they touch toward the middle and manufacture the exact
      // "central because everywhere" ambiguity SPEC 3 warns about.
      const w = 1 / r.labIds.length;
      for (const id of r.labIds) byLab.set(id, byLab.get(id) + w);
    }
    return {
      id: t.id,
      kind: 'theme',
      name: t.name,
      short: t.short,
      n: holders.length,
      respondentIds: holders.map(r => r.id),
      // ring segments (SPEC 3: "node radius = respondent count, plus a ring
      // segmented by lab") and the position weights, same numbers
      weights: Object.fromEntries(byLab),
      nNoLab: noLabCount,
      // How concentrated is this theme? 1 = entirely one lab, 0 = perfectly
      // even across five. This is the second encoding that distinguishes
      // "central because everywhere" from "central because weak".
      concentration: concentration([...byLab.values()]),
    };
  });

  // --- stakeholder groups (scene 3.5) --------------------------------------
  // Identical shape and identical weighting rule to themes, deliberately: the
  // scene is the same picture asked of a different question, so it must be the
  // same arithmetic. A bridging researcher contributes a FRACTION to each of
  // their labs rather than a whole unit, or multi-lab respondents would drag
  // every group they touch toward the middle and manufacture the exact
  // "central because everywhere" ambiguity SPEC section 3 warns about.
  const stakeholders = stakeholderCat.map(sg => {
    const holders = respondents.filter(r => r.stakeholderIds.includes(sg.id));
    const byLab = new Map(labs.map(l => [l.id, 0]));
    let noLabCount = 0;
    for (const r of holders) {
      if (!r.labIds.length) { noLabCount += 1; continue; }
      const w = 1 / r.labIds.length;
      for (const id of r.labIds) byLab.set(id, byLab.get(id) + w);
    }
    return {
      id: sg.id,
      kind: 'stakeholder',
      name: sg.name,
      short: sg.short,
      n: holders.length,
      respondentIds: holders.map(r => r.id),
      weights: Object.fromEntries(byLab),
      nNoLab: noLabCount,
      concentration: concentration([...byLab.values()]),
    };
  });

  // --- use cases: experience and interest ----------------------------------
  const useCases = data.use_cases.map(u => {
    const rows = respondents
      .map(r => ({ r, uc: r.useCases.find(x => x.id === u.id) }))
      .filter(x => x.uc);

    const expByLab = new Map(labs.map(l => [l.id, 0]));
    const intByLab = new Map(labs.map(l => [l.id, 0]));
    for (const { r, uc } of rows) {
      if (!r.labIds.length) continue;
      const w = 1 / r.labIds.length;
      for (const id of r.labIds) {
        expByLab.set(id, expByLab.get(id) + uc.experience * w);
        intByLab.set(id, intByLab.get(id) + uc.interest * w);
      }
    }

    const expTotal = d_sum(rows, x => x.uc.experience);
    const intTotal = d_sum(rows, x => x.uc.interest);

    return {
      id: u.id,
      kind: 'usecase',
      name: u.name,
      short: u.short,
      // beat 4.2 / 4.3: same topology, weight morphs from one to the other
      experience: expTotal,
      interest: intTotal,
      // beat 4.4: the gap view
      gap: intTotal - expTotal,
      nExperienced: rows.filter(x => x.uc.experience > 0).length,
      nInterested: rows.filter(x => x.uc.interest > 0).length,
      weights: Object.fromEntries(expByLab),
      interestWeights: Object.fromEntries(intByLab),
      concentration: concentration([...expByLab.values()]),
    };
  });

  // --- the participation wall (scene 5.2) ----------------------------------
  // Scene 5.1's beeswarm collapses eight statements into one 0-3 ladder
  // score, which cannot answer the question actually being asked: are
  // individual people engaged across several kinds of participation, or is
  // each person doing one thing? A per-person score has no room for that.
  //
  // So the wall puts every person on their own x slot -- one column each --
  // and every scored statement on its own row. Nothing overplots, because no
  // two people share a column, and "engaged across everything" becomes a
  // shape rather than a number.
  //
  // COLUMN ORDER IS THE FINDING, so the tiebreak is fully determined: by
  // breadth, then by the deepest ladder rung reached, then by id. Two people
  // with the same profile must not swap places between rehearsal and
  // performance.
  const deepestRung = r => {
    let best = 0;
    for (const st of ladder) if (r.affirm[st.key]) best = Math.max(best, st.rung);
    return best;
  };
  const spineOrder = respondents.slice().sort((x, y) =>
    (x.breadth - y.breadth)
    || (deepestRung(x) - deepestRung(y))
    || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));

  const spine = {
    // Rows, top to bottom: the ladder deepest-first, then the modes. The
    // GROUPS are kept apart in the layout because SPEC 4.2 is explicit that
    // the modes are lateral, not higher rungs -- one axis would assert an
    // intensity ordering across all six that the instrument does not support.
    rows: scored.map(st => ({
      key: st.key,
      kind: st.kind,
      rung: st.rung ?? null,
      label: st.label,
      nAffirm: respondents.filter(r => r.affirm[st.key]).length,
      nUnsure: respondents.filter(r => r.participatory[st.key] === 2).length,
    })),
    order: spineOrder.map(r => r.id),
    // The distribution the scene exists to show.
    breadth: Array.from({ length: scored.length + 1 }, (_, k) =>
      respondents.filter(r => r.breadth === k).length),
    nBroad: respondents.filter(r => r.breadth >= 4).length,
    maxBreadth: scored.length,
    // SPEC 4.3: rendered, counted, and never silently resolved.
    nFilter: respondents.filter(r => r.noPractitioners).length,
    // Excluded from scoring, reported separately or not at all (SPEC 4.2).
    valuesNoConvo: {
      key: 'values_no_convo',
      nAffirm: respondents.filter(r =>
        affirms(r.participatory.values_no_convo)).length,
    },
  };

  // --- who the survey was sent to (scene 0.5) ------------------------------
  // Deliberately NOT a per-institution breakdown. The invited set is much
  // wider than the survey's own five institution options, so matching a
  // respondent to an institution is unreliable; and recipients per
  // institution range from one person to about thirty, so columns would carry
  // a visual imbalance that says nothing. One total, one block of dots, and a
  // logo row that is decoupled from the counts.
  const inv = data.invitations ?? null;
  // The logo manifest is a build artefact and usually absent (the files are
  // not committed). `file` is null for anything not staged, and the scene
  // captions every institution by name either way -- so a missing logo is a
  // labelled gap, never a silently empty box.
  const logoBySlug = new Map(
    (logos?.logos ?? []).map(l => [l.slug, l.file]));
  const recipients = !inv ? null : {
    invitedTotal: inv.invited_total,
    asOf: inv.as_of,
    nResponded: respondents.length,
    // Recomputed here rather than read from quality.response_rate, so the
    // number on screen cannot disagree with the dots on screen.
    rate: inv.invited_total ? respondents.length / inv.invited_total : 0,
    institutions: (inv.institutions ?? []).map(i => ({
      slug: i.slug,
      name: i.name,
      // Only drawn where `file` is null -- see the note in options.py.
      short: i.short ?? i.name,
      file: logoBySlug.get(i.slug) ?? null,
      // Supplied with a painted-in white background instead of transparency.
      // The renderer composites these with multiply so the white drops to the
      // paper ground; see the note on `opaque_bg` in options.py.
      opaqueBg: !!i.opaque_bg,
    })),
    nLogos: (inv.institutions ?? [])
      .filter(i => logoBySlug.has(i.slug)).length,
  };

  // --- monitoring pilot interest (scene 6) ---------------------------------
  // Survey Q19, five candidate monitoring areas on a three-point interest
  // scale. Reached model.js already as respondents[].monitoring but stopped
  // there: no aggregate, no layout, no scene.
  //
  // SPEC 4.5 records the hazard this scene has to survive: across 45 pilot
  // answers there was exactly ONE "Very interested", which could be genuine
  // or could be end-of-survey fatigue. So both readings are carried -- `n`
  // (any interest) and `nVery` (top of scale) -- because they can rank the
  // five areas differently, and a scene that quietly picked one measure would
  // be choosing its own conclusion.
  const monitoring = monitoringTopics.map(t => {
    const answered = respondents.filter(r => r.monitoring?.[t.key] != null);
    const interested = answered.filter(r => r.monitoring[t.key] > 0);
    const byLab = new Map(labs.map(l => [l.id, 0]));
    let noLabCount = 0;
    for (const r of interested) {
      if (!r.labIds.length) { noLabCount += 1; continue; }
      // Same fractional rule as themes and stakeholders.
      const w = 1 / r.labIds.length;
      for (const id of r.labIds) byLab.set(id, byLab.get(id) + w);
    }
    return {
      id: `mon-${t.key}`,
      key: t.key,
      kind: 'monitoring',
      name: t.label,
      short: t.short ?? t.label,
      n: interested.length,
      nVery: answered.filter(r => r.monitoring[t.key] === 2).length,
      nAnswered: answered.length,
      // Summed ordinal, the quantity the link weights use.
      interest: d_sum(answered, r => r.monitoring[t.key]),
      respondentIds: interested.map(r => r.id),
      weights: Object.fromEntries(byLab),
      nNoLab: noLabCount,
      concentration: concentration([...byLab.values()]),
    };
  });

  // --- lab x use case matrix (candidate beat 4.5) --------------------------
  // "Which lab has nobody working on X" -- the cell that matters is the zero.
  const matrix = labs.map(l => ({
    labId: l.id,
    cells: useCases.map(u => {
      const rows = respondents.filter(r => r.labIds.includes(l.id));
      const vals = rows
        .map(r => ({ r, uc: r.useCases.find(x => x.id === u.id) }))
        .filter(x => x.uc);
      const experienced = vals.filter(x => x.uc.experience > 0);
      // UNMET DEMAND (survey Q8, "where would you like to gain experience").
      // Interested AND no experience -- deliberately disjoint from
      // `experienced`, so the two dot populations in a bubble never double
      // count a person and the bubble stays countable. Someone who already
      // has experience and wants more is real, but they are not the mismatch
      // this beat is about: the gap between where the appetite is and where
      // the capacity is.
      const demand = vals.filter(x => x.uc.interest > 0 && x.uc.experience === 0);
      return {
        useCaseId: u.id,
        n: rows.length,
        experience: d_sum(vals, x => x.uc.experience),
        interest: d_sum(vals, x => x.uc.interest),
        nExperienced: experienced.length,
        nDemand: demand.length,
        // Same reasoning as expIds: WHICH people, because the dots are keyed
        // by person so they can morph in and out of the network.
        demandIds: demand.map(x => x.r.id),
        // WHICH respondents, not just how many. Scene 4.5 draws one dot per
        // experienced researcher and those dots have to be keyed by person so
        // they can morph out of the scene 4 network and into the scene 5
        // beeswarm as the same DOM elements.
        //
        // A bridging researcher appears in every lab they belong to, so the
        // same id legitimately occurs in more than one row -- the dot key
        // includes the lab for exactly that reason.
        expIds: experienced.map(x => x.r.id),
        // The actionable finding: this lab, this use case, nobody at all.
        isVoid: vals.every(x => x.uc.experience === 0),
      };
    }),
  }));

  // --- links ---------------------------------------------------------------
  // Built once, keyed by stable string id so D3 joins keep object constancy
  // across scenes (SPEC 2.1).
  const links = {
    respondentLab: [],
    respondentTheme: [],
    respondentStakeholder: [],
    respondentUseCase: [],
    respondentMonitoring: [],
  };
  for (const r of respondents) {
    for (const labId of r.labIds) {
      links.respondentLab.push({
        id: `${r.id}~${labId}`, source: r.id, target: labId, kind: 'lab',
      });
    }
    for (const themeId of r.themeIds) {
      links.respondentTheme.push({
        id: `${r.id}~${themeId}`, source: r.id, target: themeId, kind: 'theme',
      });
    }
    for (const sgId of r.stakeholderIds) {
      links.respondentStakeholder.push({
        id: `${r.id}~${sgId}`, source: r.id, target: sgId, kind: 'stake',
      });
    }
    for (const t of monitoringTopics) {
      const v = r.monitoring?.[t.key];
      // Zero interest and unanswered are both dropped, exactly as the
      // zero-weight use case links are: 49 x 5 lines of mostly no information
      // would bury the ones that mean something.
      if (!v) continue;
      links.respondentMonitoring.push({
        id: `${r.id}~mon-${t.key}`, source: r.id, target: `mon-${t.key}`,
        kind: 'mon', interest: v,
      });
    }
    for (const uc of r.useCases) {
      // Every respondent answered every use case, including "no experience,
      // not interested". Those links exist in the data but must not be drawn
      // -- 49 x 6 = 294 lines of which most carry zero information.
      if (uc.experience === 0 && uc.interest === 0) continue;
      links.respondentUseCase.push({
        id: `${r.id}~${uc.id}`, source: r.id, target: uc.id, kind: 'usecase',
        experience: uc.experience, interest: uc.interest,
      });
    }
  }

  // --- engagement distribution (SPEC 4.2 / 4.3) ---------------------------
  const counted = respondents.filter(r => !r.flagged);
  const engagement = {
    // `short` is what an axis tick can fit; the beeswarm reads it from
    // here rather than hard-coding four strings (SPEC 3).
    scale: ladder.map(s => ({
      rung: s.rung, key: s.key, label: s.label, short: s.short ?? s.label,
    })),
    // index = engagement_level 0..3
    counts: [0, 1, 2, 3].map(lvl => counted.filter(r => r.engagement === lvl).length),
    median: median(counted.map(r => r.engagement)),
    nCounted: counted.length,
    nExcluded: respondents.length - counted.length,
    // SPEC 4.2 watch item: if the three rungs move in lockstep the ladder
    // collapses to engaged/not-engaged and the beeswarm goes bimodal. This
    // number decides whether scene 5 leads with the ladder or the modes.
    // 1 = perfectly graded across 0..3, 0 = everyone at the extremes.
    discrimination: gradedness(counted.map(r => r.engagement), 4),
  };

  // --- participatory modes panel (beat 5.3) -------------------------------
  const modePanel = modes.map(m => ({
    key: m.key,
    label: m.label,
    // counts across the 5-point participatory scale, null answers excluded
    counts: data.scales.participatory.map((_, i) =>
      respondents.filter(r => r.participatory[m.key] === i).length),
    nAnswered: respondents.filter(r => r.participatory[m.key] != null).length,
    // "endorsed" = Like me / Very much like me, matching the rung rule
    nEndorsed: respondents.filter(r => (r.participatory[m.key] ?? -1) >= 3).length,
  }));

  // --- Branch A / B (SPEC 4.1) -------------------------------------------
  const nBridge = respondents.filter(r => r.isBridge).length;
  const branch = {
    // Branch A: bridging researchers exist and are the punchline.
    // Branch B: the lab layer is a clean partition; cross-lab structure has
    // to come from themes and use cases instead.
    id: nBridge > 0 ? 'A' : 'B',
    nBridge,
    nNoLab: respondents.filter(r => r.noLab || r.unplaced).length,
    nSingleLab: respondents.filter(r => r.labIds.length === 1).length,
  };

  return {
    meta: {
      ...data.meta,
      schema: data.meta.schema_version,
      geo: geo.meta,
    },
    labsBbox: geo.labs_bbox,
    // States present, already ordered north to south by build_geo.py.
    states: geo.states ?? [],
    germany: geo.germany,
    nuts3: geo.nuts3,

    labs, respondents, themes, stakeholders, useCases, matrix, links,
    monitoring, recipients, spine,
    engagement, modePanel, branch,
    // Scene 7. Not survey rows: codes and counts from src/build_wordcloud.py,
    // passed through as built.
    wordcloud: wordcloud?.dimensions?.length ? wordcloud : null,

    scales: data.scales,
    statements: data.participatory_statements,
    ladder, modes,
    monitoringTopics,
    quality: data.quality,

    // Every node in one array, so the layout and the scene joins can share a
    // single keyed selection.
    get nodes() {
      return [...labs, ...respondents, ...themes, ...stakeholders,
              ...useCases];
    },
  };
}

// --- guards -----------------------------------------------------------------

function assertSchema(data, geo) {
  // 1.1 added the top-level stakeholder_groups catalogue (scene 3.5); 1.2
  // added `short` to each monitoring topic (scene 6); 1.3 added the
  // invitations block (scene 0.5). Every change is additive, so all listed
  // versions build -- but an older file has no catalogue for the newer
  // scenes, and a scene with no nodes must be absent rather than
  // half-drawn.
  const SUPPORTED = ['1.0', '1.1', '1.2', '1.3', '1.4'];
  const v = data?.meta?.schema_version;
  if (!SUPPORTED.includes(v)) {
    throw new Error(
      `data.json schema_version is ${JSON.stringify(v)}, expected one of ` +
      `${SUPPORTED.map(x => JSON.stringify(x)).join(', ')}. ` +
      `Re-run src/parse_survey.py, or update model.js deliberately -- do not ` +
      `loosen this check.`
    );
  }
  if (!geo?.labs?.features?.length) {
    throw new Error('geo.json has no lab features. Re-run src/build_geo.py.');
  }
  if (data.living_labs.length !== geo.labs.features.length) {
    throw new Error(
      `lab count mismatch: data.json has ${data.living_labs.length}, ` +
      `geo.json has ${geo.labs.features.length}`
    );
  }
}

// --- small stats ------------------------------------------------------------

const d_sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);

function median(xs) {
  const s = xs.filter(x => x != null).slice().sort((a, b) => a - b);
  if (!s.length) return null;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * How lopsided a weight vector is. 0 = perfectly even, 1 = all in one bucket.
 * Normalised so it is comparable across themes with different totals.
 */
function concentration(ws) {
  const total = ws.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  const k = ws.length;
  const hhi = ws.reduce((a, w) => a + (w / total) ** 2, 0);   // 1/k .. 1
  return (hhi - 1 / k) / (1 - 1 / k);
}

/**
 * Is an ordinal variable actually graded, or piled at the extremes?
 * 1 = uniform across all levels, 0 = entirely at the ends. This is the number
 * that answers SPEC open decision 2.
 */
function gradedness(xs, levels) {
  const vals = xs.filter(x => x != null);
  if (!vals.length) return 0;
  const counts = Array.from({ length: levels }, (_, i) =>
    vals.filter(v => v === i).length / vals.length);
  // normalised Shannon entropy
  const h = -counts.reduce((a, p) => a + (p > 0 ? p * Math.log(p) : 0), 0);
  return h / Math.log(levels);
}
