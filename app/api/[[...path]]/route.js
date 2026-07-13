import { NextResponse } from 'next/server';
const MAX_BYTES = 1_000_000;
const TIMEOUT_MS = 10000;

function isPrivateHost(hostname) {
  return hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '0.0.0.0'
    || hostname.startsWith('10.')
    || hostname.startsWith('192.168.')
    || /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
}

export async function POST(request) {
  let url;
  try {
    ({ url } = await request.json());
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only HTTP and HTTPS URLs are supported.');
    if (isPrivateHost(parsed.hostname)) throw new Error('Private and local network URLs are not allowed.');
    url = parsed.toString();
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Invalid URL.' }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'XPro-CodeForge/1.0',
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1',
      },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text') && !contentType.includes('html') && !contentType.includes('xml')) {
      throw new Error('URL did not return text or HTML content.');
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Unable to read response body.');
    const chunks = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_BYTES) throw new Error('Response is too large to import.');
      chunks.push(value);
    }
    const html = new TextDecoder().decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
    return NextResponse.json({ html });
  } catch (error) {
    const message = error.name === 'AbortError' ? 'Request timed out.' : error.message;
    return NextResponse.json({ error: message || 'Fetch failed.' }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
