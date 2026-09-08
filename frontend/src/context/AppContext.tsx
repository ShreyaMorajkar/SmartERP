'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type ViewType = 'auth' | 'companies' | 'gateway' | 'vouchers' | 'reports' | 'masters' | 'audit';
export type ReportType = 'trial' | 'pl' | 'bs' | 'stock' | 'gst';
export type VoucherType = 'SALES' | 'PURCHASE' | 'CONTRA' | 'PAYMENT' | 'RECEIPT' | 'JOURNAL' | 'CREDIT_NOTE' | 'DEBIT_NOTE';

interface AppContextProps {
  user: any;
  token: string | null;
  companies: any[];
  activeCompany: any;
  currentView: ViewType;
  viewStack: ViewType[];
  activeReport: ReportType;
  activeVoucherType: VoucherType;
  ledgers: any[];
  groups: any[];
  stockItems: any[];
  units: any[];
  stockGroups: any[];
  loading: boolean;
  calculatorOpen: boolean;
  setCalculatorOpen: (open: boolean) => void;
  login: (userData: any, jwtToken: string) => void;
  logout: () => void;
  fetchCompanies: () => Promise<void>;
  selectCompany: (company: any) => void;
  navigateTo: (view: ViewType) => void;
  goBack: () => void;
  setReportType: (report: ReportType) => void;
  setVoucherType: (type: VoucherType) => void;
  fetchMasters: () => Promise<void>;
}

import { API_BASE } from '../config';

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [activeCompany, setActiveCompany] = useState<any>(null);
  const [currentView, setCurrentView] = useState<ViewType>('auth');
  const [viewStack, setViewStack] = useState<ViewType[]>([]);
  const [activeReport, setReportType] = useState<ReportType>('trial');
  const [activeVoucherType, setVoucherType] = useState<VoucherType>('SALES');
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [stockGroups, setStockGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [calculatorOpen, setCalculatorOpen] = useState<boolean>(false);

  // Sync token, user profile, and active company on mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      const storedCompany = localStorage.getItem('activeCompany');
      if (storedToken && storedUser && storedUser !== 'undefined') {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        if (storedCompany && storedCompany !== 'undefined') {
          const parsedComp = JSON.parse(storedCompany);
          setActiveCompany(parsedComp);
          setCurrentView('gateway');
        } else {
          setCurrentView('companies');
        }
      }
    } catch (e) {
      console.error('Failed to parse stored auth from localStorage', e);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('activeCompany');
    }
  }, []);

  const login = (userData: any, jwtToken: string) => {
    localStorage.setItem('token', jwtToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(jwtToken);
    setUser(userData);
    setCurrentView('companies');
    setViewStack([]);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeCompany');
    setToken(null);
    setUser(null);
    setActiveCompany(null);
    setCurrentView('auth');
    setViewStack([]);
  };

  const fetchCompanies = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/companies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setCompanies(data);
      }
    } catch (e) {
      console.error('Error fetching companies', e);
    } finally {
      setLoading(false);
    }
  };

  const selectCompany = (company: any) => {
    setActiveCompany(company);
    localStorage.setItem('activeCompany', JSON.stringify(company));
    navigateTo('gateway');
  };

  const navigateTo = (view: ViewType) => {
    if (view === currentView) return;
    setViewStack(prev => [...prev, currentView]);
    setCurrentView(view);
  };

  const goBack = () => {
    if (viewStack.length === 0) {
      if (currentView !== 'gateway' && currentView !== 'companies' && currentView !== 'auth') {
        setCurrentView('gateway');
      } else if (currentView === 'gateway') {
        setCurrentView('companies');
      }
      return;
    }
    const newStack = [...viewStack];
    const prevView = newStack.pop();
    setViewStack(newStack);
    if (prevView) {
      setCurrentView(prevView);
    }
  };

  const fetchMasters = async () => {
    if (!token || !activeCompany) return;
    try {
      setLoading(true);
      
      const [ledgRes, groupRes, itemsRes, unitsRes, sgRes] = await Promise.all([
        fetch(`${API_BASE}/masters/ledgers?companyId=${activeCompany.id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/masters/groups?companyId=${activeCompany.id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/masters/stock-items?companyId=${activeCompany.id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/masters/units?companyId=${activeCompany.id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/masters/stock-groups?companyId=${activeCompany.id}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const [ledgersData, groupsData, itemsData, unitsData, sgData] = await Promise.all([
        ledgRes.json(),
        groupRes.json(),
        itemsRes.json(),
        unitsRes.json(),
        sgRes.json()
      ]);

      setLedgers(Array.isArray(ledgersData) ? ledgersData : []);
      setGroups(Array.isArray(groupsData) ? groupsData : []);
      setStockItems(Array.isArray(itemsData) ? itemsData : []);
      setUnits(Array.isArray(unitsData) ? unitsData : []);
      setStockGroups(Array.isArray(sgData) ? sgData : []);
    } catch (e) {
      console.error('Error fetching masters data', e);
    } finally {
      setLoading(false);
    }
  };

  // Sync masters on company change
  useEffect(() => {
    if (activeCompany) {
      fetchMasters();
    }
  }, [activeCompany]);

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        companies,
        activeCompany,
        currentView,
        viewStack,
        activeReport,
        activeVoucherType,
        ledgers,
        groups,
        stockItems,
        units,
        stockGroups,
        loading,
        calculatorOpen,
        setCalculatorOpen,
        login,
        logout,
        fetchCompanies,
        selectCompany,
        navigateTo,
        goBack,
        setReportType,
        setVoucherType,
        fetchMasters
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
