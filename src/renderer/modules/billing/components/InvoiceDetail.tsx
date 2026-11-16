import React from 'react';
import { X, Printer, CreditCard } from 'lucide-react';
import { Button } from '../../../components/ui/FormElements';
import { StatusBadge } from '../../../components/ui/DataDisplay';
import { SlideOver } from '../../../components/ui/Modal';
import {
  InvoiceDTO,
  getInvoiceStatusColor,
  getPaymentMethodColor,
  formatCurrency,
} from '../dtos/billing.dto';

interface InvoiceDetailProps {
  invoice: InvoiceDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onRecordPayment?: () => void;
  onPrint: () => void;
}

export function InvoiceDetail({
  invoice,
  isOpen,
  onClose,
  onRecordPayment,
  onPrint,
}: InvoiceDetailProps) {
  if (!invoice) return null;

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title="Invoice Details"
      size="lg"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {invoice.invoice_number}
            </h2>
            <p className="text-sm text-gray-500">
              Created: {new Date(invoice.created_at).toLocaleString()}
            </p>
          </div>
          <StatusBadge
            status={invoice.status}
            color={getInvoiceStatusColor(invoice.status)}
          />
        </div>

        {/* Patient Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Patient</h3>
          <p className="font-medium text-gray-900">
            {invoice.patient?.first_name} {invoice.patient?.surname}
          </p>
          <p className="text-sm text-gray-500">
            {invoice.patient?.contact_phone}
          </p>
          {invoice.patient?.email && (
            <p className="text-sm text-gray-500">{invoice.patient?.email}</p>
          )}
        </div>

        {/* Invoice Items */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3">Items</h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoice.items?.map((item, index) => (
                  <tr key={item.item_id || index}>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900">
                        {item.description}
                      </p>
                      <p className="text-xs text-gray-500">{item.category}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal:</span>
              <span className="text-gray-900">
                {formatCurrency(invoice.subtotal)}
              </span>
            </div>
            {invoice.discount_total > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Discount:</span>
                <span>-{formatCurrency(invoice.discount_total)}</span>
              </div>
            )}
            {invoice.tax_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax:</span>
                <span className="text-gray-900">
                  {formatCurrency(invoice.tax_amount)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>{formatCurrency(invoice.total_amount)}</span>
            </div>
            <div className="flex justify-between text-sm text-green-600">
              <span>Paid:</span>
              <span>{formatCurrency(invoice.amount_paid)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-red-600">
              <span>Balance:</span>
              <span>{formatCurrency(invoice.balance)}</span>
            </div>
          </div>
        </div>

        {/* Payment History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-3">
              Payment History
            </h3>
            <div className="space-y-2">
              {invoice.payments.map((payment, index) => (
                <div
                  key={payment.payment_id || index}
                  className="flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {payment.receipt_number}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(payment.created_at).toLocaleString()} •{' '}
                      {payment.received_by_staff?.first_name}{' '}
                      {payment.received_by_staff?.last_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      {formatCurrency(payment.amount)}
                    </p>
                    <StatusBadge
                      status={payment.payment_method}
                      color={getPaymentMethodColor(payment.payment_method)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
              {invoice.notes}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          {invoice.status !== 'Paid' &&
            invoice.status !== 'Cancelled' &&
            onRecordPayment && (
              <Button
                variant="success"
                onClick={onRecordPayment}
                className="flex-1"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            )}
          <Button variant="secondary" onClick={onPrint} className="flex-1">
            <Printer className="h-4 w-4 mr-2" />
            Print Invoice
          </Button>
        </div>
      </div>
    </SlideOver>
  );
}
