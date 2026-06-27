const SUPABASE_URL = "https://xesezkxicsttwyqkyox.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhlc2V4emt4aWNzdHR3eXFreW94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NDE4ODQsImV4cCI6MjA5ODExNzg4NH0.x6PlPdUsTDTOEXn35G-P1_Ce_CiEppHma0zvUEQ4jkI";

const isSupabaseReady =
    SUPABASE_URL.startsWith("https://") &&
    !SUPABASE_URL.includes("PASTE") &&
    !SUPABASE_ANON_KEY.includes("PASTE");

const supabaseClient = isSupabaseReady
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

const state = {
    user: null,
    profile: null,
    notes: [],
    flashcards: [],
    activities: [],
    latestNote: null,
    currentCardIndex: 0,
    flipped: false,
    quizActive: false,
    quizIndex: 0,
    quizScore: 0,
    selectedFile: null
};

const els = {
    authScreen: document.getElementById("authScreen"),
    appScreen: document.getElementById("appScreen"),
    toast: document.getElementById("toast"),

    loginForm: document.getElementById("loginForm"),
    signupForm: document.getElementById("signupForm"),

    welcomeTitle: document.getElementById("welcomeTitle"),
    profileBtn: document.getElementById("profileBtn"),
    profileName: document.getElementById("profileName"),
    bigAvatar: document.getElementById("bigAvatar"),

    streakValue: document.getElementById("streakValue"),
    xpValue: document.getElementById("xpValue"),
    cardsValue: document.getElementById("cardsValue"),
    trophyValue: document.getElementById("trophyValue"),
    levelText: document.getElementById("levelText"),
    levelFill: document.getElementById("levelFill"),

    activityList: document.getElementById("activityList"),
    activityCount: document.getElementById("activityCount"),

    fileInput: document.getElementById("fileInput"),
    uploadTitle: document.getElementById("uploadTitle"),
    uploadSub: document.getElementById("uploadSub"),
    focusSelect: document.getElementById("focusSelect"),
    generateBtn: document.getElementById("generateBtn"),
    generateStatus: document.getElementById("generateStatus"),
    notesOutput: document.getElementById("notesOutput"),

    cardCountText: document.getElementById("cardCountText"),
    flashLabel: document.getElementById("flashLabel"),
    flashQuestion: document.getElementById("flashQuestion"),
    flashAnswer: document.getElementById("flashAnswer"),
    wrongBox: document.getElementById("wrongBox"),

    quizTitle: document.getElementById("quizTitle"),
    quizProgress: document.getElementById("quizProgress"),
    quizQuestion: document.getElementById("quizQuestion"),
    quizInput: document.getElementById("quizInput"),
    quizFeedback: document.getElementById("quizFeedback"),

    settingsName: document.getElementById("settingsName")
};

function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.remove("hidden");

    clearTimeout(window.__toastTimer);

    window.__toastTimer = setTimeout(() => {
        els.toast.classList.add("hidden");
    }, 2600);
}

function setTheme(theme) {
    document.body.dataset.theme = theme;
    localStorage.setItem("studysnap_theme", theme);

    document.getElementById("themeBtn").textContent = theme === "dark" ? "☀" : "☾";
    document.getElementById("sidebarThemeBtn").textContent = theme === "dark" ? "☾" : "☀";
}

function toggleTheme() {
    const current = document.body.dataset.theme || "dark";
    setTheme(current === "dark" ? "light" : "dark");
}

function showPage(page) {
    document.querySelectorAll(".page").forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.page === page);
    });

    document.querySelectorAll(".nav-btn").forEach((button) => {
        button.classList.toggle("active", button.dataset.page === page);
    });

    if (page === "settings" && state.profile) {
        els.settingsName.value = state.profile.display_name || "";
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function showApp() {
    els.authScreen.classList.add("hidden");
    els.appScreen.classList.remove("hidden");
}

function showAuth() {
    els.appScreen.classList.add("hidden");
    els.authScreen.classList.remove("hidden");
}

async function init() {
    setTheme(localStorage.getItem("studysnap_theme") || "dark");

    bindEvents();

    if (!isSupabaseReady) {
        toast("Supabase is not connected yet. Add your Supabase URL and anon key in script.js.");
        showAuth();
        return;
    }

    const { data } = await supabaseClient.auth.getSession();

    if (data.session?.user) {
        state.user = data.session.user;
        await loadUserData();
        showApp();
        render();
    } else {
        showAuth();
    }

    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        state.user = session?.user || null;

        if (state.user) {
            await loadUserData();
            showApp();
            render();
        } else {
            showAuth();
        }
    });
}

function bindEvents() {
    document.querySelectorAll("[data-auth-tab]").forEach((button) => {
        button.addEventListener("click", () => {
            document.querySelectorAll("[data-auth-tab]").forEach((tab) => {
                tab.classList.remove("active");
            });

            button.classList.add("active");

            const tab = button.dataset.authTab;
            els.loginForm.classList.toggle("hidden", tab !== "login");
            els.signupForm.classList.toggle("hidden", tab !== "signup");
        });
    });

    document.querySelectorAll("[data-page]").forEach((button) => {
        button.addEventListener("click", () => {
            showPage(button.dataset.page);
        });
    });

    document.getElementById("themeBtn").addEventListener("click", toggleTheme);
    document.getElementById("sidebarThemeBtn").addEventListener("click", toggleTheme);
    document.getElementById("settingsThemeBtn").addEventListener("click", toggleTheme);

    document.getElementById("notifyBtn").addEventListener("click", () => {
        toast("No notifications yet.");
    });

    document.getElementById("profileBtn").addEventListener("click", () => {
        showPage("settings");
    });

    els.loginForm.addEventListener("submit", handleLogin);
    els.signupForm.addEventListener("submit", handleSignup);

    els.fileInput.addEventListener("change", handleFileSelect);
    els.generateBtn.addEventListener("click", generateNotesFromPage);

    document.getElementById("saveCardsBtn").addEventListener("click", makeFlashcardsFromLatestNote);
    document.getElementById("nextCardBtn").addEventListener("click", nextCard);
    document.getElementById("flipBtn").addEventListener("click", flipCard);
    document.getElementById("correctBtn").addEventListener("click", markCardCorrect);
    document.getElementById("wrongBtn").addEventListener("click", markCardWrong);
    document.getElementById("resetCardsBtn").addEventListener("click", clearCards);

    document.getElementById("startQuizBtn").addEventListener("click", startQuiz);
    document.getElementById("submitQuizBtn").addEventListener("click", submitQuizAnswer);

    document.getElementById("completeSessionBtn").addEventListener("click", completeStudySession);
    document.getElementById("openPackBtn").addEventListener("click", openPack);

    document.getElementById("saveSettingsBtn").addEventListener("click", saveSettings);
    document.getElementById("logoutBtn").addEventListener("click", logout);
}

async function handleSignup(event) {
    event.preventDefault();

    if (!isSupabaseReady) {
        toast("Connect Supabase first.");
        return;
    }

    const displayName = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;

    const { error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
            data: {
                display_name: displayName
            }
        }
    });

    if (error) {
        toast(error.message);
        return;
    }

    toast("Account created. Check email if confirmation is enabled.");
}

async function handleLogin(event) {
    event.preventDefault();

    if (!isSupabaseReady) {
        toast("Connect Supabase first.");
        return;
    }

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        toast(error.message);
        return;
    }

    toast("Logged in.");
}

async function logout() {
    await supabaseClient.auth.signOut();
    toast("Logged out.");
}

async function loadUserData() {
    if (!state.user) return;

    let { data: profile, error: profileError } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", state.user.id)
        .single();

    if (profileError || !profile) {
        const fallbackName =
            state.user.user_metadata?.display_name ||
            state.user.email?.split("@")[0] ||
            "Student";

        const { data: insertedProfile } = await supabaseClient
            .from("profiles")
            .insert({
                id: state.user.id,
                display_name: fallbackName
            })
            .select()
            .single();

        profile = insertedProfile;
    }

    const { data: notes } = await supabaseClient
        .from("notes")
        .select("*")
        .eq("user_id", state.user.id)
        .order("created_at", { ascending: false });

    const { data: activities } = await supabaseClient
        .from("activities")
        .select("*")
        .eq("user_id", state.user.id)
        .order("created_at", { ascending: false })
        .limit(8);

    state.profile = profile;
    state.notes = notes || [];
    state.activities = activities || [];

    state.latestNote = state.notes[0] || null;
    state.flashcards = state.latestNote?.flashcards || [];
}

function render() {
    if (!state.profile) return;

    const name = state.profile.display_name || "Student";
    const firstName = name.split(" ")[0];
    const initial = firstName.charAt(0).toUpperCase() || "S";

    els.welcomeTitle.textContent = `Welcome back, ${firstName}.`;
    els.profileName.textContent = name;
    els.profileBtn.textContent = initial;
    els.bigAvatar.textContent = initial;

    const xp = state.profile.xp || 0;

    els.streakValue.textContent = state.profile.streak || 0;
    els.xpValue.textContent = xp;
    els.cardsValue.textContent = state.flashcards.length || 0;
    els.trophyValue.textContent = state.profile.trophies || 0;

    els.levelText.textContent = `${xp} / 500 XP`;
    els.levelFill.style.width = `${Math.min((xp / 500) * 100, 100)}%`;

    renderActivities();
    renderNotes();
    renderFlashcard();
    renderQuiz();
}

function renderActivities() {
    els.activityCount.textContent = `${state.activities.length} events`;

    if (!state.activities.length) {
        els.activityList.innerHTML = `<p class="empty">No activity yet.</p>`;
        return;
    }

    els.activityList.innerHTML = state.activities.map((item) => {
        return `
            <div class="activity-item">
                <strong>${escapeHTML(item.title)}</strong>
                <span>${new Date(item.created_at).toLocaleString()}</span>
            </div>
        `;
    }).join("");
}

function renderNotes() {
    if (!state.latestNote) {
        els.notesOutput.innerHTML = "Your notes will appear here after generation.";
        return;
    }

    const content = state.latestNote.content || {};

    els.notesOutput.innerHTML = noteToHTML(content);
}

function noteToHTML(content) {
    const sections = Array.isArray(content.sections) ? content.sections : [];
    const terms = Array.isArray(content.key_terms) ? content.key_terms : [];

    return `
        <h3>${escapeHTML(content.title || "Generated Notes")}</h3>

        <h4>Summary</h4>
        <p>${escapeHTML(content.summary || "No summary generated.")}</p>

        <h4>Sections</h4>
        ${sections.length ? sections.map((section) => `
            <h4>${escapeHTML(section.heading || "Section")}</h4>
            <ul>
                ${(section.bullets || []).map((point) => `<li>${escapeHTML(point)}</li>`).join("")}
            </ul>
        `).join("") : "<p>No sections generated.</p>"}

        <h4>Key Terms</h4>
        ${terms.length ? `
            <ul>
                ${terms.map((term) => `
                    <li><strong>${escapeHTML(term.term || "")}</strong>: ${escapeHTML(term.definition || "")}</li>
                `).join("")}
            </ul>
        ` : "<p>No key terms generated.</p>"}
    `;
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    state.selectedFile = file || null;

    if (!file) {
        els.uploadTitle.textContent = "Choose photo or PDF";
        els.uploadSub.textContent = "PNG, JPG, WEBP, or PDF";
        return;
    }

    els.uploadTitle.textContent = file.name;
    els.uploadSub.textContent = `${Math.round(file.size / 1024)} KB selected`;
}

async function generateNotesFromPage() {
    if (!isSupabaseReady) {
        toast("Connect Supabase first.");
        return;
    }

    if (!state.user) {
        toast("Login first.");
        return;
    }

    if (!state.selectedFile) {
        toast("Upload a page or PDF first.");
        return;
    }

    const file = state.selectedFile;

    if (file.size > 10 * 1024 * 1024) {
        toast("File too large. Keep it under 10MB for now.");
        return;
    }

    els.generateBtn.disabled = true;
    els.generateBtn.textContent = "Generating...";
    els.generateStatus.textContent = "Uploading file to Supabase Storage...";

    try {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filePath = `${state.user.id}/${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabaseClient
            .storage
            .from("study-files")
            .upload(filePath, file, {
                contentType: file.type,
                upsert: false
            });

        if (uploadError) throw uploadError;

        els.generateStatus.textContent = "File uploaded. AI is reading the page...";

        const { data, error } = await supabaseClient.functions.invoke("generate-notes", {
            body: {
                filePath,
                fileName: file.name,
                mimeType: file.type,
                focus: els.focusSelect.value
            }
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        els.generateStatus.textContent = "Notes generated successfully.";

        await loadUserData();
        render();

        toast("+25 XP. Notes generated from page.");
    } catch (error) {
        console.error(error);
        els.generateStatus.textContent = error.message || "Generation failed.";
        toast(error.message || "Generation failed.");
    } finally {
        els.generateBtn.disabled = false;
        els.generateBtn.textContent = "Generate Notes From Page";
    }
}

async function makeFlashcardsFromLatestNote() {
    if (!state.latestNote) {
        toast("Generate notes first.");
        return;
    }

    const content = state.latestNote.content || {};
    const flashcards = Array.isArray(content.flashcards) ? content.flashcards : [];

    if (!flashcards.length) {
        toast("No flashcards were generated in the latest note.");
        return;
    }

    const { error } = await supabaseClient
        .from("notes")
        .update({
            flashcards
        })
        .eq("id", state.latestNote.id);

    if (error) {
        toast(error.message);
        return;
    }

    await addActivity("Created flashcards");
    await loadUserData();
    render();
    showPage("flashcards");
    toast(`${flashcards.length} flashcards ready.`);
}

function renderFlashcard() {
    els.wrongBox.classList.add("hidden");

    if (!state.flashcards.length) {
        els.cardCountText.textContent = "0 cards available.";
        els.flashLabel.textContent = "No flashcard";
        els.flashQuestion.textContent = "Generate notes first.";
        els.flashAnswer.textContent = "The answer will show after you flip.";
        return;
    }

    const card = state.flashcards[state.currentCardIndex % state.flashcards.length];

    els.cardCountText.textContent = `${state.flashcards.length} cards available.`;
    els.flashLabel.textContent = `Card ${state.currentCardIndex + 1} of ${state.flashcards.length}`;
    els.flashQuestion.textContent = card.question || "Question";
    els.flashAnswer.textContent = state.flipped ? (card.answer || "No answer.") : "Click Flip to reveal the answer.";
}

function flipCard() {
    if (!state.flashcards.length) return;

    state.flipped = !state.flipped;
    renderFlashcard();
}

function nextCard() {
    if (!state.flashcards.length) return;

    state.currentCardIndex = (state.currentCardIndex + 1) % state.flashcards.length;
    state.flipped = false;
    renderFlashcard();
}

async function markCardCorrect() {
    if (!state.flashcards.length) return;

    await updateProfile({
        cards_reviewed: (state.profile.cards_reviewed || 0) + 1,
        xp: (state.profile.xp || 0) + 5
    });

    await addActivity("Reviewed a flashcard correctly");

    nextCard();
    await loadUserData();
    render();
    toast("+5 XP.");
}

function markCardWrong() {
    if (!state.flashcards.length) return;

    const card = state.flashcards[state.currentCardIndex];

    els.wrongBox.innerHTML = `
        <strong>Review tip:</strong>
        You missed this card. Read the answer again, cover it, then explain it out loud.
        <br><br>
        <strong>Correct answer:</strong> ${escapeHTML(card.answer || "")}
    `;

    els.wrongBox.classList.remove("hidden");
}

async function clearCards() {
    if (!state.latestNote) return;

    await supabaseClient
        .from("notes")
        .update({ flashcards: [] })
        .eq("id", state.latestNote.id);

    state.flashcards = [];
    state.currentCardIndex = 0;
    state.flipped = false;

    render();
    toast("Cards cleared.");
}

function startQuiz() {
    if (!state.flashcards.length) {
        toast("Create flashcards first.");
        return;
    }

    state.quizActive = true;
    state.quizIndex = 0;
    state.quizScore = 0;

    renderQuiz();
}

function renderQuiz() {
    if (!state.flashcards.length || !state.quizActive) {
        els.quizTitle.textContent = "Quiz not started";
        els.quizProgress.textContent = `0 / ${state.flashcards.length}`;
        els.quizQuestion.textContent = state.flashcards.length ? "Press Start Quiz." : "Generate flashcards first.";
        els.quizFeedback.classList.add("hidden");
        return;
    }

    const card = state.flashcards[state.quizIndex];

    els.quizTitle.textContent = "Active Quiz";
    els.quizProgress.textContent = `${state.quizIndex + 1} / ${state.flashcards.length}`;
    els.quizQuestion.textContent = card.question || "Question";
    els.quizInput.value = "";
    els.quizFeedback.classList.add("hidden");
}

async function submitQuizAnswer() {
    if (!state.quizActive || !state.flashcards.length) {
        toast("Start quiz first.");
        return;
    }

    const card = state.flashcards[state.quizIndex];
    const answer = els.quizInput.value.trim().toLowerCase();

    const importantWords = String(card.answer || "")
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((word) => word.length > 5)
        .slice(0, 4);

    const correct = importantWords.some((word) => answer.includes(word));

    if (correct) {
        state.quizScore += 1;

        els.quizFeedback.innerHTML = `
            <strong>Correct.</strong>
            You included one of the important ideas.
        `;
    } else {
        els.quizFeedback.innerHTML = `
            <strong>Not quite.</strong>
            <br><br>
            Correct idea: ${escapeHTML(card.answer || "")}
            <br><br>
            Try remembering the main keyword first, then explain it in your own words.
        `;
    }

    els.quizFeedback.classList.remove("hidden");

    setTimeout(async () => {
        state.quizIndex += 1;

        if (state.quizIndex >= state.flashcards.length) {
            state.quizActive = false;

            await updateProfile({
                quizzes_taken: (state.profile.quizzes_taken || 0) + 1,
                trophies: (state.profile.trophies || 0) + 1,
                xp: (state.profile.xp || 0) + state.quizScore * 10
            });

            await addActivity(`Completed quiz: ${state.quizScore}/${state.flashcards.length}`);

            await loadUserData();
            render();

            toast(`Quiz complete. Score: ${state.quizScore}/${state.flashcards.length}.`);
            return;
        }

        renderQuiz();
    }, 1200);
}

async function completeStudySession() {
    await updateProfile({
        streak: Math.max(state.profile.streak || 0, 1),
        study_hours: Number(state.profile.study_hours || 0) + 0.5,
        trophies: (state.profile.trophies || 0) + 1,
        xp: (state.profile.xp || 0) + 40
    });

    await addActivity("Completed a study session");
    await loadUserData();
    render();

    toast("+40 XP and +1 trophy.");
}

async function openPack() {
    if ((state.profile.trophies || 0) < 1) {
        toast("You need 1 trophy to open a pack.");
        return;
    }

    const rewards = [
        { name: "+25 XP", data: { xp: (state.profile.xp || 0) + 25 } },
        { name: "+1 AI Credit", data: { ai_credits: (state.profile.ai_credits || 0) + 1 } },
        { name: "+0.2 Study Hours", data: { study_hours: Number(state.profile.study_hours || 0) + 0.2 } }
    ];

    const reward = rewards[Math.floor(Math.random() * rewards.length)];

    await updateProfile({
        trophies: (state.profile.trophies || 0) - 1,
        ...reward.data
    });

    await addActivity(`Opened pack and won ${reward.name}`);
    await loadUserData();
    render();

    toast(`Pack opened: ${reward.name}`);
}

async function saveSettings() {
    const displayName = els.settingsName.value.trim();

    if (!displayName) {
        toast("Name cannot be empty.");
        return;
    }

    await updateProfile({
        display_name: displayName
    });

    await addActivity("Updated profile settings");
    await loadUserData();
    render();

    toast("Settings saved.");
}

async function updateProfile(values) {
    const { error } = await supabaseClient
        .from("profiles")
        .update(values)
        .eq("id", state.user.id);

    if (error) {
        toast(error.message);
    }
}

async function addActivity(title) {
    await supabaseClient
        .from("activities")
        .insert({
            user_id: state.user.id,
            title
        });
}

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

init();