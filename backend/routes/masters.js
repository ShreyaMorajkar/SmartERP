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

// ==================== GROUPS ====================
// Get all groups for a company
router.get('/groups', authMiddleware, async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    
    if (!(await checkCompanyAccess(companyId, req.user.id))) {
      return res.status(403).json({ error: 'Unauthorized access to company' });
    }

    const groups = await prisma.group.findMany({
      where: { companyId }
    });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create group
router.post('/groups', authMiddleware, async (req, res) => {
  try {
    const { name, type, companyId } = req.body;
    if (!name || !type || !companyId) {
      return res.status(400).json({ error: 'name, type, and companyId are required' });
    }

    if (!(await checkCompanyAccess(companyId, req.user.id))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check unique group name per company
    const existing = await prisma.group.findUnique({
      where: { name_companyId: { name, companyId } }
    });
    if (existing) {
      return res.status(400).json({ error: 'Group with this name already exists' });
    }

    const group = await prisma.group.create({
      data: { name, type, companyId }
    });
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== LEDGERS ====================
// Get all ledgers for a company
router.get('/ledgers', authMiddleware, async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });

    if (!(await checkCompanyAccess(companyId, req.user.id))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const ledgers = await prisma.ledger.findMany({
      where: { companyId },
      include: { group: true }
    });
    res.json(ledgers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create ledger
router.post('/ledgers', authMiddleware, async (req, res) => {
  try {
    const { name, groupId, openingBalance, mobile, address, gstin, companyId } = req.body;
    if (!name || !groupId || !companyId) {
      return res.status(400).json({ error: 'name, groupId, and companyId are required' });
    }

    if (!(await checkCompanyAccess(companyId, req.user.id))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check uniqueness
    const existing = await prisma.ledger.findUnique({
      where: { name_companyId: { name, companyId } }
    });
    if (existing) {
      return res.status(400).json({ error: 'Ledger with this name already exists' });
    }

    const balance = parseFloat(openingBalance) || 0.0;
    const ledger = await prisma.ledger.create({
      data: {
        name,
        groupId,
        openingBalance: balance,
        currentBalance: balance,
        mobile,
        address,
        gstin,
        companyId
      },
      include: { group: true }
    });
    res.status(201).json(ledger);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update ledger
router.put('/ledgers/:id', authMiddleware, async (req, res) => {
  try {
    const { name, groupId, openingBalance, mobile, address, gstin } = req.body;
    const ledger = await prisma.ledger.findUnique({
      where: { id: req.params.id },
      include: { company: true }
    });

    if (!ledger || ledger.company.userId !== req.user.id) {
      return res.status(404).json({ error: 'Ledger not found or unauthorized' });
    }

    const balance = openingBalance !== undefined ? parseFloat(openingBalance) : ledger.openingBalance;
    
    // Adjust current balance if opening balance changed (simplified)
    const diff = balance - ledger.openingBalance;
    const currentBalance = ledger.currentBalance + diff;

    const updated = await prisma.ledger.update({
      where: { id: req.params.id },
      data: {
        name: name || ledger.name,
        groupId: groupId || ledger.groupId,
        openingBalance: balance,
        currentBalance,
        mobile: mobile !== undefined ? mobile : ledger.mobile,
        address: address !== undefined ? address : ledger.address,
        gstin: gstin !== undefined ? gstin : ledger.gstin
      },
      include: { group: true }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete ledger
router.delete('/ledgers/:id', authMiddleware, async (req, res) => {
  try {
    const ledger = await prisma.ledger.findUnique({
      where: { id: req.params.id },
      include: { company: true }
    });

    if (!ledger || ledger.company.userId !== req.user.id) {
      return res.status(404).json({ error: 'Ledger not found or unauthorized' });
    }

    // Prevent deleting default Cash and Bank ledgers
    if (ledger.name === 'Cash' || ledger.name === 'Bank') {
      return res.status(400).json({ error: 'Cannot delete system-default Cash or Bank ledgers' });
    }

    await prisma.ledger.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Ledger deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== UNITS ====================
// Get all units
router.get('/units', authMiddleware, async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    if (!(await checkCompanyAccess(companyId, req.user.id))) return res.status(403).json({ error: 'Unauthorized' });

    const units = await prisma.unit.findMany({ where: { companyId } });
    res.json(units);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create unit
router.post('/units', authMiddleware, async (req, res) => {
  try {
    const { name, companyId } = req.body;
    if (!name || !companyId) return res.status(400).json({ error: 'name and companyId are required' });
    if (!(await checkCompanyAccess(companyId, req.user.id))) return res.status(403).json({ error: 'Unauthorized' });

    const existing = await prisma.unit.findUnique({
      where: { name_companyId: { name, companyId } }
    });
    if (existing) return res.status(400).json({ error: 'Unit already exists' });

    const unit = await prisma.unit.create({ data: { name, companyId } });
    res.status(201).json(unit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== STOCK GROUPS ====================
// Get all stock groups
router.get('/stock-groups', authMiddleware, async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    if (!(await checkCompanyAccess(companyId, req.user.id))) return res.status(403).json({ error: 'Unauthorized' });

    const stockGroups = await prisma.stockGroup.findMany({ where: { companyId } });
    res.json(stockGroups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create stock group
router.post('/stock-groups', authMiddleware, async (req, res) => {
  try {
    const { name, companyId } = req.body;
    if (!name || !companyId) return res.status(400).json({ error: 'name and companyId are required' });
    if (!(await checkCompanyAccess(companyId, req.user.id))) return res.status(403).json({ error: 'Unauthorized' });

    const existing = await prisma.stockGroup.findUnique({
      where: { name_companyId: { name, companyId } }
    });
    if (existing) return res.status(400).json({ error: 'Stock Group already exists' });

    const sg = await prisma.stockGroup.create({ data: { name, companyId } });
    res.status(201).json(sg);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== STOCK ITEMS ====================
// Get all stock items
router.get('/stock-items', authMiddleware, async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    if (!(await checkCompanyAccess(companyId, req.user.id))) return res.status(403).json({ error: 'Unauthorized' });

    const items = await prisma.stockItem.findMany({
      where: { companyId },
      include: { unit: true, stockGroup: true }
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create stock item
router.post('/stock-items', authMiddleware, async (req, res) => {
  try {
    const { name, sku, purchaseRate, sellingRate, openingQty, gstPercentage, hsnCode, unitId, stockGroupId, companyId } = req.body;
    if (!name || !unitId || !stockGroupId || !companyId) {
      return res.status(400).json({ error: 'name, unitId, stockGroupId, and companyId are required' });
    }
    if (!(await checkCompanyAccess(companyId, req.user.id))) return res.status(403).json({ error: 'Unauthorized' });

    const existing = await prisma.stockItem.findUnique({
      where: { name_companyId: { name, companyId } }
    });
    if (existing) return res.status(400).json({ error: 'Stock Item with this name already exists' });

    const qty = parseFloat(openingQty) || 0.0;
    const item = await prisma.stockItem.create({
      data: {
        name,
        sku,
        purchaseRate: parseFloat(purchaseRate) || 0.0,
        sellingRate: parseFloat(sellingRate) || 0.0,
        openingQty: qty,
        currentQty: qty,
        gstPercentage: parseFloat(gstPercentage) || 0.0,
        hsnCode,
        unitId,
        stockGroupId,
        companyId
      },
      include: { unit: true, stockGroup: true }
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update stock item
router.put('/stock-items/:id', authMiddleware, async (req, res) => {
  try {
    const { name, sku, purchaseRate, sellingRate, openingQty, gstPercentage, hsnCode, unitId, stockGroupId } = req.body;
    const item = await prisma.stockItem.findUnique({
      where: { id: req.params.id },
      include: { company: true }
    });

    if (!item || item.company.userId !== req.user.id) {
      return res.status(404).json({ error: 'Item not found or unauthorized' });
    }

    const newOpening = openingQty !== undefined ? parseFloat(openingQty) : item.openingQty;
    const diff = newOpening - item.openingQty;
    const currentQty = item.currentQty + diff;

    const updated = await prisma.stockItem.update({
      where: { id: req.params.id },
      data: {
        name: name || item.name,
        sku: sku !== undefined ? sku : item.sku,
        purchaseRate: purchaseRate !== undefined ? parseFloat(purchaseRate) : item.purchaseRate,
        sellingRate: sellingRate !== undefined ? parseFloat(sellingRate) : item.sellingRate,
        openingQty: newOpening,
        currentQty,
        gstPercentage: gstPercentage !== undefined ? parseFloat(gstPercentage) : item.gstPercentage,
        hsnCode: hsnCode !== undefined ? hsnCode : item.hsnCode,
        unitId: unitId || item.unitId,
        stockGroupId: stockGroupId || item.stockGroupId
      },
      include: { unit: true, stockGroup: true }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete stock item
router.delete('/stock-items/:id', authMiddleware, async (req, res) => {
  try {
    const item = await prisma.stockItem.findUnique({
      where: { id: req.params.id },
      include: { company: true }
    });

    if (!item || item.company.userId !== req.user.id) {
      return res.status(404).json({ error: 'Item not found or unauthorized' });
    }

    await prisma.stockItem.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Stock Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
