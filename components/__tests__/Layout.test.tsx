import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Layout } from '../Layout';

// Mock the global __APP_VERSION__
declare global {
  var __APP_VERSION__: string;
}

globalThis.__APP_VERSION__ = '1.0.0';

describe('Layout Component', () => {
  it('renders children correctly', () => {
    render(
      <Layout>
        <div>Test child content</div>
      </Layout>
    );

    expect(screen.getByText('Test child content')).toBeInTheDocument();
  });

  it('renders header with app name', () => {
    render(
      <Layout>
        <div>Content</div>
      </Layout>
    );

    expect(screen.getByText('Sahabat Quran')).toBeInTheDocument();
  });

  it('displays version number in header', () => {
    render(
      <Layout>
        <div>Content</div>
      </Layout>
    );

    expect(screen.getByText(/v1.0.0 Powered by AI/)).toBeInTheDocument();
  });

  it('renders footer with attribution', () => {
    render(
      <Layout>
        <div>Content</div>
      </Layout>
    );

    expect(screen.getByText(/Terintegrasi dengan Quran.com & Gemini AI/)).toBeInTheDocument();
    expect(screen.getByText(/© 2025 Sahabat Quran Project/)).toBeInTheDocument();
  });

  it('has proper semantic structure', () => {
    const { container } = render(
      <Layout>
        <div>Content</div>
      </Layout>
    );

    expect(container.querySelector('header')).toBeInTheDocument();
    expect(container.querySelector('main')).toBeInTheDocument();
    expect(container.querySelector('footer')).toBeInTheDocument();
  });

  it('applies responsive classes correctly', () => {
    const { container } = render(
      <Layout>
        <div>Content</div>
      </Layout>
    );

    const header = container.querySelector('header');
    expect(header).toHaveClass('hidden', 'lg:block');

    const footer = container.querySelector('footer');
    expect(footer).toHaveClass('hidden', 'lg:block');
  });

  it('has accessible logo with aria-hidden', () => {
    const { container } = render(
      <Layout>
        <div>Content</div>
      </Layout>
    );

    const logo = container.querySelector('[aria-hidden="true"]');
    expect(logo).toBeInTheDocument();
  });

  it('includes screen reader text', () => {
    render(
      <Layout>
        <div>Content</div>
      </Layout>
    );

    const srText = screen.getByText('Aplikasi Pencarian Ayat Al-Quran Terpercaya');
    expect(srText).toHaveClass('sr-only');
  });
});
