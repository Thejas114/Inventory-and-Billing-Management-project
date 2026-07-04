const express = require('express');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const { search } = req.query;
  let query = 'SELECT * FROM customers WHERE 1=1';
  const params = [];
  if (search) {
    query += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  query += ' ORDER BY name';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req, res) => {
  const c = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Customer not found.' });
  res.json(c);
});

// All roles (including cashier) can add a customer at point of sale
router.post('/', (req, res) => {
  const { name, email, phone, address } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required.' });

  const info = db
    .prepare('INSERT INTO customers (name, email, phone, address) VALUES (?,?,?,?)')
    .run(name, email || null, phone || null, address || null);
  res.status(201).json({ id: info.lastInsertRowid, ...req.body });
});

router.put('/:id', authorize('admin', 'manager'), (req, res) => {
  const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Customer not found.' });

  const { name, email, phone, address } = req.body;
  db.prepare('UPDATE customers SET name=?, email=?, phone=?, address=? WHERE id=?').run(
    name ?? existing.name,
    email ?? existing.email,
    phone ?? existing.phone,
    address ?? existing.address,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id));
});

router.delete('/:id', authorize('admin'), (req, res) => {
  const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Customer not found.' });
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  res.json({ message: 'Customer deleted.' });
});

module.exports = router;
