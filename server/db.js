import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, 'data');
const productsFile = path.join(dataDir, 'products.json');
const settingsFile = path.join(dataDir, 'settings.json');
const invoicesFile = path.join(dataDir, 'invoices.json');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Helper functions
function readJSON(filePath, defaultValue = []) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
  }
  return defaultValue;
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
  }
}

// Initialize with default products if file doesn't exist
function initializeProducts() {
  if (!fs.existsSync(productsFile)) {
    const defaultProducts = [
      {
        id: 1,
        name: 'Sample Product 1',
        description: 'A sample product for demonstration',
        hsn: '123456',
        packing: '1 KG',
        price: 100,
        gstRate: 18
      },
      {
        id: 2,
        name: 'Sample Product 2',
        description: 'Another sample product',
        hsn: '654321',
        packing: '500 GM',
        price: 50,
        gstRate: 12
      }
    ];
    writeJSON(productsFile, defaultProducts);
  }
}

initializeProducts();

// Product functions
export function getAllProducts() {
  return readJSON(productsFile, []);
}

export function getProductById(id) {
  const products = readJSON(productsFile, []);
  return products.find(p => p.id === id);
}

export function createProduct(product) {
  const products = readJSON(productsFile, []);
  const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
  const newProduct = { ...product, id: newId };
  products.push(newProduct);
  writeJSON(productsFile, products);
  return newProduct;
}

export function updateProduct(id, product) {
  const products = readJSON(productsFile, []);
  const index = products.findIndex(p => p.id === id);
  if (index === -1) return null;
  products[index] = { ...product, id };
  writeJSON(productsFile, products);
  return products[index];
}

export function deleteProduct(id) {
  const products = readJSON(productsFile, []);
  const filtered = products.filter(p => p.id !== id);
  writeJSON(productsFile, filtered);
  return { changes: products.length - filtered.length };
}

// Settings functions
export function getPaymentSettings() {
  const settings = readJSON(settingsFile, {});
  return settings.payment || null;
}

export function savePaymentSettings(settings) {
  const allSettings = readJSON(settingsFile, {});
  allSettings.payment = settings;
  writeJSON(settingsFile, allSettings);
  return settings;
}

// Invoice functions (simplified for now)
export function getInvoices() {
  return readJSON(invoicesFile, []);
}

export function getInvoiceById(id) {
  const invoices = readJSON(invoicesFile, []);
  return invoices.find(i => i.id === id);
}

export function createInvoice(invoice) {
  const invoices = readJSON(invoicesFile, []);
  const newId = invoices.length > 0 ? Math.max(...invoices.map(i => i.id)) + 1 : 1;
  const newInvoice = { ...invoice, id: newId, createdAt: new Date().toISOString() };
  invoices.push(newInvoice);
  writeJSON(invoicesFile, invoices);
  return newInvoice;
}

export function updateInvoice(id, invoice) {
  const invoices = readJSON(invoicesFile, []);
  const index = invoices.findIndex(i => i.id === id);
  if (index === -1) return null;
  invoices[index] = { ...invoice, id };
  writeJSON(invoicesFile, invoices);
  return invoices[index];
}
