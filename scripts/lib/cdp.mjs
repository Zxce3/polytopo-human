// Minimal Chrome DevTools Protocol driver (no dependencies; needs Node 22+ and Chrome).
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch({ port = 9444, args = [] } = {}) {
	const chromeBin = process.env.CHROME || 'google-chrome';
	const dir = mkdtempSync(join(tmpdir(), 'polytopo-chrome-'));
	const proc = spawn(
		chromeBin,
		['--headless=new', '--no-sandbox', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`,
			'--autoplay-policy=no-user-gesture-required', ...args, 'about:blank'],
		{ stdio: 'ignore' }
	);
	let tabs;
	for (let i = 0; i < 40; i++) {
		try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await sleep(250); }
	}
	if (!tabs) throw new Error('Chrome did not start');
	const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
	await new Promise((r) => (ws.onopen = r));
	let id = 0;
	const pend = new Map();
	const listeners = [];
	ws.onmessage = (e) => {
		const m = JSON.parse(e.data);
		if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
		else if (m.method) listeners.forEach((l) => l(m));
	};
	const send = (method, params = {}) =>
		new Promise((res, rej) => {
			const i = ++id;
			pend.set(i, (m) => (m.error ? rej(new Error(m.error.message)) : res(m.result)));
			ws.send(JSON.stringify({ id: i, method, params }));
		});
	const ev = async (expression) => {
		const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
		if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
		return r.result?.value;
	};
	await send('Page.enable');
	await send('Runtime.enable');
	await send('Log.enable');
	await send('Network.enable');
	return {
		send, ev, on: (fn) => listeners.push(fn),
		close: () => { try { ws.close(); } catch {} proc.kill(); },
	};
}
