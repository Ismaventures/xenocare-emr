// =============================================================================
// Modern NHIS Authorization Code Input Component
// Supports multiple auth code patterns with smart validation and formatting
// =============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Clipboard,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  Building2,
  Eye,
  EyeOff,
} from 'lucide-react';

// Auth code patterns for detection
const AUTH_PATTERNS = {
  HMO: /^[A-Z]{2,4}[-/]?\d{2}[-/]?\d{2}[-/]?\d{3,6}$/i,
  NHIA: /^NHIA[-]?[A-Z]{3}[-]?\d{4}[-]?\d{3,6}$/i,
  HYBRID: /^NHIS[-/]?(AUTH|REF)[-/]?\d{2}[-/]?\d{3,6}$/i,
  COMPACT: /^NHIS\d{2}[A-Z0-9]{4,8}$/i,
  GENERIC: /^[A-Z0-9][-/A-Z0-9]{5,19}$/i,
};

export interface AuthCodeVerificationResult {
  status:
    | 'verified'
    | 'expired'
    | 'not_found'
    | 'not_covered'
    | 'already_used'
    | 'error';
  payer?: string;
  hmo?: string;
  issueDate?: string;
  expiryDate?: string;
  coverageDetails?: string;
  errorMessage?: string;
  servicesCovered?: string[];
  authorizationLimit?: number;
  usedAmount?: number;
}

interface AuthCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onVerify?: (code: string) => Promise<AuthCodeVerificationResult>;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  label?: string;
  helperText?: string;
  showValidIcon?: boolean;
  verificationResult?: AuthCodeVerificationResult | null;
  className?: string;
}

export function AuthCodeInput({
  value,
  onChange,
  onVerify,
  disabled = false,
  required = false,
  placeholder = 'Enter authorization code (e.g., NHIS/AUTH/25/00341)',
  label = 'Authorization Code',
  helperText = 'Enter the authorization code from NHIA/HMO (e.g., NHIS/AUTH/25/00341, NHIA-ABJ-2026-001278)',
  showValidIcon = false,
  verificationResult = null,
  className = '',
}: AuthCodeInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showFormat, setShowFormat] = useState(false);

  // Normalize input value (uppercase, trim)
  const normalizedValue = value.toUpperCase().trim();

  // Detect auth code pattern
  const detectedPattern = useMemo(() => {
    if (!normalizedValue || normalizedValue.length < 6) return null;

    for (const [name, pattern] of Object.entries(AUTH_PATTERNS)) {
      if (pattern.test(normalizedValue)) {
        return name.toLowerCase();
      }
    }
    return 'unknown';
  }, [normalizedValue]);

  // Client-side validation
  const validation = useMemo(() => {
    if (!normalizedValue) return { isValid: !required, message: '' };

    if (normalizedValue.length < 6) {
      return {
        isValid: false,
        message: 'Code too short (minimum 6 characters)',
      };
    }

    if (normalizedValue.length > 20) {
      return {
        isValid: false,
        message: 'Code too long (maximum 20 characters)',
      };
    }

    // Allow A-Z, 0-9, /, -
    if (!/^[A-Z0-9\/-]+$/.test(normalizedValue)) {
      return {
        isValid: false,
        message: 'Invalid characters (only A-Z, 0-9, /, - allowed)',
      };
    }

    return { isValid: true, message: '' };
  }, [normalizedValue, required]);

  // Handle input change with formatting
  const handleChange = (newValue: string) => {
    // Remove leading/trailing spaces, convert to uppercase
    const formatted = newValue.trim().toUpperCase();
    onChange(formatted);
  };

  // Handle paste
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const cleaned = text
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9\/-]/g, '');
      onChange(cleaned);
    } catch (err) {
      console.warn('Clipboard access failed:', err);
    }
  };

  // Handle verification
  const handleVerify = async () => {
    if (!onVerify || !validation.isValid) return;

    setIsVerifying(true);
    try {
      await onVerify(normalizedValue);
    } finally {
      setIsVerifying(false);
    }
  };

  // Format badge for detected pattern
  const getPatternBadge = () => {
    if (!detectedPattern) return null;

    const badges = {
      hmo: {
        label: 'HMO Format',
        color: 'bg-orange-100 text-orange-700 border-orange-200',
      },
      nhia: {
        label: 'NHIA Format',
        color: 'bg-blue-100 text-blue-700 border-blue-200',
      },
      hybrid: {
        label: 'Hybrid Format',
        color: 'bg-purple-100 text-purple-700 border-purple-200',
      },
      compact: {
        label: 'Compact Format',
        color: 'bg-green-100 text-green-700 border-green-200',
      },
      unknown: {
        label: 'Unknown (still allowed)',
        color: 'bg-gray-100 text-gray-600 border-gray-200',
      },
    };

    const badge = badges[detectedPattern as keyof typeof badges];
    if (!badge) return null;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-full border ${badge.color}`}
      >
        <Shield size={10} />
        {badge.label}
      </span>
    );
  };

  // Status icon
  const getStatusIcon = () => {
    if (verificationResult) {
      switch (verificationResult.status) {
        case 'verified':
          return <CheckCircle className="text-green-500" size={18} />;
        case 'expired':
          return <Clock className="text-orange-500" size={18} />;
        case 'not_found':
        case 'error':
          return <XCircle className="text-red-500" size={18} />;
        case 'not_covered':
          return <AlertTriangle className="text-yellow-500" size={18} />;
        case 'already_used':
          return <Eye className="text-gray-500" size={18} />;
      }
    }

    if (showValidIcon && validation.isValid && normalizedValue) {
      return <CheckCircle className="text-green-500" size={18} />;
    }

    return (
      <CreditCard
        className={`transition-colors ${
          isFocused
            ? 'text-blue-500'
            : validation.isValid && normalizedValue
              ? 'text-green-500'
              : 'text-gray-400'
        }`}
        size={18}
      />
    );
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Label and Helper */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {helperText && (
          <button
            type="button"
            onClick={() => setShowFormat(!showFormat)}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            {showFormat ? <EyeOff size={12} /> : <Eye size={12} />}
            {showFormat ? 'Hide' : 'Show'} formats
          </button>
        )}
      </div>

      {/* Format helper (collapsible) */}
      {showFormat && helperText && (
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100 leading-relaxed">
          <div className="font-semibold text-gray-700 mb-2">
            Supported Formats:
          </div>
          <div className="space-y-1 font-mono">
            <div>
              • HMO: <span className="text-orange-600">HMO/25/01/000456</span>{' '}
              or <span className="text-orange-600">AXA-NHIS-012345</span>
            </div>
            <div>
              • NHIA:{' '}
              <span className="text-blue-600">NHIA-ABJ-2026-001278</span>
            </div>
            <div>
              • Compact: <span className="text-green-600">NHIS26ABJ7K9</span>
            </div>
            <div>
              • Hybrid:{' '}
              <span className="text-purple-600">NHIS/AUTH/25/00341</span>
            </div>
          </div>
        </div>
      )}

      {/* Input Field */}
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
          {getStatusIcon()}
        </div>

        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={disabled ? 'N/A - DISABLED' : placeholder}
          disabled={disabled}
          className={`w-full pl-12 pr-20 py-4 border rounded-xl focus:ring-4 transition-all text-lg font-mono font-bold placeholder:font-sans placeholder:font-normal placeholder:text-gray-300 disabled:opacity-50 disabled:bg-gray-50 ${
            verificationResult?.status === 'verified'
              ? 'bg-green-50/50 border-green-200 text-green-800 focus:ring-green-100 focus:border-green-500'
              : verificationResult?.status === 'expired'
                ? 'bg-orange-50/50 border-orange-200 text-orange-800 focus:ring-orange-100 focus:border-orange-500'
                : verificationResult?.status === 'not_found' ||
                    verificationResult?.status === 'error'
                  ? 'bg-red-50/50 border-red-200 text-red-800 focus:ring-red-100 focus:border-red-500'
                  : validation.isValid && normalizedValue
                    ? 'bg-green-50/30 border-green-200 text-gray-900 focus:ring-green-100 focus:border-green-500'
                    : !validation.isValid && normalizedValue
                      ? 'bg-red-50/30 border-red-200 text-red-800 focus:ring-red-100 focus:border-red-500'
                      : 'bg-white border-gray-200 text-gray-900 focus:ring-blue-100 focus:border-blue-500'
          }`}
        />

        {/* Paste & Verify buttons */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <button
            type="button"
            onClick={handlePaste}
            disabled={disabled}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 group"
            title="Paste from clipboard"
          >
            <Clipboard
              size={16}
              className="text-gray-400 group-hover:text-gray-600"
            />
          </button>

          {onVerify && (
            <button
              type="button"
              onClick={handleVerify}
              disabled={disabled || !validation.isValid || isVerifying}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50 disabled:grayscale"
            >
              {isVerifying ? '...' : 'Verify'}
            </button>
          )}
        </div>
      </div>

      {/* Status Row: Pattern badge + Validation message */}
      <div className="flex items-center justify-between min-h-[20px]">
        <div className="flex items-center gap-2">{getPatternBadge()}</div>

        {!validation.isValid && validation.message && (
          <span className="text-xs text-red-500 font-medium">
            {validation.message}
          </span>
        )}
      </div>

      {/* Verification Result Panel */}
      {verificationResult && (
        <div
          className={`p-4 rounded-xl border shadow-sm animate-in slide-in-from-top-2 duration-300 ${
            verificationResult.status === 'verified'
              ? 'bg-green-50 border-green-200'
              : verificationResult.status === 'expired'
                ? 'bg-orange-50 border-orange-200'
                : verificationResult.status === 'not_covered'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                verificationResult.status === 'verified'
                  ? 'bg-green-100 text-green-600'
                  : verificationResult.status === 'expired'
                    ? 'bg-orange-100 text-orange-600'
                    : verificationResult.status === 'not_covered'
                      ? 'bg-yellow-100 text-yellow-600'
                      : 'bg-red-100 text-red-600'
              }`}
            >
              {getStatusIcon()}
            </div>

            <div className="flex-1 space-y-2">
              {/* Status header */}
              <div className="flex items-center justify-between">
                <h4
                  className={`font-bold text-sm capitalize ${
                    verificationResult.status === 'verified'
                      ? 'text-green-900'
                      : verificationResult.status === 'expired'
                        ? 'text-orange-900'
                        : verificationResult.status === 'not_covered'
                          ? 'text-yellow-900'
                          : 'text-red-900'
                  }`}
                >
                  {verificationResult.status === 'verified' &&
                    'Authorization Verified'}
                  {verificationResult.status === 'expired' &&
                    'Authorization Expired'}
                  {verificationResult.status === 'not_found' &&
                    'Authorization Not Found'}
                  {verificationResult.status === 'not_covered' &&
                    'Service Not Covered'}
                  {verificationResult.status === 'already_used' &&
                    'Already Used/Exhausted'}
                  {verificationResult.status === 'error' &&
                    'Verification Error'}
                </h4>

                {/* Status badge */}
                <span
                  className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                    verificationResult.status === 'verified'
                      ? 'bg-green-200 text-green-800'
                      : verificationResult.status === 'expired'
                        ? 'bg-orange-200 text-orange-800'
                        : verificationResult.status === 'not_covered'
                          ? 'bg-yellow-200 text-yellow-800'
                          : 'bg-red-200 text-red-800'
                  }`}
                >
                  {verificationResult.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              {/* Details grid */}
              {(verificationResult.payer ||
                verificationResult.hmo ||
                verificationResult.issueDate ||
                verificationResult.expiryDate) && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  {verificationResult.payer && (
                    <div>
                      <span className="text-gray-600 font-medium">Payer:</span>
                      <span className="ml-2 font-bold text-gray-900">
                        {verificationResult.payer}
                      </span>
                    </div>
                  )}
                  {verificationResult.hmo && (
                    <div>
                      <span className="text-gray-600 font-medium">HMO:</span>
                      <span className="ml-2 font-bold text-gray-900">
                        {verificationResult.hmo}
                      </span>
                    </div>
                  )}
                  {verificationResult.issueDate && (
                    <div>
                      <span className="text-gray-600 font-medium">Issued:</span>
                      <span className="ml-2 font-bold text-gray-900">
                        {new Date(
                          verificationResult.issueDate,
                        ).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                  {verificationResult.expiryDate && (
                    <div>
                      <span className="text-gray-600 font-medium">
                        Expires:
                      </span>
                      <span className="ml-2 font-bold text-gray-900">
                        {new Date(
                          verificationResult.expiryDate,
                        ).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Coverage details */}
              {verificationResult.coverageDetails && (
                <p className="text-xs text-gray-700 font-medium">
                  <span className="text-gray-600">Coverage: </span>
                  {verificationResult.coverageDetails}
                </p>
              )}

              {/* Usage info */}
              {verificationResult.authorizationLimit && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Usage:</span>
                  <span className="font-bold text-gray-900">
                    ₦{(verificationResult.usedAmount || 0).toLocaleString()} / ₦
                    {verificationResult.authorizationLimit.toLocaleString()}
                  </span>
                </div>
              )}

              {/* Error message */}
              {verificationResult.errorMessage && (
                <p className="text-xs text-red-700 font-medium bg-red-100 p-2 rounded-lg">
                  {verificationResult.errorMessage}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
