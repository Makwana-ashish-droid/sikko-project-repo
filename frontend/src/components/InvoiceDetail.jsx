import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { numberToWords } from '../utils/numberToWords';
import { getStoredInvoiceById } from '../utils/invoices';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
}

export default function InvoiceDetail() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [status, setStatus] = useState('Loading invoice details...');
  const invoiceRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadInvoice() {
      try {
        const response = await fetch(`/api/invoices/${id}`);
        if (!response.ok) throw new Error('Invoice not found');
        setInvoice(await response.json());
        setStatus('');
      } catch (error) {
        console.error(error);
        const local = getStoredInvoiceById(id);
        if (local) {
          setInvoice(local);
          setStatus('');
          return;
        }
        setStatus('Unable to load invoice.');
      }
    }
    loadInvoice();
  }, [id]);

  const handlePrint = useReactToPrint({ content: () => invoiceRef.current });

  if (!invoice) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Invoice Details</h2>
        <p className="mt-4 text-slate-600">{status}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Invoice #{invoice.invoiceNumber}</h2>
            <p className="mt-2 text-sm text-slate-600">Customer: {invoice.consigneeName}</p>
            <p className="text-sm text-slate-600">Date: {invoice.invoiceDate}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={handlePrint} className="rounded-xl bg-sky-600 px-5 py-3 text-white hover:bg-sky-700">
              Print
            </button>
            <button
              onClick={() => navigate(`/invoice/${invoice.id}`)}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-white hover:bg-emerald-700"
            >
              Edit Invoice
            </button>
          </div>
        </div>
      </section>

      <section ref={invoiceRef} className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="flex items-start gap-4">
            <img
              src="/logo.png"
              alt="Sikko Industries logo"
              className="h-14 w-14 rounded-2xl object-contain print:h-12 print:w-12"
            />
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Sikko Industries Ltd</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Invoice</h2>
              <p className="mt-2 text-sm text-slate-700">Invoice No: {invoice.invoiceNumber}</p>
            </div>
          </div>
          <div className="text-right text-sm text-slate-600">
            <p>Date: {invoice.invoiceDate}</p>
            <p className="mt-1 font-semibold text-slate-900">{formatCurrency(invoice.finalAmount)}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-600">Bill To</p>
            <p className="mt-3 text-sm text-slate-700 font-semibold">{invoice.consigneeName}</p>
            <p className="text-sm text-slate-700">{invoice.billingAddress}</p>
            <p className="text-sm text-slate-700">GST: {invoice.gstNumber}</p>
            <p className="text-sm text-slate-700">Contact: {invoice.contactPerson}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-600">Dispatch To</p>
            <p className="mt-3 text-sm text-slate-700">{invoice.dispatchLocation}</p>
            <p className="mt-4 text-sm uppercase tracking-[0.24em] text-slate-600">Invoice Total</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(invoice.finalAmount)}</p>
            <p className="mt-1 text-sm text-slate-700">{numberToWords(invoice.finalAmount)}</p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-3 font-semibold">Description</th>
                <th className="px-3 py-3 font-semibold">HSN</th>
                <th className="px-3 py-3 font-semibold">Packing</th>
                <th className="px-3 py-3 font-semibold">Qty</th>
                <th className="px-3 py-3 font-semibold">Rate</th>
                <th className="px-3 py-3 font-semibold">Taxable</th>
                <th className="px-3 py-3 font-semibold">GST%</th>
                <th className="px-3 py-3 font-semibold">GST Amt</th>
                <th className="px-3 py-3 font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {invoice.rows.map((row, index) => (
                <tr key={index}>
                  <td className="px-3 py-3 align-top">{row.productName || 'Item'}<br /><span className="text-xs text-slate-500">{row.description}</span></td>
                  <td className="px-3 py-3 align-top">{row.hsn}</td>
                  <td className="px-3 py-3 align-top">{row.packing}</td>
                  <td className="px-3 py-3 align-top">{row.quantity}</td>
                  <td className="px-3 py-3 align-top">{formatCurrency(row.price)}</td>
                  <td className="px-3 py-3 align-top">{formatCurrency(row.taxableValue)}</td>
                  <td className="px-3 py-3 align-top">{row.gstRate}%</td>
                  <td className="px-3 py-3 align-top">{formatCurrency(row.gstAmount)}</td>
                  <td className="px-3 py-3 align-top">{formatCurrency(row.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.7fr]">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Terms & Conditions</p>
            <ul className="mt-4 list-disc space-y-2 pl-5">
              <li>100% Advanced Payment before dispatch.</li>
              <li>Subject to Ahmedabad Jurisdiction.</li>
              <li>Billing as per chosen dispatch location.</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Summary</p>
            <div className="mt-4 space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <span>Total Taxable</span>
                <span className="font-semibold text-slate-900">{formatCurrency(invoice.totalTaxable)}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <span>Total GST</span>
                <span className="font-semibold text-slate-900">{formatCurrency(invoice.totalGST)}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <span>Freight</span>
                <span className="font-semibold text-slate-900">{formatCurrency(invoice.freight)}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <span>Round Off</span>
                <span className="font-semibold text-slate-900">{formatCurrency(invoice.roundOff)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
