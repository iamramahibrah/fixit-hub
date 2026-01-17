import { jsPDF } from 'jspdf';
import { Invoice, BusinessProfile } from '@/types';
import { formatKES, formatDate } from '@/lib/constants';

export async function generateInvoicePdf(invoice: Invoice, profile: BusinessProfile) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Colors
  const primaryColor = [34, 197, 94]; // Green
  const textColor = [31, 41, 55];
  const mutedColor = [107, 114, 128];
  
  let y = 20;

  // Header background
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Add logo if available
  if (profile.logoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          doc.addImage(img, 'PNG', 15, 8, 24, 24);
          resolve();
        };
        img.onerror = reject;
        img.src = profile.logoUrl!;
      });
      // Business name with logo offset
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(profile.businessName, 45, y + 5);
    } catch (e) {
      // Fallback if logo fails to load
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(profile.businessName, 20, y + 5);
    }
  } else {
    // Business name without logo
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(profile.businessName, 20, y + 5);
  }

  // Invoice number
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice: ${invoice.invoiceNumber}`, pageWidth - 20, y + 5, { align: 'right' });

  y = 55;

  // Business details
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.setFontSize(9);
  if (profile.kraPin) {
    doc.text(`KRA PIN: ${profile.kraPin}`, 20, y);
    y += 5;
  }
  if (profile.phone) {
    doc.text(`Phone: ${profile.phone}`, 20, y);
    y += 5;
  }
  if (profile.email) {
    doc.text(`Email: ${profile.email}`, 20, y);
    y += 5;
  }

  // Bill To section
  y += 10;
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 20, y);
  
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(invoice.customer.name, 20, y);
  
  y += 5;
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.setFontSize(9);
  if (invoice.customer.phone) {
    doc.text(invoice.customer.phone, 20, y);
    y += 5;
  }
  if (invoice.customer.email) {
    doc.text(invoice.customer.email, 20, y);
    y += 5;
  }

  // Invoice details on the right
  const detailsX = pageWidth - 80;
  let detailsY = 55;
  
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.setFontSize(9);
  doc.text('Date:', detailsX, detailsY);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(formatDate(invoice.createdAt), detailsX + 35, detailsY);
  
  detailsY += 6;
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text('Due Date:', detailsX, detailsY);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(formatDate(invoice.dueDate), detailsX + 35, detailsY);

  detailsY += 6;
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text('Payment:', detailsX, detailsY);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(invoice.paymentMethod === 'mpesa' ? 'M-Pesa' : 'Cash', detailsX + 35, detailsY);

  detailsY += 6;
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text('Status:', detailsX, detailsY);
  
  const statusColors: Record<string, number[]> = {
    paid: [34, 197, 94],
    sent: [59, 130, 246],
    overdue: [239, 68, 68],
    draft: [107, 114, 128],
  };
  const statusColor = statusColors[invoice.status] || mutedColor;
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1), detailsX + 35, detailsY);

  // Items table
  y = Math.max(y, detailsY) + 20;
  
  // Table header
  doc.setFillColor(248, 250, 252);
  doc.rect(20, y - 5, pageWidth - 40, 10, 'F');
  
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 25, y);
  doc.text('Qty', pageWidth - 90, y, { align: 'right' });
  doc.text('Unit Price', pageWidth - 55, y, { align: 'right' });
  doc.text('Total', pageWidth - 25, y, { align: 'right' });

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);

  // Table rows
  invoice.items.forEach((item) => {
    doc.text(item.description, 25, y);
    doc.text(item.quantity.toString(), pageWidth - 90, y, { align: 'right' });
    doc.text(formatKES(item.unitPrice), pageWidth - 55, y, { align: 'right' });
    doc.text(formatKES(item.total), pageWidth - 25, y, { align: 'right' });
    y += 8;
  });

  // Divider
  y += 5;
  doc.setDrawColor(229, 231, 235);
  doc.line(pageWidth - 100, y, pageWidth - 20, y);
  y += 10;

  // Totals
  const totalsX = pageWidth - 100;
  
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.setFontSize(10);
  doc.text('Subtotal:', totalsX, y);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(formatKES(invoice.subtotal), pageWidth - 25, y, { align: 'right' });

  if (invoice.vatAmount > 0) {
    y += 8;
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text('VAT (16%):', totalsX, y);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(formatKES(invoice.vatAmount), pageWidth - 25, y, { align: 'right' });
  }

  y += 10;
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(totalsX - 5, y - 5, pageWidth - totalsX - 10, 12, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Total:', totalsX, y + 2);
  doc.text(formatKES(invoice.total), pageWidth - 25, y + 2, { align: 'right' });

  // Payment info
  if (invoice.paymentMethod === 'mpesa' && (profile.mpesaPaybill || profile.mpesaTillNumber)) {
    y += 25;
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('M-Pesa Payment Details', 20, y);
    
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    
    if (profile.mpesaPaybill) {
      doc.text(`Paybill Number: ${profile.mpesaPaybill}`, 20, y);
      y += 5;
      doc.text(`Account Number: ${invoice.invoiceNumber}`, 20, y);
    } else if (profile.mpesaTillNumber) {
      doc.text(`Till Number: ${profile.mpesaTillNumber}`, 20, y);
    }
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.setFontSize(8);
  doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, footerY + 5, { align: 'center' });

  // Save the PDF
  doc.save(`${invoice.invoiceNumber}.pdf`);
}
