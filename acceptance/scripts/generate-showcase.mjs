import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import opentype from "opentype.js";

// Outline the bundled fonts so SVG rendering cannot fall back to system fonts.
const fontRoot = path.resolve("acceptance", "assets", "showcase-fonts");
function readFont(filename) {
  const bytes = fs.readFileSync(path.join(fontRoot, filename));
  return opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}

const fonts = {
  display: readFont("DMSerifDisplay-Regular.ttf"),
  regular: readFont("Lato-Regular.ttf"),
  bold: readFont("Lato-Bold.ttf"),
};

const root = process.cwd();
const actualRoot = path.resolve(
  root,
  process.env.TASKS_EYE_VISUAL_ACTUAL_ROOT ??
    path.join("acceptance", "snapshots", "docs"),
);
const outputDir = path.resolve(
  root,
  process.env.TASKS_EYE_SHOWCASE_OUTPUT_DIR ??
    path.join("acceptance", "artifacts", "community-submission"),
);
const artifactRoot = path.resolve(root, "acceptance", "artifacts");
const outputRelativeToArtifacts = path.relative(artifactRoot, outputDir);
if (
  outputRelativeToArtifacts === "" ||
  outputRelativeToArtifacts.startsWith(`..${path.sep}`) ||
  path.isAbsolute(outputRelativeToArtifacts)
) {
  throw new Error(
    `Showcase output must be inside ${path.relative(root, artifactRoot)}`,
  );
}

const cards = [
  {
    filename: "01-focus-on-today.png",
    screenshot: "features/views-focus/board.png",
    windowTitle: "Tasks Eye — Focus",
    eyebrow: "FOCUS VIEW",
    title: ["A clear view", "of today."],
    description: [
      "Overdue work, today’s actions,",
      "and unavailable days—together.",
    ],
    pills: ["Today at a glance", "Built-in validation"],
    accent: "#b6a1de",
  },
  {
    filename: "02-plan-ahead.png",
    screenshot: "features/views-open/board.png",
    windowTitle: "Tasks Eye — Open",
    eyebrow: "OPEN VIEW",
    title: ["Make room for", "what’s next."],
    description: [
      "Group next actions by Today,",
      "Tomorrow, This Month, and beyond.",
    ],
    pills: ["Date buckets", "Progressive disclosure"],
    accent: "#86c5d8",
  },
  {
    filename: "03-act-from-the-board.png",
    screenshot: "features/actions-board-task-controls/controls.png",
    windowTitle: "Tasks Eye — Quick actions",
    eyebrow: "QUICK ACTIONS",
    title: ["Small actions.", "Steady progress."],
    description: [
      "Complete tasks or move due dates",
      "and adjust priority inline.",
    ],
    pills: ["Fast updates", "Tasks integration"],
    accent: "#91c8a6",
  },
  {
    filename: "04-repair-inbox.png",
    screenshot: "features/views-inbox/repair-queue.png",
    windowTitle: "Tasks Eye — Inbox",
    eyebrow: "REPAIR QUEUE",
    title: ["A place to put", "things right."],
    description: [
      "See exactly what each note needs",
      "before it rejoins your workflow.",
    ],
    pills: ["Actionable errors", "Note-centered"],
    accent: "#e5a19a",
  },
  {
    filename: "05-plan-around-availability.png",
    screenshot: "features/availability-vacation-markers/settings.png",
    windowTitle: "Tasks Eye — Availability",
    eyebrow: "AVAILABILITY",
    title: ["Plan around", "real life."],
    description: [
      "Combine weekends, public holidays,",
      "and personal time off.",
    ],
    pills: ["Personal time off", "Public holidays"],
    accent: "#d9bd7b",
    wide: true,
  },
];

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function outlineTypography(svg) {
  const attributes = (source) => Object.fromEntries(
    [...source.matchAll(/([\w-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]),
  );
  const decode = (value) => value.replaceAll("&quot;", '"')
    .replaceAll("&gt;", ">").replaceAll("&lt;", "<").replaceAll("&amp;", "&");
  return svg.replace(/<text\b([^>]*)>([\s\S]*?)<\/text>/g, (_, source, content) => {
    const attrs = attributes(source);
    const size = Number(attrs["font-size"]);
    const font = attrs["font-family"] === "DM Serif Display" ? fonts.display :
      Number(attrs["font-weight"]) >= 700 ? fonts.bold : fonts.regular;
    let y = Number(attrs.y);
    const draw = (value, x) => {
      const outline = font.getPath(decode(value), x, y, size, {
        letterSpacing: Number(attrs["letter-spacing"] ?? 0) / size,
      });
      return `<path d="${outline.toPathData(2)}" fill="${attrs.fill}"/>`;
    };
    if (!content.includes("<tspan")) return draw(content, Number(attrs.x));
    return [...content.matchAll(/<tspan([^>]*)>(.*?)<\/tspan>/g)].map((match) => {
      const span = attributes(match[1]);
      y += Number(span.dy ?? 0);
      return draw(match[2], Number(span.x ?? attrs.x));
    }).join("");
  });
}

function logo() {
  return `
    <g transform="translate(56 48)">
      <rect width="36" height="36" rx="9" fill="#294438"/>
      <path fill="#b8d5c7" d="M8 9h18v3H8zM8 16h12v3H8zM8 23h18v3H8z"/>
      <path fill="#fff" d="m24 16 3 3 6-7 2 2-8 9-5-5z"/>
    </g>
    <text x="104" y="62" fill="#e6eee8" font-size="15" font-weight="700"
      letter-spacing="1.5">TASKS EYE</text>
    <text x="104" y="83" fill="#98aaa0" font-size="13">For your Obsidian workspace</text>
  `;
}

function textBlock(card) {
  const wide = card.wide === true;
  const titleY = wide ? 178 : 290;
  const titleSize = wide ? 50 : 54;
  const descriptionX = wide ? 640 : 56;
  const descriptionY = wide ? 178 : 448;
  const featureY = wide ? 268 : 536;
  const title = card.title.map((line, index) =>
    `<tspan x="56" dy="${index === 0 ? 0 : 58}">${escapeXml(line)}</tspan>`
  ).join("");
  const description = card.description.map((line, index) =>
    `<tspan x="${descriptionX}" dy="${index === 0 ? 0 : 28}">${escapeXml(line)}</tspan>`
  ).join("");
  const features = card.pills.map((pill, index) => {
    const x = wide ? 640 + index * 230 : 56;
    const y = featureY + (wide ? 0 : index * 36);
    return `
      <circle cx="${x + 7}" cy="${y - 5}" r="7" fill="${card.accent}" fill-opacity="0.1"/>
      <path d="m${x + 4} ${y - 5} 2 2 4-4" fill="none" stroke="${card.accent}"
        stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="${x + 25}" y="${y}" fill="#b8c7bd" font-size="15">${escapeXml(pill)}</text>
    `;
  }).join("");
  return `
    <text x="56" y="${titleY - 53}" fill="${card.accent}" font-size="11"
      font-weight="700" letter-spacing="2.3">${escapeXml(card.eyebrow)}</text>
    <text x="56" y="${titleY}" fill="#e6eee8" font-family="DM Serif Display"
      font-size="${titleSize}" letter-spacing="-0.7">${title}</text>
    <text x="${descriptionX}" y="${descriptionY}" fill="#9eafa4"
      font-size="18">${description}</text>
    ${features}
  `;
}

function screenshotLayout(card, { width, height }) {
  const frameW = width + 16;
  return {
    frameX: card.wide ? Math.round((1200 - frameW) / 2) : 1144 - frameW,
    frameY: card.wide ? 324 : 40,
    frameW,
    frameH: height + 48,
  };
}

function windowFrame(card, layout) {
  const { frameX, frameY, frameW, frameH } = layout;
  return `
    <g filter="url(#shadow)">
      <rect x="${frameX}" y="${frameY}" width="${frameW}" height="${frameH}"
        rx="13" fill="#202321"/>
      <rect x="${frameX + 0.5}" y="${frameY + 0.5}" width="${frameW - 1}" height="${frameH - 1}"
        rx="13" fill="none" stroke="#fff" stroke-opacity="0.14"/>
      <circle cx="${frameX + 19}" cy="${frameY + 20}" r="3" fill="${card.accent}"/>
      <text x="${frameX + 32}" y="${frameY + 24}" fill="#c9ceca"
        font-size="11" letter-spacing="0.2">${escapeXml(card.windowTitle)}</text>
      <path d="M${frameX + frameW - 35} ${frameY + 16}h7v7h-7z
        M${frameX + frameW - 22} ${frameY + 16}h7v7h-7z"
        fill="none" stroke="#737b75" stroke-width="1"/>
    </g>
  `;
}

function makeSvg(card, index, layout) {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"
    viewBox="0 0 1200 800" font-family="Lato">
    <defs>
      <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#111916"/>
        <stop offset="1" stop-color="#19251f"/>
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="12" stdDeviation="15" flood-color="#000000" flood-opacity="0.35"/>
      </filter>
    </defs>
    <rect width="1200" height="800" fill="url(#paper)"/>
    <circle cx="1160" cy="70" r="280" fill="${card.accent}" fill-opacity="0.035"/>
    ${logo()}
    ${textBlock(card)}
    ${windowFrame(card, layout)}
    <path d="M56 ${card.wide ? 770 : 704}H${card.wide ? 1144 : 438}" stroke="#e6eee8" stroke-opacity="0.15"/>
    <text x="56" y="${card.wide ? 791 : 735}" fill="#81998b" font-size="10" letter-spacing="1.5">YOUR NOTES. YOUR NEXT MOVE.</text>
    <text x="${card.wide ? 1095 : 56}" y="${card.wide ? 791 : 764}" fill="${card.accent}" font-size="11" font-weight="700"
      letter-spacing="1.5">${String(index + 1).padStart(2, "0")} / 05</text>
  </svg>`;
}

fs.rmSync(outputDir, { recursive: true, force: true });
const missingSources = cards
  .map((card) => path.join(actualRoot, card.screenshot))
  .filter((screenshotPath) => !fs.existsSync(screenshotPath));
if (missingSources.length > 0) {
  throw new Error(
    `Showcase source${
      missingSources.length === 1 ? " is" : "s are"
    } missing:\n${
      missingSources.map((screenshotPath) =>
        `- ${path.relative(root, screenshotPath)}`
      ).join("\n")
    }`,
  );
}
fs.mkdirSync(outputDir, { recursive: true });

for (const [index, card] of cards.entries()) {
  const outputPath = path.join(outputDir, card.filename);
  const screenshotPath = path.join(actualRoot, card.screenshot);
  const layout = screenshotLayout(card, await sharp(screenshotPath).metadata());
  // Composite source pixels directly, outside the SVG filters, at native size.
  // Fractional SVG scaling and filtered image groups soften UI text.
  await sharp(Buffer.from(outlineTypography(makeSvg(card, index, layout))))
    .composite([{
      input: screenshotPath,
      left: layout.frameX + 8,
      top: layout.frameY + 40,
    }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outputPath);
  const metadata = await sharp(outputPath).metadata();
  if (
    metadata.width !== 1200 ||
    metadata.height !== 800 ||
    metadata.format !== "png"
  ) {
    throw new Error(`Invalid generated showcase image: ${outputPath}`);
  }
}

console.log(
  `Generated ${cards.length} community-submission screenshots in ${
    path.relative(root, outputDir)
  }`,
);
