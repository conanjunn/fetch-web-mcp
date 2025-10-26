#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
import TurndownService from 'turndown';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logFile = path.join(__dirname, 'mcp-fetch.log');

// Log helper function
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logFile, logMessage);
  console.error(message);
}

// Initialize Turndown service for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
});

/**
 * Clean HTML to extract main content and remove noise
 * @param {string} html - The raw HTML content
 * @returns {string} - Cleaned HTML with main content only
 */
function cleanHtml(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  // Remove unwanted elements that add noise
  const selectorsToRemove = [
    'script', // JavaScript code
    'style', // CSS styles
    'noscript', // Noscript content
    'iframe', // Iframes
    'nav', // Navigation menus
    'header', // Page headers
    'footer', // Page footers
    'aside', // Sidebars
    '.sidebar', // Sidebar classes
    '.advertisement', // Ads
    '.ad', // Ads
    '.banner', // Banners
    '.cookie-banner', // Cookie notices
    '.social-share', // Social sharing buttons
    '.comments', // Comment sections
    '[role="banner"]', // Banner role
    '[role="navigation"]', // Navigation role
    '[role="complementary"]', // Complementary role
    'form', // Forms (usually login/search)
  ];

  selectorsToRemove.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => el.remove());
  });

  // Try to find main content area
  let mainContent =
    document.querySelector('main') ||
    document.querySelector('[role="main"]') ||
    document.querySelector('article') ||
    document.querySelector('.content') ||
    document.querySelector('.main-content') ||
    document.querySelector('#content') ||
    document.querySelector('#main-content') ||
    document.body;

  return mainContent.innerHTML;
}

// Create MCP server with tools capability
const server = new Server(
  {
    name: 'mcp-fetch',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Fetch HTML content from a URL and convert to Markdown
 * @param {string} url - The URL to fetch
 * @param {boolean} useProxy - Whether to use proxy (default: false)
 */
async function webFetch(url, useProxy = false) {
  try {
    new URL(url);
  } catch (error) {
    throw new McpError(ErrorCode.InvalidRequest, `Invalid URL: ${url}`);
  }

  // Set proxy if requested
  const originalProxy = process.env.HTTPS_PROXY;
  if (useProxy) {
    process.env.HTTPS_PROXY = 'socks5://127.0.0.1:7897';
    log(`[mcp-fetch] Using proxy for: ${url}`);
  } else {
    delete process.env.HTTPS_PROXY;
    log(`[mcp-fetch] Fetching without proxy: ${url}`);
  }

  try {
    const response = await fetch(url, {
      timeout: 30000, // 30 seconds
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new McpError(
        ErrorCode.InternalError,
        `HTTP error: ${response.status} ${response.statusText}`
      );
    }

    const html = await response.text();

    // Clean HTML to extract main content
    const cleanedHtml = cleanHtml(html);
    log(
      `[mcp-fetch] Cleaned HTML from ${html.length} to ${cleanedHtml.length} chars`
    );

    // Convert HTML to Markdown
    const markdown = turndownService.turndown(cleanedHtml);

    log(
      `[mcp-fetch] Successfully converted to Markdown (${markdown.length} chars)`
    );

    log(`${markdown}`);

    return markdown;
  } catch (error) {
    log(`[mcp-fetch] Error: ${error.message}`);
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to fetch webpage: ${error.message}`
    );
  } finally {
    // Restore original proxy setting
    if (originalProxy !== undefined) {
      process.env.HTTPS_PROXY = originalProxy;
    } else {
      delete process.env.HTTPS_PROXY;
    }
  }
}

/**
 * Handle tools/list requests
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'web-fetch',
        description:
          'Fetch the HTML content of a webpage and convert it to Markdown format. Provide a URL and this tool will make an HTTP request, retrieve the HTML, and return it as clean, readable Markdown text.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description:
                'The complete URL of the webpage to fetch (HTTP or HTTPS)',
            },
            useProxy: {
              type: 'boolean',
              description:
                'Whether to use SOCKS5 proxy (127.0.0.1:7897) for the request. Set to true only when explicitly requested by the user.',
              default: false,
            },
          },
          required: ['url'],
        },
      },
    ],
  };
});

/**
 * Handle tools/call requests
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'web-fetch') {
    const url = request.params.arguments?.url;
    const useProxy = request.params.arguments?.useProxy ?? false;

    if (!url || typeof url !== 'string') {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Missing required parameter: url'
      );
    }

    const markdown = await webFetch(url, useProxy);

    return {
      content: [
        {
          type: 'text',
          text: markdown,
        },
      ],
    };
  }

  throw new McpError(
    ErrorCode.MethodNotFound,
    `Unknown tool: ${request.params.name}`
  );
});

/**
 * Start the MCP server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log('[mcp-fetch] Server started');
}

main().catch((error) => {
  log(`[mcp-fetch] Failed to start: ${error.message}`);
  process.exit(1);
});
