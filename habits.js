// --- ESTADO GLOBAL Y CARGA DE DATOS ---
let habits = JSON.parse(localStorage.getItem('habits') || '[]');
let units = JSON.parse(localStorage.getItem('units') || '[]');
let currentHabitId = null;
let currentUnitId = null;
let selectedDate = new Date().toISOString().split('T')[0];
let activeSheet = null;
let previousSheet = null;
let zCounter = 1000;
let ignoreNextClick = false;
let hourEnabled = false;
let intervalEnabled = false;

// Configuración de color de acento (claro y oscuro)
let accentLight = '#0076fa';
let accentDark = '#0076fa';

// Timer state
let timerInterval = null;
let timerStartTime = null;
let timerElapsedSeconds = 0;
let timerRunning = false;
let currentTimerLog = null;

// --- CONFIGURACIONES DE UI (solo ajustes) ---
let uiSettings = {
    fontFeatures: true,      // cv07, cv11
    cardRadius: 26,          // px
    timeSlots: false,        // separadores mañana/tarde/noche
    time24h: true,           // true = 24h, false = 12h AM/PM
    showIcons: true
};

// --- CONTROL DE SCROLL DENTRO DE UNA SHEET (HEADERB) ---
let currentSheetScrollHandler = null;

function setupSheetScrollListener(sheetElement) {
    if (currentSheetScrollHandler) {
        sheetElement.removeEventListener('scroll', currentSheetScrollHandler);
    }
    const headerB = sheetElement.querySelector('.headerB');
    if (!headerB) return;
    
    const onScroll = () => {
        if (sheetElement.scrollTop > 0) {
            headerB.classList.add('minimized');
        } else {
            headerB.classList.remove('minimized');
        }
    };
    
    sheetElement.addEventListener('scroll', onScroll);
    currentSheetScrollHandler = onScroll;
}

function removeSheetScrollListener(sheetElement) {
    if (currentSheetScrollHandler) {
        sheetElement.removeEventListener('scroll', currentSheetScrollHandler);
        currentSheetScrollHandler = null;
    }
}

// --- CONTROL DE SCROLL DEL TOPBAR PRINCIPAL ---
function handleTopbarOnScroll() {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;
    if (window.scrollY > 10) {
        topbar.classList.add('minimized');
    } else {
        topbar.classList.remove('minimized');
    }
}

// Inicializar unidades por defecto
if (units.length === 0) {
    units = [
        { id: genId(), singular: 'vez', plural: 'veces' },
        { id: genId(), singular: 'página', plural: 'págs' },
        { id: genId(), singular: 'hora', plural: 'horas' },
        { id: genId(), singular: 'minuto', plural: 'min' },
        { id: genId(), singular: 'mm', plural: 'mm' },
        { id: genId(), singular: 'cm', plural: 'cm' },
        { id: genId(), singular: 'metro', plural: 'metros' },
        { id: genId(), singular: 'km', plural: 'km' },
        { id: genId(), singular: 'milla', plural: 'millas' },
        { id: genId(), singular: 'yarda', plural: 'yardas' },
        { id: genId(), singular: 'pie', plural: 'pies' },
        { id: genId(), singular: 'pulgada', plural: 'pulgadas' },
        { id: genId(), singular: 'cm²', plural: 'cm²' },
        { id: genId(), singular: 'm²', plural: 'm²' },
        { id: genId(), singular: 'km²', plural: 'km²' },
        { id: genId(), singular: 'mL', plural: 'mL' },
        { id: genId(), singular: 'L', plural: 'L' },
        { id: genId(), singular: 'galón', plural: 'gal' },
        { id: genId(), singular: 'taza', plural: 'tazas' },
        { id: genId(), singular: 'cucharada', plural: 'cucharadas' },
        { id: genId(), singular: 'mg', plural: 'mg' },
        { id: genId(), singular: 'g', plural: 'g' },
        { id: genId(), singular: 'dg', plural: 'dg' },
        { id: genId(), singular: 'kg', plural: 'kg' },
        { id: genId(), singular: 'lb', plural: 'lbs' },
        { id: genId(), singular: 'oz', plural: 'ozs' },
        { id: genId(), singular: 'caloría', plural: 'cal' },
        { id: genId(), singular: 'kCal', plural: 'kCal' },
        { id: genId(), singular: 'par', plural: 'pares' },
        { id: genId(), singular: 'pieza', plural: 'pzs' },
        { id: genId(), singular: 'unidad', plural: 'unidades' },
        { id: genId(), singular: 'porcón', plural: 'porciones' },
        { id: genId(), singular: 'docena', plural: 'docenas' },
        { id: genId(), singular: '%', plural: '%' }
    ];
    localStorage.setItem('units', JSON.stringify(units));
} else {
    const hasMinutes = units.some(u => u.singular === 'minuto');
    const hasHours = units.some(u => u.singular === 'hora');
    if (!hasMinutes) units.push({ id: genId(), singular: 'minuto', plural: 'minutos' });
    if (!hasHours) units.push({ id: genId(), singular: 'hora', plural: 'horas' });
    localStorage.setItem('units', JSON.stringify(units));
}

// Migrar hábitos antiguos
function migrateHabits() {
    let modified = false;
    for (let h of habits) {
        if (!h.unitId && (h.uSing || h.uPlur)) {
            let found = units.find(u => u.singular === h.uSing && u.plural === h.uPlur);
            if (!found) {
                found = { id: genId(), singular: h.uSing || 'vez', plural: h.uPlur || 'veces' };
                units.push(found);
                modified = true;
            }
            h.unitId = found.id;
            delete h.uSing;
            delete h.uPlur;
        }
        if (!h.unitId && !h.isInterval) h.unitId = units[0].id;
        if (!h.description) h.description = '';
        if (!h.logs) h.logs = [];
        if (!h.dias) h.dias = [0,1,2,3,4,5,6];
        if (!h.id) h.id = genId();
        if (h.isInterval === undefined) h.isInterval = false;
        if (h.intervalUnit === undefined && h.isInterval) h.intervalUnit = 'minutes';
        if (!h.history) h.history = {};
    }
    if (modified) localStorage.setItem('units', JSON.stringify(units));
    localStorage.setItem('habits', JSON.stringify(habits));
}
migrateHabits();

// --- PERSONALIZACIÓN DE COLOR ---
function loadAccentColors() {
    const savedLight = localStorage.getItem('accentLight');
    const savedDark = localStorage.getItem('accentDark');
    if (savedLight) accentLight = savedLight;
    if (savedDark) accentDark = savedDark;
    applyTheme();
    const presetSelect = document.getElementById('accentPresetSelect');
    if (presetSelect) {
        let preset = 'custom';
        if (accentLight === '#0076fa' && accentDark === '#0076fa') preset = 'default';
        else if (accentLight === '#34c759' && accentDark === '#30b158') preset = 'green';
        else if (accentLight === '#ff9500' && accentDark === '#e58800') preset = 'orange';
        else if (accentLight === '#af52de' && accentDark === '#9e45c9') preset = 'purple';
        else if (accentLight === '#ff2d55' && accentDark === '#e6244a') preset = 'pink';
        presetSelect.value = preset;
        const customRows = document.getElementById('customAccentRows');
        if (customRows) customRows.style.display = preset === 'custom' ? 'block' : 'none';
    }
    const lightPicker = document.getElementById('accentLightPicker');
    if (lightPicker) lightPicker.value = accentLight;
    const darkPicker = document.getElementById('accentDarkPicker');
    if (darkPicker) darkPicker.value = accentDark;
}

function applyTheme() {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const accent = isDark ? accentDark : accentLight;
    document.documentElement.style.setProperty('--primary', accent);
}

function setAccentColors(light, dark) {
    accentLight = light;
    accentDark = dark;
    localStorage.setItem('accentLight', light);
    localStorage.setItem('accentDark', dark);
    applyTheme();
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme());

function initAccentPicker() {
    const presetSelect = document.getElementById('accentPresetSelect');
    const customRows = document.getElementById('customAccentRows');
    const lightPicker = document.getElementById('accentLightPicker');
    const darkPicker = document.getElementById('accentDarkPicker');
    if (!presetSelect) return;
    presetSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'custom') {
            customRows.style.display = 'block';
        } else {
            customRows.style.display = 'none';
            let light, dark;
            switch(val) {
                case 'orange': light = '#ff9500'; dark = '#e58800'; break;
                case 'yellow': light = '#e9ab00'; dark = '#e6b736'; break;
                case 'pink': light = '#ff2d55'; dark = '#e6244a'; break;
                case 'brown': light = '#74543f'; dark = '#e58800'; break;
                case 'cyan': light = '#109db6'; dark = '#e6244a'; break;
                case 'p1': light = '#7290b1'; dark = '#98b8d0'; break;
                case 'p3': light = '#375e8a'; dark = '#619be8'; break;
                case 'p4': light = '#c48495'; dark = '#d4a4b1'; break;
                case 'p5': light = '#8872b2'; dark = '#908ec8'; break;
                case 'p6': light = '#77a653'; dark = '#a2c083'; break;
                case 'p7': light = '#e06b53'; dark = '#e6816d'; break;
                case 'p8': light = '#ae3a3a'; dark = '#ff5c5c'; break;
                default: light = '#007afe'; dark = '#3b93f7';
            }
            setAccentColors(light, dark);
            if (lightPicker) lightPicker.value = light;
            if (darkPicker) darkPicker.value = dark;
        }
    });
    if (lightPicker) {
        lightPicker.addEventListener('input', (e) => {
            setAccentColors(e.target.value, accentDark);
            presetSelect.value = 'custom';
            customRows.style.display = 'block';
        });
    }
    if (darkPicker) {
        darkPicker.addEventListener('input', (e) => {
            setAccentColors(accentLight, e.target.value);
            presetSelect.value = 'custom';
            customRows.style.display = 'block';
        });
    }
    if (lightPicker && darkPicker) {
        const lightWrap = lightPicker.closest('.colorPickerWrap');
        const darkWrap = darkPicker.closest('.colorPickerWrap');
        const updatePreview = (picker, wrap) => {
            const preview = wrap.querySelector('.colorPreview');
            if (preview) preview.style.background = picker.value;
        };
        lightPicker.addEventListener('input', () => updatePreview(lightPicker, lightWrap));
        darkPicker.addEventListener('input', () => updatePreview(darkPicker, darkWrap));
        updatePreview(lightPicker, lightWrap);
        updatePreview(darkPicker, darkWrap);
    }
}

// --- FUNCIONES AUXILIARES ---
function genId() {
    return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function getUnitById(unitId) {
    return units.find(u => u.id === unitId) || units[0];
}
function formatQuantity(amount) {
    return amount % 1 === 0 ? amount.toString() : amount.toFixed(1);
}

// --- OVERLAY ---
function updateOverlay() {
    const overlay = document.getElementById('overlay');
    if (activeSheet) overlay.classList.add('active');
    else overlay.classList.remove('active');
}

// --- SHEETS CON OVERLAY ---
function openSheet(id) {
    if (activeSheet === id) return;
    ignoreNextClick = true;
    const content = document.getElementById(id);
    if (!content) return;

    if (activeSheet) {
        const old = document.getElementById(activeSheet);
        old.classList.remove('active');
        setTimeout(() => { if (activeSheet !== id) old.style.display = 'none'; }, 400);
        removeSheetScrollListener(old);
    }
    previousSheet = activeSheet;
    activeSheet = id;
    zCounter++;
    content.style.display = 'block';
    content.style.zIndex = zCounter;
    content.scrollTop = 0;
    requestAnimationFrame(() => {
        content.classList.add('active');
        setupSheetScrollListener(content);
    });
    updateOverlay();
}

function closeSheet(id = activeSheet, cb = null) {
    const content = document.getElementById(id);
    if (!content || content.classList.contains('closing')) return;
    ignoreNextClick = true;
    content.classList.remove('active');
    content.classList.add('closing');
    if (id === activeSheet) activeSheet = null;
    
    removeSheetScrollListener(content);

    setTimeout(() => {
        content.style.display = 'none';
        content.classList.remove('closing');
        if (cb) cb();
        updateOverlay();
    }, 400);
}

document.addEventListener('click', (e) => {
    if (ignoreNextClick || !activeSheet) return;
    const sheetEl = document.getElementById(activeSheet);
    if (!sheetEl || sheetEl.classList.contains('closing')) return;
    if (!sheetEl.contains(e.target) && !e.target.closest('#addHabitBtn') && !e.target.closest('.botoncito') && !e.target.closest('#settingsBtn')) {
        closeSheet(activeSheet);
    }
});
document.addEventListener('click', () => { ignoreNextClick = false; }, true);

// --- TOGGLE HORA ---
function toggleHourEnabled() {
    hourEnabled = !hourEnabled;
    const toggle = document.getElementById('hourToggle');
    const timeRow = document.getElementById('timeRowContainer');
    const timeInput = document.getElementById('hTime');
    if (hourEnabled) {
        toggle.classList.add('active');
        timeRow.style.display = 'flex';
        if (!timeInput.value) timeInput.value = new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
    } else {
        toggle.classList.remove('active');
        timeRow.style.display = 'none';
        timeInput.value = '';
    }
}
function setHourToggleState(enabled, timeValue) {
    hourEnabled = enabled;
    const toggle = document.getElementById('hourToggle');
    const timeRow = document.getElementById('timeRowContainer');
    const timeInput = document.getElementById('hTime');
    if (enabled) {
        toggle.classList.add('active');
        timeRow.style.display = 'flex';
        timeInput.value = timeValue || '';
    } else {
        toggle.classList.remove('active');
        timeRow.style.display = 'none';
        timeInput.value = '';
    }
}

// --- TOGGLE INTERVALOS EN FORMULARIO ---
function toggleIntervalForm() {
    intervalEnabled = !intervalEnabled;
    const toggle = document.getElementById('intervalToggle');
    const stepRow = document.getElementById('stepRow');
    const unitSelectRow = document.getElementById('unitSelectRow');
    const intervalUnitRow = document.getElementById('intervalUnitRow');
    if (intervalEnabled) {
        toggle.classList.add('active');
        stepRow.style.display = 'none';
        unitSelectRow.style.display = 'none';
        intervalUnitRow.style.display = 'block';
        populateIntervalUnitSelect();
    } else {
        toggle.classList.remove('active');
        stepRow.style.display = 'flex';
        unitSelectRow.style.display = 'block';
        intervalUnitRow.style.display = 'none';
    }
}
function setIntervalFormState(enabled, savedIntervalUnit) {
    intervalEnabled = enabled;
    const toggle = document.getElementById('intervalToggle');
    const stepRow = document.getElementById('stepRow');
    const unitSelectRow = document.getElementById('unitSelectRow');
    const intervalUnitRow = document.getElementById('intervalUnitRow');
    if (enabled) {
        toggle.classList.add('active');
        stepRow.style.display = 'none';
        unitSelectRow.style.display = 'none';
        intervalUnitRow.style.display = 'block';
        if (savedIntervalUnit) document.getElementById('hIntervalUnitSelect').value = savedIntervalUnit;
    } else {
        toggle.classList.remove('active');
        stepRow.style.display = 'flex';
        unitSelectRow.style.display = 'block';
        intervalUnitRow.style.display = 'none';
    }
}

// --- ICONOS ---
let selectedIcon = '􀓔';
let selectedColor = '#0076ff';
const colorPicker = document.getElementById('iconColorPicker');
const preview = document.getElementById('colorPreview');
const iconTrigger = document.getElementById('iconPickerTrigger');
if (colorPicker) {
    colorPicker.addEventListener('input', (e) => {
        selectedColor = e.target.value;
        preview.style.background = selectedColor;
        iconTrigger.style.color = selectedColor;
        initIcons();
    });
}
function initIcons(filter = "") {
    const grid = document.getElementById('iconGrid');
    if (!grid || typeof iconData === 'undefined') return;
    grid.innerHTML = "";
    const searchLower = filter.toLowerCase();
    for (const [category, icons] of Object.entries(iconData)) {
        const filtered = icons.filter(icon => icon.name.toLowerCase().includes(searchLower));
        if (filtered.length) {
            const catWrap = document.createElement('div');
            catWrap.className = 'iconCategory';
            catWrap.innerHTML = `<div class="categoryTitle">${category}</div>`;
            const subGrid = document.createElement('div');
            subGrid.className = 'iconGridSub';
            filtered.forEach(icon => {
                const div = document.createElement('div');
                div.className = 'iconItem';
                div.textContent = icon.char;
                if (icon.char === selectedIcon) div.classList.add('selected');
                div.style.color = icon.char === selectedIcon ? selectedColor : '#8e8e93';
                div.onclick = () => {
                    selectedIcon = icon.char;
                    iconTrigger.textContent = selectedIcon;
                    iconTrigger.style.color = selectedColor;
                    closeSheet('iconPickerSheet', () => openSheet('createSheet'));
                };
                subGrid.appendChild(div);
            });
            catWrap.appendChild(subGrid);
            grid.appendChild(catWrap);
        }
    }
}

// --- FUNCIONES DE UI SETTINGS ---
function loadUISettings() {
    const saved = localStorage.getItem('uiSettings');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            uiSettings = { ...uiSettings, ...parsed };
        } catch(e) {}
    }
    applyFontFeatures();
    applyCardRadius();
    applyTimeFormatToggleUI();
    applyShowIconsToggleUI();
    applyTimeSlotsToggleUI();
    const radiusInput = document.getElementById('cardRadiusInput');
    if (radiusInput) {
        radiusInput.value = uiSettings.cardRadius;
        radiusInput.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val)) {
                uiSettings.cardRadius = val;
                saveUISettings();
                applyCardRadius();
            }
        });
    }
}

function saveUISettings() {
    localStorage.setItem('uiSettings', JSON.stringify(uiSettings));
}

function applyFontFeatures() {
    if (uiSettings.fontFeatures) {
        document.body.classList.add('font-features');
    } else {
        document.body.classList.remove('font-features');
    }
    const toggle = document.getElementById('fontFeaturesToggle');
    if (toggle) {
        if (uiSettings.fontFeatures) toggle.classList.add('active');
        else toggle.classList.remove('active');
    }
}

function applyCardRadius() {
    document.documentElement.style.setProperty('--card-radius', uiSettings.cardRadius + 'px');
}

function applyShowIconsToggleUI() {
    const toggle = document.getElementById('showIconsToggle');
    if (toggle) {
        if (uiSettings.showIcons) toggle.classList.add('active');
        else toggle.classList.remove('active');
    }
}

function applyTimeSlotsToggleUI() {
    const toggle = document.getElementById('timeSlotsToggle');
    if (toggle) {
        if (uiSettings.timeSlots) toggle.classList.add('active');
        else toggle.classList.remove('active');
    }
}

function applyTimeFormatToggleUI() {
    const toggle = document.getElementById('timeFormatToggle');
    if (toggle) {
        if (!uiSettings.time24h) toggle.classList.add('active');
        else toggle.classList.remove('active');
    }
}

function toggleFontFeatures() {
    uiSettings.fontFeatures = !uiSettings.fontFeatures;
    saveUISettings();
    applyFontFeatures();
}

function toggleShowIcons() {
    uiSettings.showIcons = !uiSettings.showIcons;
    saveUISettings();
    applyShowIconsToggleUI();
    renderHabits();
}

function toggleTimeSlots() {
    uiSettings.timeSlots = !uiSettings.timeSlots;
    saveUISettings();
    applyTimeSlotsToggleUI();
    renderHabits();
}

function toggleTimeFormat() {
    uiSettings.time24h = !uiSettings.time24h;
    saveUISettings();
    applyTimeFormatToggleUI();
    renderHabits();
    if (activeSheet === 'viewSheet' && currentHabitId) {
        openViewById(currentHabitId);
    }
    if (activeSheet === 'historySheet') openHistorySheet();
}

function resetOnlySettings() {
    if (confirm('Restablecer solo la configuración de apariencia y organización? (No se perderán hábitos ni unidades)')) {
        uiSettings = {
            fontFeatures: true,
            cardRadius: 26,
            timeSlots: false,
            time24h: true,
            showIcons: true
        };
        saveUISettings();
        applyFontFeatures();
        applyCardRadius();
        applyShowIconsToggleUI();
        applyTimeSlotsToggleUI();
        applyTimeFormatToggleUI();
        const radiusInput = document.getElementById('cardRadiusInput');
        if (radiusInput) radiusInput.value = 26;
        renderHabits();
        if (activeSheet === 'viewSheet' && currentHabitId) openViewById(currentHabitId);
        if (activeSheet === 'historySheet') openHistorySheet();
    }
}

// --- Formateo de hora según preferencia ---
function formatTimeByPreference(time24) {
    if (!time24) return '';
    if (uiSettings.time24h) return time24;
    let [hours, minutes] = time24.split(':');
    let h = parseInt(hours, 10);
    let ampm = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return `${h12}:${minutes} ${ampm}`;
}

// --- RENDER HÁBITOS (con agrupación por momentos y ocultar íconos) ---
function getHabitCardHTML(h) {
    const unit = h.isInterval ? (h.intervalUnit === 'hours' ? 'horas' : 'minutos') : getUnitById(h.unitId).plural;
    const qty = h.history[selectedDate] || 0;
    const isComplete = qty >= h.goal;
    const progress = Math.min(100, (qty / h.goal) * 100);
    let buttonAction, buttonLabel, buttonStyle;
    if (h.isInterval) {
        buttonAction = `openAddQuantitySheetById('${h.id}')`;
        buttonLabel = isComplete ? '􀆅' : '􀅼';
        buttonStyle = `background-color: ${isComplete ? h.iconColor + '70' : h.iconColor}`;
    } else {
        buttonAction = `updateQtyById('${h.id}', 1)`;
        buttonLabel = isComplete ? '􀆅' : '􀅼';
        buttonStyle = `background-color: ${isComplete ? h.iconColor + '70' : h.iconColor }`;
    }
    const qtyDisplay = formatQuantity(qty);
    const goalDisplay = formatQuantity(h.goal);
    const displayTime = h.time ? formatTimeByPreference(h.time) : '';
    const iconHtml = uiSettings.showIcons ? `<div class="habitIconCircle" style="color: ${h.iconColor}">${h.icon}</div>` : '';
    return `<div class="habitCard ${isComplete ? 'completed' : ''}" data-id="${h.id}" onclick="openViewById('${h.id}')">
        <div class="supcard">
            ${iconHtml}
            <div class="habitInfo">
                <div class="details">
                    <div class="dup"><div class="habitName">${h.name}</div></div>
                    ${displayTime ? `<div class="habitTime">${displayTime}</div>` : ''}
                    ${h.goal > 1 ? `<div class="progress"><div class="habitProgressBar"><div class="habitProgressBarInner" data-w="${progress}%" style="width: ${progress}%; background: ${h.iconColor};"></div></div></div>` : ''}
                    ${h.goal > 1 && qty > 0 && qty !== h.goal ? `<div class="habitProgressBadge" style="color: ${h.iconColor}"><div class="cantidad"><div class="hecho">${qtyDisplay} ${unit}</div><div class="meta">${goalDisplay} ${unit}</div></div></div>` : ''}
                </div>
            </div>
            <button class="botoncito" style="${buttonStyle}" onclick="event.stopPropagation(); ${buttonAction}">${buttonLabel}</button>
        </div>
    </div>`;
}

function renderHabits(updatedId = null, animate = false, wasComplete = null, isComplete = null) {
    const container = document.getElementById('habitsContainer');
    if (!container) return;
    let oldRect = null;
    if (animate && updatedId) {
        const oldCard = document.querySelector(`.habitCard[data-id="${updatedId}"]`);
        if (oldCard) oldRect = oldCard.getBoundingClientRect();
    }
    const selectedDateObj = new Date(selectedDate + "T00:00:00");
    let wd = (selectedDateObj.getDay() === 0) ? 6 : selectedDateObj.getDay() - 1;
    const activeHabits = habits.filter(h => {
        if (h.dias && !h.dias.includes(wd)) return false;
        return true;
    });
    const sorted = [...activeHabits].sort((a, b) => {
        const ca = (a.history[selectedDate] || 0) >= a.goal;
        const cb = (b.history[selectedDate] || 0) >= b.goal;
        if (ca !== cb) return ca ? 1 : -1;
        return (a.time || "99:99").localeCompare(b.time || "99:99");
    });

    if (!uiSettings.timeSlots) {
        container.innerHTML = sorted.length ? sorted.map(h => getHabitCardHTML(h)).join('') : `<div style="text-align:center; color:#8e8e93; margin-top:40px;">No hay hábitos para hoy</div>`;
    } else {
        const slots = {
            morning: { label: '🌅 Mañana', habits: [], order: 1, filter: t => t && t < "12:00" },
            noon: { label: '☀️ Mediodía', habits: [], order: 2, filter: t => t && t >= "12:00" && t < "14:00" },
            afternoon: { label: '🌤️ Tarde', habits: [], order: 3, filter: t => t && t >= "14:00" && t < "18:00" },
            night: { label: '🌙 Noche', habits: [], order: 4, filter: t => t && t >= "18:00" }
        };
        for (let h of sorted) {
            const time = h.time || "";
            let placed = false;
            for (let [key, slot] of Object.entries(slots)) {
                if (slot.filter(time)) {
                    slot.habits.push(h);
                    placed = true;
                    break;
                }
            }
            if (!placed) slots.morning.habits.push(h);
        }
        let html = '';
        for (let slot of Object.values(slots).sort((a,b)=>a.order-b.order)) {
            if (slot.habits.length) {
                html += `<div class="label-table" style="margin: 16px 0 4px 8px;">${slot.label}</div>`;
                html += slot.habits.map(h => getHabitCardHTML(h)).join('');
            }
        }
        container.innerHTML = html || `<div style="text-align:center; color:#8e8e93; margin-top:40px;">No hay hábitos para hoy</div>`;
    }

    if (animate && updatedId && oldRect) {
        const newCard = document.querySelector(`.habitCard[data-id="${updatedId}"]`);
        if (newCard) {
            const newRect = newCard.getBoundingClientRect();
            const deltaX = oldRect.left - newRect.left;
            const deltaY = oldRect.top - newRect.top;
            if (deltaX || deltaY) {
                newCard.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
                newCard.style.transition = 'none';
                requestAnimationFrame(() => {
                    newCard.style.transform = '';
                    newCard.style.transition = 'transform 0.35s cubic-bezier(0.2, 0.9, 0.4, 1.1)';
                    newCard.addEventListener('transitionend', () => newCard.style.transition = '', { once: true });
                });
            }
        }
        if (wasComplete !== null && isComplete !== null && wasComplete !== isComplete) {
            const card = document.querySelector(`.habitCard[data-id="${updatedId}"]`);
            if (card) {
                card.classList.add(isComplete ? 'flip-move-down' : 'flip-move-up');
                setTimeout(() => card.classList.remove('flip-move-down', 'flip-move-up'), 400);
            }
        }
    }
    requestAnimationFrame(() => {
        document.querySelectorAll('.habitProgressBarInner').forEach(bar => {
            bar.style.transition = 'width 0.4s ease';
            bar.style.width = bar.dataset.w;
        });
    });
    updateLongestStreakDisplay();
}

// --- LOGS ---
function addLog(habitId, amount, dateStr, timeStr, extra = null) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit || amount <= 0) return;
    if (!habit.logs) habit.logs = [];
    const logEntry = { date: dateStr, time: timeStr, amount: amount };
    if (extra && habit.isInterval) {
        logEntry.startTime = extra.startTime;
        logEntry.endTime = extra.endTime;
        logEntry.durationSeconds = extra.durationSeconds;
    }
    habit.logs.push(logEntry);
    localStorage.setItem('habits', JSON.stringify(habits));
}
function deleteLogsForDate(habitId, dateStr) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    if (!habit.logs) habit.logs = [];
    habit.logs = habit.logs.filter(log => log.date !== dateStr);
    localStorage.setItem('habits', JSON.stringify(habits));
}
function openHistorySheet() {
    if (!currentHabitId) return;
    const habit = habits.find(h => h.id === currentHabitId);
    if (!habit) return;
    const logs = habit.logs || [];
    const container = document.getElementById('historyList');
    container.innerHTML = '';
    const sorted = [...logs].reverse();
    const unit = habit.isInterval ? (habit.intervalUnit === 'hours' ? 'horas' : 'minutos') : getUnitById(habit.unitId).plural;
    sorted.forEach(log => {
        let amountText = `${formatQuantity(log.amount)} ${unit}`;
        if (habit.isInterval && log.startTime && log.endTime) {
            amountText = `${formatDuration(log.durationSeconds)}`;
        }
        const displayTime = log.time ? formatTimeByPreference(log.time) : '';
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML = `<div><div class="history-date">${log.date}</div><div class="history-time">${displayTime}</div></div><div class="history-amount">${amountText}</div>`;
        container.appendChild(row);
    });
    openSheet('historySheet');
}
function formatDuration(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

// --- CRUD ---
function openViewById(id) {
    const habit = habits.find(h => h.id === id);
    if (habit) openView(habit);
}
function openView(habit) {
    currentHabitId = habit.id;
    const unit = habit.isInterval ? (habit.intervalUnit === 'hours' ? 'horas' : 'minutos') : getUnitById(habit.unitId).plural;
    document.getElementById('vName').textContent = habit.name;
    document.getElementById('vDescription').textContent = habit.description || '';
    document.getElementById('vIcon').textContent = habit.icon;
    document.getElementById('vIcon').style.color = habit.iconColor;
    document.getElementById('vQtyManual').value = habit.history[selectedDate] || 0;
    let unitLabel = `Objetivo: ${formatQuantity(habit.goal)} ${unit}`;
    document.getElementById('vUnitLabel').textContent = unitLabel;
    const racha = getStreak(habit);
    document.getElementById('streakNumberInView').textContent = `${racha} ${racha === 1 ? 'día' : 'días'}`;
    const logs = habit.logs || [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthEntries = logs.filter(log => {
        const [y,m] = log.date.split('-');
        return parseInt(y) === currentYear && parseInt(m)-1 === currentMonth;
    }).length;
    document.getElementById('historyEntryCount').innerText = monthEntries;
    const qtyControls = document.getElementById('viewQtyControls');
    const timerBtn = document.getElementById('viewTimerButton');
    const bottomBtns = document.getElementById('viewBottomButtons');
    if (habit.isInterval) {
        qtyControls.style.display = 'none';
        timerBtn.style.display = 'block';
        if (bottomBtns) {
            const completeBtn = bottomBtns.querySelector('.btn-blue');
            if (completeBtn) completeBtn.style.display = 'block';
        }
    } else {
        qtyControls.style.display = 'flex';
        timerBtn.style.display = 'none';
        if (bottomBtns) {
            const completeBtn = bottomBtns.querySelector('.btn-blue');
            if (completeBtn) completeBtn.style.display = 'block';
        }
    }
    let existingTimeElem = document.getElementById('vTimeDisplay');
    if (!existingTimeElem && habit.time) {
        const descDiv = document.getElementById('vDescription');
        const timeDiv = document.createElement('div');
        timeDiv.id = 'vTimeDisplay';
        timeDiv.style.fontSize = '0.85rem';
        timeDiv.style.color = '#666';
        timeDiv.style.margin = '4px 0 8px';
        descDiv.parentNode.insertBefore(timeDiv, descDiv.nextSibling);
        existingTimeElem = timeDiv;
    }
    if (habit.time && existingTimeElem) {
        existingTimeElem.textContent = formatTimeByPreference(habit.time);
    } else if (existingTimeElem && !habit.time) {
        existingTimeElem.remove();
    }
    openSheet('viewSheet');
}
function saveHabit() {
    const name = document.getElementById('hName').value.trim();
    const goal = parseFloat(document.getElementById('hGoal').value) || 1;
    if (!name) return alert('Nombre obligatorio');
    const id = currentHabitId || genId();
    const existing = habits.find(h => h.id === id);
    const history = existing ? existing.history : {};
    const logs = existing ? (existing.logs || []) : [];
    let unitId, isInterval, intervalUnit;
    if (intervalEnabled) {
        isInterval = true;
        intervalUnit = document.getElementById('hIntervalUnitSelect').value;
        const targetUnit = intervalUnit === 'hours' ? units.find(u => u.singular === 'hora') : units.find(u => u.singular === 'minuto');
        unitId = targetUnit ? targetUnit.id : units[0].id;
    } else {
        isInterval = false;
        unitId = document.getElementById('hUnitSelect').value;
        intervalUnit = null;
    }
    const habit = {
        id, name, goal, step: parseFloat(document.getElementById('hStep').value) || 1,
        time: hourEnabled ? document.getElementById('hTime').value : null,
        icon: selectedIcon, iconColor: selectedColor, history, logs,
        dias: [...diasSeleccionados], unitId, description: document.getElementById('hDescription').value,
        isInterval, intervalUnit
    };
    if (existing) {
        const idx = habits.findIndex(h => h.id === id);
        habits[idx] = habit;
    } else habits.push(habit);
    localStorage.setItem('habits', JSON.stringify(habits));
    renderHabits();
    closeSheet('createSheet');
    currentHabitId = null;
}
function deleteHabit() {
    if (confirm('¿Borrar hábito?')) {
        habits = habits.filter(h => h.id !== currentHabitId);
        localStorage.setItem('habits', JSON.stringify(habits));
        renderHabits();
        closeSheet('createSheet');
        currentHabitId = null;
    }
}
function updateQtyById(id, dir) {
    const idx = habits.findIndex(h => h.id === id);
    if (idx === -1) return;
    const h = habits[idx];
    if (h.isInterval) {
        openAddQuantitySheetById(id);
        return;
    }
    const oldQty = h.history[selectedDate] || 0;
    const increment = dir * h.step;
    if (increment <= 0) return;
    const newQty = oldQty + increment;
    const wasComplete = oldQty >= h.goal;
    const isComplete = newQty >= h.goal;
    h.history[selectedDate] = newQty;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
    addLog(id, increment, selectedDate, timeStr);
    localStorage.setItem('habits', JSON.stringify(habits));
    renderHabits(h.id, true, wasComplete, isComplete);
    if (activeSheet === 'viewSheet' && currentHabitId === h.id) {
        document.getElementById('vQtyManual').value = newQty;
        document.getElementById('streakNumberInView').textContent = `${getStreak(h)} días`;
    }
}
function updateQty(dir) {
    if (currentHabitId) updateQtyById(currentHabitId, dir);
}
function clearQty() {
    if (!currentHabitId) return;
    const h = habits.find(h => h.id === currentHabitId);
    if (!h) return;
    deleteLogsForDate(currentHabitId, selectedDate);
    h.history[selectedDate] = 0;
    localStorage.setItem('habits', JSON.stringify(habits));
    document.getElementById('vQtyManual').value = 0;
    renderHabits(h.id, true);
    document.getElementById('streakNumberInView').textContent = `${getStreak(h)} días`;
    const logs = h.logs || [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthEntries = logs.filter(log => {
        const [y,m] = log.date.split('-');
        return parseInt(y) === currentYear && parseInt(m)-1 === currentMonth;
    }).length;
    document.getElementById('historyEntryCount').innerText = monthEntries;
    closeSheet('viewSheet');
}
function setComplete() {
    if (!currentHabitId) return;
    const h = habits.find(h => h.id === currentHabitId);
    if (!h) return;
    const oldQty = h.history[selectedDate] || 0;
    const needed = h.goal - oldQty;
    if (needed <= 0) return;
    if (h.isInterval) {
        h.history[selectedDate] = h.goal;
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
        addLog(currentHabitId, needed, selectedDate, timeStr);
        localStorage.setItem('habits', JSON.stringify(habits));
        document.getElementById('vQtyManual').value = h.goal;
        renderHabits(h.id, true, false, true);
        document.getElementById('streakNumberInView').textContent = `${getStreak(h)} días`;
    } else {
        h.history[selectedDate] = h.goal;
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
        addLog(currentHabitId, needed, selectedDate, timeStr);
        localStorage.setItem('habits', JSON.stringify(habits));
        document.getElementById('vQtyManual').value = h.goal;
        renderHabits(h.id, true, false, true);
        document.getElementById('streakNumberInView').textContent = `${getStreak(h)} días`;
    }
}
function openAddQuantitySheetById(habitId) {
    currentHabitId = habitId;
    openAddQuantitySheet();
}
function openAddQuantitySheet() {
    const habit = habits.find(h => h.id === currentHabitId);
    if (!habit) return;
    const numericDiv = document.getElementById('addQtyNumeric');
    const intervalDiv = document.getElementById('addQtyInterval');
    if (habit.isInterval) {
        numericDiv.style.display = 'none';
        intervalDiv.style.display = 'block';
        const now = new Date();
        const defaultTime = now.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
        document.getElementById('intervalStart').value = defaultTime;
        document.getElementById('intervalEnd').value = defaultTime;
        updateIntervalPreview();
        document.getElementById('intervalStart').onchange = updateIntervalPreview;
        document.getElementById('intervalEnd').onchange = updateIntervalPreview;
    } else {
        numericDiv.style.display = 'block';
        intervalDiv.style.display = 'none';
        document.getElementById('addQtyInput').value = '0';
    }
    openSheet('addQuantitySheet');
}
function updateIntervalPreview() {
    const start = document.getElementById('intervalStart').value;
    const end = document.getElementById('intervalEnd').value;
    if (!start || !end) return;
    const startSec = timeToSeconds(start);
    let endSec = timeToSeconds(end);
    if (endSec < startSec) endSec += 24*3600;
    const diffSec = endSec - startSec;
    const previewDiv = document.getElementById('timerLogPreview');
    if (previewDiv) previewDiv.textContent = `Duración: ${formatDuration(diffSec)}`;
}
function timeToSeconds(time) {
    const [h,m,s = 0] = time.split(':').map(Number);
    return h*3600 + m*60 + s;
}
function confirmAddQuantity() {
    const habit = habits.find(h => h.id === currentHabitId);
    if (!habit) return;
    if (habit.isInterval) {
        let start = document.getElementById('intervalStart').value;
        let end = document.getElementById('intervalEnd').value;
        if (!start || !end) return;
        let startSec = timeToSeconds(start);
        let endSec = timeToSeconds(end);
        if (endSec < startSec) endSec += 24*3600;
        const durationSec = endSec - startSec;
        if (durationSec <= 0) return alert('La hora de fin debe ser posterior a la de inicio');
        let amount;
        if (habit.intervalUnit === 'hours') amount = durationSec / 3600;
        else amount = durationSec / 60;
        const oldQty = habit.history[selectedDate] || 0;
        const newQty = oldQty + amount;
        habit.history[selectedDate] = newQty;
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
        addLog(currentHabitId, amount, selectedDate, timeStr, { startTime: start, endTime: end, durationSeconds: durationSec });
        localStorage.setItem('habits', JSON.stringify(habits));
        renderHabits(habit.id, true);
        if (activeSheet === 'viewSheet') {
            document.getElementById('vQtyManual').value = newQty;
            document.getElementById('streakNumberInView').textContent = `${getStreak(habit)} días`;
        }
        closeSheet('addQuantitySheet');
    } else {
        let addValue = parseFloat(document.getElementById('addQtyInput').value);
        if (isNaN(addValue) || addValue <= 0) { closeSheet('addQuantitySheet'); return; }
        const oldQty = habit.history[selectedDate] || 0;
        const newQty = oldQty + addValue;
        habit.history[selectedDate] = newQty;
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
        addLog(currentHabitId, addValue, selectedDate, timeStr);
        localStorage.setItem('habits', JSON.stringify(habits));
        document.getElementById('vQtyManual').value = newQty;
        renderHabits(habit.id, true, oldQty >= habit.goal, newQty >= habit.goal);
        document.getElementById('streakNumberInView').textContent = `${getStreak(habit)} días`;
        closeSheet('addQuantitySheet');
    }
}

// --- RACHA ---
function getStreak(h) {
    let streak = 0;
    let curr = new Date();
    curr.setHours(0,0,0,0);
    while (true) {
        let key = curr.toISOString().split('T')[0];
        let qty = h.history[key] || 0;
        if (qty >= h.goal - 1e-9) streak++;
        else {
            let todayStr = new Date().toISOString().split('T')[0];
            if (key !== todayStr) break;
        }
        curr.setDate(curr.getDate() - 1);
    }
    return streak;
}

// --- RACHA MÁS LARGA GLOBAL ---
function getLongestStreakForHabit(habit) {
    let maxStreak = 0;
    let currentStreak = 0;
    let dates = Object.keys(habit.history).sort();
    if (dates.length === 0) return 0;
    let prevDate = null;
    for (let date of dates) {
        let qty = habit.history[date] || 0;
        let isComplete = qty >= habit.goal - 1e-9;
        if (isComplete) {
            if (prevDate) {
                let diff = (new Date(date) - new Date(prevDate)) / (1000*3600*24);
                if (diff === 1) currentStreak++;
                else currentStreak = 1;
            } else {
                currentStreak = 1;
            }
            if (currentStreak > maxStreak) maxStreak = currentStreak;
        } else {
            currentStreak = 0;
        }
        prevDate = date;
    }
    return maxStreak;
}

function getGlobalLongestStreak() {
    let globalMax = 0;
    for (let habit of habits) {
        let streak = getLongestStreakForHabit(habit);
        if (streak > globalMax) globalMax = streak;
    }
    return globalMax;
}

function updateLongestStreakDisplay() {
    const span = document.getElementById('longestStreakDisplay');
    if (span) {
        const longest = getGlobalLongestStreak();
        span.textContent = `${longest} ${longest === 1 ? 'día' : 'días'}`;
    }
}

// --- CALENDARIO Y GRÁFICO ---
let calDate = new Date();
function openStreak() {
    const habit = habits.find(h => h.id === currentHabitId);
    if (!habit) return;
    const racha = getStreak(habit);
    document.getElementById('streakValue').textContent = racha;
    document.getElementById('streakText').textContent = racha === 1 ? 'Día de racha' : 'Días de racha';
    const fire = document.querySelector(".fire");
    if (racha === 0) { fire.style.filter = "grayscale(100%)"; fire.style.opacity = "0.5"; }
    else { fire.style.filter = "grayscale(0%)"; fire.style.opacity = "1"; fire.style.color = habit.iconColor; }
    calDate = new Date(selectedDate);
    renderCalendar();
    drawLineChartSVG();
    openSheet('streakSheet');
}
function renderCalendar() {
    const habit = habits.find(h => h.id === currentHabitId);
    if (!habit) return;
    const grid = document.getElementById('calGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const month = calDate.getMonth(), year = calDate.getFullYear();
    document.getElementById('calTitle').textContent = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(calDate);
    ['Lu','Ma','Mi','Ju','Vi','Sa','Do'].forEach(d => { const div = document.createElement('div'); div.style.color = '#8E8E93'; div.textContent = d; grid.appendChild(div); });
    const firstDayRaw = new Date(year, month, 1).getDay();
    const firstDay = (firstDayRaw === 0) ? 6 : firstDayRaw - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) grid.appendChild(document.createElement('div'));
    for (let d = 1; d <= daysInMonth; d++) {
        const key = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        let qty = habit.history[key] || 0;
        let progress = Math.min(1, qty / habit.goal);
        const radius = 18, circ = 2 * Math.PI * radius, offset = circ - (progress * circ);
        const cell = document.createElement('div');
        cell.className = 'dayCell';
        cell.innerHTML = `<svg class="ring" viewBox="0 0 44 44"><circle class="ring-bg" cx="22" cy="22" r="${radius}"></circle><circle class="ring-fg" cx="22" cy="22" r="${radius}" style="stroke-dasharray: ${circ}; stroke-dashoffset: ${offset}; color: ${habit.iconColor}; opacity: ${qty>0?1:0}"></circle></svg><span class="dayNum">${d}</span>`;
        if (qty >= habit.goal - 1e-9) { cell.querySelector('.dayNum').style.color = habit.iconColor; cell.querySelector('.dayNum').style.fontWeight = '700'; }
        grid.appendChild(cell);
    }
}
function changeMonth(dir) { calDate.setMonth(calDate.getMonth() + dir); renderCalendar(); }
function drawLineChartSVG() {
    const habit = habits.find(h => h.id === currentHabitId);
    if (!habit) return;
    const svg = document.getElementById('weeklyLineSvg');
    if (!svg) return;
    let values = [];
    let today = new Date(); today.setHours(0,0,0,0);
    for (let i=6; i>=0; i--) { let d = new Date(today); d.setDate(today.getDate()-i); let key = d.toISOString().split('T')[0]; let qty = habit.history[key] || 0; values.push(Math.min(100, (qty/habit.goal)*100)); }
    const w=400, hh=200, pad=30, stepX=(w-2*pad)/6, scaleY=(hh-2*pad)/100;
    const points = values.map((v,i)=> ({x:pad+i*stepX, y:hh-pad-v*scaleY}));
    const pathD = points.map((p,i)=> i===0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`).join(' ');
    const circles = points.map(p=> `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${habit.iconColor}" stroke="white" stroke-width="0"/>`).join('');
    const labels = ['L','M','M','J','V','S','D'].map((d,i)=> `<text x="${pad+i*stepX-5}" y="${hh-pad+18}" font-size="12" fill="#666">${d}</text>`).join('');
    svg.innerHTML = `<line x1="${pad}" y1="${hh-pad}" x2="${w-pad}" y2="${hh-pad}" stroke="#ccc" stroke-width="1"/><line x1="${pad}" y1="${pad}" x2="${pad}" y2="${hh-pad}" stroke="#ccc" stroke-width="1"/><path d="${pathD}" fill="none" stroke="${habit.iconColor}" stroke-width="2"/><circle cx="${points[points.length-1].x}" cy="${points[points.length-1].y}" r="4" fill="${habit.iconColor}" stroke="white" stroke-width="2"/>${circles}${labels}`;
}

// --- GESTIÓN DE UNIDADES ---
function openUnitsSheet() {
    const container = document.getElementById('unitsList');
    container.innerHTML = '';
    units.forEach(unit => {
        const row = document.createElement('div');
        row.className = 'row';
        row.style.cursor = 'pointer';
        row.innerHTML = `<span> ${unit.plural}</span><span class="chevron">􀆊</span>`;
        row.onclick = () => openUnitEditSheet(unit.id);
        container.appendChild(row);
    });
    openSheet('unitsSheet');
}
function openUnitEditSheet(unitId) {
    currentUnitId = unitId;
    const deleteRow = document.getElementById('deleteUnitRow');
    if (unitId) {
        const unit = units.find(u => u.id === unitId);
        document.getElementById('unitSingular').value = unit.singular;
        document.getElementById('unitPlural').value = unit.plural;
        deleteRow.style.display = 'block';
    } else {
        document.getElementById('unitSingular').value = '';
        document.getElementById('unitPlural').value = '';
        deleteRow.style.display = 'none';
    }
    openSheet('unitEditSheet');
}
function saveUnit() {
    const singular = document.getElementById('unitSingular').value.trim();
    const plural = document.getElementById('unitPlural').value.trim();
    if (!singular || !plural) return alert('Completa ambos campos');
    if (currentUnitId) {
        const unit = units.find(u => u.id === currentUnitId);
        unit.singular = singular;
        unit.plural = plural;
    } else {
        units.push({ id: genId(), singular, plural });
    }
    localStorage.setItem('units', JSON.stringify(units));
    populateUnitSelect();
    closeSheet('unitEditSheet');
    openUnitsSheet();
}
function deleteUnit() {
    if (!currentUnitId) return;
    if (units.length <= 1) return alert('Debe haber al menos una unidad');
    if (confirm('¿Eliminar esta unidad? Los hábitos que la usen pasarán a la unidad por defecto.')) {
        units = units.filter(u => u.id !== currentUnitId);
        const defaultUnit = units[0];
        habits.forEach(h => { if (h.unitId === currentUnitId) h.unitId = defaultUnit.id; });
        localStorage.setItem('units', JSON.stringify(units));
        localStorage.setItem('habits', JSON.stringify(habits));
        populateUnitSelect();
        closeSheet('unitEditSheet');
        openUnitsSheet();
        renderHabits();
    }
}

// --- GESTIÓN DE HÁBITOS (ELIMINAR) ---
function openHabitsManagement() {
    const container = document.getElementById('habitsManagementList');
    container.innerHTML = '';
    habits.forEach(habit => {
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML = `<span>${habit.name}</span><button class="btn-row" style="color: var(--del);" onclick="event.stopPropagation(); deleteHabitById('${habit.id}')">􀈑</button>`;
        container.appendChild(row);
    });
    openSheet('habitsManagementSheet');
}
function deleteHabitById(id) {
    if (confirm('¿Eliminar este hábito?')) {
        habits = habits.filter(h => h.id !== id);
        localStorage.setItem('habits', JSON.stringify(habits));
        openHabitsManagement();
        renderHabits();
    }
}
function deleteAllHabits() {
    if (confirm('⚠️ ¿Eliminar TODOS los hábitos? Esta acción no se puede deshacer.')) {
        habits = [];
        localStorage.setItem('habits', '[]');
        renderHabits();
        closeSheet('habitsManagementSheet');
    }
}

// --- RESET FORM ---
function resetCreateForm() {
    currentHabitId = null;
    document.getElementById('deleteHabitRow').style.display = 'none';
    document.getElementById('hName').value = '';
    document.getElementById('hDescription').value = '';
    document.getElementById('hGoal').value = '';
    document.getElementById('hStep').value = '';
    setHourToggleState(false, '');
    setIntervalFormState(false, null);
    selectedIcon = '􀓔';
    selectedColor = '#0076ff';
    diasSeleccionados = [0,1,2,3,4,5,6];
    actualizarUIDias();
    if (iconTrigger) { iconTrigger.textContent = selectedIcon; iconTrigger.style.color = selectedColor; }
    if (preview) preview.style.background = selectedColor;
    document.getElementById('clearHNameBtn').style.display = 'none';
    populateUnitSelect();
}
function editHabit() {
    const habit = habits.find(h => h.id === currentHabitId);
    if (!habit) return;
    document.getElementById('deleteHabitRow').style.display = 'block';
    document.getElementById('hName').value = habit.name;
    document.getElementById('hDescription').value = habit.description || '';
    document.getElementById('hGoal').value = habit.goal;
    document.getElementById('hStep').value = habit.step;
    setHourToggleState(!!habit.time, habit.time || '');
    setIntervalFormState(habit.isInterval || false, habit.intervalUnit || null);
    selectedIcon = habit.icon;
    selectedColor = habit.iconColor;
    iconTrigger.textContent = habit.icon;
    iconTrigger.style.color = habit.iconColor;
    if (preview) preview.style.background = habit.iconColor;
    diasSeleccionados = habit.dias ? [...habit.dias] : [0,1,2,3,4,5,6];
    actualizarUIDias();
    if (!habit.isInterval && habit.unitId) document.getElementById('hUnitSelect').value = habit.unitId;
    closeSheet('viewSheet', () => openSheet('createSheet'));
}
function handleCloseHabit() { closeSheet(activeSheet); }

// --- EXPORTAR / IMPORTAR / BORRAR DATOS ---
function exportData() {
    const data = { habits, units };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habitos_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (confirm('¿Reemplazar todos los datos actuales?')) {
                if (imported.habits) habits = imported.habits;
                if (imported.units) units = imported.units;
                localStorage.setItem('habits', JSON.stringify(habits));
                localStorage.setItem('units', JSON.stringify(units));
                migrateHabits();
                renderHabits();
                populateUnitSelect();
                alert('Datos importados correctamente');
                closeSheet('settingsSheet');
            }
        } catch (err) { alert('Archivo inválido'); }
    };
    reader.readAsText(file);
}
function confirmDeleteAllData() {
    if (confirm('⚠️ Esto eliminará TODOS los hábitos y unidades. ¿Continuar?')) {
        habits = [];
        units = [{ id: genId(), singular: 'vez', plural: 'veces' }];
        localStorage.setItem('habits', '[]');
        localStorage.setItem('units', JSON.stringify(units));
        renderHabits();
        populateUnitSelect();
        closeSheet('settingsSheet');
    }
}

// --- TIMER SHEET ---
function openTimerSheet() {
    if (!currentHabitId) return;
    const habit = habits.find(h => h.id === currentHabitId);
    if (!habit || !habit.isInterval) return;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    timerStartTime = null;
    timerElapsedSeconds = 0;
    timerRunning = false;
    currentTimerLog = null;
    document.getElementById('timerDisplay').innerText = '00:00';
    document.getElementById('timerStartPauseBtn').innerText = 'Iniciar';
    openSheet('timerSheet');
}
function timerStartPause() {
    const btn = document.getElementById('timerStartPauseBtn');
    if (!timerRunning) {
        if (timerElapsedSeconds === 0 && !currentTimerLog) {
            currentTimerLog = { startTime: new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', second:'2-digit' }) };
        }
        timerStartTime = Date.now() - timerElapsedSeconds * 1000;
        timerInterval = setInterval(updateTimerDisplay, 100);
        timerRunning = true;
        btn.innerText = 'Pausar';
    } else {
        clearInterval(timerInterval);
        timerInterval = null;
        timerRunning = false;
        btn.innerText = 'Reanudar';
        const endPartial = Date.now();
        const elapsedPartial = Math.floor((endPartial - timerStartTime) / 1000);
        timerElapsedSeconds = elapsedPartial;
        updateTimerDisplay();
        if (currentTimerLog) {
            currentTimerLog.endTime = new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
            currentTimerLog.durationSeconds = timerElapsedSeconds;
        }
    }
}
function updateTimerDisplay() {
    if (!timerStartTime) {
        document.getElementById('timerDisplay').innerText = formatDuration(timerElapsedSeconds);
        return;
    }
    const elapsed = Math.floor((Date.now() - timerStartTime) / 1000);
    document.getElementById('timerDisplay').innerText = formatDuration(elapsed);
}
function saveTimerLog() {
    if (!currentTimerLog || !currentTimerLog.startTime || !currentTimerLog.endTime || currentTimerLog.durationSeconds === undefined) {
        alert('No hay una sesión de temporizador completa para guardar. Debes pausar o detener primero.');
        return;
    }
    const habit = habits.find(h => h.id === currentHabitId);
    if (!habit) return;
    let amount;
    if (habit.intervalUnit === 'hours') amount = currentTimerLog.durationSeconds / 3600;
    else amount = currentTimerLog.durationSeconds / 60;
    if (amount <= 0) {
        alert('La duración registrada es cero, no se guardará.');
        return;
    }
    const oldQty = habit.history[selectedDate] || 0;
    const newQty = oldQty + amount;
    habit.history[selectedDate] = newQty;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
    addLog(currentHabitId, amount, selectedDate, timeStr, {
        startTime: currentTimerLog.startTime,
        endTime: currentTimerLog.endTime,
        durationSeconds: currentTimerLog.durationSeconds
    });
    localStorage.setItem('habits', JSON.stringify(habits));
    renderHabits(habit.id, true);
    if (activeSheet === 'viewSheet') {
        document.getElementById('vQtyManual').value = newQty;
        document.getElementById('streakNumberInView').textContent = `${getStreak(habit)} días`;
    }
    closeSheet('timerSheet');
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    timerStartTime = null;
    timerElapsedSeconds = 0;
    timerRunning = false;
    currentTimerLog = null;
}
function closeTimerSheetWithoutSave() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
    closeSheet('timerSheet');
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    loadAccentColors();
    initAccentPicker();
    const dateInput = document.getElementById('selectedDate');
    if (dateInput) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${yyyy}-${mm}-${dd}`;
        selectedDate = dateInput.value;
        dateInput.onchange = (e) => { selectedDate = e.target.value; renderHabits(); };
    }
    const iconSearch = document.getElementById('iconSearch');
    if (iconSearch) iconSearch.addEventListener('input', (e) => initIcons(e.target.value));
    document.getElementById('clearHNameBtn')?.addEventListener('click', () => {
        document.getElementById('hName').value = '';
        document.getElementById('clearHNameBtn').style.display = 'none';
    });
    document.getElementById('hName')?.addEventListener('input', (e) => {
        document.getElementById('clearHNameBtn').style.display = e.target.value ? 'block' : 'none';
    });
    document.getElementById('clearIconSearchBtn')?.addEventListener('click', () => {
        document.getElementById('iconSearch').value = '';
        initIcons('');
    });
    initDiasSelector();
    initIcons();
    renderHabits();
    populateUnitSelect();
    populateIntervalUnitSelect();
    const toggleDiv = document.getElementById('hourToggle');
    if (toggleDiv) toggleDiv.addEventListener('click', (e) => { e.stopPropagation(); toggleHourEnabled(); });
    document.getElementById('settingsBtn')?.addEventListener('click', () => openSheet('settingsSheet'));
    document.getElementById('intervalToggle')?.addEventListener('click', (e) => { e.stopPropagation(); toggleIntervalForm(); });
    
    const timerBtn = document.getElementById('timerStartPauseBtn');
    if (timerBtn) timerBtn.addEventListener('click', timerStartPause);
    
    const addBtn = document.getElementById('addHabitBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            resetCreateForm();
            openSheet('createSheet');
        });
    }
    const iconTriggerEl = document.getElementById('iconPickerTrigger');
    if (iconTriggerEl) {
        iconTriggerEl.addEventListener('click', () => openSheet('iconPickerSheet'));
    }
    
    window.addEventListener('scroll', handleTopbarOnScroll);
    handleTopbarOnScroll();
    
    const topbar = document.querySelector('.topbar');
    if (topbar && !topbar.querySelector('.minimized-title')) {
        const titleSpan = document.createElement('span');
        titleSpan.className = 'minimized-title';
        titleSpan.textContent = 'Routine';
        topbar.appendChild(titleSpan);
    }
    
    loadUISettings();
    updateLongestStreakDisplay();
});

function populateUnitSelect() {
    const select = document.getElementById('hUnitSelect');
    if (!select) return;
    select.innerHTML = '';
    units.forEach(unit => {
        const option = document.createElement('option');
        option.value = unit.id;
        option.textContent = `${unit.plural}`;
        select.appendChild(option);
    });
}
function populateIntervalUnitSelect() {
    const select = document.getElementById('hIntervalUnitSelect');
    if (!select) return;
    select.innerHTML = '';
    select.innerHTML += `<option value="minutes">minutos</option>`;
    select.innerHTML += `<option value="hours">horas</option>`;
}

// --- SELECTOR DE DÍAS ---
let diasSeleccionados = [0,1,2,3,4,5,6];
const nombresDias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
function initDiasSelector() {
    const container = document.getElementById('diasTable');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 7; i++) {
        const row = document.createElement('div');
        row.className = 'row diasRow';
        row.dataset.dia = i;
        row.style.cursor = 'pointer';
        row.innerHTML = `<span>${nombresDias[i]}</span><span class="diaCheck">${diasSeleccionados.includes(i) ? '􀆅' : ''}</span>`;
        row.addEventListener('click', (e) => { e.preventDefault(); toggleDia(i); });
        container.appendChild(row);
    }
}
function toggleDia(dia) {
    if (diasSeleccionados.includes(dia)) diasSeleccionados = diasSeleccionados.filter(d => d !== dia);
    else { diasSeleccionados.push(dia); diasSeleccionados.sort((a,b)=>a-b); }
    actualizarUIDias();
}
function actualizarUIDias() {
    document.querySelectorAll('#diasTable .diasRow').forEach(row => {
        const dia = parseInt(row.dataset.dia);
        const checkSpan = row.querySelector('.diaCheck');
        checkSpan.textContent = diasSeleccionados.includes(dia) ? '􀆅' : '';
    });
}

// Exposición global de todas las funciones necesarias
window.updateQty = updateQty;
window.openAddQuantitySheetById = openAddQuantitySheetById;
window.openViewById = openViewById;
window.openStreak = openStreak;
window.openHistorySheet = openHistorySheet;
window.closeSheet = closeSheet;
window.saveHabit = saveHabit;
window.deleteHabit = deleteHabit;
window.editHabit = editHabit;
window.handleCloseHabit = handleCloseHabit;
window.clearQty = clearQty;
window.setComplete = setComplete;
window.changeMonth = changeMonth;
window.exportData = exportData;
window.importData = importData;
window.confirmDeleteAllData = confirmDeleteAllData;
window.openUnitsSheet = openUnitsSheet;
window.openUnitEditSheet = openUnitEditSheet;
window.saveUnit = saveUnit;
window.deleteUnit = deleteUnit;
window.openHabitsManagement = openHabitsManagement;
window.deleteHabitById = deleteHabitById;
window.deleteAllHabits = deleteAllHabits;
window.openTimerSheet = openTimerSheet;
window.saveTimerLog = saveTimerLog;
window.closeTimerSheetWithoutSave = closeTimerSheetWithoutSave;
window.toggleHourEnabled = toggleHourEnabled;
window.toggleIntervalForm = toggleIntervalForm;
window.confirmAddQuantity = confirmAddQuantity;
window.toggleFontFeatures = toggleFontFeatures;
window.toggleShowIcons = toggleShowIcons;
window.toggleTimeSlots = toggleTimeSlots;
window.toggleTimeFormat = toggleTimeFormat;
window.resetOnlySettings = resetOnlySettings;