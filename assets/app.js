const $ = (id) => document.getElementById(id);

// API Base — same domain now
const API_BASE = "/api/";

let authMode = "login";
let searchMode = "reference";
let currentUser = null;
let currentPassage = null;
let currentDisplayText = "";
let currentLanguage = "en";
let favorites = [];
let historyItems = [];
let toastTimer;

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3500);
}

// Updated API function — uses API_BASE and proper credentials
async function api(url, options = {}) {
  const fullUrl = API_BASE + url.replace(/^\/+/, "");
  const response = await fetch(fullUrl, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    throw new Error(data.error || "Request failed. Please try again.");
  }
  return data;
}

function showAuth() {
  $("authScreen").classList.remove("hidden");
  $("appScreen").classList.add("hidden");
}

function showApp(user) {
  currentUser = user;
  $("authScreen").classList.add("hidden");
  $("appScreen").classList.remove("hidden");
  $("userEmail").textContent = user.email;
  $("userInitial").textContent = (user.email[0] || "U").toUpperCase();
  loadLibrary();
}

function setAuthMode(mode) {
  authMode = mode;
  const signup = mode === "signup";
  $("authEyebrow").textContent = signup ? "START YOUR JOURNEY" : "WELCOME BACK";
  $("authTitle").textContent = signup ? "Create your account" : "Sign in to your account";
  $("authDesc").textContent = signup
    ? "Create an account to save verses and track your reading."
    : "Your saved verses and reading history are waiting.";
  $("authSubmit").textContent = signup ? "Create account" : "Sign in";
  $("authToggleText").textContent = signup ? "Already have an account?" : "New here?";
  $("authToggle").textContent = signup ? "Sign in" : "Create an account";
  $("authPassword").autocomplete = signup ? "new-password" : "current-password";
  $("authError").textContent = "";
}

$("authToggle").addEventListener("click", () =>
  setAuthMode(authMode === "login" ? "signup" : "login")
);

$("authForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("authSubmit").disabled = true;
  $("authError").textContent = "";
  try {
    const data = await api(`auth.php?action=${authMode}`, {
      method: "POST",
      body: JSON.stringify({
        email: $("authEmail").value.trim(),
        password: $("authPassword").value
      })
    });
    if (data.user) {
      showApp(data.user);
      toast(authMode === "signup" ? "Account created. Welcome!" : "Welcome back!");
    }
  } catch (error) {
    $("authError").textContent = error.message;
  } finally {
    $("authSubmit").disabled = false;
  }
});

async function checkSession() {
  try {
    const data = await api("auth.php?action=me");
    if (data.user) showApp(data.user);
    else showAuth();
  } catch {
    showAuth();
  }
}

$("logoutButton").addEventListener("click", async () => {
  try {
    await api("auth.php?action=logout", { method: "POST", body: "{}" });
  } catch (error) {
    toast(error.message);
  }
  currentUser = null;
  favorites = [];
  historyItems = [];
  currentPassage = null;
  showAuth();
  setAuthMode("login");
});

$("referenceTab").addEventListener("click", () => setSearchMode("reference"));
$("keywordTab").addEventListener("click", () => setSearchMode("keyword"));

function setSearchMode(mode) {
  searchMode = mode;
  $("referenceTab").classList.toggle("selected", mode === "reference");
  $("keywordTab").classList.toggle("selected", mode === "keyword");
  $("searchQuery").placeholder =
    mode === "reference" ? "Try John 3:16 or Psalm 23" : "Try faith, love, hope…";
}

$("clearSearch").addEventListener("click", () => {
  $("searchQuery").value = "";
  $("searchQuery").focus();
});

$("searchForm").addEventListener("submit", (e) => {
  e.preventDefault();
  searchBible($("searchQuery").value);
});

document.querySelectorAll("[data-ref]").forEach((button) =>
  button.addEventListener("click", () => {
    setSearchMode("reference");
    $("searchQuery").value = button.dataset.ref;
    searchBible(button.dataset.ref);
  })
);

$("startPsalm").addEventListener("click", () => {
  setSearchMode("reference");
  $("searchQuery").value = "Psalm 23";
  searchBible("Psalm 23");
});

$("goFavorites").addEventListener("click", () => showTab("favorites"));

function message(text, type = "success") {
  $("resultMessage").innerHTML = "";
  const box = document.createElement("div");
  box.className = `notice ${type}`;
  const span = document.createElement("span");
  span.textContent = text;
  const close = document.createElement("button");
  close.textContent = "×";
  close.type = "button";
  close.onclick = () => box.remove();
  box.append(span, close);
  $("resultMessage").append(box);
}

function hideReadResults() {
  $("passageCard").classList.add("hidden");
  $("keywordResults").classList.add("hidden");
  $("starterGrid").classList.add("hidden");
}

async function searchBible(query, fromHistory = false) {
  query = (query || "").trim();
  if (!query) return;
  hideReadResults();
  $("resultMessage").innerHTML = "";
  $("searchButton").disabled = true;
  $("searchButton").textContent = "Searching…";
  try {
    if (searchMode === "reference") {
      const response = await fetch(
        `https://bible-api.com/${encodeURIComponent(query.replace(/\s+/g, "+"))}?translation=web`
      );
      const data = await response.json();
      if (!response.ok || data.error)
        throw new Error(
          data.error || "Passage not found. Try John 3:16 or Psalm 23."
        );
      currentPassage = {
        reference: data.reference || query,
        text: data.text || "",
        translation: data.translation_name || "World English Bible",
        verses: data.verses || []
      };
      currentLanguage = "en";
      currentDisplayText = currentPassage.text;
      renderPassage();
      $("passageCard").classList.remove("hidden");
      await recordHistory(currentPassage.reference, currentPassage.text, "reference");
    } else {
      const data = await api(`search.php?q=${encodeURIComponent(query)}`);
      renderKeywordResults(query, data.results || []);
      await recordHistory(query, `${(data.results || []).length} keyword results`, "keyword");
    }
  } catch (error) {
    $("starterGrid").classList.remove("hidden");
    message(error.message || "Search failed.", "error");
  } finally {
    $("searchButton").disabled = false;
    $("searchButton").textContent = "⌕ Search";
  }
}

async function recordHistory(query, preview, type) {
  try {
    await api("history.php", {
      method: "POST",
      body: JSON.stringify({ query, preview, type })
    });
    await loadLibrary();
  } catch (error) {
    console.warn("Could not save search history:", error.message);
  }
}

function renderPassage() {
  $("passageReference").textContent = currentPassage.reference;
  $("passageTranslation").textContent = currentPassage.translation;
  $("passageText").textContent = currentDisplayText;
  $("englishButton").classList.toggle("active", currentLanguage === "en");
  $("tagalogButton").classList.toggle("active", currentLanguage === "tl");
  $("saveCurrent").classList.toggle(
    "saved",
    favorites.some((f) => f.reference === currentPassage.reference)
  );
  $("saveCurrent").textContent = favorites.some(
    (f) => f.reference === currentPassage.reference
  )
    ? "♥ Saved"
    : "♡ Save verse";
  $("translationNotice").classList.add("hidden");
  $("translationNotice").textContent = "";
  $("verseList").innerHTML = "";
  if (currentPassage.verses.length > 1) {
    currentPassage.verses.forEach((v) => {
      const row = document.createElement("div");
      row.className = "verse-line";
      const num = document.createElement("b");
      num.textContent = v.verse;
      const text = document.createElement("p");
      text.textContent = v.text;
      row.append(num, text);
      $("verseList").append(row);
    });
  }
}

$("saveCurrent").addEventListener("click", async () => {
  if (!currentPassage) return;
  const existing = favorites.find(
    (f) => f.reference === currentPassage.reference
  );
  try {
    if (existing)
      await api(`favorites.php?id=${encodeURIComponent(existing.id)}`, {
        method: "DELETE",
        body: "{}"
      });
    else
      await api("favorites.php", {
        method: "POST",
        body: JSON.stringify({
          reference: currentPassage.reference,
          verse_text: currentPassage.text,
          translation: "WEB"
        })
      });
    await loadLibrary();
    renderPassage();
    toast(existing ? "Removed from saved verses." : "Verse saved.");
  } catch (error) {
    message(error.message, "error");
  }
});

$("englishButton").addEventListener("click", () => {
  if (!currentPassage) return;
  currentLanguage = "en";
  currentDisplayText = currentPassage.text;
  renderPassage();
});

$("tagalogButton").addEventListener("click", async () => {
  if (!currentPassage) return;
  currentLanguage = "tl";
  $("tagalogButton").classList.add("active");
  $("translationNotice").classList.remove("hidden");
  $("translationNotice").textContent =
    "Translating to Tagalog… This is machine translation, not an official Tagalog Bible edition.";
  try {
    const data = await api("translate.php", {
      method: "POST",
      body: JSON.stringify({ text: currentPassage.text })
    });
    currentDisplayText = data.translation;
    $("passageText").textContent = currentDisplayText;
    $("translationNotice").textContent =
      "Machine-translated Tagalog; not an official Bible edition. Wording may be inaccurate.";
  } catch (error) {
    $("translationNotice").textContent =
      "Tagalog translation is unavailable: " +
      error.message +
      ". English text remains available.";
    currentLanguage = "en";
    currentDisplayText = currentPassage.text;
    renderPassage();
  }
});

$("copyPassage").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(
      `${currentPassage.reference}\n${currentDisplayText}`
    );
    toast("Passage copied.");
  } catch {
    toast("Clipboard access is unavailable in this browser.");
  }
});

function renderKeywordResults(query, results) {
  hideReadResults();
  $("keywordResults").classList.remove("hidden");
  $("keywordTitle").textContent = `Verses matching “${query}”`;
  $("keywordList").innerHTML = "";
  if (!results.length) {
    $("keywordList").textContent = "No matches found. Try another keyword.";
    return;
  }
  results.forEach((item) => {
    const card = document.createElement("article");
    card.className = "result-card";
    const ref = document.createElement("button");
    ref.className = "result-ref";
    ref.textContent = item.reference;
    ref.onclick = () => {
      setSearchMode("reference");
      $("searchQuery").value = item.reference;
      searchBible(item.reference);
    };
    const text = document.createElement("p");
    text.textContent = item.text;
    const actions = document.createElement("div");
    actions.className = "result-actions";
    const save = document.createElement("button");
    save.className = "text-link";
    save.textContent = "♡ Save verse";
    save.onclick = async () => {
      try {
        await api("favorites.php", {
          method: "POST",
          body: JSON.stringify({
            reference: item.reference,
            verse_text: item.text,
            translation: "WEB"
          })
        });
        await loadLibrary();
        toast("Verse saved.");
      } catch (error) {
        toast(error.message);
      }
    };
    const read = document.createElement("button");
    read.className = "text-link";
    read.textContent = "Read passage ›";
    read.onclick = ref.onclick;
    actions.append(save, read);
    card.append(ref, text, actions);
    $("keywordList").append(card);
  });
}

async function loadLibrary() {
  try {
    const data = await api("favorites.php");
    favorites = data.favorites || [];
    const hist = await api("history.php");
    historyItems = hist.history || [];
    $("favoriteCount").textContent = favorites.length;
    if (!$("passageCard").classList.contains("hidden")) renderPassage();
    if (!$("libraryView").classList.contains("hidden")) renderLibrary();
  } catch (error) {
    console.warn("Library load failed:", error.message);
  }
}

function showTab(tab) {
  $("readView").classList.toggle("hidden", tab !== "read");
  $("libraryView").classList.toggle("hidden", tab === "read");
  document.querySelectorAll(".nav-item[data-tab]").forEach((b) =>
    b.classList.toggle("active", b.dataset.tab === tab)
  );
  $("pageLabel").textContent =
    tab === "read"
      ? "Explore Scripture"
      : tab === "favorites"
      ? "Saved verses"
      : "Search history";
  $("libraryTitle").textContent =
    tab === "favorites" ? "Your saved verses" : "Your search history";
  $("libraryDesc").textContent =
    tab === "favorites"
      ? "Verses you've saved for encouragement and study."
      : "Your recent Bible searches are kept in your account.";
  if (tab !== "read") renderLibrary();
  $("sidebar").classList.remove("open");
  $("navScrim").classList.add("hidden");
}

document.querySelectorAll(".nav-item[data-tab]").forEach((b) =>
  b.addEventListener("click", () => showTab(b.dataset.tab))
);

function renderLibrary() {
  const tab =
    document.querySelector(".nav-item[data-tab].active")?.dataset.tab ||
    "favorites";
  const items = tab === "favorites" ? favorites : historyItems;
  $("libraryList").innerHTML = "";
  if (!items.length) {
    const box = document.createElement("div");
    box.className = "empty-card";
    const h = document.createElement("h3");
    h.textContent =
      tab === "favorites" ? "No saved verses yet" : "Your history is empty";
    const p = document.createElement("p");
    p.textContent =
      tab === "favorites"
        ? "When a passage speaks to you, press Save verse to keep it here."
        : "Search for a Bible passage or keyword and it will appear here.";
    const btn = document.createElement("button");
    btn.className = "btn primary";
    btn.textContent = "Search the Bible";
    btn.onclick = () => showTab("read");
    box.append(h, p, btn);
    $("libraryList").append(box);
    return;
  }
  const list = document.createElement("div");
  list.className = "library-list";
  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = tab === "favorites" ? "saved-card" : "history-row";
    const title = document.createElement("button");
    title.className = "result-ref";
    title.textContent = item.reference || item.query;
    title.onclick = () => {
      if (tab === "history" && item.type === "keyword") {
        setSearchMode("keyword");
        $("searchQuery").value = item.query;
        showTab("read");
        searchBible(item.query);
      } else {
        setSearchMode("reference");
        $("searchQuery").value = item.reference || item.query;
        showTab("read");
        searchBible(item.reference || item.query);
      }
    };
    card.append(title);
    if (tab === "favorites") {
      const p = document.createElement("p");
      p.textContent = item.verse_text;
      const meta = document.createElement("span");
      meta.className = "saved-meta";
      meta.textContent = `${item.translation || "WEB"} · Saved ${new Date(
        (item.created_at || "").replace(" ", "T") +
          (item.created_at?.endsWith("Z") ? "" : "Z")
      ).toLocaleDateString()}`;
      const remove = document.createElement("button");
      remove.className = "text-link";
      remove.textContent = "♥ Remove";
      remove.onclick = async () => {
        try {
          await api(
            `favorites.php?id=${encodeURIComponent(item.id)}`,
            { method: "DELETE", body: "{}" }
          );
          await loadLibrary();
          renderLibrary();
          toast("Removed saved verse.");
        } catch (e) {
          toast(e.message);
        }
      };
      card.append(p, meta, document.createTextNode(" "), remove);
    } else {
      const p = document.createElement("p");
      p.textContent = item.preview || "Bible search";
      const date = document.createElement("small");
      date.className = "history-date";
      date.textContent = new Date(
        (item.created_at || "").replace(" ", "T") +
          (item.created_at?.endsWith("Z") ? "" : "Z")
      ).toLocaleDateString();
      card.append(p, date);
    }
    list.append(card);
  });
  $("libraryList").append(list);
}

$("openNav").addEventListener("click", () => {
  $("sidebar").classList.add("open");
  $("navScrim").classList.remove("hidden");
});

$("closeNav").addEventListener("click", () => {
  $("sidebar").classList.remove("open");
  $("navScrim").classList.add("hidden");
});

$("navScrim").addEventListener("click", () => {
  $("sidebar").classList.remove("open");
  $("navScrim").classList.add("hidden");
});

checkSession();