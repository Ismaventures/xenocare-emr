import React, { useState } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from './FormElements';

// =============================================================================
// Modal Component
// =============================================================================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | 'max';
  showCloseButton?: boolean;
  footer?: React.ReactNode;
  allowMaximize?: boolean;
  defaultMaximized?: boolean;
  noPadding?: boolean;
  className?: string; // Additional classes for the modal container
  zIndexClass?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  footer,
  allowMaximize = false,
  defaultMaximized = false,
  noPadding = false,
  className = '',
  zIndexClass = 'z-50',
}: ModalProps) {
  const [isMaximized, setIsMaximized] = useState(defaultMaximized);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-5xl',
    full: 'max-w-6xl',
    max: 'max-w-[95vw]',
  };

  // When maximized, use full screen dimensions; otherwise constrain height for scrolling
  const modalSizeClass = isMaximized
    ? 'w-screen h-screen max-w-none rounded-none'
    : `${sizes[size]} max-h-[90vh]`;
  const showHeader = title || allowMaximize || showCloseButton;

  return (
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center`}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className={`relative ${isMaximized ? 'p-0' : 'p-4'} w-full h-full flex items-center justify-center`}
      >
        <div
          className={`relative bg-white ${isMaximized ? '' : 'rounded-xl'} shadow-2xl w-full ${modalSizeClass} transform transition-all flex flex-col overflow-hidden ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Only show if title or controls exist */}
          {showHeader && (
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/80 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <div className="flex items-center gap-1">
                {allowMaximize && (
                  <button
                    onClick={() => setIsMaximized(!isMaximized)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200/80 rounded-lg transition-all duration-150"
                    title={isMaximized ? 'Minimize' : 'Maximize'}
                  >
                    {isMaximized ? (
                      <Minimize2 size={18} />
                    ) : (
                      <Maximize2 size={18} />
                    )}
                  </button>
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200/80 rounded-lg transition-all duration-150"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Body */}
          <div className={`flex-1 overflow-y-auto ${noPadding ? '' : 'p-4'}`}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-100 bg-gray-50/80 flex-shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Confirm Dialog
// =============================================================================

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  zIndexClass?: string;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  zIndexClass = 'z-50',
}: ConfirmDialogProps) {
  const iconColors = {
    danger: 'text-red-600 bg-red-100',
    warning: 'text-yellow-600 bg-yellow-100',
    info: 'text-blue-600 bg-blue-100',
  };

  const buttonVariants = {
    danger: 'danger' as const,
    warning: 'primary' as const,
    info: 'primary' as const,
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      zIndexClass={zIndexClass}
    >
      <div className="flex items-start space-x-4">
        <div className={`p-2 rounded-full ${iconColors[variant]}`}>
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div>
          <p className="text-gray-600">{message}</p>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button
          variant={buttonVariants[variant]}
          onClick={onConfirm}
          isLoading={isLoading}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}

// =============================================================================
// Slide Over Panel
// =============================================================================

interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
}

export function SlideOver({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  footer,
}: SlideOverProps) {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };

  return (
    <div
      className={`fixed inset-0 z-50 ${isOpen ? '' : 'pointer-events-none'}`}
    >
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 flex">
        <div
          className={`
            relative w-screen ${sizes[size]} bg-white shadow-xl
            transform transition-transform duration-300 ease-in-out
            flex flex-col h-full
            ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          `}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-white flex-shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
