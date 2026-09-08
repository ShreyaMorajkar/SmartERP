'use client';

import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { useApp, ReportType } from '../context/AppContext';
import { API_BASE, EXPORT_BASE } from '../config';

export const ReportsViewer: React.FC = () => {
  const { activeCompany, token, activeReport, setReportType } = useApp();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [vouchers, setVouchers] = useState<any[]>([]);

  const fetchReportData = async () => {
    if (!activeCompany || !token) return;
    setLoading(true);
    setError(null);
    setData(null);

    let url = '';
    
    if (activeReport === 'trial') url = `${API_BASE}/reports/trial-balance?companyId=${activeCompany.id}`;
    else if (activeReport === 'pl') url = `${API_BASE}/reports/profit-loss?companyId=${activeCompany.id}`;
    else if (activeReport === 'bs') url = `${API_BASE}/reports/balance-sheet?companyId=${activeCompany.id}`;
    else if (activeReport === 'stock') url = `${API_BASE}/reports/stock-summary?companyId=${activeCompany.id}`;
    else if (activeReport === 'gst') url = `${API_BASE}/reports/gst-register?companyId=${activeCompany.id}`;

    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const reportData = await res.json();
      if (!res.ok) throw new Error(reportData.error || 'Failed to fetch report');
      setData(reportData);

      // If GST, we also fetch previous vouchers to let them download PDF invoices
      if (activeReport === 'gst' || activeReport === 'trial') {
        const vRes = await fetch(`${API_BASE}/vouchers?companyId=${activeCompany.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const vData = await vRes.json();
        if (vRes.ok) {
          setVouchers(vData);
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [activeReport, activeCompany]);

  const handleExcelExport = () => {
    if (!activeCompany || !token) return;
    const reportTypeMap: Record<ReportType, string> = {
      trial: 'trial-balance',
      pl: 'profit-loss',
      bs: 'balance-sheet',
      stock: 'stock-summary',
      gst: 'gst-register'
    };
    const reportSlug = reportTypeMap[activeReport] || 'trial-balance';
    const url = `${EXPORT_BASE}/excel/report?companyId=${activeCompany.id}&reportType=${reportSlug}&token=${encodeURIComponent(token)}`;
    
    // Direct link click to prevent popup blocking
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.download = `${reportSlug}_${activeCompany.name}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePDFDownload = (voucherId: string) => {
    if (!token) return;
    const url = `${EXPORT_BASE}/pdf/invoice/${voucherId}?token=${encodeURIComponent(token)}`;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.download = `Invoice_${voucherId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-6xl mx-auto py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-wider">Reports & Statements</h1>
          <p className="text-xs text-slate-400">View real-time accounting books, inventory valuations, and tax summaries.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchReportData}
            className="p-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 rounded-lg transition"
            title="Refresh Report"
          >
            <RefreshCw size={16} />
          </button>
          
          <button
            onClick={handleExcelExport}
            className="flex items-center text-xs font-bold bg-[#107c41] text-white border border-[#0f6c38] px-4 py-2 rounded-lg hover:bg-[#0f6c38] transition"
          >
            <FileSpreadsheet size={16} className="mr-2" /> EXPORT TO EXCEL
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#0f172a] p-1 rounded-xl border border-slate-800 mb-6 max-w-xl">
        {([
          { t: 'trial', label: 'Trial Bal', s: 'Alt+T' },
          { t: 'pl', label: 'P & L', s: 'Alt+P' },
          { t: 'bs', label: 'Bal Sheet', s: 'Alt+B' },
          { t: 'stock', label: 'Stock Sum', s: 'Alt+R' },
          { t: 'gst', label: 'GST Reg', s: 'Alt+X' }
        ] as const).map(tab => (
          <button
            key={tab.t}
            onClick={() => setReportType(tab.t)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg uppercase tracking-wider transition ${
              activeReport === tab.t ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title={tab.s}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-12 text-slate-400 font-semibold">Loading report details...</div>}
      
      {error && (
        <div className="p-4 bg-red-950/40 border border-red-900 rounded-xl text-sm font-semibold text-red-400">
          {error}
        </div>
      )}

      {/* Reports Display Container */}
      {!loading && data && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
          <div className="text-center border-b border-slate-800 pb-4 mb-6">
            <h2 className="text-lg font-bold text-white uppercase tracking-widest">{activeCompany?.name}</h2>
            <div className="text-xs text-slate-400 font-semibold tracking-wider">
              FINANCIAL YEAR: {activeCompany?.financialYear} | STATEMENT TYPE: {activeReport.toUpperCase()}
            </div>
          </div>

          {/* 1. Trial Balance View */}
          {activeReport === 'trial' && (
            <div className="space-y-4">
              <table className="w-full border-collapse tally-table">
                <thead>
                  <tr>
                    <th className="text-left">Ledger Account</th>
                    <th className="text-left">Under Group</th>
                    <th className="text-right">Debit Balance (INR)</th>
                    <th className="text-right">Credit Balance (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ledgers?.map((l: any) => (
                    <tr key={l.ledgerId}>
                      <td className="text-white font-semibold">{l.ledgerName}</td>
                      <td>{l.groupName}</td>
                      <td className="text-right font-mono">{l.debit > 0 ? l.debit.toFixed(2) : '-'}</td>
                      <td className="text-right font-mono">{l.credit > 0 ? l.credit.toFixed(2) : '-'}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-700 bg-slate-950/60 font-bold">
                    <td colSpan={2} className="text-white uppercase tracking-wider">Grand Totals</td>
                    <td className="text-right font-mono text-emerald-400">{data.totalDebit?.toFixed(2)}</td>
                    <td className="text-right font-mono text-emerald-400">{data.totalCredit?.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* 2. Profit & Loss View */}
          {activeReport === 'pl' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Expenses Column */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest border-b border-slate-800 pb-2">Debit - Expenses</h3>
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-2">
                  {data.expenseLedgers?.length === 0 ? (
                    <div className="text-slate-500 text-sm italic">No expense ledger entries</div>
                  ) : (
                    data.expenseLedgers?.map((l: any) => (
                      <div key={l.id} className="flex justify-between items-center text-sm py-1">
                        <span className="text-slate-300">{l.name}</span>
                        <span className="font-mono text-white">{l.amount.toFixed(2)}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex justify-between items-center border-t border-slate-800 pt-3 font-bold">
                  <span className="text-slate-400">Total Expenses</span>
                  <span className="font-mono text-white">{data.totalExpense?.toFixed(2)}</span>
                </div>
              </div>

              {/* Incomes Column */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest border-b border-slate-800 pb-2">Credit - Incomes / Revenues</h3>
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-2">
                  {data.incomeLedgers?.length === 0 ? (
                    <div className="text-slate-500 text-sm italic">No income ledger entries</div>
                  ) : (
                    data.incomeLedgers?.map((l: any) => (
                      <div key={l.id} className="flex justify-between items-center text-sm py-1">
                        <span className="text-slate-300">{l.name}</span>
                        <span className="font-mono text-white">{l.amount.toFixed(2)}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex justify-between items-center border-t border-slate-800 pt-3 font-bold">
                  <span className="text-slate-400">Total Income</span>
                  <span className="font-mono text-white">{data.totalIncome?.toFixed(2)}</span>
                </div>
              </div>

              {/* Net Profit Surplus Indicator */}
              <div className="md:col-span-2 mt-4 bg-slate-950/60 p-4 border border-slate-800 rounded-xl flex justify-between items-center">
                <span className="font-bold uppercase tracking-wider text-slate-300">Net Business Profit / (Loss)</span>
                <span className={`text-xl font-bold font-mono ${data.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {data.netProfit?.toFixed(2)} INR
                </span>
              </div>
            </div>
          )}

          {/* 3. Balance Sheet View */}
          {activeReport === 'bs' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Liabilities Column */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest border-b border-slate-800 pb-2">Capital & Liabilities</h3>
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-2">
                  {data.liabilityLedgers?.map((l: any) => (
                    <div key={l.id} className="flex justify-between items-center text-sm py-1">
                      <span className="text-slate-300">{l.name}</span>
                      <span className="font-mono text-white">{l.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center border-t border-slate-800 pt-3 font-bold">
                  <span className="text-slate-400">Total Liabilities & Equity</span>
                  <span className="font-mono text-white">{data.totalLiabilities?.toFixed(2)}</span>
                </div>
              </div>

              {/* Assets Column */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest border-b border-slate-800 pb-2">Properties & Assets</h3>
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-2">
                  {data.assetLedgers?.map((l: any) => (
                    <div key={l.id} className="flex justify-between items-center text-sm py-1">
                      <span className="text-slate-300">{l.name}</span>
                      <span className="font-mono text-white">{l.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center border-t border-slate-800 pt-3 font-bold">
                  <span className="text-slate-400">Total Assets</span>
                  <span className="font-mono text-white">{data.totalAssets?.toFixed(2)}</span>
                </div>
              </div>

              {/* Balanced indicator */}
              <div className="md:col-span-2 mt-4 bg-slate-950/60 p-4 border border-slate-800 rounded-xl text-center">
                {data.isBalanced ? (
                  <span className="text-emerald-400 font-bold uppercase tracking-widest text-xs">Sheet is fully Balanced ✓</span>
                ) : (
                  <span className="text-red-400 font-bold uppercase tracking-widest text-xs">Out of balance delta mismatch! Check ledger records.</span>
                )}
              </div>
            </div>
          )}

          {/* 4. Stock Summary View */}
          {activeReport === 'stock' && (
            <div className="space-y-4">
              <table className="w-full border-collapse tally-table">
                <thead>
                  <tr>
                    <th className="text-left">Stock Item Name</th>
                    <th>SKU</th>
                    <th>Category Group</th>
                    <th className="text-right">Qty in Stock</th>
                    <th className="text-right">Unit</th>
                    <th className="text-right">Rate</th>
                    <th className="text-right">Inventory Valuation (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="text-white font-semibold">{item.name}</td>
                      <td className="text-center">{item.sku || '-'}</td>
                      <td className="text-center">{item.stockGroup}</td>
                      <td className="text-right font-mono">{item.currentQty}</td>
                      <td className="text-right">{item.unit}</td>
                      <td className="text-right font-mono">{item.purchaseRate.toFixed(2)}</td>
                      <td className="text-right font-mono text-emerald-400">{item.valuation.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-700 bg-slate-950/60 font-bold">
                    <td colSpan={6} className="text-white uppercase tracking-wider">Total Stock Inventory Value</td>
                    <td className="text-right font-mono text-emerald-400">{data.totalValuation?.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* 5. GST Register View */}
          {activeReport === 'gst' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-950/60 p-4 border border-slate-800 rounded-xl font-mono text-xs">
                <div>Taxable Value: <span className="text-white font-bold">{data.totalTaxable?.toFixed(2)}</span></div>
                <div>CGST Total: <span className="text-white font-bold">{data.totalCGST?.toFixed(2)}</span></div>
                <div>SGST Total: <span className="text-white font-bold">{data.totalSGST?.toFixed(2)}</span></div>
                <div>IGST Total: <span className="text-white font-bold">{data.totalIGST?.toFixed(2)}</span></div>
              </div>

              <table className="w-full border-collapse tally-table">
                <thead>
                  <tr>
                    <th className="text-left">Voucher No</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th className="text-left">Party Name</th>
                    <th className="text-right">Taxable</th>
                    <th className="text-right">GST %</th>
                    <th className="text-right">CGST</th>
                    <th className="text-right">SGST</th>
                    <th className="text-right">IGST</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.registers?.map((reg: any) => (
                    <tr key={reg.voucherId}>
                      <td className="text-white font-semibold">{reg.voucherNo}</td>
                      <td className="text-center text-xs uppercase">{reg.type}</td>
                      <td className="text-center text-xs">{new Date(reg.date).toLocaleDateString()}</td>
                      <td>{reg.partyName}</td>
                      <td className="text-right font-mono">{reg.taxableAmount.toFixed(2)}</td>
                      <td className="text-right font-mono">{reg.gstRate}%</td>
                      <td className="text-right font-mono">{reg.cgst > 0 ? reg.cgst.toFixed(2) : '-'}</td>
                      <td className="text-right font-mono">{reg.sgst > 0 ? reg.sgst.toFixed(2) : '-'}</td>
                      <td className="text-right font-mono">{reg.igst > 0 ? reg.igst.toFixed(2) : '-'}</td>
                      <td className="text-center">
                        {reg.type === 'SALES' && (
                          <button
                            onClick={() => handlePDFDownload(reg.voucherId)}
                            className="inline-flex items-center text-[10px] font-bold bg-slate-800 text-emerald-400 border border-slate-700 px-2 py-0.5 rounded hover:bg-slate-700"
                          >
                            <Download size={10} className="mr-1" /> PDF INVOICE
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
