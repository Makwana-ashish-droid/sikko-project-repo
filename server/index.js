import express from 'express';
import cors from 'cors';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  getPaymentSettings,
  savePaymentSettings
} from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/auth/login', (req, res) => {
  /*const  { employeeId, email, password } = req.body || {};

  const normalizedEmployeeId = String(employeeId || '').trim();
  const normalizedEmail = String(email || '').trim();
  const normalizedPassword = String(password || '');

  if (!normalizedEmployeeId && !normalizedEmail) {
    return res.status(400).json({ error: 'Employee ID or email is required.' });
  }

  const expectedPassword = process.env.LOGIN_PASSWORD || 'admin';
  if (!normalizedPassword) {
    return res.status(400).json({ error: 'Password is required.' });
  }
  if (normalizedPassword !== expectedPassword) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  } */

  // Minimal demo-style response for frontend localStorage session.
  return res.json({
    id: 1,
    employeeId: normalizedEmployeeId || null,
    email: normalizedEmail || null
  });
});

const defaultPaymentSettings = {
  bankName: 'ICICI Bank',
  accountNumber: '123456789012',
  ifsc: 'ICIC0001234',
  upiId: 'sikko@icici',
  accountHolder: 'Sikko Industries Ltd',
  branch: 'Ahmedabad',
  gstNumber: '24AABCS1234D1Z5',
  qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=upi://pay?pa=sikko@icici&pn=Sikko%20Industries%20Ltd'
};

function calculateTotals(rows, freight, roundOff) {
  const outputRows = rows.map(row => {
    const quantity = Number(row.quantity || 0);
    const price = Number(row.price || 0);
    const gstRate = Number(row.gstRate || 0);
    const taxableValue = Number((quantity * price).toFixed(2));
    const gstAmount = Number(((taxableValue * gstRate) / 100).toFixed(2));
    const totalAmount = Number((taxableValue + gstAmount).toFixed(2));
    return { ...row, taxableValue, gstAmount, totalAmount };
  });

  const totalTaxableValue = outputRows.reduce((sum, row) => sum + row.taxableValue, 0);
  const totalGST = outputRows.reduce((sum, row) => sum + row.gstAmount, 0);
  const finalAmount = Number((totalTaxableValue + totalGST + Number(freight || 0) + Number(roundOff || 0)).toFixed(2));

  return { outputRows, totalTaxableValue, totalGST, finalAmount };
}

app.get('/api/products', (req, res) => {
  const products = getAllProducts();
  res.json(products);
});

app.post('/api/products', (req, res) => {
  try {
    const product = createProduct(req.body);
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const exists = getProductById(id);
  if (!exists) return res.status(404).json({ error: 'Product not found' });
  const updated = updateProduct(id, req.body);
  res.json(updated);
});

app.delete('/api/products/:id', (req, res) => {
  const id = Number(req.params.id);
  deleteProduct(id);
  res.status(204).send();
});

app.post('/api/invoice/calculate', (req, res) => {
  const { rows, freight = 0, roundOff = 0 } = req.body;
  if (!Array.isArray(rows)) {
    return res.status(400).json({ error: 'Rows must be an array' });
  }
  const totals = calculateTotals(rows, freight, roundOff);
  res.json({ ...totals });
});

app.post('/api/invoices', (req, res) => {
  try {
    const invoice = createInvoice(req.body);
    res.status(201).json(invoice);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/invoices/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = getInvoiceById(id);
  if (!existing) return res.status(404).json({ error: 'Invoice not found' });
  try {
    const invoice = updateInvoice(id, req.body);
    res.json(invoice);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/invoices', (req, res) => {
  const invoices = getInvoices();
  res.json(invoices);
});
app.get('/api/invoices/:id', (req, res) => {
  const id = Number(req.params.id);
  const invoice = getInvoiceById(id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  res.json(invoice);
});

app.get('/api/settings/payment', (req, res) => {
  const stored = getPaymentSettings();
  res.json(stored || defaultPaymentSettings);
});

app.post('/api/settings/payment', (req, res) => {
  const payload = req.body;
  const saved = savePaymentSettings(payload);
  res.json(saved);
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Sikko invoice API running on http://localhost:${port}`);
});
