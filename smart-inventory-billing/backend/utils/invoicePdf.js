const PDFDocument = require('pdfkit');

function generateInvoicePdf(invoice, items, customer, cashier, res) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoice_no}.pdf`);
  doc.pipe(res);

  // Header
  doc
    .fontSize(20)
    .fillColor('#1e3a8a')
    .text('Smart Inventory & Billing System', { align: 'left' })
    .fontSize(10)
    .fillColor('#555')
    .text('123 Business Street, Bengaluru, KA', { align: 'left' })
    .moveDown(1.5);

  doc
    .fontSize(16)
    .fillColor('#000')
    .text('INVOICE', { align: 'right' })
    .fontSize(10)
    .fillColor('#555')
    .text(`Invoice No: ${invoice.invoice_no}`, { align: 'right' })
    .text(`Date: ${new Date(invoice.created_at).toLocaleString()}`, { align: 'right' })
    .text(`Served by: ${cashier ? cashier.name : 'N/A'}`, { align: 'right' })
    .moveDown(1);

  // Bill to
  doc
    .fontSize(11)
    .fillColor('#000')
    .text('Bill To:', { underline: true })
    .fontSize(10)
    .text(customer ? customer.name : 'Walk-in Customer')
    .text(customer && customer.phone ? `Phone: ${customer.phone}` : '')
    .text(customer && customer.email ? `Email: ${customer.email}` : '')
    .moveDown(1);

  // Table header
  const tableTop = doc.y + 10;
  const col = { name: 50, qty: 280, price: 350, total: 450 };

  doc
    .fontSize(10)
    .fillColor('#fff')
    .rect(50, tableTop, 500, 20)
    .fill('#1e3a8a');

  doc
    .fillColor('#fff')
    .text('Product', col.name + 5, tableTop + 5)
    .text('Qty', col.qty, tableTop + 5)
    .text('Unit Price', col.price, tableTop + 5)
    .text('Total', col.total, tableTop + 5);

  let y = tableTop + 25;
  doc.fillColor('#000');
  items.forEach((item, idx) => {
    if (idx % 2 === 0) {
      doc.rect(50, y - 3, 500, 20).fill('#f3f4f6');
      doc.fillColor('#000');
    }
    doc
      .fontSize(10)
      .text(item.product_name, col.name + 5, y)
      .text(String(item.quantity), col.qty, y)
      .text(`Rs. ${item.unit_price.toFixed(2)}`, col.price, y)
      .text(`Rs. ${item.line_total.toFixed(2)}`, col.total, y);
    y += 20;
  });

  y += 15;
  doc.moveTo(350, y).lineTo(550, y).strokeColor('#ccc').stroke();
  y += 10;

  doc
    .fontSize(10)
    .text('Subtotal:', 350, y)
    .text(`Rs. ${invoice.subtotal.toFixed(2)}`, col.total, y);
  y += 18;
  doc
    .text(`Tax (${invoice.tax_percent}%):`, 350, y)
    .text(`Rs. ${invoice.tax_amount.toFixed(2)}`, col.total, y);
  y += 18;
  doc
    .text('Discount:', 350, y)
    .text(`Rs. ${invoice.discount.toFixed(2)}`, col.total, y);
  y += 18;
  doc
    .fontSize(12)
    .fillColor('#1e3a8a')
    .text('Grand Total:', 350, y, { bold: true })
    .text(`Rs. ${invoice.total.toFixed(2)}`, col.total, y);

  y += 40;
  doc
    .fontSize(9)
    .fillColor('#888')
    .text(`Payment Method: ${invoice.payment_method.toUpperCase()}`, 50, y)
    .text('Thank you for your business!', 50, y + 15, { align: 'center', width: 500 });

  doc.end();
}

module.exports = { generateInvoicePdf };
