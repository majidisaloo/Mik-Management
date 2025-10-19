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

  // Completely disable all event handling to fix input typing issue
  // useEffect(() => {
  //   if (!open) {
  //     return undefined;
  //   }

  //   const handleKeyDown = (event) => {
  //     // Only handle Escape key when modal is focused, ignore all other keys
  //     if (event.key === 'Escape' && event.target === dialogRef.current) {
  //       event.preventDefault();
  //       onClose();
  //     }
  //   };

  //   const dialog = dialogRef.current;
  //   if (dialog) {
  //     dialog.addEventListener('keydown', handleKeyDown);
  //   }

  //   return () => {
  //     if (dialog) {
  //       dialog.removeEventListener('keydown', handleKeyDown);
  //     }
  //   };
  // }, [onClose, open]);

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
              <p className="modal__description text-tertiary text-sm mt-0">{description}</p>
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