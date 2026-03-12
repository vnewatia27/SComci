# Stock Trading Journal and Portfolio Dashboard

A full-stack web application for recording stock trades, tracking portfolio holdings, and reviewing investing performance. Users can add buy/sell transactions, view trade history with search and filters, manage a watchlist with target prices, and see portfolio and performance insights.

## Tech Stack

- **Database:** PostgreSQL  
- **Backend:** Node.js, Express  
- **Frontend:** HTML, CSS, JavaScript (vanilla)

## Prerequisites

- **Node.js** (v14 or newer) — [nodejs.org](https://nodejs.org)  
- **PostgreSQL** — [postgresql.org](https://www.postgresql.org)  
- A PostgreSQL user with permission to create databases and tables

## Setup Instructions

### 1. Create the database

In a terminal (or psql), create a database and run the schema and sample data:

```bash
# Create database (Windows: use psql or pgAdmin)
createdb stock_journal

# Run the SQL script (adjust user if needed)
psql -U postgres -d stock_journal -f database.sql
```

On Windows with default PostgreSQL install you can use:

```powershell
psql -U postgres -c "CREATE DATABASE stock_journal;"
psql -U postgres -d stock_journal -f database.sql
```

If your PostgreSQL user or password differ, set environment variables before starting the server (see step 3).

### 2. Install Node dependencies

From the project folder:

```bash
cd c:\Projects\SComci
npm install
```

### 3. Configure database connection (optional)

By default the server uses:

- Host: `localhost`  
- Port: `5432`  
- Database: `stock_journal`  
- User: `postgres`  
- Password: `postgres`

To override, set before starting the server:

- `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`

Example (PowerShell):

```powershell
$env:PGUSER = "your_user"
$env:PGPASSWORD = "your_password"
node server.js
```

### 4. Start the server

```bash
npm start
```

Or:

```bash
node server.js
```

The API runs at **http://localhost:3000**.  
Open **http://localhost:3000** in a browser to use the app (the server serves the frontend from the `public` folder).

## Project Structure

```
SComci/
├── database.sql    # Schema and sample data for PostgreSQL
├── server.js       # Express API and static file server
├── package.json
├── README.md
└── public/
    ├── index.html  # Single-page UI
    ├── styles.css  # Layout and styling
    └── app.js      # Frontend logic and API calls
```

## Database Schema

- **users** — `user_id` (PK), `full_name`, `email`, `created_at`  
- **stocks** — `stock_id` (PK), `ticker_symbol`, `company_name`, `sector`, `exchange`  
- **trades** — `trade_id` (PK), `user_id` (FK → users), `stock_id` (FK → stocks), `trade_type`, `shares`, `price_per_share`, `trade_date`, `strategy_tag`, `notes`  
- **watchlist** — `watchlist_id` (PK), `user_id` (FK → users), `stock_id` (FK → stocks), `target_price`, `priority_level`, `notes`  
- **portfolio_snapshots** — `snapshot_id` (PK), `user_id` (FK → users), `snapshot_date`, `total_market_value`, `total_cost_basis`, `total_profit_loss`  

Relationships: Users have many Trades, Watchlist entries, and Portfolio_Snapshots. Stocks are referenced by Trades and Watchlist.

## API Endpoints

| Method | Endpoint            | Description                    |
|--------|---------------------|--------------------------------|
| GET    | /api/trades         | List trades (optional filters) |
| POST   | /api/trades         | Create a trade                 |
| PUT    | /api/trades/:id     | Update a trade                 |
| DELETE | /api/trades/:id     | Delete a trade                 |
| GET    | /api/watchlist      | List watchlist                 |
| POST   | /api/watchlist      | Add to watchlist               |
| DELETE | /api/watchlist/:id  | Remove from watchlist          |
| GET    | /api/portfolio      | Portfolio summary & holdings   |
| GET    | /api/stocks         | List all stocks                |
| GET    | /api/stocks/:id     | One stock with trades/watchlist|
| GET    | /api/insights       | Performance insights           |
| GET    | /api/users          | List users                     |

## Features

- **Dashboard:** Portfolio summary (market value, cost basis, P/L) and holdings table with links to stock detail.  
- **Trade History:** List of trades with filters (ticker, type, sector, date range); edit notes/strategy; delete trade.  
- **Add Trade:** Form to add a buy/sell with stock, shares, price, date, strategy tag, and notes.  
- **Watchlist:** Add stocks with target price and priority; remove items.  
- **Insights:** Total trades, total shares purchased, total buy cost, total sell proceeds, most traded stocks.  
- **Feedback:** Toasts for success/error and a loading indicator during API calls.

