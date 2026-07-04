const express = require('express');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/products  (all roles can view)
router.get('/', (req, res) => {
  const { search, category, lowStock } = req.query;
  let query = `SELECT p.*, s.name as supplier_name FROM products p
               LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE 1=1`;
  const params = [];

  if (search) {
    query += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    query += ' AND p.category = ?';
    params.push(category);
  }
  if (lowStock === 'true') {
    query += ' AND p.stock_qty <= p.reorder_level';
  }
  query += ' ORDER BY p.name';

  const products = db.prepare(query).all(...params);
  res.json(products);
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const product = db
    .prepare(
      `SELECT p.*, s.name as supplier_name FROM products p
       LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = ?`
    )
    .get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  res.json(product);
});

// POST /api/products  (Admin, Manager)
router.post('/', authorize('admin', 'manager'), (req, res) => {
  const { name, sku, category, description, cost_price, selling_price, stock_qty, reorder_level, supplier_id } = req.body;
  if (!name || !sku || selling_price === undefined) {
    return res.status(400).json({ error: 'name, sku, and selling_price are required.' });
  }

  try {
    const info = db
      .prepare(
        `INSERT INTO products (name, sku, category, description, cost_price, selling_price, stock_qty, reorder_level, supplier_id)
         VALUES (?,?,?,?,?,?,?,?,?)`
      )
      .run(
        name, sku, category || null, description || null,
        cost_price || 0, selling_price, stock_qty || 0, reorder_level || 5, supplier_id || null
      );

    if (stock_qty && stock_qty > 0) {
      db.prepare('INSERT INTO stock_logs (product_id, change_qty, reason, user_id) VALUES (?,?,?,?)')
        .run(info.lastInsertRowid, stock_qty, 'Initial stock', req.user.id);
    }

    res.status(201).json({ id: info.lastInsertRowid, ...req.body });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'A product with this SKU already exists.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id  (Admin, Manager)
router.put('/:id', authorize('admin', 'manager'), (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found.' });

  const { name, sku, category, description, cost_price, selling_price, reorder_level, supplier_id } = req.body;

  db.prepare(
    `UPDATE products SET name=?, sku=?, category=?, description=?, cost_price=?, selling_price=?, reorder_level=?, supplier_id=?
     WHERE id=?`
  ).run(
    name ?? existing.name,
    sku ?? existing.sku,
    category ?? existing.category,
    description ?? existing.description,
    cost_price ?? existing.cost_price,
    selling_price ?? existing.selling_price,
    reorder_level ?? existing.reorder_level,
    supplier_id ?? existing.supplier_id,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id));
});

// DELETE /api/products/:id  (Admin only)
router.delete('/:id', authorize('admin'), (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found.' });

  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ message: 'Product deleted.' });
});

module.exports = router;
