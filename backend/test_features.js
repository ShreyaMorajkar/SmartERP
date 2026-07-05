const API_URL = 'http://localhost:5050/api';

async function runTests() {
  console.log('=== starting smarterp functionality integration tests ===\n');

  let token = '';
  let companyId = '';
  
  // 1. Auth: Register / Login Test User
  try {
    console.log('1. Testing User Authentication...');
    const email = `testuser_${Date.now()}@smarterp.com`;
    const password = 'testpassword123';
    
    // Register
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: 'Test Administrator' })
    });
    
    const regData = await regRes.json();
    if (!regRes.ok) {
      throw new Error(`Registration failed: ${regData.error}`);
    }
    token = regData.token;
    console.log(`   ✓ Admin User registered: ${regData.user.email}`);

    // Login
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginData.error}`);
    }
    console.log('   ✓ Logged in successfully, token retrieved.');
  } catch (error) {
    console.error('❌ Auth Test failed:', error.message);
    process.exit(1);
  }

  // 2. Company Creation
  try {
    console.log('\n2. Testing Company Management...');
    const compRes = await fetch(`${API_URL}/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Acme Accounting Ltd',
        state: 'Goa',
        gstin: '30AAAAA1111A1Z1',
        financialYear: '2026-2027',
        address: 'Panaji, Goa, India',
        phone: '9876543210'
      })
    });
    const compData = await compRes.json();
    if (!compRes.ok) {
      throw new Error(`Company creation failed: ${compData.error}`);
    }
    companyId = compData.id;
    console.log(`   ✓ Company initialized: ${compData.name} (ID: ${companyId})`);
  } catch (error) {
    console.error('❌ Company Test failed:', error.message);
    process.exit(1);
  }

  // 3. Masters Setup
  let groups = [];
  let ledgers = [];
  let unitId = '';
  let stockGroupId = '';
  let itemId = '';

  let supplierId = '';
  let customerId = '';
  let purchaseLedgerId = '';
  let salesLedgerId = '';

  try {
    console.log('\n3. Testing Masters Setup & Seeding...');
    
    // Check seeded Groups
    const groupRes = await fetch(`${API_URL}/masters/groups?companyId=${companyId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    groups = await groupRes.json();
    console.log(`   ✓ Seeded groups found: ${groups.map(g => g.name).join(', ')}`);

    const assetsGroup = groups.find(g => g.type === 'ASSET');
    const liabilitiesGroup = groups.find(g => g.type === 'LIABILITY');
    const incomeGroup = groups.find(g => g.type === 'INCOME');
    const expensesGroup = groups.find(g => g.type === 'EXPENSE');

    // Check seeded Ledgers (Cash/Bank)
    const ledRes = await fetch(`${API_URL}/masters/ledgers?companyId=${companyId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    ledgers = await ledRes.json();
    console.log(`   ✓ Seeded ledgers found: ${ledgers.map(l => l.name).join(', ')}`);

    // Create Custom Ledgers
    console.log('   Creating Custom Ledgers...');
    
    // Supplier Ledger
    const supRes = await fetch(`${API_URL}/masters/ledgers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Sun Distributors',
        groupId: liabilitiesGroup.id,
        openingBalance: 0,
        mobile: '9999999999',
        address: 'Goa',
        gstin: '30BBBBB2222B2Z2',
        companyId
      })
    });
    const supplier = await supRes.json();
    supplierId = supplier.id;
    console.log(`     ✓ Created Supplier Ledger: ${supplier.name}`);

    // Customer Ledger
    const custRes = await fetch(`${API_URL}/masters/ledgers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Ocean Retailers',
        groupId: assetsGroup.id,
        openingBalance: 0,
        mobile: '8888888888',
        address: 'Goa',
        gstin: '30CCCCC3333C3Z3',
        companyId
      })
    });
    const customer = await custRes.json();
    customerId = customer.id;
    console.log(`     ✓ Created Customer Ledger: ${customer.name}`);

    // Purchase A/c Ledger
    const purRes = await fetch(`${API_URL}/masters/ledgers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Purchase A/c',
        groupId: expensesGroup.id,
        companyId
      })
    });
    const purLedger = await purRes.json();
    purchaseLedgerId = purLedger.id;
    console.log(`     ✓ Created Purchase Ledger: ${purLedger.name}`);

    // Sales A/c Ledger
    const salRes = await fetch(`${API_URL}/masters/ledgers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Sales A/c',
        groupId: incomeGroup.id,
        companyId
      })
    });
    const salLedger = await salRes.json();
    salesLedgerId = salLedger.id;
    console.log(`     ✓ Created Sales Ledger: ${salLedger.name}`);

    // Create Measurement Unit
    const unitRes = await fetch(`${API_URL}/masters/units`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name: 'PCS', companyId })
    });
    const unit = await unitRes.json();
    unitId = unit.id;
    console.log(`     ✓ Created Unit: ${unit.name}`);

    // Create Stock Group
    const sgRes = await fetch(`${API_URL}/masters/stock-groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name: 'Electronics', companyId })
    });
    const sg = await sgRes.json();
    stockGroupId = sg.id;
    console.log(`     ✓ Created Stock Group: ${sg.name}`);

    // Create Stock Item
    const itemRes = await fetch(`${API_URL}/masters/stock-items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Smart LED TV',
        sku: 'TV-001',
        purchaseRate: 10000,
        sellingRate: 15000,
        openingQty: 100,
        gstPercentage: 18,
        hsnCode: '8528',
        unitId,
        stockGroupId,
        companyId
      })
    });
    const item = await itemRes.json();
    itemId = item.id;
    console.log(`     ✓ Created Stock Item: ${item.name} (Opening Qty: ${item.openingQty})`);

  } catch (error) {
    console.error('❌ Masters Test failed:', error.message);
    process.exit(1);
  }

  // 4. Testing Purchase Voucher
  try {
    console.log('\n4. Testing Purchase Voucher (Inventory Inward)...');
    
    // Purchase 20 TVs at 10,000 INR each (Base: 200,000 INR, GST 18%: 36,000 INR, Total: 236,000 INR)
    const purchRes = await fetch(`${API_URL}/vouchers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        type: 'PURCHASE',
        voucherNo: `PUR-${Date.now()}`,
        narration: 'Purchased 20 Smart LED TVs on credit',
        totalAmount: 200000,
        partyLedgerId: supplierId,
        gstRate: 18,
        partyState: 'Goa',
        companyId,
        entries: [
          { ledgerId: purchaseLedgerId, debitAmount: 236000, creditAmount: 0 },
          { ledgerId: supplierId, debitAmount: 0, creditAmount: 236000 }
        ],
        inventoryEntries: [
          { stockItemId: itemId, qty: 20, rate: 10000, amount: 200000 }
        ]
      })
    });

    const purchase = await purchRes.json();
    if (!purchRes.ok) {
      throw new Error(`Purchase voucher creation failed: ${purchase.error}`);
    }
    console.log(`   ✓ Recorded Purchase Voucher: ${purchase.voucherNo}`);

    // Verify Ledger currentBalance updates (Liabilities balance increases by Credit)
    const checkSupRes = await fetch(`${API_URL}/masters/ledgers?companyId=${companyId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const list = await checkSupRes.json();
    const currentSupplier = list.find(l => l.id === supplierId);
    console.log(`   ✓ Supplier Balance: ${currentSupplier.currentBalance} INR (Expected: 236000)`);
    if (currentSupplier.currentBalance !== 236000) throw new Error('Ledger balance math mismatch!');

    // Verify Stock currentQty incremented (100 + 20 = 120)
    const checkStockRes = await fetch(`${API_URL}/masters/stock-items?companyId=${companyId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const itemsList = await checkStockRes.json();
    const currentItem = itemsList.find(i => i.id === itemId);
    console.log(`   ✓ Stock Quantity: ${currentItem.currentQty} PCS (Expected: 120)`);
    if (currentItem.currentQty !== 120) throw new Error('Stock balance math mismatch!');

  } catch (error) {
    console.error('❌ Purchase Test failed:', error.message);
    process.exit(1);
  }

  // 5. Testing Sales Voucher
  try {
    console.log('\n5. Testing Sales Voucher (Inventory Outward)...');

    // Sell 10 TVs to Ocean Retailers at 15,000 INR each (Base: 150,000 INR, GST 18%: 27,000 INR, Total: 177,000 INR)
    const salesRes = await fetch(`${API_URL}/vouchers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        type: 'SALES',
        voucherNo: `SAL-${Date.now()}`,
        narration: 'Sold 10 Smart LED TVs on credit',
        totalAmount: 150000,
        partyLedgerId: customerId,
        gstRate: 18,
        partyState: 'Goa',
        companyId,
        entries: [
          { ledgerId: customerId, debitAmount: 177000, creditAmount: 0 },
          { ledgerId: salesLedgerId, debitAmount: 0, creditAmount: 177000 }
        ],
        inventoryEntries: [
          { stockItemId: itemId, qty: 10, rate: 15000, amount: 150000 }
        ]
      })
    });

    const sale = await salesRes.json();
    if (!salesRes.ok) {
      throw new Error(`Sales voucher creation failed: ${sale.error}`);
    }
    console.log(`   ✓ Recorded Sales Voucher: ${sale.voucherNo}`);

    // Verify Customer Ledger balance (Assets balance increases by Debit)
    const checkCustRes = await fetch(`${API_URL}/masters/ledgers?companyId=${companyId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const list = await checkCustRes.json();
    const currentCustomer = list.find(l => l.id === customerId);
    console.log(`   ✓ Customer Balance: ${currentCustomer.currentBalance} INR (Expected: 177000)`);
    if (currentCustomer.currentBalance !== 177000) throw new Error('Customer ledger balance math mismatch!');

    // Verify Stock currentQty decremented (120 - 10 = 110)
    const checkStockRes = await fetch(`${API_URL}/masters/stock-items?companyId=${companyId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const itemsList = await checkStockRes.json();
    const currentItem = itemsList.find(i => i.id === itemId);
    console.log(`   ✓ Stock Quantity: ${currentItem.currentQty} PCS (Expected: 110)`);
    if (currentItem.currentQty !== 110) throw new Error('Stock balance math mismatch!');

  } catch (error) {
    console.error('❌ Sales Test failed:', error.message);
    process.exit(1);
  }

  // 6. Testing Reports Modules
  try {
    console.log('\n6. Testing Accounting Reports...');

    // Trial Balance
    const tbRes = await fetch(`${API_URL}/reports/trial-balance?companyId=${companyId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const tb = await tbRes.json();
    console.log(`   ✓ Trial Balance: Debit Sum = ${tb.totalDebit} INR | Credit Sum = ${tb.totalCredit} INR`);
    if (tb.totalDebit !== tb.totalCredit) throw new Error('Trial balance out of sync!');

    // Profit & Loss
    const plRes = await fetch(`${API_URL}/reports/profit-loss?companyId=${companyId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const pl = await plRes.json();
    console.log(`   ✓ Profit & Loss: Revenue = ${pl.totalIncome} INR | Expense = ${pl.totalExpense} INR | Net Profit = ${pl.netProfit} INR`);

    // Balance Sheet
    const bsRes = await fetch(`${API_URL}/reports/balance-sheet?companyId=${companyId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const bs = await bsRes.json();
    console.log(`   ✓ Balance Sheet: Total Assets = ${bs.totalAssets} INR | Total Liabilities = ${bs.totalLiabilities} INR`);
    if (!bs.isBalanced) throw new Error('Balance sheet does not balance!');

    // Stock Summary
    const stockRes = await fetch(`${API_URL}/reports/stock-summary?companyId=${companyId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const stock = await stockRes.json();
    console.log(`   ✓ Stock Summary: Total Valuation = ${stock.totalValuation} INR (Expected: 1,100,000 INR)`);
    if (stock.totalValuation !== 1100000) throw new Error('Stock valuation mismatch!');

    // GST register
    const gstRes = await fetch(`${API_URL}/reports/gst-register?companyId=${companyId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const gst = await gstRes.json();
    console.log(`   ✓ GSTR Summary: CGST = ${gst.totalCGST} INR | SGST = ${gst.totalSGST} INR | IGST = ${gst.totalIGST} INR`);

  } catch (error) {
    console.error('❌ Reports Test failed:', error.message);
    process.exit(1);
  }

  console.log('\n🎉 ALL SMART-ERP FUNCTIONAL INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runTests();
