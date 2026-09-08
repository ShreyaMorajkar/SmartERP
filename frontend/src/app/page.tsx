'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { API_BASE } from '../config';
import { GatewayMenu } from '../components/GatewayMenu';
import { MasterCreation } from '../components/MasterCreation';
import { VoucherEntry } from '../components/VoucherEntry';
import { ReportsViewer } from '../components/ReportsViewer';
import { Calculator } from '../components/Calculator';
import { CommandPalette } from '../components/CommandPalette';
import {
  Briefcase,
  Building,
  Key,
  LogOut,
  Plus,
  Terminal,
  User,
  Calculator as CalcIcon,
  Search,
  BookOpen
} from 'lucide-react';

export default function Home() {
  const {
    user,
    token,
    companies,
    activeCompany,
    currentView,
    activeVoucherType,
    activeReport,
    login,
    logout,
    fetchCompanies,
    selectCompany,
    navigateTo,
    goBack
  } = useApp();

  // Auth Screen Local State
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });
  const [authError, setAuthError] = useState<string | null>(null);

  // Company Screen Local State
  const [companyForm, setCompanyForm] = useState({
    name: '',
    address: '',
    gstin: '',
    financialYear: '2026-2027',
    state: ''
  });
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [showCreateCompany, setShowCreateCompany] = useState<boolean>(false);

  // Dialog Toggles for keyboard shortcuts hook
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const [financialYearDialogOpen, setFinancialYearDialogOpen] = useState<boolean>(false);
  const [companyActiveIndex, setCompanyActiveIndex] = useState<number>(0);

  const companyActiveIndexRef = React.useRef(companyActiveIndex);
  companyActiveIndexRef.current = companyActiveIndex;

  const companiesRef = React.useRef(companies);
  companiesRef.current = companies;

  // Keyboard navigation for Company selection screen
  useEffect(() => {
    if (currentView !== 'companies' || showCreateCompany) return;

    const handleCompanyKeys = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';
      if (isInput) return;

      const comps = companiesRef.current;
      const currentIdx = companyActiveIndexRef.current;

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        if (comps.length > 0) {
          const next = (companyActiveIndexRef.current + 1) % comps.length;
          companyActiveIndexRef.current = next;
          setCompanyActiveIndex(next);
        }
        return;
      }
      
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        if (comps.length > 0) {
          const prev = (companyActiveIndexRef.current - 1 + comps.length) % comps.length;
          companyActiveIndexRef.current = prev;
          setCompanyActiveIndex(prev);
        }
        return;
      }
      
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const cur = companyActiveIndexRef.current;
        if (comps.length > 0 && comps[cur]) {
          selectCompany(comps[cur]);
        }
        return;
      }
      
      if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setShowCreateCompany(true);
        return;
      }
      
      if (/^[1-9]$/.test(e.key)) {
        const numIdx = parseInt(e.key, 10) - 1;
        if (comps[numIdx]) {
          e.preventDefault();
          e.stopPropagation();
          selectCompany(comps[numIdx]);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleCompanyKeys, { capture: true });
    return () => window.removeEventListener('keydown', handleCompanyKeys, { capture: true });
  }, [currentView, showCreateCompany]);

  // Initialize Shortcuts
  useKeyboardShortcuts(
    () => setCommandPaletteOpen(prev => !prev),
    () => setFinancialYearDialogOpen(prev => !prev)
  );

  // Load companies if user logged in
  useEffect(() => {
    if (token) {
      fetchCompanies();
    }
  }, [token]);

  // Auth Submission handler
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const endpoint = isSignUp ? 'register' : 'login';
    try {
      const res = await fetch(`${API_BASE}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      login(data.user, data.token);
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  // Company creation handler
  const handleCreateCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyError(null);
    try {
      const res = await fetch(`${API_BASE}/companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(companyForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create company');
      
      // Reset form & reload
      setCompanyForm({ name: '', address: '', gstin: '', financialYear: '2026-2027', state: '' });
      setShowCreateCompany(false);
      fetchCompanies();
    } catch (err: any) {
      setCompanyError(err.message);
    }
  };

  // ----------------------------------------------------
  // SCREEN 1: Authentication Screen
  // ----------------------------------------------------
  if (currentView === 'auth') {
    return (
      <div className="min-h-screen flex justify-center items-center px-4 relative bg-[#090d16] overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md glassmorphism rounded-2xl p-8 border border-slate-800 shadow-2xl relative z-10">
          <div className="flex justify-center items-center gap-2 mb-6">
            <Terminal className="text-emerald-400" size={32} />
            <span className="text-2xl font-bold uppercase tracking-wider text-white">SmartERP</span>
          </div>

          <h2 className="text-lg font-bold text-center text-slate-300 mb-6">
            {isSignUp ? 'Create Accounting Admin Account' : 'Sign in to Ledger Console'}
          </h2>

          {authError && (
            <div className="p-3 mb-4 bg-red-950/40 border border-red-900 rounded-lg text-xs font-semibold text-red-400">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={authForm.name}
                  onChange={e => setAuthForm({ ...authForm, name: e.target.value })}
                  className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  placeholder="John Doe"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email Address</label>
              <input
                type="email"
                required
                value={authForm.email}
                onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                placeholder="admin@smarterp.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Password Ledger Key</label>
              <input
                type="password"
                required
                value={authForm.password}
                onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-500 text-slate-950 font-bold py-2.5 rounded-lg hover:bg-emerald-400 transition"
            >
              {isSignUp ? 'REGISTER ADMIN' : 'LOG IN TO CONSOLE'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setAuthError(null);
              }}
              className="text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // SCREEN 2: Company Selection Screen
  // ----------------------------------------------------
  if (currentView === 'companies') {
    return (
      <div className="min-h-screen py-12 px-6 bg-[#090d16] relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto relative z-10 space-y-8">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <Building className="text-emerald-400" size={32} />
              <div>
                <h1 className="text-2xl font-bold text-white uppercase tracking-wider">Company Selection</h1>
                <p className="text-xs text-slate-400">Select or create a company to begin accounting transactions.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-400 flex items-center gap-1.5 bg-[#0f172a] px-3 py-1.5 rounded-lg border border-slate-800">
                <User size={14} className="text-emerald-400" /> {user?.name}
              </span>
              <button
                onClick={logout}
                className="flex items-center text-xs font-bold text-red-400 bg-red-950/20 border border-red-900/30 px-3 py-1.5 rounded-lg hover:bg-red-900/30 transition"
              >
                <LogOut size={14} className="mr-1.5" /> Logout
              </button>
            </div>
          </div>

          {companyError && (
            <div className="p-4 bg-red-950/40 border border-red-900 rounded-xl text-sm font-semibold text-red-400">
              {companyError}
            </div>
          )}

          {showCreateCompany ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl max-w-xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-white uppercase">Initialize New Company</h2>
                <button
                  onClick={() => setShowCreateCompany(false)}
                  className="text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleCreateCompanySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    value={companyForm.name}
                    onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })}
                    className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Rahul Enterprises Pvt Ltd"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">State Address</label>
                  <input
                    type="text"
                    required
                    value={companyForm.state}
                    onChange={e => setCompanyForm({ ...companyForm, state: e.target.value })}
                    className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                    placeholder="e.g. Maharashtra"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={companyForm.gstin}
                    onChange={e => setCompanyForm({ ...companyForm, gstin: e.target.value })}
                    className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                    placeholder="e.g. 27AAAAA1111A1Z1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Financial Year</label>
                    <input
                      type="text"
                      required
                      value={companyForm.financialYear}
                      onChange={e => setCompanyForm({ ...companyForm, financialYear: e.target.value })}
                      className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Physical Address</label>
                    <input
                      type="text"
                      value={companyForm.address}
                      onChange={e => setCompanyForm({ ...companyForm, address: e.target.value })}
                      className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                      placeholder="e.g. Mumbai, India"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-500 text-slate-950 font-bold py-2.5 rounded-lg hover:bg-emerald-400 transition"
                >
                  INITIALIZE SYSTEM SEED
                </button>
              </form>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Companies cards list */}
              {companies.length === 0 ? (
                <div className="md:col-span-2 border-2 border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-500">
                  No active company records found. Click below to initialize.
                </div>
              ) : (
                companies.map((company, idx) => {
                  const isSelected = idx === companyActiveIndex;
                  return (
                    <button
                      key={company.id}
                      onClick={() => {
                        setCompanyActiveIndex(idx);
                        selectCompany(company);
                      }}
                      onMouseEnter={() => setCompanyActiveIndex(idx)}
                      className={`flex flex-col justify-between p-6 bg-slate-900 border rounded-xl text-left transition duration-200 group ${
                        isSelected
                          ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className={`text-lg font-bold transition mb-2 ${isSelected ? 'text-emerald-400' : 'text-white'}`}>
                            {company.name}
                          </h3>
                          <div className="text-xs text-slate-400 mb-1">GSTIN: {company.gstin || 'Unassigned'}</div>
                          <div className="text-xs text-slate-400">State: {company.state || 'Unassigned'}</div>
                        </div>
                        <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
                          isSelected ? 'bg-emerald-950 text-emerald-400 border-emerald-800 font-bold' : 'bg-slate-800/40 text-slate-500 border-slate-800'
                        }`}>
                          [{idx + 1}]
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-800/80 pt-4 mt-6 w-full text-[10px] text-slate-500 font-mono">
                        <span>FY: {company.financialYear}</span>
                        <span className={`uppercase tracking-widest font-bold ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {isSelected ? 'Press Enter to Open ↵' : 'Select console →'}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}

              {/* Create company button card */}
              {companies.length < 5 && (
                <button
                  onClick={() => setShowCreateCompany(true)}
                  className="flex flex-col justify-center items-center p-6 border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-xl text-slate-400 hover:text-white transition duration-200 h-[210px]"
                >
                  <Plus size={32} className="text-emerald-500 mb-3" />
                  <span className="font-bold text-sm uppercase tracking-wider">Initialize New Company</span>
                  <span className="text-[10px] text-slate-500 mt-1">Manage up to 5 companies max</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // MAIN APPLICATION CONSOLE LAYOUT (After selecting company)
  // ----------------------------------------------------
  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-white">
      {/* 1. Global Console Header */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Terminal className="text-emerald-500" size={24} />
          <div>
            <span className="text-sm font-black uppercase tracking-wider text-white">SmartERP</span>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded ml-2 font-mono border border-slate-700">
              Active Console
            </span>
          </div>
        </div>

        {/* Info stats bar */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded">
            <Building size={12} className="text-emerald-400" />
            <span>Company: <strong className="text-white">{activeCompany?.name}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded">
            <Briefcase size={12} className="text-sky-400" />
            <span>FY: <strong className="text-white">{activeCompany?.financialYear}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded">
            <User size={12} className="text-purple-400" />
            <span>User: <strong className="text-white">{user?.name}</strong></span>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center text-xs font-semibold bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <Search size={14} className="mr-1.5 text-emerald-400" /> Search (Ctrl+K)
          </button>
          
          <button
            onClick={() => navigateTo('companies')}
            className="flex items-center text-xs font-semibold bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            Switch Company (F1)
          </button>

          <button
            onClick={logout}
            className="flex items-center text-xs font-bold text-red-400 bg-red-950/20 border border-red-900/30 px-3 py-1.5 rounded-lg hover:bg-red-900/30 transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* 2. Main content view area */}
      <main className="flex-1 p-6">
        {currentView === 'gateway' && <GatewayMenu />}
        {currentView === 'masters' && <MasterCreation />}
        {currentView === 'vouchers' && <VoucherEntry />}
        {currentView === 'reports' && <ReportsViewer />}
      </main>

      {/* 3. Global Status / Shortcuts Footer */}
      <footer className="bg-slate-950 border-t border-slate-850 px-6 py-2 flex flex-wrap gap-2 text-[10px] text-slate-500 font-mono items-center justify-between">
        <div className="flex gap-3">
          <span><strong className="text-slate-400">F1</strong> Select Co</span>
          <span><strong className="text-slate-400">F4</strong> Calc</span>
          <span><strong className="text-slate-400">F8</strong> Sales</span>
          <span><strong className="text-slate-400">F9</strong> Purchase</span>
          <span><strong className="text-slate-400">ESC</strong> Back</span>
          <span><strong className="text-slate-400">Ctrl+K</strong> Search</span>
        </div>
        <div>
          <span>SmartERP Keyboard System v1.0.0</span>
        </div>
      </footer>

      {/* Draggable Overlay Calculator */}
      <Calculator />

      {/* Command Palette Overlay */}
      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </div>
  );
}
