import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const CLAUDE_BIN = process.env.ASK_CLAUDE_BIN || 'claude';

function readJsonBody(req) {
  return new Promise((resolveBody, reject) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 1_000_000) reject(new Error('payload too large'));
    });
    req.on('end', () => {
      try {
        resolveBody(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sseFrame(event, data) {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  if (event && event !== 'message') {
    return `event: ${event}\ndata: ${payload}\n\n`;
  }
  return `data: ${payload}\n\n`;
}

export default function askBridge() {
  return {
    name: 'ask-bridge',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/ask', async (req, res, next) => {
        if (req.method !== 'POST') return next();

        let body;
        try {
          body = await readJsonBody(req);
        } catch (err) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: String(err.message || err) }));
          return;
        }

        const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
        const sessionId = typeof body.sessionId === 'string' ? body.sessionId : null;
        if (!prompt) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'empty prompt' }));
          return;
        }

        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        });
        res.write(sseFrame('open', { ok: true }));

        const args = [
          '-p',
          '--output-format', 'stream-json',
          '--verbose',
          '--include-partial-messages',
          '--permission-mode', 'bypassPermissions',
        ];
        if (sessionId) args.push('--resume', sessionId);
        args.push(prompt);

        const childEnv = { ...process.env };
        for (const key of Object.keys(childEnv)) {
          if (key === 'CLAUDECODE' || key.startsWith('CLAUDE_CODE_')) {
            delete childEnv[key];
          }
        }

        let child;
        try {
          child = spawn(CLAUDE_BIN, args, {
            cwd: REPO_ROOT,
            stdio: ['ignore', 'pipe', 'pipe'],
            env: childEnv,
          });
        } catch (err) {
          res.write(sseFrame('error', { message: String(err.message || err) }));
          res.end();
          return;
        }

        let stdoutBuf = '';
        child.stdout.setEncoding('utf8');
        child.stdout.on('data', (chunk) => {
          stdoutBuf += chunk;
          const lines = stdoutBuf.split('\n');
          stdoutBuf = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            res.write(`data: ${trimmed}\n\n`);
          }
        });

        child.stderr.setEncoding('utf8');
        child.stderr.on('data', (chunk) => {
          res.write(sseFrame('stderr', chunk));
        });

        child.on('error', (err) => {
          res.write(sseFrame('error', { message: String(err.message || err) }));
          res.end();
        });

        child.on('close', (code, signal) => {
          if (stdoutBuf.trim()) {
            res.write(`data: ${stdoutBuf.trim()}\n\n`);
            stdoutBuf = '';
          }
          res.write(sseFrame('done', { code, signal }));
          res.end();
        });

        req.on('close', () => {
          if (!child.killed) child.kill('SIGTERM');
        });
      });
    },
  };
}
