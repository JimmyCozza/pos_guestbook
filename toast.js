import { chromium } from 'playwright';

const debug = true;

const TOAST_LOGIN_URL = 'https://auth.toasttab.com/u/login';

//Hardcode these for now.  We can add something to interpret the selectors later, even a simple prompt to an AI model
const TOAST_EMAIL_FIELD = 'input[name="username"]';
const TOAST_NEXT_BUTTON = 'button[type="submit"]';
const TOAST_PASSWORD_FIELD = 'input[name="password"]';

//We can define something like this mapping for each POS.  Makes conveting a .csv into a json object easier
//and self-contained per POS
export const columnMapping = {
  'Customer ID': 'customerId',
  'First Name': 'firstName',
  'Last Name': 'lastName',
  'Email': 'email',
  'Phone': 'phone',
  '# of Visits': 'numberOfVisits',
  'Gross Amount': 'grossAmount'
}

export async function login(username, password) {
  const browser = await chromium.launch({ headless: !debug, slowMo: debug ? 100 : 0 });
  const page = await browser.newPage();

  try {
    await page.goto(TOAST_LOGIN_URL);
    if (debug) {
      page.on('response', async response => {
        console.log(`${response.status()} ${response.url()}`);
        if (response.status() === 400 || response.status() === 401) {
          console.log('Response body:', await response.text());
        }
      })
      page.on('request', request => {
        console.log(`${request.method()} ${request.url()}`);
      });

      console.log('Opening Playwright Inspector - press Play to continue');
      // await page.pause();
    }

    //INFO: Toast has a 2 part login flow.  We need to submit the email first,
    //they respond with the entire new HTML for the login page with password field.  Then we need to submit that again
    await page.fill(TOAST_EMAIL_FIELD, username);
    await page.click(TOAST_NEXT_BUTTON, {
      waitUntil: 'networkidle',
    });

    await page.waitForSelector(TOAST_PASSWORD_FIELD);

    await page.fill(TOAST_PASSWORD_FIELD, password);
    await page.click(TOAST_NEXT_BUTTON, {
      waitUntil: 'networkidle',
    });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');

    return { page, browser };
  } catch (e) {

  }
}

export async function buildReport(page, days = '730') {
  try {
    await page.goto('https://www.toasttab.com/restaurants/admin/reports/guest');
    await page.waitForLoadState('networkidle');

    const onboardingChecklist = await page.locator('div[id="single-spa-application:toast-onboarding-checklist-spa"]');
    if (onboardingChecklist.isVisible()) {
      await page.click('[data-testid="header-close-button"]');
    }

    const moreFiltersButton = await page.locator('button', {
      hasText: 'More Filters'
    }).first();
    await moreFiltersButton.click();



    await page.waitForSelector('#lastVisitDate-button');
    await page.click('#lastVisitDate-button');

    //INFO: Make sure this days is a string btw.
    await page.fill('[data-testid="lastVisitDate-max-input"]', days);

    await page.click('[data-testid="apply-filters-button"]');

    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');

    return true;
  } catch (error) {
    console.error('Error building report:', error);
    throw error;
  }
}

export async function downloadReport(page) {
  try {

    const downloadListButton = await page.locator('button', {
      hasText: 'Download list'
    }).first();
    await downloadListButton.click();

    await page.waitForSelector('button:has-text("Agree and continue")');
    await page.click('button:has-text("Agree and continue")');

    await page.click('[data-testid="download-modal-close-icon"]');

    await page.close();

    return true;
  } catch (error) {
    console.error('Error initiating report download:', error);
    throw error;
  }
}
