import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import ConfirmDialog from '@/components/ConfirmDialog';

afterEach(() => {
    cleanup();
});

describe('ConfirmDialog', () => {
    const defaultProps = {
        open: true,
        title: 'Borrar cuenta',
        message: 'Esto es permanente.',
        confirmLabel: 'Confirmar',
        cancelLabel: 'Cancelar',
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
    };

    it('renders nothing when closed', () => {
        const { container } = render(
            <ConfirmDialog {...defaultProps} open={false} />,
        );
        expect(container.innerHTML).toBe('');
    });

    it('renders title and message when open', () => {
        const { getByText } = render(<ConfirmDialog {...defaultProps} />);
        expect(getByText('Borrar cuenta')).toBeInTheDocument();
        expect(getByText('Esto es permanente.')).toBeInTheDocument();
    });

    it('renders confirm and cancel buttons', () => {
        const { getByText } = render(<ConfirmDialog {...defaultProps} />);
        expect(getByText('Confirmar')).toBeInTheDocument();
        expect(getByText('Cancelar')).toBeInTheDocument();
    });

    it('calls onConfirm when confirm button clicked', () => {
        const onConfirm = vi.fn();
        const { getByText } = render(
            <ConfirmDialog {...defaultProps} onConfirm={onConfirm} />,
        );
        fireEvent.click(getByText('Confirmar'));
        expect(onConfirm).toHaveBeenCalledOnce();
    });

    it('calls onCancel when cancel button clicked', () => {
        const onCancel = vi.fn();
        const { getByText } = render(
            <ConfirmDialog {...defaultProps} onCancel={onCancel} />,
        );
        fireEvent.click(getByText('Cancelar'));
        expect(onCancel).toHaveBeenCalledOnce();
    });

    it('calls onCancel when backdrop clicked', () => {
        const onCancel = vi.fn();
        const { container } = render(
            <ConfirmDialog {...defaultProps} onCancel={onCancel} />,
        );
        const backdrop = container.querySelector('.confirm-dialog-backdrop');
        fireEvent.click(backdrop!);
        expect(onCancel).toHaveBeenCalledOnce();
    });

    it('calls onCancel on Escape key', () => {
        const onCancel = vi.fn();
        render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onCancel).toHaveBeenCalledOnce();
    });

    it('disables buttons when loading', () => {
        const { getByText } = render(
            <ConfirmDialog {...defaultProps} loading={true} />,
        );
        expect(getByText('...')).toBeDisabled();
        expect(getByText('Cancelar')).toBeDisabled();
    });

    it('applies danger class by default', () => {
        const { getByText } = render(<ConfirmDialog {...defaultProps} />);
        expect(getByText('Confirmar').className).toContain('danger');
    });

    it('applies primary class when not destructive', () => {
        const { getByText } = render(
            <ConfirmDialog {...defaultProps} destructive={false} />,
        );
        expect(getByText('Confirmar').className).toContain('primary');
        expect(getByText('Confirmar').className).not.toContain('danger');
    });
});
