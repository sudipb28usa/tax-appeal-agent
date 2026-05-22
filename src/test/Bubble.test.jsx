import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Bubble } from '../components/Bubble';

describe('Bubble', () => {
  it('renders user message text', () => {
    render(<Bubble role="user" content="Hello there" />);
    expect(screen.getByText('Hello there')).toBeInTheDocument();
  });

  it('renders assistant message text', () => {
    render(<Bubble role="assistant" content="I can help you." />);
    expect(screen.getByText(/I can help you\./i)).toBeInTheDocument();
  });

  it('renders bold markdown as <strong> for assistant messages', () => {
    const { container } = render(<Bubble role="assistant" content="**bold text**" />);
    expect(container.querySelector('strong')).toBeInTheDocument();
    expect(container.querySelector('strong').textContent).toBe('bold text');
  });

  it('renders italic markdown as <em> for assistant messages', () => {
    const { container } = render(<Bubble role="assistant" content="*italic text*" />);
    expect(container.querySelector('em')).toBeInTheDocument();
  });

  it('renders bullet list items for assistant messages', () => {
    const { container } = render(<Bubble role="assistant" content="- item one" />);
    expect(container.textContent).toContain('• item one');
  });

  it('shows streaming cursor when streaming prop is true', () => {
    const { container } = render(<Bubble role="assistant" content="Loading…" streaming />);
    expect(container.textContent).toContain('▋');
  });

  it('does not show streaming cursor when streaming is false', () => {
    const { container } = render(<Bubble role="assistant" content="Done." />);
    expect(container.textContent).not.toContain('▋');
  });

  it('escapes HTML in user messages (XSS protection)', () => {
    const { container } = render(<Bubble role="user" content="<script>alert(1)</script>" />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('<script>');
  });

  it('shows the agent avatar icon for assistant messages', () => {
    const { container } = render(<Bubble role="assistant" content="Hello" />);
    expect(container.textContent).toContain('⚖');
  });

  it('does not show the agent avatar for user messages', () => {
    const { container } = render(<Bubble role="user" content="Hello" />);
    expect(container.textContent).not.toContain('⚖');
  });
});
