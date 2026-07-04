const express = require('express');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');
const { generateInvoicePdf } = require('../utils/invoicePdf');

const router = express.Router();
router.use(authenticate);

function generateInvoiceNo() {
  const date = new Date();
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${ymd}-${rand}`;
}

// GET /api/billing - list invoices (with optional date range / customer filter)
router.get('/', (req, res) => {
  const { from, to, customer_id } = req.query;
  let query = `SELECT i.*, c.name as customer_name, u.name as cashier_name
               FROM invoices i
               LEFT JOIN customers c ON i.customer_id = c.id
               LEFT JOIN users u ON i.user_id = u.id
               WHERE 1=1`;
  const params = [];
  if (from) {
    query += ' AND date(i.created_at) >= date(?)';
    params.push(from);
  }
  if (to) {
    query += ' AND date(i.created_at) <= date(?)';
    params.push(to);
  }
  if (customer_id) {
    query += ' AND i.customer_id = ?';
    params.push(customer_id);
  }
  query += ' ORDER BY i.created_at DESC';

  res.json(db.prepare(query).all(...params));
});

// GET /api/billing/:id - single invoice with items
router.get('/:id', (req, res) => {
  const invoice = db
    .prepare(
      `SELECT i.*, c.name as customer_name, u.name as cashier_name
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id
       LEFT JOIN users u ON i.user_id = u.id
       WHERE i.id = ?`
    )
    .get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(req.params.id);
  res.json({ ...invoice, items });
});

// POST /api/billing - create a new invoice (all roles: admin, manager, cashier)
router.post('/', (req, res) => {
  const { customer_id, items, tax_percent = 0, discount = 0, payment_method = 'cash' } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one line item is required.' });
  }

  try {
    const result = db.transaction(() => {
      let subtotal = 0;
      const lineItems = [];

      for (const line of items) {
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(line.product_id);
        if (!product) throw new Error(`Product id ${line.product_id} not found.`);
        if (product.stock_qty < line.quantity) {
          throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stock_qty}, Requested: ${line.quantity}`);
        }

        const unitPrice = line.unit_price ?? product.selling_price;
        const lineTotal = unitPrice * line.quantity;
        subtotal += lineTotal;

        lineItems.push({
          product_id: product.id,
          product_name: product.name,
          quantity: line.quantity,
          unit_price: unitPrice,
          line_total: lineTotal,
        });

        // Deduct stock
        const newQty = product.stock_qty - line.quantity;
        db.prepare('UPDATE products SET stock_qty = ? WHERE id = ?').run(newQty, product.id);
        db.prepare(
          'INSERT INTO stock_logs (product_id, change_qty, reason, user_id) VALUES (?,?,?,?)'
        ).run(product.id, -line.quantity, `Sale`, req.user.id);
      }

      const taxAmount = (subtotal * Number(tax_percent)) / 100;
      const total = subtotal + taxAmount - Number(discount);
      const invoiceNo = generateInvoiceNo();

      const invoiceInfo = db
        .prepare(
          `INSERT INTO invoices (invoice_no, customer_id, user_id, subtotal, tax_percent, tax_amount, discount, total, payment_method)
           VALUES (?,?,?,?,?,?,?,?,?)`
        )
        .run(invoiceNo, customer_id || null, req.user.id, subtotal, tax_percent, taxAmount, discount, total, payment_method);

      const invoiceId = invoiceInfo.lastInsertRowid;

      const insertItem = db.prepare(
        `INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price, line_total)
         VALUES (?,?,?,?,?,?)`
      );
      for (const li of lineItems) {
        insertItem.run(invoiceId, li.product_id, li.product_name, li.quantity, li.unit_price, li.line_total);
      }

      return { invoiceId, invoiceNo };
    })();

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(result.invoiceId);
    const items2 = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(result.invoiceId);
    res.status(201).json({ ...invoice, items: items2 });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/billing/:id/pdf - download invoice as PDF
router.get('/:id/pdf', (req, res) => {
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(req.params.id);
  const customer = invoice.customer_id
    ? db.prepare('SELECT * FROM customers WHERE id = ?').get(invoice.customer_id)
    : null;
  const cashier = db.prepare('SELECT * FROM users WHERE id = ?').get(invoice.user_id);

  generateInvoicePdf(invoice, items, customer, cashier, res);
});

// DELETE /api/billing/:id - void an invoice and restock items (Admin only)
router.delete('/:id', authorize('admin'), (req, res) => {
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

  db.transaction(() => {
    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(req.params.id);
    for (const item of items) {
      db.prepare('UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?').run(item.quantity, item.product_id);
      db.prepare(
        'INSERT INTO stock_logs (product_id, change_qty, reason, user_id) VALUES (?,?,?,?)'
      ).run(item.product_id, item.quantity, 'Invoice voided - restock', req.user.id);
    }
    db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run('voided', req.params.id);
  })();

  res.json({ message: 'Invoice voided and stock restored.' });
});

module.exports = router;
