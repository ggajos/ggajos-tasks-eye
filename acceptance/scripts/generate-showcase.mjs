import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const root = process.cwd();
const actualRoot = path.resolve(
  root,
  process.env.TASKS_EYE_VISUAL_ACTUAL_ROOT ??
    path.join("acceptance", "artifacts", "visual", "actual"),
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
    screenshot: "features/views-focus/dark/board.png",
    windowTitle: "Tasks Eye — Focus",
    eyebrow: "FOCUS VIEW",
    title: ["Know what needs", "attention today."],
    description: [
      "Overdue work, today’s actions,",
      "and unavailable days—together.",
    ],
    pills: ["Today at a glance", "Built-in validation"],
    accent: "#8b5cf6",
  },
  {
    filename: "02-plan-ahead.png",
    screenshot: "features/views-open/dark/board.png",
    windowTitle: "Tasks Eye — Open",
    eyebrow: "OPEN VIEW",
    title: ["Plan the work", "ahead."],
    description: [
      "Group next actions by Today,",
      "Tomorrow, This Month, and beyond.",
    ],
    pills: ["Date buckets", "Progressive disclosure"],
    accent: "#38bdf8",
  },
  {
    filename: "03-act-from-the-board.png",
    screenshot: "features/actions-board-task-controls/dark/controls.png",
    windowTitle: "Tasks Eye — Quick actions",
    eyebrow: "QUICK ACTIONS",
    title: ["Act without leaving", "the board."],
    description: [
      "Complete tasks or move due dates",
      "with focused inline controls.",
    ],
    pills: ["Fast updates", "Tasks integration"],
    accent: "#22c55e",
  },
  {
    filename: "04-repair-inbox.png",
    screenshot: "features/views-inbox/dark/repair-queue.png",
    windowTitle: "Tasks Eye — Inbox",
    eyebrow: "REPAIR QUEUE",
    title: ["Turn inconsistencies", "into a clear queue."],
    titleSize: 40,
    titleLineHeight: 50,
    description: [
      "See exactly what each note needs",
      "before it rejoins your workflow.",
    ],
    pills: ["Actionable errors", "Note-centered"],
    accent: "#fb7185",
  },
  {
    filename: "05-plan-around-availability.png",
    screenshot:
      "features/availability-vacation-markers/dark/settings.png",
    windowTitle: "Tasks Eye — Availability",
    eyebrow: "AVAILABILITY",
    title: ["Plan around real", "availability."],
    description: [
      "Combine weekends, public holidays,",
      "and personal time off.",
    ],
    pills: ["Personal time off", "Public holidays"],
    accent: "#f59e0b",
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

function dataUri(relativePath) {
  const screenshotPath = path.join(actualRoot, relativePath);
  if (!fs.existsSync(screenshotPath)) {
    throw new Error(
      `Showcase source is missing: ${path.relative(root, screenshotPath)}`,
    );
  }
  return `data:image/png;base64,${
    fs.readFileSync(screenshotPath).toString("base64")
  }`;
}

function logo() {
  return `
    <g transform="translate(64 52)">
      <rect width="42" height="42" rx="10" fill="#111827"/>
      <path fill="#38bdf8" d="M10 11h20v4H10zM10 19h14v4H10zM10 27h20v4H10z"/>
      <path fill="#f8fafc" d="m29 19 3 3 6-8 3 2-9 11-6-6z"/>
    </g>
    <text x="120" y="70" fill="#f8fafc" font-size="16" font-weight="700"
      letter-spacing="1.4">TASKS EYE</text>
    <text x="120" y="91" fill="#94a3b8" font-size="12" font-weight="500"
      letter-spacing="1.1">FOR OBSIDIAN</text>
  `;
}

function textBlock(card, index) {
  const titleStart = card.wide ? 172 : 202;
  const titleSize = card.titleSize ?? (card.wide ? 41 : 46);
  const titleLineHeight = card.titleLineHeight ?? 55;
  const descriptionStart = titleStart + 140;
  const pillStart = descriptionStart + 92;
  const title = card.title
    .map(
      (line, lineIndex) =>
        `<tspan x="64" dy="${lineIndex === 0 ? 0 : titleLineHeight}">${
          escapeXml(line)
        }</tspan>`,
    )
    .join("");
  const description = card.description
    .map(
      (line, lineIndex) =>
        `<tspan x="64" dy="${lineIndex === 0 ? 0 : 27}">${
          escapeXml(line)
        }</tspan>`,
    )
    .join("");

  let pillX = 64;
  const pills = card.pills
    .map((pill) => {
      const width = Math.round(pill.length * 6.5 + 42);
      const markup = `
        <rect x="${pillX}" y="${pillStart}" width="${width}" height="34" rx="17"
          fill="#ffffff" fill-opacity="0.055" stroke="#ffffff" stroke-opacity="0.12"/>
        <circle cx="${pillX + 16}" cy="${pillStart + 17}" r="3.5"
          fill="${card.accent}"/>
        <text x="${pillX + 28}" y="${pillStart + 17}" fill="#cbd5e1"
          font-size="12" font-weight="600" dominant-baseline="central">${
            escapeXml(pill)
          }</text>`;
      pillX += width + 10;
      return markup;
    })
    .join("");

  return `
    <rect x="64" y="${titleStart - 57}" width="40" height="3" rx="1.5"
      fill="${card.accent}"/>
    <text x="116" y="${titleStart - 51}" fill="${card.accent}" font-size="12"
      font-weight="700" letter-spacing="1.8">${escapeXml(card.eyebrow)}</text>
    <text x="64" y="${titleStart}" fill="#f8fafc" font-size="${titleSize}"
      font-weight="720" letter-spacing="-1.6">${title}</text>
    <text x="64" y="${descriptionStart}" fill="#a9b4c7" font-size="18"
      font-weight="400">${description}</text>
    ${pills}
    <text x="64" y="742" fill="#64748b" font-size="12" font-weight="700"
      letter-spacing="1.2">${String(index + 1).padStart(2, "0")} / 05</text>
  `;
}

function windowFrame(card, imageHref, index) {
  const wide = card.wide === true;
  const frameX = wide ? 402 : 500;
  const frameY = wide ? 112 : 48;
  const frameW = wide ? 750 : 650;
  const frameH = wide ? 590 : 704;
  const headerH = wide ? 42 : 43;
  const imageX = frameX + 10;
  const imageY = frameY + headerH;
  const imageW = frameW - 20;
  const imageH = wide ? 538 : 651;
  const clipId = `screen-${index}`;

  return `
    <g filter="url(#shadow)">
      <rect x="${frameX}" y="${frameY}" width="${frameW}" height="${frameH}"
        rx="18" fill="#171b23" stroke="#ffffff" stroke-opacity="0.14"/>
      <rect x="${frameX}" y="${frameY}" width="${frameW}" height="${headerH}"
        rx="18" fill="#202631"/>
      <rect x="${frameX}" y="${frameY + headerH - 18}" width="${frameW}"
        height="18" fill="#202631"/>
      <circle cx="${frameX + 20}" cy="${frameY + 21}" r="4" fill="#fb7185"/>
      <circle cx="${frameX + 34}" cy="${frameY + 21}" r="4" fill="#fbbf24"/>
      <circle cx="${frameX + 48}" cy="${frameY + 21}" r="4" fill="#4ade80"/>
      <text x="${frameX + 66}" y="${frameY + 26}" fill="#94a3b8"
        font-size="12" font-weight="600">${escapeXml(card.windowTitle)}</text>
      <clipPath id="${clipId}">
        <rect x="${imageX}" y="${imageY}" width="${imageW}" height="${imageH}"
          rx="8"/>
      </clipPath>
      <image href="${imageHref}" x="${imageX}" y="${imageY}" width="${imageW}"
        height="${imageH}" preserveAspectRatio="xMidYMid meet"
        clip-path="url(#${clipId})"/>
    </g>
  `;
}

function makeSvg(card, index) {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"
    viewBox="0 0 1200 800"
    font-family="Inter, Arial, sans-serif">
    <defs>
      <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#080c16"/>
        <stop offset="0.55" stop-color="#101625"/>
        <stop offset="1" stop-color="#0b101b"/>
      </linearGradient>
      <radialGradient id="glow">
        <stop offset="0" stop-color="${card.accent}" stop-opacity="0.22"/>
        <stop offset="1" stop-color="${card.accent}" stop-opacity="0"/>
      </radialGradient>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M40 0H0V40" fill="none" stroke="#ffffff"
          stroke-opacity="0.025" stroke-width="1"/>
      </pattern>
      <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="18" stdDeviation="24"
          flood-color="#000000" flood-opacity="0.48"/>
      </filter>
    </defs>
    <rect width="1200" height="800" fill="url(#background)"/>
    <ellipse cx="1080" cy="115" rx="470" ry="420" fill="url(#glow)"/>
    <rect width="1200" height="800" fill="url(#grid)"/>
    <path d="M0 799H1200" stroke="${card.accent}" stroke-opacity="0.5"/>
    ${logo()}
    ${textBlock(card, index)}
    ${windowFrame(card, dataUri(card.screenshot), index)}
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
  await sharp(Buffer.from(makeSvg(card, index)))
    .resize(1200, 800)
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
