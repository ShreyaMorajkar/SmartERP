'use client';

import React, { useState, useEffect } from 'react';
import { useApp, ViewType, ReportType, VoucherType } from '../context/AppContext';

interface MenuItem {
  label: string;
  hotkey: string;
  action: () => void;
  description: string;
}

export const GatewayMenu: React.FC = () => {
  const { navigateTo, setReportType, setVoucherType, logout } = useApp();
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const menuItems: MenuItem[] = [
    {
      label: 'Create/Alter Masters',
      hotkey: 'M',
      description: 'Manage Ledgers, Groups, Stock items, and Units',
      action: () => navigateTo('masters')
    },
    {
      label: 'Accounting Vouchers',
      hotkey: 'V',
      description: 'Record Sales, Purchase, Receipts, Payments, and Journal entries',
      action: () => {
        setVoucherType('SALES');
        navigateTo('vouchers');
      }
    },
    {
      label: 'Trial Balance',
      hotkey: 'T',
      description: 'Check matching debit and credit ledger balances',
      action: () => {
        setReportType('trial');
        navigateTo('reports');
      }
    },
    {
      label: 'Profit & Loss A/c',
      hotkey: 'P',
      description: 'Review income, expense statements and net business profitability',
      action: () => {
        setReportType('pl');
        navigateTo('reports');
      }
    },
    {
      label: 'Balance Sheet',
      hotkey: 'B',
      description: 'Inspect assets, liabilities and reserves summaries',
      action: () => {
        setReportType('bs');
        navigateTo('reports');
      }
    },
    {
      label: 'Stock Summary',
      hotkey: 'S',
      description: 'Monitor item quantities, rates, and valuations',
      action: () => {
        setReportType('stock');
        navigateTo('reports');
      }
    },
    {
      label: 'GST Tax Register',
      hotkey: 'X',
      description: 'Verify GSTR CGST/SGST/IGST logs and taxes',
      action: () => {
        setReportType('gst');
        navigateTo('reports');
      }
    },
    {
      label: 'Change Company Selection',
      hotkey: 'C',
      description: 'Switch between active business companies (F1)',
      action: () => navigateTo('companies')
    },
    {
      label: 'Quit Application',
      hotkey: 'Q',
      description: 'Logout of the current session securely (Ctrl + Q)',
      action: () => logout()
    }
  ];

  const activeIndexRef = React.useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  const menuItemsRef = React.useRef(menuItems);
  menuItemsRef.current = menuItems;

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement)?.isContentEditable;

      if (isInputFocused) return;

      const items = menuItemsRef.current;
      const currentIdx = activeIndexRef.current;

      // Arrow navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        const next = (activeIndexRef.current + 1) % items.length;
        activeIndexRef.current = next;
        setActiveIndex(next);
        return;
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        const prev = (activeIndexRef.current - 1 + items.length) % items.length;
        activeIndexRef.current = prev;
        setActiveIndex(prev);
        return;
      }
      
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const cur = activeIndexRef.current;
        if (items[cur]) {
          items[cur].action();
        }
        return;
      }

      // Hotkey activation (case-insensitive single key)
      if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1) {
        const pressedChar = e.key.toUpperCase();
        const match = items.find(item => item.hotkey.toUpperCase() === pressedChar);
        if (match) {
          e.preventDefault();
          e.stopPropagation();
          match.action();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeys, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeys, { capture: true });
    };
  }, []);

  const renderLabel = (label: string, hotkey: string) => {
    const index = label.toUpperCase().indexOf(hotkey);
    if (index === -1) {
      return (
        <span>
          <span className="tally-hotkey">{hotkey}</span> - {label}
        </span>
      );
    }

    return (
      <span>
        {label.substring(0, index)}
        <span className="tally-hotkey">{label.charAt(index)}</span>
        {label.substring(index + 1)}
      </span>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-5xl mx-auto items-center justify-center min-h-[60vh] py-8">
      {/* Visual Tally-style side card */}
      <div className="w-full lg:w-1/3 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col justify-between h-[360px]">
        <div>
          <div className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-2">SmartERP Console</div>
          <h2 className="text-xl font-bold text-white mb-4">Gateway of SmartERP</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Welcome to the keyboard-first console. Navigate through modules using the{' '}
            <span className="text-emerald-400 font-semibold">Arrow Keys</span> &{' '}
            <span className="text-emerald-400 font-semibold">Enter</span>, or press the red{' '}
            <span className="text-red-400 font-semibold">Underlined Hotkeys</span> directly!
          </p>
        </div>
        <div className="border-t border-slate-800 pt-4 text-xs text-slate-500">
          Press <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">F4</span> for Calculator |{' '}
          <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">Ctrl+K</span> Search
        </div>
      </div>

      {/* Menu Options Box */}
      <div className="w-full lg:w-2/3 bg-slate-900 border-2 border-emerald-500/30 rounded-xl shadow-2xl overflow-hidden h-[360px] flex flex-col">
        <div className="bg-[#0f172a] px-6 py-3 border-b border-slate-800 flex justify-between items-center">
          <span className="text-sm font-bold text-slate-300 tracking-wider">GATEWAY MAIN MENU</span>
          <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-900 px-2 py-0.5 rounded font-mono font-bold">
            KEYBOARD COMM
          </span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
          {menuItems.map((item, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={item.label}
                onClick={item.action}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`w-full flex justify-between items-center px-6 py-3.5 text-left tally-menu-item focus:outline-none ${
                  isActive ? 'bg-slate-800/80 border-l-4 border-emerald-500 pl-5' : 'border-l-4 border-transparent'
                }`}
              >
                <div>
                  <div className={`text-sm ${isActive ? 'text-white font-semibold' : 'text-slate-300'}`}>
                    {renderLabel(item.label, item.hotkey)}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{item.description}</div>
                </div>
                <div
                  className={`text-xs font-mono px-2 py-0.5 rounded border ${
                    isActive
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                      : 'bg-slate-800/40 text-slate-500 border-slate-800'
                  }`}
                >
                  {item.hotkey}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
