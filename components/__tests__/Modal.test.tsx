import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Modal } from '../Modal';

describe('Modal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    url: 'https://quran.com/1',
  };

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<Modal {...defaultProps} isOpen={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders correctly when isOpen is true', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText('Quran.com Reference')).toBeInTheDocument();
    expect(screen.getByTitle('Quran Reference')).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', () => {
    const { container } = render(<Modal {...defaultProps} />);
    // The backdrop is the first div with onClick inside the fixed container
    // We can select it by class
    const backdrop = container.querySelector('.backdrop-blur-sm');
    if (backdrop) {
        fireEvent.click(backdrop);
        expect(defaultProps.onClose).toHaveBeenCalled();
    }
  });
});
