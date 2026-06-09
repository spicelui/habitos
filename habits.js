// --- ESTADO GLOBAL Y CARGA DE DATOS ---
let habits = JSON.parse(localStorage.getItem('habits') || '[]');
let units = JSON.parse(localStorage.getItem('units') || '[]');
let folders = JSON.parse(localStorage.getItem('folders') || '[]');
let currentHabitId = null;
let currentUnitId = null;
let currentFolderId = null;
let currentLogEntry = null;
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

// --- CONFIGURACIONES DE UI ---
let uiSettings = {
    fontFeatures: false,
    cardRadius: 28,
    time24h: false,
    showIcons: true,
    showScheduledFirst: false,
    showUnitLabel: true,
    showTimeOnCard: true,
    showButtonOnCard: true,
    darkLighter: false,
    accentWhiteText: false,
    showProgressBar: true,
    fontFamily: 'Predeterminado',
    grouping: 'folder',
    showOverdue: false
};

let showFolderIconsGlobal = true;

// Folder por defecto
const DEFAULT_FOLDER_ID = 'default';
const DEFAULT_FOLDER = {
    id: DEFAULT_FOLDER_ID,
    name: 'Todos los hábitos',
    icon: '􀈕',
    iconColor: '#007afc'
};

// Asegurar que la carpeta por defecto existe en folders
function ensureDefaultFolder() {
    const defaultExists = folders.some(f => f.id === DEFAULT_FOLDER_ID);
    if (!defaultExists) {
        folders.unshift(DEFAULT_FOLDER);
        localStorage.setItem('folders', JSON.stringify(folders));
    }
}
ensureDefaultFolder();

// --- CONTROL DE SCROLL ---
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
        if (h.type) delete h.type;
        if (!h.timeCondition) h.timeCondition = 'at';
        if (!h.link) h.link = '';
        if (!h.folderId) h.folderId = DEFAULT_FOLDER_ID;
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
        if (customRows) customRows.style.display = preset === 'custom' ? 'flex' : 'none';
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
            customRows.style.display = 'flex';
        } else {
            customRows.style.display = 'none';
            let light, dark;
            switch(val) {
                case 'orange': light = '#ff9500'; dark = '#e58800'; break;
                case 'yellow': light = '#e9ab00'; dark = '#e6b736'; break;
                case 'brown': light = '#a37965'; dark = '#b18b72'; break;
                case 'cyan': light = '#109db6'; dark = '#109db6'; break;
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
            customRows.style.display = 'flex';
        });
    }
    if (darkPicker) {
        darkPicker.addEventListener('input', (e) => {
            setAccentColors(accentLight, e.target.value);
            presetSelect.value = 'custom';
            customRows.style.display = 'flex';
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

// --- OVERLAY Y SHEETS ---
function updateOverlay() {
    const overlay = document.getElementById('overlay');
    if (activeSheet) overlay.classList.add('active');
    else overlay.classList.remove('active');
}

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
        if (id === 'iconPickerSheetFolder' && typeof initIconsFolder === 'function') {
            // Limpiar búsqueda y mostrar todos los íconos
            const searchInput = document.getElementById('iconSearchFolder');
            if (searchInput) searchInput.value = '';
            initIconsFolder('');
        }
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

// --- TOGGLES ---
function toggleHourEnabled() {
    hourEnabled = !hourEnabled;
    const toggle = document.getElementById('hourToggle');
    const timeRow = document.getElementById('timeRowContainer');
    const timeInput = document.getElementById('hTime');
    const whenRow = document.getElementById('whenRowContainer');
    if (hourEnabled) {
        toggle.classList.add('active');
        timeRow.style.display = 'flex';
        whenRow.style.display = 'flex';
        if (!timeInput.value) timeInput.value = new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
    } else {
        toggle.classList.remove('active');
        timeRow.style.display = 'none';
        whenRow.style.display = 'none';
        timeInput.value = '';
    }
}

function setHourToggleState(enabled, timeValue, condition = 'at') {
    hourEnabled = enabled;
    const toggle = document.getElementById('hourToggle');
    const timeRow = document.getElementById('timeRowContainer');
    const timeInput = document.getElementById('hTime');
    const whenRow = document.getElementById('whenRowContainer');
    const whenSelect = document.getElementById('hTimeCondition');
    if (enabled) {
        toggle.classList.add('active');
        timeRow.style.display = 'flex';
        whenRow.style.display = 'flex';
        timeInput.value = timeValue || '';
        if (whenSelect) whenSelect.value = condition;
    } else {
        toggle.classList.remove('active');
        timeRow.style.display = 'none';
        whenRow.style.display = 'none';
        timeInput.value = '';
    }
}

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

// --- UI SETTINGS ---
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
    applyScheduledFirstToggle();
    applyUnitLabelToggle();
    applyTimeOnCardToggle();
    applyButtonOnCardToggle();
    applyDarkLighter();
    applyAccentWhiteText();
    applyProgressBarToggle();
    applyFontFamily();
    applyGrouping();
    applyOverdueToggle();
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
    const fontSelect = document.getElementById('fontSelect');
    if (fontSelect) {
        fontSelect.value = uiSettings.fontFamily;
        fontSelect.addEventListener('change', (e) => {
            uiSettings.fontFamily = e.target.value;
            saveUISettings();
            applyFontFamily();
        });
    }
    const groupingSelect = document.getElementById('groupingSelect');
    if (groupingSelect) {
        groupingSelect.value = uiSettings.grouping;
        groupingSelect.addEventListener('change', (e) => {
            uiSettings.grouping = e.target.value;
            saveUISettings();
            renderHabits();
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

function applyTimeFormatToggleUI() {
    const toggle = document.getElementById('timeFormatToggle');
    if (toggle) {
        if (!uiSettings.time24h) toggle.classList.add('active');
        else toggle.classList.remove('active');
    }
}

function applyScheduledFirstToggle() {
    const toggle = document.getElementById('scheduledFirstToggle');
    if (toggle) {
        if (uiSettings.showScheduledFirst) toggle.classList.add('active');
        else toggle.classList.remove('active');
    }
}

function applyUnitLabelToggle() {
    const toggle = document.getElementById('unitLabelToggle');
    if (toggle) {
        if (uiSettings.showUnitLabel) toggle.classList.add('active');
        else toggle.classList.remove('active');
    }
}

function applyTimeOnCardToggle() {
    const toggle = document.getElementById('timeOnCardToggle');
    if (toggle) {
        if (uiSettings.showTimeOnCard) toggle.classList.add('active');
        else toggle.classList.remove('active');
    }
}

function applyButtonOnCardToggle() {
    const toggle = document.getElementById('buttonOnCardToggle');
    if (toggle) {
        if (uiSettings.showButtonOnCard) toggle.classList.add('active');
        else toggle.classList.remove('active');
    }
}

function applyDarkLighter() {
    if (uiSettings.darkLighter) {
        document.body.classList.add('dark-lighter');
    } else {
        document.body.classList.remove('dark-lighter');
    }
    const toggle = document.getElementById('darkLighterToggle');
    if (toggle) {
        if (uiSettings.darkLighter) toggle.classList.add('active');
        else toggle.classList.remove('active');
    }
}

function applyAccentWhiteText() {
    if (uiSettings.accentWhiteText) {
        document.body.classList.add('accent-white-text');
    } else {
        document.body.classList.remove('accent-white-text');
    }
    const toggle = document.getElementById('accentWhiteTextToggle');
    if (toggle) {
        if (uiSettings.accentWhiteText) toggle.classList.add('active');
        else toggle.classList.remove('active');
    }
}

function applyProgressBarToggle() {
    const toggle = document.getElementById('progressBarToggle');
    if (toggle) {
        if (uiSettings.showProgressBar) toggle.classList.add('active');
        else toggle.classList.remove('active');
    }
}

function applyFontFamily() {
    let font = '';
    switch (uiSettings.fontFamily) {
        case 'Helvetica': font = 'Helvetica, sans-serif'; break;
        case 'Roboto': font = 'Roboto, sans-serif'; break;
        case 'Inter': font = 'Inter, -apple-system, "sf", sans-serif'; break;
        default: font = '';
    }
    document.body.style.fontFamily = font;
}

function applyGrouping() {
    renderHabits();
}

function applyOverdueToggle() {
    const toggle = document.getElementById('overdueToggle');
    if (toggle) {
        if (uiSettings.showOverdue) toggle.classList.add('active');
        else toggle.classList.remove('active');
    }
    renderHabits();
}

// --- TOGGLE FUNCTIONS ---
function toggleFontFeatures() { uiSettings.fontFeatures = !uiSettings.fontFeatures; saveUISettings(); applyFontFeatures(); }
function toggleShowIcons() { uiSettings.showIcons = !uiSettings.showIcons; saveUISettings(); applyShowIconsToggleUI(); renderHabits(); }
function toggleTimeFormat() { uiSettings.time24h = !uiSettings.time24h; saveUISettings(); applyTimeFormatToggleUI(); renderHabits(); if (activeSheet === 'viewSheet' && currentHabitId) openViewById(currentHabitId); if (activeSheet === 'historySheet') openHistorySheet(); }
function toggleScheduledFirst() { uiSettings.showScheduledFirst = !uiSettings.showScheduledFirst; saveUISettings(); applyScheduledFirstToggle(); renderHabits(); }
function toggleUnitLabel() { uiSettings.showUnitLabel = !uiSettings.showUnitLabel; saveUISettings(); applyUnitLabelToggle(); renderHabits(); }
function toggleTimeOnCard() { uiSettings.showTimeOnCard = !uiSettings.showTimeOnCard; saveUISettings(); applyTimeOnCardToggle(); renderHabits(); }
function toggleButtonOnCard() { uiSettings.showButtonOnCard = !uiSettings.showButtonOnCard; saveUISettings(); applyButtonOnCardToggle(); renderHabits(); }
function toggleDarkLighter() { uiSettings.darkLighter = !uiSettings.darkLighter; saveUISettings(); applyDarkLighter(); }
function toggleAccentWhiteText() { uiSettings.accentWhiteText = !uiSettings.accentWhiteText; saveUISettings(); applyAccentWhiteText(); }
function toggleProgressBar() { uiSettings.showProgressBar = !uiSettings.showProgressBar; saveUISettings(); applyProgressBarToggle(); renderHabits(); }
function toggleOverdue() { uiSettings.showOverdue = !uiSettings.showOverdue; saveUISettings(); applyOverdueToggle(); renderHabits(); }

function resetOnlySettings() {
    if (confirm('Restablecer solo la configuración de apariencia y organización? (No se perderán hábitos ni unidades)')) {
        uiSettings = {
            fontFeatures: true, cardRadius: 26, time24h: true, showIcons: true, showScheduledFirst: false,
            showUnitLabel: true, showTimeOnCard: true, showButtonOnCard: true, darkLighter: false,
            accentWhiteText: false, showProgressBar: true, fontFamily: 'Predeterminado', grouping: 'folder', showOverdue: true
        };
        saveUISettings();
        applyFontFeatures(); applyCardRadius(); applyShowIconsToggleUI(); applyTimeFormatToggleUI();
        applyScheduledFirstToggle(); applyUnitLabelToggle(); applyTimeOnCardToggle(); applyButtonOnCardToggle();
        applyDarkLighter(); applyAccentWhiteText(); applyProgressBarToggle(); applyFontFamily(); applyGrouping(); applyOverdueToggle();
        const radiusInput = document.getElementById('cardRadiusInput'); if (radiusInput) radiusInput.value = 26;
        const fontSelect = document.getElementById('fontSelect'); if (fontSelect) fontSelect.value = 'Predeterminado';
        const groupingSelect = document.getElementById('groupingSelect'); if (groupingSelect) groupingSelect.value = 'folder';
        renderHabits();
        if (activeSheet === 'viewSheet' && currentHabitId) openViewById(currentHabitId);
        if (activeSheet === 'historySheet') openHistorySheet();
    }
}

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

function isHabitOverdue(habit) {
    if (!uiSettings.showOverdue || !habit.time || habit.timeCondition !== 'before') return false;
    const qty = habit.history[selectedDate] || 0;
    if (qty >= habit.goal) return false;
    const now = new Date();
    const [h, m] = habit.time.split(':');
    const habitTime = new Date(); habitTime.setHours(parseInt(h), parseInt(m), 0);
    return now > habitTime;
}

function isHabitCompleted(habit, qty) {
    return qty >= habit.goal;
}

// --- RENDER HÁBITOS ---
let searchQuery = '';

function getHabitCardHTML(h) {
    const qty = h.history[selectedDate] || 0;
    const isComplete = isHabitCompleted(h, qty);
    const overdue = isHabitOverdue(h);
    let progress = Math.min(100, (qty / h.goal) * 100);
    const unit = h.isInterval ? (h.intervalUnit === 'hours' ? 'horas' : 'minutos') : getUnitById(h.unitId).plural;
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
    let displayTime = (uiSettings.showTimeOnCard && h.time) ? formatTimeByPreference(h.time) : '';
    const timeClass = overdue ? 'overdue-time' : '';
    const iconHtml = uiSettings.showIcons ? `<div class="habitIconCircle" style="color: ${h.iconColor}">${h.icon}</div>` : '';
    const progressBarHtml = uiSettings.showProgressBar && h.goal > 1 ? `<div class="progress"><div class="habitProgressBar"><div class="habitProgressBarInner" data-w="${progress}%" style="width: ${progress}%; background: ${h.iconColor};"></div></div></div>` : '';
    const buttonHtml = uiSettings.showButtonOnCard ? `<button class="botoncito" style="${buttonStyle}" onclick="event.stopPropagation(); ${buttonAction}">${buttonLabel}</button>` : '';
    
    let progressBadgeHtml = '';
    if (uiSettings.showUnitLabel && h.goal > 1 && qty > 0 && qty !== h.goal) {
        progressBadgeHtml = `<div class="habitProgressBadge" style="color: ${h.iconColor}"><div class="cantidad"><div class="hecho">${qtyDisplay} ${unit}</div><div class="meta">${goalDisplay} ${unit}</div></div></div>`;
    }
    
    return `<div class="habitCard ${isComplete ? 'completed' : ''}" data-id="${h.id}" onclick="openViewById('${h.id}')">
        <div class="supcard">
            ${iconHtml}
            <div class="habitInfo">
                <div class="details">
                    <div class="dup"><div class="habitName">${h.name}</div></div>
                    ${displayTime ? `<div class="habitTime ${timeClass}">${displayTime}</div>` : ''}
                    ${progressBarHtml}
                    ${progressBadgeHtml}
                </div>
            </div>
            ${buttonHtml}
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
    let activeHabits = habits.filter(h => {
        if (h.dias && !h.dias.includes(wd)) return false;
        if (searchQuery && !h.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });
    
    const sorted = [...activeHabits].sort((a, b) => {
        const ca = isHabitCompleted(a, a.history[selectedDate] || 0);
        const cb = isHabitCompleted(b, b.history[selectedDate] || 0);
        if (ca !== cb) return ca ? 1 : -1;
        if (uiSettings.showScheduledFirst) {
            return (a.time || "99:99").localeCompare(b.time || "99:99");
        } else {
            const aHasTime = !!a.time, bHasTime = !!b.time;
            if (aHasTime !== bHasTime) return aHasTime ? 1 : -1;
            return (a.time || "99:99").localeCompare(b.time || "99:99");
        }
    });

    function getTimeSlot(habit) {
        if (!habit.time) return 'sinhora';
        const hour = parseInt(habit.time.split(':')[0]);
        if (hour < 12) return 'manana';
        if (hour < 18) return 'tarde';
        return 'noche';
    }
    const slotNames = { manana: 'Mañana', tarde: 'Tarde', noche: 'Noche', sinhora: 'En cualquier momento' };

    if (uiSettings.grouping === 'folder') {
        const foldersMap = new Map();
        for (let folder of folders) {
            foldersMap.set(folder.id, { folder, habits: [] });
        }
        
        for (let h of sorted) {
            const fid = h.folderId || DEFAULT_FOLDER_ID;
            if (foldersMap.has(fid)) {
                foldersMap.get(fid).habits.push(h);
            } else {
                foldersMap.get(DEFAULT_FOLDER_ID).habits.push(h);
            }
        }
        
        let html = '';
        for (let [_, group] of foldersMap) {
            if (group.habits.length) {
                const folder = group.folder;
                const showFolderIcon = showFolderIconsGlobal;
                html += `<div class="folder-group"><div class="folder-header">${showFolderIcon ? `<span style="font-size: 1.1rem; font-weight: 450; color:${folder.iconColor}">${folder.icon}</span>` : ''}<span>${folder.name}</span></div>`;
                html += `<div class="cards">${group.habits.map(h => getHabitCardHTML(h)).join('')}</div>`;
                html += `</div>`;
            }
        }
        container.innerHTML = html || `<div class="message">No hay hábitos para hoy.</div>`;
    } else if (uiSettings.grouping === 'time') {
        const groups = { manana: [], tarde: [], noche: [], sinhora: [] };
        for (let h of sorted) groups[getTimeSlot(h)].push(h);
        let html = '';
        for (let [slot, habitsList] of Object.entries(groups)) {
            if (habitsList.length) {
                html += `<div class="folder-group"><span class="folder-header">${slotNames[slot]}</span>`;
                html += `<div class="cards">${habitsList.map(h => getHabitCardHTML(h)).join('')}</div>`;
                html += `</div>`;
            }
        }
        container.innerHTML = html || `<div class="message">No hay hábitos para hoy.</div>`;
    } else {
        container.innerHTML = sorted.length ? sorted.map(h => getHabitCardHTML(h)).join('') : `<div class="message">No hay hábitos para hoy.</div>`;
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

function searchHabits() {
    const input = document.getElementById('habitSearchInput');
    searchQuery = input.value;
    renderHabits();
}

// --- LOGS ---
function addLog(habitId, amount, dateStr, timeStr, extra = null, notes = '') {
    const habit = habits.find(h => h.id === habitId);
    if (!habit || amount <= 0) return;
    if (!habit.logs) habit.logs = [];
    const logEntry = { date: dateStr, time: timeStr, amount: amount, notes: notes };
    if (extra && habit.isInterval) {
        logEntry.startTime = extra.startTime;
        logEntry.endTime = extra.endTime;
        logEntry.startDate = extra.startDate;
        logEntry.endDate = extra.endDate;
        logEntry.durationSeconds = extra.durationSeconds;
    }
    habit.logs.push(logEntry);
    localStorage.setItem('habits', JSON.stringify(habits));
}

function deleteLog(habitId, logIndex) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    const log = habit.logs[logIndex];
    if (!log) return;
    habit.logs.splice(logIndex, 1);
    
    const date = log.date;
    const logsForDate = habit.logs.filter(l => l.date === date);
    const total = logsForDate.reduce((sum, l) => sum + l.amount, 0);
    if (total === 0) {
        delete habit.history[date];
    } else {
        habit.history[date] = total;
    }
    
    localStorage.setItem('habits', JSON.stringify(habits));
    if (activeSheet === 'logViewSheet') closeSheet('logViewSheet');
    if (activeSheet === 'historySheet') openHistorySheet();
    renderHabits();
}

function openLogView(log, index, habitId) {
    currentLogEntry = { log, index, habitId };
    const habit = habits.find(h => h.id === habitId);
    const unit = habit.isInterval ? (habit.intervalUnit === 'hours' ? 'horas' : 'minutos') : getUnitById(habit.unitId).plural;
    document.getElementById('logTypeValue').textContent = habit.isInterval ? 'Intervalo' : 'Numérico';
    document.getElementById('logDateValue').textContent = log.date;
    document.getElementById('logTimeValue').textContent = log.time || '-';
    document.getElementById('logAmountValue').textContent = `${formatQuantity(log.amount)} ${unit}`;
    document.getElementById('logNotesValue').textContent = log.notes || '-';
    const intervalContainer = document.getElementById('logIntervalContainer');
    if (habit.isInterval && log.startTime) {
        intervalContainer.style.display = 'block';
        document.getElementById('logStartDateTime').textContent = `${log.startDate || log.date} ${log.startTime || ''}`;
        document.getElementById('logEndDateTime').textContent = `${log.endDate || log.date} ${log.endTime || ''}`;
    } else {
        intervalContainer.style.display = 'none';
    }
    openSheet('logViewSheet');
}

function deleteCurrentLog() {
    if (currentLogEntry && confirm('¿Eliminar este registro?')) {
        deleteLog(currentLogEntry.habitId, currentLogEntry.index);
        currentLogEntry = null;
        closeSheet('logViewSheet');
    }
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
    sorted.forEach((log, idx) => {
        let amountText = `${formatQuantity(log.amount)} ${unit}`;
        if (habit.isInterval && log.startTime && log.durationSeconds) {
            amountText = formatDuration(log.durationSeconds);
        }
        const displayTime = log.time ? formatTimeByPreference(log.time) : '';
        const row = document.createElement('div');
        row.className = 'row';
        row.style.cursor = 'pointer';
        row.innerHTML = `<div><div class="history-date">${log.date}</div><div class="history-time">${displayTime}</div></div><div class="history-amount">${amountText}</div>`;
        row.onclick = () => openLogView(log, logs.length - 1 - idx, currentHabitId);
        container.appendChild(row);
    });
    openSheet('historySheet');
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

    const descRow = document.getElementById('vDescription').closest('.row');
    if (habit.description && habit.description.trim() !== '') {
        document.getElementById('vDescription').textContent = habit.description;
        descRow.style.display = 'flex';
    } else {
        descRow.style.display = 'none';
    }
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
    } else {
        qtyControls.style.display = 'flex';
        timerBtn.style.display = 'none';
    }
    if (bottomBtns) {
        const completeBtn = bottomBtns.querySelector('.btn-blue');
        if (completeBtn) completeBtn.style.display = 'block';
    }
    
    let existingTimeElem = document.getElementById('vTimeDisplay');
    if (!existingTimeElem && habit.time) {
        const descDiv = document.getElementById('vDescription');
        const timeDiv = document.createElement('div');
        timeDiv.id = 'vTimeDisplay';
        timeDiv.style.fontSize = '0.85rem';
        timeDiv.style.color = '#666';
        timeDiv.style.margin = '4px 0 8px';
        if (descDiv && descDiv.parentNode) descDiv.parentNode.insertBefore(timeDiv, descDiv.nextSibling);
        existingTimeElem = timeDiv;
    }
    if (habit.time && existingTimeElem) {
        existingTimeElem.textContent = formatTimeByPreference(habit.time);
    } else if (existingTimeElem && !habit.time) {
        existingTimeElem.remove();
    }
    const linkRow = document.getElementById('vLinkRow');
    const linkValue = document.getElementById('vLinkValue');
    if (habit.link) {
        linkRow.style.display = 'flex';
        linkValue.href = habit.link;
        linkValue.textContent = habit.link;
    } else {
        linkRow.style.display = 'none';
    }
    const folderRow = document.getElementById('vFolderRow');
    const folderValue = document.getElementById('vFolderValue');
    const folder = folders.find(f => f.id === habit.folderId) || DEFAULT_FOLDER;
    folderRow.style.display = 'flex';
    folderValue.textContent = folder.name;
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
    const timeCondition = document.getElementById('hTimeCondition') ? document.getElementById('hTimeCondition').value : 'at';
    const link = document.getElementById('hLink').value.trim();
    const folderId = document.getElementById('hFolderSelect').value;
    const habit = {
        id, name, goal, step: parseFloat(document.getElementById('hStep').value) || 1,
        time: hourEnabled ? document.getElementById('hTime').value : null,
        icon: selectedIcon, iconColor: selectedColor, history, logs,
        dias: [...diasSeleccionados], unitId, description: document.getElementById('hDescription').value,
        isInterval, intervalUnit, timeCondition, link, folderId
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
    let newQty = oldQty + (dir * h.step);
    if (newQty < 0) newQty = 0;
    if (newQty > h.goal) newQty = h.goal;
    const increment = newQty - oldQty;
    if (increment === 0) return;
    const wasComplete = isHabitCompleted(h, oldQty);
    const isComplete = isHabitCompleted(h, newQty);
    h.history[selectedDate] = newQty;
    if (increment > 0) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
        addLog(id, increment, selectedDate, timeStr);
    } else {
        const logsForDate = h.logs.filter(l => l.date === selectedDate).sort((a,b) => new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time));
        if (logsForDate.length > 0) {
            const lastLog = logsForDate[0];
            const idxLog = h.logs.findIndex(l => l === lastLog);
            if (idxLog !== -1) h.logs.splice(idxLog, 1);
        }
    }
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
    h.logs = h.logs.filter(l => l.date !== selectedDate);
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
    let needed = h.goal - oldQty;
    if (needed <= 0) return;
    h.history[selectedDate] = h.goal;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
    addLog(currentHabitId, needed, selectedDate, timeStr);
    localStorage.setItem('habits', JSON.stringify(habits));
    document.getElementById('vQtyManual').value = h.goal;
    renderHabits(h.id, true, false, true);
    document.getElementById('streakNumberInView').textContent = `${getStreak(h)} días`;
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
        document.getElementById('intervalStartDate').value = selectedDate;
        document.getElementById('intervalEndDate').value = selectedDate;
        updateIntervalPreview();
        document.getElementById('intervalStart').onchange = updateIntervalPreview;
        document.getElementById('intervalEnd').onchange = updateIntervalPreview;
        document.getElementById('intervalStartDate').onchange = updateIntervalPreview;
        document.getElementById('intervalEndDate').onchange = updateIntervalPreview;
    } else {
        numericDiv.style.display = 'block';
        intervalDiv.style.display = 'none';
        document.getElementById('addQtyInput').value = '0';
        document.getElementById('addQtyNotes').value = '';
        document.getElementById('addQtyDate').value = selectedDate;
        document.getElementById('addQtyTime').value = new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
    }
    openSheet('addQuantitySheet');
}

function updateIntervalPreview() {
    const startDate = document.getElementById('intervalStartDate').value;
    const endDate = document.getElementById('intervalEndDate').value;
    const startTime = document.getElementById('intervalStart').value;
    const endTime = document.getElementById('intervalEnd').value;
    if (!startDate || !endDate || !startTime || !endTime) return;
    const start = new Date(`${startDate}T${startTime}`);
    let end = new Date(`${endDate}T${endTime}`);
    const diffSec = (end - start) / 1000;
    const previewDiv = document.getElementById('timerLogPreview');
    if (previewDiv) previewDiv.textContent = `Duración: ${formatDuration(Math.max(0, diffSec))}`;
}

function confirmAddQuantity() {
    const habit = habits.find(h => h.id === currentHabitId);
    if (!habit) return;
    if (habit.isInterval) {
        let startDate = document.getElementById('intervalStartDate').value;
        let endDate = document.getElementById('intervalEndDate').value;
        let startTime = document.getElementById('intervalStart').value;
        let endTime = document.getElementById('intervalEnd').value;
        let notes = document.getElementById('addQtyNotesInterval').value;
        if (!startDate || !endDate || !startTime || !endTime) return;
        let start = new Date(`${startDate}T${startTime}`);
        let end = new Date(`${endDate}T${endTime}`);
        let durationSec = (end - start) / 1000;
        if (durationSec <= 0) return alert('La fecha/hora de fin debe ser posterior a la de inicio');
        let amount = habit.intervalUnit === 'hours' ? durationSec / 3600 : durationSec / 60;
        const oldQty = habit.history[selectedDate] || 0;
        let newQty = Math.min(oldQty + amount, habit.goal);
        habit.history[selectedDate] = newQty;
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
        addLog(currentHabitId, amount, selectedDate, timeStr, { startTime, endTime, startDate, endDate, durationSeconds: durationSec }, notes);
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
        const customDate = document.getElementById('addQtyDate').value;
        const customTime = document.getElementById('addQtyTime').value;
        const notes = document.getElementById('addQtyNotes').value;
        const oldQty = habit.history[customDate] || 0;
        let newQty = Math.min(oldQty + addValue, habit.goal);
        habit.history[customDate] = newQty;
        addLog(currentHabitId, addValue, customDate, customTime, null, notes);
        localStorage.setItem('habits', JSON.stringify(habits));
        if (customDate === selectedDate) {
            document.getElementById('vQtyManual').value = newQty;
            renderHabits(habit.id, true, oldQty >= habit.goal, newQty >= habit.goal);
            document.getElementById('streakNumberInView').textContent = `${getStreak(habit)} días`;
        } else {
            renderHabits();
        }
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
        if (isHabitCompleted(h, qty)) streak++;
        else {
            let todayStr = new Date().toISOString().split('T')[0];
            if (key !== todayStr) break;
        }
        curr.setDate(curr.getDate() - 1);
    }
    return streak;
}

function getLongestStreakForHabit(habit) {
    let maxStreak = 0, currentStreak = 0;
    let dates = Object.keys(habit.history).sort();
    if (dates.length === 0) return 0;
    let prevDate = null;
    for (let date of dates) {
        let qty = habit.history[date] || 0;
        let isComplete = isHabitCompleted(habit, qty);
        if (isComplete) {
            if (prevDate) {
                let diff = (new Date(date) - new Date(prevDate)) / (1000*3600*24);
                currentStreak = diff === 1 ? currentStreak + 1 : 1;
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

// --- CALENDARIO ---
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
        if (isHabitCompleted(habit, qty)) { cell.querySelector('.dayNum').style.color = habit.iconColor; cell.querySelector('.dayNum').style.fontWeight = '700'; }
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
    for (let i=6; i>=0; i--) { let d = new Date(today); d.setDate(today.getDate()-i); let key = d.toISOString().split('T')[0]; let qty = habit.history[key] || 0; let p = Math.min(100, (qty/habit.goal)*100); values.push(p); }
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

// --- GESTIÓN DE CARPETAS ---
function openFoldersSheet() {
    const container = document.getElementById('foldersList');
    container.innerHTML = '';
    folders.forEach(folder => {
        const row = document.createElement('div');
        row.className = 'row';
        row.style.cursor = 'pointer';
        const iconColor = folder.iconColor || '#0076fa';
        row.innerHTML = `<span><span style="margin-right:8px; color:${iconColor};">${folder.icon}</span> ${folder.name}</span><span class="chevron">􀆊</span>`;
        row.onclick = () => openFolderEditSheet(folder.id);
        container.appendChild(row);
    });
    
    const toggle = document.getElementById('folderShowIconsToggle');
    if (toggle) {
        if (showFolderIconsGlobal) toggle.classList.add('active');
        else toggle.classList.remove('active');
    }
    openSheet('foldersSheet');
}

function openFolderEditSheet(folderId = null) {
    currentFolderId = folderId;
    const deleteRow = document.getElementById('deleteFolderRow');
    if (folderId) {
        const folder = folders.find(f => f.id === folderId);
        document.getElementById('folderName').value = folder.name;
        const trigger = document.getElementById('folderIconTrigger');
        trigger.textContent = folder.icon;
        trigger.style.color = folder.iconColor || '#0076fa';
        folderSelectedIcon = folder.icon;
        folderSelectedColor = folder.iconColor || '#0076fa';
        const folderColorPicker = document.getElementById('folderIconColorPicker');
        if (folderColorPicker) folderColorPicker.value = folderSelectedColor;
        const preview = document.getElementById('folderColorPreview');
        if (preview) preview.style.background = folderSelectedColor;
        deleteRow.style.display = 'block';
    } else {
        document.getElementById('folderName').value = '';
        const trigger = document.getElementById('folderIconTrigger');
        trigger.textContent = '􀈕';
        trigger.style.color = '#0076fa';
        folderSelectedIcon = '􀈕';
        folderSelectedColor = '#0076fa';
        deleteRow.style.display = 'none';
    }
    openSheet('folderEditSheet');
}

function saveFolder() {
    const name = document.getElementById('folderName').value.trim();
    if (!name) return alert('Nombre obligatorio');
    if (currentFolderId) {
        const folder = folders.find(f => f.id === currentFolderId);
        folder.name = name;
        folder.icon = folderSelectedIcon;
        folder.iconColor = folderSelectedColor;
    } else {
        folders.push({ id: genId(), name, icon: folderSelectedIcon, iconColor: folderSelectedColor });
    }
    localStorage.setItem('folders', JSON.stringify(folders));
    populateFolderSelect();
    closeSheet('folderEditSheet');
    openFoldersSheet();
    renderHabits();
}

function deleteFolder() {
    if (!currentFolderId || currentFolderId === DEFAULT_FOLDER_ID) return;
    if (confirm('¿Eliminar esta carpeta? Los hábitos quedarán en "Todos los hábitos".')) {
        folders = folders.filter(f => f.id !== currentFolderId);
        habits.forEach(h => { if (h.folderId === currentFolderId) h.folderId = DEFAULT_FOLDER_ID; });
        localStorage.setItem('folders', JSON.stringify(folders));
        localStorage.setItem('habits', JSON.stringify(habits));
        populateFolderSelect();
        closeSheet('folderEditSheet');
        openFoldersSheet();
        renderHabits();
    }
}

function toggleFolderShowIcons() {
    showFolderIconsGlobal = !showFolderIconsGlobal;
    localStorage.setItem('showFolderIconsGlobal', showFolderIconsGlobal);
    const toggle = document.getElementById('folderShowIconsToggle');
    if (toggle) {
        if (showFolderIconsGlobal) toggle.classList.add('active');
        else toggle.classList.remove('active');
    }
    renderHabits();
}

function populateFolderSelect() {
    const select = document.getElementById('hFolderSelect');
    if (!select) return;
    select.innerHTML = '';
    folders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder.id;
        option.textContent = folder.name;
        select.appendChild(option);
    });
}

// --- GESTIÓN DE HÁBITOS ---
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
    if (confirm('¿Eliminar TODOS los hábitos? Esta acción no se puede deshacer.')) {
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
    document.getElementById('hLink').value = '';
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
    populateFolderSelect();
}

function editHabit() {
    const habit = habits.find(h => h.id === currentHabitId);
    if (!habit) return;
    document.getElementById('deleteHabitRow').style.display = 'block';
    document.getElementById('hName').value = habit.name;
    document.getElementById('hDescription').value = habit.description || '';
    document.getElementById('hGoal').value = habit.goal;
    document.getElementById('hStep').value = habit.step;
    document.getElementById('hLink').value = habit.link || '';
    setHourToggleState(!!habit.time, habit.time || '', habit.timeCondition || 'at');
    setIntervalFormState(habit.isInterval || false, habit.intervalUnit || null);
    selectedIcon = habit.icon;
    selectedColor = habit.iconColor;
    iconTrigger.textContent = habit.icon;
    iconTrigger.style.color = habit.iconColor;
    if (preview) preview.style.background = habit.iconColor;
    diasSeleccionados = habit.dias ? [...habit.dias] : [0,1,2,3,4,5,6];
    actualizarUIDias();
    if (!habit.isInterval && habit.unitId) document.getElementById('hUnitSelect').value = habit.unitId;
    if (habit.folderId) document.getElementById('hFolderSelect').value = habit.folderId;
    closeSheet('viewSheet', () => openSheet('createSheet'));
}

function handleCloseHabit() { closeSheet(activeSheet); }

// --- EXPORTAR / IMPORTAR ---
function exportData() {
    const data = { habits, units, folders };
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
                if (imported.folders) folders = imported.folders;
                ensureDefaultFolder();
                migrateHabits();
                renderHabits();
                populateUnitSelect();
                populateFolderSelect();
                alert('Datos importados correctamente');
                closeSheet('settingsSheet');
            }
        } catch (err) { alert('Archivo inválido'); }
    };
    reader.readAsText(file);
}

function confirmDeleteAllData() {
    if (confirm('Esto eliminará TODOS los hábitos y unidades. ¿Continuar?')) {
        habits = [];
        units = [{ id: genId(), singular: 'vez', plural: 'veces' }];
        folders = [DEFAULT_FOLDER];
        localStorage.setItem('habits', '[]');
        localStorage.setItem('units', JSON.stringify(units));
        localStorage.setItem('folders', JSON.stringify(folders));
        renderHabits();
        populateUnitSelect();
        populateFolderSelect();
        closeSheet('settingsSheet');
    }
}

// --- TIMER ---
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
    let amount = habit.intervalUnit === 'hours' ? currentTimerLog.durationSeconds / 3600 : currentTimerLog.durationSeconds / 60;
    if (amount <= 0) {
        alert('La duración registrada es cero, no se guardará.');
        return;
    }
    const oldQty = habit.history[selectedDate] || 0;
    let newQty = Math.min(oldQty + amount, habit.goal);
    habit.history[selectedDate] = newQty;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
    addLog(currentHabitId, amount, selectedDate, timeStr, {
        startTime: currentTimerLog.startTime,
        endTime: currentTimerLog.endTime,
        durationSeconds: currentTimerLog.durationSeconds,
        startDate: selectedDate,
        endDate: selectedDate
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
    
    const savedFolderIcons = localStorage.getItem('showFolderIconsGlobal');
    if (savedFolderIcons !== null) {
        showFolderIconsGlobal = savedFolderIcons === 'true';
    }
    
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
    populateFolderSelect();
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
    const folderIconTrigger = document.getElementById('folderIconTrigger');
    if (folderIconTrigger) {
        folderIconTrigger.addEventListener('click', () => openSheet('iconPickerSheetFolder'));
    }
    
    window.addEventListener('scroll', handleTopbarOnScroll);
    handleTopbarOnScroll();
    
    const topbar = document.querySelector('.topbar');
    if (topbar && !topbar.querySelector('.minimized-title')) {
        const titleSpan = document.createElement('span');
        titleSpan.className = 'minimized-title';
        titleSpan.textContent = 'Habits';
        topbar.appendChild(titleSpan);
    }
    
    loadUISettings();
    updateLongestStreakDisplay();
    
    const searchInput = document.getElementById('habitSearchInput');
    if (searchInput) searchInput.addEventListener('input', searchHabits);
    // Iniciar notificaciones
setupNotificationPermission();
startNotificationScheduler();
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
    if (diasSeleccionados.includes(dia)) {
        diasSeleccionados = diasSeleccionados.filter(d => d !== dia);
    } else {
        diasSeleccionados.push(dia);
        diasSeleccionados.sort((a,b)=>a-b);
    }
    actualizarUIDias();
}

function actualizarUIDias() {
    document.querySelectorAll('#diasTable .diasRow').forEach(row => {
        const dia = parseInt(row.dataset.dia);
        const checkSpan = row.querySelector('.diaCheck');
        checkSpan.textContent = diasSeleccionados.includes(dia) ? '􀆅' : '';
    });
}

// --- EXPOSICIÓN GLOBAL ---
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
window.toggleTimeFormat = toggleTimeFormat;
window.toggleScheduledFirst = toggleScheduledFirst;
window.toggleUnitLabel = toggleUnitLabel;
window.toggleTimeOnCard = toggleTimeOnCard;
window.toggleButtonOnCard = toggleButtonOnCard;
window.toggleDarkLighter = toggleDarkLighter;
window.toggleAccentWhiteText = toggleAccentWhiteText;
window.toggleProgressBar = toggleProgressBar;
window.toggleOverdue = toggleOverdue;
window.resetOnlySettings = resetOnlySettings;
window.openFoldersSheet = openFoldersSheet;
window.openFolderEditSheet = openFolderEditSheet;
window.saveFolder = saveFolder;
window.deleteFolder = deleteFolder;
window.toggleFolderShowIcons = toggleFolderShowIcons;
window.deleteCurrentLog = deleteCurrentLog;
// --- NOTIFICACIONES ---
let notificationPermission = false;
let notificationsEnabled = true;

// Cargar estado de notificaciones
function loadNotificationsState() {
    const saved = localStorage.getItem('notificationsEnabled');
    if (saved !== null) {
        notificationsEnabled = saved === 'true';
    }
    const toggle = document.getElementById('notificationsToggle');
    if (toggle) {
        if (notificationsEnabled) toggle.classList.add('active');
        else toggle.classList.remove('active');
    }
}

// Toggle de notificaciones
function toggleNotifications() {
    notificationsEnabled = !notificationsEnabled;
    localStorage.setItem('notificationsEnabled', notificationsEnabled);
    const toggle = document.getElementById('notificationsToggle');
    if (toggle) {
        if (notificationsEnabled) toggle.classList.add('active');
        else toggle.classList.remove('active');
    }
    
    // Si se activan las notificaciones y aún no hay permiso, pedirlo
    if (notificationsEnabled && !notificationPermission && 'Notification' in window && Notification.permission !== 'denied') {
        requestNotificationPermission();
    }
}

// Solicitar permiso para notificaciones
async function requestNotificationPermission() {
    if (!notificationsEnabled) return;
    if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        notificationPermission = permission === 'granted';
        if (notificationPermission) {
            console.log('Notificaciones permitidas');
        }
    }
}

// Enviar notificación
function sendNotification(title, body, tag = 'habit') {
    if (!notificationsEnabled) return;
    if (!notificationPermission) return;
    
    new Notification(title, {
        body: body,
        icon: '/icon-192.png',
        tag: tag,
        requireInteraction: false,
        silent: false
    });
}

// Verificar hábitos programados
function checkScheduledHabits() {
    if (!notificationsEnabled) return;
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;
    
    let currentDay = now.getDay();
    currentDay = currentDay === 0 ? 6 : currentDay - 1;
    
    for (let habit of habits) {
        if (!habit.time) continue;
        if (habit.dias && !habit.dias.includes(currentDay)) continue;
        
        const completedToday = (habit.history[todayStr] || 0) >= habit.goal;
        if (completedToday) continue;
        
        let shouldNotify = false;
        
        if (habit.timeCondition === 'at') {
            shouldNotify = habit.time === currentTime;
        } else if (habit.timeCondition === 'before') {
            shouldNotify = currentTime >= habit.time;
        } else if (habit.timeCondition === 'after') {
            const lastNotified = localStorage.getItem(`notified_${habit.id}_${todayStr}`);
            if (!lastNotified && currentTime >= habit.time) {
                shouldNotify = true;
            }
        }
        
        if (shouldNotify) {
            const unitName = habit.isInterval ? (habit.intervalUnit === 'hours' ? 'horas' : 'minutos') : getUnitById(habit.unitId).plural;
            sendNotification(
                `⏰ ${habit.name}`,
                `Objetivo: ${habit.goal} ${unitName}. ¿Ya lo cumpliste?`,
                habit.id
            );
            localStorage.setItem(`notified_${habit.id}_${todayStr}`, 'true');
        }
    }
}

function startNotificationScheduler() {
    checkScheduledHabits();
    setInterval(checkScheduledHabits, 60000);
}

function setupNotificationPermission() {
    // Al abrir settings, si el toggle está activo y no hay permiso, mostrar opción
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            if (notificationsEnabled && !notificationPermission && 'Notification' in window && Notification.permission !== 'denied') {
                // No pedir automáticamente, solo si el usuario quiere
            }
        });
    }
    
    // También al hacer clic en cualquier parte (solo si las notificaciones están activadas)
    document.addEventListener('click', function onClick() {
        if (notificationsEnabled && !notificationPermission && 'Notification' in window && Notification.permission === 'default') {
            requestNotificationPermission();
            document.removeEventListener('click', onClick);
        }
    }, { once: true });
}

function cleanOldNotificationMarks() {
    const today = new Date().toISOString().split('T')[0];
    for (let key in localStorage) {
        if (key.startsWith('notified_') && !key.includes(today)) {
            localStorage.removeItem(key);
        }
    }
}

// Inicializar todo
cleanOldNotificationMarks();
loadNotificationsState();
setupNotificationPermission();
startNotificationScheduler();
// Folder icon picker globals
let folderSelectedIcon = '􀈕';
let folderSelectedColor = '#0076ff';
const folderColorPicker = document.getElementById('folderIconColorPicker');
const folderColorPreview = document.getElementById('folderColorPreview');
if (folderColorPicker) {
    folderColorPicker.addEventListener('input', (e) => {
        folderSelectedColor = e.target.value;
        folderColorPreview.style.background = folderSelectedColor;
        const trigger = document.getElementById('folderIconTrigger');
        if (trigger) trigger.style.color = folderSelectedColor;
        initIconsFolder();
    });
}

function initIconsFolder(filter = "") {
    const grid = document.getElementById('iconGridFolder');
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
                if (icon.char === folderSelectedIcon) div.classList.add('selected');
                div.style.color = icon.char === folderSelectedIcon ? folderSelectedColor : '#8e8e93';
                div.onclick = () => {
                    folderSelectedIcon = icon.char;
                    const trigger = document.getElementById('folderIconTrigger');
                    if (trigger) {
                        trigger.textContent = folderSelectedIcon;
                        trigger.style.color = folderSelectedColor;
                    }
                    closeSheet('iconPickerSheetFolder', () => openSheet('folderEditSheet'));
                };
                subGrid.appendChild(div);
            });
            catWrap.appendChild(subGrid);
            grid.appendChild(catWrap);
        }
    }
}

document.getElementById('confirmIconBtnFolder')?.addEventListener('click', () => {
    closeSheet('iconPickerSheetFolder', () => openSheet('folderEditSheet'));
});
document.getElementById('iconSearchFolder')?.addEventListener('input', (e) => initIconsFolder(e.target.value));
document.getElementById('clearIconSearchBtnFolder')?.addEventListener('click', () => {
    document.getElementById('iconSearchFolder').value = '';
    initIconsFolder('');
});
