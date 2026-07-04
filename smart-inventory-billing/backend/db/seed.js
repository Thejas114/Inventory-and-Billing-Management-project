const bcrypt = require('bcryptjs');
const db = require('./database');

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount === 0) {
    console.log('Seeding users...');
    const insertUser = db.prepare(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)'
    );
    const users = [
      ['Alice Admin', 'admin@example.com', 'admin123', 'admin'],
      ['Mike Manager', 'manager@example.com', 'manager123', 'manager'],
      ['Cara Cashier', 'cashier@example.com', 'cashier123', 'cashier'],
    ];
    for (const [name, email, pw, role] of users) {
      insertUser.run(name, email, bcrypt.hashSync(pw, 10), role);
    }
  }

  const supplierCount = db.prepare('SELECT COUNT(*) as c FROM suppliers').get().c;
  if (supplierCount === 0) {
    console.log('Seeding suppliers...');
    const insertSupplier = db.prepare(
      'INSERT INTO suppliers (name, contact_person, email, phone, address) VALUES (?,?,?,?,?)'
    );
    insertSupplier.run('Global Traders Ltd', 'Ravi Kumar', 'ravi@globaltraders.com', '9876543210', 'Bengaluru, KA');
    insertSupplier.run('Prime Distributors', 'Sneha Rao', 'sneha@primedist.com', '9123456780', 'Mumbai, MH');
  }

  const productCount = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  if (productCount === 0) {
    console.log('Seeding products...');
    const insertProduct = db.prepare(
      `INSERT INTO products (name, sku, category, description, cost_price, selling_price, stock_qty, reorder_level, supplier_id)
       VALUES (?,?,?,?,?,?,?,?,?)`
    );
    const products = [
      ['Wireless Mouse', 'ELEC-001', 'Electronics', 'Ergonomic wireless mouse', 300, 599, 50, 10, 1],
      ['Mechanical Keyboard', 'ELEC-002', 'Electronics', 'RGB mechanical keyboard', 1800, 2999, 25, 5, 1],
      ['USB-C Cable 1m', 'ELEC-003', 'Electronics', 'Fast charging cable', 80, 199, 100, 20, 1],
      ['A4 Paper Ream', 'STAT-001', 'Stationery', '500 sheets, 75 GSM', 180, 260, 60, 15, 2],
      ['Blue Ballpoint Pen (Box of 10)', 'STAT-002', 'Stationery', 'Smooth writing pens', 40, 90, 80, 20, 2],
      ['Office Chair', 'FURN-001', 'Furniture', 'Adjustable ergonomic chair', 3500, 5999, 8, 3, 2],
      ['Desk Lamp LED', 'FURN-002', 'Furniture', 'Dimmable LED desk lamp', 450, 799, 15, 5, 1],
    ];
    for (const p of products) insertProduct.run(...p);
  }

  const customerCount = db.prepare('SELECT COUNT(*) as c FROM customers').get().c;
  if (customerCount === 0) {
    console.log('Seeding customers...');
    const insertCustomer = db.prepare(
      'INSERT INTO customers (name, email, phone, address) VALUES (?,?,?,?)'
    );
    insertCustomer.run('Walk-in Customer', '', '', '');
    insertCustomer.run('Tech Solutions Pvt Ltd', 'accounts@techsolutions.com', '9988776655', 'Bengaluru, KA');
    insertCustomer.run('Priya Sharma', 'priya.sharma@email.com', '9871234560', 'Delhi, DL');
  }

  console.log('Seed complete.');
}

seed();
module.exports = seed;
