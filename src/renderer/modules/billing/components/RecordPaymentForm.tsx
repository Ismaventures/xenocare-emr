import React, { useState } from 'react';
import {
  Button,
  Input,
  Select,
  Textarea,
} from '../../../components/ui/FormElements';
import { Modal } from '../../../components/ui/Modal';
import {
  InvoiceDTO,
  CreatePaymentDTO,
  PaymentMethod,
  PAYMENT_METHODS,
  formatCurrency,
} from '../dtos/billing.dto';
import { useRecordPayment, useInvoice } from '../hooks/useBilling';
import { useToast } from '../../../components/ui/Toast';
import { isNhisFeatureEnabled } from '../../../config/features';

interface RecordPaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: InvoiceDTO | null;
  invoiceId?: string | null;
}

export function RecordPaymentForm({
  isOpen,
  onClose,
  invoice: initialInvoice,
  invoiceId,
}: RecordPaymentFormProps) {
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const recordPayment = useRecordPayment();
  const { showToast } = useToast();

  // Fetch fresh invoice data to ensure we have the latest balance
  const targetId = invoiceId || initialInvoice?.invoice_id || '';
  const { data: freshInvoice, isLoading } = useInvoice(targetId);
  const invoice = freshInvoice || initialInvoice;

  // Set default amount to balance
  React.useEffect(() => {
    if (invoice) {
      setAmount(invoice.balance);
    }
  }, [invoice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invoice) return;

    if (amount <= 0) {
      showToast({
        title: 'Error',
        message: 'Please enter a valid amount',
        type: 'error',
      });
      return;
    }

    if (amount > invoice.balance) {
      showToast({
        title: 'Error',
        message: 'Amount cannot exceed the outstanding balance',
        type: 'error',
      });
      return;
    }

    const isFullyPaid = amount >= invoice.balance;

    // Close immediately and show success - optimistic update will handle UI
    resetForm();
    onClose();

    // Show toast immediately
    showToast({
      title: isFullyPaid ? '✓ Payment Verified' : '✓ Payment Recorded',
      message: isFullyPaid
        ? 'Invoice marked as PAID'
        : 'Partial payment recorded',
      type: 'success',
    });

    try {
      const data: CreatePaymentDTO = {
        invoice_id: invoice.invoice_id,
        amount,
        payment_method: paymentMethod,
        reference_number: referenceNumber || undefined,
        notes: notes || undefined,
      };

      // Fire and forget - optimistic update already updated UI
      recordPayment.mutate(data, {
        onError: (error) => {
          console.error('Failed to record payment:', error);
          showToast({
            title: 'Error',
            message: 'Payment failed. Please try again.',
            type: 'error',
          });
        },
      });
    } catch (error) {
      console.error('Failed to record payment:', error);
      showToast({
        title: 'Error',
        message: 'Failed to record payment',
        type: 'error',
      });
    }
  };

  const resetForm = () => {
    setAmount(0);
    setPaymentMethod('Cash');
    setReferenceNumber('');
    setNotes('');
  };

  if (!invoice && isLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Record Payment" size="md">
        <div className="p-8 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      </Modal>
    );
  }

  if (!invoice) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Payment" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Invoice Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-medium text-gray-900">
                {invoice.invoice_number}
              </h3>
              <p className="text-sm text-gray-500">
                {invoice.patient?.first_name} {invoice.patient?.surname}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Total</p>
              <p className="font-medium">
                {formatCurrency(invoice.total_amount)}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Paid</p>
              <p className="font-medium text-green-600">
                {formatCurrency(invoice.amount_paid)}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Balance</p>
              <p className="font-bold text-red-600">
                {formatCurrency(invoice.balance)}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Amount */}
        <div>
          <Input
            type="number"
            label="Amount"
            required
            min={0.01}
            max={invoice.balance}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            helperText={`Maximum: ${formatCurrency(invoice.balance)}`}
          />
          <div className="flex gap-2 mt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setAmount(invoice.balance)}
            >
              Full Balance
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setAmount(invoice.balance / 2)}
            >
              Half
            </Button>
          </div>
        </div>

        {/* Payment Method */}
        <Select
          label="Payment Method"
          required
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
          options={PAYMENT_METHODS.filter(
            (m) => isNhisFeatureEnabled() || m !== 'NHIS',
          ).map((m) => ({ value: m, label: m }))}
        />

        {/* Reference Number */}
        {['Card', 'Bank Transfer', 'Cheque', 'Insurance'].includes(
          paymentMethod,
        ) && (
          <Input
            label="Reference Number"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder={
              paymentMethod === 'Card'
                ? 'Transaction ID'
                : paymentMethod === 'Cheque'
                  ? 'Cheque Number'
                  : 'Reference Number'
            }
          />
        )}

        {/* Notes */}
        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Any additional notes..."
        />

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="success"
            disabled={amount <= 0 || amount > invoice.balance}
          >
            {`Verify Payment ${formatCurrency(amount)}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
