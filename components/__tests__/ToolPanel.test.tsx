import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ToolPanel } from '../ToolPanel';

describe('ToolPanel Component', () => {
  it('renders without crashing', () => {
    render(<ToolPanel />);
    expect(screen.getByText('Available MCP Tools')).toBeInTheDocument();
  });

  it('displays all three tools', () => {
    render(<ToolPanel />);

    expect(screen.getByText('search_verse')).toBeInTheDocument();
    expect(screen.getByText('get_ayah_details')).toBeInTheDocument();
    expect(screen.getByText('get_surah_info')).toBeInTheDocument();
  });

  it('shows tool descriptions', () => {
    render(<ToolPanel />);

    expect(screen.getByText(/Finds verses by keyword/)).toBeInTheDocument();
    expect(screen.getByText(/Retrieves Uthmani script/)).toBeInTheDocument();
    expect(screen.getByText(/Full chapter metadata/)).toBeInTheDocument();
  });

  it('displays SRE status section', () => {
    render(<ToolPanel />);

    expect(screen.getByText('SRE Status')).toBeInTheDocument();
    expect(screen.getByText('System Healthy')).toBeInTheDocument();
  });

  it('shows system metrics', () => {
    render(<ToolPanel />);

    expect(screen.getByText('Latency')).toBeInTheDocument();
    expect(screen.getByText('42ms')).toBeInTheDocument();
    expect(screen.getByText('Uptime')).toBeInTheDocument();
    expect(screen.getByText('99.99%')).toBeInTheDocument();
  });

  it('renders tool icons', () => {
    render(<ToolPanel />);

    expect(screen.getByText('🔍')).toBeInTheDocument();
    expect(screen.getByText('📖')).toBeInTheDocument();
    expect(screen.getByText('📜')).toBeInTheDocument();
  });
});
