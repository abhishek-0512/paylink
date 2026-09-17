const PDFDocument = require('pdfkit');
const { BadRequestError } = require('../../utils/errors');
const { formatCurrency } = require('../../utils/helpers');
const logger = require('../../utils/logger');

class ReceiptService {
  /**
   * Generate PDF receipt stream for a completed payment
   * @param {Object} payment - Mongoose payment document
   * @param {WritableStream} outputStream - Express res or writable stream
   */
  generatePDFReceipt(payment, outputStream) {
    if (!payment || payment.status !== 'SUCCESS') {
      throw new BadRequestError('Receipt can only be generated for successfully completed payments');
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Pipe PDF doc to output stream
    doc.pipe(outputStream);

    // Color Palette
    const primaryColor = '#2563EB'; // Blue 600
    const successColor = '#16A34A'; // Green 600
    const textColor = '#1F2937';    // Gray 800
    const lightGray = '#F3F4F6';    // Gray 100
    const borderGray = '#E5E7EB';   // Gray 200

    // Header Title
    doc
      .fillColor(primaryColor)
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('PAYMENT RECEIPT', 50, 45, { align: 'center' });

    doc
      .fillColor('#6B7280')
      .fontSize(10)
      .font('Helvetica')
      .text('Official Payment Confirmation Document', { align: 'center' })
      .moveDown(1.5);

    // Top Details Box (Receipt No & Status)
    const startY = 105;
    doc
      .rect(50, startY, 495, 60)
      .fill(lightGray)
      .stroke(borderGray);

    doc
      .fillColor(textColor)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(`Receipt No: ${payment.receiptNumber || 'REC-CONFIRMED'}`, 65, startY + 15);

    const paidDateStr = payment.paidAt
      ? new Date(payment.paidAt).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : new Date().toLocaleDateString('en-IN');

    doc
      .font('Helvetica')
      .fontSize(10)
      .text(`Date: ${paidDateStr}`, 65, startY + 35);

    // Paid Status Badge
    doc
      .rect(420, startY + 15, 100, 30)
      .fill(successColor);

    doc
      .fillColor('#FFFFFF')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('PAID ✓', 420, startY + 23, { width: 100, align: 'center' });

    // Customer Information Section
    const customerY = startY + 80;
    doc
      .fillColor(primaryColor)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Customer Information', 50, customerY);

    doc
      .moveTo(50, customerY + 20)
      .lineTo(545, customerY + 20)
      .strokeColor(borderGray)
      .stroke();

    doc
      .fillColor(textColor)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Name:', 50, customerY + 30)
      .font('Helvetica')
      .text(payment.customerName, 150, customerY + 30);

    doc
      .font('Helvetica-Bold')
      .text('WhatsApp Phone:', 50, customerY + 48)
      .font('Helvetica')
      .text(payment.customerPhone, 150, customerY + 48);

    // Payment Details Section
    const paymentY = customerY + 80;
    doc
      .fillColor(primaryColor)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Payment Details', 50, paymentY);

    doc
      .moveTo(50, paymentY + 20)
      .lineTo(545, paymentY + 20)
      .strokeColor(borderGray)
      .stroke();

    const details = [
      { label: 'Description', value: payment.description || 'Payment Request' },
      { label: 'Amount Paid', value: formatCurrency(payment.amount, payment.currency) },
      { label: 'Currency', value: payment.currency },
      { label: 'Payment Gateway', value: payment.paymentGateway.toUpperCase() },
      { label: 'Transaction ID', value: payment.gatewayPaymentId || payment.paymentId },
      { label: 'Internal Payment ID', value: payment.paymentId },
      { 
        label: 'Payment Date & Time', 
        value: payment.paidAt 
          ? new Date(payment.paidAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) 
          : new Date().toLocaleString('en-IN') 
      }
    ];

    let currentY = paymentY + 30;
    details.forEach((item, index) => {
      // Row background
      if (index % 2 === 0) {
        doc.rect(50, currentY - 4, 495, 22).fill(lightGray);
      }

      doc
        .fillColor(textColor)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(item.label, 60, currentY)
        .font('Helvetica')
        .text(item.value, 220, currentY);

      currentY += 24;
    });

    // Footer Divider & Thank You
    const footerY = currentY + 30;
    doc
      .moveTo(50, footerY)
      .lineTo(545, footerY)
      .strokeColor(borderGray)
      .stroke();

    doc
      .fillColor(primaryColor)
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Thank you for your payment!', 50, footerY + 15, { align: 'center' });

    doc
      .fillColor('#9CA3AF')
      .fontSize(8)
      .font('Helvetica')
      .text('This is a system-generated electronic receipt and does not require a physical signature.', 50, footerY + 35, { align: 'center' });

    // Finalize PDF
    doc.end();
    logger.info(`PDF receipt generated for payment ${payment.paymentId}`);
  }
}

module.exports = new ReceiptService();
