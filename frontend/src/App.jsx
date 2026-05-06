import { useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import InvoiceGenerator from './components/InvoiceGenerator';
import PaymentSettings from './components/PaymentSettings';
import ProductCatalog from './components/ProductCatalog';
import InvoiceList from './components/InvoiceList';
import InvoiceDetail from './components/InvoiceDetail';
import Login from './components/Login';
import { clearStoredUser, getStoredUser } from './utils/auth';

function App() {
  const location = useLocation();
  const [pageTitle, setPageTitle] = useState('Invoice Generator');
  const [user, setUser] = useState(() => getStoredUser());

  const isLoginRoute = location.pathname === '/login';
  const isAuthed = Boolean(user);

  useEffect(() => {
    function handleStorage() {
      setUser(getStoredUser());
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (location.pathname === '/login') setPageTitle('Login');
    if (location.pathname === '/payment') setPageTitle('Payment Settings');
    else if (location.pathname === '/products') setPageTitle('Product Catalog');
    else if (location.pathname === '/invoices') setPageTitle('Saved Invoices');
    else setPageTitle('Invoice Generator');
  }, [location.pathname]);

  const guarded = useMemo(
    () => ({
      element: child => (isAuthed ? child : <Navigate to="/login" replace state={{ from: location }} />)
    }),
    [isAuthed, location]
  );

  function handleLogout() {
    clearStoredUser();
    setUser(null);
  }

  if (isLoginRoute) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={setUser} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-100 flex">
      <aside className="w-72 shrink-0 border-r border-slate-200 bg-white">
        <div className="h-full flex flex-col">
          <div className="px-5 py-5 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Sikko Industries logo" className="h-11 w-11 rounded-2xl object-contain" />
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.24em] text-sky-600">Sikko Industries Ltd</p>
                <h1 className="mt-1 text-lg font-bold text-slate-900 leading-snug">{pageTitle}</h1>
              </div>
            </div>
            {user ? (
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-500">Logged in</p>
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {user.employeeId ? `Employee ID: ${user.employeeId}` : 'Employee'}
                  </p>
                  {user.email ? <p className="text-xs text-slate-600 truncate">{user.email}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Logout
                </button>
              </div>
            ) : null}
          </div>

          <nav className="px-4 py-4 space-y-2">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive
                  ? 'flex items-center rounded-xl px-4 py-3 text-sm font-semibold bg-sky-600 text-white'
                  : 'flex items-center rounded-xl px-4 py-3 text-sm font-semibold bg-slate-50 text-slate-700 hover:bg-slate-100'
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/products"
              className={({ isActive }) =>
                isActive
                  ? 'flex items-center rounded-xl px-4 py-3 text-sm font-semibold bg-sky-600 text-white'
                  : 'flex items-center rounded-xl px-4 py-3 text-sm font-semibold bg-slate-50 text-slate-700 hover:bg-slate-100'
              }
            >
              Products
            </NavLink>
            <NavLink
              to="/invoices"
              className={({ isActive }) =>
                isActive
                  ? 'flex items-center rounded-xl px-4 py-3 text-sm font-semibold bg-sky-600 text-white'
                  : 'flex items-center rounded-xl px-4 py-3 text-sm font-semibold bg-slate-50 text-slate-700 hover:bg-slate-100'
              }
            >
              Saved Invoices
            </NavLink>
            <NavLink
              to="/payment"
              className={({ isActive }) =>
                isActive
                  ? 'flex items-center rounded-xl px-4 py-3 text-sm font-semibold bg-sky-600 text-white'
                  : 'flex items-center rounded-xl px-4 py-3 text-sm font-semibold bg-slate-50 text-slate-700 hover:bg-slate-100'
              }
            >
              Payment Settings
            </NavLink>
          </nav>

          <div className="mt-auto px-5 py-4 text-xs text-slate-500 border-t border-slate-200">
            Billing & Inventory
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <Routes>
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/" element={guarded.element(<InvoiceGenerator />)} />
            <Route path="/invoice/:invoiceId" element={guarded.element(<InvoiceGenerator />)} />
            <Route path="/products" element={guarded.element(<ProductCatalog />)} />
            <Route path="/invoices" element={guarded.element(<InvoiceList />)} />
            <Route path="/invoices/:id" element={guarded.element(<InvoiceDetail />)} />
            <Route path="/payment" element={guarded.element(<PaymentSettings />)} />
            <Route path="*" element={<Navigate to="/" replace />} />
           </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
