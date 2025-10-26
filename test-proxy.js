#!/usr/bin/env node

import fetch from "node-fetch";

const url = "https://github.com/kazuph/mcp-fetch";

console.log("Testing proxy connection...");
console.log(`URL: ${url}`);
console.log(`Proxy: socks5://127.0.0.1:7897`);
console.log("");

// Set proxy
process.env.HTTPS_PROXY = "socks5://127.0.0.1:7897";

try {
  console.log("Fetching...");
  const startTime = Date.now();

  const response = await fetch(url, {
    timeout: 30000, // 30 seconds
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
  });

  const elapsed = Date.now() - startTime;
  console.log(`✓ Response received in ${elapsed}ms`);
  console.log(`Status: ${response.status} ${response.statusText}`);

  if (response.ok) {
    const html = await response.text();
    console.log(`Content length: ${html.length} characters`);
    console.log(`First 200 chars: ${html.substring(0, 200)}...`);
  }
} catch (error) {
  console.error(`✗ Error: ${error.message}`);
  console.error(`Error code: ${error.code}`);
  console.error(`Error type: ${error.type}`);
}
