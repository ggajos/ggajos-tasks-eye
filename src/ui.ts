import { setIcon } from "obsidian";
import { formatContextLabel } from "./context";

export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

export function button(
  className: string,
  title: string,
  onClick: () => void,
  text?: string,
): HTMLButtonElement {
  const btn = element("button", className, text);
  btn.type = "button";
  btn.title = title;
  btn.setAttribute("aria-label", title);
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    onClick();
  });
  return btn;
}

export function unwrapSingleParagraph(el: HTMLElement): void {
  const child = el.firstElementChild;
  if (child?.tagName !== "P" || child.nextElementSibling) return;

  while (child.firstChild) el.insertBefore(child.firstChild, child);
  child.remove();
}

export function contextFilterControl(
  contexts: readonly string[],
  activeContext: string,
  onChange: (context: string) => void,
): HTMLElement {
  const control = element("div", "eye-context-filter");
  const icon = element("span", "eye-context-filter-icon");
  icon.setAttribute("aria-hidden", "true");
  setIcon(icon, "list-filter");
  control.appendChild(icon);

  const select = element("select", "eye-context-select");
  select.setAttribute("aria-label", "Filter by context");
  select.appendChild(new Option("All", "*"));
  for (const context of contexts) {
    select.appendChild(new Option(formatContextLabel(context), context));
  }
  select.value = activeContext;
  select.addEventListener("change", () => onChange(select.value));
  control.appendChild(select);

  return control;
}
