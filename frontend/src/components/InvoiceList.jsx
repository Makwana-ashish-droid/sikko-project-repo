import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStoredInvoices } from '../utils/invoices';

export default function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [status, setStatus] = useState('Loading saved invoices...');

  useEffect(() => {
    loadInvoices();
  }, []);

  async function loadInvoices() {
    try {
      const response = await fetch('/api/invoices');
      if (!response.ok) throw new Error('Unable to load invoices');
      const data = await response.json();
      setInvoices(data);
      setStatus('');
    } catch (error) {
      console.error(error);
      const local = getStoredInvoices();
      setInvoices(local);
      setStatus(local.length ? 'Showing locally saved invoices (offline).' : 'No saved invoices found.');
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Saved Invoices</h2>
        <p className="mt-2 text-sm text-slate-600">Review your saved invoices.</p>
        <div className="mt-4 text-sm text-slate-700">{status}</div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-3 font-semibold">Invoice Number</th>
                <th className="px-3 py-3 font-semibold">Date</th>
                <th className="px-3 py-3 font-semibold">Customer</th>
                <th className="px-3 py-3 font-semibold">Amount</th>
                <th className="px-3 py-3 font-semibold">Dispatch</th>
                <th className="px-3 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {invoices.map(invoice => (
                <tr key={invoice.id}>
                  <td className="px-3 py-3 align-top">{invoice.invoiceNumber}</td>
                  <td className="px-3 py-3 align-top">{invoice.invoiceDate}</td>
                  <td className="px-3 py-3 align-top">{invoice.consigneeName || 'Unknown'}</td>
                  <td className="px-3 py-3 align-top">₹{invoice.finalAmount?.toFixed(2)}</td>
                  <td className="px-3 py-3 align-top">{invoice.dispatchLocation || '-'}</td>
                  <td className="px-3 py-3 align-top space-x-2">
                    <Link
                      to={`/invoices/${invoice.id}`}
                      className="rounded-xl bg-sky-600 px-3 py-2 text-white hover:bg-sky-700"
                    >
                      View
                    </Link>
                    <Link
                      to={`/invoice/${invoice.id}`}
                      className="rounded-xl bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
