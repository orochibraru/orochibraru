// The ⌘K dialog. One JSON index for the whole site, fetched the first time the
// dialog opens and kept for the rest of the session: every guide section, every
// page, nothing to boot up and no third party to ask.
const dialog = document.getElementById("search");
const field = dialog?.querySelector("input");
const list = dialog?.querySelector("ul");
const empty = dialog?.querySelector("p");

let index = null;
let shown = [];
let active = 0;

const escape = (text) =>
  text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function search(query) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!index || !terms.length) return [];

  return index
    .map((entry) => {
      const heading = entry.t.toLowerCase();
      const context = (entry.g ?? "").toLowerCase();
      const body = entry.x.toLowerCase();

      let score = 0;
      for (const term of terms) {
        const hit = heading.includes(term) ? 8 : context.includes(term) ? 4 : body.includes(term) ? 2 : 0;
        if (!hit) return null; // every word has to land somewhere
        score += hit + (heading.startsWith(term) ? 3 : 0);
      }
      return { entry, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 24)
    .map((hit) => hit.entry);
}

function render(query) {
  shown = search(query);
  active = 0;

  list.innerHTML = shown
    .map((entry, i) => `<li>
      <a class="block px-4 py-3 ${i === 0 ? "bg-fg/5 text-acid" : ""}" href="${entry.u}">
        <span class="block text-[.95rem] font-bold tracking-[-.01em]">${escape(entry.t)}</span>
        <span class="mt-0.5 block text-[11px] tracking-[.14em] text-plasma uppercase">${escape(entry.g ?? entry.p ?? "")}</span>
        ${entry.x ? `<span class="mt-1.5 block truncate text-[.85rem] text-dim">${escape(entry.x.slice(0, 120))}</span>` : ""}
      </a>
    </li>`)
    .join("");

  empty.hidden = !query || shown.length > 0;
  if (query && !shown.length) empty.textContent = `Nothing matches “${query}”.`;
}

function highlight(next) {
  const links = [...list.querySelectorAll("a")];
  if (!links.length) return;
  active = (next + links.length) % links.length;
  links.forEach((link, i) => link.className = `block px-4 py-3 ${i === active ? "bg-fg/5 text-acid" : ""}`);
  links[active].scrollIntoView({ block: "nearest" });
}

async function open() {
  if (!dialog || dialog.open) return;
  dialog.showModal();
  field.select();

  if (!index) {
    try {
      index = await (await fetch("/search.json")).json();
    } catch {
      index = [];
    }
    render(field.value);
  }
}

if (dialog) {
  document.getElementById("search-open")?.addEventListener("click", open);

  addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      open();
    }
  });

  field.addEventListener("input", () => render(field.value));

  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") { event.preventDefault(); highlight(active + 1); }
    else if (event.key === "ArrowUp") { event.preventDefault(); highlight(active - 1); }
    else if (event.key === "Enter") {
      const link = list.querySelectorAll("a")[active];
      if (link) { event.preventDefault(); location.href = link.href; }
    }
  });

  // clicking the backdrop, which is the dialog itself outside its own box
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}
