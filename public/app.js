/**
 * Stock Trading Journal & Portfolio Dashboard - Frontend
 * Fetches data from API, renders dashboard, trades, watchlist, and handles forms.
 */

const API_BASE = '/api';

// ---------- DOM refs ----------
const sections = document.querySelectorAll('.panel');
const navBtns = document.querySelectorAll('.nav-btn');
const toastEl = document.getElementById('toast');
const loadingEl = document.getElementById('loading');
const portfolioSummary = document.getElementById('portfolio-summary');
const portfolioHoldings = document.getElementById('portfolio-holdings');
const tradesList = document.getElementById('trades-list');
const watchlistItems = document.getElementById('watchlist-items');
const watchlistStockSelect = document.getElementById('watchlist-stock');
const formTrade = document.getElementById('form-trade');
const tradeStockSelect = document.getElementById('trade-stock');
const insightsCards = document.getElementById('insights-cards');
const insightsMostTraded = document.getElementById('insights-most-traded');
const modalEdit = document.getElementById('modal-edit-trade');
const formEditTrade = document.getElementById('form-edit-trade');
const filterTicker = document.getElementById('filter-ticker');
const filterType = document.getElementById('filter-type');
const filterSector = document.getElementById('filter-sector');
const filterDateFrom = document.getElementById('filter-date-from');
const filterDateTo = document.getElementById('filter-date-to');

// ---------- Helpers ----------
function showToast(message, type = 'success') {
    toastEl.textContent = message;
    toastEl.className = `toast ${type} show`;
    setTimeout(() => toastEl.classList.remove('show'), 3500);
}

function setLoading(show) {
    loadingEl.classList.toggle('show', show);
    loadingEl.setAttribute('aria-hidden', !show);
}

function formatCurrency(n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
}

function formatDate(s) {
    if (!s) return '—';
    return new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

async function api(path, options = {}) {
    const res = await fetch(API_BASE + path, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
    });
    const data = res.ok ? await res.json().catch(() => ({})) : await res.json().catch(() => ({ error: res.statusText }));
    if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
    return data;
}

// ---------- Navigation ----------
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const sectionId = btn.dataset.section;
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        sections.forEach(panel => {
            panel.classList.toggle('active', panel.id === `section-${sectionId}`);
        });
        if (sectionId === 'dashboard') loadPortfolio();
        if (sectionId === 'trades') loadTrades();
        if (sectionId === 'watchlist') loadWatchlist();
        if (sectionId === 'insights') loadInsights();
    });
});

// ---------- Load stocks into dropdowns ----------
async function loadStocks() {
    try {
        const stocks = await api('/stocks');
        const options = stocks.map(s => `<option value="${s.stock_id}">${s.ticker_symbol} – ${s.company_name}</option>`).join('');
        tradeStockSelect.innerHTML = '<option value="">Select stock</option>' + options;
        watchlistStockSelect.innerHTML = '<option value="">Select stock</option>' + options;
        return stocks;
    } catch (e) {
        showToast(e.message || 'Failed to load stocks', 'error');
        return [];
    }
}

// ---------- Portfolio ----------
async function loadPortfolio() {
    setLoading(true);
    try {
        const data = await api('/portfolio');
        const s = data.summary;

        portfolioSummary.innerHTML = `
            <div class="summary-card">
                <h3>Market Value</h3>
                <div class="value">${formatCurrency(s.total_market_value)}</div>
            </div>
            <div class="summary-card">
                <h3>Cost Basis</h3>
                <div class="value">${formatCurrency(s.total_cost_basis)}</div>
            </div>
            <div class="summary-card">
                <h3>Total P/L</h3>
                <div class="value ${s.total_profit_loss >= 0 ? 'positive' : 'negative'}">${formatCurrency(s.total_profit_loss)} (${s.total_profit_loss_pct}%)</div>
            </div>
        `;

        if (!data.positions.length) {
            portfolioHoldings.innerHTML = '<div class="empty-state">No holdings yet. Add trades to see your portfolio.</div>';
        } else {
            portfolioHoldings.innerHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>Ticker</th>
                            <th>Company</th>
                            <th>Sector</th>
                            <th>Shares</th>
                            <th>Cost basis</th>
                            <th>Market value</th>
                            <th>P/L</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.positions.map(p => `
                            <tr>
                                <td><a href="#" class="stock-link" data-stock-id="${p.stock_id}">${p.ticker_symbol}</a></td>
                                <td>${p.company_name}</td>
                                <td>${p.sector || '—'}</td>
                                <td class="num">${Number(p.shares).toFixed(4)}</td>
                                <td class="num">${formatCurrency(p.cost_basis)}</td>
                                <td class="num">${formatCurrency(p.market_value)}</td>
                                <td class="num pl-${p.profit_loss >= 0 ? 'positive' : 'negative'}">${formatCurrency(p.profit_loss)} (${p.profit_loss_pct}%)</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            portfolioHoldings.querySelectorAll('.stock-link').forEach(a => {
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    showStockDetail(parseInt(a.dataset.stockId, 10));
                });
            });
        }
    } catch (e) {
        showToast(e.message || 'Failed to load portfolio', 'error');
        portfolioSummary.innerHTML = '';
        portfolioHoldings.innerHTML = '<div class="empty-state">Could not load portfolio.</div>';
    } finally {
        setLoading(false);
    }
}

function showStockDetail(stockId) {
    setLoading(true);
    api(`/stocks/${stockId}`)
        .then(data => {
            setLoading(false);
            const { stock, trades, watchlist } = data;
            const w = watchlist[0];
            const msg = [
                `${stock.ticker_symbol} – ${stock.company_name}`,
                `Sector: ${stock.sector || '—'}`,
                `Trades: ${trades.length}`,
                w ? `Watchlist: target $${w.target_price}, priority ${w.priority_level}` : 'Not on watchlist'
            ].join('\n');
            alert(msg);
        })
        .catch(e => {
            setLoading(false);
            showToast(e.message || 'Failed to load stock', 'error');
        });
}

// ---------- Trades ----------
async function loadTrades(params = {}) {
    setLoading(true);
    try {
        const qs = new URLSearchParams(params).toString();
        const trades = await api('/trades' + (qs ? '?' + qs : ''));
        if (!trades.length) {
            tradesList.innerHTML = '<div class="empty-state">No trades match your filters.</div>';
        } else {
            tradesList.innerHTML = trades.map(t => `
                <div class="trade-card" data-trade-id="${t.trade_id}">
                    <div>
                        <div class="ticker">${t.ticker_symbol}</div>
                        <div class="company">${t.company_name} · ${t.sector || '—'}</div>
                        <div class="meta">${formatDate(t.trade_date)} · ${t.shares} shares @ ${formatCurrency(t.price_per_share)} ${t.trade_type === 'buy' ? 'buy' : 'sell'}</div>
                        ${t.strategy_tag ? `<div class="meta">Strategy: ${t.strategy_tag}</div>` : ''}
                        ${t.notes ? `<div class="meta">${t.notes}</div>` : ''}
                    </div>
                    <div class="trade-type ${t.trade_type}">${t.trade_type.toUpperCase()}</div>
                    <div class="num">${formatCurrency(Number(t.shares) * Number(t.price_per_share))}</div>
                    <div class="actions">
                        <button type="button" class="btn btn-secondary btn-sm btn-edit-trade" data-trade-id="${t.trade_id}" data-notes="${(t.notes || '').replace(/"/g, '&quot;')}" data-strategy="${(t.strategy_tag || '').replace(/"/g, '&quot;')}">Edit</button>
                        <button type="button" class="btn btn-danger btn-sm btn-delete-trade" data-trade-id="${t.trade_id}">Delete</button>
                    </div>
                </div>
            `).join('');

            tradesList.querySelectorAll('.btn-edit-trade').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.getElementById('edit-trade-id').value = btn.dataset.tradeId;
                    document.getElementById('edit-notes').value = btn.dataset.notes || '';
                    document.getElementById('edit-strategy').value = btn.dataset.strategy || '';
                    modalEdit.showModal();
                });
            });
            tradesList.querySelectorAll('.btn-delete-trade').forEach(btn => {
                btn.addEventListener('click', () => deleteTrade(parseInt(btn.dataset.tradeId, 10)));
            });
        }
    } catch (e) {
        showToast(e.message || 'Failed to load trades', 'error');
        tradesList.innerHTML = '<div class="empty-state">Could not load trades.</div>';
    } finally {
        setLoading(false);
    }
}

document.getElementById('btn-apply-filters').addEventListener('click', () => {
    const params = {};
    if (filterTicker.value.trim()) params.ticker = filterTicker.value.trim();
    if (filterType.value) params.trade_type = filterType.value;
    if (filterSector.value.trim()) params.sector = filterSector.value.trim();
    if (filterDateFrom.value) params.date_from = filterDateFrom.value;
    if (filterDateTo.value) params.date_to = filterDateTo.value;
    loadTrades(params);
});

document.getElementById('btn-clear-filters').addEventListener('click', () => {
    filterTicker.value = '';
    filterType.value = '';
    filterSector.value = '';
    filterDateFrom.value = '';
    filterDateTo.value = '';
    loadTrades();
});

async function deleteTrade(id) {
    if (!confirm('Delete this trade?')) return;
    setLoading(true);
    try {
        await api(`/trades/${id}`, { method: 'DELETE' });
        showToast('Trade deleted');
        loadTrades();
        loadPortfolio();
    } catch (e) {
        showToast(e.message || 'Delete failed', 'error');
    } finally {
        setLoading(false);
    }
}

formEditTrade.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-trade-id').value;
    const strategy_tag = document.getElementById('edit-strategy').value.trim() || null;
    const notes = document.getElementById('edit-notes').value.trim() || null;
    setLoading(true);
    try {
        await api(`/trades/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ strategy_tag, notes })
        });
        showToast('Trade updated');
        modalEdit.close();
        loadTrades();
    } catch (err) {
        showToast(err.message || 'Update failed', 'error');
    } finally {
        setLoading(false);
    }
});

document.getElementById('btn-cancel-edit').addEventListener('click', () => modalEdit.close());

// ---------- Add Trade form ----------
formTrade.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        stock_id: parseInt(tradeStockSelect.value, 10),
        trade_type: document.getElementById('trade-type').value,
        shares: parseFloat(document.getElementById('trade-shares').value),
        price_per_share: parseFloat(document.getElementById('trade-price').value),
        trade_date: document.getElementById('trade-date').value,
        strategy_tag: document.getElementById('trade-strategy').value.trim() || null,
        notes: document.getElementById('trade-notes').value.trim() || null
    };
    setLoading(true);
    try {
        await api('/trades', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Trade saved');
        formTrade.reset();
        document.getElementById('trade-date').value = new Date().toISOString().slice(0, 10);
        loadPortfolio();
        loadTrades();
    } catch (err) {
        showToast(err.message || 'Failed to save trade', 'error');
    } finally {
        setLoading(false);
    }
});

// Set default date
document.getElementById('trade-date').value = new Date().toISOString().slice(0, 10);

// ---------- Watchlist ----------
async function loadWatchlist() {
    setLoading(true);
    try {
        const items = await api('/watchlist');
        if (!items.length) {
            watchlistItems.innerHTML = '<div class="empty-state">Your watchlist is empty. Add stocks above.</div>';
        } else {
            watchlistItems.innerHTML = items.map(w => `
                <div class="watchlist-item">
                    <div>
                        <span class="ticker">${w.ticker_symbol}</span> – ${w.company_name}
                        ${w.target_price ? `<span class="target">Target: ${formatCurrency(w.target_price)}</span>` : ''}
                        <span class="priority">Priority: ${w.priority_level}</span>
                        ${w.notes ? `<div class="meta">${w.notes}</div>` : ''}
                    </div>
                    <button type="button" class="btn btn-danger btn-sm btn-remove-watchlist" data-id="${w.watchlist_id}">Remove</button>
                </div>
            `).join('');

            watchlistItems.querySelectorAll('.btn-remove-watchlist').forEach(btn => {
                btn.addEventListener('click', () => removeWatchlist(parseInt(btn.dataset.id, 10)));
            });
        }
    } catch (e) {
        showToast(e.message || 'Failed to load watchlist', 'error');
        watchlistItems.innerHTML = '<div class="empty-state">Could not load watchlist.</div>';
    } finally {
        setLoading(false);
    }
}

document.getElementById('btn-add-watchlist').addEventListener('click', async () => {
    const stock_id = watchlistStockSelect.value;
    if (!stock_id) {
        showToast('Select a stock', 'error');
        return;
    }
    const target_price = document.getElementById('watchlist-target').value ? parseFloat(document.getElementById('watchlist-target').value) : null;
    const priority_level = parseInt(document.getElementById('watchlist-priority').value, 10);
    setLoading(true);
    try {
        await api('/watchlist', {
            method: 'POST',
            body: JSON.stringify({ stock_id: parseInt(stock_id, 10), target_price, priority_level })
        });
        showToast('Added to watchlist');
        document.getElementById('watchlist-target').value = '';
        loadWatchlist();
    } catch (e) {
        showToast(e.message || 'Failed to add', 'error');
    } finally {
        setLoading(false);
    }
});

async function removeWatchlist(id) {
    setLoading(true);
    try {
        await api(`/watchlist/${id}`, { method: 'DELETE' });
        showToast('Removed from watchlist');
        loadWatchlist();
    } catch (e) {
        showToast(e.message || 'Remove failed', 'error');
    } finally {
        setLoading(false);
    }
}

// ---------- Insights ----------
async function loadInsights() {
    setLoading(true);
    try {
        const data = await api('/insights');
        insightsCards.innerHTML = `
            <div class="insight-card">
                <h4>Total Trades</h4>
                <div class="value">${data.total_trades}</div>
            </div>
            <div class="insight-card">
                <h4>Total Shares Purchased</h4>
                <div class="value">${Number(data.total_shares_purchased).toFixed(2)}</div>
            </div>
            <div class="insight-card">
                <h4>Total Buy Cost</h4>
                <div class="value">${formatCurrency(data.total_buy_cost)}</div>
            </div>
            <div class="insight-card">
                <h4>Total Sell Proceeds</h4>
                <div class="value">${formatCurrency(data.total_sell_proceeds)}</div>
            </div>
        `;

        if (!data.most_traded_stocks.length) {
            insightsMostTraded.innerHTML = '<div class="empty-state">No trade history yet.</div>';
        } else {
            insightsMostTraded.innerHTML = `
                <h3 style="margin-bottom: 0.75rem;">Most Traded Stocks</h3>
                <table>
                    <thead><tr><th>Ticker</th><th>Company</th><th>Trades</th><th>Total shares</th></tr></thead>
                    <tbody>
                        ${data.most_traded_stocks.map(s => `
                            <tr>
                                <td>${s.ticker_symbol}</td>
                                <td>${s.company_name}</td>
                                <td>${s.trade_count}</td>
                                <td>${Number(s.total_shares).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
    } catch (e) {
        showToast(e.message || 'Failed to load insights', 'error');
        insightsCards.innerHTML = '';
        insightsMostTraded.innerHTML = '<div class="empty-state">Could not load insights.</div>';
    } finally {
        setLoading(false);
    }
}

// ---------- Init ----------
(async function init() {
    await loadStocks();
    loadPortfolio();
})();
