const SUPABASE_URL = "https://xhjaktuuzyajccmchwpf.supabase.co";
const SUPABASE_ANON_KEY = "PASTE_YOUR_NEW_LEGACY_ANON_PUBLIC_KEY_HERE";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const state = {
  user: null,
  profile: null,
  notes: [],
  activities: [],
  achievements: [],
  flashcards: [],
  selectedFile: null,
  activeNote: null,
  currentCard: null
};

const $ = id => document.getElementById(id);

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}

function safe(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function switchAuth(mode) {
  const signup = mode === "signup";
  $("loginTab").classList.toggle("active", !signup);
  $("signupTab").classList.toggle("active", signup);
  $("loginForm").classList.toggle("hidden", signup);
  $("signupForm").classList.toggle("hidden", !signup);
}

async function signUp(e) {
  e.preventDefault();

  const name = $("signupName").value.trim();
  const email = $("signupEmail").value.trim();
  const password = $("signupPassword").value;

  const { error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { data: { display_name: name } }
  });

  if (error) return toast(error.message);

  toast("Account created. Check your email.");
  switchAuth("login");
}

async function login(e) {
  e.preventDefault();

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: $("loginEmail").value.trim(),
    password: $("loginPassword").value
  });

  if (error) return toast(error.message);

  state.user = data.user;
  await enterApp();
}

async function logout() {
  await supabaseClient.auth.signOut();
  state.user = null;
  $("appScreen").classList.add("hidden");
  $("authScreen").classList.remove("hidden");
}

async function ensureProfile() {
  const { data } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", state.user.id)
    .maybeSingle();

  if (data) return data;

  const name = state.user.user_metadata?.display_name || state.user.email.split("@")[0];

  const { data: created, error } = await supabaseClient
    .from("profiles")
    .insert({
      id: state.user.id,
      display_name: name,
      xp: 0,
      level: 1,
      streak: 0,
      trophies: 0,
      starter_packs: 1,
      ai_credits: 5,
      study_hours: 0,
      cards_reviewed: 0,
      quizzes_taken: 0,
      theme: "dark"
    })
    .select()
    .single();

  if (error) {
    toast(error.message);
    return null;
  }

  return created;
}

async function loadData() {
  state.profile = await ensureProfile();

  const [notes, activities, achievements, flashcards] = await Promise.all([
    supabaseClient.from("notes").select("*").order("created_at", { ascending: false }).limit(30),
    supabaseClient.from("activities").select("*").order("created_at", { ascending: false }).limit(30),
    supabaseClient.from("user_achievements").select("*"),
    supabaseClient.from("flashcards").select("*").order("due_at", { ascending: true }).limit(50)
  ]);

  state.notes = notes.data || [];
  state.activities = activities.data || [];
  state.achievements = achievements.data || [];
  state.flashcards = flashcards.data || [];
}

async function enterApp() {
  $("authScreen").classList.add("hidden");
  $("appScreen").classList.remove("hidden");
  await loadData();
  render();
}

function render() {
  renderProfile();
  renderNotes();
  renderActivities();
  renderAchievements();
  renderFlashcards();
}

function renderProfile() {
  const p = state.profile || {};
  const level = Math.max(1, Math.floor((p.xp || 0) / 500) + 1);

  $("welcomeTitle").textContent = Welcome back, ${p.display_name || "Student"}.;
  $("logoutBtn").textContent = (p.display_name || "S")[0].toUpperCase();

  $("xp").textContent = p.xp || 0;
  $("level").textContent = Level ${level};
  $("credits").textContent = p.ai_credits || 0;
  $("noteCount").textContent = state.notes.length;
  $("cardCount").textContent = state.flashcards.length;

  $("trophies").textContent = p.trophies || 0;
  $("packs").textContent = p.starter_packs || 0;
  $("streak").textContent = p.streak || 0;

  $("packOwned").textContent = p.starter_packs || 0;
  $("studyHours").textContent = ${Number(p.study_hours || 0).toFixed(1)}h;
  $("reviewed").textContent = p.cards_reviewed || 0;
  $("quizzes").textContent = p.quizzes_taken || 0;
  $("statTrophies").textContent = p.trophies || 0;

  document.body.classList.toggle("light", p.theme === "light");
}

function renderNotes() {
  $("recentNotes").innerHTML = state.notes.slice(0, 6).map(n => `
    <div class="item">
      <div>
        <b>${safe(n.title || "Generated Notes")}</b>
        <span>${new Date(n.created_at).toLocaleString()}</span>
      </div>
      <button class="ghost" onclick="openNote('${n.id}')">Open</button>
    </div>
  ).join("") || `<div class="item">No notes yet.</div>;

  if (state.notes[0]) {
    state.activeNote = state.notes[0];
    $("generatedNotes").textContent = formatContent(state.notes[0].content);
  }
}

function renderActivities() {
  $("activities").innerHTML = state.activities.slice(0, 8).map(a => `
    <div class="item">
      <div>
        <b>${safe(a.title)}</b>
        <span>${new Date(a.created_at).toLocaleString()}</span>
      </div>
    </div>
  ).join("") || `<div class="item">No activity yet.</div>;
}

function renderAchievements() {
  const base = [
    ["first_note", "🏆", "First Steps", "Create your first note"],
    ["note_master", "📘", "Note Master", "Create 10 notes"],
    ["streak_pro", "🔥", "Streak Pro", "Maintain a 7-day streak"],
    ["pack_opener", "🎁", "Pack Opener", "Open a starter pack"],
    ["xp_hunter", "⚡", "XP Hunter", "Reach 500 XP"],
    ["card_brain", "🧠", "Card Brain", "Review 20 flashcards"]
  ];

  $("achievements").innerHTML = base.map(([code, icon, title, desc]) => {
    const unlocked = state.achievements.some(a => a.code === code);
    return `
      <div class="badge">
        <div class="emoji">${icon}</div>
        <b>${title}</b>
        <p>${desc}</p>
        <small>${unlocked ? "Unlocked" : "Locked"}</small>
      </div>
    `;
  }).join("");
}

function renderFlashcards() {
  const card = state.flashcards.find(c => new Date(c.due_at) <= new Date()) || state.flashcards[0];
  state.currentCard = card || null;

  if (!card) {
    $("flashcardBox").textContent = "No cards yet.";
    return;
  }

  $("flashcardBox").innerHTML = `
    <div>
      <p>${safe(card.question)}</p>
      <small>Click to reveal answer</small>
    </div>
  `;

  $("flashcardBox").onclick = () => {
    $("flashcardBox").innerHTML = `
      <div>
        <p>${safe(card.answer)}</p>
        <small>Now rate your memory.</small>
      </div>
    `;
  };
}

function formatContent(c) {
  if (!c) return "No content.";
  if (typeof c === "string") return c;

  let out = "";
  if (c.title) out += # ${c.title}\n\n;
  if (c.summary) out += Summary\n${c.summary}\n\n;
  if (Array.isArray(c.key_points)) out += Key Points\n${c.key_points.map(x => `• ${x}).join("\n")}\n\n`;
  if (Array.isArray(c.definitions)) out += Definitions\n${c.definitions.map(x => `• ${x.term}: ${x.meaning}).join("\n")}\n\n`;
  if (Array.isArray(c.quiz)) out += Quiz\n${c.quiz.map((x,i)=>${i+1}. ${x.question}\nAnswer: ${x.answer}).join("\n\n")};

  return out || JSON.stringify(c, null, 2);
}

window.openNote = function(id) {
  const note = state.notes.find(n => n.id === id);
  if (!note) return;

  state.activeNote = note;
  $("generatedNotes").textContent = formatContent(note.content);
  $("editorTitle").value = note.title || "";
  $("editor").innerText = formatContent(note.content);
  goToPage("ai");
};

async function addActivity(title) {
  await supabaseClient.from("activities").insert({ user_id: state.user.id, title });
}

async function unlock(code, title, description, icon = "🏆") {
  if (state.achievements.some(a => a.code === code)) return;

  await supabaseClient.from("user_achievements").insert({
    user_id: state.user.id,
    code,
    title,
    description,
    icon
  });
}

async function generateNotes() {
  if (!state.selectedFile) return toast("Upload a study page first.");

  $("generateBtn").disabled = true;
  $("generateBtn").textContent = "Uploading...";

  const file = state.selectedFile;
  const clean = file.name.replace(/[^a-z0-9.-]/gi, "");
  const path = ${state.user.id}/${Date.now()}-${clean};

  const uploaded = await supabaseClient.storage
    .from("study-files")
    .upload(path, file);

  if (uploaded.error) {
    $("generateBtn").disabled = false;
    $("generateBtn").textContent = "Generate Notes";
    return toast(uploaded.error.message);
  }

  $("generateBtn").textContent = "Generating...";

  let generated;
  const ai = await supabaseClient.functions.invoke("generate-notes", {
    body: {
      filePath: path,
      fileName: file.name,
      mimeType: file.type,
      focus: $("focusSelect").value
    }
  });

  if (ai.error || !ai.data?.note) {
    generated = demoNote(file.name);
    const inserted = await supabaseClient.from("notes").insert({
      user_id: state.user.id,
      title: generated.title,
      file_path: path,
      file_name: file.name,
      focus: $("focusSelect").value,
      content: generated,
      flashcards: generated.flashcards
    }).select().single();

    state.activeNote = inserted.data;
    toast("Demo notes created. Deploy Edge Function for real AI.");
  } else {
    state.activeNote = ai.data.note;
    toast("AI notes generated.");
  }

  await rewardStudy(file.name);
  await loadData();
  render();

  $("generatedNotes").textContent = formatContent(state.activeNote.content || generated);
  $("generateBtn").disabled = false;
  $("generateBtn").textContent = "Generate Notes";
  goToPage("ai");
}

function demoNote(fileName) {
  return {
    title: Notes from ${fileName},
    summary: "This is a clean generated study note placeholder. Deploy the Supabase Edge Function to use real GPT vision note generation.",
    key_points: [
      "Identify the main topic from the uploaded page.",
      "Extract important definitions and facts.",
      "Convert the content into reviewable flashcards.",
      "Use quizzes to test recall."
    ],
    definitions: [
      { term: "Active Recall", meaning: "Testing yourself instead of rereading." },
      { term: "Spaced Repetition", meaning: "Reviewing information at increasing intervals." }
    ],
    flashcards: [
      { question: "What is active recall?", answer: "Testing yourself to strengthen memory." },
      { question: "What is spaced repetition?", answer: "Reviewing material over increasing time intervals." }
    ],
    quiz: [
      { question: "Why are flashcards useful?", answer: "They force recall and help long-term retention." }
    ]
  };
}

async function rewardStudy(fileName) {
  const p = state.profile;
  const today = new Date().toISOString().slice(0, 10);
  const last = p.last_study_date;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  let streak = p.streak || 0;
  if (last !== today) streak = last === yesterday ? streak + 1 : 1;

  await supabaseClient.from("profiles").update({
    xp: (p.xp || 0) + 35,
    level: Math.floor(((p.xp || 0) + 35) / 500) + 1,
    streak,
    trophies: (p.trophies || 0) + 1,
    ai_credits: Math.max(0, (p.ai_credits || 0) - 1),
    study_hours: Number(p.study_hours || 0) + 0.15,
    last_study_date: today
  }).eq("id", state.user.id);

  await addActivity(Generated notes from ${fileName} and earned +35 XP);
  await unlock("first_note", "First Steps", "Created your first note", "🏆");
}

async function openPack() {
  const p = state.profile;
  if (!p || (p.starter_packs || 0) < 1) return toast("No starter packs available.");

  const rewards = [
    { label: "+75 XP", payload: { xp: (p.xp || 0) + 75 } },
    { label: "+2 Trophies", payload: { trophies: (p.trophies || 0) + 2 } },
    { label: "+3 AI Credits", payload: { ai_credits: (p.ai_credits || 0) + 3 } },
    { label: "Cosmetic Theme Token", payload: { trophies: (p.trophies || 0) + 1 } }
  ];

  const reward = rewards[Math.floor(Math.random() * rewards.length)];

  const { error } = await supabaseClient.from("profiles").update({
    starter_packs: (p.starter_packs || 0) - 1,
    ...reward.payload
  }).eq("id", state.user.id);

  if (error) return toast(error.message);

  await addActivity(Opened Starter Pack and won ${reward.label});
  await unlock("pack_opener", "Pack Opener", "Opened your first starter pack", "🎁");

  toast(You won ${reward.label});
  await loadData();
  render();
}

async function makeCards() {
  const note = state.activeNote;
  const cards = note?.flashcards || note?.content?.flashcards || [];

  if (!cards.length) return toast("No flashcards found in this note.");

  const rows = cards.map(c => ({
    user_id: state.user.id,
    note_id: note.id,
    question: c.question,
    answer: c.answer,
    due_at: new Date().toISOString()
  }));

  const { error } = await supabaseClient.from("flashcards").insert(rows);
  if (error) return toast(error.message);

  await addActivity(Created ${rows.length} flashcards);
  toast("Flashcards created.");
  await loadData();
  render();
  goToPage("flashcards");
}

async function review(score) {
  const card = state.currentCard;
  if (!card) return;

  let interval = card.interval_days || 1;
  let ease = Number(card.ease || 2.5);
  let reps = card.repetitions || 0;

  if (score === "again") {
    interval = 1;
    ease = Math.max(1.3, ease - 0.25);
    reps = 0;
  }

  if (score === "good") {
    reps += 1;
    interval = Math.ceil(interval * ease);
  }

  if (score === "easy") {
    reps += 1;
    ease += 0.15;
    interval = Math.ceil(interval * ease * 1.4);
  }

  const due = new Date();
  due.setDate(due.getDate() + interval);

  await supabaseClient.from("flashcards").update({
    interval_days: interval,
    ease,
    repetitions: reps,
    due_at: due.toISOString()
  }).eq("id", card.id);

  await supabaseClient.from("profiles").update({
    xp: (state.profile.xp || 0) + 5,
    cards_reviewed: (state.profile.cards_reviewed || 0) + 1
  }).eq("id", state.user.id);

  await addActivity("Reviewed a flashcard and earned +5 XP");

  if ((state.profile.cards_reviewed || 0) + 1 >= 20) {
    await unlock("card_brain", "Card Brain", "Reviewed 20 flashcards", "🧠");
  }

  await loadData();
  render();
}

async function saveManualNote() {
  const title = $("editorTitle").value.trim() || "Manual Note";
  const text = $("editor").innerText.trim();

  if (!text) return toast("Write something first.");

  const content = {
    title,
    summary: text,
    key_points: text.split("\n").filter(Boolean).slice(0, 10),
    flashcards: []
  };

  const { error } = await supabaseClient.from("notes").insert({
    user_id: state.user.id,
    title,
    content
  });

  if (error) return toast(error.message);

  await addActivity(Saved note: ${title});
  toast("Note saved.");
  await loadData();
  render();
}

async function toggleTheme() {
  const next = state.profile.theme === "light" ? "dark" : "light";

  const { error } = await supabaseClient
    .from("profiles")
    .update({ theme: next })
    .eq("id", state.user.id);

  if (error) return toast(error.message);

  state.profile.theme = next;
  renderProfile();
}

async function loadLeaderboard() {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("display_name,xp,level,trophies,streak")
    .order("xp", { ascending: false })
    .limit(10);

  if (error) {
    $("leaderboard").innerHTML = <div class="item">${safe(error.message)}</div>;
    return;
  }

  $("leaderboard").innerHTML = data.map((p, i) => `
    <div class="item">
      <div>
        <b>#${i + 1} ${safe(p.display_name || "Student")}</b>
        <span>Level ${p.level || 1} · 🏆 ${p.trophies || 0} · 🔥 ${p.streak || 0}</span>
      </div>
      <b>${p.xp || 0} XP</b>
    </div>
  `).join("");
}

function goToPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav").forEach(n => n.classList.remove("active"));

  const pageEl = $(${page}Page);
  if (pageEl) pageEl.classList.add("active");

  document.querySelectorAll([data-page="${page}"]).forEach(b => b.classList.add("active"));

  if (page === "leaderboard") loadLeaderboard();
}

function bindEvents() {
  $("loginTab").onclick = () => switchAuth("login");
  $("signupTab").onclick = () => switchAuth("signup");

  $("loginForm").onsubmit = login;
  $("signupForm").onsubmit = signUp;

  $("logoutBtn").onclick = logout;
  $("logoutBtn2").onclick = logout;

  $("themeBtn").onclick = toggleTheme;
  $("themeBtn2").onclick = toggleTheme;

  $("fileInput").onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    state.selectedFile = file;
    $("fileName").textContent = file.name;
  };

  $("generateBtn").onclick = generateNotes;
  $("openPackBtn").onclick = openPack;
  $("openPackBtn2").onclick = openPack;
  $("makeCardsBtn").onclick = makeCards;

  $("againBtn").onclick = () => review("again");
  $("goodBtn").onclick = () => review("good");
  $("easyBtn").onclick = () => review("easy");

  $("saveNoteBtn").onclick = saveManualNote;

  document.querySelectorAll("[data-page]").forEach(btn => {
    btn.onclick = () => goToPage(btn.dataset.page);
  });
}

async function init() {
  bindEvents();

  const { data } = await supabaseClient.auth.getSession();

  if (data.session?.user) {
    state.user = data.session.user;
    await enterApp();
  } else {
    $("authScreen").classList.remove("hidden");
  }
}

init();