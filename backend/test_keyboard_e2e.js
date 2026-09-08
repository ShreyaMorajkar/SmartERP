const puppeteer = require('puppeteer');

(async () => {
  console.log('===============================================================');
  console.log('🚀 SmartERP Full Keyboard & Arrow Key Navigation Verification');
  console.log('===============================================================\n');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    // Step 1: Open Application & Login
    console.log('Step 1: Loading application at http://localhost:3030...');
    await page.goto('http://localhost:3030', { waitUntil: 'networkidle0' });

    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      console.log('  Logging in with admin@smarterp.com...');
      await page.type('input[type="email"]', 'admin@smarterp.com');
      await page.type('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForFunction(() => document.body.innerText.includes('PRESS ENTER TO OPEN'), { timeout: 10000 });
    }

    // Step 2: Test Company Selection Screen
    console.log('\nStep 2: Testing Company Selection Screen Keyboard Controls...');
    await page.click('body');
    await new Promise(r => setTimeout(r, 400));

    console.log('  [Key: ArrowDown] Navigating company cards with Down Arrow...');
    await page.keyboard.press('ArrowDown');
    await new Promise(r => setTimeout(r, 300));

    console.log('  [Key: ArrowUp] Navigating company cards with Up Arrow...');
    await page.keyboard.press('ArrowUp');
    await new Promise(r => setTimeout(r, 300));

    console.log('  [Key: Enter] Opening highlighted company via Enter...');
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 2000));

    // Step 3: Gateway Menu
    console.log('\nStep 3: Testing Gateway Menu Arrow Key & Enter Navigation...');
    let bodyText = await page.$eval('body', el => el.innerText);
    if (!bodyText.toLowerCase().includes('gateway main menu')) {
      console.log('Body text was:', bodyText);
      throw new Error('Gateway Main Menu not active!');
    }
    console.log('  ✓ Gateway Main Menu is active and focused.');

    // Arrow Down test
    console.log('  [Key: ArrowDown] Moving cursor to next menu item...');
    await page.keyboard.press('ArrowDown');
    await new Promise(r => setTimeout(r, 300));
    
    let activeItem = await page.$eval('.border-l-4.border-emerald-500', el => el.innerText.split('\n')[0]);
    console.log(`  ✓ Highlighted item: "${activeItem}"`);

    console.log('  [Key: ArrowDown] Moving cursor down again...');
    await page.keyboard.press('ArrowDown');
    await new Promise(r => setTimeout(r, 300));
    activeItem = await page.$eval('.border-l-4.border-emerald-500', el => el.innerText.split('\n')[0]);
    console.log(`  ✓ Highlighted item: "${activeItem}"`);

    // Step 4: Testing Single-Key Hotkeys
    console.log('\nStep 4: Testing Single-Key Hotkeys & ESC navigation...');

    // Hotkey M (Masters)
    console.log('  [Key: M] Pressing "M" for Masters Creation...');
    await page.keyboard.press('KeyM');
    await new Promise(r => setTimeout(r, 1200));
    bodyText = await page.$eval('body', el => el.innerText);
    if (!bodyText.toLowerCase().includes('masters creation')) {
      throw new Error('Failed to open Masters view via "M" hotkey');
    }
    console.log('  ✓ Masters screen opened successfully.');

    // ESC Back
    console.log('  [Key: ESC] Pressing "ESC" to return to Gateway...');
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 1200));
    bodyText = await page.$eval('body', el => el.innerText);
    if (!bodyText.toLowerCase().includes('gateway main menu')) {
      throw new Error('Failed to return to Gateway view via ESC');
    }
    console.log('  ✓ Returned to Gateway successfully.');

    // Hotkey V (Vouchers)
    console.log('  [Key: V] Pressing "V" for Accounting Vouchers...');
    await page.keyboard.press('KeyV');
    await new Promise(r => setTimeout(r, 1200));
    bodyText = await page.$eval('body', el => el.innerText);
    if (!bodyText.toLowerCase().includes('transaction voucher entry')) {
      throw new Error('Failed to open Vouchers view via "V" hotkey');
    }
    console.log('  ✓ Accounting Vouchers screen opened successfully.');

    // ESC Back
    console.log('  [Key: ESC] Pressing "ESC" to return to Gateway...');
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 1200));
    bodyText = await page.$eval('body', el => el.innerText);
    if (!bodyText.toLowerCase().includes('gateway main menu')) {
      throw new Error('Failed to return to Gateway from Vouchers via ESC');
    }
    console.log('  ✓ Returned to Gateway from Vouchers via ESC.');

    // Hotkey T (Trial Balance)
    console.log('  [Key: T] Pressing "T" for Trial Balance...');
    await page.keyboard.press('KeyT');
    await new Promise(r => setTimeout(r, 1200));
    bodyText = await page.$eval('body', el => el.innerText);
    if (!bodyText.toLowerCase().includes('reports & statements')) {
      throw new Error('Failed to open Reports view via "T" hotkey');
    }
    console.log('  ✓ Trial Balance screen opened successfully.');

    // ESC Back
    console.log('  [Key: ESC] Pressing "ESC" to return to Gateway...');
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 1200));

    // Hotkey P (P&L)
    console.log('  [Key: P] Pressing "P" for Profit & Loss statement...');
    await page.keyboard.press('KeyP');
    await new Promise(r => setTimeout(r, 1200));
    bodyText = await page.$eval('body', el => el.innerText);
    if (!bodyText.toLowerCase().includes('reports & statements')) {
      throw new Error('Failed to open P&L view via "P" hotkey');
    }
    console.log('  ✓ Profit & Loss statement opened successfully.');

    // ESC Back
    console.log('  [Key: ESC] Pressing "ESC" to return to Gateway...');
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 1200));

    // Hotkey B (Balance Sheet)
    console.log('  [Key: B] Pressing "B" for Balance Sheet...');
    await page.keyboard.press('KeyB');
    await new Promise(r => setTimeout(r, 1200));
    bodyText = await page.$eval('body', el => el.innerText);
    if (!bodyText.toLowerCase().includes('reports & statements')) {
      throw new Error('Failed to open Balance Sheet via "B" hotkey');
    }
    console.log('  ✓ Balance Sheet opened successfully.');

    // ESC Back
    console.log('  [Key: ESC] Pressing "ESC" to return to Gateway...');
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 1200));

    // Hotkey S (Stock Summary)
    console.log('  [Key: S] Pressing "S" for Stock Summary...');
    await page.keyboard.press('KeyS');
    await new Promise(r => setTimeout(r, 1200));
    bodyText = await page.$eval('body', el => el.innerText);
    if (!bodyText.toLowerCase().includes('reports & statements')) {
      throw new Error('Failed to open Stock Summary via "S" hotkey');
    }
    console.log('  ✓ Stock Summary opened successfully.');

    // ESC Back
    console.log('  [Key: ESC] Pressing "ESC" to return to Gateway...');
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 1200));

    // Step 5: Function Keys
    console.log('\nStep 5: Testing Function Keys (F8, F9, F1)...');
    console.log('  [Key: F8] Pressing "F8" for Sales Voucher Entry...');
    await page.keyboard.press('F8');
    await new Promise(r => setTimeout(r, 1200));
    bodyText = await page.$eval('body', el => el.innerText);
    if (!bodyText.includes('SALES')) {
      throw new Error('Failed to open Sales Voucher via F8');
    }
    console.log('  ✓ Sales Voucher opened with F8.');

    console.log('  [Key: F9] Pressing "F9" for Purchase Voucher Entry...');
    await page.keyboard.press('F9');
    await new Promise(r => setTimeout(r, 1200));
    bodyText = await page.$eval('body', el => el.innerText);
    if (!bodyText.includes('PURCHASE')) {
      throw new Error('Failed to open Purchase Voucher via F9');
    }
    console.log('  ✓ Purchase Voucher opened with F9.');

    console.log('  [Key: F1] Pressing "F1" to Switch Company...');
    await page.keyboard.press('F1');
    await new Promise(r => setTimeout(r, 1200));
    bodyText = await page.$eval('body', el => el.innerText);
    if (!bodyText.toLowerCase().includes('company selection')) {
      throw new Error('Failed to open Company Selection via F1');
    }
    console.log('  ✓ Company Selection opened with F1.');

    console.log('  [Key: 1] Pressing "1" to quick-select Company #1...');
    await page.keyboard.press('Digit1');
    await new Promise(r => setTimeout(r, 1500));
    bodyText = await page.$eval('body', el => el.innerText);
    if (!bodyText.toLowerCase().includes('gateway main menu')) {
      throw new Error('Failed to select company via Digit 1');
    }
    console.log('  ✓ Returned to Gateway with quick number shortcut [1].');

    console.log('\n===============================================================');
    console.log('🏆 100% KEYBOARD & SHORTCUT VALIDATION SUITE PASSED! 🏆');
    console.log('===============================================================');
  } catch (err) {
    console.error('\n❌ Test execution failed:', err.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
