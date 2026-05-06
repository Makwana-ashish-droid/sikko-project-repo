import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const databasePath = path.resolve(__dirname, 'sikko.db');
const db = new Database(databasePath);

db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  hsn TEXT,
  packing TEXT,
  price REAL,
  gstRate REAL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS consignees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  billingAddress TEXT,
  shippingAddress TEXT,
  gstNumber TEXT,
  contactPerson TEXT,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoiceNumber TEXT UNIQUE NOT NULL,
  invoiceDate TEXT,
  consigneeId INTEGER,
  dispatchLocation TEXT,
  freight REAL,
  roundOff REAL,
  totalTaxable REAL,
  totalGST REAL,
  finalAmount REAL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (consigneeId) REFERENCES consignees(id)
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoiceId INTEGER NOT NULL,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  productName TEXT,
  description TEXT,
  hsn TEXT,
  packing TEXT,
  quantity REAL,
  price REAL,
  gstRate REAL,
  taxableValue REAL,
  gstAmount REAL,
  totalAmount REAL,
  FOREIGN KEY (invoiceId) REFERENCES invoices(id)
);
`);

// One-time migration from legacy `invoices.rows` JSON storage to normalized tables.
// Safe to re-run; it detects legacy table and migrates only if needed.
function migrateLegacyInvoicesIfNeeded() {
  const hasLegacy = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='invoices_legacy'`)
    .get();

  // If we've already migrated (legacy exists), do nothing.
  if (hasLegacy) return;

  // Detect if this DB has the old `invoices` schema with `rows` column.
  const invoicesTable = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='invoices'`).get();
  if (!invoicesTable) return;

  const columns = db.prepare(`PRAGMA table_info(invoices)`).all();
  const hasRowsColumn = columns.some(c => c?.name === 'rows');
  if (!hasRowsColumn) return;

  db.transaction(() => {
    // Rename old table and recreate new normalized schema.
    db.exec(`ALTER TABLE invoices RENAME TO invoices_legacy;`);

    db.exec(`
      CREATE TABLE IF NOT EXISTS consignees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        billingAddress TEXT,
        shippingAddress TEXT,
        gstNumber TEXT,
        contactPerson TEXT,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoiceNumber TEXT UNIQUE NOT NULL,
        invoiceDate TEXT,
        consigneeId INTEGER,
        dispatchLocation TEXT,
        freight REAL,
        roundOff REAL,
        totalTaxable REAL,
        totalGST REAL,
        finalAmount REAL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (consigneeId) REFERENCES consignees(id)
      );

      CREATE TABLE IF NOT EXISTS invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoiceId INTEGER NOT NULL,
        sortOrder INTEGER NOT NULL DEFAULT 0,
        productName TEXT,
        description TEXT,
        hsn TEXT,
        packing TEXT,
        quantity REAL,
        price REAL,
        gstRate REAL,
        taxableValue REAL,
        gstAmount REAL,
        totalAmount REAL,
        FOREIGN KEY (invoiceId) REFERENCES invoices(id)
      );
    `);

    const legacyInvoices = db.prepare(`SELECT * FROM invoices_legacy ORDER BY id`).all();

    const insertConsignee = db.prepare(`
      INSERT INTO consignees (name, billingAddress, shippingAddress, gstNumber, contactPerson, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertInvoice = db.prepare(`
      INSERT INTO invoices (
        id, invoiceNumber, invoiceDate, consigneeId, dispatchLocation,
        freight, roundOff, totalTaxable, totalGST, finalAmount, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertItem = db.prepare(`
      INSERT INTO invoice_items (
        invoiceId, sortOrder, productName, description, hsn, packing,
        quantity, price, gstRate, taxableValue, gstAmount, totalAmount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const inv of legacyInvoices) {
      const createdAt = inv.createdAt || new Date().toISOString();
      const consigneeId = insertConsignee.run(
        inv.consigneeName || '',
        inv.billingAddress || '',
        inv.shippingAddress || '',
        inv.gstNumber || '',
        inv.contactPerson || '',
        createdAt
      ).lastInsertRowid;

      insertInvoice.run(
        inv.id,
        inv.invoiceNumber,
        inv.invoiceDate || null,
        Number(consigneeId),
        inv.dispatchLocation || '',
        inv.freight ?? 0,
        inv.roundOff ?? 0,
        inv.totalTaxable ?? 0,
        inv.totalGST ?? 0,
        inv.finalAmount ?? 0,
        createdAt
      );

      let items = [];
      try {
        items = JSON.parse(inv.rows || '[]') || [];
      } catch {
        items = [];
      }

      items.forEach((row, idx) => {
        insertItem.run(
          inv.id,
          idx,
          row?.productName ?? '',
          row?.description ?? '',
          row?.hsn ?? '',
          row?.packing ?? '',
          Number(row?.quantity ?? 0),
          Number(row?.price ?? 0),
          Number(row?.gstRate ?? 0),
          Number(row?.taxableValue ?? 0),
          Number(row?.gstAmount ?? 0),
          Number(row?.totalAmount ?? 0)
        );
      });
    }
  })();
}

// Run migration at startup (safe no-op if already migrated).
migrateLegacyInvoicesIfNeeded();

const defaultProducts = [
  {
    name: 'Super Potassium Humate Flake',
    description: 'Premium quality humate for agriculture and soil conditioning.',
    hsn: '38089910',
    packing: '1 Kg Jar',
    price: 1150,
    gstRate: 18
  },
  {
    name: 'Nano Zinc Sulphate',
    description: 'Micronutrient supplement for crop yield enhancement.',
    hsn: '38249010',
    packing: '500 Gm Pouch',
    price: 425,
    gstRate: 18
  },
  {
    name: 'Water Soluble NPK 19-19-19',
    description: 'Balanced NPK for foliar spray and fertigation.',
    hsn: '31052090',
    packing: '5 Kg Bag',
    price: 725,
    gstRate: 5
  },
  {
    name: 'Organic Bio-Stimulant',
    description: 'Growth enhancer with natural fulvic acids.',
    hsn: '38089910',
    packing: '250 Ml Bottle',
    price: 350,
    gstRate: 5
  }
];

const productCount = db.prepare('SELECT COUNT(*) AS count FROM products').get().count;
if (productCount === 0) {
  const insert = db.prepare(
    'INSERT INTO products (name, description, hsn, packing, price, gstRate) VALUES (@name, @description, @hsn, @packing, @price, @gstRate)'
  );
  const insertMany = db.transaction(items => {
    for (const item of items) insert.run(item);
  });
  insertMany(defaultProducts);
}

export function getAllProducts() {
  return db.prepare('SELECT * FROM products ORDER BY name').all();
}

export function getProductById(id) {
  return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
}

export function createProduct(product) {
  const result = db.prepare(
    'INSERT INTO products (name, description, hsn, packing, price, gstRate) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(product.name, product.description, product.hsn, product.packing, product.price, product.gstRate);
  return getProductById(result.lastInsertRowid);
}

export function updateProduct(id, product) {
  db.prepare(
    'UPDATE products SET name = ?, description = ?, hsn = ?, packing = ?, price = ?, gstRate = ? WHERE id = ?'
  ).run(product.name, product.description, product.hsn, product.packing, product.price, product.gstRate, id);
  return getProductById(id);
}

export function deleteProduct(id) {
  return db.prepare('DELETE FROM products WHERE id = ?').run(id);
}

export function createInvoice(invoice) {
  const createdAt = new Date().toISOString();

  const insertConsignee = db.prepare(
    `INSERT INTO consignees (name, billingAddress, shippingAddress, gstNumber, contactPerson, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const consigneeId = insertConsignee.run(
    invoice.consignee.name || '',
    invoice.consignee.billingAddress || '',
    invoice.consignee.shippingAddress || '',
    invoice.consignee.gstNumber || '',
    invoice.consignee.contactPerson || '',
    createdAt
  ).lastInsertRowid;

  const insertInvoice = db.prepare(
    `INSERT INTO invoices (
      invoiceNumber,
      invoiceDate,
      consigneeId,
      dispatchLocation,
      freight,
      roundOff,
      totalTaxable,
      totalGST,
      finalAmount,
      createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const result = insertInvoice.run(
    invoice.invoiceNumber,
    invoice.invoiceDate,
    Number(consigneeId),
    invoice.consignee.dispatchLocation || '',
    invoice.freight,
    invoice.roundOff,
    invoice.totalTaxableValue,
    invoice.totalGST,
    invoice.finalAmount,
    createdAt
  );

  const insertItem = db.prepare(
    `INSERT INTO invoice_items (
      invoiceId, sortOrder, productName, description, hsn, packing,
      quantity, price, gstRate, taxableValue, gstAmount, totalAmount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  (invoice.rows || []).forEach((row, idx) => {
    insertItem.run(
      result.lastInsertRowid,
      idx,
      row?.productName ?? '',
      row?.description ?? '',
      row?.hsn ?? '',
      row?.packing ?? '',
      Number(row?.quantity ?? 0),
      Number(row?.price ?? 0),
      Number(row?.gstRate ?? 0),
      Number(row?.taxableValue ?? 0),
      Number(row?.gstAmount ?? 0),
      Number(row?.totalAmount ?? 0)
    );
  });

  return getInvoiceById(result.lastInsertRowid);
}

export function getInvoices() {
  return db
    .prepare(
      `SELECT
        i.id,
        i.invoiceNumber,
        i.invoiceDate,
        c.name AS consigneeName,
        i.dispatchLocation,
        i.totalTaxable,
        i.totalGST,
        i.finalAmount,
        i.createdAt
      FROM invoices i
      LEFT JOIN consignees c ON c.id = i.consigneeId
      ORDER BY i.createdAt DESC`
    )
    .all();
}

export function getInvoiceById(id) {
  const invoice = db
    .prepare(
      `SELECT
        i.*,
        c.name AS consigneeName,
        c.billingAddress,
        c.shippingAddress,
        c.gstNumber,
        c.contactPerson
      FROM invoices i
      LEFT JOIN consignees c ON c.id = i.consigneeId
      WHERE i.id = ?`
    )
    .get(id);
  if (!invoice) return null;

  const rows = db
    .prepare(
      `SELECT
        productName,
        description,
        hsn,
        packing,
        quantity,
        price,
        gstRate,
        taxableValue,
        gstAmount,
        totalAmount
      FROM invoice_items
      WHERE invoiceId = ?
      ORDER BY sortOrder ASC, id ASC`
    )
    .all(id);

  return { ...invoice, rows };
}

export function updateInvoice(id, invoice) {
  const createdAt = new Date().toISOString();

  const insertConsignee = db.prepare(
    `INSERT INTO consignees (name, billingAddress, shippingAddress, gstNumber, contactPerson, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const consigneeId = insertConsignee.run(
    invoice.consignee.name || '',
    invoice.consignee.billingAddress || '',
    invoice.consignee.shippingAddress || '',
    invoice.consignee.gstNumber || '',
    invoice.consignee.contactPerson || '',
    createdAt
  ).lastInsertRowid;

  db.prepare(
    `UPDATE invoices SET
      invoiceNumber = ?,
      invoiceDate = ?,
      consigneeId = ?,
      dispatchLocation = ?,
      freight = ?,
      roundOff = ?,
      totalTaxable = ?,
      totalGST = ?,
      finalAmount = ?
    WHERE id = ?`
  ).run(
    invoice.invoiceNumber,
    invoice.invoiceDate,
    Number(consigneeId),
    invoice.consignee.dispatchLocation || '',
    invoice.freight,
    invoice.roundOff,
    invoice.totalTaxableValue,
    invoice.totalGST,
    invoice.finalAmount,
    id
  );

  db.prepare(`DELETE FROM invoice_items WHERE invoiceId = ?`).run(id);
  const insertItem = db.prepare(
    `INSERT INTO invoice_items (
      invoiceId, sortOrder, productName, description, hsn, packing,
      quantity, price, gstRate, taxableValue, gstAmount, totalAmount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  (invoice.rows || []).forEach((row, idx) => {
    insertItem.run(
      id,
      idx,
      row?.productName ?? '',
      row?.description ?? '',
      row?.hsn ?? '',
      row?.packing ?? '',
      Number(row?.quantity ?? 0),
      Number(row?.price ?? 0),
      Number(row?.gstRate ?? 0),
      Number(row?.taxableValue ?? 0),
      Number(row?.gstAmount ?? 0),
      Number(row?.totalAmount ?? 0)
    );
  });

  return getInvoiceById(id);
}

export function savePaymentSettings(settings) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('payment', JSON.stringify(settings));
  return settings;
}

export function getPaymentSettings() {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('payment');
  if (!row?.value) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return null;
  }
}
