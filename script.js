// ========================================
// CONFIGURATION
// ========================================

// Configurations are now loaded from config.js
// Make sure config.js is loaded before this script in index.html

/* ========================================
    NOTE: MOCK_DATA removed — the app now only reads live data from the Google Sheet.
    If the sheet is not configured or fetching fails, functions will return an empty array.
    ======================================== */

/* ========================================
   STATE
   ======================================== */
let allGames = [];
let currentSort = 'alpha-asc';
let currentPlatformFilter = '';
let currentYearFilter = '';

/* ========================================
   DOM REFERENCES
   ======================================== */
const gamesGrid = document.getElementById('gamesGrid');
const gameCount = document.getElementById('gameCount');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const filterPlatform = document.getElementById('filterPlatform');
const filterYear = document.getElementById('filterYear');

/* ========================================
   CSV PARSING
   ======================================== */
function parseCSV(csv) {
    const lines = csv.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    // Parse header
    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());

    // Find column indices
    const gameIdx = headers.findIndex(h => h.includes('game'));
    const anoIdx = headers.findIndex(h => h.includes('ano'));
    const platIdx = headers.findIndex(h => h.includes('plataforma'));
    const capaIdx = headers.findIndex(h => h.includes('capa'));

    const games = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        if (!cols[gameIdx] || !cols[gameIdx].trim()) continue;

        games.push({
            game: cols[gameIdx]?.trim() || '',
            ano: cols[anoIdx]?.trim() || '',
            plataforma: cols[platIdx]?.trim() || '',
            capa: cols[capaIdx]?.trim() || '',
            // linha original no CSV (útil para atualizar via Apps Script)
            _row: i + 1,
        });
    }
    return games;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result.map(s => s.replace(/^"|"$/g, ''));
}

// Retorna um array de plataformas a partir da string (separador `;`)
function getPlatformsFromString(str) {
    if (!str) return [];
    return str.split(';').map(s => s.trim()).filter(Boolean);
}

// Busca capa usando RAWG (retorna URL ou null). Ajuste se usar outra API.
async function findCoverRAWG(title) {
    if (!window.CONFIG.RAWG_API_KEY) return null;
    try {
        const q = `https://api.rawg.io/api/games?search=${encodeURIComponent(title)}&page_size=1&key=${window.CONFIG.RAWG_API_KEY}`;
        const res = await fetch(q);
        if (!res.ok) return null;
        const data = await res.json();
        const first = data.results && data.results[0];
        return first ? (first.background_image || null) : null;
    } catch (err) {
        console.warn('RAWG search failed for', title, err);
        return null;
    }
}

// Tenta buscar capa no TheGamesDB (mais orientado a capas oficiais). Retorna URL ou null.
async function findCoverTheGamesDB(title, year) {
    if (!window.CONFIG.THEGAMEDB_API_KEY) return null;
    try {
        const q = `https://api.thegamesdb.net/v1/Games/ByGameName?apikey=${window.CONFIG.THEGAMEDB_API_KEY}&name=${encodeURIComponent(title)}&include=boxart,images`;

        // Tenta requisição direta primeiro
        let res;
        try {
            res = await fetch(q);
            if (!res.ok) throw new Error('HTTP ' + res.status);
        } catch (err) {
            // Possível bloqueio CORS — tenta via proxy
            try {
                const prox = window.CONFIG.CORS_PROXY + encodeURIComponent(q);
                res = await fetch(prox);
                if (!res.ok) return null;
            } catch (err2) {
                console.warn('TheGamesDB proxy fetch failed for', title, err2);
                return null;
            }
        }

        const data = await res.json();

        // estrutura esperada: data.data.games (array) e possivelmente data.data.images/base_url
        const games = data && data.data && data.data.games;
        const imagesRoot = data && data.data && data.data.images;
        if (!games || games.length === 0) return null;

        // preferir correspondência por ano quando disponível
        let candidate = games[0];
        if (year) {
            const byYear = games.find(g => String(g.release_date || '').includes(String(year)));
            if (byYear) candidate = byYear;
        }

        // Se o primeiro endpoint não trouxe imagens, buscar detalhes/imagens do jogo por ID
        try {
            const detailsUrl = `https://api.thegamesdb.net/v1/Games/ByGameID?apikey=${window.CONFIG.THEGAMEDB_API_KEY}&id=${candidate.id}&include=boxart,images`;
            let detailsRes;
            try {
                detailsRes = await fetch(detailsUrl);
                if (!detailsRes.ok) throw new Error('HTTP ' + detailsRes.status);
            } catch (err) {
                // tenta via proxy se bloqueado por CORS
                try {
                    const prox2 = window.CONFIG.CORS_PROXY + encodeURIComponent(detailsUrl);
                    detailsRes = await fetch(prox2);
                    if (!detailsRes.ok) return null;
                } catch (err2) {
                    console.warn('TheGamesDB details proxy fetch failed for', title, err2);
                    return null;
                }
            }

            const details = await detailsRes.json();
            const gameData = details && details.data && details.data.games && details.data.games[0];
            const boxarts = details && details.include && details.include.boxart;

            // Verifica campos comuns que podem conter boxart/cover
            if (gameData) {
                let base_url = boxarts.base_url.original;
                let file_name = boxarts.data[gameData.id][0].filename;
                let url_image =  base_url + file_name;
                return url_image;
            }

            // Fallbacks rápidos: candidate pode já ter alguma URL direta em outros campos
            if (candidate.boxart && typeof candidate.boxart === 'string') return candidate.boxart;
            if (candidate.images) {
                const img = candidate.images.cover || candidate.images.boxart || candidate.images.front || null;
                if (img) return img;
            }

            return null;
        } catch (err) {
            console.warn('Erro ao buscar detalhes do jogo no TheGamesDB para', title, err);
            return null;
        }

        return null;
    } catch (err) {
        console.warn('TheGamesDB search failed for', title, err);
        return null;
    }
}

// Envia atualização para Apps Script (deve ser implementado pelo usuário)
async function postUpdateToAppsScript(row, coverUrl) {
    return new Promise((resolve, reject) => {
        const callbackName = '__apps_cb_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

        const params = new URLSearchParams({
            row: String(row),
            cover: coverUrl,
            _token: window.CONFIG.APP_TOKEN,
            callback: callbackName
        });

        const script = document.createElement('script');

        window[callbackName] = (res) => {
            try { delete window[callbackName]; } catch (e) {}
            try { script.remove(); } catch (e) {}
            if (res && res.ok) resolve(res);
            else reject(res || new Error('No response from Apps Script'));
        };

        script.src = `${window.CONFIG.APPS_SCRIPT_URL}?${params.toString()}`;

        script.onerror = () => {
            try { delete window[callbackName]; } catch (e) {}
            try { script.remove(); } catch (e) {}
            reject(new Error('JSONP script load error'));
        };

        document.body.appendChild(script);
    });
}

// Atualiza capas em branco — busca via RAWG e envia atualizações ao Apps Script.
async function updateMissingCovers() {
    const btn = document.getElementById('btnUpdateCovers');
    if (!btn) return;
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = 'Atualizando...';

    try {
        // garante que temos os dados mais recentes
        allGames = await fetchGames();

        const toUpdate = allGames.map((g, idx) => ({ ...g, _index: idx })).filter(g => !g.capa || !g.capa.trim());
        if (toUpdate.length === 0) {
            alert('Nenhuma capa em branco encontrada.');
            return;
        }

        let updated = 0;
        for (const item of toUpdate) {
            // encontra o card DOM para mostrar status
            const cardEl = document.querySelector(`.game-card[data-row="${item._row}"]`);
            if (cardEl) {
                const statusEl = cardEl.querySelector('.card-status');
                if (statusEl) statusEl.textContent = 'Buscando...';
                cardEl.classList.add('updating');
            }

            // tenta buscar capa: TheGamesDB primeiro (se configurado), depois RAWG
            let cover = null;
            if (window.CONFIG.THEGAMEDB_API_KEY) {
                cover = await findCoverTheGamesDB(item.game, item.ano);
            }
            if (!cover && window.CONFIG.RAWG_API_KEY) {
                cover = await findCoverRAWG(item.game);
            }

            if (!cover) {
                if (cardEl) {
                    const statusEl = cardEl.querySelector('.card-status');
                    if (statusEl) statusEl.textContent = 'Não encontrada';
                    cardEl.classList.remove('updating');
                    cardEl.classList.add('not-found');
                }
                continue;
            }

            // envia para Apps Script para atualizar a planilha
            if (item._row) {
                try {
                    await postUpdateToAppsScript(item._row, cover);
                    // atualiza localmente e re-renderiza
                    allGames[item._index].capa = cover;
                    if (cardEl) {
                        const statusEl = cardEl.querySelector('.card-status');
                        if (statusEl) statusEl.textContent = 'Atualizado';
                        cardEl.classList.remove('updating');
                        cardEl.classList.add('updated');
                        // atualizar imagem no card
                        const img = cardEl.querySelector('.card-cover img');
                        if (img) img.src = cover;
                    }
                    updated++;
                    // leve delay para não estourar rate limits
                    await new Promise(r => setTimeout(r, 600));
                } catch (err) {
                    console.warn('Falha ao atualizar planilha para row', item._row, err);
                    if (cardEl) {
                        const statusEl = cardEl.querySelector('.card-status');
                        if (statusEl) statusEl.textContent = 'Erro';
                        cardEl.classList.remove('updating');
                        cardEl.classList.add('error');
                    }
                }
            }
        }

        if (updated > 0) {
            populateFilters(allGames);
            updateView();
            alert(`Capas atualizadas: ${updated}`);
        } else {
            alert('Nenhuma capa encontrada/atualizada. Configure `RAWG_API_KEY` no config.js ou forneça um Apps Script.');
        }
    } catch (err) {
        console.error('Erro ao atualizar capas:', err);
        alert('Erro ao atualizar capas. Veja o console para mais detalhes.');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

/* ========================================
   DATA FETCHING
   ======================================== */
async function fetchGames() {
    if (!window.CONFIG.SHEET_ID) {
        console.error('SHEET_ID não configurado. Defina a constante SHEET_ID no arquivo config.js.');
        return [];
    }

    // Tenta buscar diretamente da URL original primeiro. Se o navegador bloquear
    // por CORS, re-tentamos via `CSV_URL_PROXY`.
    try {
        let response = await fetch(window.CONFIG.ORIGINAL_CSV_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const csv = await response.text();
        const games = parseCSV(csv);
        if (games.length === 0) {
            console.warn('⚠️ Planilha vazia ou formato inesperado. Retornando lista vazia.');
            return [];
        }
        return games;
    } catch (err) {
        console.warn('⚠️ Falha ao buscar diretamente (possível CORS). Tentando proxy...', err);
        try {
            const response = await fetch(window.CONFIG.CSV_URL_PROXY);
            if (!response.ok) throw new Error(`Proxy HTTP ${response.status}`);
            const csv = await response.text();
            const games = parseCSV(csv);
            if (games.length === 0) {
                console.warn('⚠️ Planilha (via proxy) vazia ou formato inesperado. Retornando lista vazia.');
                return [];
            }
            return games;
        } catch (err2) {
            console.error('❌ Erro ao buscar planilha via proxy:', err2);
            console.log('ℹ️ Falha ao buscar planilha. Retornando lista vazia.');
            return [];
        }
    }
}

/* ========================================
   RENDERING
   ======================================== */
function createGameCard(game) {
    const card = document.createElement('div');
    card.className = 'game-card';
    if (game._row) card.dataset.row = String(game._row);

        const coverHTML = game.capa
                ? `<div class="card-cover">
                <img src="${escapeHTML(game.capa)}" alt="${escapeHTML(game.game)}" loading="lazy"
                         onerror="this.parentElement.innerHTML='<div class=\\'card-cover-placeholder\\'>🎮</div>'">
             </div>`
                : `<div class="card-cover-placeholder">🎮</div>`;

        // Suporta múltiplas plataformas separadas por `;` — renderiza uma tag por plataforma
        const platforms = getPlatformsFromString(game.plataforma);
        const platformsHTML = platforms.length > 0
                ? platforms.map(p => `<span class="card-platform">${escapeHTML(p)}</span>`).join(' ')
                : `<span class="card-platform">${escapeHTML(game.plataforma || '')}</span>`;

        card.innerHTML = `
        ${coverHTML}
        <div class="card-info">
            <span class="card-title" title="${escapeHTML(game.game)}">${escapeHTML(game.game)}</span>
            <div class="card-meta">
                ${platformsHTML}
            </div>
            <div class="card-status" aria-hidden="true"></div>
        </div>
    `;

        return card;
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function renderGames(games) {
    gamesGrid.innerHTML = '';

    if (games.length === 0) {
        emptyState.classList.remove('hidden');
        gamesGrid.classList.add('hidden');
    } else {
        emptyState.classList.add('hidden');
        gamesGrid.classList.remove('hidden');
        games.forEach(game => {
            gamesGrid.appendChild(createGameCard(game));
        });
    }

    gameCount.textContent = `${games.length} jogo${games.length !== 1 ? 's' : ''}`;
}

/* ========================================
   FILTERING
   ======================================== */
function filterGames(games) {
    return games.filter(game => {
        const gamePlatforms = getPlatformsFromString(game.plataforma);
        const matchPlatform = !currentPlatformFilter || gamePlatforms.includes(currentPlatformFilter);
        const matchYear = !currentYearFilter || game.ano === currentYearFilter;
        return matchPlatform && matchYear;
    });
}

/* ========================================
   POPULATE FILTER OPTIONS
   ======================================== */
function populateFilters(games) {
    // Platforms (suporta múltiplas plataformas separadas por `;`)
    const platformSet = new Set();
    games.forEach(g => {
        getPlatformsFromString(g.plataforma).forEach(p => platformSet.add(p));
    });
    const platforms = Array.from(platformSet).filter(Boolean).sort();
    filterPlatform.innerHTML = '<option value="">Todas as Plataformas</option>';
    platforms.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        filterPlatform.appendChild(opt);
    });

    // Years
    const years = [...new Set(games.map(g => g.ano).filter(Boolean))].sort((a, b) => parseInt(b) - parseInt(a));
    filterYear.innerHTML = '<option value="">Todos os Anos</option>';
    years.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        filterYear.appendChild(opt);
    });
}

/* ========================================
   UPDATE VIEW
   ======================================== */
function updateView() {
    const filtered = filterGames(allGames);
    const sorted = sortGames(filtered, currentSort);
    renderGames(sorted);
}

/* ========================================
   SORTING
   ======================================== */
function sortGames(games, sortType) {
    const sorted = [...games];

    switch (sortType) {
        case 'alpha-asc':
            sorted.sort((a, b) => a.game.localeCompare(b.game, 'pt-BR'));
            break;
        case 'alpha-desc':
            sorted.sort((a, b) => b.game.localeCompare(a.game, 'pt-BR'));
            break;
        case 'year-asc':
            sorted.sort((a, b) => (parseInt(a.ano) || 0) - (parseInt(b.ano) || 0));
            break;
        case 'year-desc':
            sorted.sort((a, b) => (parseInt(b.ano) || 0) - (parseInt(a.ano) || 0));
            break;
        case 'platform':
            sorted.sort((a, b) => {
                const aPlat = getPlatformsFromString(a.plataforma)[0] || '';
                const bPlat = getPlatformsFromString(b.plataforma)[0] || '';
                return aPlat.localeCompare(bPlat, 'pt-BR') || a.game.localeCompare(b.game, 'pt-BR');
            });
            break;
    }

    return sorted;
}

/* ========================================
   EVENT LISTENERS
   ======================================== */
function initEventListeners() {
    // Sort buttons
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSort = btn.dataset.sort;
            updateView();
        });
    });

    // Platform filter
    filterPlatform.addEventListener('change', () => {
        currentPlatformFilter = filterPlatform.value;
        updateView();
    });

    // Year filter
    filterYear.addEventListener('change', () => {
        currentYearFilter = filterYear.value;
        updateView();
    });

    // Atualizar capas button
    const btnUpdate = document.getElementById('btnUpdateCovers');
    if (btnUpdate) btnUpdate.addEventListener('click', updateMissingCovers);
}

/* ========================================
   INIT
   ======================================== */
async function init() {
    initEventListeners();

    try {
        allGames = await fetchGames();
        populateFilters(allGames);
        updateView();
    } catch (err) {
        console.error('Erro na inicialização:', err);
    } finally {
        loadingState.classList.add('hidden');
    }
}

// Start
init();
