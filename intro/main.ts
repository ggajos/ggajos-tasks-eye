import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type Kind = "focus" | "open" | "inbox";

interface Note {
  title: string;
  kind: Kind;
  chip: { text: string; tone: "late" | "today" | "warn" | "" };
  tasks: string[];
}

const NOTES: Note[] = [
  {
    title: "Tax return",
    kind: "focus",
    chip: { text: "overdue", tone: "late" },
    tasks: ["Gather receipts", "Fill in the form"],
  },
  {
    title: "Website relaunch",
    kind: "focus",
    chip: { text: "today", tone: "today" },
    tasks: ["Review the copy", "Check redirects"],
  },
  {
    title: "Book the trip",
    kind: "open",
    chip: { text: "Fri", tone: "" },
    tasks: ["Compare flights", "Reserve a hotel"],
  },
  {
    title: "Learn Rust",
    kind: "open",
    chip: { text: "next week", tone: "" },
    tasks: ["Read chapter 4", "Do the exercises"],
  },
  {
    title: "Team offsite",
    kind: "inbox",
    chip: { text: "no date", tone: "warn" },
    tasks: ["Pick a venue", "Send invitations"],
  },
  {
    title: "Half-formed idea",
    kind: "inbox",
    chip: { text: "no tasks", tone: "warn" },
    tasks: ["Something, someday", "Maybe"],
  },
];

const BOARD_TITLES = [
  "All notes",
  "One next action each",
  "Focus",
  "Open",
  "Inbox",
  "Done",
  "",
];

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function taskLine(label: string, next: boolean): HTMLElement {
  const line = el("div", next ? "task next" : "task");
  line.append(el("span", "box"), el("span", "label", label));
  return line;
}

function renderRows(container: HTMLElement): Record<Kind, HTMLElement[]> {
  const rows: Record<Kind, HTMLElement[]> = { focus: [], open: [], inbox: [] };
  for (const note of NOTES) {
    const row = el("div", "row");
    const inner = el("div", "row-inner");
    const card = el("div", note.kind === "inbox" ? "note flagged" : "note");
    const title = el("div", "note-title");
    title.append(
      el("span", "", note.title),
      el("span", `chip ${note.chip.tone}`.trim(), note.chip.text),
    );
    const [first = "", ...rest] = note.tasks;
    const extra = el("div", "extra");
    const extraInner = el("div", "extra-inner");
    for (const label of rest) extraInner.append(taskLine(label, false));
    extra.append(extraInner);
    card.append(title, taskLine(first, true), extra);
    inner.append(card);
    row.append(inner);
    container.append(row);
    rows[note.kind].push(row);
  }
  return rows;
}

function startTour(): (() => void) | undefined {
  gsap.registerPlugin(ScrollTrigger);

  const scenes = gsap.utils.toArray<HTMLElement>(".scene");
  const rowsEl = document.getElementById("rows");
  const titleEl = document.getElementById("board-title");
  const board = document.getElementById("board");
  const empty = document.getElementById("empty");
  if (!rowsEl || !titleEl || !board || !empty) return;

  const rows = renderRows(rowsEl);
  const allRows = [...rows.focus, ...rows.open, ...rows.inbox];
  const extras = allRows.map(
    (row) => row.querySelector<HTMLElement>(".extra") as HTMLElement,
  );
  const focusNext = rows.focus.map((row) => ({
    box: row.querySelector(".task.next .box"),
    label: row.querySelector(".task.next .label"),
  }));

  let timeline: gsap.core.Timeline | undefined;

  const build = () => {
    gsap.set([...allRows, ...extras, board, empty, ...scenes], {
      clearProps: "all",
    });
    gsap.set(scenes, { autoAlpha: 0 });
    gsap.set(scenes[0] ?? [], { autoAlpha: 1 });

    // Rows tween between measured pixel heights: expanded (all tasks shown)
    // and collapsed (next action only).
    const expanded = allRows.map((row) => row.offsetHeight);
    const extraHeights = extras.map((extra) => extra.offsetHeight);
    const collapsed = allRows.map((row, i) => (expanded[i] ?? 0) - (extraHeights[i] ?? 0));
    const heightOf = (row: HTMLElement) => {
      const i = allRows.indexOf(row);
      return collapsed[i] ?? 0;
    };

    const tl = gsap.timeline({
      defaults: { ease: "power2.inOut", immediateRender: false },
      scrollTrigger: {
        trigger: "#stage",
        start: "top top",
        end: "+=700%",
        pin: true,
        scrub: 0.5,
        onUpdate: (self) => {
          const index = Math.min(
            BOARD_TITLES.length - 1,
            Math.floor(self.progress * BOARD_TITLES.length),
          );
          titleEl.textContent = BOARD_TITLES[index] ?? "";
        },
      },
    });

    const hide = (targets: HTMLElement[], at: number) => {
      targets.forEach((row, i) => {
        tl.fromTo(
          row,
          { height: heightOf(row), autoAlpha: 1 },
          { height: 0, autoAlpha: 0, duration: 0.4 },
          at + i * 0.04,
        );
      });
    };
    const show = (targets: HTMLElement[], at: number) => {
      targets.forEach((row, i) => {
        tl.fromTo(
          row,
          { height: 0, autoAlpha: 0 },
          { height: heightOf(row), autoAlpha: 1, duration: 0.4 },
          at + i * 0.04,
        );
      });
    };

    scenes.forEach((scene, i) => {
      if (i > 0) {
        tl.fromTo(
          scene,
          { autoAlpha: 0, y: 24 },
          { autoAlpha: 1, y: 0, duration: 0.3 },
          i + 0.05,
        );
      }
      if (i < scenes.length - 1) {
        tl.to(scene, { autoAlpha: 0, y: -24, duration: 0.25 }, i + 0.75);
      }
    });

    allRows.forEach((row, i) => {
      const at = 1 + i * 0.03;
      tl.fromTo(
        row,
        { height: expanded[i] },
        { height: collapsed[i], duration: 0.5 },
        at,
      );
      tl.fromTo(
        extras[i] as HTMLElement,
        { height: extraHeights[i], autoAlpha: 1 },
        { height: 0, autoAlpha: 0, duration: 0.5 },
        at,
      );
    });
    hide([...rows.open, ...rows.inbox], 2);
    show(rows.open, 3);
    hide([...rows.focus, ...rows.open], 4);
    show(rows.inbox, 4.3);
    hide(rows.inbox, 5);
    show(rows.focus, 5.3);
    tl.fromTo(
      focusNext.map((n) => n.box),
      { backgroundColor: "rgba(110,231,168,0)" },
      { backgroundColor: "rgb(110,231,168)", duration: 0.2, stagger: 0.1 },
      5.55,
    );
    tl.fromTo(
      focusNext.map((n) => n.label),
      { opacity: 1 },
      { opacity: 0.4, duration: 0.2, stagger: 0.1 },
      5.55,
    );
    hide(rows.focus, 5.85);
    tl.fromTo(empty, { opacity: 0 }, { opacity: 1, duration: 0.2 }, 6);
    tl.to(board, { opacity: 0.25, duration: 0.4 }, 6.4);
    tl.to({}, { duration: 0.01 }, 7);
    timeline = tl;
  };

  build();

  // Row heights depend on text wrapping, so rebuild when the width changes.
  let width = window.innerWidth;
  let pending: number | undefined;
  const onResize = () => {
    if (window.innerWidth === width) return;
    width = window.innerWidth;
    window.clearTimeout(pending);
    pending = window.setTimeout(() => {
      const progress = timeline?.scrollTrigger?.progress ?? 0;
      timeline?.scrollTrigger?.kill(true);
      timeline?.kill();
      build();
      ScrollTrigger.refresh();
      timeline?.scrollTrigger?.scroll(
        (timeline.scrollTrigger.start ?? 0) +
          progress *
            ((timeline.scrollTrigger.end ?? 0) -
              (timeline.scrollTrigger.start ?? 0)),
      );
    }, 200);
  };
  window.addEventListener("resize", onResize);

  return () => {
    window.clearTimeout(pending);
    window.removeEventListener("resize", onResize);
    timeline?.scrollTrigger?.kill(true);
    timeline?.kill();
    gsap.set([board, empty, ...scenes], { clearProps: "all" });
    rowsEl.replaceChildren();
    titleEl.textContent = BOARD_TITLES[0] ?? "";
  };
}

// The pinned, two-column composition needs room for all six expanded notes.
// Small screens and reduced motion use the ordinary readable page instead.
gsap.matchMedia().add(
  "(min-width: 52rem) and (min-height: 48rem) and (prefers-reduced-motion: no-preference)",
  () => {
    document.documentElement.classList.add("animated");
    const stop = startTour();
    return () => {
      stop?.();
      document.documentElement.classList.remove("animated");
    };
  },
);
