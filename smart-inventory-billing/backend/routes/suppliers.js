const express = require('express');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM suppliers ORDER BY name').all());
});

router.get('/:id', (req, res) => {
  const s = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Supplier not found.' });
  res.json(s);
});

router.post('/', authorize('admin', 'manager'), (req, res) => {
  const { name, contact_person, email, phone, address } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required.' });

  const info = db
    .prepare('INSERT INTO suppliers (name, contact_person, email, phone, address) VALUES (?,?,?,?,?)')
    .run(name, contact_person || null, email || null, phone || null, address || null);
  res.status(201).json({ id: info.lastInsertRowid, ...req.body });
});

router.put('/:id', authorize('admin', 'manager'), (req, res) => {
  const existing = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Supplier not found.' });

  const { name, contact_person, email, phone, address } = req.body;
  db.prepare(
    'UPDATE suppliers SET name=?, contact_person=?, email=?, phone=?, address=? WHERE id=?'
  ).run(
    name ?? existing.name,
    contact_person ?? existing.contact_person,
    email ?? existing.email,
    phone ?? existing.phone,
    address ?? existing.address,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id));
});

router.delete('/:id', authorize('admin'), (req, res) => {
  const existing = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Supplier not found.' });
  db.prepare('DELETE FROM suppliers WHERE id = ?').run(req.params.id);
  res.json({ message: 'Supplier deleted.' });
});

module.exports = router;
