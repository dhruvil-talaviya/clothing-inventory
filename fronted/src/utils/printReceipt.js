import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateReceipt = (saleData) => {
  const doc = new jsPDF();
  
  // --- 1. Header & Branding ---
  doc.setFillColor(30, 41, 59); // Dark Blue Header Background
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("StyleSync OS", 105, 20, { align: "center" }); // Your Brand Name
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Secure Inventory & Retail Management", 105, 30, { align: "center" });

  // --- 2. Invoice Details ---
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(`Bill ID: ${saleData.invoiceId}`, 15, 55);
  doc.text(`Date: ${new Date().toLocaleString()}`, 15, 62);
  
  // Customer Info Box
  doc.setDrawColor(200);
  doc.rect(15, 70, 180, 25);
  doc.setFontSize(10);
  doc.text(`Customer: ${saleData.customerName || 'Walk-in'}`, 20, 80);
  doc.text(`Phone: ${saleData.customerPhone || 'N/A'}`, 20, 88);
  doc.text(`Served by: ${saleData.staffId}`, 120, 80);

  // --- 3. Items Table ---
  const tableColumn = ["Item", "Qty", "Price", "Total"];
  const tableRows = [];

  saleData.items.forEach(item => {
    const ticketData = [
      item.name,
      item.quantity,
      `$${item.price.toFixed(2)}`,
      `$${(item.price * item.quantity).toFixed(2)}`
    ];
    tableRows.push(ticketData);
  });

  doc.autoTable({
    startY: 105,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] }, // Blue header
  });

  // --- 4. Total & Footer ---
  const finalY = doc.lastAutoTable.finalY + 10;
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`Grand Total: $${saleData.totalAmount.toFixed(2)}`, 140, finalY);

  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100);
  doc.text("Thank you for shopping with us!", 105, finalY + 20, { align: "center" });

  // --- 5. Save/Download ---
  doc.save(`Receipt_${saleData.invoiceId}.pdf`);
};