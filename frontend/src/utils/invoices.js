const STORAGE_KEY = 'sikko:invoices';

export function getStoredInvoices() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function storeInvoices(invoices) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
}

export function upsertStoredInvoice(invoice) {
  const list = getStoredInvoices();
  const idx = list.findIndex(x => String(x?.id) === String(invoice?.id));
  if (idx >= 0) list[idx] = { ...list[idx], ...invoice };
  else list.unshift(invoice);
  storeInvoices(list);
  return invoice;
}

export function getStoredInvoiceById(id) {
  const list = getStoredInvoices();
  return list.find(x => String(x?.id) === String(id)) || null;
}
