// ========================================
// CONFIGURATION - LOAD FROM ENVIRONMENT
// ⚠️ DO NOT COMMIT SECRETS - USE .env.local
// ========================================

// Load environment variables
// (They are injected by GitHub Actions in production, or loaded from .env.local in development)
const getConfig = (key, fallback = '') => {
    // Try window.__ENV__ first (set by build script)
    if (window.__ENV__ && window.__ENV__[key]) {
        return window.__ENV__[key];
    }
    return fallback;
};

const SHEET_ID = getConfig('SHEET_ID', '1_olnGNSI6Nqrx-zDAMN7S629-pIh6mKg4mupi6axctw');
const SHEET_TAB = getConfig('SHEET_TAB', 'Games Zerados');

// URL original para buscar CSV publicado
const ORIGINAL_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_TAB}`;

// CORS proxy (development only). Se a requisição direta for bloqueada pelo CORS,
// o código tentará novamente usando este proxy. Em produção, use um backend
// ou a Google Sheets API corretamente configurada.
const CSV_URL_PROXY = `https://api.allorigins.win/raw?url=${encodeURIComponent(ORIGINAL_CSV_URL)}`;

// Proxy genérico para contornar CORS em desenvolvimento (usa allorigins)
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

// === Atualizar capas configuration ===
// API keys are now loaded from environment variables
const RAWG_API_KEY = getConfig('RAWG_API_KEY', '');
const THEGAMEDB_API_KEY = getConfig('THEGAMEDB_API_KEY', '');
const APPS_SCRIPT_URL = getConfig('APPS_SCRIPT_URL', '');
const APP_TOKEN = getConfig('APP_TOKEN', '');

// Expose to global scope
window.CONFIG = {
    SHEET_ID,
    SHEET_TAB,
    ORIGINAL_CSV_URL,
    CSV_URL_PROXY,
    CORS_PROXY,
    RAWG_API_KEY,
    THEGAMEDB_API_KEY,
    APPS_SCRIPT_URL,
    APP_TOKEN
};