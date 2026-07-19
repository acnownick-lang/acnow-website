#!/usr/bin/env node
// scripts/verify_lead_ledger.js
// Verification script: fires a test lead submission to the staging/prod function,
// then reads the blob record back from the Netlify "leads" store and prints it.
//
// Usage:
//   FUNCTION_URL=https://xxx.netlify.app node scripts/verify_lead_ledger.js
//   FUNCTION_URL=https://acnowllc.com     node scripts/verify_lead_ledger.js

const { execSync } = require("child_process");

const BASE = process.env.FUNCTION_URL || "https://acnowllc.com";
const FUNCTION_URL = `${BASE}/.netlify/functions/submit-lead`;

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  A/C Now Lead Ledger Verification");
  console.log(`  Target: ${FUNCTION_URL}`);
  console.log("═══════════════════════════════════════════════════════════\n");

  // Step 1: Fire a test lead submission
  console.log("Step 1 — Submitting test lead...");
  const testPayload = {
    fname: "LedgerTest",
    lname: "Verification",
    tel: "7725551234",
    email: "ledger-test@acnowllc.com",
    city: "Port St. Lucie",
    message: "AUTOMATED LEDGER VERIFICATION — safe to ignore",
  };

  let ledgerId;
  try {
    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Origin": BASE,
      },
      body: JSON.stringify(testPayload),
    });

    const json = await res.json();
    console.log(`  HTTP ${res.status}: ${JSON.stringify(json)}`);

    if (!res.ok || !json.success) {
      console.error("  ❌ Function returned error — aborting blob verification.");
      process.exit(1);
    }

    ledgerId = json.ledgerId;
    if (!ledgerId) {
      console.error("  ❌ No ledgerId in response — blob may not be configured on this deploy.");
      process.exit(1);
    }

    console.log(`  ✅ Function returned ledgerId: ${ledgerId}\n`);
  } catch (err) {
    console.error("  ❌ Fetch error:", err.message);
    process.exit(1);
  }

  // Step 2: Read the blob record back via Netlify CLI
  console.log("Step 2 — Reading blob record from Netlify \"leads\" store...");
  console.log(`  Command: netlify blobs get leads "${ledgerId}"\n`);

  try {
    const output = execSync(
      `npx netlify-cli@17 blobs:get leads "${ledgerId}" 2>&1`,
      { cwd: process.cwd(), encoding: "utf8", timeout: 30000 }
    );

    let parsed;
    try {
      // CLI may prefix with non-JSON lines — extract the JSON block
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON object found in output");
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.log("  Raw CLI output:\n", output);
      console.error("  ⚠️  Could not parse JSON from blob output:", e.message);
      process.exit(1);
    }

    console.log("═══════════════════════════════════════════════════════════");
    console.log("  BLOB RECORD RETRIEVED:");
    console.log("═══════════════════════════════════════════════════════════");
    console.log(JSON.stringify(parsed, null, 2));
    console.log("═══════════════════════════════════════════════════════════\n");

    // Verify structure
    const ok = {
      hasLeadId:    parsed.leadId === ledgerId,
      hasTimestamp: typeof parsed.timestamp === "string",
      hasSource:    parsed.source === "submit-lead",
      hasFields:    typeof parsed.fields === "object" && parsed.fields.name === "LedgerTest Verification",
      hasDelivery:  typeof parsed.delivery === "object",
      resendStatus: ["sent", "failed"].includes(parsed.delivery?.resend?.status),
      discordStatus:["sent", "failed"].includes(parsed.delivery?.discord?.status),
    };

    console.log("  Checks:");
    for (const [check, pass] of Object.entries(ok)) {
      console.log(`    ${pass ? "✅" : "❌"} ${check}`);
    }

    const allPass = Object.values(ok).every(Boolean);
    console.log(`\n  Result: ${allPass ? "✅ ALL CHECKS PASS — ledger is durable and correct." : "❌ SOME CHECKS FAILED."}`);
    console.log(`  Resend delivery: ${parsed.delivery?.resend?.status ?? "unknown"}`);
    console.log(`  Discord delivery: ${parsed.delivery?.discord?.status ?? "unknown"}`);
    if (parsed.delivery?.resend?.error) console.log(`  Resend error: ${parsed.delivery.resend.error}`);
    if (parsed.delivery?.discord?.error) console.log(`  Discord error: ${parsed.delivery.discord.error}`);

    process.exit(allPass ? 0 : 1);
  } catch (err) {
    console.error("  ❌ Netlify CLI blob read failed:", err.message);
    console.error("     Make sure you are authenticated: netlify login");
    process.exit(1);
  }
}

main();
