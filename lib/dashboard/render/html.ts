// Same markup as the card/hero/bar helpers in lib/dashboard-runtime.ts so existing CSS applies.

export function hero(title: string, desc: string, note = ""): string {
  return `<div class="hero"><div><h2>${title}</h2><p>${desc}</p></div>${note ? `<div class="hero-note">${note}</div>` : ""}</div>`;
}

export function card(title: string, subtitle: string, body: string, tag = ""): string {
  return `<section class="card"><div class="card-head"><div><h3>${title}</h3><p>${subtitle}</p></div>${tag}</div>${body}</section>`;
}

/** Horizontal bars; each item is [label, value, right-hand text]. */
export function barRows(items: [string, number, string][]): string {
  const max = Math.max(...items.map((x) => x[1]), 1);
  return items
    .map(([name, value, text]) =>
      `<div class="driver"><span>${name}</span><div class="track"><div class="fill" style="width:${(value / max) * 100}%"></div></div><strong>${text}</strong></div>`)
    .join("");
}
