'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { useApp, ViewType, ReportType, VoucherType } from '../context/AppContext';

interface CommandItem {
  name: string;
  category: string;
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const { navigateTo, setReportType, setVoucherType, logout, activeCompany } = useApp();
  const [search, setSearch] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const paletteRef = useRef<HTMLDivElement>(null);

  const getCommands = (): CommandItem[] => {
    if (!activeCompany) {
      return [
        { name: 'Logout', category: 'System', action: () => logout(), shortcut: 'Ctrl + Q' },
        { name: 'Select Company', category: 'Navigation', action: () => navigateTo('companies'), shortcut: 'F1' }
      ];
    }

    return [
      { name: 'Gateway Dashboard', category: 'Navigation', action: () => navigateTo('gateway'), shortcut: 'Ctrl + H' },
      { name: 'Change Active Company', category: 'Navigation', action: () => navigateTo('companies'), shortcut: 'F1' },
      { name: 'Masters Creation Panel', category: 'Masters', action: () => navigateTo('masters'), shortcut: 'Alt + L' },
      { name: 'Record Sales Voucher', category: 'Vouchers', action: () => { setVoucherType('SALES'); navigateTo('vouchers'); }, shortcut: 'F8' },
      { name: 'Record Purchase Voucher', category: 'Vouchers', action: () => { setVoucherType('PURCHASE'); navigateTo('vouchers'); }, shortcut: 'F9' },
      { name: 'Record Contra Voucher', category: 'Vouchers', action: () => { setVoucherType('CONTRA'); navigateTo('vouchers'); } },
      { name: 'Record Payment Voucher', category: 'Vouchers', action: () => { setVoucherType('PAYMENT'); navigateTo('vouchers'); } },
      { name: 'Record Receipt Voucher', category: 'Vouchers', action: () => { setVoucherType('RECEIPT'); navigateTo('vouchers'); }, shortcut: 'F6' },
      { name: 'Record Journal Voucher', category: 'Vouchers', action: () => { setVoucherType('JOURNAL'); navigateTo('vouchers'); }, shortcut: 'F7' },
      { name: 'Record Credit Note', category: 'Vouchers', action: () => { setVoucherType('CREDIT_NOTE'); navigateTo('vouchers'); }, shortcut: 'Alt + F8' },
      { name: 'Record Debit Note', category: 'Vouchers', action: () => { setVoucherType('DEBIT_NOTE'); navigateTo('vouchers'); }, shortcut: 'Alt + F9' },
      { name: 'View Trial Balance', category: 'Reports', action: () => { setReportType('trial'); navigateTo('reports'); }, shortcut: 'Alt + T' },
      { name: 'View Profit & Loss Statement', category: 'Reports', action: () => { setReportType('pl'); navigateTo('reports'); }, shortcut: 'Alt + P' },
      { name: 'View Balance Sheet', category: 'Reports', action: () => { setReportType('bs'); navigateTo('reports'); }, shortcut: 'Alt + B' },
      { name: 'View Stock Summary', category: 'Reports', action: () => { setReportType('stock'); navigateTo('reports'); }, shortcut: 'Alt + R' },
      { name: 'View GST Tax Report', category: 'Reports', action: () => { setReportType('gst'); navigateTo('reports'); }, shortcut: 'Alt + X' },
      { name: 'System Logout', category: 'System', action: () => logout(), shortcut: 'Ctrl + Q' }
    ];
  };

  const filteredCommands = getCommands().filter(cmd =>
    cmd.name.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeys = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeys);
    return () => {
      window.removeEventListener('keydown', handleKeys);
    };
  }, [isOpen, selectedIndex, filteredCommands]);

  // Reset selected index on search change
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex justify-center items-start pt-20 animate-in fade-in duration-200">
      <div
        ref={paletteRef}
        className="w-full max-w-xl glassmorphism rounded-xl border border-slate-700 shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-200"
      >
        <div className="flex items-center px-4 border-b border-slate-800">
          <Search className="text-slate-400 mr-3" size={20} />
          <input
            autoFocus
            type="text"
            placeholder="Type a command or screen name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full py-4 bg-transparent border-0 text-white placeholder-slate-500 focus:outline-none focus:ring-0 text-sm"
          />
          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded">ESC</span>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">No commands found</div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isActive = idx === selectedIndex;
              return (
                <button
                  key={cmd.name}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  className={`w-full flex justify-between items-center px-4 py-3 rounded-lg text-left transition-all ${
                    isActive ? 'bg-emerald-500 text-slate-950 font-semibold' : 'text-slate-300 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center">
                    <span
                      className={`text-xs px-2 py-0.5 rounded mr-3 uppercase font-semibold ${
                        isActive ? 'bg-slate-950 text-emerald-400' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {cmd.category}
                    </span>
                    <span className="text-sm">{cmd.name}</span>
                  </div>
                  {cmd.shortcut && (
                    <span className={`text-xs ${isActive ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                      {cmd.shortcut}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
