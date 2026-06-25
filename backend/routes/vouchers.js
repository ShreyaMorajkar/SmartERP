const express = require('express');
const router = express.Router();
const prisma = require('../db');
const authMiddleware = require('../middleware/auth');

// Helper to check company access
async function checkCompanyAccess(companyId, userId) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId }
  });
  return company;
}

// Get all vouchers for a company
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { companyId, type } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    if (!(await checkCompanyAccess(companyId, req.user.id))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const whereClause = { companyId };
    if (type) {
      whereClause.type = type;
    }

    const vouchers = await prisma.voucher.findMany({
      where: whereClause,
      include: {
        partyLedger: true,
        entries: { include: { ledger: true } },
        inventoryEntries: { include: { stockItem: true } },
        gstRecords: true
      },
      orderBy: { date: 'desc' }
    });
    res.json(vouchers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a voucher by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const voucher = await prisma.voucher.findUnique({
      where: { id: req.params.id },
      include: {
        company: true,
        partyLedger: true,
        entries: { include: { ledger: true } },
        inventoryEntries: { include: { stockItem: true } },
        gstRecords: true
      }
    });

    if (!voucher || voucher.company.userId !== req.user.id) {
      return res.status(404).json({ error: 'Voucher not found or unauthorized' });
    }

    res.json(voucher);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Voucher (Atomic Transaction)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      type, // CONTRA, PAYMENT, RECEIPT, JOURNAL, PURCHASE, SALES, CREDIT_NOTE, DEBIT_NOTE
      date,
      voucherNo,
      narration,
      totalAmount,
      partyLedgerId,
      companyId,
      entries, // Array: [{ ledgerId, debitAmount, creditAmount }]
      inventoryEntries, // Array: [{ stockItemId, qty, rate, amount }]
      gstRate, // Percentage (e.g. 18)
      partyState // State name for GST calculation
    } = req.body;

    if (!type || !voucherNo || !companyId || !entries || entries.length === 0) {
      return res.status(400).json({ error: 'Missing required voucher details' });
    }

    const company = await checkCompanyAccess(companyId, req.user.id);
    if (!company) {
      return res.status(403).json({ error: 'Unauthorized company access' });
    }

    // Double-entry validation: sum(debits) === sum(credits)
    let totalDebits = 0;
    let totalCredits = 0;
    for (const entry of entries) {
      totalDebits += parseFloat(entry.debitAmount) || 0;
      totalCredits += parseFloat(entry.creditAmount) || 0;
    }

    // Floating point delta check (e.g. within 0.01)
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return res.status(400).json({
        error: `Double entry mismatch: Debits (${totalDebits}) must equal Credits (${totalCredits})`
      });
    }

    // Create the voucher and run updates atomically
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create main Voucher record
      const voucher = await tx.voucher.create({
        data: {
          type,
          date: date ? new Date(date) : new Date(),
          voucherNo,
          narration,
          totalAmount: parseFloat(totalAmount) || totalDebits,
          partyLedgerId,
          companyId
        }
      });

      // 2. Create Voucher Entries & Update Ledgers
      for (const entry of entries) {
        const dbLedgerId = entry.ledgerId;
        const deb = parseFloat(entry.debitAmount) || 0;
        const cred = parseFloat(entry.creditAmount) || 0;

        await tx.voucherEntry.create({
          data: {
            voucherId: voucher.id,
            ledgerId: dbLedgerId,
            debitAmount: deb,
            creditAmount: cred
          }
        });

        // Update ledger current balance
        const ledger = await tx.ledger.findUnique({
          where: { id: dbLedgerId },
          include: { group: true }
        });

        if (!ledger) {
          throw new Error(`Ledger with ID ${dbLedgerId} not found`);
        }

        let balanceChange = 0;
        const gType = ledger.group.type; // ASSET, LIABILITY, INCOME, EXPENSE

        if (gType === 'ASSET' || gType === 'EXPENSE') {
          balanceChange = deb - cred;
        } else if (gType === 'LIABILITY' || gType === 'INCOME') {
          balanceChange = cred - deb;
        }

        await tx.ledger.update({
          where: { id: dbLedgerId },
          data: {
            currentBalance: ledger.currentBalance + balanceChange
          }
        });
      }

      // 3. Create Inventory Entries & Update Stock Levels
      if (inventoryEntries && inventoryEntries.length > 0) {
        // PURCHASE or CREDIT_NOTE (sales return) increase stock (IN)
        // SALES or DEBIT_NOTE (purchase return) decrease stock (OUT)
        const isInward = type === 'PURCHASE' || type === 'CREDIT_NOTE';
        const invType = isInward ? 'IN' : 'OUT';

        for (const inv of inventoryEntries) {
          const item = await tx.stockItem.findUnique({
            where: { id: inv.stockItemId }
          });

          if (!item) {
            throw new Error(`Stock Item with ID ${inv.stockItemId} not found`);
          }

          const qty = parseFloat(inv.qty);
          const rate = parseFloat(inv.rate);
          const amt = inv.amount !== undefined ? parseFloat(inv.amount) : qty * rate;

          await tx.inventoryEntry.create({
            data: {
              voucherId: voucher.id,
              stockItemId: inv.stockItemId,
              qty,
              rate,
              amount: amt,
              type: invType
            }
          });

          const qtyChange = isInward ? qty : -qty;
          await tx.stockItem.update({
            where: { id: inv.stockItemId },
            data: {
              currentQty: item.currentQty + qtyChange
            }
          });
        }
      }

      // 4. Calculate and generate GST records if relevant
      if (gstRate && parseFloat(gstRate) > 0) {
        const ratePercent = parseFloat(gstRate);
        const calcTaxable = parseFloat(totalAmount) || totalDebits;
        
        let cgst = 0;
        let sgst = 0;
        let igst = 0;

        const cState = company.state ? company.state.trim().toLowerCase() : '';
        const pState = partyState ? partyState.trim().toLowerCase() : '';

        // If local state or not specified, apply CGST + SGST (split), else apply IGST
        if (!pState || cState === pState) {
          const halfRate = ratePercent / 2;
          cgst = calcTaxable * (halfRate / 100);
          sgst = calcTaxable * (halfRate / 100);
        } else {
          igst = calcTaxable * (ratePercent / 100);
        }

        await tx.gstRecord.create({
          data: {
            voucherId: voucher.id,
            cgst,
            sgst,
            igst,
            taxableAmount: calcTaxable,
            gstRate: ratePercent
          }
        });
      }

      // 5. Create Audit Log
      await tx.auditLog.create({
        data: {
          action: 'VOUCHER_CREATED',
          details: `Voucher ${voucherNo} of type ${type} created for ${totalAmount} INR.`,
          userId: req.user.id,
          companyId
        }
      });

      return voucher;
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Voucher
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const voucher = await prisma.voucher.findUnique({
      where: { id: req.params.id },
      include: {
        company: true,
        entries: true,
        inventoryEntries: true
      }
    });

    if (!voucher || voucher.company.userId !== req.user.id) {
      return res.status(404).json({ error: 'Voucher not found or unauthorized' });
    }

    // Reverse ledger balances and stock quantities before deleting!
    await prisma.$transaction(async (tx) => {
      // 1. Reverse Ledger Balances
      for (const entry of voucher.entries) {
        const ledger = await tx.ledger.findUnique({
          where: { id: entry.ledgerId },
          include: { group: true }
        });

        if (ledger) {
          let balanceChange = 0;
          const gType = ledger.group.type;

          // Subtract debits, add credits to reverse
          if (gType === 'ASSET' || gType === 'EXPENSE') {
            balanceChange = entry.creditAmount - entry.debitAmount;
          } else if (gType === 'LIABILITY' || gType === 'INCOME') {
            balanceChange = entry.debitAmount - entry.creditAmount;
          }

          await tx.ledger.update({
            where: { id: entry.ledgerId },
            data: { currentBalance: ledger.currentBalance + balanceChange }
          });
        }
      }

      // 2. Reverse Stock Quantities
      if (voucher.inventoryEntries && voucher.inventoryEntries.length > 0) {
        const isInward = voucher.type === 'PURCHASE' || voucher.type === 'CREDIT_NOTE';

        for (const inv of voucher.inventoryEntries) {
          const item = await tx.stockItem.findUnique({
            where: { id: inv.stockItemId }
          });

          if (item) {
            // Subtract if it was inward, add if it was outward
            const qtyChange = isInward ? -inv.qty : inv.qty;
            await tx.stockItem.update({
              where: { id: inv.stockItemId },
              data: { currentQty: item.currentQty + qtyChange }
            });
          }
        }
      }

      // 3. Create Audit Log
      await tx.auditLog.create({
        data: {
          action: 'VOUCHER_DELETED',
          details: `Voucher ${voucher.voucherNo} of type ${voucher.type} deleted.`,
          userId: req.user.id,
          companyId: voucher.companyId
        }
      });

      // 4. Delete the Voucher (cascade deletes VoucherEntry, InventoryEntry, GSTRecord)
      await tx.voucher.delete({
        where: { id: voucher.id }
      });
    });

    res.json({ message: 'Voucher deleted and accounts balanced successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
