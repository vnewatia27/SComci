-- Stock Trading Journal and Portfolio Dashboard
-- Database schema and sample data for PostgreSQL

-- Drop tables in reverse dependency order (if re-running script)
DROP TABLE IF EXISTS portfolio_snapshots;
DROP TABLE IF EXISTS watchlist;
DROP TABLE IF EXISTS trades;
DROP TABLE IF EXISTS stocks;
DROP TABLE IF EXISTS users;

-- Users table: stores user account information
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stocks table: reference data for tickers
CREATE TABLE stocks (
    stock_id SERIAL PRIMARY KEY,
    ticker_symbol VARCHAR(10) NOT NULL UNIQUE,
    company_name VARCHAR(200) NOT NULL,
    sector VARCHAR(100),
    exchange VARCHAR(50)
);

-- Trades table: buy/sell transactions (user_id and stock_id are FKs)
CREATE TABLE trades (
    trade_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    stock_id INTEGER NOT NULL REFERENCES stocks(stock_id) ON DELETE CASCADE,
    trade_type VARCHAR(10) NOT NULL CHECK (trade_type IN ('buy', 'sell')),
    shares DECIMAL(12, 4) NOT NULL CHECK (shares > 0),
    price_per_share DECIMAL(12, 2) NOT NULL CHECK (price_per_share >= 0),
    trade_date DATE NOT NULL,
    strategy_tag VARCHAR(100),
    notes TEXT
);

-- Watchlist table: stocks user is watching (user_id and stock_id are FKs)
CREATE TABLE watchlist (
    watchlist_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    stock_id INTEGER NOT NULL REFERENCES stocks(stock_id) ON DELETE CASCADE,
    target_price DECIMAL(12, 2),
    priority_level INTEGER DEFAULT 1 CHECK (priority_level BETWEEN 1 AND 5),
    notes TEXT,
    UNIQUE(user_id, stock_id)
);

-- Portfolio_Snapshots table: historical portfolio value (user_id is FK)
CREATE TABLE portfolio_snapshots (
    snapshot_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    total_market_value DECIMAL(14, 2) NOT NULL,
    total_cost_basis DECIMAL(14, 2) NOT NULL,
    total_profit_loss DECIMAL(14, 2) NOT NULL
);

-- ========== SAMPLE DATA (minimum 5 rows per table) ==========

INSERT INTO users (full_name, email) VALUES
    ('Alex Chen', 'alex.chen@email.com'),
    ('Jordan Smith', 'jordan.smith@email.com'),
    ('Sam Williams', 'sam.williams@email.com'),
    ('Riley Davis', 'riley.davis@email.com'),
    ('Morgan Lee', 'morgan.lee@email.com');

INSERT INTO stocks (ticker_symbol, company_name, sector, exchange) VALUES
    ('AAPL', 'Apple Inc.', 'Technology', 'NASDAQ'),
    ('MSFT', 'Microsoft Corporation', 'Technology', 'NASDAQ'),
    ('GOOGL', 'Alphabet Inc.', 'Technology', 'NASDAQ'),
    ('AMZN', 'Amazon.com Inc.', 'Consumer Cyclical', 'NASDAQ'),
    ('NVDA', 'NVIDIA Corporation', 'Technology', 'NASDAQ'),
    ('JPM', 'JPMorgan Chase & Co.', 'Financial Services', 'NYSE'),
    ('V', 'Visa Inc.', 'Financial Services', 'NYSE'),
    ('TSLA', 'Tesla Inc.', 'Consumer Cyclical', 'NASDAQ');

INSERT INTO trades (user_id, stock_id, trade_type, shares, price_per_share, trade_date, strategy_tag, notes) VALUES
    (1, 1, 'buy', 10, 175.50, '2025-01-15', 'long-term', 'Initial position'),
    (1, 1, 'buy', 5, 178.20, '2025-02-01', 'long-term', 'Averaged down'),
    (1, 2, 'buy', 8, 380.00, '2025-01-20', 'growth', 'Cloud exposure'),
    (1, 2, 'sell', 3, 395.00, '2025-02-10', 'take-profit', 'Partial profit'),
    (1, 5, 'buy', 4, 720.00, '2025-02-05', 'momentum', 'AI play'),
    (2, 1, 'buy', 20, 172.00, '2025-01-10', 'value', 'Dividend growth'),
    (2, 6, 'buy', 15, 185.00, '2025-01-25', 'dividend', 'Bank sector'),
    (2, 7, 'buy', 10, 265.00, '2025-02-02', 'long-term', 'Payment network'),
    (3, 4, 'buy', 6, 155.00, '2025-01-18', 'growth', 'E-commerce'),
    (3, 8, 'buy', 5, 245.00, '2025-02-08', 'speculative', 'EV bet'),
    (4, 3, 'buy', 12, 142.00, '2025-01-22', 'long-term', 'Search + cloud'),
    (4, 5, 'sell', 2, 750.00, '2025-02-12', 'take-profit', 'Trimmed position'),
    (5, 1, 'buy', 15, 176.00, '2025-02-01', 'index-style', 'Core holding'),
    (5, 2, 'buy', 5, 385.00, '2025-02-03', 'growth', 'Added on dip');

INSERT INTO watchlist (user_id, stock_id, target_price, priority_level, notes) VALUES
    (1, 5, 800.00, 1, 'Watch for earnings'),
    (1, 6, 200.00, 2, 'Interest rate play'),
    (1, 8, 220.00, 3, 'EV recovery'),
    (2, 5, 850.00, 1, 'AI leader'),
    (2, 4, 180.00, 2, 'Retail strength'),
    (3, 5, 780.00, 1, 'High priority'),
    (3, 7, 280.00, 2, 'Payment growth'),
    (4, 1, 190.00, 1, 'iPhone cycle'),
    (4, 2, 420.00, 2, 'Azure growth'),
    (5, 5, 820.00, 1, 'Top pick');

INSERT INTO portfolio_snapshots (user_id, snapshot_date, total_market_value, total_cost_basis, total_profit_loss) VALUES
    (1, '2025-01-31', 8250.00, 7980.00, 270.00),
    (1, '2025-02-15', 11200.00, 10200.00, 1000.00),
    (2, '2025-01-31', 9850.00, 9200.00, 650.00),
    (2, '2025-02-15', 10500.00, 9200.00, 1300.00),
    (3, '2025-02-01', 2400.00, 2310.00, 90.00),
    (3, '2025-02-15', 2650.00, 2310.00, 340.00),
    (4, '2025-02-01', 2604.00, 2504.00, 100.00),
    (4, '2025-02-15', 3200.00, 2504.00, 696.00),
    (5, '2025-02-15', 4150.00, 3965.00, 185.00);
