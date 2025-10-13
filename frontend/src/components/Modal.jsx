import { useEffect, useRef } from 'react';

const Modal = ({ title, description, children, actions, onClose }) => {
  const dialogRef = useRef(null);

  useEffect(() => {
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
  }, [onClose]);

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const labelId = `${title?.replace(/\s+/g, '-').toLowerCase() || 'modal'}-heading`;

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
        {actions ? <div className="modal__actions">{actions}</div> : null}
      </div>
    </div>
  );
};

export default Modal;
