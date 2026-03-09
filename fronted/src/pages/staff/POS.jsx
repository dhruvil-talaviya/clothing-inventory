import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { 
    FiSearch, FiShoppingCart, FiX, FiPlus, FiMinus, FiTag,
    FiCheckCircle, FiAlertTriangle, FiLock, FiPrinter
} from 'react-icons/fi';
import { BiBarcodeReader } from 'react-icons/bi';

const CATEGORIES = ["All", "Shirt", "T-Shirt", "Jeans", "Trousers", "Shoes", "Jacket", "Kurta", "Saree", "Watch", "Accessories"];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

// ─── BARCODE SCANNER HOOK ─────────────────────────────────────────
// Captures USB scanner keystrokes (very fast) + Enter trigger
const useBarcodeScanner = (onScan, enabled = true) => {
    const buffer = useRef('');
    const lastKeyTime = useRef(0);

    useEffect(() => {
        if (!enabled) return;
        const handleKey = (e) => {
            const now = Date.now();
            if (now - lastKeyTime.current > 300 && buffer.current.length > 0) {
                buffer.current = '';
            }
            lastKeyTime.current = now;

            if (e.key === 'Enter') {
                const scanned = buffer.current.trim();
                if (scanned.length >= 4) onScan(scanned);
                buffer.current = '';
                return;
            }
            if (e.key.length === 1) buffer.current += e.key;
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onScan, enabled]);
};

// ─── SIZE SELECTOR MODAL ──────────────────────────────────────────
const SizeSelectorModal = ({ product, onSelect, onClose }) => {
    if (!product) return null;
    const variants = product.variants || [];

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
                <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <div>
                        <h3 className="text-lg font-black text-white">Select Size</h3>
                        <p className="text-slate-400 text-xs mt-0.5 truncate max-w-[220px]">{product.name}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-2 bg-slate-800 rounded-xl transition-colors"><FiX size={18}/></button>
                </div>
                <div className="p-5">
                    {variants.length > 0 ? (
                        <>
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                {SIZES.map(size => {
                                    const variant = variants.find(v => v.size === size);
                                    const hasStock = variant && variant.stock > 0;
                                    const noVariant = !variant;
                                    return (
                                        <button
                                            key={size}
                                            disabled={!hasStock}
                                            onClick={() => onSelect(product, size, variant)}
                                            className={`relative py-4 rounded-xl font-black text-lg transition-all border
                                                ${noVariant 
                                                    ? 'opacity-20 cursor-not-allowed bg-slate-950 border-slate-800 text-slate-600' 
                                                    : !hasStock 
                                                        ? 'opacity-40 cursor-not-allowed bg-red-950/30 border-red-500/20 text-red-500' 
                                                        : 'bg-slate-800 border-slate-700 hover:border-indigo-500 hover:bg-indigo-600/20 text-white cursor-pointer active:scale-95'
                                                }`}
                                        >
                                            {size}
                                            {variant && (
                                                <span className={`absolute bottom-1 right-1.5 text-[8px] font-black
                                                    ${variant.stock <= 0 ? 'text-red-400' : variant.stock <= 5 ? 'text-orange-400' : 'text-emerald-400'}`}>
                                                    {variant.stock <= 0 ? 'OUT' : variant.stock}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="p-3 bg-slate-950 rounded-xl flex justify-between items-center border border-slate-800">
                                <span className="text-xs text-slate-500 font-bold">Unit Price</span>
                                <span className="text-emerald-400 font-black text-lg">${Number(product.price || 0).toFixed(2)}</span>
                            </div>
                        </>
                    ) : (
                        // No size variants (watch, accessories etc.)
                        <button
                            onClick={() => onSelect(product, 'OS', null)}
                            className="w-full py-4 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all"
                        >
                            Add to Cart — ${Number(product.price || 0).toFixed(2)}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── COUPON OPTION ROW ────────────────────────────────────────────
const CouponOption = ({ offer, subtotal, selected, onSelect }) => {
    const minOrder = offer.minOrder || offer.minOrderValue || 0;
    const isEligible = subtotal >= minOrder;
    const val = offer.value || offer.discountPercent || 0;
    const type = (offer.type || '').toLowerCase();
    const savingsLabel = type === 'percentage' ? `${val}% off` : `$${val} off`;

    return (
        <div
            onClick={() => isEligible && onSelect(offer)}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all
                ${!isEligible
                    ? 'opacity-50 cursor-not-allowed border-slate-800 bg-slate-900/40'
                    : selected
                        ? 'cursor-pointer border-indigo-500 bg-indigo-500/10'
                        : 'cursor-pointer border-slate-700 bg-slate-950 hover:border-indigo-500/50'
                }`}
        >
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isEligible ? (selected ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-indigo-400') : 'bg-slate-800 text-slate-600'}`}>
                    {isEligible ? <FiTag size={13}/> : <FiLock size={13}/>}
                </div>
                <div>
                    <p className={`text-sm font-black ${isEligible ? 'text-white' : 'text-slate-500'}`}>{offer.code}</p>
                    <p className={`text-[10px] font-bold ${isEligible ? 'text-emerald-400' : 'text-slate-600'}`}>{savingsLabel}</p>
                </div>
            </div>
            <div className="text-right shrink-0 ml-2">
                {isEligible ? (
                    <span className={`text-[10px] font-black px-2 py-1 rounded-md ${selected ? 'bg-indigo-500 text-white' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                        {selected ? '✓ Applied' : 'Eligible'}
                    </span>
                ) : (
                    <div>
                        <span className="text-[10px] font-black px-2 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 block">Locked</span>
                        <span className="text-[9px] text-slate-500 mt-0.5 block">Add ${(minOrder - subtotal).toFixed(2)} more</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── MAIN POS COMPONENT ───────────────────────────────────────────
const POS = ({ products = [], cart = [], setCart, discounts = [], onCheckoutSuccess }) => {
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [selectedDiscount, setSelectedDiscount] = useState(null);
    const [showCoupons, setShowCoupons] = useState(false);
    const [showBillModal, setShowBillModal] = useState(false);
    const [sizeModal, setSizeModal] = useState(null); // product to pick size for
    const [scanStatus, setScanStatus] = useState(null); // { type, msg }
    const [scannerActive, setScannerActive] = useState(true);
    const [manualSku, setManualSku] = useState('');
    const [customer, setCustomer] = useState({ name: '', phone: '', address: '', city: '' });

    // ── SCAN RESOLVER ──
    const resolveScan = useCallback((sku) => {
        const skuUpper = sku.toUpperCase().trim();
        for (const product of products) {
            if (product.variants?.length) {
                for (const variant of product.variants) {
                    if ((variant.sku || '').toUpperCase() === skuUpper) {
                        return { product, size: variant.size, variant };
                    }
                }
            }
            if ((product.sku || '').toUpperCase() === skuUpper) {
                return { product, size: null, variant: null };
            }
        }
        return null;
    }, [products]);

    // ── HANDLE SCAN ──
    const handleScan = useCallback((sku) => {
        const result = resolveScan(sku);
        if (result) {
            if (result.size) {
                // Exact variant match — direct add
                addToCartWithSize(result.product, result.size, result.variant);
                setScanStatus({ type: 'success', msg: `✓ ${result.product.name} (${result.size})` });
            } else {
                // Legacy SKU — show size picker
                setSizeModal({ product: result.product });
                setScanStatus({ type: 'success', msg: `Found: ${result.product.name} — select size` });
            }
        } else {
            setScanStatus({ type: 'error', msg: `No product found for: ${sku}` });
        }
        setTimeout(() => setScanStatus(null), 2500);
    }, [resolveScan, products]);

    useBarcodeScanner(handleScan, scannerActive);

    // ── ADD TO CART (click on card — shows size modal) ──
    const addToCart = (p) => {
        const totalStock = p.totalStock || p.stock || 0;
        if (totalStock <= 0) {
            setScanStatus({ type: 'error', msg: 'Out of Stock!' });
            setTimeout(() => setScanStatus(null), 2000);
            return;
        }
        if (p.variants?.length > 0) {
            setSizeModal({ product: p });
        } else {
            addToCartWithSize(p, 'OS', null);
        }
    };

    // ── ADD TO CART WITH SIZE ──
    const addToCartWithSize = (product, size, variant) => {
        const stockForSize = variant?.stock ?? product.stock ?? 0;
        if (stockForSize <= 0) {
            setScanStatus({ type: 'error', msg: `${product.name} (${size}) is out of stock!` });
            setTimeout(() => setScanStatus(null), 2500);
            return;
        }
        const cartKey = `${product._id}_${size}`;
        setCart(prev => {
            const existing = prev.find(x => x._cartKey === cartKey);
            if (existing) {
                if (existing.qty >= stockForSize) {
                    setScanStatus({ type: 'error', msg: 'Stock limit reached!' });
                    setTimeout(() => setScanStatus(null), 2000);
                    return prev;
                }
                return prev.map(x => x._cartKey === cartKey ? { ...x, qty: x.qty + 1 } : x);
            }
            return [...prev, {
                ...product,
                _cartKey: cartKey,
                _size: size,
                _sku: variant?.sku || product.sku,
                _maxStock: stockForSize,
                productId: product._id,
                qty: 1
            }];
        });
        setSizeModal(null);
    };

    // ── UPDATE QTY ──
    const updateQty = (cartKey, delta) => {
        setCart(prev => prev.map(item => {
            if (item._cartKey === cartKey) {
                const newQty = Math.max(1, item.qty + delta);
                if (delta > 0 && newQty > (item._maxStock || 99)) return item;
                return { ...item, qty: newQty };
            }
            return item;
        }));
    };

    // ── CALCULATIONS ──
    const subtotal = useMemo(() => cart.reduce((acc, item) => acc + (item.price * item.qty), 0), [cart]);

    const discountAmount = useMemo(() => {
        if (!selectedDiscount) return 0;
        const minOrder = selectedDiscount.minOrder || selectedDiscount.minOrderValue || 0;
        if (subtotal < minOrder) return 0;
        const val = selectedDiscount.value || 0;
        const type = (selectedDiscount.type || 'percentage').toLowerCase();
        return type === 'percentage' ? (subtotal * val / 100) : val;
    }, [selectedDiscount, subtotal]);

    const finalTotal = Math.max(0, subtotal - discountAmount);

    // Auto-remove coupon if cart drops below minimum
    useEffect(() => {
        if (selectedDiscount) {
            const minOrder = selectedDiscount.minOrder || selectedDiscount.minOrderValue || 0;
            if (subtotal < minOrder) {
                setSelectedDiscount(null);
            }
        }
    }, [subtotal]);

    const eligibleCount = discounts.filter(o => subtotal >= (o.minOrder || o.minOrderValue || 0)).length;

    // ── FILTER PRODUCTS ──
    const filtered = useMemo(() => products.filter(p =>
        p.name?.toLowerCase().includes(search.toLowerCase()) &&
        (category === 'All' || p.category === category)
    ), [products, search, category]);

    // ── CHECKOUT ──
    const handleCheckout = async (e) => {
        e.preventDefault();
        if (customer.phone.length < 10) return alert("Invalid Phone Number");
        if (cart.length === 0) return alert("Cart is empty");

        const rawUser = localStorage.getItem('user');
        const userInfo = rawUser ? JSON.parse(rawUser) : null;
        if (!userInfo) return alert("Session Expired. Please Login.");

        const saleData = {
            items: cart.map(item => ({
                productId: item.productId || item._id,
                name: `${item.name}${item._size && item._size !== 'OS' ? ` (${item._size})` : ''}`,
                price: item.price,
                quantity: item.qty,
                sku: item._sku,
                size: item._size
            })),
            customerName: customer.name,
            customerPhone: customer.phone,
            customerAddress: customer.address,
            storeLocation: customer.city,
            subtotal,
            discount: discountAmount,
            totalAmount: finalTotal,
            soldBy:    userInfo._id       || userInfo.id,
            staffId:   userInfo.employeeId || userInfo.staffId || "N/A",
            staffName: userInfo.name       || userInfo.username || "Staff",
        };

        try {
            const config = userInfo.token ? { headers: { Authorization: `Bearer ${userInfo.token}` } } : {};
            const res = await axios.post('http://localhost:5001/api/staff/create-sale', saleData, config);
            alert("✅ Sale Completed Successfully!");
            if (onCheckoutSuccess) onCheckoutSuccess(res.data);
            setCart([]);
            setShowBillModal(false);
            setSelectedDiscount(null);
            setCustomer({ name: '', phone: '', address: '', city: '' });
        } catch (err) {
            console.error("Checkout Error:", err.response?.data);
            alert(`⚠️ Error: ${err.response?.data?.message || "Transaction Failed"}`);
        }
    };

    const getProductImage = (name = '') => {
        const n = name.toLowerCase();
        if (n.includes('t-shirt')) return "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=80";
        if (n.includes('shirt')) return "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=400&q=80";
        if (n.includes('jean')) return "https://images.unsplash.com/photo-1542272617-08f08630329e?auto=format&fit=crop&w=400&q=80";
        if (n.includes('shoe')) return "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80";
        return "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=400&q=80";
    };

    return (
        <div className="flex h-full text-slate-100 bg-slate-950 font-sans overflow-hidden">

            {/* ── SIZE SELECTOR MODAL ── */}
            {sizeModal && (
                <SizeSelectorModal
                    product={sizeModal.product}
                    onSelect={addToCartWithSize}
                    onClose={() => setSizeModal(null)}
                />
            )}

            {/* ── LEFT: PRODUCTS ── */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-900/50 flex flex-col">
                <div className="flex justify-between items-center mb-5">
                    <h1 className="text-2xl font-black tracking-tight text-white">POS Terminal</h1>
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-3 text-slate-500" size={15}/>
                        <input
                            type="text"
                            placeholder="Search inventory..."
                            className="bg-slate-800 rounded-xl py-2.5 pl-9 pr-4 text-sm w-64 border border-slate-700 outline-none focus:border-indigo-500 transition-all"
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* Category pills */}
                <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-5">
                    {CATEGORIES.map(c => (
                        <button key={c} onClick={() => setCategory(c)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap border
                                ${category === c ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:border-slate-600'}`}>
                            {c}
                        </button>
                    ))}
                </div>

                {/* Product grid */}
                {filtered.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                        <FiShoppingCart size={40} className="mb-3 opacity-30"/>
                        <p className="font-bold">No products found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
                        {filtered.map(p => {
                            const totalStock = p.totalStock || p.stock || 0;
                            const isLow = totalStock > 0 && totalStock <= 10;
                            const isOut = totalStock <= 0;
                            const availSizes = (p.variants || []).filter(v => v.stock > 0).map(v => v.size);

                            return (
                                <div key={p._id} onClick={() => addToCart(p)}
                                    className={`bg-slate-800 rounded-xl border overflow-hidden cursor-pointer group transition-all hover:-translate-y-0.5
                                        ${isOut ? 'opacity-50 cursor-not-allowed border-slate-700' : 'border-slate-700 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10'}`}>
                                    <div className="relative h-36 overflow-hidden bg-slate-900">
                                        <img src={p.image || getProductImage(p.name)} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" alt={p.name}/>
                                        {isLow && !isOut && <span className="absolute top-2 left-2 bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase">Low</span>}
                                        {isOut && <span className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase">Out</span>}
                                        {!isOut && (
                                            <div className="absolute inset-0 bg-indigo-600/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <div className="bg-white p-2 rounded-full"><FiPlus className="text-indigo-600" size={20}/></div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <h4 className="text-sm font-bold text-slate-200 line-clamp-1 mb-1">{p.name}</h4>
                                        {/* Available sizes row */}
                                        {availSizes.length > 0 && (
                                            <div className="flex gap-1 flex-wrap mb-2">
                                                {availSizes.map(s => (
                                                    <span key={s} className="text-[8px] font-black px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 border border-slate-600">{s}</span>
                                                ))}
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center">
                                            <span className="text-emerald-400 font-black">${Number(p.price).toFixed(2)}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isOut ? 'bg-red-500/10 text-red-400' : isLow ? 'bg-orange-500/10 text-orange-400' : 'bg-slate-700 text-slate-400'}`}>
                                                {totalStock} units
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── RIGHT: CART ── */}
            <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl">

                {/* Cart header */}
                <div className="p-5 border-b border-slate-800">
                    <h2 className="text-lg font-black text-white flex items-center gap-2 mb-4">
                        <FiShoppingCart className="text-indigo-500"/> Current Order
                        {cart.length > 0 && (
                            <span className="ml-auto text-xs font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                                {cart.reduce((a, b) => a + b.qty, 0)} items
                            </span>
                        )}
                    </h2>

                    {/* ── SCANNER WIDGET ── */}
                    <div className="bg-slate-950 rounded-xl border border-slate-800 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <BiBarcodeReader className="text-indigo-400" size={13}/> Barcode Scanner
                            </span>
                            <button
                                onClick={() => setScannerActive(v => !v)}
                                className={`text-[9px] font-black px-2 py-0.5 rounded-md border transition-all ${scannerActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-slate-700'}`}
                            >
                                {scannerActive ? '● ACTIVE' : '○ OFF'}
                            </button>
                        </div>

                        {/* Scan status feedback */}
                        {scanStatus && (
                            <div className={`flex items-center gap-2 p-2 rounded-lg text-[11px] font-bold border
                                ${scanStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                {scanStatus.type === 'success' ? <FiCheckCircle size={12}/> : <FiAlertTriangle size={12}/>}
                                {scanStatus.msg}
                            </div>
                        )}

                        {/* Manual SKU input */}
                        <form onSubmit={(e) => { e.preventDefault(); if (manualSku.trim()) { handleScan(manualSku.trim()); setManualSku(''); } }} className="flex gap-2">
                            <input
                                type="text"
                                value={manualSku}
                                onChange={e => setManualSku(e.target.value)}
                                placeholder="Type SKU or scan barcode..."
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-white text-xs outline-none focus:border-indigo-500 transition-all font-mono"
                            />
                            <button type="submit" className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all">
                                Add
                            </button>
                        </form>
                        {scannerActive && <p className="text-[9px] text-slate-600 text-center">USB scanner ready — scan to add item instantly</p>}
                    </div>
                </div>

                {/* Cart items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-xl text-slate-600">
                            <FiShoppingCart size={22} className="mb-2 opacity-30"/>
                            <span className="text-xs font-medium">Cart is empty</span>
                            <span className="text-[10px] mt-0.5 text-slate-700">Scan or click a product</span>
                        </div>
                    ) : (
                        cart.map(c => (
                            <div key={c._cartKey} className="bg-slate-800/40 p-3 rounded-xl border border-slate-800 hover:bg-slate-800/70 transition-all">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0 mr-2">
                                        <p className="text-sm font-bold text-slate-200 truncate">{c.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <p className="text-[11px] text-slate-500">${Number(c.price).toFixed(2)}</p>
                                            {c._size && c._size !== 'OS' && (
                                                <span className="text-[9px] font-black bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20">
                                                    {c._size}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button onClick={() => setCart(cart.filter(x => x._cartKey !== c._cartKey))}
                                        className="text-slate-600 hover:text-red-400 transition-colors p-1 shrink-0">
                                        <FiX size={15}/>
                                    </button>
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                    <div className="flex items-center gap-2 bg-slate-950 rounded-lg p-1 px-2 border border-slate-800">
                                        <button onClick={() => updateQty(c._cartKey, -1)} className="text-slate-400 hover:text-indigo-400 transition-colors"><FiMinus size={12}/></button>
                                        <span className="text-xs font-black w-5 text-center text-white">{c.qty}</span>
                                        <button onClick={() => updateQty(c._cartKey, 1)} className="text-slate-400 hover:text-indigo-400 transition-colors"><FiPlus size={12}/></button>
                                    </div>
                                    <span className="text-sm font-mono font-black text-indigo-300">${(c.price * c.qty).toFixed(2)}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Totals + coupon + checkout */}
                <div className="p-4 border-t border-slate-800 space-y-4">

                    {/* ── COUPON SECTION ── */}
                    <div>
                        <button onClick={() => setShowCoupons(v => !v)}
                            className="w-full flex items-center justify-between group mb-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <FiTag className="text-indigo-400" size={12}/> Apply Coupon
                                {discounts.length > 0 && (
                                    <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black ${eligibleCount > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                                        {eligibleCount}/{discounts.length} eligible
                                    </span>
                                )}
                            </span>
                            <span className="text-[10px] text-slate-600 group-hover:text-slate-400 transition-colors">{showCoupons ? '▲' : '▼'}</span>
                        </button>

                        {/* Applied coupon pill (collapsed view) */}
                        {selectedDiscount && !showCoupons && (
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 mb-2">
                                <div className="flex items-center gap-2">
                                    <FiCheckCircle className="text-indigo-400" size={12}/>
                                    <span className="text-xs font-black text-white">{selectedDiscount.code}</span>
                                    <span className="text-xs text-emerald-400 font-bold">-${discountAmount.toFixed(2)}</span>
                                </div>
                                <button onClick={() => setSelectedDiscount(null)} className="text-slate-500 hover:text-red-400 transition-colors"><FiX size={12}/></button>
                            </div>
                        )}

                        {/* Expanded coupon list */}
                        {showCoupons && (
                            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
                                {discounts.length === 0 ? (
                                    <p className="text-xs text-slate-600 text-center py-3">No active offers</p>
                                ) : discounts
                                    .slice()
                                    .sort((a, b) => {
                                        const aOk = subtotal >= (a.minOrder || a.minOrderValue || 0);
                                        const bOk = subtotal >= (b.minOrder || b.minOrderValue || 0);
                                        return bOk - aOk;
                                    })
                                    .map(offer => (
                                        <CouponOption
                                            key={offer._id}
                                            offer={offer}
                                            subtotal={subtotal}
                                            selected={selectedDiscount?._id === offer._id}
                                            onSelect={(o) => {
                                                setSelectedDiscount(prev => prev?._id === o._id ? null : o);
                                                setShowCoupons(false);
                                            }}
                                        />
                                    ))
                                }
                            </div>
                        )}
                    </div>

                    {/* Totals */}
                    <div className="space-y-2 bg-slate-950 rounded-xl p-4 border border-slate-800">
                        <div className="flex justify-between text-sm text-slate-400">
                            <span>Subtotal</span>
                            <span className="font-mono text-slate-200">${subtotal.toFixed(2)}</span>
                        </div>
                        {selectedDiscount && discountAmount > 0 && (
                            <div className="flex justify-between text-sm text-emerald-400">
                                <span>Discount ({selectedDiscount.code})</span>
                                <span className="font-mono">-${discountAmount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-xl font-black pt-2 border-t border-slate-800/70">
                            <span className="text-white">Total</span>
                            <span className="text-indigo-400">${finalTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowBillModal(true)}
                        disabled={cart.length === 0}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl font-black transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                    >
                        <FiPrinter size={16}/> Checkout — ${finalTotal.toFixed(2)}
                    </button>
                </div>
            </div>

            {/* ── CUSTOMER DETAILS MODAL ── */}
            {showBillModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[150]">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-7 shadow-2xl">
                        <div className="flex justify-between items-center mb-7">
                            <div>
                                <h2 className="text-2xl font-black text-white">Billing Info</h2>
                                <p className="text-slate-500 text-xs mt-0.5">Enter customer details to complete sale</p>
                            </div>
                            <button onClick={() => setShowBillModal(false)} className="bg-slate-800 p-2 rounded-xl hover:text-red-400 transition-colors"><FiX size={18}/></button>
                        </div>
                        <form onSubmit={handleCheckout} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Customer Name *</label>
                                <input type="text" required placeholder="John Doe"
                                    className="w-full bg-slate-800 border border-slate-700 p-3.5 rounded-xl outline-none focus:border-indigo-500 text-white transition-colors"
                                    value={customer.name} onChange={e => setCustomer({...customer, name: e.target.value})}/>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Phone Number *</label>
                                <input type="text" required placeholder="10-digit number"
                                    className="w-full bg-slate-800 border border-slate-700 p-3.5 rounded-xl outline-none focus:border-indigo-500 text-white transition-colors"
                                    value={customer.phone} onChange={e => { if (/^\d{0,10}$/.test(e.target.value)) setCustomer({...customer, phone: e.target.value}); }}/>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">City *</label>
                                    <input type="text" required placeholder="City"
                                        className="w-full bg-slate-800 border border-slate-700 p-3.5 rounded-xl outline-none focus:border-indigo-500 text-white transition-colors"
                                        value={customer.city} onChange={e => setCustomer({...customer, city: e.target.value})}/>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Zip (Optional)</label>
                                    <input type="text" placeholder="Zip code"
                                        className="w-full bg-slate-800 border border-slate-700 p-3.5 rounded-xl outline-none focus:border-indigo-500 text-white transition-colors"/>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Address (Optional)</label>
                                <textarea placeholder="Street details..." rows="2"
                                    className="w-full bg-slate-800 border border-slate-700 p-3.5 rounded-xl outline-none focus:border-indigo-500 text-white resize-none transition-colors"
                                    value={customer.address} onChange={e => setCustomer({...customer, address: e.target.value})}/>
                            </div>

                            {/* Order summary */}
                            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] text-indigo-300 font-black uppercase tracking-wider">Grand Total</p>
                                    <p className="text-2xl font-black text-white">${finalTotal.toFixed(2)}</p>
                                </div>
                                <div className="text-right text-xs text-slate-400">
                                    <p>{cart.reduce((a, b) => a + b.qty, 0)} items</p>
                                    {discountAmount > 0 && <p className="text-emerald-400">Saved: ${discountAmount.toFixed(2)}</p>}
                                </div>
                            </div>

                            <button type="submit"
                                className="w-full bg-emerald-600 hover:bg-emerald-500 py-4 rounded-xl font-black text-white shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2">
                                <FiCheckCircle size={16}/> Complete Sale — ${finalTotal.toFixed(2)}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default POS;