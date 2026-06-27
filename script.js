const DB_KEY = "studysnap_users_v1";
const SESSION_KEY = "studysnap_current_user";
const THEME_KEY = "studysnap_theme";

const authView = document.getElementById("authView");
const appView = document.getElementById("appView");
const toast = document.getElementById("toast");

let state = {
    user: null,
    currentCardIndex: 0,
    cardFlipped: false,
    quizIndex: 0,
    quizScore: 0,
    quizActive: false
};

function getUsers() {
    return JSON.parse(localStorage.getItem(DB_KEY) || "[]");
}

function saveUsers(users) {
    localStorage.setItem(DB_KEY, JSON.stringify(users));
}

function saveCurrentUser(user) {
    const users = getUsers();
    const index = users.findIndex((item) => item.id === user.id);

    if (index !== -1) {
        users[index] = user;
        saveUsers(users);
    }

    state.user = user;
    renderAll();
}

function getCurrentUser() {
    const id = localStorage.getItem(SESSION_KEY);
    if (!id) return null;

    const users = getUsers();
    return users.find((user) => user.id === id) || null;
}

async function hashPassword(password) {
    if (!window.crypto || !window.crypto.subtle) {
        return `demo-${password}`;
    }

    const data = new TextEncoder().encode(password);
    const hash = await crypto.subtle.digest("SHA-256", data);

    return Array.from(new Uint8Array(hash))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

function createNewUser(name, email, passwordHash) {
    return {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        name,
        email,
        passwordHash,
        createdAt: new Date().toISOString(),
        stats: {
            streak: 0,
            xp: 0,
            goalsCompleted: 0,
            goalsTotal: 0,
            flashcardsReviewed: 0,
            studyHours: 0,
            notesCreated: 0,
            quizzesTaken: 0,
            trophies: 0,
            aiCredits: 5
        },
        notes: [],
        flashcards: [],
        activity: []
    };
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.remove("hidden");

    setTimeout(() => {
        toast.classList.add("hidden");
    }, 2600);
}

function addActivity(text) {
    if (!state.user) return;

    state.user.activity.unshift({
        id: Date.now(),
        text,
        time: "Just now"
    });

    state.user.activity = state.user.activity.slice(0, 8);
    saveCurrentUser(state.user);
}

function setTheme(theme) {
    document.body.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);

    const icon = theme === "dark" ? "☀" : "☾";

    document.getElementById("themeToggle").textContent = icon;
    document.getElementById("sideThemeToggle").textContent = theme === "dark" ? "☾" : "☀";
}

function toggleTheme() {
    const current = document.body.dataset.theme;
    setTheme(current === "dark" ? "light" : "dark");
}

function boot() {
    const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
    setTheme(savedTheme);

    const user = getCurrentUser();

    if (user) {
        state.user = user;
        authView.classList.add("hidden");
        appView.classList.remove("hidden");
        renderAll();
    } else {
        authView.classList.remove("hidden");
        appView.classList.add("hidden");
    }
}

document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.addEventListener("click", () => {
        document.querySelectorAll("[data-auth-tab]").forEach((tab) => tab.classList.remove("active"));
        button.classList.add("active");

        const tab = button.dataset.authTab;

        document.getElementById("loginForm").classList.toggle("hidden", tab !== "login");
        document.getElementById("signupForm").classList.toggle("hidden", tab !== "signup");
    });
});

document.getElementById("signupForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim().toLowerCase();
    const password = document.getElementById("signupPassword").value;

    const users = getUsers();

    if (users.some((user) => user.email === email)) {
        document.getElementById("signupMessage").textContent = "Account already exists. Try logging in.";
        return;
    }

    const passwordHash = await hashPassword(password);
    const user = createNewUser(name, email, passwordHash);

    users.push(user);
    saveUsers(users);

    localStorage.setItem(SESSION_KEY, user.id);
    state.user = user;

    authView.classList.add("hidden");
    appView.classList.remove("hidden");

    showToast("Account created. Welcome to StudySnap.");
    renderAll();
});

document.getElementById("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;
    const passwordHash = await hashPassword(password);

    const users = getUsers();
    const user = users.find((item) => item.email === email && item.passwordHash === passwordHash);

    if (!user) {
        document.getElementById("loginMessage").textContent = "Incorrect email or password.";
        return;
    }

    localStorage.setItem(SESSION_KEY, user.id);
    state.user = user;

    authView.classList.add("hidden");
    appView.classList.remove("hidden");

    showToast("Logged in successfully.");
    renderAll();
});

function showPage(page) {
    document.querySelectorAll(".page").forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.pagePanel === page);
    });

    document.querySelectorAll(".nav-link[data-page]").forEach((button) => {
        button.classList.toggle("active", button.dataset.page === page);
    });

    if (page === "settings") {
        document.getElementById("settingsName").value = state.user.name;
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
        showPage(button.dataset.page);
    });
});

document.querySelectorAll("[data-goto]").forEach((button) => {
    button.addEventListener("click", () => {
        showPage(button.dataset.goto);
    });
});

document.getElementById("themeToggle").addEventListener("click", toggleTheme);
document.getElementById("sideThemeToggle").addEventListener("click", toggleTheme);

document.getElementById("notificationButton").addEventListener("click", () => {
    showToast("No notifications yet. Start studying to create activity.");
});

document.getElementById("profileButton").addEventListener("click", () => {
    showPage("settings");
});

function renderAll() {
    if (!state.user) return;

    const firstName = state.user.name.split(" ")[0] || "Student";
    const initial = firstName.charAt(0).toUpperCase();

    document.getElementById("dashboardGreeting").textContent = `Welcome back, ${firstName}.`;
    document.getElementById("profileInitial").textContent = initial;
    document.getElementById("bigProfileInitial").textContent = initial;
    document.getElementById("profileName").textContent = state.user.name;

    const stats = state.user.stats;

    document.getElementById("dashStreak").textContent = stats.streak;
    document.getElementById("dashXP").textContent = stats.xp;
    document.getElementById("dashGoals").textContent = `${stats.goalsCompleted}/${stats.goalsTotal}`;
    document.getElementById("dashCards").textContent = stats.flashcardsReviewed;

    document.getElementById("studyHours").textContent = stats.studyHours.toFixed(1);
    document.getElementById("notesCount").textContent = stats.notesCreated;
    document.getElementById("quizzesCount").textContent = stats.quizzesTaken;
    document.getElementById("trophiesCount").textContent = stats.trophies;

    document.getElementById("levelXP").textContent = `${stats.xp} / 500 XP`;
    document.getElementById("levelBar").style.width = `${Math.min((stats.xp / 500) * 100, 100)}%`;

    document.getElementById("progressNotes").style.width = `${Math.min(stats.notesCreated * 15, 100)}%`;
    document.getElementById("progressCards").style.width = `${Math.min(state.user.flashcards.length * 8, 100)}%`;
    document.getElementById("progressXP").style.width = `${Math.min((stats.xp / 500) * 100, 100)}%`;

    renderActivity();
    renderFlashcard();
    updateCardCounter();
}

function renderActivity() {
    const list = document.getElementById("activityList");
    const activity = state.user.activity;

    document.getElementById("activityCount").textContent = `${activity.length} events`;

    if (!activity.length) {
        list.innerHTML = `<p class="empty-text">No activity yet.</p>`;
        return;
    }

    list.innerHTML = activity.map((item) => `
        <div class="activity-item">
            <strong>${item.text}</strong>
            <span>${item.time}</span>
        </div>
    `).join("");
}

document.getElementById("completeSessionButton").addEventListener("click", () => {
    state.user.stats.studyHours += 0.5;
    state.user.stats.xp += 50;
    state.user.stats.trophies += 1;
    state.user.stats.streak = Math.max(state.user.stats.streak, 1);

    addActivity("Completed a study session");
    showToast("+50 XP and +1 trophy earned.");
    saveCurrentUser(state.user);
});

document.getElementById("fileInput").addEventListener("change", (event) => {
    const file = event.target.files[0];
    document.getElementById("fileName").textContent = file ? file.name : "Optional for now";
});

document.getElementById("generateNotesButton").addEventListener("click", () => {
    const text = document.getElementById("materialInput").value.trim();
    const focus = document.getElementById("focusMode").value;

    if (!text) {
        showToast("Paste some study material first.");
        return;
    }

    const sentences = text
        .replace(/\s+/g, " ")
        .split(/(?<=[.!?])\s+/)
        .filter(Boolean);

    const selected = sentences.slice(0, 6);
    const keywords = text
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((word) => word.length > 5)
        .slice(0, 8);

    const title = `Study Notes ${state.user.notes.length + 1}`;

    const note = {
        id: Date.now(),
        title,
        focus,
        raw: text,
        summary: selected.join(" "),
        bullets: selected.length ? selected : [text.slice(0, 180)],
        keywords,
        createdAt: new Date().toISOString()
    };

    state.user.notes.unshift(note);
    state.user.stats.notesCreated = state.user.notes.length;
    state.user.stats.xp += 20;

    const output = `
        <h4>${title}</h4>
        <p><strong>Focus:</strong> ${focus}</p>
        <h4>Summary</h4>
        <p>${note.summary}</p>
        <h4>Key Points</h4>
        <ul>
            ${note.bullets.map((point) => `<li>${point}</li>`).join("")}
        </ul>
        <h4>Keywords</h4>
        <p>${keywords.length ? keywords.join(", ") : "No keywords detected yet."}</p>
    `;

    document.getElementById("notesOutput").innerHTML = output;

    addActivity("Generated study notes");
    showToast("Notes generated. +20 XP.");
    saveCurrentUser(state.user);
});

document.getElementById("createCardsButton").addEventListener("click", () => {
    const latestNote = state.user.notes[0];

    if (!latestNote) {
        showToast("Generate notes first.");
        return;
    }

    const cards = latestNote.bullets.slice(0, 6).map((point, index) => {
        const keyword = latestNote.keywords[index] || `Concept ${index + 1}`;

        return {
            id: Date.now() + index,
            question: `Explain: ${keyword}`,
            answer: point,
            reviewed: false
        };
    });

    state.user.flashcards = [...cards, ...state.user.flashcards];
    state.user.stats.xp += 15;

    state.currentCardIndex = 0;
    state.cardFlipped = false;

    addActivity("Created flashcards");
    showToast(`${cards.length} flashcards created. +15 XP.`);
    saveCurrentUser(state.user);
});

document.getElementById("resetCardsButton").addEventListener("click", () => {
    state.user.flashcards = [];
    state.user.stats.flashcardsReviewed = 0;
    state.currentCardIndex = 0;
    state.cardFlipped = false;

    addActivity("Cleared flashcards");
    saveCurrentUser(state.user);
});

function updateCardCounter() {
    document.getElementById("cardCounter").textContent = `${state.user.flashcards.length} cards`;
}

function renderFlashcard() {
    const cards = state.user.flashcards;
    const label = document.getElementById("flashLabel");
    const question = document.getElementById("flashQuestion");
    const answer = document.getElementById("flashAnswer");
    const explain = document.getElementById("wrongExplain");

    explain.classList.add("hidden");

    if (!cards.length) {
        label.textContent = "No card yet";
        question.textContent = "Create flashcards first.";
        answer.textContent = "Your answer will show here.";
        return;
    }

    const card = cards[state.currentCardIndex % cards.length];

    label.textContent = `Card ${state.currentCardIndex + 1} of ${cards.length}`;
    question.textContent = card.question;
    answer.textContent = state.cardFlipped ? card.answer : "Click Flip to reveal the answer.";
}

document.getElementById("flipCardButton").addEventListener("click", () => {
    if (!state.user.flashcards.length) return;

    state.cardFlipped = !state.cardFlipped;
    renderFlashcard();
});

document.getElementById("rightCardButton").addEventListener("click", () => {
    if (!state.user.flashcards.length) return;

    state.user.stats.flashcardsReviewed += 1;
    state.user.stats.xp += 5;

    state.currentCardIndex = (state.currentCardIndex + 1) % state.user.flashcards.length;
    state.cardFlipped = false;

    addActivity("Reviewed a flashcard correctly");
    showToast("+5 XP. Correct.");
    saveCurrentUser(state.user);
});

document.getElementById("wrongCardButton").addEventListener("click", () => {
    if (!state.user.flashcards.length) return;

    const card = state.user.flashcards[state.currentCardIndex];
    const explain = document.getElementById("wrongExplain");

    explain.innerHTML = `
        <strong>Review tip:</strong>
        You missed this card. Read the answer again, then say it out loud without looking.
        <br><br>
        <strong>Correct idea:</strong> ${card.answer}
    `;

    explain.classList.remove("hidden");
});

document.getElementById("startQuizButton").addEventListener("click", () => {
    if (!state.user.flashcards.length) {
        showToast("Create flashcards first.");
        return;
    }

    state.quizActive = true;
    state.quizIndex = 0;
    state.quizScore = 0;

    renderQuiz();
});

function renderQuiz() {
    const cards = state.user.flashcards;

    if (!state.quizActive || !cards.length) {
        document.getElementById("quizTitle").textContent = "Quiz not started";
        document.getElementById("quizProgress").textContent = `0 / ${cards.length}`;
        document.getElementById("quizQuestion").textContent = "Create flashcards first, then start a quiz.";
        return;
    }

    const card = cards[state.quizIndex];

    document.getElementById("quizTitle").textContent = "Active Quiz";
    document.getElementById("quizProgress").textContent = `${state.quizIndex + 1} / ${cards.length}`;
    document.getElementById("quizQuestion").textContent = card.question;
    document.getElementById("quizAnswer").value = "";
    document.getElementById("quizFeedback").classList.add("hidden");
}

document.getElementById("submitQuizButton").addEventListener("click", () => {
    if (!state.quizActive || !state.user.flashcards.length) {
        showToast("Start a quiz first.");
        return;
    }

    const cards = state.user.flashcards;
    const card = cards[state.quizIndex];
    const answer = document.getElementById("quizAnswer").value.trim().toLowerCase();

    const importantWords = card.answer
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((word) => word.length > 5)
        .slice(0, 3);

    const correct = importantWords.some((word) => answer.includes(word));

    const feedback = document.getElementById("quizFeedback");

    if (correct) {
        state.quizScore += 1;
        feedback.innerHTML = `<strong>Correct.</strong> Good job. You included an important idea.`;
    } else {
        feedback.innerHTML = `
            <strong>Not quite.</strong>
            The correct idea was:
            <br><br>
            ${card.answer}
            <br><br>
            Try remembering the main keyword first, then explain it in your own words.
        `;
    }

    feedback.classList.remove("hidden");

    setTimeout(() => {
        state.quizIndex += 1;

        if (state.quizIndex >= cards.length) {
            state.quizActive = false;
            state.user.stats.quizzesTaken += 1;
            state.user.stats.xp += state.quizScore * 10;
            state.user.stats.trophies += 1;

            addActivity(`Completed quiz: ${state.quizScore}/${cards.length}`);
            showToast(`Quiz complete. Score: ${state.quizScore}/${cards.length}.`);

            saveCurrentUser(state.user);
            renderQuiz();
            return;
        }

        renderQuiz();
    }, 1300);
});

document.querySelectorAll("[data-pack]").forEach((button) => {
    button.addEventListener("click", () => {
        if (state.user.stats.trophies < 1) {
            showToast("You need 1 trophy to open a pack.");
            return;
        }

        const rewards = [
            { text: "+25 XP", apply: () => state.user.stats.xp += 25 },
            { text: "+1 AI Credit", apply: () => state.user.stats.aiCredits += 1 },
            { text: "+1 Trophy Back", apply: () => state.user.stats.trophies += 1 },
            { text: "+0.2 Study Hours", apply: () => state.user.stats.studyHours += 0.2 }
        ];

        state.user.stats.trophies -= 1;

        const reward = rewards[Math.floor(Math.random() * rewards.length)];
        reward.apply();

        addActivity(`Opened pack and won ${reward.text}`);
        showToast(`Pack opened: ${reward.text}`);
        saveCurrentUser(state.user);
    });
});

document.getElementById("saveSettingsButton").addEventListener("click", () => {
    const name = document.getElementById("settingsName").value.trim();

    if (!name) {
        showToast("Name cannot be empty.");
        return;
    }

    state.user.name = name;
    addActivity("Updated profile settings");
    saveCurrentUser(state.user);
    showToast("Settings saved.");
});

document.getElementById("settingsThemeButton").addEventListener("click", toggleTheme);

document.getElementById("resetAccountButton").addEventListener("click", () => {
    const confirmReset = confirm("Reset all StudySnap prototype data for this account?");

    if (!confirmReset) return;

    state.user.stats = {
        streak: 0,
        xp: 0,
        goalsCompleted: 0,
        goalsTotal: 0,
        flashcardsReviewed: 0,
        studyHours: 0,
        notesCreated: 0,
        quizzesTaken: 0,
        trophies: 0,
        aiCredits: 5
    };

    state.user.notes = [];
    state.user.flashcards = [];
    state.user.activity = [];

    saveCurrentUser(state.user);
    showToast("Account data reset.");
});

document.getElementById("logoutButton").addEventListener("click", () => {
    localStorage.removeItem(SESSION_KEY);
    state.user = null;
    appView.classList.add("hidden");
    authView.classList.remove("hidden");
    showToast("Logged out.");
});

document.querySelectorAll(".tilt-card").forEach((card) => {
    card.addEventListener("mousemove", (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;

        card.style.transform = `perspective(1000px) rotateX(${y * -5}deg) rotateY(${x * 6}deg)`;
    });

    card.addEventListener("mouseleave", () => {
        card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
    });
});

document.addEventListener("mousemove", (event) => {
    const x = event.clientX / window.innerWidth;
    const y = event.clientY / window.innerHeight;

    document.documentElement.style.setProperty("--mouse-x", x);
    document.documentElement.style.setProperty("--mouse-y", y);
});

boot();