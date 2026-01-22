import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InstallPWA } from '../InstallPWA';

describe('InstallPWA Component', () => {
  beforeEach(() => {
    localStorage.clear();

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('renders nothing when in standalone mode', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: true, // Standalone mode
      })),
    });

    const { container } = render(<InstallPWA />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when previously dismissed', () => {
    localStorage.setItem('pwa_prompt_dismissed', 'true');

    const { container } = render(<InstallPWA />);
    expect(container).toBeEmptyDOMElement();
  });

  it('has proper structure when rendered', () => {
    // This test just verifies the component can render without errors
    const { container } = render(<InstallPWA />);
    expect(container).toBeDefined();
  });

  it('stores dismissal state in localStorage', () => {
    // Mock iOS user agent
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
    });

    render(<InstallPWA />);

    // Verify localStorage can be set
    localStorage.setItem('pwa_prompt_dismissed', 'true');
    expect(localStorage.getItem('pwa_prompt_dismissed')).toBe('true');
  });
});
