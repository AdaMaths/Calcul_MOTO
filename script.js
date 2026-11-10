"use strict";

/* ==========================================================
   ElectroCalc Pro — script.js (v2.3)
   Formules et données identiques à la v2.2.
   Améliorations : champ vide accepté en loi d'Ohm, réinitialisation
   complète des 5 calculateurs, statut, navigation clavier des onglets,
   thème automatique, défilement vers les résultats, mode hors ligne.
   ========================================================== */

const form = document.getElementById("calculatorForm");
const resetBtn = document.getElementById("resetBtn");
const themeBtn = document.getElementById("themeBtn");
const exportBtn = document.getElementById("exportBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

const errorMessage = document.getElementById("errorMessage");
const resultsSection = document.getElementById("resultsSection");
const historyBody = document.getElementById("historyBody");
const calculationDate = document.getElementById("calculationDate");
const pedagogicalMode = document.getElementById("pedagogicalMode");
const statusText = document.getElementById("statusText");

const STORAGE_KEY = "electrocalc_history";
const THEME_KEY = "electrocalc_theme";

let history = loadHistory();
let statusTimer = null;

/* ---------- Utilitaires ---------- */

function getNumber(id) {
    return Number.parseFloat(document.getElementById(id).value);
}

/* Champ vide = grandeur inconnue (0), sinon la valeur saisie */
function getNumberOrZero(id) {
    const raw = document.getElementById(id).value;
    return raw.trim() === "" ? 0 : Number.parseFloat(raw);
}

function formatNumber(value, decimals = 2) {
    if (!Number.isFinite(value)) {
        return "—";
    }

    return new Intl.NumberFormat("fr-FR", {
        maximumFractionDigits: decimals,
        minimumFractionDigits: 0
    }).format(value);
}

function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

function showError(message = "") {
    errorMessage.textContent = message;
}

function setStatus(message, isTemporary = true) {
    if (!statusText) {
        return;
    }

    statusText.textContent = message;
    clearTimeout(statusTimer);

    if (isTemporary) {
        statusTimer = setTimeout(() => {
            statusText.textContent = "Prêt";
        }, 3000);
    }
}

function showSteps(elementId, title, lines) {
    const box = document.getElementById(elementId);
    if (!box) {
        return;
    }

    box.innerHTML = `<span class="step-title">${title}</span>` +
        lines.map(line => `<span class="step-line">${line}</span>`).join("");

    box.classList.add("visible");
}

function hideSteps(elementId) {
    const box = document.getElementById(elementId);
    if (box) {
        box.classList.remove("visible");
        box.innerHTML = "";
    }
}

function scrollToElement(element) {
    if (!element) {
        return;
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "nearest"
    });
}

/* ==========================================================
   Loi d'Ohm & puissance
   ========================================================== */

function validateInputs(voltage, current, resistance, powerFactor) {
    if (
        !Number.isFinite(voltage) ||
        !Number.isFinite(current) ||
        !Number.isFinite(resistance) ||
        !Number.isFinite(powerFactor)
    ) {
        return "Veuillez renseigner correctement les champs.";
    }

    if (voltage < 0 || current < 0 || resistance < 0) {
        return "La tension, le courant et la résistance doivent être positifs.";
    }

    if (powerFactor <= 0 || powerFactor > 1) {
        return "Le facteur de puissance doit être compris entre 0 et 1.";
    }

    if (voltage === 0 && current === 0 && resistance === 0) {
        return "Veuillez saisir au moins une valeur électrique.";
    }

    return "";
}

function calculateValues(voltage, current, resistance, powerFactor) {
    let calculatedVoltage = voltage;
    let calculatedCurrent = current;
    let calculatedResistance = resistance;

    const numberOfEmptyFields = [
        voltage,
        current,
        resistance
    ].filter(value => value === 0).length;

    if (numberOfEmptyFields > 1) {
        throw new Error(
            "Saisissez au moins deux valeurs parmi la tension, le courant et la résistance."
        );
    }

    if (voltage === 0) {
        calculatedVoltage = resistance * current;
    }

    if (current === 0) {
        calculatedCurrent = voltage / resistance;
    }

    if (resistance === 0) {
        calculatedResistance = voltage / current;
    }

    const apparentPower = calculatedVoltage * calculatedCurrent;
    const activePower = apparentPower * powerFactor;
    const reactivePower = Math.sqrt(
        Math.max(0, apparentPower ** 2 - activePower ** 2)
    );

    return {
        voltage: calculatedVoltage,
        current: calculatedCurrent,
        resistance: calculatedResistance,
        powerFactor,
        apparentPower,
        activePower,
        reactivePower
    };
}

function displayResults(values) {
    document.getElementById("resultVoltage").textContent =
        `${formatNumber(values.voltage)} V`;

    document.getElementById("resultCurrent").textContent =
        `${formatNumber(values.current)} A`;

    document.getElementById("resultResistance").textContent =
        `${formatNumber(values.resistance)} Ω`;

    document.getElementById("resultPower").textContent =
        `${formatNumber(values.activePower)} W`;

    document.getElementById("resultApparentPower").textContent =
        `${formatNumber(values.apparentPower)} VA`;

    document.getElementById("resultReactivePower").textContent =
        `${formatNumber(values.reactivePower)} var`;

    document.getElementById("resultPowerFactor").textContent =
        formatNumber(values.powerFactor, 2);

    const now = new Date();
    calculationDate.textContent = new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(now);
    calculationDate.setAttribute("datetime", now.toISOString());

    const gaugeFill = document.getElementById("gaugeFill");
    const gaugePercent = document.getElementById("gaugePercent");
    if (gaugeFill && gaugePercent) {
        const pct = Math.round(values.powerFactor * 100);
        gaugeFill.style.width = `${pct}%`;
        gaugePercent.textContent = `${pct} %`;
    }

    if (pedagogicalMode && pedagogicalMode.checked) {
        showSteps("stepsOhm", "Étapes du calcul", [
            `U = ${formatNumber(values.voltage)} V, I = ${formatNumber(values.current)} A, R = ${formatNumber(values.resistance)} Ω`,
            `S = U × I = ${formatNumber(values.apparentPower)} VA`,
            `P = S × cos φ = ${formatNumber(values.apparentPower)} × ${formatNumber(values.powerFactor, 2)} = ${formatNumber(values.activePower)} W`,
            `Q = √(S² − P²) = ${formatNumber(values.reactivePower)} var`
        ]);
    } else {
        hideSteps("stepsOhm");
    }

    resultsSection.classList.remove("hidden");
}

/* ==========================================================
   Historique
   ========================================================== */

function saveHistory() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
        /* stockage indisponible (navigation privée, quota…) */
    }
}

function loadHistory() {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

function addHistory(values, type = "Loi d’Ohm") {
    history.unshift({
        date: new Date().toISOString(),
        type,
        voltage: values.voltage ?? null,
        current: values.current ?? null,
        resistance: values.resistance ?? null,
        power: values.activePower ?? values.power ?? null
    });

    history = history.slice(0, 20);
    saveHistory();
    renderHistory();
}

function renderHistory() {
    if (history.length === 0) {
        historyBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-history">
                    Aucun calcul enregistré.
                </td>
            </tr>
        `;

        return;
    }

    historyBody.innerHTML = history.map(item => {
        const date = new Intl.DateTimeFormat("fr-FR", {
            dateStyle: "short",
            timeStyle: "short"
        }).format(new Date(item.date));

        const cell = (value, unit) =>
            value === null || value === undefined
                ? "—"
                : `${formatNumber(value)} ${unit}`;

        return `
            <tr>
                <td>${escapeHtml(item.type ?? "Loi d’Ohm")}</td>
                <td>${date}</td>
                <td>${cell(item.voltage, "V")}</td>
                <td>${cell(item.current, "A")}</td>
                <td>${cell(item.resistance, "Ω")}</td>
                <td>${cell(item.power, "W")}</td>
            </tr>
        `;
    }).join("");
}

function exportHistory() {
    if (history.length === 0) {
        showError("L’historique est vide.");
        setStatus("Historique vide");
        return;
    }

    const headers = [
        "Type",
        "Date",
        "Tension (V)",
        "Courant (A)",
        "Résistance (Ohm)",
        "Puissance active (W)"
    ];

    const rows = history.map(item => [
        item.type ?? "Loi d’Ohm",
        new Date(item.date).toLocaleString("fr-FR"),
        item.voltage ?? "",
        item.current ?? "",
        item.resistance ?? "",
        item.power ?? ""
    ]);

    const csvContent = [
        headers,
        ...rows
    ]
        .map(row =>
            row.map(value => `"${String(value).replaceAll('"', '""')}"`)
                .join(";")
        )
        .join("\n");

    const blob = new Blob(
        ["\ufeff" + csvContent],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "electrocalc-historique.csv";
    link.click();

    URL.revokeObjectURL(url);
    showError("");
    setStatus("Historique exporté");
}

/* ==========================================================
   Thème
   ========================================================== */

function applyTheme(isDark) {
    document.body.classList.toggle("dark", isDark);

    themeBtn.innerHTML = isDark
        ? `<i class="fa-solid fa-sun" aria-hidden="true"></i>`
        : `<i class="fa-solid fa-moon" aria-hidden="true"></i>`;

    themeBtn.setAttribute("aria-pressed", String(isDark));
}

function loadTheme() {
    let savedTheme = null;

    try {
        savedTheme = localStorage.getItem(THEME_KEY);
    } catch {
        savedTheme = null;
    }

    if (savedTheme === "dark" || savedTheme === "light") {
        applyTheme(savedTheme === "dark");
        return;
    }

    /* Aucun choix enregistré : suivre le réglage de l'appareil */
    applyTheme(window.matchMedia("(prefers-color-scheme: dark)").matches);
}

themeBtn.addEventListener("click", () => {
    const isDark = !document.body.classList.contains("dark");
    applyTheme(isDark);

    try {
        localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
    } catch {
        /* ignoré */
    }
});

/* ==========================================================
   Événements — loi d'Ohm
   ========================================================== */

form.addEventListener("submit", event => {
    event.preventDefault();
    showError("");

    /* Champ vide = inconnue : elle sera calculée */
    const voltage = getNumberOrZero("voltage");
    const current = getNumberOrZero("current");
    const resistance = getNumberOrZero("resistance");
    const powerFactor = getNumber("powerFactor");

    const validationError = validateInputs(
        voltage,
        current,
        resistance,
        powerFactor
    );

    if (validationError) {
        showError(validationError);
        setStatus("Vérifiez les champs");
        return;
    }

    try {
        const values = calculateValues(
            voltage,
            current,
            resistance,
            powerFactor
        );

        displayResults(values);
        addHistory(values);
        setStatus("Calcul effectué");
        scrollToElement(resultsSection);
    } catch (error) {
        showError(error.message);
        setStatus("Vérifiez les champs");
    }
});

resetBtn.addEventListener("click", () => {
    form.reset();
    document.getElementById("powerFactor").value = "1";
    resultsSection.classList.add("hidden");
    hideSteps("stepsOhm");
    showError("");
    setStatus("Prêt", false);
});

clearHistoryBtn.addEventListener("click", () => {
    if (history.length === 0) {
        return;
    }

    const confirmed = window.confirm(
        "Voulez-vous vraiment supprimer tout l’historique ?"
    );

    if (!confirmed) {
        return;
    }

    history = [];
    saveHistory();
    renderHistory();
    setStatus("Historique effacé");
});

exportBtn.addEventListener("click", exportHistory);

document.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", () => {
        showError("");
        ["errorTriphase", "errorMoteur", "errorTransfo", "errorCouplage"].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = "";
            }
        });
    });
});

/* ==========================================================
   Menu mobile & navigation
   ========================================================== */

const menuBtn = document.getElementById("menuBtn");
const mainNav = document.getElementById("mainNav");
const navLinks = document.querySelectorAll(".nav-link");

function closeMenu() {
    if (mainNav) {
        mainNav.classList.remove("open");
    }

    if (menuBtn) {
        menuBtn.setAttribute("aria-expanded", "false");
        menuBtn.setAttribute("aria-label", "Ouvrir le menu");
        menuBtn.innerHTML =
            `<i class="fa-solid fa-bars" aria-hidden="true"></i>`;
    }
}

if (menuBtn && mainNav) {
    menuBtn.addEventListener("click", () => {
        const isOpen = mainNav.classList.toggle("open");

        menuBtn.setAttribute("aria-expanded", String(isOpen));
        menuBtn.setAttribute(
            "aria-label",
            isOpen ? "Fermer le menu" : "Ouvrir le menu"
        );

        menuBtn.innerHTML = isOpen
            ? `<i class="fa-solid fa-xmark" aria-hidden="true"></i>`
            : `<i class="fa-solid fa-bars" aria-hidden="true"></i>`;
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeMenu();
        }
    });
}

function setActiveNav(hash) {
    navLinks.forEach(item => {
        item.classList.toggle("active", item.getAttribute("href") === hash);
    });
}

navLinks.forEach(link => {
    link.addEventListener("click", () => {
        setActiveNav(link.getAttribute("href"));
        closeMenu();
    });
});

/* Met en surbrillance la rubrique visible pendant le défilement */
if ("IntersectionObserver" in window) {
    const sections = ["accueil", "calculateur", "formules", "historique"]
        .map(id => document.getElementById(id))
        .filter(Boolean);

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                setActiveNav(`#${entry.target.id}`);
            }
        });
    }, { rootMargin: "-35% 0px -55% 0px" });

    sections.forEach(section => observer.observe(section));
}

/* ==========================================================
   Onglets des calculateurs (souris + clavier)
   ========================================================== */

const calcTabs = Array.from(document.querySelectorAll(".calc-tab"));
const calcPanels = document.querySelectorAll(".calc-panel");

function activateTab(tab, moveFocus = false) {
    calcTabs.forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
        t.setAttribute("tabindex", "-1");
    });

    calcPanels.forEach(p => p.classList.remove("active"));

    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");
    tab.setAttribute("tabindex", "0");

    const panel = document.getElementById(tab.dataset.panel);
    if (panel) {
        panel.classList.add("active");
    }

    if (moveFocus) {
        tab.focus();
    }
}

calcTabs.forEach((tab, index) => {
    tab.setAttribute("aria-controls", tab.dataset.panel);
    tab.setAttribute("tabindex", tab.classList.contains("active") ? "0" : "-1");

    tab.addEventListener("click", () => activateTab(tab));

    tab.addEventListener("keydown", event => {
        let target = null;

        if (event.key === "ArrowRight") {
            target = calcTabs[(index + 1) % calcTabs.length];
        } else if (event.key === "ArrowLeft") {
            target = calcTabs[(index - 1 + calcTabs.length) % calcTabs.length];
        } else if (event.key === "Home") {
            target = calcTabs[0];
        } else if (event.key === "End") {
            target = calcTabs[calcTabs.length - 1];
        }

        if (target) {
            event.preventDefault();
            activateTab(target, true);
        }
    });
});

/* ==========================================================
   Mode pédagogique
   ========================================================== */

if (pedagogicalMode) {
    pedagogicalMode.addEventListener("change", () => {
        if (!pedagogicalMode.checked) {
            [
                "stepsOhm", "stepsTriphase", "stepsMoteur",
                "stepsTransfo", "stepsCouplage"
            ].forEach(hideSteps);
        }
    });
}

/* ==========================================================
   Réinitialisation des calculateurs secondaires
   ========================================================== */

[
    ["formTriphase", "resultsTriphase", "stepsTriphase", "errorTriphase", true],
    ["formMoteur", "resultsMoteur", "stepsMoteur", "errorMoteur", false],
    ["formTransfo", "resultsTransfo", "stepsTransfo", "errorTransfo", false],
    ["formCouplage", "resultsCouplage", "stepsCouplage", "errorCouplage", false]
].forEach(([formId, resultsId, stepsId, errorId, restoreCos]) => {
    const formEl = document.getElementById(formId);
    if (!formEl) {
        return;
    }

    formEl.addEventListener("reset", () => {
        document.getElementById(resultsId).classList.add("hidden");
        document.getElementById(errorId).textContent = "";
        hideSteps(stepsId);
        setStatus("Prêt", false);

        /* Le « reset » natif vide les champs : on remet les valeurs par défaut */
        if (restoreCos) {
            setTimeout(() => {
                document.getElementById("triCos").value = "0.85";
            }, 0);
        }
    });
});

/* ==========================================================
   Calculateur triphasé
   ========================================================== */
const formTriphase = document.getElementById("formTriphase");

if (formTriphase) {
    formTriphase.addEventListener("submit", event => {
        event.preventDefault();

        const errorEl = document.getElementById("errorTriphase");
        const resultsEl = document.getElementById("resultsTriphase");
        errorEl.textContent = "";

        const u = Number.parseFloat(document.getElementById("triU").value);
        const i = Number.parseFloat(document.getElementById("triI").value);
        const cos = Number.parseFloat(document.getElementById("triCos").value);

        if (!Number.isFinite(u) || !Number.isFinite(i) || !Number.isFinite(cos)) {
            errorEl.textContent = "Veuillez renseigner la tension, le courant et le facteur de puissance.";
            resultsEl.classList.add("hidden");
            return;
        }

        if (u <= 0 || i <= 0 || cos <= 0 || cos > 1) {
            errorEl.textContent = "Vérifiez vos valeurs : U et I doivent être positifs, cos φ compris entre 0 et 1.";
            resultsEl.classList.add("hidden");
            return;
        }

        const s = Math.sqrt(3) * u * i;
        const p = s * cos;
        const q = Math.sqrt(Math.max(0, s ** 2 - p ** 2));
        const iPhaseY = i;

        document.getElementById("triS").textContent = `${formatNumber(s)} VA`;
        document.getElementById("triP").textContent = `${formatNumber(p)} W`;
        document.getElementById("triQ").textContent = `${formatNumber(q)} var`;
        document.getElementById("triIphase").textContent = `${formatNumber(iPhaseY)} A`;
        resultsEl.classList.remove("hidden");

        if (pedagogicalMode && pedagogicalMode.checked) {
            showSteps("stepsTriphase", "Étapes du calcul", [
                `S = √3 × U × I = √3 × ${formatNumber(u)} × ${formatNumber(i)} = ${formatNumber(s)} VA`,
                `P = S × cos φ = ${formatNumber(s)} × ${formatNumber(cos, 2)} = ${formatNumber(p)} W`,
                `Q = √(S² − P²) = ${formatNumber(q)} var`,
                `En couplage étoile, I par enroulement = I ligne = ${formatNumber(iPhaseY)} A`
            ]);
        } else {
            hideSteps("stepsTriphase");
        }

        addHistory({ voltage: u, current: i, resistance: null, power: p }, "Triphasé");
        setStatus("Calcul effectué");
    });
}

/* ==========================================================
   Calculateur moteur asynchrone
   ========================================================== */
const formMoteur = document.getElementById("formMoteur");

if (formMoteur) {
    formMoteur.addEventListener("submit", event => {
        event.preventDefault();

        const errorEl = document.getElementById("errorMoteur");
        const resultsEl = document.getElementById("resultsMoteur");
        errorEl.textContent = "";

        const f = Number.parseFloat(document.getElementById("motF").value);
        const p = Number.parseInt(document.getElementById("motP").value, 10);
        const nInput = document.getElementById("motN").value;
        const puisInput = document.getElementById("motPuis").value;
        const n = nInput === "" ? null : Number.parseFloat(nInput);
        const puissance = puisInput === "" ? null : Number.parseFloat(puisInput);

        if (!Number.isFinite(f) || !Number.isInteger(p) || p < 1) {
            errorEl.textContent = "Veuillez renseigner la fréquence et un nombre entier de paires de pôles (≥ 1).";
            resultsEl.classList.add("hidden");
            return;
        }

        if (f <= 0) {
            errorEl.textContent = "La fréquence doit être positive.";
            resultsEl.classList.add("hidden");
            return;
        }

        const ns = (60 * f) / p;
        let glissement = null;
        let omega = null;
        let couple = null;
        const steps = [`Ns = 60 × f / p = 60 × ${formatNumber(f)} / ${p} = ${formatNumber(ns)} tr/min`];

        if (n !== null) {
            if (!Number.isFinite(n) || n < 0 || n > ns) {
                errorEl.textContent = "La vitesse mesurée doit être positive et inférieure ou égale à la vitesse de synchronisme.";
                resultsEl.classList.add("hidden");
                return;
            }

            glissement = (ns - n) / ns;
            omega = (2 * Math.PI * n) / 60;
            steps.push(`g = (Ns − N) / Ns = (${formatNumber(ns)} − ${formatNumber(n)}) / ${formatNumber(ns)} = ${formatNumber(glissement * 100)} %`);
            steps.push(`ω = 2π × N / 60 = ${formatNumber(omega)} rad/s`);

            if (puissance !== null && Number.isFinite(puissance) && puissance > 0 && n > 0) {
                couple = (9550 * puissance) / n;
                steps.push(`C ≈ 9550 × P(kW) / N = 9550 × ${formatNumber(puissance)} / ${formatNumber(n)} = ${formatNumber(couple)} N·m`);
            }
        }

        document.getElementById("motNs").textContent = `${formatNumber(ns)} tr/min`;
        document.getElementById("motG").textContent = glissement !== null ? `${formatNumber(glissement * 100)} %` : "—";
        document.getElementById("motC").textContent = couple !== null ? `${formatNumber(couple)} N·m` : "—";
        document.getElementById("motOmega").textContent = omega !== null ? `${formatNumber(omega)} rad/s` : "—";
        resultsEl.classList.remove("hidden");

        if (pedagogicalMode && pedagogicalMode.checked) {
            showSteps("stepsMoteur", "Étapes du calcul", steps);
        } else {
            hideSteps("stepsMoteur");
        }

        addHistory({ voltage: null, current: null, resistance: null, power: couple }, "Moteur asynchrone");
        setStatus("Calcul effectué");
    });
}

/* ==========================================================
   Calculateur transformateur
   ========================================================== */
const formTransfo = document.getElementById("formTransfo");

if (formTransfo) {
    formTransfo.addEventListener("submit", event => {
        event.preventDefault();

        const errorEl = document.getElementById("errorTransfo");
        const resultsEl = document.getElementById("resultsTransfo");
        errorEl.textContent = "";

        const u1 = Number.parseFloat(document.getElementById("trU1").value);
        const u2 = Number.parseFloat(document.getElementById("trU2").value);
        const i1Input = document.getElementById("trI1").value;
        const i1 = i1Input === "" ? null : Number.parseFloat(i1Input);

        if (!Number.isFinite(u1) || !Number.isFinite(u2) || u1 <= 0 || u2 <= 0) {
            errorEl.textContent = "Veuillez renseigner des tensions primaire et secondaire positives.";
            resultsEl.classList.add("hidden");
            return;
        }

        const m = u2 / u1;
        const steps = [`m = U2 / U1 = ${formatNumber(u2)} / ${formatNumber(u1)} = ${formatNumber(m, 4)}`];
        let i2 = null;

        if (i1 !== null) {
            if (!Number.isFinite(i1) || i1 < 0) {
                errorEl.textContent = "Le courant primaire doit être positif.";
                resultsEl.classList.add("hidden");
                return;
            }

            i2 = i1 / m;
            steps.push(`I2 = I1 / m = ${formatNumber(i1)} / ${formatNumber(m, 4)} = ${formatNumber(i2)} A (transformateur idéal)`);
        }

        document.getElementById("trM").textContent = formatNumber(m, 4);
        document.getElementById("trI2").textContent = i2 !== null ? `${formatNumber(i2)} A` : "—";
        resultsEl.classList.remove("hidden");

        if (pedagogicalMode && pedagogicalMode.checked) {
            showSteps("stepsTransfo", "Étapes du calcul", steps);
        } else {
            hideSteps("stepsTransfo");
        }

        addHistory({ voltage: u1, current: i2, resistance: null, power: null }, "Transformateur");
        setStatus("Calcul effectué");
    });
}

/* ==========================================================
   Calculateur couplage étoile / triangle
   ========================================================== */
const formCouplage = document.getElementById("formCouplage");

if (formCouplage) {
    formCouplage.addEventListener("submit", event => {
        event.preventDefault();

        const errorEl = document.getElementById("errorCouplage");
        const resultsEl = document.getElementById("resultsCouplage");
        errorEl.textContent = "";

        const u = Number.parseFloat(document.getElementById("coupU").value);
        const iInput = document.getElementById("coupI").value;
        const i = iInput === "" ? null : Number.parseFloat(iInput);

        if (!Number.isFinite(u) || u <= 0) {
            errorEl.textContent = "Veuillez renseigner une tension réseau positive.";
            resultsEl.classList.add("hidden");
            return;
        }

        const uY = u / Math.sqrt(3);
        const uD = u;
        const steps = [
            `Étoile : U enroulement = U / √3 = ${formatNumber(u)} / 1,73 = ${formatNumber(uY)} V`,
            `Triangle : U enroulement = U = ${formatNumber(uD)} V`
        ];

        let iY = null;
        let iD = null;

        if (i !== null) {
            if (!Number.isFinite(i) || i < 0) {
                errorEl.textContent = "Le courant de ligne doit être positif.";
                resultsEl.classList.add("hidden");
                return;
            }

            iY = i;
            iD = i / Math.sqrt(3);
            steps.push(`Étoile : I enroulement = I ligne = ${formatNumber(iY)} A`);
            steps.push(`Triangle : I enroulement = I / √3 = ${formatNumber(i)} / 1,73 = ${formatNumber(iD)} A`);
        }

        document.getElementById("coupUY").textContent = `${formatNumber(uY)} V`;
        document.getElementById("coupUD").textContent = `${formatNumber(uD)} V`;
        document.getElementById("coupIY").textContent = iY !== null ? `${formatNumber(iY)} A` : "—";
        document.getElementById("coupID").textContent = iD !== null ? `${formatNumber(iD)} A` : "—";
        resultsEl.classList.remove("hidden");

        if (pedagogicalMode && pedagogicalMode.checked) {
            showSteps("stepsCouplage", "Étapes du calcul", steps);
        } else {
            hideSteps("stepsCouplage");
        }

        addHistory({ voltage: uY, current: iY, resistance: null, power: null }, "Couplage Y/Δ");
        setStatus("Calcul effectué");
    });
}

/* ==========================================================
   Démarrage & mode hors ligne
   ========================================================== */
loadTheme();
renderHistory();

if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(() => {
            /* l'application reste utilisable sans mode hors ligne */
        });
    });
}