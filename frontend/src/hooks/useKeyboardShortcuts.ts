'use client';

import { useEffect } from 'react';
import { useApp, ViewType, ReportType, VoucherType } from '../context/AppContext';

export const useKeyboardShortcuts = (
  onCommandPaletteToggle?: () => void,
  onFinancialYearToggle?: () => void
) => {
  const {
    currentView,
    activeCompany,
    navigateTo,
    goBack,
    logout,
    setReportType,
    setVoucherType,
    calculatorOpen,
    setCalculatorOpen,
    fetchMasters
  } = useApp();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      // --- ALWAYS ALLOWED SHORTS (Even when typing in inputs) ---

      // F4: Overlay Calculator Toggle
      if (e.key === 'F4') {
        e.preventDefault();
        setCalculatorOpen(!calculatorOpen);
        return;
      }

      // ESC: Previous View / Go Back
      if (e.key === 'Escape') {
        e.preventDefault();
        goBack();
        return;
      }

      // Ctrl + H: Home / Gateway of SmartERP
      if (e.ctrlKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        if (activeCompany) navigateTo('gateway');
        return;
      }

      // Ctrl + Q: Logout
      if (e.ctrlKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        logout();
        return;
      }

      // Ctrl + K: Command Search Palette
      if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (onCommandPaletteToggle) onCommandPaletteToggle();
        return;
      }

      // F1: Company Selection
      if (e.key === 'F1') {
        e.preventDefault();
        navigateTo('companies');
        return;
      }

      // F2: Change Financial Year
      if (e.key === 'F2') {
        e.preventDefault();
        if (onFinancialYearToggle) onFinancialYearToggle();
        return;
      }

      // F5: Refresh Master Data
      if (e.key === 'F5') {
        e.preventDefault();
        if (activeCompany) fetchMasters();
        return;
      }

      // F6 - F9: Voucher Navigation
      if (activeCompany) {
        if (e.key === 'F6') {
          e.preventDefault();
          setVoucherType('RECEIPT');
          navigateTo('vouchers');
          return;
        }
        if (e.key === 'F7') {
          e.preventDefault();
          setVoucherType('JOURNAL');
          navigateTo('vouchers');
          return;
        }
        if (e.key === 'F8') {
          e.preventDefault();
          setVoucherType('SALES');
          navigateTo('vouchers');
          return;
        }
        if (e.key === 'F9') {
          e.preventDefault();
          setVoucherType('PURCHASE');
          navigateTo('vouchers');
          return;
        }
      }

      // --- ALPHABETICAL SHORTCUTS (Ignored when typing in inputs) ---
      if (isInputFocused) return;

      // Alt + L: Create Ledger
      if (e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        if (activeCompany) {
          navigateTo('masters');
        }
        return;
      }

      // Alt + G: Create Group
      if (e.altKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (activeCompany) {
          navigateTo('masters');
        }
        return;
      }

      // Alt + S: Create Stock Item
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (activeCompany) {
          navigateTo('masters');
        }
        return;
      }

      // Alt + U: Unit Creation
      if (e.altKey && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        if (activeCompany) {
          navigateTo('masters');
        }
        return;
      }

      // Alt + F8: Credit Note
      if (e.altKey && e.key === 'F8') {
        e.preventDefault();
        if (activeCompany) {
          setVoucherType('CREDIT_NOTE');
          navigateTo('vouchers');
        }
        return;
      }

      // Alt + F9: Debit Note
      if (e.altKey && e.key === 'F9') {
        e.preventDefault();
        if (activeCompany) {
          setVoucherType('DEBIT_NOTE');
          navigateTo('vouchers');
        }
        return;
      }

      // Alt + B: Balance Sheet
      if (e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        if (activeCompany) {
          setReportType('bs');
          navigateTo('reports');
        }
        return;
      }

      // Alt + P: Profit & Loss
      if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (activeCompany) {
          setReportType('pl');
          navigateTo('reports');
        }
        return;
      }

      // Alt + T: Trial Balance
      if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        if (activeCompany) {
          setReportType('trial');
          navigateTo('reports');
        }
        return;
      }

      // Alt + R: Stock Summary
      if (e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        if (activeCompany) {
          setReportType('stock');
          navigateTo('reports');
        }
        return;
      }

      // Alt + X: GST Report
      if (e.altKey && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        if (activeCompany) {
          setReportType('gst');
          navigateTo('reports');
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentView, activeCompany, calculatorOpen, onCommandPaletteToggle, onFinancialYearToggle]);
};
