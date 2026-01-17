import { useRef } from 'react';
import { Printer, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { BusinessProfile } from '@/types';
import { formatKES } from '@/lib/constants';
import { format } from 'date-fns';

interface ReceiptItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface POSReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  businessProfile: BusinessProfile;
  items: ReceiptItem[];
  subtotal: number;
  vatAmount: number;
  total: number;
  paymentMethod: 'cash' | 'mpesa';
  cashReceived?: number;
  change?: number;
  loyaltyPointsEarned?: number;
  customerPhone?: string;
  transactionDate?: Date;
  mpesaReceiptNumber?: string;
}

export function POSReceipt({
  isOpen,
  onClose,
  businessProfile,
  items,
  subtotal,
  vatAmount,
  total,
  paymentMethod,
  cashReceived,
  change,
  loyaltyPointsEarned,
  customerPhone,
  transactionDate = new Date(),
  mpesaReceiptNumber,
}: POSReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${businessProfile.businessName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Courier New', monospace; 
              font-size: 12px; 
              width: 80mm;
              padding: 10px;
            }
            .receipt { max-width: 300px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 15px; }
            .business-name { font-size: 16px; font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .item-row { display: flex; justify-content: space-between; margin: 5px 0; }
            .item-name { flex: 1; }
            .item-total { text-align: right; min-width: 80px; }
            .totals { margin-top: 10px; }
            .total-row { display: flex; justify-content: space-between; margin: 3px 0; }
            .grand-total { font-weight: bold; font-size: 14px; margin-top: 5px; }
            .footer { text-align: center; margin-top: 15px; font-size: 10px; }
            @media print {
              body { width: 80mm; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Sale Receipt
          </DialogTitle>
        </DialogHeader>

        {/* Receipt Preview */}
        <div 
          ref={receiptRef}
          className="bg-white text-black p-4 rounded-lg font-mono text-xs max-h-[60vh] overflow-y-auto"
        >
          <div className="receipt">
            {/* Header with Logo */}
            <div className="header text-center mb-4">
              {businessProfile.logoUrl && (
                <img 
                  src={businessProfile.logoUrl} 
                  alt={businessProfile.businessName} 
                  className="w-16 h-16 mx-auto mb-2 object-contain"
                />
              )}
              <p className="business-name text-base font-bold">{businessProfile.businessName}</p>
              {businessProfile.address && <p>{businessProfile.address}</p>}
              {businessProfile.phone && <p>Tel: {businessProfile.phone}</p>}
              {businessProfile.kraPin && <p>PIN: {businessProfile.kraPin}</p>}
            </div>

            <div className="divider border-t border-dashed border-gray-400 my-2" />

            {/* Transaction Info */}
            <div className="mb-2">
              <p>Date: {format(transactionDate, 'dd/MM/yyyy HH:mm')}</p>
              <p>Payment: {paymentMethod === 'mpesa' ? 'M-Pesa' : 'Cash'}</p>
              {paymentMethod === 'mpesa' && mpesaReceiptNumber && (
                <p className="font-bold">M-Pesa Ref: {mpesaReceiptNumber}</p>
              )}
              {customerPhone && <p>Customer: {customerPhone}</p>}
            </div>

            <div className="divider border-t border-dashed border-gray-400 my-2" />

            {/* Items */}
            <div className="space-y-1">
              {items.map((item, index) => (
                <div key={index} className="item-row flex justify-between">
                  <div className="item-name flex-1">
                    <p>{item.description}</p>
                    <p className="text-gray-600">{item.quantity} x {formatKES(item.unitPrice)}</p>
                  </div>
                  <div className="item-total text-right min-w-[70px]">
                    {formatKES(item.total)}
                  </div>
                </div>
              ))}
            </div>

            <div className="divider border-t border-dashed border-gray-400 my-2" />

            {/* Totals */}
            <div className="totals space-y-1">
              <div className="total-row flex justify-between">
                <span>Subtotal:</span>
                <span>{formatKES(subtotal)}</span>
              </div>
              {vatAmount > 0 && (
                <div className="total-row flex justify-between">
                  <span>VAT (16%):</span>
                  <span>{formatKES(vatAmount)}</span>
                </div>
              )}
              <div className="divider border-t border-dashed border-gray-400 my-1" />
              <div className="grand-total flex justify-between font-bold text-sm">
                <span>TOTAL:</span>
                <span>{formatKES(total)}</span>
              </div>
              
              {paymentMethod === 'cash' && cashReceived && (
                <>
                  <div className="total-row flex justify-between mt-2">
                    <span>Cash Received:</span>
                    <span>{formatKES(cashReceived)}</span>
                  </div>
                  <div className="total-row flex justify-between font-bold">
                    <span>Change:</span>
                    <span>{formatKES(change || 0)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Loyalty Points */}
            {loyaltyPointsEarned && loyaltyPointsEarned > 0 && (
              <>
                <div className="divider border-t border-dashed border-gray-400 my-2" />
                <div className="text-center">
                  <p className="font-bold">🎉 Loyalty Points Earned: {loyaltyPointsEarned}</p>
                </div>
              </>
            )}

            {/* Footer */}
            <div className="divider border-t border-dashed border-gray-400 my-2" />
            <div className="footer text-center text-[10px] text-gray-600 mt-3">
              <p>Thank you for your business!</p>
              <p>Please keep this receipt for your records</p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline">
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </DialogClose>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
