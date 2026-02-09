import React from 'react';

export const Invoice = React.forwardRef(({ sale }, ref) => {
    if (!sale) return null;

    // 1. Currency Helper
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'USD', // Change to 'INR' for ₹
            minimumFractionDigits: 2
        }).format(amount || 0);
    };

    // 2. Date Helper
    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString || Date.now()).toLocaleDateString('en-US', options);
    };

    // 3. Calculation Helpers
    const subtotal = Number(sale.subtotal) || 0;
    const discountAmount = Number(sale.discount?.amount || sale.discount || 0);
    const totalAmount = Number(sale.totalAmount) || 0;

    return (
        <div ref={ref} className="bg-white w-full max-w-[210mm] mx-auto min-h-[297mm] p-10 text-gray-900 font-sans leading-normal relative">
            
            {/* --- TOP BRANDING SECTION --- */}
            <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-6">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 tracking-wide uppercase">FASHION HUB</h1>
                    <p className="text-sm text-gray-600 mt-2 font-medium">Premium Clothing Retailer</p>
                </div>
                <div className="text-right">
                    <h2 className="text-3xl font-bold text-gray-400 uppercase tracking-widest">Invoice</h2>
                    <div className="mt-2 text-sm">
                        <p className="font-bold text-gray-800">Invoice #: <span className="font-mono font-normal">{sale._id ? sale._id.slice(-6).toUpperCase() : 'N/A'}</span></p>
                        <p className="font-bold text-gray-800">Date: <span className="font-normal">{formatDate(sale.date || sale.createdAt)}</span></p>
                    </div>
                </div>
            </div>

            {/* --- ADDRESSES GRID --- */}
            <div className="grid grid-cols-2 gap-8 mb-8">
                {/* Store Details */}
                <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-300 pb-1">From:</h3>
                    <p className="font-bold text-gray-800 text-lg">Fashion Hub Store</p>
                    <div className="text-sm text-gray-600 mt-1 space-y-1">
                        <p>123 Market Street, Main Complex</p>
                        <p>Gujarat, India - 390001</p>
                        <p>Phone: +91 98765 43210</p>
                        <p>Email: support@fashionhub.com</p>
                    </div>
                </div>

                {/* Customer Details */}
                <div className="text-right">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-300 pb-1">Bill To:</h3>
                    <p className="font-bold text-gray-800 text-lg">{sale.customerName || 'Walk-in Customer'}</p>
                    <div className="text-sm text-gray-600 mt-1 space-y-1">
                        {sale.customerAddress ? (
                            <p className="max-w-[200px] ml-auto">{sale.customerAddress}</p>
                        ) : <p>Address Not Provided</p>}
                        <p>{sale.storeLocation || 'Local Store'}</p>
                        <p>{sale.customerPhone}</p>
                    </div>
                </div>
            </div>

            {/* --- ITEMS TABLE --- */}
            <div className="mb-8">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-800 text-white">
                            <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider w-1/2">Description</th>
                            <th className="py-3 px-4 text-center text-xs font-bold uppercase tracking-wider">Qty</th>
                            <th className="py-3 px-4 text-right text-xs font-bold uppercase tracking-wider">Unit Price</th>
                            <th className="py-3 px-4 text-right text-xs font-bold uppercase tracking-wider">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm border border-gray-200">
                        {(sale.items || sale.cart || []).map((item, index) => (
                            <tr key={index} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                <td className="py-3 px-4">
                                    <p className="font-bold text-gray-800">{item.name}</p>
                                    <span className="text-xs text-gray-500">ID: {item.productId || item._id}</span>
                                </td>
                                <td className="py-3 px-4 text-center font-medium text-gray-700">
                                    {item.quantity || item.qty}
                                </td>
                                <td className="py-3 px-4 text-right text-gray-700">
                                    {formatCurrency(item.price)}
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-gray-900">
                                    {formatCurrency(item.price * (item.quantity || item.qty))}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* --- TOTALS SECTION --- */}
            <div className="flex justify-end mb-12">
                <div className="w-1/2 lg:w-1/3">
                    <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
                        <span className="font-medium text-gray-600">Subtotal:</span>
                        <span className="font-bold text-gray-900">{formatCurrency(subtotal)}</span>
                    </div>
                    
                    {discountAmount > 0 && (
                        <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
                            <span className="font-medium text-red-600">Discount:</span>
                            <span className="font-bold text-red-600">- {formatCurrency(discountAmount)}</span>
                        </div>
                    )}
                    
                    <div className="flex justify-between py-3 border-b-2 border-gray-800 mt-2 bg-gray-50 px-2">
                        <span className="font-black text-lg text-gray-900 uppercase">Total Paid</span>
                        <span className="font-black text-xl text-gray-900">{formatCurrency(totalAmount)}</span>
                    </div>
                </div>
            </div>

            {/* --- FOOTER (Terms) --- */}
            <div className="mt-12 pt-6 border-t border-gray-300">
                <div className="flex justify-between items-end">
                    <div className="text-xs text-gray-500 max-w-md">
                        <p className="font-bold text-gray-700 uppercase mb-1">Terms & Conditions:</p>
                        <p>1. Goods once sold will not be taken back unless defective.</p>
                        <p>2. Exchange available within 7 days with original tag and receipt.</p>
                        <p>3. This is a computer-generated invoice and requires no signature.</p>
                    </div>
                    <div className="text-right">
                        <div className="h-12 w-32 border-b border-gray-400 mb-1"></div>
                        <p className="text-xs font-bold text-gray-600 uppercase">Authorized Signatory</p>
                    </div>
                </div>
                
                <div className="mt-8 text-center">
                    <p className="text-sm font-bold text-gray-800">THANK YOU FOR YOUR BUSINESS!</p>
                </div>
            </div>

            {/* --- PRINT STYLES --- */}
            <style type="text/css" media="print">
                {`
                    @page { 
                        size: A4; 
                        margin: 10mm; 
                    }
                    body { 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                    }
                    .bg-gray-800 { background-color: #1f2937 !important; color: white !important; }
                    .bg-gray-50 { background-color: #f9fafb !important; }
                `}
            </style>
        </div>
    );
});
