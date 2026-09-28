// Minimal MCP (Model Context Protocol) client over stdio JSON-RPC 2.0.
// Servers in config.json → mcp.servers are exposed as tools named mcp__<server>__<tool>.
import { spawn } from 'node:child_process';
import { registerTool, truncate } from '../tools/registry.js';
import { config } from '../config.js';

class McpConnection {
  constructor(name, { command, args = [], env = {}, cwd }) {
    this.name = name;
    this.child = spawn(command, args, { env: { ...process.env, ...env }, cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    this.pending = new Map(); this.nextId = 1; this.buffer = '';
    this.child.stdout.on('data', d => this.onData(d.toString()));
    this.child.stderr.on('data', d => { if (config.debug) process.stderr.write(`[mcp:${name}] ${d}`); });
    this.child.on('close', code => { for (const [, p] of this.pending) p.reject(new Error(`MCP server ${name} exited (${code})`)); this.pending.clear(); });
  }
  onData(chunk) {
    this.buffer += chunk;
    let idx;
    while ((idx = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, idx).trim(); this.buffer = this.buffer.slice(idx + 1);
      if (!line) continue;
      let msg; try { msg = JSON.parse(line); } catch { continue; }
      if (msg.id !== undefined && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id); this.pending.delete(msg.id);
        msg.error ? p.reject(new Error(msg.error.message ?? JSON.stringify(msg.error))) : p.resolve(msg.result);
      }
    }
  }
  request(method, params = {}, timeoutMs = 60000) {
    const id = this.nextId++;
    this.child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => { this.pending.delete(id); reject(new Error(`MCP ${method} timed out`)); }, timeoutMs);
      this.pending.set(id, { resolve: v => { clearTimeout(t); resolve(v); }, reject: e => { clearTimeout(t); reject(e); } });
    });
  }
  notify(method, params = {}) { this.child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n'); }
  async initialize() {
    await this.request('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'skilled-agent', version: '0.2.0' } });
    this.notify('notifications/initialized');
    return (await this.request('tools/list')).tools ?? [];
  }
  async callTool(name, args) {
    const res = await this.request('tools/call', { name, arguments: args ?? {} }, 120000);
    return (res.isError ? 'ERROR: ' : '') + (res.content ?? []).map(c => c.type === 'text' ? c.text : `[${c.type}]`).join('\n');
  }
  close() { try { this.child.kill(); } catch {} }
}

const connections = new Map();

export async function connectMcpServers(log = () => {}) {
  for (const [name, spec] of Object.entries(config.mcp.servers)) {
    if (name.startsWith('_') || spec.disabled) continue;
    try {
      const conn = new McpConnection(name, spec);
      const tools = await conn.initialize();
      connections.set(name, conn);
      for (const t of tools) {
        registerTool({
          name: `mcp__${name}__${t.name}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64),
          description: `[MCP:${name}] ${t.description ?? t.name}`,
          parameters: t.inputSchema ?? { type: 'object', properties: {} },
          async run(args) { return truncate(await conn.callTool(t.name, args)); },
        });
      }
      log(`MCP server "${name}" connected: ${tools.length} tools`);
    } catch (e) { log(`MCP server "${name}" failed: ${e.message}`); }
  }
}
export function closeMcp() { for (const c of connections.values()) c.close(); connections.clear(); }
export function mcpStatus() { return [...connections.keys()]; }
