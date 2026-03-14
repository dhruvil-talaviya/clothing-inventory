import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { 
    FiSearch, FiShoppingCart, FiX, FiPlus, FiMinus, FiTag,
    FiCheckCircle, FiAlertTriangle, FiLock, FiPrinter, FiPackage
} from 'react-icons/fi';
import { BiBarcodeReader } from 'react-icons/bi';

const CATEGORIES = ["All", "Shirt", "T-Shirt", "Jeans", "Trousers", "Shoes", "Jacket", "Kurta", "Saree", "Watch", "Accessories"];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const safeNum = (v, fb = 0) => { const n = Number(v); return isNaN(n) ? fb : n; };
const safeStr = (v, fb = '') => (v == null ? fb : String(v));
const safeArr = (v) => (Array.isArray(v) ? v : []);

const getProductImage = (name = '') => {
    const n = name.toLowerCase();
    if (n.includes('t-shirt')) return 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=80';
    if (n.includes('shirt'))   return 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=400&q=80';
    if (n.includes('jean'))    return 'https://images.unsplash.com/photo-1542272617-08f08630329e?auto=format&fit=crop&w=400&q=80';
    if (n.includes('shoe'))    return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80';
    if (n.includes('watch'))   return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80';
    return 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=400&q=80';
};

// ─── BARCODE SCANNER HOOK ─────────────────────────────────────────────────────
const useBarcodeScanner = (onScan, enabled = true) => {
    const buffer      = useRef('');
    const lastKeyTime = useRef(0);
    const cbRef       = useRef(onScan);
    useEffect(() => { cbRef.current = onScan; }, [onScan]);

    useEffect(() => {
        if (!enabled) return;
        const handleKey = (e) => {
            const tag = document.activeElement?.tagName?.toUpperCase();
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
            const now = Date.now();
            if (now - lastKeyTime.current > 300 && buffer.current.length > 0) buffer.current = '';
            lastKeyTime.current = now;
            if (e.key === 'Enter') {
                const scanned = buffer.current.trim();
                if (scanned.length >= 4) cbRef.current(scanned);
                buffer.current = '';
                return;
            }
            if (e.key.length === 1) buffer.current += e.key;
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [enabled]);
};

// ─── SIZE SELECTOR MODAL ──────────────────────────────────────────────────────
// Shows product thumbnail + price in header.
// Clicking an in-stock size immediately adds to cart (one tap, no extra confirm).
const SizeSelectorModal = ({ product, onSelect, onClose }) => {
    if (!product) return null;
    const variants    = safeArr(product.variants);
    const hasVariants = variants.length > 0;

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">

                {/* ── Header: thumbnail + name + price ── */}
                <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center gap-4">
                    <img
                        src={safeStr(product.image) || getProductImage(product.name)}
                        alt={product.name}
                        onError={e => { e.target.onerror = null; e.target.src = getProductImage(product.name); }}
                        className="w-16 h-16 rounded-xl object-cover border border-slate-700 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">
                            {hasVariants ? 'Select Size to Add' : 'Add to Cart'}
                        </p>
                        <h3 className="text-sm font-black text-white leading-tight line-clamp-2">{product.name}</h3>
                        <p className="text-emerald-400 font-black text-lg mt-0.5">
                            Rs.{safeNum(product.price).toFixed(2)}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="shrink-0 w-8 h-8 bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 rounded-xl flex items-center justify-center transition-all"
                    >
                        <FiX size={15}/>
                    </button>
                </div>

                <div className="p-5">
                    {hasVariants ? (
                        <>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                                Tap a size to instantly add to cart
                            </p>
                            {/* ── Size grid — one tap adds to cart ── */}
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                {SIZES.map(size => {
                                    const variant  = variants.find(v => v.size === size);
                                    const stock    = safeNum(variant?.stock);
                                    const exists   = !!variant;
                                    const inStock  = exists && stock > 0;
                                    const isLow    = inStock && stock <= 5;

                                    return (
                                        <button
                                            key={size}
                                            disabled={!inStock}
                                            onClick={() => onSelect(product, size, variant)}
                                            className={`flex flex-col items-center justify-center py-5 rounded-xl border font-black text-xl transition-all duration-150
                                                ${!exists
                                                    ? 'opacity-20 cursor-not-allowed bg-slate-950 border-slate-800 text-slate-700'
                                                    : !inStock
                                                    ? 'opacity-40 cursor-not-allowed bg-red-950/30 border-red-500/20 text-red-500'
                                                    : 'bg-slate-800 border-slate-700 hover:border-indigo-500 hover:bg-indigo-600/20 text-white cursor-pointer active:scale-95'
                                                }`}
                                        >
                                            <span>{size}</span>
                                            {exists && (
                                                <span className={`text-[9px] font-black mt-1 ${!inStock ? 'text-red-500' : isLow ? 'text-orange-400' : 'text-emerald-400'}`}>
                                                    {!inStock ? 'OUT' : isLow ? `${stock} left!` : `${stock} in stock`}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Stock summary pills */}
                            <div className="flex gap-1.5 flex-wrap pt-3 border-t border-slate-800">
                                {variants.map(v => (
                                    <span key={v.size} className={`text-[10px] font-black px-2 py-1 rounded-lg border
                                        ${safeNum(v.stock) <= 0
                                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                            : safeNum(v.stock) <= 5
                                            ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        }`}>
                                        {v.size}: {v.stock}
                                    </span>
                                ))}
                            </div>
                        </>
                    ) : (
                        /* ── No variants — flat stock product ── */
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                                <div>
                                    <p className="text-xs text-slate-500 font-bold mb-0.5">Available Stock</p>
                                    <p className={`text-3xl font-black ${safeNum(product.stock) <= 0 ? 'text-red-400' : 'text-white'}`}>
                                        {safeNum(product.stock)} units
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 font-bold mb-0.5">Price</p>
                                    <p className="text-2xl font-black text-emerald-400">
                                        Rs.{safeNum(product.price).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                            <button
                                disabled={safeNum(product.stock) <= 0}
                                onClick={() => onSelect(product, 'OS', null)}
                                className={`w-full py-4 rounded-xl font-black text-white text-lg transition-all
                                    ${safeNum(product.stock) <= 0
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                        : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 active:scale-95'
                                    }`}
                            >
                                {safeNum(product.stock) <= 0
                                    ? 'Out of Stock'
                                    : `Add to Cart  Rs.${safeNum(product.price).toFixed(2)}`
                                }
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── COUPON OPTION ROW ────────────────────────────────────────────────────────
const CouponOption = ({ offer, subtotal, selected, onSelect }) => {
    const minOrder   = safeNum(offer.minOrder || offer.minOrderValue);
    const isEligible = subtotal >= minOrder;
    const val        = safeNum(offer.value || offer.discountPercent);
    const type       = safeStr(offer.type).toLowerCase();
    const label      = type === 'percentage' ? `${val}% off` : `Rs.${val} off`;

    return (
        <div
            onClick={() => isEligible && onSelect(offer)}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all select-none
                ${!isEligible
                    ? 'opacity-50 cursor-not-allowed border-slate-800 bg-slate-900/40'
                    : selected
                    ? 'cursor-pointer border-indigo-500 bg-indigo-500/10'
                    : 'cursor-pointer border-slate-700 bg-slate-950 hover:border-indigo-500/50'
                }`}
        >
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                    ${isEligible ? (selected ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-indigo-400') : 'bg-slate-800 text-slate-600'}`}>
                    {isEligible ? <FiTag size={13}/> : <FiLock size={13}/>}
                </div>
                <div>
                    <p className={`text-sm font-black ${isEligible ? 'text-white' : 'text-slate-500'}`}>{offer.code}</p>
                    <p className={`text-[10px] font-bold ${isEligible ? 'text-emerald-400' : 'text-slate-600'}`}>{label}</p>
                </div>
            </div>
            <div className="text-right shrink-0 ml-2">
                {isEligible ? (
                    <span className={`text-[10px] font-black px-2 py-1 rounded-md
                        ${selected ? 'bg-indigo-500 text-white' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                        {selected ? '✓ Applied' : 'Eligible'}
                    </span>
                ) : (
                    <div>
                        <span className="text-[10px] font-black px-2 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 block">Locked</span>
                        <span className="text-[9px] text-slate-500 mt-0.5 block">Add Rs.{(minOrder - subtotal).toFixed(2)} more</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── MAIN POS COMPONENT ───────────────────────────────────────────────────────
const POS = ({ products = [], cart = [], setCart, discounts = [], onCheckoutSuccess }) => {
    const [search,           setSearch]           = useState('');
    const [category,         setCategory]         = useState('All');
    const [selectedDiscount, setSelectedDiscount] = useState(null);
    const [showCoupons,      setShowCoupons]      = useState(false);
    const [showBillModal,    setShowBillModal]    = useState(false);
    const [sizeModal,        setSizeModal]        = useState(null);
    const [scanStatus,       setScanStatus]       = useState(null);
    const [scannerActive,    setScannerActive]    = useState(true);
    const [manualSku,        setManualSku]        = useState('');
    const [customer,         setCustomer]         = useState({ name: '', phone: '', address: '', city: '' });

    // ── SCAN RESOLVER ─────────────────────────────────────────────────────────
    const resolveScan = useCallback((sku) => {
        const up = sku.toUpperCase().trim();
        for (const p of products) {
            for (const v of safeArr(p.variants)) {
                if (safeStr(v.sku).toUpperCase() === up) return { product: p, size: v.size, variant: v };
            }
            if (safeStr(p.sku).toUpperCase() === up) return { product: p, size: null, variant: null };
        }
        return null;
    }, [products]);

    // ── ADD TO CART WITH SIZE (variant-aware stock check) ─────────────────────
    const addToCartWithSize = useCallback((product, size, variant) => {
        const stockForSize = variant ? safeNum(variant.stock) : safeNum(product.stock);
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
                    setScanStatus({ type: 'error', msg: 'Maximum stock reached!' });
                    setTimeout(() => setScanStatus(null), 2000);
                    return prev;
                }
                return prev.map(x => x._cartKey === cartKey ? { ...x, qty: x.qty + 1 } : x);
            }
            return [...prev, {
                ...product,
                _cartKey:  cartKey,
                _size:     size,
                _sku:      safeStr(variant?.sku || product.sku),
                _maxStock: stockForSize,
                productId: product._id,
                qty:       1,
            }];
        });
        setSizeModal(null);
    }, [setCart]);

    // ── HANDLE SCAN ───────────────────────────────────────────────────────────
    const handleScan = useCallback((sku) => {
        const result = resolveScan(sku);
        if (!result) {
            setScanStatus({ type: 'error', msg: `No product found for: ${sku}` });
        } else if (result.size) {
            addToCartWithSize(result.product, result.size, result.variant);
            setScanStatus({ type: 'success', msg: `Added: ${result.product.name} (${result.size})` });
        } else {
            setSizeModal(result.product);
            setScanStatus({ type: 'success', msg: `Found: ${result.product.name} — select size` });
        }
        setTimeout(() => setScanStatus(null), 2500);
    }, [resolveScan, addToCartWithSize]);

    useBarcodeScanner(handleScan, scannerActive);

    // ── OPEN SIZE MODAL (click on product card) ───────────────────────────────
    const openSizeModal = useCallback((p) => {
        const variants   = safeArr(p.variants);
        const totalStock = variants.length > 0
            ? variants.reduce((a, v) => a + safeNum(v.stock), 0)
            : safeNum(p.totalStock ?? p.stock);
        if (totalStock <= 0) {
            setScanStatus({ type: 'error', msg: 'This product is out of stock!' });
            setTimeout(() => setScanStatus(null), 2000);
            return;
        }
        if (variants.length > 0) {
            setSizeModal(p);
        } else {
            addToCartWithSize(p, 'OS', null);
        }
    }, [addToCartWithSize]);

    // ── QTY UPDATE ────────────────────────────────────────────────────────────
    const updateQty = useCallback((cartKey, delta) => {
        setCart(prev => prev.map(item => {
            if (item._cartKey !== cartKey) return item;
            const next = Math.max(1, item.qty + delta);
            if (delta > 0 && next > (item._maxStock || 9999)) {
                setScanStatus({ type: 'error', msg: 'Stock limit reached!' });
                setTimeout(() => setScanStatus(null), 2000);
                return item;
            }
            return { ...item, qty: next };
        }));
    }, [setCart]);

    // ── CALCULATIONS ─────────────────────────────────────────────────────────
    const subtotal = useMemo(() =>
        cart.reduce((acc, item) => acc + safeNum(item.price) * safeNum(item.qty, 1), 0)
    , [cart]);

    const discountAmount = useMemo(() => {
        if (!selectedDiscount) return 0;
        const min = safeNum(selectedDiscount.minOrder || selectedDiscount.minOrderValue);
        if (subtotal < min) return 0;
        const val  = safeNum(selectedDiscount.value || selectedDiscount.discountPercent);
        const type = safeStr(selectedDiscount.type).toLowerCase();
        return type === 'percentage' ? (subtotal * val) / 100 : val;
    }, [selectedDiscount, subtotal]);

    const finalTotal    = Math.max(0, subtotal - discountAmount);
    const cartItemCount = useMemo(() => cart.reduce((a, i) => a + safeNum(i.qty, 1), 0), [cart]);
    const eligibleCount = useMemo(() =>
        discounts.filter(o => subtotal >= safeNum(o.minOrder || o.minOrderValue)).length
    , [discounts, subtotal]);

    // Auto-remove coupon if cart drops below minimum
    useEffect(() => {
        if (!selectedDiscount) return;
        const min = safeNum(selectedDiscount.minOrder || selectedDiscount.minOrderValue);
        if (subtotal < min) setSelectedDiscount(null);
    }, [subtotal]); // eslint-disable-line

    // ── FILTER PRODUCTS ───────────────────────────────────────────────────────
    const filtered = useMemo(() => products.filter(p =>
        safeStr(p.name).toLowerCase().includes(search.toLowerCase()) &&
        (category === 'All' || p.category === category)
    ), [products, search, category]);

    // ── CHECKOUT ──────────────────────────────────────────────────────────────
    const handleCheckout = async (e) => {
        e.preventDefault();
        if (customer.phone.length < 10) return alert('Invalid Phone Number');
        if (cart.length === 0)          return alert('Cart is empty');

        const userInfo = (() => { try { return JSON.parse(localStorage.getItem('user')) || null; } catch { return null; } })();
        if (!userInfo) return alert('Session Expired. Please Login.');

        const saleData = {
            items: cart.map(item => ({
                productId: item.productId || item._id,
                name:      `${safeStr(item.name)}${item._size && item._size !== 'OS' ? ` (${item._size})` : ''}`,
                price:     safeNum(item.price),
                quantity:  safeNum(item.qty, 1),
                sku:       safeStr(item._sku),
                size:      safeStr(item._size),
            })),
            customerName:    customer.name,
            customerPhone:   customer.phone,
            customerAddress: customer.address,
            storeLocation:   customer.city,
            subtotal,
            discount:    discountAmount,
            totalAmount: finalTotal,
            soldBy:    userInfo._id        || userInfo.id,
            staffId:   userInfo.employeeId || userInfo.staffId || 'N/A',
            staffName: userInfo.name       || userInfo.username || 'Staff',
        };

        try {
            const config = userInfo.token ? { headers: { Authorization: `Bearer ${userInfo.token}` } } : {};
            const res = await axios.post('http://localhost:5001/api/staff/create-sale', saleData, config);
            alert('✅ Sale Completed Successfully!');
            if (onCheckoutSuccess) onCheckoutSuccess(res.data);
            setCart([]);
            setShowBillModal(false);
            setSelectedDiscount(null);
            setCustomer({ name: '', phone: '', address: '', city: '' });
        } catch (err) {
            console.error('Checkout Error:', err.response?.data);
            alert(`⚠️ Error: ${err.response?.data?.message || 'Transaction Failed'}`);
        }
    };

    // ═════════════════════════════════════════════════════════════════════════
    return (
        <div className="flex h-full text-slate-100 bg-slate-950 font-sans overflow-hidden">

            {/* SIZE MODAL */}
            {sizeModal && (
                <SizeSelectorModal
                    product={sizeModal}
                    onSelect={addToCartWithSize}
                    onClose={() => setSizeModal(null)}
                />
            )}

            {/* ── LEFT: PRODUCTS ─────────────────────────────────────────── */}
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
                <div className="flex gap-2 overflow-x-auto pb-3 mb-5">
                    {CATEGORIES.map(c => (
                        <button key={c} onClick={() => setCategory(c)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap border
                                ${category === c
                                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:border-slate-600'
                                }`}>
                            {c}
                        </button>
                    ))}
                </div>

                {/* Product grid */}
                {filtered.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                        <FiPackage size={40} className="mb-3 opacity-30"/>
                        <p className="font-bold">No products found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
                        {filtered.map(p => {
                            const variants   = safeArr(p.variants);
                            // ── Use variant stock sum if variants exist, else flat stock ──
                            const totalStock = variants.length > 0
                                ? variants.reduce((a, v) => a + safeNum(v.stock), 0)
                                : safeNum(p.totalStock ?? p.stock);
                            const isOut  = totalStock <= 0;
                            const isLow  = !isOut && totalStock <= 10;
                            const availSizes = variants.filter(v => safeNum(v.stock) > 0).map(v => v.size);

                            return (
                                <div
                                    key={p._id}
                                    onClick={() => !isOut && openSizeModal(p)}
                                    className={`bg-slate-800 rounded-xl border overflow-hidden group transition-all
                                        ${isOut
                                            ? 'opacity-50 cursor-not-allowed border-slate-700'
                                            : 'cursor-pointer border-slate-700 hover:border-indigo-500 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/10'
                                        }`}
                                >
                                    <div className="relative h-36 overflow-hidden bg-slate-900">
                                        <img
                                            src={safeStr(p.image) || getProductImage(p.name)}
                                            alt={p.name}
                                            onError={e => { e.target.onerror = null; e.target.src = getProductImage(p.name); }}
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                        {isLow && !isOut && <span className="absolute top-2 left-2 bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase">Low</span>}
                                        {isOut            && <span className="absolute top-2 left-2 bg-red-600    text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase">Out</span>}
                                        {!isOut && (
                                            <div className="absolute inset-0 bg-indigo-600/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <div className="bg-white p-2 rounded-full"><FiPlus className="text-indigo-600" size={20}/></div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <h4 className="text-sm font-bold text-slate-200 line-clamp-1 mb-1">{p.name}</h4>
                                        {availSizes.length > 0 && (
                                            <div className="flex gap-1 flex-wrap mb-2">
                                                {availSizes.map(s => (
                                                    <span key={s} className="text-[8px] font-black px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 border border-slate-600">{s}</span>
                                                ))}
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center">
                                            <span className="text-emerald-400 font-black">Rs.{safeNum(p.price).toFixed(2)}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md
                                                ${isOut ? 'bg-red-500/10 text-red-400' : isLow ? 'bg-orange-500/10 text-orange-400' : 'bg-slate-700 text-slate-400'}`}>
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

            {/* ── RIGHT: CART ────────────────────────────────────────────── */}
            <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl">

                {/* Cart header */}
                <div className="p-5 border-b border-slate-800">
                    <h2 className="text-lg font-black text-white flex items-center gap-2 mb-4">
                        <FiShoppingCart className="text-indigo-500"/> Current Order
                        {cartItemCount > 0 && (
                            <span className="ml-auto text-xs font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                                {cartItemCount} items
                            </span>
                        )}
                    </h2>

                    {/* Scanner widget */}
                    <div className="bg-slate-950 rounded-xl border border-slate-800 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <BiBarcodeReader className="text-indigo-400" size={13}/> Barcode Scanner
                            </span>
                            <button
                                onClick={() => setScannerActive(v => !v)}
                                className={`text-[9px] font-black px-2 py-0.5 rounded-md border transition-all
                                    ${scannerActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-slate-700'}`}
                            >
                                {scannerActive ? '● ACTIVE' : '○ OFF'}
                            </button>
                        </div>

                        {scanStatus && (
                            <div className={`flex items-center gap-2 p-2 rounded-lg text-[11px] font-bold border
                                ${scanStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                {scanStatus.type === 'success' ? <FiCheckCircle size={12}/> : <FiAlertTriangle size={12}/>}
                                {scanStatus.msg}
                            </div>
                        )}

                        <form
                            onSubmit={e => { e.preventDefault(); if (manualSku.trim()) { handleScan(manualSku.trim()); setManualSku(''); } }}
                            className="flex gap-2"
                        >
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
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {cart.length === 0 ? (
                        <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-xl text-slate-600">
                            <FiShoppingCart size={22} className="mb-2 opacity-30"/>
                            <span className="text-xs font-medium">Cart is empty</span>
                            <span className="text-[10px] mt-0.5 text-slate-700">Scan or click a product</span>
                        </div>
                    ) : cart.map(c => (
                        <div key={c._cartKey} className="bg-slate-800/40 p-3 rounded-xl border border-slate-800 hover:bg-slate-800/70 transition-all">
                            <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0 mr-2">
                                    <p className="text-sm font-bold text-slate-200 truncate">{c.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-[11px] text-slate-500">Rs.{safeNum(c.price).toFixed(2)}</p>
                                        {c._size && c._size !== 'OS' && (
                                            <span className="text-[9px] font-black bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20">
                                                {c._size}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setCart(prev => prev.filter(x => x._cartKey !== c._cartKey))}
                                    className="text-slate-600 hover:text-red-400 transition-colors p-1 shrink-0"
                                >
                                    <FiX size={15}/>
                                </button>
                            </div>
                            <div className="flex justify-between items-center mt-2">
                                <div className="flex items-center gap-2 bg-slate-950 rounded-lg p-1 px-2 border border-slate-800">
                                    <button onClick={() => updateQty(c._cartKey, -1)} className="text-slate-400 hover:text-indigo-400 transition-colors"><FiMinus size={12}/></button>
                                    <span className="text-xs font-black w-5 text-center text-white">{c.qty}</span>
                                    <button onClick={() => updateQty(c._cartKey,  1)} className="text-slate-400 hover:text-indigo-400 transition-colors"><FiPlus  size={12}/></button>
                                </div>
                                <span className="text-sm font-mono font-black text-indigo-300">Rs.{(safeNum(c.price) * safeNum(c.qty, 1)).toFixed(2)}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Totals + coupon + checkout */}
                <div className="p-4 border-t border-slate-800 space-y-4">

                    {/* Coupon section */}
                    <div>
                        <button onClick={() => setShowCoupons(v => !v)} className="w-full flex items-center justify-between group mb-2">
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

                        {selectedDiscount && !showCoupons && (
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 mb-2">
                                <div className="flex items-center gap-2">
                                    <FiCheckCircle className="text-indigo-400" size={12}/>
                                    <span className="text-xs font-black text-white">{selectedDiscount.code}</span>
                                    <span className="text-xs text-emerald-400 font-bold">-Rs.{discountAmount.toFixed(2)}</span>
                                </div>
                                <button onClick={() => setSelectedDiscount(null)} className="text-slate-500 hover:text-red-400 transition-colors"><FiX size={12}/></button>
                            </div>
                        )}

                        {showCoupons && (
                            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
                                {discounts.length === 0 ? (
                                    <p className="text-xs text-slate-600 text-center py-3">No active offers</p>
                                ) : [...discounts]
                                    .sort((a, b) => {
                                        const aOk = subtotal >= safeNum(a.minOrder || a.minOrderValue);
                                        const bOk = subtotal >= safeNum(b.minOrder || b.minOrderValue);
                                        return bOk - aOk;
                                    })
                                    .map(offer => (
                                        <CouponOption
                                            key={offer._id}
                                            offer={offer}
                                            subtotal={subtotal}
                                            selected={selectedDiscount?._id === offer._id}
                                            onSelect={o => { setSelectedDiscount(prev => prev?._id === o._id ? null : o); setShowCoupons(false); }}
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
                            <span className="font-mono text-slate-200">Rs.{subtotal.toFixed(2)}</span>
                        </div>
                        {selectedDiscount && discountAmount > 0 && (
                            <div className="flex justify-between text-sm text-emerald-400">
                                <span>Discount ({selectedDiscount.code})</span>
                                <span className="font-mono">-Rs.{discountAmount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-xl font-black pt-2 border-t border-slate-800/70">
                            <span className="text-white">Total</span>
                            <span className="text-indigo-400">Rs.{finalTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowBillModal(true)}
                        disabled={cart.length === 0}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl font-black transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                    >
                        <FiPrinter size={16}/> Checkout — Rs.{finalTotal.toFixed(2)}
                    </button>
                </div>
            </div>

            {/* ── CUSTOMER DETAILS MODAL ──────────────────────────────────── */}
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
                                <input type="text" required placeholder="10-digit number" maxLength="10"
                                    className="w-full bg-slate-800 border border-slate-700 p-3.5 rounded-xl outline-none focus:border-indigo-500 text-white transition-colors"
                                    value={customer.phone} onChange={e => { if (/^\d{0,10}$/.test(e.target.value)) setCustomer({...customer, phone: e.target.value}); }}/>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">City *</label>
                                <input type="text" required placeholder="City"
                                    className="w-full bg-slate-800 border border-slate-700 p-3.5 rounded-xl outline-none focus:border-indigo-500 text-white transition-colors"
                                    value={customer.city} onChange={e => setCustomer({...customer, city: e.target.value})}/>
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
                                    <p className="text-2xl font-black text-white">Rs.{finalTotal.toFixed(2)}</p>
                                </div>
                                <div className="text-right text-xs text-slate-400">
                                    <p>{cartItemCount} items</p>
                                    {discountAmount > 0 && <p className="text-emerald-400">Saved: Rs.{discountAmount.toFixed(2)}</p>}
                                </div>
                            </div>

                            <button type="submit"
                                className="w-full bg-emerald-600 hover:bg-emerald-500 py-4 rounded-xl font-black text-white shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2">
                                <FiCheckCircle size={16}/> Complete Sale — Rs.{finalTotal.toFixed(2)}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default POS;