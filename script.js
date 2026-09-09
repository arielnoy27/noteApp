(function () {
  "use strict";

  const STORAGE_KEY = "notes-app.notes";
  const THEME_KEY = "notes-app.theme";

  // Example force lists. Any note tagged "force" works the same way —
  // these just ship as ready-made examples, one per category. Every
  // capture applies to every force-tagged note in the app at once (see
  // applyForceToAllLists), so entering the same number opens up Israel
  // in Countries and Pizza in Foods simultaneously.
  const COUNTRIES = [
    "Afghanistan","Albania","Algeria","Argentina","Armenia","Australia","Austria","Azerbaijan",
    "Bahrain","Bangladesh","Belgium","Belize","Bhutan","Bolivia","Botswana","Brazil","Brunei","Bulgaria",
    "Cambodia","Cameroon","Canada","Chile","China","Colombia","Costa Rica","Croatia","Cuba","Cyprus",
    "Denmark","Ecuador","Egypt","Estonia","Ethiopia",
    "Fiji","Finland","France",
    "Georgia","Germany","Ghana","Greece","Guatemala",
    "Honduras","Hungary",
    "Iceland","India","Indonesia","Iran","Iraq","Ireland","Italy",
    "Jamaica","Japan","Jordan",
    "Kazakhstan","Kenya","Kuwait",
    "Laos","Latvia","Lebanon","Liberia","Libya","Lithuania","Luxembourg",
    "Madagascar","Malaysia","Maldives","Mali","Malta","Mexico","Monaco","Mongolia","Morocco","Myanmar",
    "Namibia","Nepal","Netherlands","New Zealand","Nicaragua","Nigeria","Norway",
    "Oman",
    "Pakistan","Panama","Paraguay","Peru","Philippines","Poland","Portugal",
    "Qatar",
    "Romania","Russia","Rwanda",
    "Samoa","Senegal","Serbia","Singapore","Slovakia","Slovenia","Somalia",
    "Israel",
  ];

  const FOODS = [
    "Sushi","Tacos","Burger","Pasta","Ramen","Curry","Falafel","Hummus","Risotto","Lasagna",
    "Ravioli","Gnocchi","Croissant","Baguette","Pretzel","Bagel","Pancake","Waffle","Omelette","Quiche",
    "Souffle","Tiramisu","Cheesecake","Brownie","Cupcake","Donut","Macaron","Gelato","Sorbet","Popcorn",
    "Nachos","Guacamole","Salsa","Burrito","Quesadilla","Enchilada","Tamale","Empanada","Ceviche","Sashimi",
    "Tempura","Teriyaki","Udon","Soba","Dumpling","Dim Sum","Spring Roll","Pad Thai","Satay","Rendang",
    "Biryani","Tandoori Chicken","Samosa","Naan","Chapati","Shawarma","Kebab","Baklava","Tabbouleh","Kibbeh",
    "Moussaka","Souvlaki","Tzatziki","Goulash","Schnitzel","Bratwurst","Sauerkraut","Fondue","Raclette","Crepe",
    "Escargot","Ratatouille","Bouillabaisse","Foie Gras","Churros","Paella","Chorizo","Gazpacho","Empanadas de Pollo","Tapas",
    "Croquette","Bruschetta","Risotto ai Funghi","Carbonara","Bolognese","Pesto Pasta","Focaccia","Panzanella","Minestrone","Osso Buco",
    "Tortellini","Panettone","Cannoli","Gelato al Pistacchio","Arancini","Caprese Salad","Prosciutto","Mozzarella Sticks","Meatballs","Pizza",
  ];

  // Every example list, driven from one place so adding another category
  // (e.g. "Movies") is just one more entry here.
  const EXAMPLE_LISTS = [
    { title: "Countries", items: COUNTRIES },
    { title: "Foods", items: FOODS },
  ];

  /** @typedef {{id:string,title:string,body:string,tags:string[],pinned:boolean,createdAt:number,updatedAt:number}} Note */

  // ---------- State ----------
  let notes = loadNotes();
  let activeId = null;
  let activeTagFilter = null;
  let searchQuery = "";
  let saveTimer = null;

  // ---------- DOM refs ----------
  const el = {
    sidebar: document.getElementById("sidebar"),
    notesList: document.getElementById("notesList"),
    searchInput: document.getElementById("searchInput"),
    tagFilter: document.getElementById("tagFilter"),
    newNoteBtn: document.getElementById("newNoteBtn"),
    emptyNewNoteBtn: document.getElementById("emptyNewNoteBtn"),
    noteCount: document.getElementById("noteCount"),
    emptyState: document.getElementById("emptyState"),
    editorContent: document.getElementById("editorContent"),
    noteTitle: document.getElementById("noteTitle"),
    noteTags: document.getElementById("noteTags"),
    noteDate: document.getElementById("noteDate"),
    noteBody: document.getElementById("noteBody"),
    deleteBtn: document.getElementById("deleteBtn"),
    pinBtn: document.getElementById("pinBtn"),
    saveStatus: document.getElementById("saveStatus"),
    themeToggle: document.getElementById("themeToggle"),
    mobileToggle: document.getElementById("mobileToggle"),
    exportBtn: document.getElementById("exportBtn"),
    importFile: document.getElementById("importFile"),
    appLogo: document.getElementById("appLogo"),
    introScreen: document.getElementById("introScreen"),
    iconPager: document.getElementById("iconPager"),
    iconTrack: document.getElementById("iconTrack"),
    app: document.getElementById("app"),
    forceNumberBtn: document.getElementById("forceNumberBtn"),
  };

  // Force-number capture state (see "Intro / icon-matrix flow" section below)
  let forceDigit1 = null;
  let forceDigit2 = null;
  let forcedNumber = null;

  // ---------- Persistence ----------
  function loadNotes() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return seedNotes();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return seedNotes();
      return parsed;
    } catch (e) {
      console.error("Failed to load notes", e);
      return [];
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      return true;
    } catch (e) {
      console.error("Failed to save notes", e);
      return false;
    }
  }

  function seedNotes() {
    const now = Date.now();
    return [
      {
        id: uid(),
        title: "Welcome to Notes",
        body:
          "<p>This is a simple, private notes app that lives entirely in your browser.</p>" +
          "<ul><li>Everything is saved automatically to this browser's local storage</li>" +
          "<li>Use the toolbar above to format text, add tags, and pin important notes</li>" +
          "<li>Nothing is sent anywhere &mdash; it's just you and your notes</li></ul>" +
          "<p>Click <b>New note</b> to get started, or edit this one.</p>",
        tags: ["welcome"],
        pinned: true,
        createdAt: now,
        updatedAt: now,
      },
      ...EXAMPLE_LISTS.map((spec) => makeListNote(spec, now)),
    ];
  }

  function numberedBody(items) {
    return items.map((name, i) => (i + 1) + ". " + name).join("\n");
  }

  function makeListNote(spec, now) {
    const body = numberedBody(spec.items);
    return {
      id: uid(),
      title: spec.title,
      body: body,
      baseline: body, // the "saved order" the logo restores to — see Force mechanism below
      tags: ["force"],
      pinned: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  // Makes sure every example list exists (even for a browser that already
  // had notes saved before this feature, or before a new category was
  // added) and is in the numbered "1. Name" format the swap mechanism
  // expects. A note left over from before numbering was added gets its
  // body replaced with the freshly numbered version — if you've hand-
  // edited one of these lists already, this overwrites those edits back
  // to the shipped example, so rename your own copy if you want to keep it.
  function ensureExampleLists() {
    let changed = false;
    EXAMPLE_LISTS.forEach((spec) => {
      const existing = notes.find((n) => n.title === spec.title);
      if (!existing) {
        notes.push(makeListNote(spec, Date.now()));
        changed = true;
        return;
      }
      const firstLine = existing.body.split("\n")[0] || "";
      if (!/^1\.\s/.test(firstLine)) {
        const body = numberedBody(spec.items);
        existing.body = body;
        existing.baseline = body;
        existing.updatedAt = Date.now();
        changed = true;
      }
    });
    if (changed) persist();
  }

  // A note saved before the "saved order" feature existed (a shipped
  // example from an older version, or a force list you'd already made
  // yourself) won't have a baseline yet. Give it one — whatever its body
  // currently is becomes its saved order going forward — so the logo has
  // something sensible to restore to the very first time it's pressed.
  function ensureForceBaselines() {
    let changed = false;
    notes.forEach((note) => {
      if (isForceList(note) && typeof note.baseline !== "string") {
        note.baseline = note.body;
        changed = true;
      }
    });
    if (changed) persist();
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  // ---------- Helpers ----------
  function stripHtml(html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return (tmp.textContent || tmp.innerText || "").trim();
  }

  function formatDate(ts) {
    const d = new Date(ts);
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) {
      return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function parseTags(str) {
    return str
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .filter((t, i, arr) => arr.indexOf(t) === i);
  }

  // The "force" tag is how a force list is identified internally, but it's
  // not something the app should ever surface — a list tagged force is
  // meant to look like any other list. visibleTags() is what every bit of
  // UI that shows tags (the sidebar filter row, the mini-tags on each note
  // in the list) should filter through instead of using note.tags/allTags
  // directly. The tag itself stays on the note underneath — it still
  // drives isForceList() and still round-trips through export/import —
  // this only ever affects what gets drawn on screen.
  function visibleTags(tags) {
    return tags.filter((t) => t !== "force");
  }

  function allTags() {
    const set = new Set();
    notes.forEach((n) => visibleTags(n.tags).forEach((t) => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  function getNote(id) {
    return notes.find((n) => n.id === id) || null;
  }

  // A "force list" is any note tagged "force": a plain, line-by-line list
  // whose last line is the item that gets forced. Its body is stored as
  // plain text with real newlines (not rich HTML) so lines can be swapped
  // reliably — see the "Force mechanism" section further down.
  function isForceList(note) {
    return !!note && note.tags.includes("force");
  }

  function sortedFilteredNotes() {
    const q = searchQuery.trim().toLowerCase();
    return notes
      .filter((n) => {
        if (activeTagFilter && !n.tags.includes(activeTagFilter)) return false;
        if (!q) return true;
        const haystack = (n.title + " " + stripHtml(n.body) + " " + n.tags.join(" ")).toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.updatedAt - a.updatedAt;
      });
  }

  // ---------- Rendering ----------
  function renderTagFilter() {
    const tags = allTags();
    el.tagFilter.innerHTML = "";
    if (tags.length === 0) return;
    tags.forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = "tag-chip" + (activeTagFilter === tag ? " active" : "");
      chip.textContent = tag;
      chip.addEventListener("click", () => {
        activeTagFilter = activeTagFilter === tag ? null : tag;
        renderTagFilter();
        renderList();
      });
      el.tagFilter.appendChild(chip);
    });
  }

  function renderList() {
    const list = sortedFilteredNotes();
    el.notesList.innerHTML = "";

    if (list.length === 0) {
      const msg = document.createElement("div");
      msg.className = "no-results";
      msg.textContent = notes.length === 0 ? "No notes yet." : "No notes match your search.";
      el.notesList.appendChild(msg);
    }

    list.forEach((note) => {
      const item = document.createElement("div");
      item.className = "note-item" + (note.id === activeId ? " active" : "");
      item.dataset.id = note.id;

      const top = document.createElement("div");
      top.className = "note-item-top";

      if (note.pinned) {
        const pin = document.createElement("span");
        pin.innerHTML =
          '<svg class="pin-dot" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 17V22M8 3L16 3L15 10L18 13H6L9 10L8 3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
        top.appendChild(pin.firstChild);
      }

      const title = document.createElement("span");
      title.className = "note-item-title";
      title.textContent = note.title || "Untitled";
      top.appendChild(title);
      item.appendChild(top);

      const snippet = document.createElement("div");
      snippet.className = "note-item-snippet";
      const text = stripHtml(note.body);
      snippet.textContent = text || "No additional text";
      item.appendChild(snippet);

      const meta = document.createElement("div");
      meta.className = "note-item-meta";

      const tagsWrap = document.createElement("div");
      tagsWrap.className = "note-item-tags";
      visibleTags(note.tags).slice(0, 2).forEach((t) => {
        const mt = document.createElement("span");
        mt.className = "mini-tag";
        mt.textContent = t;
        tagsWrap.appendChild(mt);
      });
      meta.appendChild(tagsWrap);

      const date = document.createElement("span");
      date.className = "note-item-date";
      date.textContent = formatDate(note.updatedAt);
      meta.appendChild(date);

      item.appendChild(meta);

      item.addEventListener("click", () => selectNote(note.id));
      el.notesList.appendChild(item);
    });

    el.noteCount.textContent = notes.length === 1 ? "1 note" : notes.length + " notes";
  }

  function renderEditor() {
    const note = getNote(activeId);
    if (!note) {
      el.emptyState.style.display = "flex";
      el.editorContent.style.display = "none";
      return;
    }
    el.emptyState.style.display = "none";
    el.editorContent.style.display = "flex";

    el.noteTitle.value = note.title;
    el.noteTags.value = note.tags.join(", ");
    if (isForceList(note)) {
      el.noteBody.innerText = note.body; // plain text, preserves lines
    } else {
      el.noteBody.innerHTML = note.body;
    }
    el.noteDate.textContent = "Edited " + formatDate(note.updatedAt);
    el.pinBtn.classList.toggle("active", note.pinned);
    setSaveStatus("Saved");
  }

  function setSaveStatus(text) {
    el.saveStatus.textContent = text;
  }

  // ---------- Force mechanism ----------
  //
  // Every force list has TWO pieces of text: note.body (what's currently
  // showing — possibly with a force swap applied) and note.baseline (the
  // "saved order" the logo resets back to). Only a deliberate edit you
  // make and save moves baseline forward — see saveActiveFromInputs below,
  // where isForceList notes copy their freshly-saved body into baseline.
  // A force swap only ever touches body, never baseline, so forcing a
  // number is always a temporary, reversible detour from whatever you
  // last saved, no matter how many times you do it.
  //
  // Swaps the NAME at position N (1-indexed) with the name at the last
  // position of the list, leaving each line's own leading "N. " number
  // exactly where it is. So forcing 57 makes line 57 read "57. Israel"
  // (not "100. Israel") and line 100 read "100. <whatever used to be at
  // 57>". A line with no leading number is swapped whole, so this still
  // works fine on a plain, unnumbered force list.
  function splitNumberedLine(line) {
    const m = line.match(/^(\d+\.\s*)(.*)$/);
    return m ? { prefix: m[1], name: m[2] } : { prefix: "", name: line };
  }

  function swapForce(lines, N) {
    const arr = lines.slice();
    const lastIdx = arr.length - 1;
    const targetIdx = N - 1;
    if (targetIdx < 0 || targetIdx >= arr.length || targetIdx === lastIdx) {
      return arr; // out of range, or the number named the force slot itself
    }
    const a = splitNumberedLine(arr[targetIdx]);
    const b = splitNumberedLine(arr[lastIdx]);
    arr[targetIdx] = a.prefix + b.name;
    arr[lastIdx] = b.prefix + a.name;
    return arr;
  }

  // Runs the instant a number is captured (both digits entered). Applies
  // the same swap to EVERY force-tagged note at once, working off each
  // note's current body (its saved order, or a previous unsaved swap) —
  // one capture forces the named position across the whole app, so
  // entering 57 opens up Israel in Countries and whatever's at Foods #57
  // at the same time, each list swapping independently against its own
  // last position. Never touches baseline.
  function applyForceToAllLists(N) {
    let changed = false;
    notes.forEach((note) => {
      if (!isForceList(note)) return;
      const lines = note.body.split("\n");
      const swapped = swapForce(lines, N);
      const newBody = swapped.join("\n");
      if (newBody !== note.body) {
        note.body = newBody;
        note.updatedAt = Date.now();
        changed = true;
      }
    });
    if (changed) persist();
    renderList();
    if (activeId) renderEditor();
  }

  // Throws away whatever's currently showing in every force list and
  // reloads its saved order — a full reset rather than a targeted
  // un-swap, so it's correct no matter what happened since the last save
  // (one force, several, or a hand-edit that never got its own save).
  // Safe to call even when nothing changed.
  function restoreForceListsToBaseline() {
    let changed = false;
    notes.forEach((note) => {
      if (!isForceList(note) || typeof note.baseline !== "string") return;
      if (note.body !== note.baseline) {
        note.body = note.baseline;
        note.updatedAt = Date.now();
        changed = true;
      }
    });
    if (changed) persist();
    renderList();
    if (activeId) renderEditor();
  }

  // ---------- Actions ----------
  function selectNote(id) {
    activeId = id;
    renderList();
    renderEditor();
    if (window.innerWidth <= 760) closeMobileSidebar();
  }

  function createNote() {
    const now = Date.now();
    const note = {
      id: uid(),
      title: "",
      body: "",
      tags: activeTagFilter ? [activeTagFilter] : [],
      pinned: false,
      createdAt: now,
      updatedAt: now,
    };
    notes.unshift(note);
    persist();
    activeId = note.id;
    renderTagFilter();
    renderList();
    renderEditor();
    el.noteTitle.focus();
    if (window.innerWidth <= 760) closeMobileSidebar();
  }

  function deleteActiveNote() {
    const note = getNote(activeId);
    if (!note) return;
    const label = note.title || "this note";
    if (!window.confirm('Delete "' + label + '"? This cannot be undone.')) return;
    notes = notes.filter((n) => n.id !== activeId);
    persist();
    activeId = null;
    renderTagFilter();
    renderList();
    renderEditor();
  }

  function togglePinActive() {
    const note = getNote(activeId);
    if (!note) return;
    note.pinned = !note.pinned;
    note.updatedAt = Date.now();
    persist();
    renderList();
    renderEditor();
  }

  function saveActiveFromInputs() {
    const note = getNote(activeId);
    if (!note) return;
    note.title = el.noteTitle.value;
    note.tags = parseTags(el.noteTags.value);
    note.body = isForceList(note) ? el.noteBody.innerText : el.noteBody.innerHTML;
    // This path only ever runs from you actually typing in the editor (see
    // the "input" listeners in init()) — a force swap sets note.body
    // directly and never comes through here. So the moment a force list
    // autosaves, whatever you just typed becomes its new saved order: the
    // logo will restore to exactly this from now on, swap or no swap.
    if (isForceList(note)) {
      note.baseline = note.body;
    }
    note.updatedAt = Date.now();
    setSaveStatus("Saving...");
    persist();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => setSaveStatus("Saved"), 300);
    renderTagFilter();
    renderList();
    el.noteDate.textContent = "Edited " + formatDate(note.updatedAt);
  }

  const debouncedSave = debounce(saveActiveFromInputs, 400);

  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // ---------- Theme ----------
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = saved || (prefersDark ? "dark" : "light");
    applyTheme(theme);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    // Keep the Android status bar in sync with the app's own background
    // while it's actually open — see setThemeColor()/appBgColor() below.
    // Has no effect while the phone-screenshot pager is showing, since the
    // status bar there needs to stay black to match the blacked-out strip
    // baked into icons1/2/3.png, not the app's theme.
    if (el.app && !el.app.hidden) setThemeColor(appBgColor());
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    applyTheme(current === "dark" ? "light" : "dark");
  }

  // ---------- Status bar color ----------
  // The intro screen and the phone-screenshot pager both need a plain black
  // status bar: icons1/2/3.png each have their real status-bar strip
  // deliberately blacked out (so the phone's REAL, live clock/battery shows
  // through instead of a frozen fake one), and that only reads correctly
  // against a black system status bar. Once the actual notes app is open,
  // the status bar should instead match whatever the app's own background
  // is, light or dark, like a normal installed app.
  const THEME_COLOR_HOME = "#000000";

  function appBgColor() {
    const theme = document.documentElement.getAttribute("data-theme");
    return theme === "dark" ? "#1e1c1a" : "#f5f4f2";
  }

  function setThemeColor(hex) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", hex);
  }

  // ---------- Mobile sidebar ----------
  function openMobileSidebar() {
    el.sidebar.classList.add("open");
  }
  function closeMobileSidebar() {
    el.sidebar.classList.remove("open");
  }
  function toggleMobileSidebar() {
    el.sidebar.classList.toggle("open");
  }

  // ---------- Export / Import ----------
  function exportNotes() {
    const blob = new Blob([JSON.stringify(notes, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = "notes-export-" + date + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importNotes(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed)) throw new Error("Invalid format");
        const cleaned = parsed
          .filter((n) => n && typeof n === "object")
          .map((n) => {
            const note = {
              id: typeof n.id === "string" ? n.id : uid(),
              title: typeof n.title === "string" ? n.title : "",
              body: typeof n.body === "string" ? n.body : "",
              tags: Array.isArray(n.tags) ? n.tags.filter((t) => typeof t === "string") : [],
              pinned: !!n.pinned,
              createdAt: typeof n.createdAt === "number" ? n.createdAt : Date.now(),
              updatedAt: typeof n.updatedAt === "number" ? n.updatedAt : Date.now(),
            };
            // Carry over a saved order from an export that has one; a
            // force list without one picks one up via ensureForceBaselines
            // right after import (its current body, same as a fresh note).
            if (typeof n.baseline === "string") note.baseline = n.baseline;
            return note;
          });
        // Avoid id collisions with existing notes
        const existingIds = new Set(notes.map((n) => n.id));
        cleaned.forEach((n) => {
          if (existingIds.has(n.id)) n.id = uid();
        });
        notes = notes.concat(cleaned);
        ensureForceBaselines();
        persist();
        renderTagFilter();
        renderList();
        alert("Imported " + cleaned.length + " note(s).");
      } catch (e) {
        alert("Could not import file: " + e.message);
      }
    };
    reader.readAsText(file);
  }

  // ---------- Formatting toolbar ----------
  function initToolbar() {
    document.querySelectorAll(".tool-btn[data-cmd]").forEach((btn) => {
      btn.addEventListener("click", () => {
        el.noteBody.focus();
        document.execCommand(btn.dataset.cmd, false, null);
        debouncedSave();
        updateToolbarState();
      });
    });
    el.noteBody.addEventListener("keyup", updateToolbarState);
    el.noteBody.addEventListener("mouseup", updateToolbarState);
  }

  function updateToolbarState() {
    document.querySelectorAll(".tool-btn[data-cmd]").forEach((btn) => {
      try {
        const active = document.queryCommandState(btn.dataset.cmd);
        btn.classList.toggle("active", !!active);
      } catch (e) {
        /* ignore unsupported commands */
      }
    });
  }

  // ---------- Intro / icon-matrix flow ----------
  //
  // Screen order: intro -> iconPager (page 1 -> page 2 -> page 3) -> app.
  // Pages 1-3 are the real phone-screenshot images (icons-only, transparent,
  // sliding over the stationary wallpaper — see the .icon-pager-bg comment
  // above in style.css), full screen, with no added UI — no numbers are
  // ever shown. Pages 1 and 2 each have ten invisible zones sitting over
  // specific app icons (see the data-digit attributes in index.html); which
  // icon is which digit is documented above each page's markup. Page 3 has
  // just one zone, over its "Notes" icon, marked data-action="open-app"
  // instead of a digit — tapping it is what actually opens the app.
  //
  // The swipe gesture is a single natural motion that visually TRACKS THE
  // FINGER the whole way (like a real home-screen swipe), not just a
  // before/after cut: touch down, drag left, and the image slides with the
  // pointer in real time; release past the threshold and it eases the rest
  // of the way, release short of it and it eases back. Wherever the touch
  // started is the digit that gets pressed, captured the instant the drag
  // commits:
  //   - press+drag left on page 1, past threshold -> records digit 1,
  //     slides the rest of the way into page 2.
  //   - press+drag left on page 2, past threshold -> records digit 2,
  //     completes the two-digit number, applies the force to every force
  //     list immediately, and slides the rest of the way into page 3.
  // A plain tap on a digit zone (no drag) also silently records its digit
  // without moving on — handy for settling on an icon before committing to
  // the swipe.
  //
  // Page 3 doesn't capture anything — by the time you're on it, the number
  // is already forced. It's just a real-looking last home screen, and a
  // plain TAP (not a swipe) on its Notes icon is what opens the app, the
  // same way tapping any app icon would on a real phone.
  //
  // Dragging right backs out one step, the same live-tracking way, and
  // every step back un-does exactly the capture tied to the page you're
  // leaving: page 1 -> intro cancels the whole capture (nothing's been
  // forced yet, so there's nothing to revert); page 2 -> page 1 drops both
  // digits, ready to redo them from scratch; page 3 -> page 2 reverts the
  // force that was just applied back to every list's saved order and drops
  // digit 2 only, keeping digit 1 so you don't have to redo that part.
  //
  // Implementation: #iconPager is the fixed, clipped viewport; #iconTrack
  // is 3x its width and holds all three slides side by side — sliding it
  // moves between pages. Dragging right off page 1 instead moves
  // #iconPager itself, sliding the whole pager off to reveal the intro
  // screen underneath it. Opening the app is different on purpose — see
  // openApp() below — it pops/grows out of the tapped icon rather than
  // sliding, the way apps actually open on a real phone.

  const SCREENS = ["introScreen", "iconPager", "app"];

  function showScreen(name) {
    SCREENS.forEach((key) => {
      el[key].hidden = key !== name;
    });
  }

  const PAGE_COUNT = 3;

  // Native pixel size of the source phone screenshots (icons1/2/3.png and
  // the wallpaper), used by layoutTapZones() below to work out exactly how
  // background-size:cover crops them on any given screen.
  const IMG_W = 1080;
  const IMG_H = 2340;

  // Each tap-zone's position was originally authored as a simple percentage
  // of the source screenshot (data-fx-left/top/width/height, added in
  // index.html) — that only lined up with the actual icon underneath it
  // while the frame was locked to the screenshot's own 1080:2340 aspect
  // ratio (background-size:contain, letterboxed). Now that .icon-pager-bg
  // and .icon-matrix-frame fill the screen edge-to-edge with
  // background-size:cover instead (so there's no black letterboxing on a
  // phone with a different aspect ratio), part of the image is cropped off
  // — so each zone's on-screen position has to be recomputed to match
  // wherever cover-fit actually placed its icon. Mirrors the same
  // scale/crop math the browser itself uses for background-size:cover.
  function layoutTapZones() {
    const frameW = window.innerWidth;
    const frameH = window.innerHeight;
    if (!frameW || !frameH) return;

    const scale = Math.max(frameW / IMG_W, frameH / IMG_H);
    const offsetX = (IMG_W * scale - frameW) / 2;
    const offsetY = (IMG_H * scale - frameH) / 2;

    document.querySelectorAll(".tap-zone[data-fx-left]").forEach((zone) => {
      const leftPct = parseFloat(zone.dataset.fxLeft);
      const topPct = parseFloat(zone.dataset.fxTop);
      const widthPct = parseFloat(zone.dataset.fxWidth);
      const heightPct = parseFloat(zone.dataset.fxHeight);

      const screenX = (leftPct / 100) * IMG_W * scale - offsetX;
      const screenY = (topPct / 100) * IMG_H * scale - offsetY;
      const screenW = (widthPct / 100) * IMG_W * scale;
      const screenH = (heightPct / 100) * IMG_H * scale;

      zone.style.left = screenX + "px";
      zone.style.top = screenY + "px";
      zone.style.width = screenW + "px";
      zone.style.height = screenH + "px";
    });
  }

  // Which slide the track is currently resting on, when no drag is live —
  // 0 = page 1, 1 = page 2, 2 = page 3.
  let pagerIndex = 0;

  // The track is PAGE_COUNT times the viewport width, each slide an equal
  // share of it, so page i's resting position is always -(i / PAGE_COUNT).
  function trackRestingPercent(index) {
    return (-(index * 100) / PAGE_COUNT).toFixed(4) + "%";
  }

  function setPagerDragging(on) {
    el.iconTrack.classList.toggle("dragging", on);
    el.iconPager.classList.toggle("dragging", on);
  }

  // Snaps both the track and the pager back to their resting transforms
  // for whatever pagerIndex currently is, with no visible animation (used
  // right after the pager is hidden, so it opens fresh next time).
  function resetPagerVisual() {
    setPagerDragging(true);
    el.iconTrack.style.transform = "";
    el.iconPager.style.transform = "";
    void el.iconPager.offsetWidth; // force reflow so the next transition is clean
    setPagerDragging(false);
    pagerIndex = 0;
  }

  function onceTransitionEnd(node, cb) {
    const handler = (e) => {
      if (e.target !== node || e.propertyName !== "transform") return;
      node.removeEventListener("transitionend", handler);
      cb();
    };
    node.addEventListener("transitionend", handler);
  }

  function goToIntro() {
    restoreForceListsToBaseline();
    forceDigit1 = null;
    forceDigit2 = null;
    forcedNumber = null;
    resetPagerVisual();
    showScreen("introScreen");
    setThemeColor(THEME_COLOR_HOME);
  }

  function goToIconPager() {
    forceDigit1 = null;
    forceDigit2 = null;
    resetPagerVisual();
    showScreen("iconPager");
  }

  function recordDigit1(digit) {
    forceDigit1 = digit;
    if (navigator.vibrate) navigator.vibrate(15);
  }

  function recordDigit2(digit) {
    forceDigit2 = digit;
    if (navigator.vibrate) navigator.vibrate(15);
  }

  // Mimics how a real phone actually opens an app: the icon you tapped
  // pops out and grows into the app, rather than the home screen sliding
  // away. #app sits in its own fixed, higher-stacked layer (see .app in
  // style.css) directly above #iconPager; transform-origin is set to the
  // tapped icon's live on-screen center, #app starts pinned down to a tiny,
  // invisible scale at that exact point (the .app-launch-start class), and
  // removing that class lets the scale/opacity transition play — so #app
  // visibly expands outward from the icon until it covers the screen,
  // while the home screen underneath just sits there unchanged the whole
  // time (nothing about it needs to move or fade).
  function openApp(originEl) {
    setThemeColor(appBgColor());
    const rect = (originEl || el.iconPager).getBoundingClientRect();
    const originX = ((rect.left + rect.width / 2) / window.innerWidth) * 100 + "%";
    const originY = ((rect.top + rect.height / 2) / window.innerHeight) * 100 + "%";
    el.app.style.transformOrigin = originX + " " + originY;

    el.app.classList.add("app-launch-start");
    el.app.hidden = false;
    void el.app.offsetWidth; // force layout so removing the class below actually transitions
    requestAnimationFrame(() => {
      el.app.classList.remove("app-launch-start");
    });

    onceTransitionEnd(el.app, () => {
      el.iconPager.hidden = true;
      resetPagerVisual();
    });
  }

  // Drag/swipe tuning: LOCK_SLOP is how far the pointer has to move before
  // a gesture commits to being a horizontal drag at all (versus a plain
  // tap, or an incidental vertical wobble); SWIPE_THRESHOLD is how far a
  // committed drag has to travel to finish the transition instead of
  // springing back.
  const LOCK_SLOP = 8;
  const SWIPE_THRESHOLD = 60;
  const TAP_SLOP = 12;

  let dragTracking = false;
  let dragLocked = false;
  let dragMode = null; // 'toNext' | 'toPrev' | 'toIntro' | 'ignore'
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartTarget = null;

  function snapToResting() {
    el.iconTrack.style.transform = "translateX(" + trackRestingPercent(pagerIndex) + ")";
    el.iconPager.style.transform = "translateX(0px)";
  }

  function initPager() {
    layoutTapZones();
    let resizeRaf = null;
    window.addEventListener("resize", () => {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null;
        layoutTapZones();
      });
    });

    el.iconPager.addEventListener("pointerdown", (e) => {
      dragTracking = true;
      dragLocked = false;
      dragMode = null;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragStartTarget = e.target.closest(".tap-zone");
      // Capture the pointer to the pager itself so move/up keep targeting
      // it even if the drag carries the pointer outside the pager's own
      // bounds (e.g. a swipe that starts near the screen edge, like the
      // digit-0 zone, and crosses past x=0) — without this, a pointer that
      // strays outside the element can silently stop delivering pointerup,
      // leaving the gesture stuck mid-drag with nothing ever committing.
      if (el.iconPager.setPointerCapture) {
        try { el.iconPager.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }
      setPagerDragging(true);
    });

    el.iconPager.addEventListener("pointermove", (e) => {
      if (!dragTracking) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;

      if (!dragLocked) {
        if (Math.abs(dx) < LOCK_SLOP && Math.abs(dy) < LOCK_SLOP) return;
        dragLocked = true;
        if (Math.abs(dx) <= Math.abs(dy)) {
          dragMode = "ignore";
        } else if (pagerIndex === 0) {
          dragMode = dx < 0 ? "toNext" : "toIntro";
          if (dragMode === "toIntro") el.introScreen.hidden = false;
        } else if (pagerIndex === PAGE_COUNT - 1) {
          // Last page: nothing beyond it to swipe into.
          dragMode = dx > 0 ? "toPrev" : "ignore";
        } else {
          dragMode = dx < 0 ? "toNext" : "toPrev";
        }
      }

      if (dragMode === "toNext" || dragMode === "toPrev") {
        el.iconTrack.style.transform = "translateX(calc(" + trackRestingPercent(pagerIndex) + " + " + dx + "px))";
      } else if (dragMode === "toIntro") {
        el.iconPager.style.transform = "translateX(" + dx + "px)";
      }
    });

    el.iconPager.addEventListener("pointerup", (e) => {
      if (!dragTracking) return;
      dragTracking = false;
      setPagerDragging(false);
      // Explicitly release rather than relying on the implicit release a
      // pointerup normally triggers — back-to-back gestures fired in very
      // quick succession (no natural pause between release and the next
      // press) can otherwise race with that implicit release and turn the
      // next gesture's pointerdown into a spurious pointercancel instead of
      // a normal drag.
      if (el.iconPager.releasePointerCapture && el.iconPager.hasPointerCapture && el.iconPager.hasPointerCapture(e.pointerId)) {
        try { el.iconPager.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }

      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      const dist = Math.hypot(dx, dy);

      if (!dragLocked || dragMode === "ignore") {
        if (dist <= TAP_SLOP && dragStartTarget) {
          if (pagerIndex === 0) {
            recordDigit1(dragStartTarget.dataset.digit);
          } else if (pagerIndex === 1) {
            recordDigit2(dragStartTarget.dataset.digit);
          } else if (
            pagerIndex === 2 &&
            dragStartTarget.dataset.action === "open-app" &&
            forceDigit1 != null &&
            forceDigit2 != null
          ) {
            openApp(dragStartTarget);
            return;
          }
        }
        snapToResting();
        return;
      }

      const committed = Math.abs(dx) >= SWIPE_THRESHOLD;

      if (dragMode === "toNext" && pagerIndex === 0) {
        // page 1 -> page 2: digit 1 is optional (a plain tap earlier may
        // already have recorded it), the page transition always commits.
        if (committed && dragStartTarget) recordDigit1(dragStartTarget.dataset.digit);
        if (committed) pagerIndex = 1;
        el.iconTrack.style.transform = "translateX(" + trackRestingPercent(pagerIndex) + ")";
      } else if (dragMode === "toNext" && pagerIndex === 1) {
        // page 2 -> page 3: gated on having BOTH digits — this is where the
        // force actually gets applied, the instant digit 2 is captured.
        const digit2 = dragStartTarget ? dragStartTarget.dataset.digit : forceDigit2;
        if (committed && digit2 != null && forceDigit1 != null) {
          recordDigit2(digit2);
          forcedNumber = parseInt(String(forceDigit1) + String(forceDigit2), 10);
          applyForceToAllLists(forcedNumber);
          pagerIndex = 2;
        }
        el.iconTrack.style.transform = "translateX(" + trackRestingPercent(pagerIndex) + ")";
      } else if (dragMode === "toPrev" && pagerIndex === 1) {
        // page 2 -> page 1: full restart, same as before.
        if (committed) {
          pagerIndex = 0;
          forceDigit1 = null;
          forceDigit2 = null;
        }
        el.iconTrack.style.transform = "translateX(" + trackRestingPercent(pagerIndex) + ")";
      } else if (dragMode === "toPrev" && pagerIndex === 2) {
        // page 3 -> page 2: revert the swap that was just applied and drop
        // digit 2 only — digit 1 stays captured, ready to redo just page 2.
        if (committed) {
          restoreForceListsToBaseline();
          forceDigit2 = null;
          pagerIndex = 1;
        }
        el.iconTrack.style.transform = "translateX(" + trackRestingPercent(pagerIndex) + ")";
      } else if (dragMode === "toIntro") {
        if (committed) {
          el.iconPager.style.transform = "translateX(100vw)";
          onceTransitionEnd(el.iconPager, () => {
            restoreForceListsToBaseline();
            forceDigit1 = null;
            forceDigit2 = null;
            forcedNumber = null;
            el.iconPager.hidden = true;
            resetPagerVisual();
          });
        } else {
          el.introScreen.hidden = true;
          el.iconPager.style.transform = "translateX(0px)";
        }
      }
    });

    el.iconPager.addEventListener("pointercancel", () => {
      if (!dragTracking) return;
      dragTracking = false;
      setPagerDragging(false);
      el.introScreen.hidden = true;
      el.app.hidden = true;
      snapToResting();
    });
  }

  function initIntro() {
    el.forceNumberBtn.addEventListener("click", goToIconPager);
    initPager();
    // Note page logo -> back to the intro page, resetting the captured number.
    el.appLogo.addEventListener("click", goToIntro);
  }

  // ---------- Keyboard shortcuts ----------
  function initShortcuts() {
    document.addEventListener("keydown", (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "n") {
        e.preventDefault();
        createNote();
      } else if (mod && e.key.toLowerCase() === "f") {
        e.preventDefault();
        el.searchInput.focus();
      }
    });
  }

  // ---------- Wire up events ----------
  function init() {
    initTheme();
    ensureExampleLists();
    ensureForceBaselines();

    el.newNoteBtn.addEventListener("click", createNote);
    el.emptyNewNoteBtn.addEventListener("click", createNote);
    el.deleteBtn.addEventListener("click", deleteActiveNote);
    el.pinBtn.addEventListener("click", togglePinActive);

    el.noteTitle.addEventListener("input", debouncedSave);
    el.noteTags.addEventListener("input", debouncedSave);
    el.noteBody.addEventListener("input", debouncedSave);

    el.searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      renderList();
    });

    el.themeToggle.addEventListener("click", toggleTheme);
    el.mobileToggle.addEventListener("click", toggleMobileSidebar);

    el.exportBtn.addEventListener("click", exportNotes);
    el.importFile.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) importNotes(file);
      e.target.value = "";
    });

    document.addEventListener("click", (e) => {
      if (
        window.innerWidth <= 760 &&
        el.sidebar.classList.contains("open") &&
        !el.sidebar.contains(e.target) &&
        e.target !== el.mobileToggle &&
        !el.mobileToggle.contains(e.target)
      ) {
        closeMobileSidebar();
      }
    });

    initToolbar();
    initShortcuts();
    initIntro();

    renderTagFilter();
    renderList();
    renderEditor();

    persist(); // ensure seeded notes are saved on first run
  }

  document.addEventListener("DOMContentLoaded", init);

  // ---------- PWA: service worker ----------
  // Registers the offline app-shell cache (see sw.js). Only works when the
  // page is served over HTTPS or from localhost — browsers refuse to
  // register a service worker on a plain http:// origin (a file:// page,
  // opened directly, doesn't support service workers at all, so this is a
  // silent no-op there, same as any unsupported browser).
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {
        /* offline support just won't be available this run — not fatal */
      });
    });
  }
})();
