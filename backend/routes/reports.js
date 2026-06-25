const express = require('express');
const router = express.Router();
const prisma = require('../db');
const authMiddleware = require('../middleware/auth');

// Helper to check company access
async function checkCompanyAccess(companyId, userId) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId }
  });
  return !!company;
}

// Get Trial Balance
router.get('/trial-balance', authMiddleware, async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    if (!(await checkCompanyAccess(companyId, req.user.id))) return res.status(403).json({ error: 'Unauthorized' });

    const ledgers = await prisma.ledger.findMany({
      where: { companyId },
      include: { group: true }
    });

    let totalDebit = 0;
    let totalCredit = 0;

    const report = ledgers.map(ledger => {
      const gType = ledger.group.type;
      const bal = ledger.currentBalance;
      
      let debit = 0;
      let credit = 0;

      if (gType === 'ASSET' || gType === 'EXPENSE') {
        if (bal >= 0) {
          debit = bal;
        } else {
          credit = Math.abs(bal);
        }
      } else { // LIABILITY or INCOME
        if (bal >= 0) {
          credit = bal;
        } else {
          debit = Math.abs(bal);
        }
      }

      totalDebit += debit;
      totalCredit += credit;

      return {
        ledgerId: ledger.id,
        ledgerName: ledger.name,
        groupName: ledger.group.name,
        groupType: gType,
        debit,
        credit
      };
    });

    res.json({
      ledgers: report,
      totalDebit,
      totalCredit
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Profit & Loss
router.get('/profit-loss', authMiddleware, async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    if (!(await checkCompanyAccess(companyId, req.user.id))) return res.status(403).json({ error: 'Unauthorized' });

    const ledgers = await prisma.ledger.findMany({
      where: { companyId },
      include: { group: true }
    });

    const incomeLedgers = [];
    const expenseLedgers = [];
    let totalIncome = 0;
    let totalExpense = 0;

    for (const ledger of ledgers) {
      const gType = ledger.group.type;
      const balance = ledger.currentBalance;

      if (gType === 'INCOME') {
        // Income currentBalance is positive for credit credit side
        incomeLedgers.push({
          id: ledger.id,
          name: ledger.name,
          groupName: ledger.group.name,
          amount: balance
        });
        totalIncome += balance;
      } else if (gType === 'EXPENSE') {
        // Expense currentBalance is positive for debit side
        expenseLedgers.push({
          id: ledger.id,
          name: ledger.name,
          groupName: ledger.group.name,
          amount: balance
        });
        totalExpense += balance;
      }
    }

    const netProfit = totalIncome - totalExpense;

    res.json({
      incomeLedgers,
      expenseLedgers,
      totalIncome,
      totalExpense,
      netProfit
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Balance Sheet
router.get('/balance-sheet', authMiddleware, async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    if (!(await checkCompanyAccess(companyId, req.user.id))) return res.status(403).json({ error: 'Unauthorized' });

    const ledgers = await prisma.ledger.findMany({
      where: { companyId },
      include: { group: true }
    });

    const assetLedgers = [];
    const liabilityLedgers = [];
    let totalAssets = 0;
    let totalLiabilities = 0;

    // First calculate net profit to add to liabilities (as Retained Earnings)
    let totalIncome = 0;
    let totalExpense = 0;

    for (const ledger of ledgers) {
      const gType = ledger.group.type;
      const balance = ledger.currentBalance;

      if (gType === 'ASSET') {
        assetLedgers.push({
          id: ledger.id,
          name: ledger.name,
          groupName: ledger.group.name,
          amount: balance
        });
        totalAssets += balance;
      } else if (gType === 'LIABILITY') {
        liabilityLedgers.push({
          id: ledger.id,
          name: ledger.name,
          groupName: ledger.group.name,
          amount: balance
        });
        totalLiabilities += balance;
      } else if (gType === 'INCOME') {
        totalIncome += balance;
      } else if (gType === 'EXPENSE') {
        totalExpense += balance;
      }
    }

    const netProfit = totalIncome - totalExpense;

    // Add Net Profit to liability side (Retained Earnings)
    liabilityLedgers.push({
      id: 'retained-earnings',
      name: 'Profit & Loss A/c (Net Profit)',
      groupName: 'Reserves & Surplus',
      amount: netProfit
    });
    totalLiabilities += netProfit;

    res.json({
      assetLedgers,
      liabilityLedgers,
      totalAssets,
      totalLiabilities,
      isBalanced: Math.abs(totalAssets - totalLiabilities) < 0.01
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Stock Summary
router.get('/stock-summary', authMiddleware, async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    if (!(await checkCompanyAccess(companyId, req.user.id))) return res.status(403).json({ error: 'Unauthorized' });

    const items = await prisma.stockItem.findMany({
      where: { companyId },
      include: { unit: true, stockGroup: true }
    });

    let totalValuation = 0.0;
    const summary = items.map(item => {
      const valuation = item.currentQty * item.purchaseRate;
      totalValuation += valuation;
      return {
        id: item.id,
        name: item.name,
        sku: item.sku,
        stockGroup: item.stockGroup.name,
        unit: item.unit.name,
        currentQty: item.currentQty,
        purchaseRate: item.purchaseRate,
        sellingRate: item.sellingRate,
        valuation
      };
    });

    res.json({
      items: summary,
      totalValuation
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get GST Register Summary
router.get('/gst-register', authMiddleware, async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    if (!(await checkCompanyAccess(companyId, req.user.id))) return res.status(403).json({ error: 'Unauthorized' });

    const vouchers = await prisma.voucher.findMany({
      where: { companyId, gstRecords: { some: {} } },
      include: {
        partyLedger: true,
        gstRecords: true
      },
      orderBy: { date: 'desc' }
    });

    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;
    let totalTaxable = 0;

    const registers = vouchers.map(v => {
      let cgst = 0;
      let sgst = 0;
      let igst = 0;
      let gstRate = 0;

      for (const rec of v.gstRecords) {
        cgst += rec.cgst;
        sgst += rec.sgst;
        igst += rec.igst;
        gstRate = rec.gstRate;
      }

      totalCGST += cgst;
      totalSGST += sgst;
      totalIGST += igst;
      totalTaxable += v.totalAmount;

      return {
        voucherId: v.id,
        voucherNo: v.voucherNo,
        type: v.type,
        date: v.date,
        partyName: v.partyLedger ? v.partyLedger.name : 'Cash Sale',
        taxableAmount: v.totalAmount,
        gstRate,
        cgst,
        sgst,
        igst,
        totalTax: cgst + sgst + igst
      };
    });

    res.json({
      registers,
      totalCGST,
      totalSGST,
      totalIGST,
      totalTaxable,
      totalTax: totalCGST + totalSGST + totalIGST
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
