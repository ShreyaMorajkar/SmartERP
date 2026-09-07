const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const SCREENSHOT_DIR = path.resolve(__dirname, '..', 'docs', 'screenshots');
const API_URL = 'http://localhost:5050/api';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function blurFocus(page) {
  await page.evaluate(() => {
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
  });
  await sleep(200);
}

async function clickElementByText(page, tag, text) {
  return page.evaluate((tag, targetText) => {
    const elements = Array.from(document.querySelectorAll(tag));
    const match = elements.find(el => el.innerText && el.innerText.toLowerCase().includes(targetText.toLowerCase()));
    if (match) {
      match.click();
      return true;
    }
    return false;
  }, tag, text);
}

async function seedDataAndCapture() {
  console.log('1. Setting up fresh demo account and accounting data via API...');
  const email = `demo_${Date.now()}@smarterp.com`;
  const password = 'Password@123';
  const name = 'Shreya Morajkar';

  // Register
  const regRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name })
  });
  const authData = await regRes.json();
  const token = authData.token;
  console.log('   ✓ Registered user:', email);

  // Create Company
  const compRes = await fetch(`${API_URL}/companies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: 'Acme Trading Solutions Pvt Ltd',
      state: 'Goa',
      gstin: '30AAAAA1111A1Z1',
      financialYear: '2026-2027',
      address: 'Panaji, Goa, India',
      phone: '+91 98765 43210',
      email: 'contact@acmetrading.com'
    })
  });
  const company = await compRes.json();
  const companyId = company.id;
  console.log('   ✓ Created Company:', company.name);

  // Fetch groups
  const groupRes = await fetch(`${API_URL}/masters/groups?companyId=${companyId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const groups = await groupRes.json();
  const assetsGroup = groups.find(g => g.type === 'ASSET');
  const liabilitiesGroup = groups.find(g => g.type === 'LIABILITY');
  const incomeGroup = groups.find(g => g.type === 'INCOME');
  const expensesGroup = groups.find(g => g.type === 'EXPENSE');

  // Create Ledgers
  const supRes = await fetch(`${API_URL}/masters/ledgers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: 'Sun Distributors Pvt Ltd',
      groupId: liabilitiesGroup.id,
      openingBalance: 0,
      mobile: '+91 98221 11222',
      address: 'Industrial Estate, Goa',
      gstin: '30BBBBB2222B2Z2',
      companyId
    })
  });
  const supplier = await supRes.json();

  const custRes = await fetch(`${API_URL}/masters/ledgers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: 'Ocean Electronics Retailers',
      groupId: assetsGroup.id,
      openingBalance: 0,
      mobile: '+91 94220 33444',
      address: 'Market Road, Margao, Goa',
      gstin: '30CCCCC3333C3Z3',
      companyId
    })
  });
  const customer = await custRes.json();

  const purRes = await fetch(`${API_URL}/masters/ledgers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: 'Purchase A/c', groupId: expensesGroup.id, companyId })
  });
  const purLedger = await purRes.json();

  const salRes = await fetch(`${API_URL}/masters/ledgers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: 'Sales A/c', groupId: incomeGroup.id, companyId })
  });
  const salLedger = await salRes.json();

  // Create Unit & Stock Group
  const unitRes = await fetch(`${API_URL}/masters/units`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: 'PCS', companyId })
  });
  const unit = await unitRes.json();

  const sgRes = await fetch(`${API_URL}/masters/stock-groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: 'Consumer Electronics', companyId })
  });
  const stockGroup = await sgRes.json();

  // Create Stock Items
  const itemRes = await fetch(`${API_URL}/masters/stock-items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: 'Smart 4K LED TV 55"',
      sku: 'TV-55-4K',
      purchaseRate: 25000,
      sellingRate: 35000,
      openingQty: 50,
      gstPercentage: 18,
      hsnCode: '852872',
      unitId: unit.id,
      stockGroupId: stockGroup.id,
      companyId
    })
  });
  const stockItem = await itemRes.json();

  const itemRes2 = await fetch(`${API_URL}/masters/stock-items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: 'Wireless Surround Soundbar',
      sku: 'SND-BAR-01',
      purchaseRate: 6000,
      sellingRate: 9500,
      openingQty: 80,
      gstPercentage: 18,
      hsnCode: '851822',
      unitId: unit.id,
      stockGroupId: stockGroup.id,
      companyId
    })
  });
  const stockItem2 = await itemRes2.json();

  // Create Purchase Voucher (20 TVs at 25,000 = 500,000 INR + 18% GST = 590,000 INR)
  await fetch(`${API_URL}/vouchers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      type: 'PURCHASE',
      voucherNo: `PUR-2026-001`,
      narration: 'Inward purchase of 20 units 4K Smart TVs on 30-day credit term',
      totalAmount: 500000,
      partyLedgerId: supplier.id,
      gstRate: 18,
      partyState: 'Goa',
      companyId,
      entries: [
        { ledgerId: purLedger.id, debitAmount: 590000, creditAmount: 0 },
        { ledgerId: supplier.id, debitAmount: 0, creditAmount: 590000 }
      ],
      inventoryEntries: [
        { stockItemId: stockItem.id, qty: 20, rate: 25000, amount: 500000 }
      ]
    })
  });

  // Create Sales Voucher (15 TVs at 35,000 = 525,000 INR + 18% GST = 619,500 INR)
  await fetch(`${API_URL}/vouchers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      type: 'SALES',
      voucherNo: `INV-2026-101`,
      narration: 'Credit sale of 15 units 4K Smart TVs with GST invoice',
      totalAmount: 525000,
      partyLedgerId: customer.id,
      gstRate: 18,
      partyState: 'Goa',
      companyId,
      entries: [
        { ledgerId: customer.id, debitAmount: 619500, creditAmount: 0 },
        { ledgerId: salLedger.id, debitAmount: 0, creditAmount: 619500 }
      ],
      inventoryEntries: [
        { stockItemId: stockItem.id, qty: 15, rate: 35000, amount: 525000 }
      ]
    })
  });
  console.log('   ✓ Seed complete.');

  // 2. Launch Puppeteer
  console.log('\n2. Launching headless browser to capture real-time screenshots...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // 01. Login Screen (Unauthenticated)
    console.log('   Capturing: 01_login_screen.png');
    await page.goto('http://localhost:3030', { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_login_screen.png') });

    // Set Token and User in localStorage
    await page.evaluate((auth) => {
      localStorage.setItem('token', auth.token);
      localStorage.setItem('user', JSON.stringify(auth.user));
    }, authData);

    // 02. Company Selection Screen
    console.log('   Capturing: 02_company_selection.png');
    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_company_selection.png') });

    // Click to enter company
    console.log('   Entering company console...');
    await clickElementByText(page, 'button', 'Acme Trading Solutions');
    await sleep(1500);

    // 03. Gateway of SmartERP Dashboard
    console.log('   Capturing: 03_gateway_dashboard.png');
    await blurFocus(page);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_gateway_dashboard.png') });

    // 04. Floating Calculator Overlay (F4)
    console.log('   Capturing: 04_calculator_overlay.png');
    await page.keyboard.press('F4');
    await sleep(500);
    await page.keyboard.type('35000*1.18');
    await page.keyboard.press('Enter');
    await sleep(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_calculator_overlay.png') });
    await page.keyboard.press('F4');
    await sleep(400);

    // 05. Command Palette (Ctrl + K)
    console.log('   Capturing: 05_command_palette.png');
    await blurFocus(page);
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyK');
    await page.keyboard.up('Control');
    await sleep(500);
    await page.keyboard.type('Trial Balance');
    await sleep(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_command_palette.png') });
    await page.keyboard.press('Escape');
    await sleep(400);

    // 06. Masters Panel - Ledgers Tab
    console.log('   Capturing: 06_masters_creation_ledgers.png');
    await blurFocus(page);
    await page.keyboard.press('KeyM');
    await sleep(1200);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_masters_creation_ledgers.png') });

    // 07. Masters Panel - Stock Items Tab
    console.log('   Capturing: 07_masters_stock_items.png');
    await clickElementByText(page, 'button', 'STOCK ITEM');
    await sleep(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_masters_stock_items.png') });

    // 08. Voucher Entry - Sales Voucher (F8)
    console.log('   Capturing: 08_voucher_entry_sales.png');
    await blurFocus(page);
    await page.keyboard.press('Escape');
    await sleep(400);
    await blurFocus(page);
    await page.keyboard.press('KeyV');
    await sleep(1200);
    await page.keyboard.press('F8');
    await sleep(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_voucher_entry_sales.png') });

    // 09. Voucher Entry - Purchase Voucher (F9)
    console.log('   Capturing: 09_voucher_entry_purchase.png');
    await page.keyboard.press('F9');
    await sleep(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_voucher_entry_purchase.png') });

    // 10. Reports - Trial Balance
    console.log('   Capturing: 10_trial_balance_report.png');
    await blurFocus(page);
    await page.keyboard.press('Escape');
    await sleep(400);
    await blurFocus(page);
    await page.keyboard.press('KeyT');
    await sleep(1200);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_trial_balance_report.png') });

    // 11. Reports - Profit & Loss
    console.log('   Capturing: 11_profit_loss_report.png');
    await clickElementByText(page, 'button', 'P & L');
    await sleep(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_profit_loss_report.png') });

    // 12. Reports - Balance Sheet
    console.log('   Capturing: 12_balance_sheet_report.png');
    await clickElementByText(page, 'button', 'Bal Sheet');
    await sleep(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12_balance_sheet_report.png') });

    // 13. Reports - Stock Summary
    console.log('   Capturing: 13_stock_summary_report.png');
    await clickElementByText(page, 'button', 'Stock Sum');
    await sleep(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13_stock_summary_report.png') });

    // 14. Reports - GST Tax Register
    console.log('   Capturing: 14_gst_register_report.png');
    await clickElementByText(page, 'button', 'GST Reg');
    await sleep(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '14_gst_register_report.png') });

    console.log('\n🎉 ALL 14 REAL-TIME SCREENSHOTS CAPTURED WITH LIVE DATA!');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
  }
}

seedDataAndCapture();
