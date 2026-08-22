"use strict";

const form = document.getElementById("calculatorForm");
const resetBtn = document.getElementById("resetBtn");
const themeBtn = document.getElementById("themeBtn");
const exportBtn = document.getElementById("exportBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

const errorMessage = document.getElementById("errorMessage");
const resultsSection = document.getElementById("resultsSection");
const historyBody = document.getElementById("historyBody");
const calculationDate = document.getElementById("calculationDate");

const STORAGE_KEY = "electrocalc_history";
const THEME_KEY = "electrocalc_theme";

let history = loadHistory();

function getNumber(id) {
    return Number.parseFloat(document.getElementById(id).value);
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

function showError(message = "") {
    errorMessage.textContent = message;
}

function validateInputs(voltage, current, resistance, powerFactor) {
    if (
        !Number.isFinite(voltage) ||
        !Number.isFinite(current) ||
        !Number.isFinite(resistance) ||
        !Number.isFinite(powerFactor)
    ) {
        return "Veuillez renseigner correctement tous les champs.";
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

    calculationDate.textContent = new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(new Date());

    resultsSection.classList.remove("hidden");
}

function saveHistory() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function loadHistory() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}

function addHistory(values) {
    history.unshift({
        date: new Date().toISOString(),
        voltage: values.voltage,
        current: values.current,
        resistance: values.resistance,
        power: values.activePower
    });

    history = history.slice(0, 20);
    saveHistory();
    renderHistory();
}

function renderHistory() {
    if (history.length === 0) {
        historyBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-history">
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

        return `
            <tr>
                <td>${date}</td>
                <td>${formatNumber(item.voltage)} V</td>
                <td>${formatNumber(item.current)} A</td>
                <td>${formatNumber(item.resistance)} Ω</td>
                <td>${formatNumber(item.power)} W</td>
            </tr>
        `;
    }).join("");
}

function exportHistory() {
    if (history.length === 0) {
        showError("L’historique est vide.");
        return;
    }

    const headers = [
        "Date",
        "Tension (V)",
        "Courant (A)",
        "Résistance (Ohm)",
        "Puissance active (W)"
    ];

    const rows = history.map(item => [
        new Date(item.date).toLocaleString("fr-FR"),
        item.voltage,
        item.current,
        item.resistance,
        item.power
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
}

function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);

    if (savedTheme === "dark") {
        document.body.classList.add("dark");
        themeBtn.innerHTML = `<i class="fa-solid fa-sun"></i>`;
    }
}

form.addEventListener("submit", event => {
    event.preventDefault();
    showError("");

    const voltage = getNumber("voltage");
    const current = getNumber("current");
    const resistance = getNumber("resistance");
    const powerFactor = getNumber("powerFactor");

    const validationError = validateInputs(
        voltage,
        current,
        resistance,
        powerFactor
    );

    if (validationError) {
        showError(validationError);
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
    } catch (error) {
        showError(error.message);
    }
});

resetBtn.addEventListener("click", () => {
    form.reset();
    document.getElementById("powerFactor").value = "1";
    resultsSection.classList.add("hidden");
    showError("");
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
});

exportBtn.addEventListener("click", exportHistory);

themeBtn.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");

    localStorage.setItem(
        THEME_KEY,
        isDark ? "dark" : "light"
    );

    themeBtn.innerHTML = isDark
        ? `<i class="fa-solid fa-sun"></i>`
        : `<i class="fa-solid fa-moon"></i>`;
});

document.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", () => {
        showError("");
    });
});

loadTheme();
renderHistory();


const menuBtn = document.getElementById("menuBtn");
const mainNav = document.getElementById("mainNav");
const navLinks = document.querySelectorAll(".nav-link");

if (menuBtn && mainNav) {
    menuBtn.addEventListener("click", () => {
        const isOpen = mainNav.classList.toggle("open");

        menuBtn.setAttribute(
            "aria-expanded",
            String(isOpen)
        );

        menuBtn.setAttribute(
            "aria-label",
            isOpen ? "Fermer le menu" : "Ouvrir le menu"
        );

        menuBtn.innerHTML = isOpen
            ? `<i class="fa-solid fa-xmark" aria-hidden="true"></i>`
            : `<i class="fa-solid fa-bars" aria-hidden="true"></i>`;
    });
}

navLinks.forEach(link => {
    link.addEventListener("click", () => {
        navLinks.forEach(item => {
            item.classList.remove("active");
        });

        link.classList.add("active");

        if (mainNav) {
            mainNav.classList.remove("open");
        }

        if (menuBtn) {
            menuBtn.setAttribute("aria-expanded", "false");
            menuBtn.setAttribute("aria-label", "Ouvrir le menu");
            menuBtn.innerHTML =
                `<i class="fa-solid fa-bars" aria-hidden="true"></i>`;
        }
    });
});