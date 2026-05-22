/**
 * Integration tests: real test-resource files → mocked Claude → parseReply → AppealForm render.
 *
 * callClaude is mocked so no network calls are made.
 * The mock response mirrors what Claude actually returns for Indiana tax documents.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import { parseReply } from '../utils/parser';
import { AppealForm } from '../components/AppealForm';
import { readB64 } from '../utils/file';

// ── Mock callClaude so tests never hit the network ────────────────────────────

vi.mock('../api/claude', () => ({
  callClaude: vi.fn(),
}));
import { callClaude } from '../api/claude';

// ── Shared fixtures ───────────────────────────────────────────────────────────

const RESOURCES = resolve(__dirname, 'resources');

function makeFile(filename, mimeType) {
  const buf = readFileSync(resolve(RESOURCES, filename));
  return new File([buf], filename, { type: mimeType });
}

// Realistic Claude response modelled on Indiana Form 130 / Form 11 documents.
const MOCK_CLAUDE_RESPONSE = `
I have reviewed both documents.

<FORM_DATA>
{
  "county": "Marion",
  "township": "Center",
  "parcel": "1014-0087-0231",
  "assessment_year": "2024",
  "owner_name": "John D. Taxpayer",
  "owner_phone": "317-555-0199",
  "owner_email": "jtaxpayer@email.com",
  "property_address": "4521 Maple Ave, Indianapolis, IN 46205",
  "legal_description": "Lot 12 Block 3 Broad Ripple Park",
  "state_form_number": "53958 R9/4-26",
  "previous_land_av": "62000",
  "previous_improvements_av": "138000",
  "previous_total_av": "200000",
  "new_land_av": "68000",
  "new_improvements_av": "162000",
  "new_total_av": "230000",
  "increase_amount": "30000",
  "increase_pct": "15",
  "requested_land": "62000",
  "requested_improvements": "138000",
  "requested_total": "200000",
  "written_reasons": "The assessed value of $230,000 exceeds the property's fair market value. Comparable sales in the neighborhood averaged $195,000 during the assessment period.",
  "damages": [],
  "burden_of_proof": true
}
</FORM_DATA>

<PROCESS_INFO>
{
  "county": "Marion",
  "state": "IN",
  "deadline": "June 15, 2024",
  "filing_office": "Marion County Assessor's Office",
  "address": "200 E. Washington St, Suite 1360, Indianapolis, IN 46204",
  "phone": "317-327-4907"
}
</PROCESS_INFO>

<NEXT_ACTIONS>
[
  { "action": "File Form 130 with Marion County Assessor by June 15, 2024", "deadline": "2024-06-15", "priority": "high" },
  { "action": "Gather 3–5 comparable sales from the same neighborhood", "deadline": null, "priority": "medium" },
  { "action": "Request a copy of the property record card from the assessor", "deadline": null, "priority": "medium" }
]
</NEXT_ACTIONS>
`.trim();

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('integration — file loading', () => {
  it('loads the appeal form PDF as a File object', () => {
    const file = makeFile('Notice To Initiate An Appeal (SECURED).pdf', 'application/pdf');
    expect(file.name).toBe('Notice To Initiate An Appeal (SECURED).pdf');
    expect(file.type).toBe('application/pdf');
    expect(file.size).toBeGreaterThan(0);
  });

  it('loads the assessment notice JPG as a File object', () => {
    const file = makeFile('Notice.jpg', 'image/jpeg');
    expect(file.name).toBe('Notice.jpg');
    expect(file.type).toBe('image/jpeg');
    expect(file.size).toBeGreaterThan(0);
  });

  it('base64-encodes both files successfully', async () => {
    const pdfFile = makeFile('Notice To Initiate An Appeal (SECURED).pdf', 'application/pdf');
    const jpgFile = makeFile('Notice.jpg', 'image/jpeg');

    const [pdfB64, jpgB64] = await Promise.all([readB64(pdfFile), readB64(jpgFile)]);

    expect(pdfB64.length).toBeGreaterThan(1000);
    expect(jpgB64.length).toBeGreaterThan(1000);
  });
});

describe('integration — mocked Claude pipeline', () => {
  beforeEach(() => {
    callClaude.mockResolvedValue(MOCK_CLAUDE_RESPONSE);
  });

  it('callClaude mock resolves with the structured response', async () => {
    const result = await callClaude([], '', () => {});
    expect(result).toContain('<FORM_DATA>');
    expect(result).toContain('<PROCESS_INFO>');
    expect(result).toContain('<NEXT_ACTIONS>');
  });

  it('parseReply extracts formData from the mock response', () => {
    const parsed = parseReply(MOCK_CLAUDE_RESPONSE);
    expect(parsed.formData).not.toBeNull();
    expect(parsed.formData.county).toBe('Marion');
    expect(parsed.formData.parcel).toBe('1014-0087-0231');
    expect(parsed.formData.owner_name).toBe('John D. Taxpayer');
  });

  it('parseReply extracts the correct AV figures', () => {
    const { formData } = parseReply(MOCK_CLAUDE_RESPONSE);
    expect(formData.previous_total_av).toBe('200000');
    expect(formData.new_total_av).toBe('230000');
    expect(formData.requested_total).toBe('200000');
    expect(formData.increase_amount).toBe('30000');
    expect(formData.increase_pct).toBe('15');
  });

  it('parseReply extracts processInfo with county and deadline', () => {
    const { processInfo } = parseReply(MOCK_CLAUDE_RESPONSE);
    expect(processInfo.county).toBe('Marion');
    expect(processInfo.state).toBe('IN');
    expect(processInfo.deadline).toBe('June 15, 2024');
  });

  it('parseReply extracts nextActions as an array', () => {
    const { nextActions } = parseReply(MOCK_CLAUDE_RESPONSE);
    expect(Array.isArray(nextActions)).toBe(true);
    expect(nextActions.length).toBe(3);
    expect(nextActions[0].priority).toBe('high');
  });

  it('clean field contains no structured tags', () => {
    const { clean } = parseReply(MOCK_CLAUDE_RESPONSE);
    expect(clean).not.toContain('<FORM_DATA>');
    expect(clean).not.toContain('<PROCESS_INFO>');
    expect(clean).not.toContain('<NEXT_ACTIONS>');
  });

  it('html field is empty (no block-level HTML in mock response)', () => {
    const { html } = parseReply(MOCK_CLAUDE_RESPONSE);
    expect(html).toBe('');
  });
});

describe('integration — AppealForm render from parsed response', () => {
  it('renders AppealForm with data extracted from the mock Claude response', () => {
    const { formData } = parseReply(MOCK_CLAUDE_RESPONSE);
    render(<AppealForm formData={formData} />);

    expect(screen.getAllByText(/Marion/i).length).toBeGreaterThan(0);
    expect(screen.getByText('1014-0087-0231')).toBeInTheDocument();
    expect(screen.getAllByText(/John D\. Taxpayer/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/JANUARY 1, 2024/i)).toBeInTheDocument();
    expect(screen.getByText('FORM 130')).toBeInTheDocument();
  });

  it('renders assessed values formatted as dollars', () => {
    const { formData } = parseReply(MOCK_CLAUDE_RESPONSE);
    render(<AppealForm formData={formData} />);

    expect(screen.getAllByText('$200,000').length).toBeGreaterThan(0); // previous + requested
    expect(screen.getAllByText('$230,000').length).toBeGreaterThan(0); // new assessment
  });

  it('shows the 15% increase in the net change row', () => {
    const { formData } = parseReply(MOCK_CLAUDE_RESPONSE);
    render(<AppealForm formData={formData} />);
    expect(screen.getByText(/15%/)).toBeInTheDocument();
  });

  it('renders the written reasons', () => {
    const { formData } = parseReply(MOCK_CLAUDE_RESPONSE);
    render(<AppealForm formData={formData} />);
    expect(screen.getByText(/exceeds the property's fair market value/i)).toBeInTheDocument();
  });

  it('shows the burden-of-proof notice when increase > 5%', () => {
    const { formData } = parseReply(MOCK_CLAUDE_RESPONSE);
    render(<AppealForm formData={formData} />);
    // Appears in both the section-4 notice and the certification footer.
    expect(screen.getAllByText(/burden of proof/i).length).toBeGreaterThan(0);
  });
});
