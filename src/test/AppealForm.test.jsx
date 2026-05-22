import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppealForm } from '../components/AppealForm';

const FULL_FORM_DATA = {
  county: 'Marion',
  township: 'Center',
  parcel: '1098-0023-0045',
  assessment_year: '2024',
  owner_name: 'Jane Smith',
  owner_phone: '317-555-0100',
  owner_email: 'jane@example.com',
  increase_amount: '30000',
  property_address: '123 Main St, Indianapolis, IN 46201',
  legal_description: 'Lot 7 Block 4 Broad Ripple Addition',
  previous_land_av: '50000',
  previous_improvements_av: '120000',
  previous_total_av: '170000',
  new_land_av: '55000',
  new_improvements_av: '145000',
  new_total_av: '200000',
  requested_land: '50000',
  requested_improvements: '120000',
  requested_total: '170000',
  written_reasons: 'Assessment exceeds fair market value based on comparable sales.',
};

describe('AppealForm', () => {
  it('renders without crashing when given full formData', () => {
    render(<AppealForm formData={FULL_FORM_DATA} />);
  });

  it('renders without crashing when formData is empty', () => {
    render(<AppealForm formData={{}} />);
  });

  it('renders without crashing when formData is null', () => {
    render(<AppealForm formData={null} />);
  });

  it('displays the county name', () => {
    render(<AppealForm formData={FULL_FORM_DATA} />);
    expect(screen.getAllByText(/Marion/i).length).toBeGreaterThan(0);
  });

  it('displays the parcel number', () => {
    render(<AppealForm formData={FULL_FORM_DATA} />);
    expect(screen.getByText('1098-0023-0045')).toBeInTheDocument();
  });

  it('displays the owner name', () => {
    render(<AppealForm formData={FULL_FORM_DATA} />);
    // Owner name appears in both the petition info and the signature sections.
    expect(screen.getAllByText('Jane Smith').length).toBeGreaterThan(0);
  });

  it('formats dollar values with $ and commas', () => {
    render(<AppealForm formData={FULL_FORM_DATA} />);
    // $200,000 for new_total_av
    expect(screen.getAllByText('$200,000').length).toBeGreaterThan(0);
  });

  it('shows JANUARY 1 and the assessment year in the header', () => {
    render(<AppealForm formData={FULL_FORM_DATA} />);
    expect(screen.getByText(/JANUARY 1, 2024/i)).toBeInTheDocument();
  });

  it('falls back to new_total_av when current_total field is absent', () => {
    render(<AppealForm formData={{ ...FULL_FORM_DATA, current_total: undefined }} />);
    expect(screen.getAllByText('$200,000').length).toBeGreaterThan(0);
  });

  it('supports legacy current_total field name', () => {
    const legacyData = { ...FULL_FORM_DATA, new_total_av: undefined, current_total: '195000' };
    render(<AppealForm formData={legacyData} />);
    expect(screen.getAllByText('$195,000').length).toBeGreaterThan(0);
  });

  it('shows the print button', () => {
    render(<AppealForm formData={FULL_FORM_DATA} />);
    expect(screen.getByRole('button', { name: /print/i })).toBeInTheDocument();
  });

  it('shows FORM 130 in the header', () => {
    render(<AppealForm formData={FULL_FORM_DATA} />);
    expect(screen.getByText('FORM 130')).toBeInTheDocument();
  });

  it('shows FOR OFFICE USE ONLY in the header', () => {
    render(<AppealForm formData={FULL_FORM_DATA} />);
    expect(screen.getByText('FOR OFFICE USE ONLY')).toBeInTheDocument();
  });

  it('displays the written reasons', () => {
    render(<AppealForm formData={FULL_FORM_DATA} />);
    expect(screen.getByText(/Assessment exceeds fair market value/i)).toBeInTheDocument();
  });

  it('displays damage items from the damages array', () => {
    const data = { ...FULL_FORM_DATA, written_reasons: '', damages: ['Roof damage', 'Mold in basement'] };
    render(<AppealForm formData={data} />);
    expect(screen.getByText(/Roof damage/i)).toBeInTheDocument();
    expect(screen.getByText(/Mold in basement/i)).toBeInTheDocument();
  });

  it('shows increase_amount in the net change row', () => {
    render(<AppealForm formData={FULL_FORM_DATA} />);
    // increase_amount renders as "Amount: $30,000" inside the net change cell.
    expect(screen.getByText(/Amount:.*\$30,000/)).toBeInTheDocument();
  });
});
