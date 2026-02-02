import React from 'react';

export const Invoice = React.forwardRef(({ sale, user }, ref) => {
    // 1. Safety Check: If no data, don't crash
    if (!sale) return null;

    // 2. DATA NORMALIZATION (The Fix)
    // This line prevents the crash by checking all possible names for the product list
    const itemsList = sale.cart || sale.items || sale.products || [];
    
    // Handle different amount field names
    const subTotal = sale.subtotal || sale.totalAmount || 0;
    const finalTotal = sale.finalAmount || sale.totalAmount || 0;
    const discountVal = sale.discountAmount || (sale.discount ? sale.discount.amount : 0) || 0;

    return (
        <div ref={ref} className="bg-white text-black p-10 font-sans max-w-[210mm] mx-auto leading-relaxed h-auto">
            
            {/* HEADER */}
            <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-6">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">STYLESYNC</h1>
                    <p className="text-sm font-semibold text-gray-600 mt-1">PREMIUM CLOTHING RETAIL</p>
                    <p className="text-xs text-gray-500 mt-2">
                        123, Fashion Street, Main Market,<br/>
                        {sale.storeLocation || "Main Store"}, India<br/>
                        GSTIN: 24ABCDE1234F1Z5 | Ph: +91 98765 43210
                    </p>
                </div>
                <div className="text-right">
                    <h2 className="text-2xl font-bold text-gray-400 uppercase tracking-widest">Invoice</h2>
                    <p className="text-sm font-bold mt-2">#{sale._id ? sale._id.toString().slice(-8).toUpperCase() : "DRAFT"}</p>
                    <p className="text-xs text-gray-500">Date: {new Date(sale.date || sale.createdAt || Date.now()).toLocaleDateString()}</p>
                </div>
            </div>

            {/* CUSTOMER */}
            <div className="flex justify-between mb-8 text-sm">
                <div className="w-1/2">
                    <p className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-1">Billed To:</p>
                    <p className="font-bold text-lg">{sale.customerName || "Walk-in Customer"}</p>
                    <p className="text-gray-700">+91 {sale.customerPhone || "N/A"}</p>
                    <p className="text-gray-600 w-3/4 mt-1">{sale.customerAddress || sale.homeAddress || ""}</p>
                </div>
                <div className="w-1/2 text-right">
                    <p className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-1">Served By:</p>
                    <p className="font-bold">{user?.name || "Staff Member"}</p>
                </div>
            </div>

            {/* TABLE (Fixed to use itemsList) */}
            <div className="mb-8">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b-2 border-black text-xs uppercase bg-gray-50">
                            <th className="py-3 px-2 font-bold text-gray-700">Item</th>
                            <th className="py-3 px-2 font-bold text-gray-700 text-center">Qty</th>
                            <th className="py-3 px-2 font-bold text-gray-700 text-right">Price</th>
                            <th className="py-3 px-2 font-bold text-gray-700 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {itemsList.length > 0 ? itemsList.map((item, index) => (
                            <tr key={index} className="border-b border-gray-200">
                                <td className="py-3 px-2 font-medium">{item.name || "Unknown Item"}</td>
                                <td className="py-3 px-2 text-center">{item.qty || item.quantity || 1}</td>
                                <td className="py-3 px-2 text-right">${(item.price || 0).toFixed(2)}</td>
                                <td className="py-3 px-2 text-right font-bold">${((item.price || 0) * (item.qty || item.quantity || 1)).toFixed(2)}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan="4" className="text-center py-4 text-gray-500">No items found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* TOTALS */}
            <div className="flex justify-end mb-12">
                <div className="w-64">
                    <div className="flex justify-between py-1 text-sm text-gray-600">
                        <span>Subtotal:</span>
                        <span>${Number(subTotal).toFixed(2)}</span>
                    </div>
                    {Number(discountVal) > 0 && (
                        <div className="flex justify-between py-1 text-sm text-emerald-600 font-bold">
                            <span>Discount:</span>
                            <span>-${Number(discountVal).toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between py-3 text-2xl font-black border-b-2 border-black text-black mt-1">
                        <span>Total:</span>
                        <span>${Number(finalTotal).toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* FOOTER */}
            <div className="text-center text-[10px] text-gray-400 mt-10 border-t pt-4">
                <p>Thank you for shopping at StyleSync. Visit Again!</p>
            </div>
        </div>
    );
});
