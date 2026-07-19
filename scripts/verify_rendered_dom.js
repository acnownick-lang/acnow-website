#!/usr/bin/env node
// scripts/verify_rendered_dom.js
// Automates Puppeteer verification of frontend forms on staging.
// Checks existence, optionality, defaults, and min date properties on rendered DOM.

const puppeteer = require("puppeteer");

const BASE_URL = process.env.FUNCTION_URL || "https://acnowllc-archived.netlify.app"; // Fallback URL, will be replaced with actual draft URL.

const pagesToTest = [
  {
    name: "Homepage",
    path: "/",
    formSelector: "#hp-general-contact-form",
    fields: [
      { selector: "[name='email']", expectedOptional: true },
      { selector: "#preferred-date", expectedOptional: true, checkMinDate: true },
      { selector: "#preferred-time", expectedOptional: true, expectedDefault: "First Available" }
    ]
  },
  {
    name: "AC Repair",
    path: "/ac-repair/",
    formSelector: "#repair-request-form",
    fields: [
      { selector: "[name='email']", expectedOptional: true },
      { selector: "#preferred-date", expectedOptional: true, checkMinDate: true },
      { selector: "#preferred-time", expectedOptional: true, expectedDefault: "First Available" }
    ]
  },
  {
    name: "AC Installation",
    path: "/ac-installation/",
    formSelector: "#installation-estimate-form",
    fields: [
      { selector: "[name='email']", expectedOptional: true },
      { selector: "#preferred-date", expectedOptional: true, checkMinDate: true },
      { selector: "#preferred-time", expectedOptional: true, expectedDefault: "First Available" }
    ]
  },
  {
    name: "AC Maintenance",
    path: "/ac-maintenance/",
    formSelector: "#maintenance-request-form",
    fields: [
      { selector: "[name='email']", expectedOptional: true },
      { selector: "#preferred-date", expectedOptional: true, checkMinDate: true },
      { selector: "#preferred-time", expectedOptional: true, expectedDefault: "First Available" }
    ]
  },
  {
    name: "Pool Heating",
    path: "/pool-heating/",
    formSelector: "#pool-heating-form",
    fields: [
      { selector: "[name='email']", expectedOptional: true },
      { selector: "#preferred-date-pool", expectedOptional: true, checkMinDate: true },
      { selector: "#preferred-time-pool", expectedOptional: true, expectedDefault: "First Available" }
    ]
  },
  {
    name: "Contact Us (Calendar Widget / Optional Email)",
    path: "/contact-us/",
    formSelector: "#contact-general-form",
    fields: [
      { selector: "[name='email']", expectedOptional: true }
    ]
  }
];

async function main() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  
  const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
  console.log(`═══════════════════════════════════════════════════════════`);
  console.log(`  A/C Now Frontend DOM Verification`);
  console.log(`  Target: ${BASE_URL}`);
  console.log(`  Today's Date: ${todayStr}`);
  console.log(`═══════════════════════════════════════════════════════════\n`);

  let allPassed = true;

  try {
    for (const pageInfo of pagesToTest) {
      console.log(`Checking ${pageInfo.name} page at ${BASE_URL}${pageInfo.path}...`);
      const page = await browser.newPage();
      await page.goto(`${BASE_URL}${pageInfo.path}`, { waitUntil: "domcontentloaded", timeout: 20000 });

      // Verify form exists
      const formExists = await page.$(pageInfo.formSelector);
      if (!formExists) {
        console.error(`  ❌ Form not found: "${pageInfo.formSelector}"`);
        allPassed = false;
        await page.close();
        continue;
      }
      console.log(`  ✅ Form found: "${pageInfo.formSelector}"`);

      // Verify fields
      for (const field of pageInfo.fields) {
        const inputHandle = await page.$(field.selector);
        if (!inputHandle) {
          console.error(`  ❌ Field not found: "${field.selector}"`);
          allPassed = false;
          continue;
        }
        
        // Check optionality
        const isRequired = await page.evaluate(el => el.required, inputHandle);
        if (field.expectedOptional && isRequired) {
          console.error(`  ❌ Field "${field.selector}" is marked REQUIRED but should be OPTIONAL.`);
          allPassed = false;
        } else {
          console.log(`  ✅ Field "${field.selector}" is OPTIONAL.`);
        }

        // Check defaults
        if (field.expectedDefault !== undefined) {
          const val = await page.evaluate(el => el.value, inputHandle);
          if (val !== field.expectedDefault) {
            console.error(`  ❌ Field "${field.selector}" default value is "${val}" but expected "${field.expectedDefault}".`);
            allPassed = false;
          } else {
            console.log(`  ✅ Field "${field.selector}" defaults to "${field.expectedDefault}".`);
          }
        }

        // Check min date
        if (field.checkMinDate) {
          const minVal = await page.evaluate(el => el.getAttribute("min"), inputHandle);
          if (minVal !== todayStr) {
            console.error(`  ❌ Field "${field.selector}" min attribute is "${minVal}" but expected "${todayStr}".`);
            allPassed = false;
          } else {
            console.log(`  ✅ Field "${field.selector}" min attribute correctly set to today ("${todayStr}").`);
          }
        }
      }
      console.log();
      await page.close();
    }
  } catch (err) {
    console.error("  ❌ Test execution error:", err.message);
    allPassed = false;
  } finally {
    await browser.close();
  }

  if (allPassed) {
    console.log("✅ ALL RENDERED DOM TESTS PASSED SUCCESSFULLY.");
    process.exit(0);
  } else {
    console.error("❌ SOME RENDERED DOM TESTS FAILED.");
    process.exit(1);
  }
}

main();
