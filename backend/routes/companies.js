const express = require('express');
const router = express.Router();
const prisma = require('../db');
const authMiddleware = require('../middleware/auth');

// Get all companies for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      where: { userId: req.user.id }
    });
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single company by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const company = await prisma.company.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new Company (Max 5)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, address, gstin, financialYear, state, phone, email } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    // Check company count
    const companyCount = await prisma.company.count({
      where: { userId: req.user.id }
    });

    if (companyCount >= 5) {
      return res.status(400).json({ error: 'Maximum limit of 5 companies reached.' });
    }

    // Create company, seed groups and ledgers
    const company = await prisma.$transaction(async (tx) => {
      const newCompany = await tx.company.create({
        data: {
          name,
          address,
          gstin,
          financialYear: financialYear || '2026-2027',
          state,
          phone,
          email,
          userId: req.user.id
        }
      });

      // Seed core Groups
      const assetsGroup = await tx.group.create({
        data: { name: 'Assets', type: 'ASSET', companyId: newCompany.id }
      });
      const liabilitiesGroup = await tx.group.create({
        data: { name: 'Liabilities', type: 'LIABILITY', companyId: newCompany.id }
      });
      const incomeGroup = await tx.group.create({
        data: { name: 'Income', type: 'INCOME', companyId: newCompany.id }
      });
      const expensesGroup = await tx.group.create({
        data: { name: 'Expenses', type: 'EXPENSE', companyId: newCompany.id }
      });

      // Seed default Ledgers
      await tx.ledger.create({
        data: {
          name: 'Cash',
          groupId: assetsGroup.id,
          openingBalance: 0,
          currentBalance: 0,
          companyId: newCompany.id
        }
      });

      await tx.ledger.create({
        data: {
          name: 'Bank',
          groupId: assetsGroup.id,
          openingBalance: 0,
          currentBalance: 0,
          companyId: newCompany.id
        }
      });

      // Create Audit Log
      await tx.auditLog.create({
        data: {
          action: 'COMPANY_CREATED',
          details: `Company ${name} was created and initialized.`,
          userId: req.user.id,
          companyId: newCompany.id
        }
      });

      return newCompany;
    });

    res.status(201).json(company);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Company
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, address, gstin, financialYear, state, phone, email } = req.body;
    const company = await prisma.company.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found or unauthorized' });
    }

    const updated = await prisma.company.update({
      where: { id: req.params.id },
      data: {
        name: name || company.name,
        address: address !== undefined ? address : company.address,
        gstin: gstin !== undefined ? gstin : company.gstin,
        financialYear: financialYear || company.financialYear,
        state: state !== undefined ? state : company.state,
        phone: phone !== undefined ? phone : company.phone,
        email: email !== undefined ? email : company.email
      }
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'COMPANY_UPDATED',
        details: `Company ${updated.name} details were updated.`,
        userId: req.user.id,
        companyId: updated.id
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Company
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const company = await prisma.company.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found or unauthorized' });
    }

    await prisma.company.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Company deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
