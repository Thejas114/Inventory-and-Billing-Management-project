const express = require('express');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/analytics/summary
router.get('/summary', (req, res) => {
  const totals = db
    .prepare(
      `SELECT COUNT(*) as invoice_count, COALESCE(SUM(total),0) as revenue
       FROM invoices WHERE status != 'voided'`
    )
    .get();

  const today = db
    .prepare(
      `SELECT COUNT(*) as invoice_count, COALESCE(SUM(total),0) as revenue
       FROM invoices WHERE status != 'voided' AND date(created_at) = date('now')`
    )
    .get();

  const productCount = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  const lowStockCount = db
    .prepare('SELECT COUNT(*) as c FROM products WHERE stock_qty <= reorder_level')
    .get().c;
  const customerCount = db.prepare('SELECT COUNT(*) as c FROM customers').get().c;

  res.json({
    total_revenue: totals.revenue,
    total_invoices: totals.invoice_count,
    today_revenue: today.revenue,
    today_invoices: today.invoice_count,
    product_count: productCount,
    low_stock_count: lowStockCount,
    customer_count: customerCount,
  });
});

// GET /api/analytics/sales-by-date?days=14
router.get('/sales-by-date', (req, res) => {
  const days = parseInt(req.query.days) || 14;
  const rows = db
    .prepare(
      `SELECT date(created_at) as date, COALESCE(SUM(total),0) as revenue, COUNT(*) as invoices
       FROM invoices
       WHERE status != 'voided' AND created_at >= date('now', ?)
       GROUP BY date(created_at)
       ORDER BY date(created_at)`
    )
    .all(`-${days} days`);
  res.json(rows);
});

// GET /api/analytics/top-products?limit=5
router.get('/top-products', (req, res) => {
  const limit = parseInt(req.query.limit) || 5;
  const rows = db
    .prepare(
      `SELECT ii.product_id, ii.product_name, SUM(ii.quantity) as units_sold, SUM(ii.line_total) as revenue
       FROM invoice_items ii
       JOIN invoices i ON ii.invoice_id = i.id
       WHERE i.status != 'voided'
       GROUP BY ii.product_id
       ORDER BY units_sold DESC
       LIMIT ?`
    )
    .all(limit);
  res.json(rows);
});

// GET /api/analytics/sales-by-category
router.get('/sales-by-category', (req, res) => {
  const rows = db
    .prepare(
      `SELECT COALESCE(p.category, 'Uncategorized') as category, SUM(ii.line_total) as revenue
       FROM invoice_items ii
       JOIN invoices i ON ii.invoice_id = i.id
       JOIN products p ON ii.product_id = p.id
       WHERE i.status != 'voided'
       GROUP BY p.category
       ORDER BY revenue DESC`
    )
    .all();
  res.json(rows);
});

// GET /api/analytics/payment-methods
router.get('/payment-methods', (req, res) => {
  const rows = db
    .prepare(
      `SELECT payment_method, COUNT(*) as count, SUM(total) as revenue
       FROM invoices WHERE status != 'voided'
       GROUP BY payment_method`
    )
    .all();
  res.json(rows);
});

module.exports = router;
