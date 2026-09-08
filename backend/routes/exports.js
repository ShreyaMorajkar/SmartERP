const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const prisma = require('../db');
const authMiddleware = require('../middleware/auth');

// Helper to check company access
async function checkCompanyAccess(companyId, userId) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId }
  });
  return company;
}

// Generate PDF Invoice for a Voucher (Sales Voucher)
router.get('/pdf/invoice/:voucherId', authMiddleware, async (req, res) => {
  try {
    const voucher = await prisma.voucher.findUnique({
      where: { id: req.params.voucherId },
      include: {
        company: true,
        partyLedger: true,
        inventoryEntries: { include: { stockItem: { include: { unit: true } } } },
        gstRecords: true
      }
    });

    if (!voucher || voucher.company.userId !== req.user.id) {
      return res.status(404).json({ error: 'Invoice voucher not found or unauthorized' });
    }

    const { company, partyLedger, inventoryEntries, gstRecords } = voucher;

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    
    // Set headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice_${voucher.voucherNo}.pdf`);
    doc.pipe(res);

    // --- Draw Header ---
    doc.fontSize(20).text(company.name, { align: 'left' });
    doc.fontSize(10).text(company.address || '', { align: 'left' });
    doc.text(`GSTIN: ${company.gstin || 'N/A'}`, { align: 'left' });
    doc.text(`Phone: ${company.phone || 'N/A'} | Email: ${company.email || 'N/A'}`, { align: 'left' });
    
    doc.moveDown();
    doc.strokeColor('#cccccc').moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // --- Invoice Details ---
    const invoiceY = doc.y;
    doc.fontSize(14).text('TAX INVOICE', 50, invoiceY, { underline: true });
    doc.fontSize(10);
    doc.text(`Invoice No: ${voucher.voucherNo}`, 50, invoiceY + 20);
    doc.text(`Date: ${new Date(voucher.date).toLocaleDateString()}`, 50, invoiceY + 35);

    doc.text('Billed To:', 320, invoiceY);
    doc.fontSize(11).text(partyLedger ? partyLedger.name : 'Cash Customer', 320, invoiceY + 15);
    doc.fontSize(10);
    if (partyLedger) {
      doc.text(partyLedger.address || 'Address: N/A', 320, invoiceY + 30);
      doc.text(`GSTIN: ${partyLedger.gstin || 'N/A'}`, 320, invoiceY + 45);
      doc.text(`Phone: ${partyLedger.mobile || 'N/A'}`, 320, invoiceY + 60);
    }
    
    doc.moveDown();
    doc.moveDown();
    doc.moveDown();

    // --- Items Table Header ---
    const tableY = doc.y + 30;
    doc.strokeColor('#cccccc').moveTo(50, tableY).lineTo(550, tableY).stroke();
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('S.No', 55, tableY + 5);
    doc.text('Item Name', 90, tableY + 5);
    doc.text('HSN', 240, tableY + 5);
    doc.text('Qty', 290, tableY + 5);
    doc.text('Rate', 340, tableY + 5);
    doc.text('GST %', 400, tableY + 5);
    doc.text('Amount (INR)', 470, tableY + 5);
    doc.strokeColor('#cccccc').moveTo(50, tableY + 20).lineTo(550, tableY + 20).stroke();

    // --- Items List ---
    let currentY = tableY + 25;
    doc.font('Helvetica');
    inventoryEntries.forEach((item, index) => {
      doc.text(String(index + 1), 55, currentY);
      doc.text(item.stockItem.name, 90, currentY);
      doc.text(item.stockItem.hsnCode || '-', 240, currentY);
      doc.text(`${item.qty} ${item.stockItem.unit.name}`, 290, currentY);
      doc.text(item.rate.toFixed(2), 340, currentY);
      doc.text(`${item.stockItem.gstPercentage}%`, 400, currentY);
      doc.text(item.amount.toFixed(2), 470, currentY);
      currentY += 15;
    });

    doc.strokeColor('#cccccc').moveTo(50, currentY).lineTo(550, currentY).stroke();
    currentY += 10;

    // --- Totals ---
    doc.font('Helvetica-Bold');
    doc.text('Taxable Value:', 350, currentY);
    doc.font('Helvetica').text(voucher.totalAmount.toFixed(2), 475, currentY);
    currentY += 15;

    // Add CGST, SGST, IGST details
    let cgstVal = 0, sgstVal = 0, igstVal = 0;
    if (gstRecords && gstRecords.length > 0) {
      cgstVal = gstRecords[0].cgst;
      sgstVal = gstRecords[0].sgst;
      igstVal = gstRecords[0].igst;
    }

    if (cgstVal > 0) {
      doc.text('CGST:', 350, currentY);
      doc.text(cgstVal.toFixed(2), 475, currentY);
      currentY += 15;
      doc.text('SGST:', 350, currentY);
      doc.text(sgstVal.toFixed(2), 475, currentY);
      currentY += 15;
    } else if (igstVal > 0) {
      doc.text('IGST:', 350, currentY);
      doc.text(igstVal.toFixed(2), 475, currentY);
      currentY += 15;
    }

    doc.strokeColor('#cccccc').moveTo(350, currentY).lineTo(550, currentY).stroke();
    currentY += 10;

    doc.font('Helvetica-Bold').fontSize(12);
    doc.text('Total Invoiced Amount:', 300, currentY);
    const netTotal = voucher.totalAmount + cgstVal + sgstVal + igstVal;
    doc.text(`${netTotal.toFixed(2)} INR`, 470, currentY);

    doc.moveDown();
    doc.moveDown();
    doc.moveDown();
    
    // Sign-off
    const signY = doc.y + 40;
    doc.fontSize(10).font('Helvetica-Bold').text('For ' + company.name, 350, signY);
    doc.moveDown();
    doc.moveDown();
    doc.font('Helvetica').text('Authorized Signatory', 350, doc.y + 20);

    doc.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Excel Export for reports (Trial Balance, P&L, Balance Sheet, Stock)
router.get('/excel/report', authMiddleware, async (req, res) => {
  try {
    const { companyId, reportType } = req.query;
    if (!companyId || !reportType) {
      return res.status(400).json({ error: 'companyId and reportType are required' });
    }

    const company = await checkCompanyAccess(companyId, req.user.id);
    if (!company) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(reportType);

    // Style Title Block
    sheet.mergeCells('A1:D1');
    sheet.getCell('A1').value = `${company.name} - ${reportType.toUpperCase()}`;
    sheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FFFFFF' } };
    sheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '0F172A' } // Sleek slate color
    };
    sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 40;

    if (reportType === 'trial-balance') {
      // Trial Balance Excel Layout
      sheet.getRow(3).values = ['Ledger Name', 'Under Group', 'Debit (INR)', 'Credit (INR)'];
      sheet.getRow(3).font = { bold: true };
      
      const ledgers = await prisma.ledger.findMany({
        where: { companyId },
        include: { group: true }
      });

      let totalDebit = 0;
      let totalCredit = 0;

      ledgers.forEach((l, idx) => {
        const bal = l.currentBalance;
        const gType = l.group.type;
        let debit = 0;
        let credit = 0;

        if (gType === 'ASSET' || gType === 'EXPENSE') {
          if (bal >= 0) debit = bal;
          else credit = Math.abs(bal);
        } else {
          if (bal >= 0) credit = bal;
          else debit = Math.abs(bal);
        }

        totalDebit += debit;
        totalCredit += credit;

        sheet.addRow([l.name, l.group.name, debit || 0, credit || 0]);
      });

      // Total row
      const totalRow = sheet.addRow(['TOTALS', '', totalDebit, totalCredit]);
      totalRow.font = { bold: true };
      totalRow.border = {
        top: { style: 'thin' },
        bottom: { style: 'double' }
      };

    } else if (reportType === 'profit-loss') {
      // Profit & Loss Excel Layout
      sheet.getRow(3).values = ['Particulars', 'Amount (INR)', '', ''];
      sheet.getRow(3).font = { bold: true };

      const ledgers = await prisma.ledger.findMany({
        where: { companyId },
        include: { group: true }
      });

      let totalIncome = 0;
      let totalExpense = 0;

      sheet.addRow(['INCOME / REVENUES']).font = { italic: true, bold: true };
      ledgers.forEach(l => {
        if (l.group.type === 'INCOME') {
          sheet.addRow([l.name, l.currentBalance]);
          totalIncome += l.currentBalance;
        }
      });
      sheet.addRow(['Total Income', totalIncome]).font = { bold: true };
      sheet.addRow([]);

      sheet.addRow(['EXPENSES']).font = { italic: true, bold: true };
      ledgers.forEach(l => {
        if (l.group.type === 'EXPENSE') {
          sheet.addRow([l.name, l.currentBalance]);
          totalExpense += l.currentBalance;
        }
      });
      sheet.addRow(['Total Expense', totalExpense]).font = { bold: true };
      sheet.addRow([]);

      const netProfit = totalIncome - totalExpense;
      const netRow = sheet.addRow(['NET PROFIT / (LOSS)', netProfit]);
      netRow.font = { bold: true, size: 12 };
      netRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: netProfit >= 0 ? 'DCFCE7' : 'FEE2E2' } // Light green or light red
      };

    } else if (reportType === 'stock-summary') {
      // Stock Summary Excel Layout
      sheet.getRow(3).values = ['Item Name', 'SKU', 'Group', 'Unit', 'Qty In Stock', 'Purchase Rate (INR)', 'Total Value (INR)'];
      sheet.getRow(3).font = { bold: true };

      const items = await prisma.stockItem.findMany({
        where: { companyId },
        include: { unit: true, stockGroup: true }
      });

      let totalVal = 0;
      items.forEach(item => {
        const val = item.currentQty * item.purchaseRate;
        totalVal += val;
        sheet.addRow([item.name, item.sku || '-', item.stockGroup?.name || 'Default', item.unit?.name || 'Unit', item.currentQty, item.purchaseRate, val]);
      });

      const totalRow = sheet.addRow(['TOTAL INVENTORY VALUE', '', '', '', '', '', totalVal]);
      totalRow.font = { bold: true };
      totalRow.border = {
        top: { style: 'thin' },
        bottom: { style: 'double' }
      };
    } else if (reportType === 'balance-sheet') {
      // Balance Sheet Excel Layout
      sheet.getRow(3).values = ['Liabilities & Equity', 'Amount (INR)', 'Assets & Properties', 'Amount (INR)'];
      sheet.getRow(3).font = { bold: true };

      const ledgers = await prisma.ledger.findMany({
        where: { companyId },
        include: { group: true }
      });

      const liabilities = ledgers.filter(l => l.group.type === 'LIABILITY');
      const assets = ledgers.filter(l => l.group.type === 'ASSET');

      let totalLiab = 0;
      let totalAsset = 0;

      const maxRows = Math.max(liabilities.length, assets.length);
      for (let i = 0; i < maxRows; i++) {
        const l = liabilities[i];
        const a = assets[i];
        if (l) totalLiab += l.currentBalance;
        if (a) totalAsset += a.currentBalance;

        sheet.addRow([
          l ? l.name : '',
          l ? l.currentBalance : '',
          a ? a.name : '',
          a ? a.currentBalance : ''
        ]);
      }

      const totalRow = sheet.addRow(['TOTAL LIABILITIES', totalLiab, 'TOTAL ASSETS', totalAsset]);
      totalRow.font = { bold: true };
      totalRow.border = {
        top: { style: 'thin' },
        bottom: { style: 'double' }
      };
    } else if (reportType === 'gst-register') {
      // GST Register Excel Layout
      sheet.getRow(3).values = ['Voucher No', 'Type', 'Date', 'Party Name', 'Taxable Amount (INR)', 'GST Rate (%)', 'CGST (INR)', 'SGST (INR)', 'IGST (INR)', 'Total Tax (INR)', 'Grand Total (INR)'];
      sheet.getRow(3).font = { bold: true };

      const vouchers = await prisma.voucher.findMany({
        where: { companyId },
        include: { gstRecords: true, partyLedger: true },
        orderBy: { date: 'desc' }
      });

      let totalTaxable = 0, totalCGST = 0, totalSGST = 0, totalIGST = 0, grandTotal = 0;

      vouchers.forEach(v => {
        if (v.gstRecords && v.gstRecords.length > 0) {
          v.gstRecords.forEach(g => {
            const taxable = g.taxableAmount || 0;
            const cgst = g.cgst || 0;
            const sgst = g.sgst || 0;
            const igst = g.igst || 0;
            const taxTotal = cgst + sgst + igst;
            const tot = taxable + taxTotal;

            totalTaxable += taxable;
            totalCGST += cgst;
            totalSGST += sgst;
            totalIGST += igst;
            grandTotal += tot;

            sheet.addRow([
              v.voucherNo,
              v.type,
              new Date(v.date).toLocaleDateString(),
              v.partyLedger ? v.partyLedger.name : 'Counter Sales',
              taxable,
              g.gstRate,
              cgst,
              sgst,
              igst,
              taxTotal,
              tot
            ]);
          });
        }
      });

      const totalRow = sheet.addRow(['TOTALS', '', '', '', totalTaxable, '', totalCGST, totalSGST, totalIGST, (totalCGST + totalSGST + totalIGST), grandTotal]);
      totalRow.font = { bold: true };
      totalRow.border = {
        top: { style: 'thin' },
        bottom: { style: 'double' }
      };
    } else {
      sheet.addRow(['Standard export for reports completed.']);
    }

    // Set auto width for columns
    sheet.columns.forEach(column => {
      let maxLen = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        const valStr = cell.value ? cell.value.toString() : '';
        if (valStr.length > maxLen) maxLen = valStr.length;
      });
      column.width = Math.max(maxLen + 4, 12);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${reportType}_${company.name.replace(/\s+/g, '_')}.xlsx`);

    await workbook.xlsx.write(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
