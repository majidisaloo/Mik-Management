import { useEffect, useRef } from 'react';

const buildActionClassName = (variant = 'ghost') => {
  return ['modal__action', variant ? `modal__action--${variant}` : ''].filter(Boolean).join(' ');
};

const renderActions = (actions) => {
  if (!actions) {
    return null;
  }

  if (Array.isArray(actions)) {
    const entries = actions.filter(Boolean).map((action, index) => {
      const {
        label,
        variant = 'ghost',
        type = 'button',
        form,
        onClick,
        disabled,
        autoFocus,
        key
      } = action;

      return (
        <button
          key={key ?? `${variant}-${label ?? 'action'}-${index}`}
          type={type}
          form={form}
          onClick={onClick}
          disabled={disabled}
          autoFocus={autoFocus}
          className={buildActionClassName(variant)}
        >
          {label}
        </button>
      );
    });

    return entries.length ? entries : null;
  }

  return actions;
};

const Modal = ({ title, description, children, actions, onClose, open = true }) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previouslyFocused = document.activeElement;
    const dialog = dialogRef.current;

    if (dialog) {
      const focusable = dialog.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusable) {
        focusable.focus();
      } else {
        dialog.focus();
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      if (previouslyFocused && previouslyFocused.focus) {
        previouslyFocused.focus();
      }
    };
  }, [onClose, open]);

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const labelId = `${title?.replace(/\s+/g, '-').toLowerCase() || 'modal'}-heading`;

  if (!open) {
    return null;
  }

  const renderedActions = renderActions(actions);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby={labelId} onClick={handleBackdropClick}>
      <div className="modal__dialog" ref={dialogRef} tabIndex={-1}>
        <div className="modal__header">
          <h2 id={labelId}>{title}</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {description ? <p className="modal__description">{description}</p> : null}
        <div className="modal__body">{children}</div>
        {renderedActions ? <div className="modal__actions">{renderedActions}</div> : null}
      </div>
    </div>
  );
};

export default Modal;
