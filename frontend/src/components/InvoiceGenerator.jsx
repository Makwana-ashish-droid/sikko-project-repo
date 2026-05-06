import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { numberToWords } from '../utils/numberToWords';
import { upsertStoredInvoice } from '../utils/invoices';

const consignor = {
  companyName: 'Sikko Industries Ltd',
  regOffice: '801, Sikko House, Nr. Makarba Cross Road, Ahmedabad - 380051',
  dispatchAddresses: [
    { label: 'Main Godown', address: 'Plot 25, GIDC, Vatva, Ahmedabad - 382445' },
    { label: 'Export Dispatch Unit', address: 'Unit 12, Phase II, Sanand, Ahmedabad - 382110' }
  ],
  gstNumber: '24AABCS1234D1Z5',
  bankDetails: {
    bankName: 'ICICI Bank',
    accountNumber: '123456789012',
    ifsc: 'ICIC0001234',
    branch: 'Ahmedabad',
    upiId: 'sikko@icici',
    qrCodeUrl: 'https://via.placeholder.com/130?text=UPI+QR'
  }
};

const productCatalog = [
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

const initialRow = {
  id: Date.now(),
  productName: '',
  description: '',
  hsn: '',
  packing: '',
  quantity: 0,
  price: 0,
  gstRate: 18,
  taxableValue: 0,
  gstAmount: 0,
  totalAmount: 0
};

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
}

export default function InvoiceGenerator() {
  const { invoiceId } = useParams();
  const [consignee, setConsignee] = useState({
    name: '',
    billingAddress: '',
    shippingAddress: '',
    gstNumber: '',
    contactPerson: '',
    dispatchLocation: consignor.dispatchAddresses[0].label
  });
  const [invoiceNumber, setInvoiceNumber] = useState(`SI-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState([initialRow]);
  const [freight, setFreight] = useState(0);
  const [roundOff, setRoundOff] = useState(0);
  const [paymentSettings, setPaymentSettings] = useState(null);
  const invoiceRef = useRef();

  useEffect(() => {
    const saved = localStorage.getItem('sikkoPaymentSettings');
    if (saved) setPaymentSettings(JSON.parse(saved));
  }, []);

  const computedRows = useMemo(() => {
    return rows.map(row => {
      const quantity = Number(row.quantity || 0);
      const price = Number(row.price || 0);
      const gstRate = Number(row.gstRate || 0);
      const taxableValue = Number((quantity * price).toFixed(2));
      const gstAmount = Number(((taxableValue * gstRate) / 100).toFixed(2));
      const totalAmount = Number((taxableValue + gstAmount).toFixed(2));
      return { ...row, taxableValue, gstAmount, totalAmount };
    });
  }, [rows]);

  const totals = useMemo(() => {
    const totalTaxableValue = computedRows.reduce((sum, row) => sum + row.taxableValue, 0);
    const totalGST = computedRows.reduce((sum, row) => sum + row.gstAmount, 0);
    const finalAmount = Number((totalTaxableValue + totalGST + Number(freight || 0) + Number(roundOff || 0)).toFixed(2));
    return { totalTaxableValue, totalGST, finalAmount };
  }, [computedRows, freight, roundOff]);

  function handleRowChange(index, field, value) {
    setRows(curr => {
      const next = [...curr];
      next[index] = { ...next[index], [field]: value };
      if (field === 'productName') {
        const product = productCatalog.find(item => item.name === value);
        if (product) {
          next[index] = {
            ...next[index],
            description: product.description,
            hsn: product.hsn,
            packing: product.packing,
            price: product.price,
            gstRate: product.gstRate
          };
        }
      }
      return next;
    });
  }

  function addRow() {
    setRows(curr => [...curr, { ...initialRow, id: Date.now() + Math.random() }]);
  }

  function removeRow(index) {
    setRows(curr => curr.filter((_, idx) => idx !== index));
  }

  const handlePrint = useReactToPrint({ content: () => invoiceRef.current });

  async function handleSaveInvoice() {
    const payload = {
      id: invoiceId ? Number(invoiceId) : Date.now(),
      invoiceNumber,
      invoiceDate,
      consigneeName: consignee.name,
      billingAddress: consignee.billingAddress,
      shippingAddress: consignee.shippingAddress,
      gstNumber: consignee.gstNumber,
      contactPerson: consignee.contactPerson,
      dispatchLocation: consignee.dispatchLocation,
      rows: computedRows,
      freight: Number(freight || 0),
      roundOff: Number(roundOff || 0),
      totalTaxable: totals.totalTaxableValue,
      totalGST: totals.totalGST,
      finalAmount: totals.finalAmount,
      createdAt: new Date().toISOString()
    };

    // Always save locally so Saved Invoices works even without backend.
    upsertStoredInvoice(payload);

    // Best-effort backend save (optional).
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: payload.invoiceNumber,
          invoiceDate: payload.invoiceDate,
          consignee: {
            name: payload.consigneeName,
            billingAddress: payload.billingAddress,
            shippingAddress: payload.shippingAddress,
            gstNumber: payload.gstNumber,
            contactPerson: payload.contactPerson,
            dispatchLocation: payload.dispatchLocation
          },
          rows: payload.rows,
          freight: payload.freight,
          roundOff: payload.roundOff,
          totalTaxableValue: payload.totalTaxable,
          totalGST: payload.totalGST,
          finalAmount: payload.finalAmount
        })
      });

      if (response.ok) {
        const saved = await response.json().catch(() => null);
        if (saved?.id != null) upsertStoredInvoice({ ...payload, id: saved.id });
      }
    } catch {
      // ignore - local storage already has it
    }

    alert('Invoice saved.');
  }

  async function handleExportPDF() {
    if (!invoiceRef.current) return;
    const canvas = await html2canvas(invoiceRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = (canvas.height * pageWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
    pdf.save(`${invoiceNumber.replace(/[^A-Za-z0-9]/g, '_')}.pdf`);
  }

  async function syncWithBackend() {
    try {
      const response = await fetch('/api/invoice/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: computedRows, freight, roundOff })
      });
      const payload = await response.json();
      if (response.ok) {
        alert('Invoice data calculated by backend successfully. Check console for details.');
        console.log('Backend calculation:', payload);
      } else {
        console.error('Backend error', payload);
        alert('Backend calculation failed.');
      }
    } catch (error) {
      console.error(error);
      alert('Unable to contact backend.');
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Consignee & Invoice Details</h2>
            <div className="mt-5 grid gap-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Customer Name</span>
                <input
                  type="text"
                  value={consignee.name}
                  onChange={e => setConsignee(prev => ({ ...prev, name: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Billing Address</span>
                <textarea
                  rows="3"
                  value={consignee.billingAddress}
                  onChange={e => setConsignee(prev => ({ ...prev, billingAddress: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Shipping Address</span>
                <textarea
                  rows="3"
                  value={consignee.shippingAddress}
                  onChange={e => setConsignee(prev => ({ ...prev, shippingAddress: e.target.value }))}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">GST Number</span>
                  <input
                    type="text"
                    value={consignee.gstNumber}
                    onChange={e => setConsignee(prev => ({ ...prev, gstNumber: e.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Contact Person</span>
                  <input
                    type="text"
                    value={consignee.contactPerson}
                    onChange={e => setConsignee(prev => ({ ...prev, contactPerson: e.target.value }))}
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Dispatch Location</span>
                <select
                  value={consignee.dispatchLocation}
                  onChange={e => setConsignee(prev => ({ ...prev, dispatchLocation: e.target.value }))}
                  className="mt-2 w-full"
                >
                  {consignor.dispatchAddresses.map(location => (
                    <option key={location.label} value={location.label}>
                      {location.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-600">Invoice No.</p>
                <p className="mt-1 font-semibold text-slate-900">{invoiceNumber}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Invoice Date</p>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                  className="mt-2 w-full"
                />
              </div>
              <div>
                <p className="text-sm text-slate-600">Reg. Office</p>
                <p className="mt-1 text-sm text-slate-800">{consignor.regOffice}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Selected Dispatch</p>
                <p className="mt-1 text-sm text-slate-800">
                  {consignor.dispatchAddresses.find(loc => loc.label === consignee.dispatchLocation)?.address}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">GST</p>
                <p className="mt-1 text-slate-700">{consignor.gstNumber}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm overflow-x-auto">
        <h2 className="text-xl font-semibold text-slate-900">Product Details</h2>
        <div className="mt-4 min-w-full">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-3 font-semibold">Product</th>
                <th className="px-3 py-3 font-semibold">HSN</th>
                <th className="px-3 py-3 font-semibold">Packing</th>
                <th className="px-3 py-3 font-semibold">Qty</th>
                <th className="px-3 py-3 font-semibold">Price/Unit</th>
                <th className="px-3 py-3 font-semibold">Taxable Value</th>
                <th className="px-3 py-3 font-semibold">GST %</th>
                <th className="px-3 py-3 font-semibold">GST Amt</th>
                <th className="px-3 py-3 font-semibold">Total</th>
                <th className="px-3 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {computedRows.map((row, index) => (
                <tr key={row.id} className="bg-white">
                  <td className="px-3 py-3 align-top">
                    <select
                      value={row.productName}
                      onChange={e => handleRowChange(index, 'productName', e.target.value)}
                      className="w-full"
                    >
                      <option value="">Select product</option>
                      {productCatalog.map(product => (
                        <option key={product.name} value={product.name}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                    <textarea
                      rows="2"
                      value={row.description}
                      onChange={e => handleRowChange(index, 'description', e.target.value)}
                      placeholder="Description"
                      className="mt-2 w-full"
                    />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <input
                      type="text"
                      value={row.hsn}
                      onChange={e => handleRowChange(index, 'hsn', e.target.value)}
                      className="w-full"
                    />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <input
                      type="text"
                      value={row.packing}
                      onChange={e => handleRowChange(index, 'packing', e.target.value)}
                      className="w-full"
                    />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <input
                      type="number"
                      min="0"
                      value={row.quantity}
                      onChange={e => handleRowChange(index, 'quantity', e.target.value)}
                      className="w-full"
                    />
                  </td>
                  <td className="px-3 py-3 align-top">
                    <input
                      type="number"
                      min="0"
                      value={row.price}
                      onChange={e => handleRowChange(index, 'price', e.target.value)}
                      className="w-full"
                    />
                  </td>
                  <td className="px-3 py-3 align-top">{formatCurrency(row.taxableValue)}</td>
                  <td className="px-3 py-3 align-top">
                    <input
                      type="number"
                      min="0"
                      value={row.gstRate}
                      onChange={e => handleRowChange(index, 'gstRate', e.target.value)}
                      className="w-full"
                    />
                  </td>
                  <td className="px-3 py-3 align-top">{formatCurrency(row.gstAmount)}</td>
                  <td className="px-3 py-3 align-top">{formatCurrency(row.totalAmount)}</td>
                  <td className="px-3 py-3 align-top">
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="rounded-xl bg-rose-500 px-3 py-2 text-white hover:bg-rose-600"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button onClick={addRow} className="rounded-xl bg-sky-600 px-5 py-3 text-white hover:bg-sky-700">
              Add Row
            </button>
            <button
              type="button"
              onClick={syncWithBackend}
              className="rounded-xl bg-slate-800 px-5 py-3 text-white hover:bg-slate-900"
            >
              Sync with Backend
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-lg font-semibold text-slate-900">Invoice Summary</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div className="grid grid-cols-2 gap-2">
                <span>Total Taxable Value</span>
                <span className="font-semibold text-slate-900">{formatCurrency(totals.totalTaxableValue)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span>Total GST</span>
                <span className="font-semibold text-slate-900">{formatCurrency(totals.totalGST)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span>Freight Charges</span>
                <input
                  type="number"
                  min="0"
                  value={freight}
                  onChange={e => setFreight(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <span>Round Off</span>
                <input
                  type="number"
                  step="0.01"
                  value={roundOff}
                  onChange={e => setRoundOff(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900 p-5 text-white shadow-sm">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-300">Net Payable</p>
            <p className="mt-3 text-3xl font-semibold">{formatCurrency(totals.finalAmount)}</p>
            <p className="mt-2 text-sm text-slate-300">{numberToWords(totals.finalAmount)}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-lg font-semibold text-slate-900">Help & Notes</h3>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>100% Advanced Payment</li>
            <li>Subject to Ahmedabad Jurisdiction</li>
            <li>Prices are exclusive of handling and special packaging unless stated.</li>
            <li>Consignor reserves the right to amend dispatch location and delivery schedules.</li>
          </ul>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleSaveInvoice}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-white hover:bg-indigo-700"
          >
            Save Invoice
          </button>
          <button
            onClick={handlePrint}
            className="rounded-xl bg-sky-600 px-5 py-3 text-white hover:bg-sky-700"
          >
            Print Invoice
          </button>
          <button
            onClick={handleExportPDF}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-white hover:bg-emerald-700"
          >
            Export as PDF
          </button>
        </div>

        <div ref={invoiceRef} className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <img
                src="/logo.png"
                alt="Sikko Industries logo"
                className="h-14 w-14 rounded-2xl object-contain print:h-12 print:w-12"
              />
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Sikko Industries Ltd</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Proforma Invoice</h2>
                <p className="mt-3 max-w-xl text-sm text-slate-700">
                  Reg. Office and Dispatch locations are maintained separately to support multiple godown and dispatch address
                  requirements.
                </p>
              </div>
            </div>
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <div>
                <span className="font-semibold text-slate-700">Invoice No:</span> {invoiceNumber}
              </div>
              <div>
                <span className="font-semibold text-slate-700">Date:</span> {invoiceDate}
              </div>
              <div>
                <span className="font-semibold text-slate-700">GST:</span> {consignor.gstNumber}
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-600">Consignor</h3>
              <p className="text-sm text-slate-700 font-semibold">{consignor.companyName}</p>
              <p className="text-sm text-slate-700">{consignor.regOffice}</p>
              <p className="text-sm text-slate-700">GST: {consignor.gstNumber}</p>
              <p className="text-sm text-slate-700">Bank: {consignor.bankDetails.bankName}</p>
              <p className="text-sm text-slate-700">A/c No: {consignor.bankDetails.accountNumber}</p>
              <p className="text-sm text-slate-700">IFSC: {consignor.bankDetails.ifsc}</p>
            </div>
            <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-600">Consignee</h3>
              <p className="text-sm text-slate-700 font-semibold">{consignee.name || 'Buyer Name'}</p>
              <p className="text-sm text-slate-700">{consignee.billingAddress || 'Billing Address'}</p>
              <p className="text-sm text-slate-700">{consignee.shippingAddress || 'Shipping Address'}</p>
              <p className="text-sm text-slate-700">GST: {consignee.gstNumber || 'GSTIN'}</p>
              <p className="text-sm text-slate-700">Contact: {consignee.contactPerson || 'Contact Person'}</p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-3 font-semibold">Description</th>
                  <th className="px-3 py-3 font-semibold">HSN</th>
                  <th className="px-3 py-3 font-semibold">Pack</th>
                  <th className="px-3 py-3 font-semibold">Qty</th>
                  <th className="px-3 py-3 font-semibold">Rate</th>
                  <th className="px-3 py-3 font-semibold">Taxable</th>
                  <th className="px-3 py-3 font-semibold">GST%</th>
                  <th className="px-3 py-3 font-semibold">GST Amt</th>
                  <th className="px-3 py-3 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {computedRows.map((row, index) => (
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
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-600">Terms & Conditions</h3>
              <ul className="mt-4 list-disc space-y-2 text-sm text-slate-700 pl-5">
                <li>100% Advanced Payment before dispatch.</li>
                <li>Subject to Ahmedabad Jurisdiction.</li>
                <li>Goods once sold will not be taken back.</li>
                <li>Billing as per the chosen dispatch location.</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="space-y-4 text-sm text-slate-700">
                <div className="grid grid-cols-2 gap-4">
                  <span>Total Taxable Value</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(totals.totalTaxableValue)}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <span>Total GST</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(totals.totalGST)}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <span>Freight</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(Number(freight || 0))}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <span>Round Off</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(Number(roundOff || 0))}</span>
                </div>
                <div className="border-t border-slate-200 pt-4 text-lg font-semibold text-slate-900">
                  <span>Invoice Total</span>
                  <span className="float-right">{formatCurrency(totals.finalAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-600">Bank Details</p>
              <p className="mt-3 text-sm text-slate-700">{paymentSettings?.bankName || consignor.bankDetails.bankName}</p>
              <p className="text-sm text-slate-700">A/c No: {paymentSettings?.accountNumber || consignor.bankDetails.accountNumber}</p>
              <p className="text-sm text-slate-700">IFSC: {paymentSettings?.ifsc || consignor.bankDetails.ifsc}</p>
              <p className="text-sm text-slate-700">UPI ID: {paymentSettings?.upiId || consignor.bankDetails.upiId}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-600">Payment QR</p>
              <img src={paymentSettings?.qrCodeUrl || consignor.bankDetails.qrCodeUrl} alt="UPI QR" className="mt-4 h-40 w-40 rounded-2xl border border-slate-200 object-contain" />
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Trade Executive</p>
              <div className="mt-10 h-20 border-b border-slate-300" />
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Consignee Acceptance</p>
              <div className="mt-10 h-20 border-b border-slate-300" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
