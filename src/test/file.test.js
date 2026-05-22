import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { readB64 } from '../utils/file';

const RESOURCES = resolve(__dirname, 'resources');

function makeFile(filename, mimeType) {
  const buf = readFileSync(resolve(RESOURCES, filename));
  return new File([buf], filename, { type: mimeType });
}

describe('readB64 — real test files', () => {
  it('base64-encodes the appeal form PDF', async () => {
    const file = makeFile('Notice To Initiate An Appeal (SECURED).pdf', 'application/pdf');
    const b64 = await readB64(file);

    // Must be a non-empty base64 string (no data-URL prefix).
    expect(typeof b64).toBe('string');
    expect(b64.length).toBeGreaterThan(100);
    expect(b64).not.toContain('data:');
    expect(b64).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it('base64-encodes the assessment notice JPG', async () => {
    const file = makeFile('Notice.jpg', 'image/jpeg');
    const b64 = await readB64(file);

    expect(typeof b64).toBe('string');
    expect(b64.length).toBeGreaterThan(100);
    expect(b64).not.toContain('data:');
    expect(b64).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it('round-trips: decoded base64 matches original file bytes', async () => {
    const filename = 'Notice.jpg';
    const originalBuf = readFileSync(resolve(RESOURCES, filename));
    const file = makeFile(filename, 'image/jpeg');

    const b64 = await readB64(file);
    const decoded = Buffer.from(b64, 'base64');

    expect(decoded.length).toBe(originalBuf.length);
    expect(decoded.equals(originalBuf)).toBe(true);
  });

  it('PDF round-trip: decoded base64 matches original file bytes', async () => {
    const filename = 'Notice To Initiate An Appeal (SECURED).pdf';
    const originalBuf = readFileSync(resolve(RESOURCES, filename));
    const file = makeFile(filename, 'application/pdf');

    const b64 = await readB64(file);
    const decoded = Buffer.from(b64, 'base64');

    expect(decoded.length).toBe(originalBuf.length);
    expect(decoded.equals(originalBuf)).toBe(true);
  });

  it('PDF starts with PDF magic bytes after decoding', async () => {
    const file = makeFile('Notice To Initiate An Appeal (SECURED).pdf', 'application/pdf');
    const b64 = await readB64(file);
    const decoded = Buffer.from(b64, 'base64');
    // All valid PDFs begin with the bytes for "%PDF"
    expect(decoded.slice(0, 4).toString('ascii')).toBe('%PDF');
  });

  it('JPG starts with JPEG magic bytes after decoding', async () => {
    const file = makeFile('Notice.jpg', 'image/jpeg');
    const b64 = await readB64(file);
    const decoded = Buffer.from(b64, 'base64');
    // JPEG magic: FF D8 FF
    expect(decoded[0]).toBe(0xff);
    expect(decoded[1]).toBe(0xd8);
    expect(decoded[2]).toBe(0xff);
  });
});
