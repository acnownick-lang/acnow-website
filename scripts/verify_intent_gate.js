#!/usr/bin/env node
// scripts/verify_intent_gate.js
// Tests the Chat Assistant's intent gate rules against staging.
// Enforces name: "TEST - IGNORE" for all tests to keep production alerts labeled.

const BASE_URL = process.env.FUNCTION_URL || "https://6a5c477aea4c7f6b34e1a77b--acnowllc-archived.netlify.app";
const CHAT_URL = `${BASE_URL}/.netlify/functions/chat-assistant`;

const testCases = [
  {
    name: "Acceptance Test: Service/Admin Intent",
    payload: {
      action: "prequalify",
      name: "TEST - IGNORE",
      city: "Port St. Lucie",
      issue: "I didn't receive a confirmation of my appointment Wednesday. Can I get that?"
    },
    expectedType: "Customer Service Request",
    expectDiagnostics: false
  },
  {
    name: "Booking Intent",
    payload: {
      action: "prequalify",
      name: "TEST - IGNORE",
      city: "Stuart",
      issue: "Can you schedule a technician to come out next Tuesday morning?"
    },
    expectedType: "Service Booking Request",
    expectDiagnostics: false
  },
  {
    name: "Unrecognized Else-bucket Intent",
    payload: {
      action: "prequalify",
      name: "TEST - IGNORE",
      city: "Palm City",
      issue: "Do Chris and Sean use flat-rate quotes for commercial work?"
    },
    expectedType: "Customer Service Request",
    expectDiagnostics: false
  },
  {
    name: "Cooling Symptom Intent (Standard Prequalification)",
    payload: {
      action: "prequalify",
      name: "TEST - IGNORE",
      city: "Port St. Lucie",
      issue: "AC is blowing warm air and the outside fan isn't spinning"
    },
    expectedType: "Pre-Qualified HVAC Lead",
    expectDiagnostics: true
  }
];

async function runTests() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  A/C Now Chat Intent Gate Verification");
  console.log(`  Target: ${CHAT_URL}`);
  console.log("═══════════════════════════════════════════════════════════\n");

  let passedAll = true;

  for (const tc of testCases) {
    console.log(`Running test: "${tc.name}"...`);
    try {
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Origin": BASE_URL
        },
        body: JSON.stringify(tc.payload)
      });

      if (!res.ok) {
        console.error(`  ❌ HTTP Error: ${res.status}`);
        passedAll = false;
        continue;
      }

      const json = await res.json();
      console.log(`  Response ledgerId: ${json.ledgerId || "None"}`);
      
      const briefing = json.briefing || "";
      const hasDiagSummary = briefing.includes("### Potential Causes:") || briefing.includes("### 2-3 Safe Self-Checks");
      
      console.log(`  Returned Briefing snippet: "${briefing.substring(0, 100).replace(/\n/g, " ")}..."`);
      
      const checkDiag = tc.expectDiagnostics ? hasDiagSummary : !hasDiagSummary;
      
      if (checkDiag) {
        console.log(`  ✅ Diagnostics Check Passed (Expected: ${tc.expectDiagnostics}, Actual: ${hasDiagSummary})`);
      } else {
        console.error(`  ❌ Diagnostics Check Failed (Expected: ${tc.expectDiagnostics}, Actual: ${hasDiagSummary})`);
        passedAll = false;
      }
      console.log();
    } catch (err) {
      console.error("  ❌ Request failed:", err.message);
      passedAll = false;
      console.log();
    }
  }

  if (passedAll) {
    console.log("✅ ALL INTENT GATE TESTS PASSED SUCCESSFULLY.");
    process.exit(0);
  } else {
    console.error("❌ SOME INTENT GATE TESTS FAILED.");
    process.exit(1);
  }
}

runTests();
