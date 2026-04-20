import type { PropsWithChildren } from 'react';

type Props = PropsWithChildren<{
  title: string;
  onClose: () => void;
  /** Wider panel for read-only profile / long text. */
  size?: 'default' | 'wide';
}>;

export function AppModal({ title, onClose, children, size = 'default' }: Props) {
  const modalClass = size === 'wide' ? 'crud-modal crud-modal--wide' : 'crud-modal';
  return (
    <div
      className="crud-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crud-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={modalClass} onClick={(e) => e.stopPropagation()}>
        <div className="crud-modal-header">
          <h3 id="crud-modal-title">{title}</h3>
          <button type="button" className="crud-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="crud-modal-body">{children}</div>
      </div>
    </div>
  );
}
