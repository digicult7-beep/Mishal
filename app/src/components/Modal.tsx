import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: React.ReactNode;
    children: React.ReactNode;
    maxWidth?: string;
    bodyStyle?: React.CSSProperties;
    variant?: 'default' | 'fullscreen' | 'document';
}

export default function Modal({ isOpen, onClose, title, children, maxWidth = '500px', bodyStyle = {}, variant = 'default' }: ModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const isFullscreen = variant === 'fullscreen';
    const isDocument = variant === 'document';

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: isFullscreen ? 'var(--bg-primary)' : 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: isFullscreen ? 'flex-start' : 'center',
                justifyContent: 'center',
                zIndex: 1000,
                backdropFilter: isFullscreen ? 'none' : 'blur(4px)',
                animation: 'fadeIn 0.2s ease-out',
                padding: isFullscreen ? 0 : '1rem',
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget && !isFullscreen) onClose();
            }}
        >
            <div
                ref={modalRef}
                style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: isFullscreen ? 0 : '1rem',
                    width: '100%',
                    maxWidth: isFullscreen ? '100%' : (isDocument ? '900px' : maxWidth),
                    height: isFullscreen ? '100vh' : 'auto',
                    margin: isFullscreen ? 0 : '1rem',
                    boxShadow: isFullscreen ? 'none' : 'var(--glass-shadow)',
                    animation: 'slideUp 0.3s ease-out',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: isFullscreen ? '100vh' : '90vh',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    ...((isDocument && !isFullscreen) ? { height: '85vh' } : {})
                }}
            >
                {!isFullscreen && (
                    <div
                        style={{
                            padding: '1.5rem',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                            {title}
                        </h2>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-secondary)',
                                padding: '0.5rem',
                                borderRadius: '0.375rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'background-color 0.2s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                            <X size={20} />
                        </button>
                    </div>
                )}

                {isFullscreen && (
                    <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 10 }}>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(0,0,0,0.05)',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#6b7280',
                                padding: '0.5rem',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'background-color 0.2s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.1)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)')}
                        >
                            <X size={24} />
                        </button>
                    </div>
                )}

                <div style={{ padding: isFullscreen ? '2rem' : '1.5rem', overflowY: 'auto', flex: 1, ...bodyStyle }}>
                    {children}
                </div>
            </div>
            <style>
                {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
            </style>
        </div>
    );
}
