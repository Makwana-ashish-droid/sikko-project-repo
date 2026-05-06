import { useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getStoredUser, storeUser } from '../utils/auth';

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const location = useLocation();
  const existingUser = useMemo(() => getStoredUser(), []);
  const from = location.state?.from?.pathname || '/';

  const [employeeId, setEmployeeId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (existingUser) return <Navigate to={from} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');

    setIsSubmitting(true);
    try {
      storeUser({
        employeeId: employeeId.trim(),
        email: email.trim(),
        userId: null,
        loggedInAt: new Date().toISOString()
      });

      onLogin?.(getStoredUser());
      navigate(from, { replace: true });
    } catch {
      // setServerError('Login failed. Please try again.');
      setIsSubmitting(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-slate-50 to-indigo-50/60 flex items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="absolute -bottom-40 right-[-8rem] h-[30rem] w-[30rem] rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute -bottom-40 left-[-8rem] h-[30rem] w-[30rem] rounded-full bg-violet-200/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200/70 bg-white/80 shadow-[0_25px_70px_-45px_rgba(15,23,42,0.55)] backdrop-blur">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-600 to-sky-600 p-8 sm:p-10">
            <div className="absolute inset-0 opacity-30">
              <div className="absolute -top-28 -left-28 h-80 w-80 rounded-full bg-white/30" />
              <div className="absolute -bottom-32 -right-28 h-96 w-96 rounded-full bg-white/20" />
            </div>

            <div className="relative">
              <div className="inline-flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 ring-1 ring-white/25 backdrop-blur">
                <img
                  src="/logo.png"
                  alt="Sikko Industries logo"
                  className="h-11 w-11 rounded-2xl bg-white/95 p-1 object-contain ring-1 ring-white/40"
                />
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.24em] text-white/80">SIKKO INDUSTRIES</p>
                  <p className="text-sm font-semibold text-white">Billing & Inventory Suite</p>
                </div>
              </div>

              <h1 className="mt-10 text-3xl sm:text-4xl font-extrabold text-white leading-tight">
                Welcome back
              </h1>
              <p className="mt-3 text-sm sm:text-base text-white/85 max-w-md">
                Sign in to access your dashboard and manage invoices, products, and payments.
              </p>

              <div className="mt-10 grid grid-cols-2 gap-3 max-w-md">
                <div className="rounded-2xl bg-white/10 ring-1 ring-white/20 px-4 py-3">
                  <p className="text-xs font-semibold text-white/85">Fast</p>
                  <p className="mt-1 text-xs text-white/70">Auto-calculation</p>
                </div>
                <div className="rounded-2xl bg-white/10 ring-1 ring-white/20 px-4 py-3">
                  <p className="text-xs font-semibold text-white/85">Secure</p>
                  <p className="mt-1 text-xs text-white/70">Local session</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 sm:p-10 lg:p-12">
            <div>
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Sikko Industries logo" className="h-10 w-10 rounded-xl object-contain" />
                <h2 className="text-2xl font-bold text-slate-900">Log in</h2>
              </div>
              <p className="mt-1 text-sm text-slate-600">Enter any details to continue to dashboard.</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Employee ID</label>
                  <input
                    value={employeeId}
                    onChange={e => setEmployeeId(e.target.value)}
                    placeholder="EMP-1023"
                    autoComplete="off"
                    className="mt-2 w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700">Email</label>
                  <input
                    type="text"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    className="mt-2 w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700">Password</label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="shrink-0 bg-slate-100 text-slate-700 hover:bg-slate-200"
                    aria-pressed={showPassword}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {serverError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {serverError}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Logging in…' : 'Continue'}
              </button>

              <p className="text-xs text-slate-500">
                By continuing, you agree to use this system for official business purposes.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

