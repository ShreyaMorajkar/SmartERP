'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash, FileText } from 'lucide-react';
import { useApp, VoucherType } from '../context/AppContext';
import { API_BASE } from '../config';

export const VoucherEntry: React.FC = () => {
  const {
    activeCompany,
    activeVoucherType,
    setVoucherType,
    ledgers,
    stockItems,
    token,
    fetchMasters
  } = useApp();

  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Voucher header fields
  const [voucherNo, setVoucherNo] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [narration, setNarration] = useState<string>('');
  const [partyLedgerId, setPartyLedgerId] = useState<string>('');
  const [gstRate, setGstRate] = useState<string>('18');
  const [partyState, setPartyState] = useState<string>(activeCompany?.state || '');

  // Grid rows
  const [entries, setEntries] = useState<Array<{ ledgerId: string; debitAmount: string; creditAmount: string }>>([
    { ledgerId: '', debitAmount: '0', creditAmount: '0' },
    { ledgerId: '', debitAmount: '0', creditAmount: '0' }
  ]);

  const [inventoryEntries, setInventoryEntries] = useState<Array<{ stockItemId: string; qty: string; rate: string; amount: string }>>([]);

  // Auto-generate voucher number on mount / type change
  useEffect(() => {
    const prefix = activeVoucherType.substring(0, 3).toUpperCase();
    const rand = Math.floor(1000 + Math.random() * 9000);
    setVoucherNo(`${prefix}-${rand}`);
    setMessage(null);

    // Initialize fields based on voucher type
    if (['SALES', 'PURCHASE', 'CREDIT_NOTE', 'DEBIT_NOTE'].includes(activeVoucherType)) {
      if (inventoryEntries.length === 0) {
        setInventoryEntries([{ stockItemId: '', qty: '1', rate: '0', amount: '0' }]);
      }
      // Auto-assign primary party ledger if available
      const customerLedger = ledgers.find(l => l.group.type === 'ASSET' && l.name !== 'Cash' && l.name !== 'Bank');
      const supplierLedger = ledgers.find(l => l.group.type === 'LIABILITY' && l.name !== 'Cash' && l.name !== 'Bank');
      
      if (activeVoucherType === 'SALES' && customerLedger) setPartyLedgerId(customerLedger.id);
      else if (activeVoucherType === 'PURCHASE' && supplierLedger) setPartyLedgerId(supplierLedger.id);
      else if (ledgers.length > 0) setPartyLedgerId(ledgers[0].id);
    } else {
      setInventoryEntries([]);
      setPartyLedgerId('');
    }
  }, [activeVoucherType, ledgers]);

  // Set default ledgers in grids
  useEffect(() => {
    if (ledgers.length > 0) {
      setEntries(prev =>
        prev.map(entry => (entry.ledgerId ? entry : { ...entry, ledgerId: ledgers[0].id }))
      );
    }
  }, [ledgers]);

  // Handle inventory rate auto-populating
  const handleItemChange = (index: number, itemId: string) => {
    const item = stockItems.find(i => i.id === itemId);
    if (!item) return;

    const rate = activeVoucherType === 'SALES' ? item.sellingRate : item.purchaseRate;
    const qty = parseFloat(inventoryEntries[index].qty) || 0;
    const amount = qty * rate;

    const updated = [...inventoryEntries];
    updated[index] = {
      stockItemId: itemId,
      qty: String(qty),
      rate: String(rate),
      amount: String(amount)
    };
    setInventoryEntries(updated);
    recalculateJournalFromInventory(updated);
  };

  const handleQtyRateChange = (index: number, field: 'qty' | 'rate', val: string) => {
    const updated = [...inventoryEntries];
    const entry = updated[index];
    const qty = field === 'qty' ? parseFloat(val) || 0 : parseFloat(entry.qty) || 0;
    const rate = field === 'rate' ? parseFloat(val) || 0 : parseFloat(entry.rate) || 0;
    
    updated[index] = {
      ...entry,
      [field]: val,
      amount: String(qty * rate)
    };
    setInventoryEntries(updated);
    recalculateJournalFromInventory(updated);
  };

  // Sync double-entry ledgers matching the inventory total + GST
  const recalculateJournalFromInventory = (invEntries: typeof inventoryEntries) => {
    if (!['SALES', 'PURCHASE', 'CREDIT_NOTE', 'DEBIT_NOTE'].includes(activeVoucherType)) return;

    let baseTotal = 0;
    invEntries.forEach(i => {
      baseTotal += parseFloat(i.amount) || 0;
    });

    const taxPercent = parseFloat(gstRate) || 0;
    const taxTotal = baseTotal * (taxPercent / 100);
    const invoiceGrandTotal = baseTotal + taxTotal;

    // We can auto-set the double entry row allocations:
    // Sales: Dr Customer (Grand Total) / Cr Sales Account (Base Total) & Cr GST Account (Tax)
    // Purchase: Cr Supplier (Grand Total) / Dr Purchase Account (Base Total) & Dr GST Account (Tax)
    const isSales = activeVoucherType === 'SALES' || activeVoucherType === 'CREDIT_NOTE';
    
    // Find Sales/Purchase Ledgers
    const salesLedger = ledgers.find(l => l.name.toLowerCase().includes('sale'));
    const purchaseLedger = ledgers.find(l => l.name.toLowerCase().includes('purchase'));
    const defaultSecLedger = salesLedger || purchaseLedger || ledgers[0];

    const partyId = partyLedgerId || ledgers[0]?.id;

    if (isSales) {
      // Dr Customer / Party, Cr Sales (Base), Cr CGST/SGST/IGST
      setEntries([
        { ledgerId: partyId, debitAmount: String(invoiceGrandTotal), creditAmount: '0' },
        { ledgerId: defaultSecLedger?.id || '', debitAmount: '0', creditAmount: String(invoiceGrandTotal) }
      ]);
    } else {
      // Dr Purchase, Cr Supplier / Party
      setEntries([
        { ledgerId: defaultSecLedger?.id || '', debitAmount: String(invoiceGrandTotal), creditAmount: '0' },
        { ledgerId: partyId, debitAmount: '0', creditAmount: String(invoiceGrandTotal) }
      ]);
    }
  };

  const calculateTotals = () => {
    let debits = 0;
    let credits = 0;
    entries.forEach(e => {
      debits += parseFloat(e.debitAmount) || 0;
      credits += parseFloat(e.creditAmount) || 0;
    });
    return { debits, credits, difference: Math.abs(debits - credits) };
  };

  const { debits, credits, difference } = calculateTotals();

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (difference > 0.01) {
      setMessage({ type: 'error', text: 'Voucher does not balance! Debits must equal Credits.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const baseAmount = ['SALES', 'PURCHASE', 'CREDIT_NOTE', 'DEBIT_NOTE'].includes(activeVoucherType)
      ? inventoryEntries.reduce((acc, i) => acc + (parseFloat(i.amount) || 0), 0)
      : debits;

    try {
      const res = await fetch(`${API_BASE}/vouchers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          type: activeVoucherType,
          date,
          voucherNo,
          narration,
          totalAmount: baseAmount,
          partyLedgerId: partyLedgerId || null,
          gstRate: ['SALES', 'PURCHASE', 'CREDIT_NOTE', 'DEBIT_NOTE'].includes(activeVoucherType) ? gstRate : null,
          partyState,
          entries,
          inventoryEntries
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit voucher');
      }

      setMessage({ type: 'success', text: `Voucher ${data.voucherNo} recorded successfully!` });
      
      // Reset entries
      setEntries([
        { ledgerId: ledgers[0]?.id || '', debitAmount: '0', creditAmount: '0' },
        { ledgerId: ledgers[0]?.id || '', debitAmount: '0', creditAmount: '0' }
      ]);
      setInventoryEntries([]);
      setNarration('');
      
      const prefix = activeVoucherType.substring(0, 3).toUpperCase();
      setVoucherNo(`${prefix}-${Math.floor(1000 + Math.random() * 9000)}`);
      
      fetchMasters();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center">
            <FileText className="text-emerald-400 mr-2" />
            Transaction Voucher Entry
          </h1>
          <p className="text-xs text-slate-400">Record journal debits, credits, and stock inventory movements.</p>
        </div>

        {/* Shortcut Vouchers Bar */}
        <div className="flex bg-[#0f172a] p-1 rounded-lg border border-slate-800 gap-1">
          {([
            { t: 'SALES', s: 'F8' },
            { t: 'PURCHASE', s: 'F9' },
            { t: 'RECEIPT', s: 'F6' },
            { t: 'PAYMENT', s: 'Payment' },
            { t: 'JOURNAL', s: 'F7' },
            { t: 'CONTRA', s: 'Contra' }
          ] as const).map(item => (
            <button
              key={item.t}
              onClick={() => setVoucherType(item.t)}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition ${
                activeVoucherType === item.t
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {item.t} ({item.s})
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div
          className={`p-4 mb-4 rounded-lg text-sm font-semibold border ${
            message.type === 'success' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900' : 'bg-red-950/40 text-red-400 border-red-900'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* Voucher Header Metadata */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Voucher Type</label>
            <div className="bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-emerald-400 font-bold uppercase">
              {activeVoucherType}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Voucher Number</label>
            <input
              type="text"
              required
              value={voucherNo}
              onChange={e => setVoucherNo(e.target.value)}
              className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Voucher Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Party selection for items */}
          {['SALES', 'PURCHASE', 'CREDIT_NOTE', 'DEBIT_NOTE'].includes(activeVoucherType) && (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Party Ledger (Party/Account)</label>
              <select
                value={partyLedgerId}
                onChange={e => {
                  setPartyLedgerId(e.target.value);
                  const selectedLedger = ledgers.find(l => l.id === e.target.value);
                  if (selectedLedger) {
                    setPartyState(selectedLedger.address || activeCompany?.state || '');
                  }
                }}
                className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Select Party Account --</option>
                {ledgers.map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.group.name})</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* GST Settings for items */}
        {['SALES', 'PURCHASE', 'CREDIT_NOTE', 'DEBIT_NOTE'].includes(activeVoucherType) && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">GST Rate (%)</label>
              <select
                value={gstRate}
                onChange={e => {
                  setGstRate(e.target.value);
                  recalculateJournalFromInventory(inventoryEntries);
                }}
                className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="0">Exempt (0%)</option>
                <option value="5">GST 5%</option>
                <option value="12">GST 12%</option>
                <option value="18">GST 18%</option>
                <option value="28">GST 28%</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Billing State (for CGST/SGST vs IGST)</label>
              <input
                type="text"
                value={partyState}
                onChange={e => {
                  setPartyState(e.target.value);
                  recalculateJournalFromInventory(inventoryEntries);
                }}
                className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                placeholder="State Name (e.g. Maharashtra)"
              />
            </div>
          </div>
        )}

        {/* Inventory Allocation Section */}
        {['SALES', 'PURCHASE', 'CREDIT_NOTE', 'DEBIT_NOTE'].includes(activeVoucherType) && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-md font-bold text-white uppercase tracking-wider">Inventory Allocation</h2>
              <button
                type="button"
                onClick={() => setInventoryEntries([...inventoryEntries, { stockItemId: '', qty: '1', rate: '0', amount: '0' }])}
                className="flex items-center text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                <Plus size={14} className="mr-1" /> ADD ITEM LINE
              </button>
            </div>

            <table className="w-full text-left border-collapse tally-table">
              <thead>
                <tr>
                  <th>Stock Item</th>
                  <th>Quantity</th>
                  <th>Rate (INR)</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {inventoryEntries.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <select
                        value={item.stockItemId}
                        onChange={e => handleItemChange(idx, e.target.value)}
                        className="bg-[#0b1329] border border-slate-800 rounded px-2 py-1 text-sm text-white w-full focus:outline-none"
                      >
                        <option value="">-- Select Item --</option>
                        {stockItems.map(i => (
                          <option key={i.id} value={i.id}>
                            {i.name} (SKU: {i.sku || 'N/A'}, Qty: {i.currentQty})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={item.qty}
                        onChange={e => handleQtyRateChange(idx, 'qty', e.target.value)}
                        className="bg-[#0b1329] border border-slate-800 rounded px-2 py-1 text-sm text-white w-24 text-right focus:outline-none"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.rate}
                        onChange={e => handleQtyRateChange(idx, 'rate', e.target.value)}
                        className="bg-[#0b1329] border border-slate-800 rounded px-2 py-1 text-sm text-white w-28 text-right focus:outline-none"
                      />
                    </td>
                    <td className="text-right pr-4 text-emerald-400 font-semibold font-mono">
                      {parseFloat(item.amount).toFixed(2)}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = inventoryEntries.filter((_, i) => i !== idx);
                          setInventoryEntries(updated);
                          recalculateJournalFromInventory(updated);
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Double Entry Accounts Ledgers Allocation Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-md font-bold text-white uppercase tracking-wider">Accounts ledger Allocations</h2>
            {!['SALES', 'PURCHASE', 'CREDIT_NOTE', 'DEBIT_NOTE'].includes(activeVoucherType) && (
              <button
                type="button"
                onClick={() => setEntries([...entries, { ledgerId: ledgers[0]?.id || '', debitAmount: '0', creditAmount: '0' }])}
                className="flex items-center text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                <Plus size={14} className="mr-1" /> ADD ACCOUNT LINE
              </button>
            )}
          </div>

          <table className="w-full text-left border-collapse tally-table">
            <thead>
              <tr>
                <th>Ledger Account</th>
                <th className="text-right">Debit (INR)</th>
                <th className="text-right">Credit (INR)</th>
                {!['SALES', 'PURCHASE', 'CREDIT_NOTE', 'DEBIT_NOTE'].includes(activeVoucherType) && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => (
                <tr key={idx}>
                  <td>
                    <select
                      value={entry.ledgerId}
                      disabled={['SALES', 'PURCHASE', 'CREDIT_NOTE', 'DEBIT_NOTE'].includes(activeVoucherType)}
                      onChange={e => {
                        const updated = [...entries];
                        updated[idx].ledgerId = e.target.value;
                        setEntries(updated);
                      }}
                      className="bg-[#0b1329] border border-slate-800 rounded px-2 py-1 text-sm text-white w-full focus:outline-none"
                    >
                      {ledgers.map(l => (
                        <option key={l.id} value={l.id}>{l.name} ({l.group.name})</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      disabled={['SALES', 'PURCHASE', 'CREDIT_NOTE', 'DEBIT_NOTE'].includes(activeVoucherType)}
                      value={entry.debitAmount}
                      onChange={e => {
                        const updated = [...entries];
                        updated[idx].debitAmount = e.target.value;
                        setEntries(updated);
                      }}
                      className="bg-[#0b1329] border border-slate-800 rounded px-2 py-1 text-sm text-white w-full text-right focus:outline-none"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      disabled={['SALES', 'PURCHASE', 'CREDIT_NOTE', 'DEBIT_NOTE'].includes(activeVoucherType)}
                      value={entry.creditAmount}
                      onChange={e => {
                        const updated = [...entries];
                        updated[idx].creditAmount = e.target.value;
                        setEntries(updated);
                      }}
                      className="bg-[#0b1329] border border-slate-800 rounded px-2 py-1 text-sm text-white w-full text-right focus:outline-none"
                    />
                  </td>
                  {!['SALES', 'PURCHASE', 'CREDIT_NOTE', 'DEBIT_NOTE'].includes(activeVoucherType) && (
                    <td>
                      <button
                        type="button"
                        onClick={() => setEntries(entries.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Double entry summary calculation totals */}
          <div className="mt-4 flex flex-col md:flex-row justify-between items-center bg-[#0b1329] border border-slate-800 rounded-lg p-4 font-mono text-sm">
            <div className="flex gap-4">
              <div>Total Debits: <span className="text-white font-bold">{debits.toFixed(2)}</span></div>
              <div>Total Credits: <span className="text-white font-bold">{credits.toFixed(2)}</span></div>
            </div>
            <div>
              {difference > 0.01 ? (
                <span className="text-red-400 font-semibold animate-pulse">Out of Balance: {difference.toFixed(2)} INR</span>
              ) : (
                <span className="text-emerald-400 font-bold">Balanced ✓</span>
              )}
            </div>
          </div>
        </div>

        {/* Voucher Narration Block */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Narration / Notes</label>
            <textarea
              value={narration}
              onChange={e => setNarration(e.target.value)}
              className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 h-20"
              placeholder="Record narration of this transaction..."
            />
          </div>

          <button
            type="submit"
            disabled={loading || difference > 0.01}
            className="w-full bg-emerald-500 text-slate-950 font-bold py-3 rounded-lg hover:bg-emerald-400 transition disabled:bg-slate-800 disabled:text-slate-500"
          >
            {loading ? 'Submitting Voucher...' : 'SUBMIT TRANSACTION VOUCHER'}
          </button>
        </div>
      </form>
    </div>
  );
};
