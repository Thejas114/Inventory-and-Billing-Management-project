const express = require('express');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/inventory - stock overview
router.get('/', (req, res) => {
  const products = db
    .prepare(
      `SELECT id, name, sku, category, stock_qty, reorder_level,
              CASE WHEN stock_qty <= reorder_level THEN 1 ELSE 0 END as low_stock
       FROM products ORDER BY low_stock DESC, name`
    )
    .all();
  res.json(products);
});

// GET /api/inventory/low-stock
router.get('/low-stock', (req, res) => {
  const products = db
    .prepare('SELECT * FROM products WHERE stock_qty <= reorder_level ORDER BY stock_qty ASC')
    .all();
  res.json(products);
});

// GET /api/inventory/logs/:productId
router.get('/logs/:productId', (req, res) => {
  const logs = db
    .prepare(
      `SELECT sl.*, u.name as user_name FROM stock_logs sl
       LEFT JOIN users u ON sl.user_id = u.id
       WHERE sl.product_id = ? ORDER BY sl.created_at DESC`
    )
    .all(req.params.productId);
  res.json(logs);
});

// POST /api/inventory/adjust - manual stock adjustment (Admin, Manager)
router.post('/adjust', authorize('admin', 'manager'), (req, res) => {
  const { product_id, change_qty, reason } = req.body;
  if (!product_id || change_qty === undefined || !reason) {
    return res.status(400).json({ error: 'product_id, change_qty, and reason are required.' });
  }

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });

  const newQty = product.stock_qty + Number(change_qty);
  if (newQty < 0) {
    return res.status(400).json({ error: 'Resulting stock cannot be negative.' });
  }

  const tx = db.transaction(() => {
    db.prepare('UPDATE products SET stock_qty = ? WHERE id = ?').run(newQty, product_id);
    db.prepare(
      'INSERT INTO stock_logs (product_id, change_qty, reason, user_id) VALUES (?,?,?,?)'
    ).run(product_id, change_qty, reason, req.user.id);
  });
  tx();

  res.json({ product_id, new_stock_qty: newQty });
});

module.exports = router;
