import { useEffect, useRef } from 'react';

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const renderActions = (actions) => {
  if (!actions) {
    return null;
  }

  if (Array.isArray(actions)) {
    const entries = actions.filter(Boolean);
    return entries.length ? entries : null;
  }

  return actions;
};

const Modal = ({ title, description, children, actions, onClose, open = false }) => {
  const dialogRef = useRef(null);
  const hasFocusedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      hasFocusedRef.current = false;
      return undefined;
    }

    const previouslyFocused = document.activeElement;
    const dialog = dialogRef.current;

    // Focus management with better handling
    if (dialog && !hasFocusedRef.current) {
      // Only focus on initial open, not on every re-render
      const focusable = dialog.querySelector(
        'input:not([readonly]):not([disabled]), select:not([disabled]), textarea:not([readonly]):not([disabled]), button:not(.modal__close):not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );

      if (focusable) {
        // Use setTimeout to ensure the modal is fully rendered
        setTimeout(() => {
          focusable.focus();
        }, 0);
      } else {
        dialog.focus();
      }
      
      hasFocusedRef.current = true;
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

  const renderedActions = renderActions(actions);

  if (!open) {
    return null;
  }

  return (
    <div className="modal modal--open" role="dialog" aria-modal="true" aria-labelledby={labelId} onClick={handleBackdropClick}>
      <div className="modal__dialog" ref={dialogRef} tabIndex={-1}>
        <div className="modal__header">
          <div>
            <h2 id={labelId} className="modal__title">{title}</h2>
            {description && (
              <p className="modal__description text-tertiary text-sm mt-1">{description}</p>
            )}
          </div>
          <button 
            type="button" 
            className="modal__close" 
            onClick={onClose} 
            aria-label="Close modal"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {renderedActions && (
          <div className="modal__footer">{renderedActions}</div>
        )}
      </div>
    </div>
  );
};

export default Modal;