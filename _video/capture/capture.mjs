// Captures the stills the site-tour video is built from.
//
//   node capture/capture.mjs           # shoot the local _site build
//   node capture/capture.mjs --inspect # dump the Policy Lab tool's DOM instead
//
// Writes PNGs plus a manifest.json to public/shots/. The manifest records each
// page's full height and the page-coordinate bounding box of every element the
// scenes need to push in on, so scene geometry is measured rather than guessed.
//
// The local site MUST be served over HTTP: dml-shared-head-assets.html loads the
// site's JS from absolute paths (/assets/js/...), which break under file://.

import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import puppeteer from "puppeteer";

const REPO = resolve(import.meta.dirname, "..", "..");
const SITE = join(REPO, "_site");
const OUT = resolve(import.meta.dirname, "..", "public", "shots");
const POLICY_TOOL = "https://iat-dml.github.io/policy-codesign-methods/";

const VIEWPORT = { width: 1600, height: 1000 };
// Chrome refuses screenshots taller than this; see the README note.
const MAX_PAGE_PX = 16000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".pdf": "application/pdf",
  ".lua": "text/plain; charset=utf-8",
};

function serveSite(root) {
  const server = createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
      let filePath = join(root, normalize(urlPath).replace(/^(\.\.[/\\])+/, ""));
      let info = await stat(filePath).catch(() => null);
      if (info?.isDirectory()) {
        filePath = join(filePath, "index.html");
        info = await stat(filePath).catch(() => null);
      }
      if (!info) {
        // Quarto emits extensionless links to .html files
        const withHtml = `${filePath}.html`;
        info = await stat(withHtml).catch(() => null);
        if (info) filePath = withHtml;
      }
      if (!info) {
        res.writeHead(404).end("not found");
        return;
      }
      res.writeHead(200, {
        "content-type": MIME[extname(filePath).toLowerCase()] ?? "application/octet-stream",
      });
      createReadStream(filePath).pipe(res);
    } catch (err) {
      res.writeHead(500).end(String(err));
    }
  });
  return new Promise((ok) => {
    server.listen(0, "127.0.0.1", () => ok({ server, port: server.address().port }));
  });
}

// Wait for layout to actually settle: network quiet, webfonts applied, and the
// site's own JS-rendered widgets present.
async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(
    () =>
      new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))),
  );
}

// Bounding boxes in *page* coordinates (not viewport), which is what the
// screenshots are in.
async function measure(page, selectors) {
  return page.evaluate((sels) => {
    const out = {
      pageWidth: document.documentElement.scrollWidth,
      pageHeight: document.documentElement.scrollHeight,
      elements: {},
    };
    for (const [name, sel] of Object.entries(sels)) {
      const nodes = [...document.querySelectorAll(sel)];
      out.elements[name] = nodes.map((n) => {
        const r = n.getBoundingClientRect();
        return {
          x: Math.round(r.x + window.scrollX),
          y: Math.round(r.y + window.scrollY),
          width: Math.round(r.width),
          height: Math.round(r.height),
          text: (n.textContent ?? "").trim().slice(0, 80),
        };
      });
    }
    return out;
  }, selectors);
}

/**
 * Waits for a *cross-origin* iframe to actually paint. `networkidle0` is not
 * enough for the Microsoft Forms embed on the contact page — it reports idle
 * while the form is still showing its own "Loading…" spinner. Puppeteer can
 * reach into cross-origin frames over CDP, so wait for real content instead.
 */
async function waitForEmbeddedFrame(page, name, { urlPattern, selector }) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const frame = page.frames().find((f) => urlPattern.test(f.url()));
    if (frame) {
      try {
        await frame.waitForSelector(selector, { timeout: 5_000 });
        // Let it finish laying out before the shutter.
        await new Promise((ok) => setTimeout(ok, 2_000));
        return true;
      } catch {
        // not ready yet, fall through and retry
      }
    }
    await new Promise((ok) => setTimeout(ok, 1_000));
  }
  console.warn(
    `  ! ${name}: no frame matching ${urlPattern} rendered "${selector}" — the shot will show its loading state`,
  );
  return false;
}

async function shootPage(
  browser,
  { name, url, selectors = {}, scale = 2, fullPage = true, waitForFrame },
) {
  const page = await browser.newPage();
  await page.setViewport({ ...VIEWPORT, deviceScaleFactor: scale });
  // The site sets respect-user-color-scheme, and headless Chrome reports dark by
  // default. Pin light so the shots match the brand's light palette and the
  // paper surround the video draws around them.
  await page.emulateMediaFeatures([
    { name: "prefers-color-scheme", value: "light" },
  ]);
  await page.goto(url, { waitUntil: "networkidle0", timeout: 90_000 });
  if (waitForFrame) await waitForEmbeddedFrame(page, name, waitForFrame);
  await settle(page);

  const measured = await measure(page, selectors);
  if (measured.pageHeight > MAX_PAGE_PX) {
    console.warn(
      `  ! ${name}: page is ${measured.pageHeight}px tall, over the ${MAX_PAGE_PX}px screenshot cap — capturing clipped`,
    );
  }
  const height = Math.min(measured.pageHeight, MAX_PAGE_PX);

  await page.screenshot({
    path: join(OUT, `${name}.png`),
    ...(fullPage && measured.pageHeight <= MAX_PAGE_PX
      ? { fullPage: true }
      : { clip: { x: 0, y: 0, width: measured.pageWidth, height } }),
  });
  console.log(`  + ${name}.png  ${measured.pageWidth}x${height} @${scale}x`);
  await page.close();
  return { ...measured, capturedHeight: height, deviceScaleFactor: scale };
}

// --- Policy Lab tool ---------------------------------------------------------
// Its DOM lives in another repo, so --inspect prints the interactive controls
// and their selectors before the click sequence below is trusted.
async function inspectPolicyTool(browser) {
  const page = await browser.newPage();
  await page.setViewport({ ...VIEWPORT, deviceScaleFactor: 1 });
  await page.goto(POLICY_TOOL, { waitUntil: "networkidle0", timeout: 90_000 });
  await settle(page);

  const probe = () =>
    page.evaluate(() => {
      const describe = (n) => {
        const r = n.getBoundingClientRect();
        return {
          tag: n.tagName.toLowerCase(),
          id: n.id || undefined,
          cls:
            n.className && typeof n.className === "string" ? n.className : undefined,
          role: n.getAttribute("role") || undefined,
          aria: n.getAttribute("aria-label") || undefined,
          type: n.getAttribute("type") || undefined,
          box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
          text: (n.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 70),
        };
      };
      return {
        pageHeight: document.documentElement.scrollHeight,
        headings: [...document.querySelectorAll("h1,h2,h3,h4")].map((n) =>
          (n.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 80),
        ),
        buttons: [...document.querySelectorAll("button,[role=button]")]
          .slice(0, 80)
          .map(describe),
        inputs: [...document.querySelectorAll("input,select,textarea")]
          .slice(0, 60)
          .map(describe),
        svgInteractive: [
          ...document.querySelectorAll("svg [role=button], svg [tabindex], svg g[class]"),
        ]
          .slice(0, 50)
          .map(describe),
        cardish: [
          ...document.querySelectorAll(
            "[class*=card], [class*=method], [class*=item], [class*=result], li",
          ),
        ]
          .slice(0, 25)
          .map(describe),
      };
    });

  const report = { title: await page.title(), tabs: {} };
  report.tabs["Concept diagram"] = await probe();

  // Mount the second tab so its filter controls exist, then probe again.
  const switched = await page.evaluate(() => {
    const tab = [...document.querySelectorAll("button")].find((b) =>
      /method library/i.test(b.textContent ?? ""),
    );
    if (!tab) return false;
    tab.click();
    return true;
  });
  if (switched) {
    await new Promise((ok) => setTimeout(ok, 1200));
    await settle(page);
    report.tabs["Method library"] = await probe();
  }

  console.log(JSON.stringify(report, null, 2));
  await page.close();
}

// The tool is a React app with two tabs. Its filter chips are captured one click
// at a time so the video can cut through them and show `.results-count` falling
// from "14 methods" — the clearest proof the thing actually works.
const TOOL_SELECTORS = {
  tabs: "button.tab",
  chips: "button.filter-chip",
  searchInput: "input.filter-input",
  resultsCount: ".results-count",
  resultsHead: ".results-head",
  methodGrid: ".method-grid",
  cards: "article.method-card",
  svgGroups: "svg g",
};

async function shootPolicyTool(browser) {
  const page = await browser.newPage();
  await page.setViewport({ ...VIEWPORT, deviceScaleFactor: 2 });
  await page.emulateMediaFeatures([
    { name: "prefers-color-scheme", value: "light" },
  ]);
  await page.goto(POLICY_TOOL, { waitUntil: "networkidle0", timeout: 90_000 });
  await settle(page);

  const clipTo = async (name) => {
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.screenshot({
      path: join(OUT, `${name}.png`),
      clip: { x: 0, y: 0, width: VIEWPORT.width, height: Math.min(h, MAX_PAGE_PX) },
    });
    console.log(`  + ${name}.png  ${VIEWPORT.width}x${Math.min(h, MAX_PAGE_PX)} @2x`);
  };

  // React re-renders synchronously on click, but give it a frame to paint.
  const clickByText = async (selector, label) => {
    const hit = await page.evaluate(
      (sel, want) => {
        const el = [...document.querySelectorAll(sel)].find(
          (n) => (n.textContent ?? "").trim() === want,
        );
        if (!el) return false;
        el.click();
        return true;
      },
      selector,
      label,
    );
    if (!hit) throw new Error(`no ${selector} matching "${label}"`);
    await new Promise((ok) => setTimeout(ok, 400));
    await settle(page);
  };

  const readCount = () =>
    page.evaluate(
      () => document.querySelector(".results-count")?.textContent?.trim() ?? "",
    );

  const out = { diagram: {}, methods: {} };

  // --- Concept diagram tab ---
  out.diagram.resting = await measure(page, TOOL_SELECTORS);
  await clipTo("policy-tool-diagram");

  // Phase regions are unclassed SVG groups; click via the label's own box centre.
  const phase = out.diagram.resting.elements.svgGroups.find((g) =>
    /^Co-Design/.test(g.text),
  );
  if (phase) {
    await page.mouse.click(
      Math.round(phase.x + phase.width / 2),
      Math.round(phase.y + phase.height / 2),
    );
    await new Promise((ok) => setTimeout(ok, 500));
    await settle(page);
    out.diagram.active = await measure(page, TOOL_SELECTORS);
    await clipTo("policy-tool-diagram-active");
  } else {
    console.warn("  ! no Co-Design phase group found — skipping active diagram shot");
  }

  // --- Method library tab ---
  await clickByText("button.tab", "Method library");
  out.methods.unfiltered = await measure(page, TOOL_SELECTORS);
  out.methods.unfiltered.count = await readCount();
  await clipTo("policy-tool-methods");

  // Progressive filtering: phase, then actor, then effort.
  const steps = [
    ["Co-Design", "policy-tool-methods-f1"],
    ["Researchers", "policy-tool-methods-f2"],
    ["Low effort", "policy-tool-methods-f3"],
  ];
  out.methods.filtered = [];
  for (const [label, name] of steps) {
    await clickByText("button.filter-chip", label);
    const count = await readCount();
    out.methods.filtered.push({ label, shot: name, count });
    console.log(`    filter "${label}" -> ${count}`);
    await clipTo(name);
  }
  out.methods.afterFilters = await measure(page, TOOL_SELECTORS);

  await page.close();
  return out;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--font-render-hinting=none", "--force-color-profile=srgb"],
  });

  if (process.argv.includes("--inspect")) {
    await inspectPolicyTool(browser);
    await browser.close();
    return;
  }

  const { server, port } = await serveSite(SITE);
  const base = `http://127.0.0.1:${port}`;
  console.log(`serving _site on ${base}`);

  const manifest = {};

  console.log("local site:");
  manifest.home = await shootPage(browser, {
    name: "home-full",
    url: `${base}/index.html`,
    scale: 2,
    selectors: {
      hero: ".hero",
      heroLogo: ".hero-logo",
      conceptDiagram: "[data-dml-concept-diagram]",
      columns: ".columns-divided",
      newsListing: "#listing-news-listing",
      projectsListing: "#listing-projects-listing",
      newsCards: "#listing-news-listing .quarto-grid-item",
      projectCards: "#listing-projects-listing .quarto-grid-item",
      cardTitles: ".card-title.listing-title",
      moreLinks: ".more-link",
      h2: "h2",
    },
  });

  manifest.policyPage = await shootPage(browser, {
    name: "policy-page-full",
    url: `${base}/projects/policy-lab-guide.html`,
    scale: 2,
    selectors: {
      title: "#title-block-header",
      h1: "h1",
      lead: "main p",
      embed: "iframe",
    },
  });

  manifest.resources = await shootPage(browser, {
    name: "resources-full",
    url: `${base}/resources.html`,
    scale: 2,
    selectors: { h1: "h1", h2: "h2", lead: "main > p", links: "main a" },
  });

  manifest.contact = await shootPage(browser, {
    name: "contact-full",
    url: `${base}/contact-form.html`,
    scale: 2,
    // The embed src points at forms.office.com but redirects to
    // forms.cloud.microsoft, so match either host or the wait never fires and
    // the shot captures the form's own "Loading…" spinner.
    //
    // Never interact with this form beyond waiting for it to render, and never
    // submit it.
    waitForFrame: {
      urlPattern: /forms\.(office\.com|cloud\.microsoft)/,
      selector: "input, textarea, [role=textbox]",
    },
    selectors: {
      h1: "h1",
      h2: "h2",
      callout: ".callout",
      form: "iframe",
      emailLink: ".dml-contact",
      serviceDesk: 'a[href*="service-desk"]',
    },
  });

  console.log("policy lab tool (live):");
  manifest.policyTool = await shootPolicyTool(browser);

  await writeFile(
    join(OUT, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  console.log("+ manifest.json");

  await browser.close();
  server.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
