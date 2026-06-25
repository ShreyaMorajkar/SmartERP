'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Delete } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Calculator: React.FC = () => {
  const { calculatorOpen, setCalculatorOpen } = useApp();
  const [input, setInput] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const calcRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!calculatorOpen) return;

    const handleCalcKeys = (e: KeyboardEvent) => {
      // Calculator shortcuts when it is open
      if (e.key === 'Escape') {
        e.stopPropagation();
        setCalculatorOpen(false);
        return;
      }
      
      const allowed = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '-', '*', '/', '.', '(', ')'];
      if (allowed.includes(e.key)) {
        setInput(prev => prev + e.key);
      } else if (e.key === 'Backspace') {
        setInput(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        calculateResult();
      } else if (e.key.toLowerCase() === 'c') {
        setInput('');
        setResult('');
      }
    };

    window.addEventListener('keydown', handleCalcKeys);
    return () => {
      window.removeEventListener('keydown', handleCalcKeys);
    };
  }, [calculatorOpen, input]);

  const calculateResult = () => {
    try {
      if (!input) return;
      // Using Function constructor as a safer eval substitute for simple math
      const res = new Function(`return (${input})`)();
      setResult(String(res));
    } catch (e) {
      setResult('Error');
    }
  };

  if (!calculatorOpen) return null;

  return (
    <div
      ref={calcRef}
      className="fixed bottom-10 right-10 w-80 glassmorphism rounded-xl shadow-2xl p-4 z-50 border border-slate-700 animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Smart Calculator (F4)</span>
        <button
          onClick={() => setCalculatorOpen(false)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="bg-[#0b1329] p-3 rounded-lg border border-slate-800 text-right mb-4">
        <div className="text-slate-400 text-sm overflow-x-auto whitespace-nowrap h-6">{input || '0'}</div>
        <div className="text-2xl font-bold text-emerald-400 overflow-x-auto whitespace-nowrap h-8">
          {result ? `= ${result}` : ''}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => { setInput(''); setResult(''); }}
          className="col-span-2 py-2 bg-red-950/40 text-red-400 rounded-lg hover:bg-red-900/40 border border-red-900/40 text-sm font-semibold transition"
        >
          Clear (C)
        </button>
        <button
          onClick={() => setInput(prev => prev.slice(0, -1))}
          className="py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 border border-slate-700 text-sm flex justify-center items-center transition"
        >
          <Delete size={16} />
        </button>
        <button
          onClick={() => setInput(prev => prev + '/')}
          className="py-2 bg-emerald-950/20 text-emerald-400 rounded-lg hover:bg-emerald-900/30 border border-emerald-900/30 text-sm font-bold transition"
        >
          /
        </button>

        {['7', '8', '9'].map(n => (
          <button
            key={n}
            onClick={() => setInput(prev => prev + n)}
            className="py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg border border-slate-800 text-sm transition"
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => setInput(prev => prev + '*')}
          className="py-2 bg-emerald-950/20 text-emerald-400 rounded-lg hover:bg-emerald-900/30 border border-emerald-900/30 text-sm font-bold transition"
        >
          *
        </button>

        {['4', '5', '6'].map(n => (
          <button
            key={n}
            onClick={() => setInput(prev => prev + n)}
            className="py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg border border-slate-800 text-sm transition"
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => setInput(prev => prev + '-')}
          className="py-2 bg-emerald-950/20 text-emerald-400 rounded-lg hover:bg-emerald-900/30 border border-emerald-900/30 text-sm font-bold transition"
        >
          -
        </button>

        {['1', '2', '3'].map(n => (
          <button
            key={n}
            onClick={() => setInput(prev => prev + n)}
            className="py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg border border-slate-800 text-sm transition"
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => setInput(prev => prev + '+')}
          className="py-2 bg-emerald-950/20 text-emerald-400 rounded-lg hover:bg-emerald-900/30 border border-emerald-900/30 text-sm font-bold transition"
        >
          +
        </button>

        <button
          onClick={() => setInput(prev => prev + '0')}
          className="col-span-2 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg border border-slate-800 text-sm transition"
        >
          0
        </button>
        <button
          onClick={() => setInput(prev => prev + '.')}
          className="py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg border border-slate-800 text-sm transition"
        >
          .
        </button>
        <button
          onClick={calculateResult}
          className="py-2 bg-emerald-500 text-slate-950 hover:bg-emerald-400 rounded-lg text-sm font-bold transition"
        >
          =
        </button>
      </div>
    </div>
  );
};
