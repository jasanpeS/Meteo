// test.mjs
import { chromium } from 'playwright';

(async () => {
  let browser;
  let page;
  const results = {
    loadPage: { pass: false, errors: [], consoleMessages: [] },
    geolocationButton: { pass: false, lat: '', lon: '', alertMessage: '', consoleMessages: [] },
    manualInputFetch: { pass: false, consoleMessages: [] },
    verifyData: { pass: false, weatherTableContent: '', airInfoContent: '', consoleMessages: [] },
  };

  try {
    console.log('Launching browser...');
    browser = await chromium.launch({ headless: true }); // Or use firefox, webkit
    const context = await browser.newContext({
      geolocation: { latitude: 52.52, longitude: 13.39 }, // Mock geolocation for testing
      permissions: ['geolocation']
    });
    page = await context.newPage();

    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      console.log(`CONSOLE [${type}]: ${text}`);
      // Store all console messages for each relevant step
      if (results.loadPage.pass === false && results.geolocationButton.pass === false && results.manualInputFetch.pass === false && results.verifyData.pass === false) {
        results.loadPage.consoleMessages.push(`[${type}] ${text}`);
      } else if (results.geolocationButton.pass === false && results.manualInputFetch.pass === false && results.verifyData.pass === false) {
         results.geolocationButton.consoleMessages.push(`[${type}] ${text}`);
      } else if (results.manualInputFetch.pass === true && results.verifyData.pass === false) {
        results.verifyData.consoleMessages.push(`[${type}] ${text}`);
      } else {
        results.manualInputFetch.consoleMessages.push(`[${type}] ${text}`);
      }
      // Specifically look for script execution errors
      if (type === 'error' && !text.includes('Failed to load resource')) { // Ignore network errors for now
        results.loadPage.errors.push(text);
      }
    });
    
    page.on('dialog', async dialog => {
        console.log(`DIALOG: ${dialog.message()}`);
        results.geolocationButton.alertMessage = dialog.message();
        await dialog.dismiss();
    });

    // 1. Load index.html
    console.log('Loading index.html...');
    await page.goto('file:///app/index.html', { waitUntil: 'networkidle' });
    results.loadPage.pass = results.loadPage.errors.length === 0;
    console.log(`Page loaded. Success: ${results.loadPage.pass}`);

    // 2. Test Geolocation Button
    console.log('Testing Geolocation button...');
    await page.click('#btnGeo');
    await page.waitForTimeout(1000); // Wait for potential async operations
    results.geolocationButton.lat = await page.inputValue('#lat');
    results.geolocationButton.lon = await page.inputValue('#lon');
    if (results.geolocationButton.lat && results.geolocationButton.lon) {
        results.geolocationButton.pass = true;
    } else if (results.geolocationButton.alertMessage) {
        // If an alert appeared, it means the button worked but geolocation might be blocked/unsupported
        // This can be considered a partial pass or a specific known behavior.
        results.geolocationButton.pass = `Alert shown: ${results.geolocationButton.alertMessage}`;
    }
    console.log(`Geolocation button test. Pass: ${results.geolocationButton.pass}, Lat: ${results.geolocationButton.lat}, Lon: ${results.geolocationButton.lon}, Alert: ${results.geolocationButton.alertMessage}`);


    // 3. Test Manual Input and Fetch
    console.log('Testing manual input and fetch...');
    await page.fill('#lat', '40.4168');
    await page.fill('#lon', '-3.7038');
    await page.click('#btnFetch');
    console.log('Waiting for API calls (10 seconds)...');
    await page.waitForTimeout(10000); // Wait for APIs
    results.manualInputFetch.pass = true; // Assume pass if click is successful, data verification is next.
    console.log(`Manual input and fetch. Success: ${results.manualInputFetch.pass}`);

    // 4. Verify Data Display
    console.log('Verifying data display...');
    results.verifyData.weatherTableContent = await page.innerHTML('#weather-table');
    results.verifyData.airInfoContent = await page.innerHTML('#air-info');

    const weatherRows = await page.locator('#weather-table tr').count();
    const airInfoParagraphs = await page.locator('#air-info p').count();

    if (weatherRows > 1 && !results.verifyData.weatherTableContent.includes('Cargando...') && !results.verifyData.weatherTableContent.includes('Error...')) {
      results.verifyData.pass = true;
    } else {
      results.verifyData.pass = false;
      console.log(`Weather table check failed. Rows: ${weatherRows}, Content: ${results.verifyData.weatherTableContent.substring(0,100)}`);
    }

    if (results.verifyData.pass && airInfoParagraphs > 0 && !results.verifyData.airInfoContent.includes('Cargando...') && !results.verifyData.airInfoContent.includes('Error...')) {
      results.verifyData.pass = true;
    } else {
      results.verifyData.pass = false;
      console.log(`Air info check failed. Paragraphs: ${airInfoParagraphs}, Content: ${results.verifyData.airInfoContent.substring(0,100)}`);
    }
    console.log(`Data verification. Success: ${results.verifyData.pass}`);

  } catch (error) {
    console.error('Error during Playwright test:', error);
    // Store error in a relevant part of results if possible, or general error
  } finally {
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
    }
    // Output results
    console.log('\n--- Test Summary ---');
    console.log(`1. Load index.html: ${results.loadPage.pass ? 'PASS' : 'FAIL'}`);
    if (results.loadPage.errors.length > 0) console.log(`   Errors: ${results.loadPage.errors.join(', ')}`);
    if (results.loadPage.consoleMessages.length > 0) console.log(`   Console: \n     ${results.loadPage.consoleMessages.join('\n     ')}`);
    
    console.log(`2. Geolocation Button: ${results.geolocationButton.pass === true ? 'PASS (values populated)' : results.geolocationButton.pass ? `PASS (${results.geolocationButton.pass})` : 'FAIL'}`);
    console.log(`   Lat: ${results.geolocationButton.lat}, Lon: ${results.geolocationButton.lon}`);
    if (results.geolocationButton.alertMessage) console.log(`   Alert: ${results.geolocationButton.alertMessage}`);
    if (results.geolocationButton.consoleMessages.length > 0) console.log(`   Console: \n     ${results.geolocationButton.consoleMessages.join('\n     ')}`);

    console.log(`3. Manual Input & Fetch: ${results.manualInputFetch.pass ? 'PASS (action attempted)' : 'FAIL'}`);
    if (results.manualInputFetch.consoleMessages.length > 0) console.log(`   Console: \n     ${results.manualInputFetch.consoleMessages.join('\n     ')}`);

    console.log(`4. Verify Data Display: ${results.verifyData.pass ? 'PASS' : 'FAIL'}`);
    if (!results.verifyData.pass) {
        console.log('   Weather Table Content (first 100 chars):', results.verifyData.weatherTableContent.substring(0, 100) + '...');
        console.log('   Air Info Content (first 100 chars):', results.verifyData.airInfoContent.substring(0, 100) + '...');
    }
    if (results.verifyData.consoleMessages.length > 0) console.log(`   Console during/after fetch: \n     ${results.verifyData.consoleMessages.join('\n     ')}`);
  }
})();
