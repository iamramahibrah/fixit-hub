import { CheckCircle, Clock, AlertCircle, XCircle, FileCheck, QrCode } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type EtimsStatus = 'pending' | 'submitted' | 'verified' | 'failed' | 'cancelled' | null;

interface EtimsStatusBadgeProps {
  status: EtimsStatus;
  controlNumber?: string | null;
  qrCode?: string | null;
  className?: string;
  showQrButton?: boolean;
}

export function EtimsStatusBadge({ status, controlNumber, qrCode, className, showQrButton = false }: EtimsStatusBadgeProps) {
  if (!status) {
    return (
      <Badge variant="outline" className={cn("text-xs gap-1 text-muted-foreground", className)}>
        <Clock className="h-3 w-3" />
        Not Submitted
      </Badge>
    );
  }

  const statusConfig = {
    pending: {
      icon: Clock,
      label: 'Pending',
      className: 'bg-warning/20 text-warning border-warning/30',
    },
    submitted: {
      icon: FileCheck,
      label: 'Submitted',
      className: 'bg-primary/20 text-primary border-primary/30',
    },
    verified: {
      icon: CheckCircle,
      label: 'Verified',
      className: 'bg-success/20 text-success border-success/30',
    },
    failed: {
      icon: AlertCircle,
      label: 'Failed',
      className: 'bg-destructive/20 text-destructive border-destructive/30',
    },
    cancelled: {
      icon: XCircle,
      label: 'Cancelled',
      className: 'bg-muted text-muted-foreground border-muted',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <Badge className={cn("text-xs gap-1", config.className, className)}>
          <Icon className="h-3 w-3" />
          eTIMS: {config.label}
        </Badge>
        {showQrButton && qrCode && (status === 'submitted' || status === 'verified') && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <QrCode className="h-4 w-4 text-primary" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-primary" />
                  eTIMS QR Code
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="p-4 bg-white rounded-xl shadow-inner">
                  <img 
                    src={qrCode} 
                    alt="eTIMS QR Code" 
                    className="w-48 h-48 object-contain"
                  />
                </div>
                {controlNumber && (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Control Unit Number</p>
                    <p className="font-mono font-bold text-lg text-foreground">{controlNumber}</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground text-center">
                  Scan this QR code to verify the invoice on KRA eTIMS portal
                </p>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
      {controlNumber && status !== 'failed' && status !== 'cancelled' && (
        <span className="text-[10px] text-muted-foreground font-mono">
          CU: {controlNumber}
        </span>
      )}
    </div>
  );
}

// QR Code display component for invoice details
interface EtimsQrCodeDisplayProps {
  qrCode: string;
  controlNumber?: string | null;
}

export function EtimsQrCodeDisplay({ qrCode, controlNumber }: EtimsQrCodeDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-muted/30 rounded-xl border">
      <div className="flex items-center gap-2 text-primary">
        <FileCheck className="h-5 w-5" />
        <span className="font-semibold">eTIMS Verified</span>
      </div>
      <div className="p-3 bg-white rounded-lg shadow-sm">
        <img 
          src={qrCode} 
          alt="eTIMS QR Code" 
          className="w-32 h-32 object-contain"
        />
      </div>
      {controlNumber && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Control Unit Number</p>
          <p className="font-mono font-medium text-sm">{controlNumber}</p>
        </div>
      )}
    </div>
  );
}
