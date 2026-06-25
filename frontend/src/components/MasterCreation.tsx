'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { API_BASE } from '../config';

export const MasterCreation: React.FC = () => {
  const {
    activeCompany,
    token,
    ledgers,
    groups,
    stockItems,
    units,
    stockGroups,
    fetchMasters
  } = useApp();

  const [activeTab, setActiveTab] = useState<'ledger' | 'group' | 'stockItem' | 'unit' | 'stockGroup'>('ledger');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [ledgerForm, setLedgerForm] = useState({
    name: '',
    groupId: '',
    openingBalance: '0',
    mobile: '',
    address: '',
    gstin: ''
  });

  const [groupForm, setGroupForm] = useState({
    name: '',
    type: 'ASSET'
  });

  const [stockItemForm, setStockItemForm] = useState({
    name: '',
    sku: '',
    purchaseRate: '0',
    sellingRate: '0',
    openingQty: '0',
    gstPercentage: '18',
    hsnCode: '',
    unitId: '',
    stockGroupId: ''
  });

  const [unitForm, setUnitForm] = useState({
    name: ''
  });

  const [stockGroupForm, setStockGroupForm] = useState({
    name: ''
  });

  // Load defaults
  useEffect(() => {
    if (groups.length > 0 && !ledgerForm.groupId) {
      setLedgerForm(prev => ({ ...prev, groupId: groups[0].id }));
    }
  }, [groups]);

  useEffect(() => {
    if (units.length > 0 && !stockItemForm.unitId) {
      setStockItemForm(prev => ({ ...prev, unitId: units[0].id }));
    }
    if (stockGroups.length > 0 && !stockItemForm.stockGroupId) {
      setStockItemForm(prev => ({ ...prev, stockGroupId: stockGroups[0].id }));
    }
  }, [units, stockGroups]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    let url = '';
    let body: any = {};

    try {
      if (activeTab === 'ledger') {
        url = `${API_BASE}/masters/ledgers`;
        body = { ...ledgerForm, companyId: activeCompany.id };
      } else if (activeTab === 'group') {
        url = `${API_BASE}/masters/groups`;
        body = { ...groupForm, companyId: activeCompany.id };
      } else if (activeTab === 'stockItem') {
        url = `${API_BASE}/masters/stock-items`;
        body = { ...stockItemForm, companyId: activeCompany.id };
      } else if (activeTab === 'unit') {
        url = `${API_BASE}/masters/units`;
        body = { ...unitForm, companyId: activeCompany.id };
      } else if (activeTab === 'stockGroup') {
        url = `${API_BASE}/masters/stock-groups`;
        body = { ...stockGroupForm, companyId: activeCompany.id };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save master record');
      }

      setMessage({ type: 'success', text: `${activeTab.toUpperCase()} created successfully!` });
      
      // Reset forms
      if (activeTab === 'ledger') setLedgerForm({ name: '', groupId: groups[0]?.id || '', openingBalance: '0', mobile: '', address: '', gstin: '' });
      if (activeTab === 'group') setGroupForm({ name: '', type: 'ASSET' });
      if (activeTab === 'stockItem') setStockItemForm({ name: '', sku: '', purchaseRate: '0', sellingRate: '0', openingQty: '0', gstPercentage: '18', hsnCode: '', unitId: units[0]?.id || '', stockGroupId: stockGroups[0]?.id || '' });
      if (activeTab === 'unit') setUnitForm({ name: '' });
      if (activeTab === 'stockGroup') setStockGroupForm({ name: '' });

      fetchMasters();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const deleteMaster = async (type: string, id: string) => {
    if (!confirm('Are you sure you want to delete this master?')) return;
    try {
      const res = await fetch(`${API_BASE}/masters/${type}s/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Master deleted successfully' });
        fetchMasters();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to delete' });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Masters Creation & Alteration</h1>
          <p className="text-xs text-slate-400">Add ledgers, accounting groups, inventory items, and measurement units.</p>
        </div>
        <div className="bg-[#0f172a] px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-400">
          Alt+L (Ledgers) | Alt+S (Stock Items) | Alt+G (Groups) | Alt+U (Units)
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

      {/* Tabs */}
      <div className="flex bg-[#0f172a] p-1 rounded-xl border border-slate-800 mb-6 max-w-lg">
        {(['ledger', 'group', 'stockItem', 'unit', 'stockGroup'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setMessage(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg uppercase tracking-wider transition ${
              activeTab === tab ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab === 'stockItem' ? 'Stock Item' : tab === 'stockGroup' ? 'Stock Group' : tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form Column */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4 uppercase tracking-wider">Create New {activeTab}</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'ledger' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Ledger Name</label>
                  <input
                    type="text"
                    required
                    value={ledgerForm.name}
                    onChange={e => setLedgerForm({ ...ledgerForm, name: e.target.value })}
                    className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Acme Sales Corp"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Under Group</label>
                  <select
                    value={ledgerForm.groupId}
                    onChange={e => setLedgerForm({ ...ledgerForm, groupId: e.target.value })}
                    className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name} ({g.type})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Opening Balance (INR)</label>
                  <input
                    type="number"
                    value={ledgerForm.openingBalance}
                    onChange={e => setLedgerForm({ ...ledgerForm, openingBalance: e.target.value })}
                    className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mobile Number</label>
                    <input
                      type="text"
                      value={ledgerForm.mobile}
                      onChange={e => setLedgerForm({ ...ledgerForm, mobile: e.target.value })}
                      className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      placeholder="e.g. 9876543210"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">GSTIN</label>
                    <input
                      type="text"
                      value={ledgerForm.gstin}
                      onChange={e => setLedgerForm({ ...ledgerForm, gstin: e.target.value })}
                      className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      placeholder="e.g. 27AAAAA1111A1Z1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Address</label>
                  <textarea
                    value={ledgerForm.address}
                    onChange={e => setLedgerForm({ ...ledgerForm, address: e.target.value })}
                    className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 h-20"
                    placeholder="Ledger physical address"
                  />
                </div>
              </>
            )}

            {activeTab === 'group' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Group Name</label>
                  <input
                    type="text"
                    required
                    value={groupForm.name}
                    onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
                    className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Indirect Incomes"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Group Type</label>
                  <select
                    value={groupForm.type}
                    onChange={e => setGroupForm({ ...groupForm, type: e.target.value })}
                    className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ASSET">ASSET</option>
                    <option value="LIABILITY">LIABILITY</option>
                    <option value="INCOME">INCOME</option>
                    <option value="EXPENSE">EXPENSE</option>
                  </select>
                </div>
              </>
            )}

            {activeTab === 'stockItem' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Stock Item Name</label>
                  <input
                    type="text"
                    required
                    value={stockItemForm.name}
                    onChange={e => setStockItemForm({ ...stockItemForm, name: e.target.value })}
                    className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. Wireless Mouse"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">SKU / Code</label>
                    <input
                      type="text"
                      value={stockItemForm.sku}
                      onChange={e => setStockItemForm({ ...stockItemForm, sku: e.target.value })}
                      className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      placeholder="MOU-001"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">HSN Code</label>
                    <input
                      type="text"
                      value={stockItemForm.hsnCode}
                      onChange={e => setStockItemForm({ ...stockItemForm, hsnCode: e.target.value })}
                      className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      placeholder="84713010"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Purchase Rate</label>
                    <input
                      type="number"
                      value={stockItemForm.purchaseRate}
                      onChange={e => setStockItemForm({ ...stockItemForm, purchaseRate: e.target.value })}
                      className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Selling Rate</label>
                    <input
                      type="number"
                      value={stockItemForm.sellingRate}
                      onChange={e => setStockItemForm({ ...stockItemForm, sellingRate: e.target.value })}
                      className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">GST %</label>
                    <input
                      type="number"
                      value={stockItemForm.gstPercentage}
                      onChange={e => setStockItemForm({ ...stockItemForm, gstPercentage: e.target.value })}
                      className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Stock Group</label>
                    <select
                      value={stockItemForm.stockGroupId}
                      onChange={e => setStockItemForm({ ...stockItemForm, stockGroupId: e.target.value })}
                      className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      {stockGroups.map(sg => (
                        <option key={sg.id} value={sg.id}>{sg.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Measurement Unit</label>
                    <select
                      value={stockItemForm.unitId}
                      onChange={e => setStockItemForm({ ...stockItemForm, unitId: e.target.value })}
                      className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      {units.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Opening Quantity</label>
                  <input
                    type="number"
                    value={stockItemForm.openingQty}
                    onChange={e => setStockItemForm({ ...stockItemForm, openingQty: e.target.value })}
                    className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </>
            )}

            {activeTab === 'unit' && (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Unit Name</label>
                <input
                  type="text"
                  required
                  value={unitForm.name}
                  onChange={e => setUnitForm({ name: e.target.value })}
                  className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. PCS, KG, BOX"
                />
              </div>
            )}

            {activeTab === 'stockGroup' && (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Stock Group Name</label>
                <input
                  type="text"
                  required
                  value={stockGroupForm.name}
                  onChange={e => setStockGroupForm({ name: e.target.value })}
                  className="w-full bg-[#0b1329] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. Electronics, Groceries"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 text-slate-950 font-bold py-2.5 rounded-lg hover:bg-emerald-400 transition"
            >
              {loading ? 'Saving...' : 'SUBMIT RECORD'}
            </button>
          </form>
        </div>

        {/* Existing Records Column */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col h-[520px]">
          <h2 className="text-lg font-bold text-white mb-4 uppercase tracking-wider">Active {activeTab}s</h2>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {activeTab === 'ledger' && ledgers.map(l => (
              <div key={l.id} className="flex justify-between items-center p-3 bg-[#0b1329] border border-slate-800 rounded-lg">
                <div>
                  <div className="text-sm font-semibold text-white">{l.name}</div>
                  <div className="text-xs text-slate-500">Group: {l.group.name} | Bal: {l.currentBalance.toFixed(2)} INR</div>
                </div>
                <button
                  onClick={() => deleteMaster('ledger', l.id)}
                  className="text-xs text-red-400 hover:text-red-300 font-semibold uppercase tracking-wider"
                >
                  Delete
                </button>
              </div>
            ))}

            {activeTab === 'group' && groups.map(g => (
              <div key={g.id} className="flex justify-between items-center p-3 bg-[#0b1329] border border-slate-800 rounded-lg">
                <div>
                  <div className="text-sm font-semibold text-white">{g.name}</div>
                  <div className="text-xs text-slate-500">Type: {g.type}</div>
                </div>
              </div>
            ))}

            {activeTab === 'stockItem' && stockItems.map(item => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-[#0b1329] border border-slate-800 rounded-lg">
                <div>
                  <div className="text-sm font-semibold text-white">{item.name} {item.sku && `(${item.sku})`}</div>
                  <div className="text-xs text-slate-500">
                    Stock: {item.currentQty} {item.unit.name} | Rate: {item.purchaseRate.toFixed(2)} INR
                  </div>
                </div>
                <button
                  onClick={() => deleteMaster('stock-item', item.id)}
                  className="text-xs text-red-400 hover:text-red-300 font-semibold uppercase tracking-wider"
                >
                  Delete
                </button>
              </div>
            ))}

            {activeTab === 'unit' && units.map(u => (
              <div key={u.id} className="flex justify-between items-center p-3 bg-[#0b1329] border border-slate-800 rounded-lg">
                <span className="text-sm font-semibold text-white">{u.name}</span>
                <button
                  onClick={() => deleteMaster('unit', u.id)}
                  className="text-xs text-red-400 hover:text-red-300 font-semibold uppercase tracking-wider"
                >
                  Delete
                </button>
              </div>
            ))}

            {activeTab === 'stockGroup' && stockGroups.map(sg => (
              <div key={sg.id} className="flex justify-between items-center p-3 bg-[#0b1329] border border-slate-800 rounded-lg">
                <span className="text-sm font-semibold text-white">{sg.name}</span>
                <button
                  onClick={() => deleteMaster('stock-group', sg.id)}
                  className="text-xs text-red-400 hover:text-red-300 font-semibold uppercase tracking-wider"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
