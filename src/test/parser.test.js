import { describe, it, expect } from 'vitest';
import { parseReply } from '../utils/parser';

// ── helpers ──────────────────────────────────────────────────────────────────

function wrapTag(tag, obj) {
  return `<${tag}>${JSON.stringify(obj)}</${tag}>`;
}

// ── parseReply — structured tag extraction ────────────────────────────────────

describe('parseReply', () => {
  it('extracts FORM_DATA from a well-formed response', () => {
    const formData = { county: 'Marion', parcel: '123-456' };
    const reply = `Here is your form.\n${wrapTag('FORM_DATA', formData)}`;
    const result = parseReply(reply);
    expect(result.formData).toEqual(formData);
  });

  it('extracts NEXT_ACTIONS from a well-formed response', () => {
    const actions = [{ action: 'File by March 31', deadline: '2025-03-31' }];
    const reply = wrapTag('NEXT_ACTIONS', actions);
    expect(parseReply(reply).nextActions).toEqual(actions);
  });

  it('extracts PROCESS_INFO from a well-formed response', () => {
    const info = { county: 'Hamilton', state: 'IN', deadline: '45 days' };
    const reply = wrapTag('PROCESS_INFO', info);
    expect(parseReply(reply).processInfo).toEqual(info);
  });

  it('extracts all three tags when present together', () => {
    const formData   = { county: 'Marion', parcel: '99-001' };
    const nextActions = [{ action: 'Upload comps' }];
    const processInfo = { state: 'IN' };
    const reply = [
      wrapTag('FORM_DATA', formData),
      wrapTag('NEXT_ACTIONS', nextActions),
      wrapTag('PROCESS_INFO', processInfo),
    ].join('\n');
    const result = parseReply(reply);
    expect(result.formData).toEqual(formData);
    expect(result.nextActions).toEqual(nextActions);
    expect(result.processInfo).toEqual(processInfo);
  });

  it('is case-insensitive for tag names', () => {
    const formData = { county: 'Lake' };
    const reply = `<form_data>${JSON.stringify(formData)}</form_data>`;
    expect(parseReply(reply).formData).toEqual(formData);
  });

  it('tolerates whitespace inside tag brackets', () => {
    const formData = { county: 'Tippecanoe' };
    const reply = `<FORM_DATA >${JSON.stringify(formData)}</ FORM_DATA>`;
    expect(parseReply(reply).formData).toEqual(formData);
  });

  it('returns null for a tag with malformed JSON', () => {
    const reply = '<FORM_DATA>{county: Marion}</FORM_DATA>'; // unquoted key
    expect(parseReply(reply).formData).toBeNull();
  });

  it('returns null when the tag is absent', () => {
    const reply = 'Just a plain narrative response.';
    expect(parseReply(reply).formData).toBeNull();
    expect(parseReply(reply).nextActions).toBeNull();
    expect(parseReply(reply).processInfo).toBeNull();
  });
});

// ── parseReply — truncated response fallback ──────────────────────────────────

describe('parseReply — truncated FORM_DATA fallback', () => {
  it('parses JSON when closing tag is missing', () => {
    const formData = { county: 'Marion', parcel: '123-456' };
    // Simulate Claude cutting off before </FORM_DATA>
    const reply = `<FORM_DATA>${JSON.stringify(formData)}`;
    expect(parseReply(reply).formData).toEqual(formData);
  });

  it('parses nested JSON without a closing tag', () => {
    const formData = { county: 'Floyd', damages: ['roof', 'foundation'] };
    const reply = `<FORM_DATA>${JSON.stringify(formData)}`;
    expect(parseReply(reply).formData).toEqual(formData);
  });

  it('returns null when JSON is also truncated mid-value', () => {
    const reply = '<FORM_DATA>{"county":"Mar';
    expect(parseReply(reply).formData).toBeNull();
  });
});

// ── parseReply — clean text ───────────────────────────────────────────────────

describe('parseReply — clean output', () => {
  it('strips structured tags from the clean field', () => {
    const reply = `Here is your form.\n${wrapTag('FORM_DATA', { county: 'Marion' })}`;
    expect(parseReply(reply).clean).toBe('Here is your form.');
  });

  it('clean field preserves narrative when no tags are present', () => {
    const reply = 'Please provide your parcel number.';
    expect(parseReply(reply).clean).toBe(reply);
  });

  it('strips --- json {...} blocks Claude may emit', () => {
    const reply = 'Summary\n--- json {"key":"val"}';
    expect(parseReply(reply).clean).not.toContain('--- json');
  });
});

// ── parseReply — HTML extraction ──────────────────────────────────────────────

describe('parseReply — HTML extraction', () => {
  it('extracts an HTML block starting with <div>', () => {
    const reply = 'Here is your form:\n<div id="form"><p>Hello</p></div>';
    expect(parseReply(reply).html).toContain('<div');
  });

  it('extracts an HTML block starting with <table>', () => {
    const reply = '<table><tr><td>Value</td></tr></table>';
    expect(parseReply(reply).html).toContain('<table');
  });

  it('returns empty string when no block-level HTML is found', () => {
    const reply = 'Please tell me your parcel number.';
    expect(parseReply(reply).html).toBe('');
  });

  it('returns empty string for narrative-only responses longer than 300 chars', () => {
    const reply = 'A'.repeat(400); // long but no HTML
    expect(parseReply(reply).html).toBe('');
  });

  it('strips markdown code fences before extracting HTML', () => {
    const reply = '```html\n<div>content</div>\n```';
    expect(parseReply(reply).html).toBe('<div>content</div>');
  });
});
