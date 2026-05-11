import { useEffect, useState } from 'react';

const localQrPath = '/upi-qr.png';
const fallbackQrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=upi://pay?pa=sikko@icici&pn=Sikko%20Industries%20Ltd';

const defaultSettings = {
  bankName: 'ICICI Bank',
  accountNumber: '123456789012',
  ifsc: 'ICIC0001234',
  upiId: 'sikko@icici',
  qrCodeUrl: localQrPath,
  accountHolder: 'Sikko Industries Ltd',
  branch: 'Ahmedabad',
  gstNumber: '24AABCS1234D1Z5'
};

export default function PaymentSettings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [status, setStatus] = useState('Loading...');
  const [qrFile, setQrFile] = useState(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch('/api/settings/payment');
        if (!response.ok) throw new Error('Unable to load payment settings');
        const data = await response.json();
        setSettings(data);
        setStatus('');
      } catch (error) {
        console.error(error);
        setStatus('Unable to load settings. Using defaults.');
      }
    }
    loadSettings();
  }, []);

  function updateField(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  function handleQrUpload(event) {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target?.result;
        setQrFile(file.name);
        updateField('qrCodeUrl', base64String);
      };
      reader.readAsDataURL(file);
    }
  }

  async function saveSettings() {
    try {
      const response = await fetch('/api/settings/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (!response.ok) throw new Error('Failed to save settings');
      setStatus('Payment settings saved successfully.');
    } catch (error) {
      console.error(error);
      setStatus('Unable to save settings.');
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Payment Settings</h2>
        <p className="mt-2 text-sm text-slate-600">
          Configure bank details and UPI QR code to auto-print on invoices.
        </p>

        <div className="mt-4 text-sm text-slate-600">{status}</div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            { label: 'Bank Name', key: 'bankName' },
            { label: 'Account Holder', key: 'accountHolder' },
            { label: 'Account Number', key: 'accountNumber' },
            { label: 'IFSC Code', key: 'ifsc' },
            { label: 'UPI ID', key: 'upiId' },
            { label: 'Branch', key: 'branch' },
            { label: 'GST Number', key: 'gstNumber' }
          ].map(field => (
            <label key={field.key} className="block">
              <span className="text-sm font-medium text-slate-700">{field.label}</span>
              <input
                type="text"
                value={settings[field.key]}
                onChange={event => updateField(field.key, event.target.value)}
                className="mt-2 w-full"
              />
            </label>
          ))}
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">UPI QR Code</span>
            <div className="mt-2 flex gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleQrUpload}
                className="mt-2 flex-1"
              />
              {qrFile && <span className="mt-4 text-sm text-green-600">✓ {qrFile}</span>}
            </div>
          </label>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={saveSettings} className="rounded-xl bg-sky-600 px-5 py-3 text-white hover:bg-sky-700">
            Save Payment Settings
          </button>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Preview</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">Bank</p>
            <p className="mt-2 text-sm text-slate-700">{settings.bankName}</p>
            <p className="text-sm text-slate-700">A/c No: {settings.accountNumber}</p>
            <p className="text-sm text-slate-700">IFSC: {settings.ifsc}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">UPI</p>
            <p className="mt-2 text-sm text-slate-700">{settings.upiId}</p>
            <img
              src={settings.qrCodeUrl || localQrPath}
              crossOrigin="anonymous"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = fallbackQrUrl;
              }}
              alt="UPI QR"
              className="mt-3 h-32 w-32 rounded-xl object-contain border border-slate-200 bg-white"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
