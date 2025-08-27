#!/usr/bin/env node

// Simple test script to verify Figma MCP is working locally
const { spawn } = require('child_process');
const path = require('path');

console.log('Testing local Figma MCP connection...');

const figmaApiKey = process.env.FIGMA_API_KEY || 'YOUR_FIGMA_API_KEY_HERE';

const mcpProcess = spawn('node', [
  './node_modules/.bin/figma-developer-mcp',
  `--figma-api-key=${figmaApiKey}`,
  '--stdio'
], {
  cwd: __dirname,
  stdio: ['pipe', 'pipe', 'pipe']
});

// Send a simple ping to test the connection
mcpProcess.stdin.write(JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "ping"
}) + '\n');

mcpProcess.stdout.on('data', (data) => {
  console.log('MCP Response:', data.toString());
});

mcpProcess.stderr.on('data', (data) => {
  console.error('MCP Error:', data.toString());
});

mcpProcess.on('close', (code) => {
  console.log(`MCP process exited with code ${code}`);
});

// Clean exit after 5 seconds
setTimeout(() => {
  mcpProcess.kill();
  console.log('Test completed');
}, 5000);