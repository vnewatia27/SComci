/**
 * Stock Trading Journal and Portfolio Dashboard - Backend API
 * Node.js + Express server with PostgreSQL (pg).
 * CORS enabled for frontend communication. All SQL uses parameterized queries.
 */

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware: parse JSON bodies and enable CORS for frontend
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// PostgreSQL connection pool (defaults for local dev; use env in production)
const pool = new Pool({
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT || 5432,
    database: process.env.PGDATABASE || 'stock_journal',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'Bello09$'
});

// Default user for single-user demo (no auth in this assignment)
const DEFAULT_USER_ID = 1;

// ---------- GET: Retrieve all trades (with optional filters) ----------
app.get('/api/trades', async (req, res) => {
    try {
        const { ticker, trade_type, sector, date_from, date_to, user_id } = req.query;
        const uid = user_id || DEFAULT_USER_ID;

        let query = `
            SELECT t.trade_id, t.user_id, t.stock_id, t.trade_type, t.shares, t.price_per_share,
                   t.trade_date, t.strategy_tag, t.notes,
                   s.ticker_symbol, s.company_name, s.sector, s.exchange
            FROM trades t
            JOIN stocks s ON t.stock_id = s.stock_id
            WHERE t.user_id = $1
        `;
        const params = [uid];
        let paramIndex = 2;

        if (ticker) {
            query += ` AND LOWER(s.ticker_symbol) = LOWER($${paramIndex})`;
            params.push(ticker.trim());
            paramIndex++;
        }
        if (trade_type) {
            query += ` AND t.trade_type = $${paramIndex}`;
            params.push(trade_type.toLowerCase());
            paramIndex++;
        }
        if (sector) {
            query += ` AND LOWER(s.sector) LIKE LOWER($${paramIndex})`;
            params.push(`%${sector.trim()}%`);
            paramIndex++;
        }
        if (date_from) {
            query += ` AND t.trade_date >= $${paramIndex}`;
            params.push(date_from);
            paramIndex++;
        }
        if (date_to) {
            query += ` AND t.trade_date <= $${paramIndex}`;
            params.push(date_to);
            paramIndex++;
        }

        query += ` ORDER BY t.trade_date DESC, t.trade_id DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('GET /api/trades error:', err);
        res.status(500).json({ error: 'Failed to retrieve trades' });
    }
});

// ---------- POST: Create a new trade ----------
app.post('/api/trades', async (req, res) => {
    try {
        const { user_id, stock_id, trade_type, shares, price_per_share, trade_date, strategy_tag, notes } = req.body;
        const uid = user_id || DEFAULT_USER_ID;

        if (!stock_id || !trade_type || shares == null || price_per_share == null || !trade_date) {
            return res.status(400).json({ error: 'Missing required fields: stock_id, trade_type, shares, price_per_share, trade_date' });
        }
        if (!['buy', 'sell'].includes(String(trade_type).toLowerCase())) {
            return res.status(400).json({ error: 'trade_type must be "buy" or "sell"' });
        }

        const result = await pool.query(
            `INSERT INTO trades (user_id, stock_id, trade_type, shares, price_per_share, trade_date, strategy_tag, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING trade_id, user_id, stock_id, trade_type, shares, price_per_share, trade_date, strategy_tag, notes`,
            [uid, stock_id, trade_type.toLowerCase(), Number(shares), Number(price_per_share), trade_date, strategy_tag || null, notes || null]
        );
        const row = result.rows[0];
        // Fetch stock info for response
        const stockResult = await pool.query('SELECT ticker_symbol, company_name, sector, exchange FROM stocks WHERE stock_id = $1', [row.stock_id]);
        res.status(201).json({ ...row, ...stockResult.rows[0] });
    } catch (err) {
        console.error('POST /api/trades error:', err);
        res.status(500).json({ error: 'Failed to create trade' });
    }
});

// ---------- PUT: Update a trade (notes, strategy_tag, etc.) ----------
app.put('/api/trades/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid trade ID' });

        const { trade_type, shares, price_per_share, trade_date, strategy_tag, notes } = req.body;

        // Build dynamic update: only update provided fields
        const updates = [];
        const values = [];
        let idx = 1;
        if (trade_type !== undefined) { updates.push(`trade_type = $${idx++}`); values.push(trade_type); }
        if (shares !== undefined) { updates.push(`shares = $${idx++}`); values.push(shares); }
        if (price_per_share !== undefined) { updates.push(`price_per_share = $${idx++}`); values.push(price_per_share); }
        if (trade_date !== undefined) { updates.push(`trade_date = $${idx++}`); values.push(trade_date); }
        if (strategy_tag !== undefined) { updates.push(`strategy_tag = $${idx++}`); values.push(strategy_tag); }
        if (notes !== undefined) { updates.push(`notes = $${idx++}`); values.push(notes); }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        values.push(id);

        const result = await pool.query(
            `UPDATE trades SET ${updates.join(', ')} WHERE trade_id = $${idx} RETURNING *`,
            values
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Trade not found' });
        }
        const row = result.rows[0];
        const stockResult = await pool.query('SELECT ticker_symbol, company_name, sector, exchange FROM stocks WHERE stock_id = $1', [row.stock_id]);
        res.json({ ...row, ...stockResult.rows[0] });
    } catch (err) {
        console.error('PUT /api/trades/:id error:', err);
        res.status(500).json({ error: 'Failed to update trade' });
    }
});

// ---------- DELETE: Remove a trade ----------
app.delete('/api/trades/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid trade ID' });

        const result = await pool.query('DELETE FROM trades WHERE trade_id = $1 RETURNING trade_id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Trade not found' });
        }
        res.json({ message: 'Trade deleted', trade_id: id });
    } catch (err) {
        console.error('DELETE /api/trades/:id error:', err);
        res.status(500).json({ error: 'Failed to delete trade' });
    }
});

// ---------- GET: Retrieve watchlist (with stock details) ----------
app.get('/api/watchlist', async (req, res) => {
    try {
        const uid = req.query.user_id || DEFAULT_USER_ID;
        const result = await pool.query(
            `SELECT w.watchlist_id, w.user_id, w.stock_id, w.target_price, w.priority_level, w.notes,
                    s.ticker_symbol, s.company_name, s.sector, s.exchange
             FROM watchlist w
             JOIN stocks s ON w.stock_id = s.stock_id
             WHERE w.user_id = $1
             ORDER BY w.priority_level ASC, s.ticker_symbol`,
            [uid]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('GET /api/watchlist error:', err);
        res.status(500).json({ error: 'Failed to retrieve watchlist' });
    }
});

// ---------- POST: Add item to watchlist ----------
app.post('/api/watchlist', async (req, res) => {
    try {
        const { user_id, stock_id, target_price, priority_level, notes } = req.body;
        const uid = user_id || DEFAULT_USER_ID;

        if (!stock_id) {
            return res.status(400).json({ error: 'Missing required field: stock_id' });
        }

        const result = await pool.query(
            `INSERT INTO watchlist (user_id, stock_id, target_price, priority_level, notes)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id, stock_id) DO UPDATE SET target_price = EXCLUDED.target_price, priority_level = EXCLUDED.priority_level, notes = EXCLUDED.notes
             RETURNING watchlist_id, user_id, stock_id, target_price, priority_level, notes`,
            [uid, stock_id, target_price != null ? Number(target_price) : null, priority_level != null ? Math.min(5, Math.max(1, Number(priority_level))) : 1, notes || null]
        );
        const row = result.rows[0];
        const stockResult = await pool.query('SELECT ticker_symbol, company_name, sector, exchange FROM stocks WHERE stock_id = $1', [row.stock_id]);
        res.status(201).json({ ...row, ...stockResult.rows[0] });
    } catch (err) {
        console.error('POST /api/watchlist error:', err);
        res.status(500).json({ error: 'Failed to add to watchlist' });
    }
});

// ---------- DELETE: Remove from watchlist ----------
app.delete('/api/watchlist/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid watchlist ID' });

        const result = await pool.query('DELETE FROM watchlist WHERE watchlist_id = $1 RETURNING watchlist_id', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Watchlist item not found' });
        res.json({ message: 'Removed from watchlist', watchlist_id: id });
    } catch (err) {
        console.error('DELETE /api/watchlist/:id error:', err);
        res.status(500).json({ error: 'Failed to remove from watchlist' });
    }
});

// ---------- GET: Portfolio summary (holdings, cost basis, P/L) ----------
app.get('/api/portfolio', async (req, res) => {
    try {
        const uid = req.query.user_id || DEFAULT_USER_ID;

        // Aggregate positions: sum shares per stock (buys - sells), total cost for cost basis
        const positionsResult = await pool.query(
            `WITH buys AS (
                SELECT stock_id, SUM(shares) AS bought_shares, SUM(shares * price_per_share) AS cost
                FROM trades WHERE user_id = $1 AND trade_type = 'buy' GROUP BY stock_id
             ),
             sells AS (
                SELECT stock_id, SUM(shares) AS sold_shares FROM trades WHERE user_id = $1 AND trade_type = 'sell' GROUP BY stock_id
             )
             SELECT s.stock_id, s.ticker_symbol, s.company_name, s.sector,
                    COALESCE(b.bought_shares, 0) - COALESCE(s2.sold_shares, 0) AS shares,
                    COALESCE(b.cost, 0) AS cost_basis
             FROM stocks s
             LEFT JOIN buys b ON s.stock_id = b.stock_id
             LEFT JOIN sells s2 ON s.stock_id = s2.stock_id
             WHERE COALESCE(b.bought_shares, 0) - COALESCE(s2.sold_shares, 0) > 0`,
            [uid]
        );

        // Use a simple "current price" placeholder (in real app would come from market data)
        // For demo we use last trade price per stock as proxy
        const stockIds = positionsResult.rows.map(r => r.stock_id);
        let pricesMap = {};
        if (stockIds.length > 0) {
            const priceResult = await pool.query(
                `SELECT DISTINCT ON (stock_id) stock_id, price_per_share FROM trades WHERE user_id = $1 ORDER BY stock_id, trade_date DESC`,
                [uid]
            );
            priceResult.rows.forEach(r => { pricesMap[r.stock_id] = Number(r.price_per_share); });
        }

        let totalCost = 0;
        let totalValue = 0;
        const positions = positionsResult.rows.map(p => {
            const shares = Number(p.shares);
            const costBasis = Number(p.cost_basis);
            const currentPrice = pricesMap[p.stock_id] || 0;
            const marketValue = currentPrice * shares;
            totalCost += costBasis;
            totalValue += marketValue;
            return {
                ...p,
                shares,
                cost_basis: costBasis,
                current_price: currentPrice,
                market_value: marketValue,
                profit_loss: marketValue - costBasis,
                profit_loss_pct: costBasis > 0 ? ((marketValue - costBasis) / costBasis * 100).toFixed(2) : 0
            };
        });

        const totalProfitLoss = totalValue - totalCost;
        const totalProfitLossPct = totalCost > 0 ? ((totalValue - totalCost) / totalCost * 100).toFixed(2) : 0;

        res.json({
            positions,
            summary: {
                total_market_value: Math.round(totalValue * 100) / 100,
                total_cost_basis: Math.round(totalCost * 100) / 100,
                total_profit_loss: Math.round(totalProfitLoss * 100) / 100,
                total_profit_loss_pct: totalProfitLossPct
            }
        });
    } catch (err) {
        console.error('GET /api/portfolio error:', err);
        res.status(500).json({ error: 'Failed to compute portfolio' });
    }
});

// ---------- GET: List all stocks (for dropdowns and stock pages) ----------
app.get('/api/stocks', async (req, res) => {
    try {
        const result = await pool.query('SELECT stock_id, ticker_symbol, company_name, sector, exchange FROM stocks ORDER BY ticker_symbol');
        res.json(result.rows);
    } catch (err) {
        console.error('GET /api/stocks error:', err);
        res.status(500).json({ error: 'Failed to retrieve stocks' });
    }
});

// ---------- GET: Single stock with trades and watchlist info ----------
app.get('/api/stocks/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid stock ID' });

        const stockResult = await pool.query('SELECT * FROM stocks WHERE stock_id = $1', [id]);
        if (stockResult.rows.length === 0) return res.status(404).json({ error: 'Stock not found' });

        const uid = req.query.user_id || DEFAULT_USER_ID;
        const tradesResult = await pool.query(
            'SELECT * FROM trades WHERE stock_id = $1 AND user_id = $2 ORDER BY trade_date DESC',
            [id, uid]
        );
        const watchResult = await pool.query(
            'SELECT * FROM watchlist WHERE stock_id = $1 AND user_id = $2',
            [id, uid]
        );

        res.json({
            stock: stockResult.rows[0],
            trades: tradesResult.rows,
            watchlist: watchResult.rows
        });
    } catch (err) {
        console.error('GET /api/stocks/:id error:', err);
        res.status(500).json({ error: 'Failed to retrieve stock' });
    }
});

// ---------- GET: Performance insights (most traded, total trades, realized/unrealized) ----------
app.get('/api/insights', async (req, res) => {
    try {
        const uid = req.query.user_id || DEFAULT_USER_ID;

        const tradeCountResult = await pool.query(
            'SELECT COUNT(*) AS total_trades, COALESCE(SUM(CASE WHEN trade_type = $1 THEN shares END), 0) AS total_shares_bought FROM trades WHERE user_id = $2',
            ['buy', uid]
        );

        const mostTradedResult = await pool.query(
            `SELECT s.ticker_symbol, s.company_name, COUNT(t.trade_id) AS trade_count, SUM(t.shares) AS total_shares
             FROM trades t JOIN stocks s ON t.stock_id = s.stock_id
             WHERE t.user_id = $1 GROUP BY s.stock_id, s.ticker_symbol, s.company_name ORDER BY trade_count DESC LIMIT 5`,
            [uid]
        );

        const portfolioRes = await pool.query(
            `SELECT
                (SELECT COALESCE(SUM(shares * price_per_share), 0) FROM trades WHERE user_id = $1 AND trade_type = 'sell') AS sell_proceeds,
                (SELECT COALESCE(SUM(shares * price_per_share), 0) FROM trades WHERE user_id = $1 AND trade_type = 'buy') AS buy_cost`,
            [uid]
        );
        const row = portfolioRes.rows[0];
        const sellProceeds = parseFloat(row.sell_proceeds) || 0;
        const buyCost = parseFloat(row.buy_cost) || 0;

        res.json({
            total_trades: parseInt(tradeCountResult.rows[0].total_trades, 10),
            total_shares_purchased: parseFloat(tradeCountResult.rows[0].total_shares_bought) || 0,
            most_traded_stocks: mostTradedResult.rows,
            total_sell_proceeds: sellProceeds,
            total_buy_cost: buyCost
        });
    } catch (err) {
        console.error('GET /api/insights error:', err);
        res.status(500).json({ error: 'Failed to retrieve insights' });
    }
});

// ---------- GET: Users (for dropdown if multi-user later) ----------
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT user_id, full_name, email, created_at FROM users ORDER BY user_id');
        res.json(result.rows);
    } catch (err) {
        console.error('GET /api/users error:', err);
        res.status(500).json({ error: 'Failed to retrieve users' });
    }
});

// Health check
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected' });
    } catch (err) {
        res.status(500).json({ status: 'error', database: 'disconnected' });
    }
});

app.listen(PORT, () => {
    console.log(`Stock Trading Journal API running at http://localhost:${PORT}`);
});
