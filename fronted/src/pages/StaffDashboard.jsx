import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    FiHome, FiSearch, FiShoppingCart, FiTrash2, FiLogOut,
    FiGrid, FiSettings, FiX, FiPackage, FiClock,
    FiFileText, FiUser, FiCheckCircle, FiEdit2,
    FiPlus, FiMinus, FiTag, FiCreditCard, FiAlertTriangle,
    FiEye, FiShield, FiLock, FiSave, FiPrinter, FiCalendar, FiStar
} from 'react-icons/fi';
import { BiBarcodeReader } from 'react-icons/bi';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const INDIAN_CITIES = ["Mumbai","Delhi","Bangalore","Hyderabad","Ahmedabad","Chennai","Kolkata","Surat","Pune","Jaipur","Lucknow","Kanpur","Nagpur","Indore","Thane","Bhopal","Visakhapatnam","Patna","Vadodara","Ghaziabad","Ludhiana","Agra","Nashik","Rajkot","Varanasi","Srinagar","Aurangabad","Amritsar","Navi Mumbai","Allahabad","Ranchi","Coimbatore","Jabalpur","Gwalior","Vijayawada","Jodhpur","Madurai","Raipur","Kota","Guwahati","Chandigarh","Solapur","Mysore","Gurgaon"];
const CATEGORIES  = ["All","Shirt","T-Shirt","Jeans","Trousers","Shoes","Jacket","Kurta","Saree","Watch","Accessories"];
const ALL_SIZES   = ['XS','S','M','L','XL','XXL'];
const GRADIENTS   = ['from-violet-500 to-indigo-600','from-rose-500 to-pink-600','from-amber-500 to-orange-600','from-teal-500 to-cyan-600','from-fuchsia-500 to-purple-600','from-lime-500 to-emerald-600'];

// ─── SAFE HELPERS ─────────────────────────────────────────────────────────────
const safeNum = (v, fb = 0)  => { const n = Number(v); return isNaN(n) ? fb : n; };
const safeStr = (v, fb = '') => (v == null ? fb : String(v));
const safeArr = (v)          => (Array.isArray(v) ? v : []);

// ─── LIVE STATUS CALCULATOR ───────────────────────────────────────────────────
// Computes Upcoming / Active / Completed purely from start & end dates — never stored
const computeEventStatus = (event) => {
    const now   = new Date();
    const start = event.startDate ? new Date(event.startDate) : (event.date ? new Date(event.date) : null);
    const end   = event.endDate   ? new Date(event.endDate)   : start;
    if (!start) return 'Upcoming';
    const today    = new Date(now.getFullYear(),   now.getMonth(),   now.getDate());
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay   = new Date(end.getFullYear(),   end.getMonth(),   end.getDate());
    if (today < startDay) return 'Upcoming';
    if (today > endDay)   return 'Completed';
    return 'Active';
};

const fmtDate = (ds) => ds ? new Date(ds).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';

// ─── PRODUCT IMAGE FALLBACK ───────────────────────────────────────────────────
const getProductImage = (name = '') => {
    const n = name.toLowerCase();
    if (n.includes('t-shirt')) return 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=80';
    if (n.includes('shirt'))   return 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=400&q=80';
    if (n.includes('jean'))    return 'https://images.unsplash.com/photo-1542272617-08f08630329e?auto=format&fit=crop&w=400&q=80';
    if (n.includes('shoe'))    return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80';
    if (n.includes('watch'))   return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80';
    return 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=400&q=80';
};

// ─── PDF BILL GENERATOR ───────────────────────────────────────────────────────
// All text uses explicit, non-overlapping Y coordinates.
// Page = A4 210×297mm. Left margin ML=15, right edge RX=195.
// Two-column info cards each 85mm wide with 10mm gap.
// Items table columns sum to exactly 180mm.
// Totals block is 78mm wide, right-aligned, with named anchor points.
const generateBillPDF = (sale) => {
    try {
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const W  = 210;
        const ML = 15;
        const MR = 15;
        const RX = W - MR;
        let   y  = 0;

        // ── HEADER BANNER ─────────────────────────────────────────────────────
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, W, 50, 'F');
        // Indigo accent stripe
        doc.setFillColor(99, 102, 241);
        doc.rect(0, 47, W, 3, 'F');

        // Brand — left
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.text('STYLESYNC', ML, 20);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text('RETAIL & FASHION', ML, 27);

        // Invoice meta — right (each item on its own Y line, no overlapping)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text('TAX INVOICE', RX, 16, { align: 'right' });

        const invId = safeStr(sale.invoiceId) || ('#' + safeStr(sale._id).slice(-6).toUpperCase()) || 'N/A';
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(invId, RX, 23, { align: 'right' });

        const saleDate = new Date(sale.date || Date.now());
        doc.text(saleDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), RX, 30, { align: 'right' });
        doc.text(saleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), RX, 37, { align: 'right' });

        y = 60;

        // ── INFO CARDS: CUSTOMER (left) | STAFF (right) ───────────────────────
        // Two equal 85mm cards; gap 10mm; total = 85+10+85 = 180mm = W-ML-MR ✓
        const cardW  = 85;
        const card2X = ML + cardW + 10;
        const cardH  = 34;

        // Customer card
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(ML, y, cardW, cardH, 3, 3, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(99, 102, 241);
        doc.text('BILLED TO', ML + 4, y + 7);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        // splitTextToSize prevents overflow; we only show the first line
        const custNameLines = doc.splitTextToSize(safeStr(sale.customerName, 'Walk-in Customer'), cardW - 8);
        doc.text(custNameLines[0], ML + 4, y + 15);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(`Ph: ${safeStr(sale.customerPhone, 'N/A')}`, ML + 4, y + 22);
        if (sale.customerAddress) {
            const addrLines = doc.splitTextToSize(safeStr(sale.customerAddress), cardW - 8);
            doc.text(addrLines[0], ML + 4, y + 28);
        }

        // Staff card
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(card2X, y, cardW, cardH, 3, 3, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(99, 102, 241);
        doc.text('SERVED BY', card2X + 4, y + 7);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        const staffNameLines = doc.splitTextToSize(safeStr(sale.staffName || sale.soldBy, 'Staff'), cardW - 8);
        doc.text(staffNameLines[0], card2X + 4, y + 15);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        if (sale.storeLocation) doc.text(`City: ${safeStr(sale.storeLocation)}`, card2X + 4, y + 22);

        y += cardH + 10;

        // ── ITEMS TABLE ───────────────────────────────────────────────────────
        // Fixed column widths: 88 + 18 + 37 + 37 = 180mm = W - ML - MR ✓
        const tableRows = safeArr(sale.items).map(item => {
            const qty   = safeNum(item.quantity, 1);
            const price = safeNum(item.price);
            const raw   = safeStr(item.name);
            const name  = raw.length > 38 ? raw.slice(0, 36) + '…' : raw;
            return [name, String(qty), `Rs.${price.toFixed(2)}`, `Rs.${(price * qty).toFixed(2)}`];
        });

        autoTable(doc, {
            startY: y,
            head:   [['ITEM DESCRIPTION', 'QTY', 'UNIT PRICE', 'TOTAL']],
            body:   tableRows,
            theme:  'plain',
            headStyles: {
                fillColor:   [15, 23, 42],
                textColor:   255,
                fontStyle:   'bold',
                fontSize:    8,
                cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
            },
            bodyStyles: {
                fontSize:    9,
                cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
                textColor:   [30, 30, 30],
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                0: { cellWidth: 88, halign: 'left'   },
                1: { cellWidth: 18, halign: 'center' },
                2: { cellWidth: 37, halign: 'right'  },
                3: { cellWidth: 37, halign: 'right', fontStyle: 'bold' },
            },
            margin:         { left: ML, right: MR },
            tableLineColor: [226, 232, 240],
            tableLineWidth: 0.3,
        });

        y = (doc.lastAutoTable?.finalY ?? y) + 10;

        // ── TOTALS BLOCK ──────────────────────────────────────────────────────
        // 78mm wide, pinned to right margin. labelX and valueX are fixed anchors.
        const totW   = 78;
        const totX   = RX - totW;
        const labelX = totX + 5;
        const valueX = totX + totW - 5;

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(totX, y, totW, 42, 3, 3, 'FD');

        // Row 1 — Subtotal
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text('Subtotal', labelX, y + 10);
        doc.text(`Rs.${safeNum(sale.subtotal ?? sale.totalAmount).toFixed(2)}`, valueX, y + 10, { align: 'right' });

        // Row 2 — Discount
        doc.setTextColor(16, 185, 129);
        doc.text('Discount', labelX, y + 20);
        doc.text(`- Rs.${safeNum(sale.discount).toFixed(2)}`, valueX, y + 20, { align: 'right' });

        // Thin divider line
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.4);
        doc.line(totX + 4, y + 25, totX + totW - 4, y + 25);

        // Row 3 — Grand total on dark band
        doc.setFillColor(15, 23, 42);
        doc.roundedRect(totX, y + 27, totW, 15, 0, 0, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text('TOTAL PAYABLE', labelX, y + 37);
        doc.text(`Rs.${safeNum(sale.totalAmount).toFixed(2)}`, valueX, y + 37, { align: 'right' });

        y += 54;

        // ── DIVIDER ───────────────────────────────────────────────────────────
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(ML, y, RX, y);
        y += 8;

        // ── FOOTER ────────────────────────────────────────────────────────────
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(99, 102, 241);
        doc.text('Thank you for shopping with StyleSync!', W / 2, y, { align: 'center' });
        y += 7;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Returns & exchanges accepted within 7 days with this invoice.', W / 2, y, { align: 'center' });
        y += 6;
        doc.text('www.stylesync.in  |  support@stylesync.in', W / 2, y, { align: 'center' });

        // ── SAVE ──────────────────────────────────────────────────────────────
        const fname = `Invoice_${safeStr(sale.customerName, 'Customer').replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
        doc.save(fname);
    } catch (err) {
        console.error('PDF generation error:', err);
        alert('Sale saved! PDF generation failed — check console.');
    }
};

// ─── USB BARCODE SCANNER HOOK ─────────────────────────────────────────────────
const useBarcodeScanner = (onScan, enabled) => {
    const bufRef = useRef('');
    const tRef   = useRef(0);
    const cbRef  = useRef(onScan);
    useEffect(() => { cbRef.current = onScan; }, [onScan]);
    useEffect(() => {
        if (!enabled) return;
        const handler = (e) => {
            const tag = document.activeElement?.tagName?.toUpperCase();
            if (['INPUT','TEXTAREA','SELECT'].includes(tag)) return;
            const now = Date.now();
            if (now - tRef.current > 300 && bufRef.current) bufRef.current = '';
            tRef.current = now;
            if (e.key === 'Enter') { const sku = bufRef.current.trim(); if (sku.length >= 4) cbRef.current(sku); bufRef.current = ''; return; }
            if (e.key.length === 1) bufRef.current += e.key;
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [enabled]);
};

// ─── SIZE SELECTOR MODAL ──────────────────────────────────────────────────────
const SizeModal = ({ product, onConfirm, onClose }) => {
    if (!product) return null;
    const variants = safeArr(product.variants), hasVariants = variants.length > 0;
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[250] flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-[#0F172A] border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="p-5 border-b border-slate-800 bg-[#131C31] flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{hasVariants ? 'Select Size to Add' : 'Confirm Add to Cart'}</p>
                        <h3 className="text-lg font-black text-white leading-tight line-clamp-2">{product.name}</h3>
                        {product.color && <p className="text-xs text-slate-400 mt-0.5">{product.color}</p>}
                    </div>
                    <button onClick={onClose} className="shrink-0 w-8 h-8 bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 rounded-xl flex items-center justify-center transition-all"><FiX size={15}/></button>
                </div>
                <div className="p-5">
                    {hasVariants ? (
                        <>
                            <div className="grid grid-cols-3 gap-3 mb-5">
                                {ALL_SIZES.map(size => {
                                    const v = variants.find(x => x.size === size), stock = safeNum(v?.stock), exists = !!v;
                                    const inStock = exists && stock > 0, low = inStock && stock <= 5;
                                    return (
                                        <button key={size} disabled={!inStock} onClick={() => onConfirm(product, size, v)}
                                            className={`relative flex flex-col items-center justify-center py-5 rounded-2xl border font-black text-xl transition-all duration-150
                                                ${!exists ? 'opacity-20 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-700'
                                                  : !inStock ? 'opacity-40 cursor-not-allowed bg-red-950/30 border-red-800/30 text-red-500'
                                                  : 'bg-[#080C14] border-slate-700 hover:border-indigo-500 hover:bg-indigo-600/15 text-white cursor-pointer active:scale-95'}`}>
                                            <span>{size}</span>
                                            {exists && <span className={`text-[9px] font-black mt-1.5 ${!inStock ? 'text-red-500' : low ? 'text-orange-400' : 'text-emerald-400'}`}>{!inStock ? 'OUT' : low ? `${stock} left!` : `${stock} in stock`}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex items-center justify-between p-3.5 bg-[#080C14] rounded-xl border border-slate-800 mb-3">
                                <span className="text-xs text-slate-500 font-bold">Price per unit</span>
                                <span className="text-emerald-400 font-black text-xl">Rs.{safeNum(product.price).toFixed(2)}</span>
                            </div>
                            <div className="flex gap-1.5 flex-wrap">
                                {variants.map(v => (
                                    <span key={v.size} className={`text-[10px] font-black px-2 py-1 rounded-lg border ${safeNum(v.stock) <= 0 ? 'bg-red-500/10 text-red-400 border-red-500/20' : safeNum(v.stock) <= 5 ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>{v.size}: {v.stock}</span>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-[#080C14] rounded-2xl border border-slate-800">
                                <div><p className="text-xs text-slate-500 font-bold mb-0.5">Available Stock</p><p className={`text-3xl font-black ${safeNum(product.stock) <= 0 ? 'text-red-400' : 'text-white'}`}>{safeNum(product.stock)} units</p></div>
                                <div className="text-right"><p className="text-xs text-slate-500 font-bold mb-0.5">Price</p><p className="text-2xl font-black text-emerald-400">Rs.{safeNum(product.price).toFixed(2)}</p></div>
                            </div>
                            <button disabled={safeNum(product.stock) <= 0} onClick={() => onConfirm(product, 'OS', null)}
                                className={`w-full py-4 rounded-xl font-black text-white text-lg transition-all ${safeNum(product.stock) <= 0 ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 active:scale-95'}`}>
                                {safeNum(product.stock) <= 0 ? 'Out of Stock' : `Add to Cart  Rs.${safeNum(product.price).toFixed(2)}`}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── COUPON ROW ───────────────────────────────────────────────────────────────
const CouponRow = ({ offer, subtotal, isSelected, onSelect }) => {
    const minOrder = safeNum(offer.minOrder || offer.minOrderValue), isEligible = subtotal >= minOrder;
    const val = safeNum(offer.value || offer.discountPercent), type = safeStr(offer.type).toLowerCase();
    const label = type === 'percentage' ? `${val}% off` : `Rs.${val} off`;
    return (
        <div onClick={() => isEligible && onSelect(offer)}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all select-none
                ${!isEligible ? 'opacity-50 cursor-not-allowed border-slate-800 bg-slate-900/40'
                  : isSelected ? 'cursor-pointer border-indigo-500 bg-indigo-500/10'
                  : 'cursor-pointer border-slate-700 bg-[#080C14] hover:border-indigo-400/50 hover:bg-indigo-500/5'}`}>
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isEligible ? (isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-indigo-400') : 'bg-slate-800 text-slate-600'}`}>
                    {isEligible ? <FiTag size={13}/> : <FiLock size={13}/>}
                </div>
                <div>
                    <p className={`text-sm font-black ${isEligible ? 'text-white' : 'text-slate-500'}`}>{offer.code}</p>
                    <p className={`text-[10px] font-bold ${isEligible ? 'text-emerald-400' : 'text-slate-600'}`}>{label}</p>
                </div>
            </div>
            <div className="text-right shrink-0 ml-2">
                {isEligible ? (
                    <span className={`text-[10px] font-black px-2 py-1 rounded-md ${isSelected ? 'bg-indigo-500 text-white' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>{isSelected ? '✓ Applied' : 'Eligible'}</span>
                ) : (
                    <div>
                        <span className="text-[10px] font-black px-2 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 block">Locked</span>
                        <span className="text-[9px] text-slate-500 block mt-0.5">Add Rs.{(minOrder - subtotal).toFixed(2)} more</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── NAV ICON ─────────────────────────────────────────────────────────────────
const NavIcon = ({ icon, active, onClick, label, badge }) => (
    <div onClick={onClick} className={`relative flex flex-col items-center justify-center w-full py-3 cursor-pointer group transition-all duration-300 ${active ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}>
        <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-indigo-500 rounded-r-full transition-all duration-300 ${active ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}/>
        <div className={`relative p-3 rounded-2xl transition-all duration-300 ${active ? 'bg-indigo-500/10' : 'group-hover:bg-slate-800'}`}>
            {icon}
            {badge > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full text-[8px] font-black text-white flex items-center justify-center animate-pulse">{badge}</span>}
        </div>
        <span className={`text-[10px] font-bold mt-1 tracking-wider transition-all duration-300 ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>{label}</span>
    </div>
);

const StatCard = ({ title, value, icon, color }) => {
    const cls = { indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
    return (
        <div className={`p-6 rounded-3xl border ${cls[color]} flex items-center gap-5 shadow-xl`}>
            <div className="p-4 rounded-2xl bg-[#0F172A] shadow-inner text-2xl">{icon}</div>
            <div><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p><h3 className="text-3xl font-black text-white">{value}</h3></div>
        </div>
    );
};

// ─── STAFF EVENT BADGE (view-only) ────────────────────────────────────────────
const StaffEventBadge = ({ status }) => {
    const map = { Upcoming: { cls:'bg-blue-500/10 text-blue-400 border-blue-500/30', dot:'bg-blue-400', pulse:false }, Active: { cls:'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', dot:'bg-emerald-400', pulse:true }, Completed: { cls:'bg-slate-700/50 text-slate-400 border-slate-600', dot:'bg-slate-500', pulse:false } };
    const c = map[status] || map.Completed;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${c.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${c.pulse ? 'animate-pulse' : ''}`}/>{status}
        </span>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN STAFF DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
const StaffDashboard = () => {
    const navigate = useNavigate();

    const [user]        = useState(() => { try { return JSON.parse(localStorage.getItem('user')) || null; } catch { return null; } });
    const [currentUser, setCurrentUser] = useState(() => { try { return JSON.parse(localStorage.getItem('user')) || user; } catch { return user; } });
    const [view, setView] = useState('pos');

    const [products,     setProducts]     = useState([]);
    const [activeOffers, setActiveOffers] = useState([]);
    const [events,       setEvents]       = useState([]);
    const [stats,        setStats]        = useState({ revenue: 0, count: 0 });
    const [salesHistory, setSalesHistory] = useState([]);

    const [search,    setSearch]    = useState('');
    const [category,  setCategory]  = useState('All');
    const [cart,      setCart]      = useState([]);
    const [sizeModal, setSizeModal] = useState(null);

    const [scannerOn,  setScannerOn]  = useState(true);
    const [manualSku,  setManualSku]  = useState('');
    const [scanStatus, setScanStatus] = useState(null);

    const [selectedDiscount, setSelectedDiscount] = useState(null);
    const [showCoupons,      setShowCoupons]      = useState(false);

    const [historySearch, setHistorySearch] = useState('');
    const [selectedSale,  setSelectedSale]  = useState(null);

    const [showBillModal,  setShowBillModal]  = useState(false);
    const [customerForm,   setCustomerForm]   = useState({ name: '', phone: '', homeAddress: '', city: '' });
    const [showCityDrop,   setShowCityDrop]   = useState(false);
    const [filteredCities, setFilteredCities] = useState([]);

    // Events filter — staff can only filter, not modify
    const [eventFilter, setEventFilter] = useState('All');

    const [settingTab,     setSettingTab]     = useState('profile');
    const [profileForm,    setProfileForm]    = useState(() => {
        // Always read fresh from localStorage so fields are never stale on mount
        const fresh = (() => { try { return JSON.parse(localStorage.getItem('user')) || {}; } catch { return {}; } })();
        return { name: safeStr(fresh.name || user?.name), phone: safeStr(fresh.phone || user?.phone), address: safeStr(fresh.address || user?.address), email: safeStr(fresh.email || user?.email), city: safeStr(fresh.city || user?.city) };
    });
    const [photoPreview,   setPhotoPreview]   = useState(safeStr(user?.photo) || null);
    const [photoFile,      setPhotoFile]      = useState(null);
    const [settingLoading, setSettingLoading] = useState(false);
    const [settingMsg,     setSettingMsg]     = useState(null);
    const [pwForm,         setPwForm]         = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [otpStep,        setOtpStep]        = useState('idle');
    const [otpCode,        setOtpCode]        = useState('');
    const [otpInput,       setOtpInput]       = useState('');
    const [otpTimer,       setOtpTimer]       = useState(0);
    const otpTimerRef   = useRef(null);
    const photoInputRef = useRef(null);

    const [toast,       setToast]       = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [shiftStart]                  = useState(new Date());

    const notify = useCallback((text, type = 'success') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    const fetchData = useCallback(async () => {
        const userId = user?.id || user?._id;
        if (!userId) return;
        const [pR, sR, hR, oR, eR] = await Promise.allSettled([
            axios.get('http://localhost:5001/api/staff/products'),
            axios.get(`http://localhost:5001/api/staff/daily-stats/${userId}`),
            axios.get(`http://localhost:5001/api/staff/history/${userId}`),
            axios.get('http://localhost:5001/api/admin/discounts'),
            axios.get('http://localhost:5001/api/admin/events'),
        ]);
        if (pR.status === 'fulfilled') setProducts(safeArr(pR.value.data).filter(p => p.isAvailable !== false));
        if (sR.status === 'fulfilled') setStats({ revenue: safeNum(sR.value.data?.revenue), count: safeNum(sR.value.data?.count) });
        if (hR.status === 'fulfilled') setSalesHistory(safeArr(hR.value.data));
        if (oR.status === 'fulfilled') setActiveOffers(safeArr(oR.value.data).filter(o => o.isActive));
        if (eR.status === 'fulfilled') setEvents(safeArr(eR.value.data));
    }, [user]);

    useEffect(() => {
        const clock = setInterval(() => setCurrentTime(new Date()), 1000);
        fetchData();
        const poll = setInterval(fetchData, 15000);
        return () => { clearInterval(clock); clearInterval(poll); };
    }, [fetchData]);

    // Live events — status computed at render time from dates
    const eventsWithLiveStatus = useMemo(() => events.map(e => ({ ...e, _liveStatus: computeEventStatus(e) })), [events]);
    const activeEventCount     = useMemo(() => eventsWithLiveStatus.filter(e => e._liveStatus === 'Active').length, [eventsWithLiveStatus]);

    const resolveScan = useCallback((sku) => {
        const up = sku.toUpperCase().trim();
        for (const p of products) {
            for (const v of safeArr(p.variants)) { if (safeStr(v.sku).toUpperCase() === up) return { product: p, size: v.size, variant: v }; }
            if (safeStr(p.sku).toUpperCase() === up) return { product: p, size: null, variant: null };
        }
        return null;
    }, [products]);

    const handleScan = useCallback((sku) => {
        const r = resolveScan(sku);
        if (!r)        { setScanStatus({ type: 'error',   msg: `No product found for SKU: ${sku}` }); }
        else if (r.size) { addToCartWithSize(r.product, r.size, r.variant); setScanStatus({ type: 'success', msg: `Added: ${r.product.name} (${r.size})` }); }
        else           { setSizeModal(r.product); setScanStatus({ type: 'success', msg: `Found: ${r.product.name} — select size` }); }
        setTimeout(() => setScanStatus(null), 2500);
    }, [resolveScan]); // eslint-disable-line

    useBarcodeScanner(handleScan, scannerOn && view === 'pos');

    const openSizeModal = useCallback((product) => {
        const variants = safeArr(product.variants), totalStk = safeNum(product.totalStock ?? product.stock);
        const anyStock = variants.some(v => safeNum(v.stock) > 0) || totalStk > 0;
        if (!anyStock) { notify('This product is completely out of stock!', 'error'); return; }
        setSizeModal(product);
    }, [notify]);

    const addToCartWithSize = useCallback((product, size, variant) => {
        const stockForSize = variant ? safeNum(variant.stock) : safeNum(product.stock);
        if (stockForSize <= 0) { notify(`${product.name} (${size}) is out of stock!`, 'error'); return; }
        const cartKey = `${product._id}_${size}`;
        setCart(prev => {
            const existing = prev.find(x => x._cartKey === cartKey);
            if (existing) {
                if (existing.qty >= stockForSize) { notify('Maximum available stock reached!', 'error'); return prev; }
                return prev.map(x => x._cartKey === cartKey ? { ...x, qty: x.qty + 1 } : x);
            }
            return [...prev, { ...product, _cartKey: cartKey, _size: size, _sku: safeStr(variant?.sku || product.sku), _maxStock: stockForSize, productId: product._id, qty: 1 }];
        });
        notify(`Added: ${product.name}${size !== 'OS' ? ` (${size})` : ''}`);
        setSizeModal(null);
    }, [notify]);

    const updateQty = useCallback((cartKey, delta) => {
        setCart(prev => prev.map(item => {
            if (item._cartKey !== cartKey) return item;
            const next = Math.max(1, item.qty + delta);
            if (delta > 0 && next > (item._maxStock || 9999)) { notify('Stock limit reached!', 'error'); return item; }
            return { ...item, qty: next };
        }));
    }, [notify]);

    const removeItem = useCallback((cartKey) => setCart(prev => prev.filter(x => x._cartKey !== cartKey)), []);

    const subtotal      = useMemo(() => cart.reduce((a, i) => a + safeNum(i.price) * safeNum(i.qty, 1), 0), [cart]);
    const discountVal   = useMemo(() => {
        if (!selectedDiscount) return 0;
        const min = safeNum(selectedDiscount.minOrder || selectedDiscount.minOrderValue);
        if (subtotal < min) return 0;
        const val = safeNum(selectedDiscount.value || selectedDiscount.discountPercent), type = safeStr(selectedDiscount.type).toLowerCase();
        return type === 'percentage' ? (subtotal * val) / 100 : val;
    }, [selectedDiscount, subtotal]);
    const finalTotal    = Math.max(0, subtotal - discountVal);
    const cartItemCount = useMemo(() => cart.reduce((a, i) => a + safeNum(i.qty, 1), 0), [cart]);
    const eligibleCount = useMemo(() => activeOffers.filter(o => subtotal >= safeNum(o.minOrder || o.minOrderValue)).length, [activeOffers, subtotal]);

    useEffect(() => {
        if (!selectedDiscount) return;
        const min = safeNum(selectedDiscount.minOrder || selectedDiscount.minOrderValue);
        if (subtotal < min) { setSelectedDiscount(null); notify(`Coupon removed — cart below Rs.${min} minimum`, 'error'); }
    }, [subtotal]); // eslint-disable-line

    const filteredProducts = useMemo(() => products.filter(p =>
        safeStr(p.name).toLowerCase().includes(search.toLowerCase()) && (category === 'All' || p.category === category)
    ), [products, search, category]);

    const handleCityInput = (e) => {
        const v = e.target.value;
        setCustomerForm(f => ({ ...f, city: v }));
        if (v) { setFilteredCities(INDIAN_CITIES.filter(c => c.toLowerCase().startsWith(v.toLowerCase()))); setShowCityDrop(true); }
        else setShowCityDrop(false);
    };

    // ── Photo change handler ──────────────────────────────────────────────────
    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 3 * 1024 * 1024) { setSettingMsg({ type: 'error', text: 'Photo must be under 3MB.' }); return; }
        setPhotoFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => setPhotoPreview(ev.target.result);
        reader.readAsDataURL(file);
    };

    // ── Save profile (name, phone, address, email, city, photo) ──────────────
    const handleSaveProfile = async (e) => {
        e.preventDefault();
        const userId = user?.id || user?._id;
        if (!userId) return;
        setSettingLoading(true); setSettingMsg(null);
        try {
            const formPayload = new FormData();
            formPayload.append('name', profileForm.name); formPayload.append('phone', profileForm.phone);
            formPayload.append('address', profileForm.address); formPayload.append('email', profileForm.email);
            formPayload.append('city', profileForm.city);
            if (photoFile) formPayload.append('photo', photoFile);
            const res = await axios.put(`http://localhost:5001/api/staff/profile/${userId}`, formPayload, { headers: { 'Content-Type': 'multipart/form-data' } });
            // Always merge profileForm values — don't rely solely on server response
            const serverUser = res.data?.user || {};
            const updated = { ...currentUser, ...serverUser, name: profileForm.name, phone: profileForm.phone, address: profileForm.address, email: profileForm.email, city: profileForm.city, ...(serverUser.photo ? { photo: serverUser.photo } : {}) };
            localStorage.setItem('user', JSON.stringify(updated));
            setCurrentUser(updated);
            setProfileForm(f => ({ ...f, ...updated }));
            if (serverUser.photo) setPhotoPreview(serverUser.photo);
            setPhotoFile(null);
            setSettingMsg({ type: 'success', text: 'Profile updated successfully!' });
            notify('Profile saved!');
        } catch (err) { setSettingMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update profile.' }); }
        finally { setSettingLoading(false); }
    };

    // ── OTP flow for password change ──────────────────────────────────────────
    const startOtpTimer = () => {
        setOtpTimer(60); clearInterval(otpTimerRef.current);
        otpTimerRef.current = setInterval(() => { setOtpTimer(t => { if (t <= 1) { clearInterval(otpTimerRef.current); return 0; } return t - 1; }); }, 1000);
    };

    const handleRequestOtp = async () => {
        if (!pwForm.currentPassword)                             { setSettingMsg({ type: 'error', text: 'Enter your current password first.' }); return; }
        if (pwForm.newPassword.length < 6)                       { setSettingMsg({ type: 'error', text: 'New password must be at least 6 characters.' }); return; }
        if (pwForm.newPassword !== pwForm.confirmPassword)       { setSettingMsg({ type: 'error', text: 'New passwords do not match.' }); return; }
        setOtpStep('sending'); setSettingMsg(null);
        // Generate 6-digit OTP (in production, backend sends via email/SMS)
        const generated = Math.floor(100000 + Math.random() * 900000).toString();
        setOtpCode(generated);
        setTimeout(() => { setOtpStep('verify'); startOtpTimer(); notify(`Demo OTP: ${generated}`, 'success'); }, 1200);
    };

    const handleVerifyOtpAndChange = async () => {
        if (otpInput.trim() !== otpCode) { setSettingMsg({ type: 'error', text: 'Incorrect OTP. Please try again.' }); return; }
        const userId = user?.id || user?._id;
        setSettingLoading(true); setSettingMsg(null);
        try {
            await axios.post('http://localhost:5001/api/staff/change-password', { userId, currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
            setOtpStep('done');
            setSettingMsg({ type: 'success', text: 'Password changed successfully! Keep it safe.' });
            setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setOtpInput(''); clearInterval(otpTimerRef.current);
            notify('Password updated!');
        } catch (err) { setSettingMsg({ type: 'error', text: err.response?.data?.message || 'Password change failed.' }); setOtpStep('idle'); }
        finally { setSettingLoading(false); }
    };

    const handleCheckout = async (e) => {
        e.preventDefault();
        const userId = user?.id || user?._id;
        if (!userId)                          { notify('Session expired. Please log in again.', 'error'); return; }
        if (cart.length === 0)                { notify('Cart is empty!', 'error'); return; }
        if (customerForm.phone.length !== 10) { notify('Enter a valid 10-digit phone number.', 'error'); return; }
        try {
            const saleData = {
                items: cart.map(i => ({ productId: i._id || i.productId, name: `${safeStr(i.name)}${i._size && i._size !== 'OS' ? ` (${i._size})` : ''}`, price: safeNum(i.price), quantity: safeNum(i.qty, 1), sku: safeStr(i._sku), size: safeStr(i._size) })),
                soldBy: userId, staffId: userId, staffName: safeStr(currentUser?.name, 'Staff'),
                customerName: customerForm.name, customerPhone: customerForm.phone,
                customerAddress: customerForm.homeAddress, storeLocation: customerForm.city,
                subtotal, discount: discountVal, totalAmount: finalTotal,
            };
            const res = await axios.post('http://localhost:5001/api/staff/create-sale', saleData);
            notify('Sale completed & bill generated!');
            generateBillPDF({ ...saleData, _id: res.data?.sale?._id || '', invoiceId: res.data?.sale?.invoiceId || '', date: new Date() });
            setCart([]); setSelectedDiscount(null); setShowBillModal(false);
            setCustomerForm({ name: '', phone: '', homeAddress: '', city: '' });
            fetchData();
        } catch (err) { notify(safeStr(err.response?.data?.message, 'Checkout failed. Try again.'), 'error'); }
    };

    const shiftDuration = new Date(currentTime - shiftStart).toISOString().substr(11, 8);

    // Filtered events for staff view
    const filteredStaffEvents = useMemo(() =>
        eventsWithLiveStatus
            .filter(e => eventFilter === 'All' || e._liveStatus === eventFilter)
            .sort((a, b) => new Date(a.startDate || a.date) - new Date(b.startDate || b.date))
    , [eventsWithLiveStatus, eventFilter]);

    return (
        <div className="flex h-screen bg-[#080C14] font-sans text-slate-200 overflow-hidden">

            {/* TOAST */}
            {toast && (
                <div className={`fixed top-5 right-5 z-[400] px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-white border ${toast.type === 'error' ? 'bg-red-900/95 border-red-500' : 'bg-[#1e293b] border-indigo-500'}`}>
                    {toast.type === 'error' ? <FiAlertTriangle className="text-red-400 shrink-0"/> : <FiCheckCircle className="text-emerald-400 shrink-0"/>}
                    <p className="text-sm">{toast.text}</p>
                </div>
            )}

            {sizeModal && <SizeModal product={sizeModal} onConfirm={addToCartWithSize} onClose={() => setSizeModal(null)}/>}

            {/* SIDEBAR */}
            <nav className="w-20 bg-[#0F172A] flex flex-col items-center py-8 border-r border-slate-800 z-20 shadow-2xl shrink-0">
                <div className="mb-10 p-3 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl shadow-lg"><FiPackage size={24} className="text-white"/></div>
                <div className="flex-1 space-y-2 w-full">
                    <NavIcon icon={<FiHome size={20}/>}     active={view === 'home'}     onClick={() => setView('home')}     label="Home"/>
                    <NavIcon icon={<FiGrid size={20}/>}     active={view === 'pos'}      onClick={() => setView('pos')}      label="Billing"/>
                    <NavIcon icon={<FiFileText size={20}/>} active={view === 'history'}  onClick={() => setView('history')}  label="History"/>
                    <NavIcon icon={<FiCalendar size={20}/>} active={view === 'events'}   onClick={() => setView('events')}   label="Events" badge={activeEventCount}/>
                    <NavIcon icon={<FiSettings size={20}/>} active={view === 'settings'} onClick={() => setView('settings')} label="Settings"/>
                </div>
                <button onClick={() => navigate('/')} className="p-4 mt-auto text-slate-500 hover:text-red-400 transition-colors"><FiLogOut size={22}/></button>
            </nav>

            <main className="flex-1 flex flex-col overflow-hidden">

                {/* ══ HOME ══ */}
                {view === 'home' && (
                    <div className="p-8 h-full overflow-y-auto">
                        <header className="flex justify-between items-start mb-8">
                            <div><h1 className="text-3xl font-black text-white">Retail Command Center</h1><p className="text-slate-500 mt-1">Operator: <span className="text-indigo-400 font-bold">{currentUser?.name}</span></p></div>
                            <div className="bg-[#0F172A] border border-slate-800 p-4 rounded-2xl text-right shadow-lg"><p className="text-3xl font-mono font-bold text-white">{currentTime.toLocaleTimeString()}</p><p className="text-xs text-slate-500 mt-1 font-bold uppercase tracking-wider">Shift: {shiftDuration}</p></div>
                        </header>
                        <div className="grid grid-cols-3 gap-6 mb-8">
                            <StatCard title="Today's Revenue" value={`Rs.${safeNum(stats.revenue).toFixed(2)}`} icon={<FiCreditCard/>} color="indigo"/>
                            <StatCard title="Today's Sales"   value={safeNum(stats.count)}                     icon={<FiCheckCircle/>} color="emerald"/>
                            <StatCard title="Shift Timer"     value={shiftDuration}                            icon={<FiClock/>}       color="blue"/>
                        </div>
                        {/* Active events banner */}
                        {eventsWithLiveStatus.filter(e => e._liveStatus === 'Active').length > 0 && (
                            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3">
                                <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shrink-0"/>
                                <div className="flex-1"><p className="text-emerald-400 font-black text-sm">Active Events Running Now</p><p className="text-emerald-300/70 text-xs mt-0.5">{eventsWithLiveStatus.filter(e => e._liveStatus === 'Active').map(e => e.title).join(' • ')}</p></div>
                                <button onClick={() => setView('events')} className="text-xs text-emerald-400 font-bold hover:underline shrink-0">View →</button>
                            </div>
                        )}
                        <div className="bg-[#0F172A] rounded-3xl border border-slate-800 p-8 shadow-xl">
                            <h2 className="text-xl font-bold text-white mb-6">Recent Sales</h2>
                            {salesHistory.length === 0 ? <p className="text-slate-500 text-sm">No sales recorded yet.</p> : (
                                <div className="space-y-3">
                                    {salesHistory.slice(0, 5).map(sale => {
                                        const qty = safeArr(sale.items).reduce((s, i) => s + safeNum(i.quantity, 1), 0);
                                        return (
                                            <div key={sale._id} className="flex items-center justify-between p-4 bg-[#080C14] rounded-2xl border border-slate-800 hover:border-indigo-500/40 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center"><FiFileText size={16}/></div>
                                                    <div><p className="font-bold text-white">{safeStr(sale.customerName, 'Walk-in')}</p><p className="text-xs text-slate-500">{new Date(sale.date || sale.createdAt).toLocaleTimeString()} • {qty} item{qty !== 1 ? 's' : ''}</p></div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="font-mono font-bold text-emerald-400">+Rs.{safeNum(sale.totalAmount).toFixed(2)}</span>
                                                    <button onClick={() => setSelectedSale(sale)} className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"><FiEye size={15}/></button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ══ POS ══ */}
                {view === 'pos' && (
                    <div className="flex h-full overflow-hidden">
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="px-6 pt-5 pb-3 border-b border-slate-800 flex items-center gap-4 shrink-0">
                                <div className="flex gap-2 overflow-x-auto flex-1">
                                    {CATEGORIES.map(cat => (
                                        <button key={cat} onClick={() => setCategory(cat)}
                                            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${category === cat ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-[#0F172A] text-slate-400 border-slate-800 hover:text-white hover:border-slate-600'}`}>
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                                <div className="relative shrink-0">
                                    <FiSearch className="absolute left-3 top-2.5 text-slate-500" size={14}/>
                                    <input type="text" placeholder="Search products…" onChange={e => setSearch(e.target.value)} className="bg-[#0F172A] border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-white w-52 text-sm outline-none focus:border-indigo-500 transition-all"/>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-5">
                                {filteredProducts.length === 0 ? (
                                    <div className="h-64 flex flex-col items-center justify-center text-slate-600"><FiPackage size={40} className="mb-3 opacity-30"/><p className="font-bold">No products found</p></div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {filteredProducts.map(p => {
                                            const variants = safeArr(p.variants);
                                            const total = variants.length > 0 ? variants.reduce((a, v) => a + safeNum(v.stock), 0) : safeNum(p.totalStock ?? p.stock);
                                            const isOut = total <= 0, isLow = !isOut && total <= 10;
                                            const availSz = variants.filter(v => safeNum(v.stock) > 0).map(v => v.size);
                                            return (
                                                <div key={p._id} onClick={() => !isOut && openSizeModal(p)}
                                                    className={`group bg-[#0F172A] rounded-2xl border overflow-hidden transition-all flex flex-col ${isOut ? 'opacity-50 cursor-not-allowed border-slate-800' : 'border-slate-800 hover:border-indigo-500/60 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/10 cursor-pointer'}`}>
                                                    <div className="relative h-44 overflow-hidden bg-slate-900">
                                                        <img src={safeStr(p.image) || getProductImage(p.name)} alt={p.name} onError={e => { e.target.onerror = null; e.target.src = getProductImage(p.name); }} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"/>
                                                        {!isOut && <div className="absolute inset-0 bg-indigo-700/75 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><span className="bg-white text-indigo-700 font-black text-sm px-4 py-2 rounded-xl flex items-center gap-2 transform scale-75 group-hover:scale-100 transition-transform"><FiPlus size={14}/> Pick Size</span></div>}
                                                        {isLow && !isOut && <span className="absolute top-2 left-2 bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-lg uppercase">Low Stock</span>}
                                                        {isOut && <span className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-lg uppercase">Out of Stock</span>}
                                                    </div>
                                                    <div className="p-4 flex-1 flex flex-col">
                                                        <h4 className="font-bold text-white text-sm line-clamp-2 leading-tight mb-2">{p.name}</h4>
                                                        {availSz.length > 0 && <div className="flex gap-1 flex-wrap mb-2">{availSz.map(s => <span key={s} className="text-[9px] font-black px-1.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{s}</span>)}</div>}
                                                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-800/50">
                                                            <span className="text-lg font-black text-white">Rs.{safeNum(p.price).toFixed(2)}</span>
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${isOut ? 'bg-red-500/10 text-red-400' : isLow ? 'bg-orange-500/10 text-orange-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{total} units</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Cart sidebar */}
                        <div className="w-[390px] shrink-0 bg-[#0F172A] border-l border-slate-800 flex flex-col shadow-2xl">
                            <div className="p-5 border-b border-slate-800 shrink-0 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-black text-white flex items-center gap-2"><FiShoppingCart className="text-indigo-400"/> Current Bill</h2>
                                    {cartItemCount > 0 && <span className="bg-indigo-600 text-white text-xs font-black px-2.5 py-1 rounded-full">{cartItemCount} items</span>}
                                </div>
                                <div className="bg-[#080C14] rounded-xl border border-slate-800 p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><BiBarcodeReader className="text-indigo-400" size={13}/> Barcode Scanner</span>
                                        <button onClick={() => setScannerOn(v => !v)} className={`text-[9px] font-black px-2 py-1 rounded-lg border transition-all ${scannerOn ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>{scannerOn ? '● ACTIVE' : '○ OFF'}</button>
                                    </div>
                                    {scanStatus && (
                                        <div className={`flex items-center gap-2 p-2 rounded-lg text-[11px] font-bold border ${scanStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                            {scanStatus.type === 'success' ? <FiCheckCircle size={11}/> : <FiAlertTriangle size={11}/>} {scanStatus.msg}
                                        </div>
                                    )}
                                    <form onSubmit={e => { e.preventDefault(); if (manualSku.trim()) { handleScan(manualSku.trim()); setManualSku(''); } }} className="flex gap-2">
                                        <input type="text" value={manualSku} onChange={e => setManualSku(e.target.value)} placeholder="Type SKU or scan barcode…" className="flex-1 bg-[#0F172A] border border-slate-700 rounded-xl py-2 px-3 text-white text-xs font-mono outline-none focus:border-indigo-500 transition-all min-w-0"/>
                                        <button type="submit" className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shrink-0">Go</button>
                                    </form>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {cart.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-700 gap-3"><FiShoppingCart size={40} className="opacity-20"/><p className="text-sm font-bold text-slate-600">Cart is empty</p><p className="text-xs text-slate-700">Click a product to pick its size</p></div>
                                ) : cart.map(item => (
                                    <div key={item._cartKey} className="flex items-center gap-3 p-3 bg-[#080C14] rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors group">
                                        <img src={safeStr(item.image) || getProductImage(item.name)} alt={item.name} onError={e => { e.target.onerror = null; e.target.src = getProductImage(item.name); }} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-700"/>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white truncate">{item.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-slate-500">Rs.{safeNum(item.price).toFixed(2)}</span>
                                                {item._size && item._size !== 'OS' && <span className="text-[9px] font-black bg-indigo-500/15 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20">{item._size}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 bg-[#0F172A] border border-slate-700 rounded-xl p-1 shrink-0">
                                            <button onClick={() => updateQty(item._cartKey, -1)} className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"><FiMinus size={12}/></button>
                                            <span className="text-xs font-black text-white w-5 text-center">{item.qty}</span>
                                            <button onClick={() => updateQty(item._cartKey, 1)}  className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"><FiPlus  size={12}/></button>
                                        </div>
                                        <button onClick={() => removeItem(item._cartKey)} className="text-slate-700 hover:text-red-400 transition-colors p-1 shrink-0"><FiTrash2 size={15}/></button>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 border-t border-slate-800 space-y-4 shrink-0">
                                <div>
                                    <button onClick={() => setShowCoupons(v => !v)} className="w-full flex items-center justify-between group mb-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                            <FiTag className="text-indigo-400" size={12}/> Apply Coupon
                                            {activeOffers.length > 0 && <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black ${eligibleCount > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>{eligibleCount}/{activeOffers.length} eligible</span>}
                                        </span>
                                        <span className="text-[10px] text-slate-600 group-hover:text-slate-400 transition-colors">{showCoupons ? '▲' : '▼'}</span>
                                    </button>
                                    {selectedDiscount && !showCoupons && (
                                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 mb-2">
                                            <div className="flex items-center gap-2"><FiCheckCircle className="text-indigo-400" size={13}/><span className="text-xs font-black text-white">{selectedDiscount.code}</span><span className="text-xs text-emerald-400 font-bold">-Rs.{discountVal.toFixed(2)}</span></div>
                                            <button onClick={() => setSelectedDiscount(null)} className="text-slate-500 hover:text-red-400 transition-colors"><FiX size={13}/></button>
                                        </div>
                                    )}
                                    {showCoupons && (
                                        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
                                            {activeOffers.length === 0 ? <p className="text-xs text-slate-600 text-center py-3">No active coupons.</p>
                                              : [...activeOffers].sort((a, b) => { const aOk = subtotal >= safeNum(a.minOrder || a.minOrderValue); const bOk = subtotal >= safeNum(b.minOrder || b.minOrderValue); return bOk - aOk; })
                                                .map(offer => <CouponRow key={offer._id} offer={offer} subtotal={subtotal} isSelected={selectedDiscount?._id === offer._id} onSelect={o => { setSelectedDiscount(p => p?._id === o._id ? null : o); setShowCoupons(false); }}/>)
                                            }
                                        </div>
                                    )}
                                </div>
                                <div className="bg-[#080C14] border border-slate-800 rounded-2xl p-4 space-y-2">
                                    <div className="flex justify-between text-sm text-slate-400"><span>Subtotal</span><span className="font-mono text-slate-200">Rs.{subtotal.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-sm text-emerald-400"><span>Discount</span><span className="font-mono">-Rs.{discountVal.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-2xl font-black text-white pt-2 border-t border-slate-800"><span>Total</span><span className="text-indigo-400">Rs.{finalTotal.toFixed(2)}</span></div>
                                </div>
                                <button onClick={() => { if (cart.length > 0) setShowBillModal(true); }} disabled={cart.length === 0}
                                    className={`w-full py-3.5 rounded-xl font-black text-white flex items-center justify-center gap-2 transition-all text-sm ${cart.length > 0 ? 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 active:scale-95' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}>
                                    <FiCreditCard size={16}/> Proceed to Checkout
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ HISTORY ══ */}
                {view === 'history' && (
                    <div className="p-8 h-full overflow-y-auto">
                        <div className="flex justify-between items-center mb-8">
                            <div><h2 className="text-3xl font-black text-white">Sales History</h2><p className="text-slate-500 mt-1">All your past transactions</p></div>
                            <div className="relative"><FiSearch className="absolute left-3.5 top-3 text-slate-500" size={14}/><input type="text" placeholder="Search invoice, name, phone…" onChange={e => setHistorySearch(e.target.value)} className="bg-[#0F172A] border border-slate-800 rounded-2xl py-2.5 pl-10 pr-4 text-white w-80 text-sm outline-none focus:border-indigo-500 transition-all"/></div>
                        </div>
                        <div className="bg-[#0F172A] rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="bg-[#131C31] text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800">
                                    <tr>{['Invoice','Customer','Items','Amount','Date',''].map(h => <th key={h} className="p-5">{h}</th>)}</tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {salesHistory.filter(h => { const q = historySearch.toLowerCase(); return safeStr(h.invoiceId || h._id).toLowerCase().includes(q) || safeStr(h.customerName).toLowerCase().includes(q) || safeStr(h.customerPhone).includes(q); })
                                        .map(s => { const qty = safeArr(s.items).reduce((a, i) => a + safeNum(i.quantity, 1), 0); return (
                                        <tr key={s._id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="p-5 font-mono text-indigo-400 font-bold">{safeStr(s.invoiceId) || ('#' + safeStr(s._id).slice(-6).toUpperCase())}</td>
                                            <td className="p-5"><p className="font-bold text-white">{safeStr(s.customerName, 'Walk-in')}</p><p className="text-xs text-slate-500">{safeStr(s.customerPhone, 'N/A')}</p></td>
                                            <td className="p-5"><span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-xs font-bold">{qty} units</span></td>
                                            <td className="p-5 font-black text-emerald-400">Rs.{safeNum(s.totalAmount).toFixed(2)}</td>
                                            <td className="p-5 text-slate-400">{new Date(s.date || s.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</td>
                                            <td className="p-5 text-right"><button onClick={() => setSelectedSale(s)} className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"><FiEye size={15}/></button></td>
                                        </tr>
                                    ); })}
                                    {salesHistory.length === 0 && <tr><td colSpan="6" className="p-10 text-center text-slate-500">No sales history yet.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ══ EVENTS (STAFF — VIEW ONLY, LIVE STATUS) ══ */}
                {view === 'events' && (
                    <div className="p-8 h-full overflow-y-auto">
                        <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-5 mb-8">
                            <div><h1 className="text-3xl font-black text-white flex items-center gap-3"><FiStar className="text-yellow-400"/> Events & Promotions</h1><p className="text-slate-500 mt-1">Store campaigns — view only</p></div>
                            <div className="flex gap-1 bg-[#0F172A] p-1 rounded-2xl border border-slate-800">
                                {['All','Active','Upcoming','Completed'].map(f => {
                                    const count = f === 'All' ? eventsWithLiveStatus.length : eventsWithLiveStatus.filter(e => e._liveStatus === f).length;
                                    return (
                                        <button key={f} onClick={() => setEventFilter(f)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${eventFilter === f ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                                            {f}{f === 'Active' && count > 0 && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"/>}<span className="opacity-60">{count}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </header>
                        {filteredStaffEvents.length === 0 ? (
                            <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-16 flex flex-col items-center text-slate-500 shadow-xl">
                                <FiCalendar size={36} className="mb-4"/>
                                <p className="text-lg font-bold text-white">No Events Found</p>
                                <p className="text-sm text-slate-500 mt-1">{eventFilter !== 'All' ? `No ${eventFilter.toLowerCase()} events right now.` : 'Admin has not scheduled any events yet.'}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                {filteredStaffEvents.map((ev, i) => {
                                    const status = ev._liveStatus, isNow = status === 'Active';
                                    const grad = GRADIENTS[ev.title?.charCodeAt(0) % GRADIENTS.length] || GRADIENTS[0];
                                    const start = ev.startDate ? new Date(ev.startDate) : (ev.date ? new Date(ev.date) : null);
                                    const day = start ? start.toLocaleDateString('en-IN', { day: '2-digit' }) : '--';
                                    const month = start ? start.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : '--';
                                    const year = start ? start.getFullYear() : '';
                                    return (
                                        <div key={ev._id || i} className={`bg-[#0F172A] rounded-3xl border overflow-hidden transition-all ${isNow ? 'border-emerald-500/50 shadow-[0_8px_30px_rgba(16,185,129,0.12)]' : 'border-slate-800 hover:border-indigo-500/40'}`}>
                                            <div className={`bg-gradient-to-r ${grad} px-6 py-4 flex items-center justify-between`}>
                                                <div><p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">{month} {year}</p><p className="text-white text-4xl font-black leading-none">{day}</p></div>
                                                <StaffEventBadge status={status}/>
                                            </div>
                                            <div className="p-5">
                                                <h3 className="font-bold text-white text-lg leading-snug mb-1">{safeStr(ev.title || ev.name, 'Special Event')}</h3>
                                                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-4">{safeStr(ev.description, 'Join us for this promotion.')}</p>
                                                {ev.saleOffer && <div className="flex items-center gap-1.5 mb-4 p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl"><FiTag className="text-indigo-400" size={12}/><span className="text-indigo-300 text-xs font-bold">{ev.saleOffer}</span></div>}
                                                <div className="flex items-center gap-2 text-[11px] text-slate-500 border-t border-slate-800/60 pt-3">
                                                    <FiCalendar size={10} className="text-slate-600"/>
                                                    <span>{fmtDate(ev.startDate || ev.date)}</span>
                                                    {ev.endDate && ev.endDate !== ev.startDate && <><span className="text-slate-700">→</span><span>{fmtDate(ev.endDate)}</span></>}
                                                    {ev.location && <><span className="text-slate-700 ml-auto">📍</span><span>{ev.location}</span></>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ══ SETTINGS ══ */}
                {view === 'settings' && (
                    <div className="p-8 h-full overflow-y-auto">
                        <div className="mb-8"><h1 className="text-3xl font-black text-white">Account Settings</h1><p className="text-slate-500 mt-1">Manage your profile, photo and security</p></div>
                        {settingMsg && (
                            <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 border text-sm font-bold ${settingMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                {settingMsg.type === 'success' ? <FiCheckCircle size={18}/> : <FiAlertTriangle size={18}/>}
                                {settingMsg.text}
                                <button onClick={() => setSettingMsg(null)} className="ml-auto opacity-60 hover:opacity-100"><FiX size={14}/></button>
                            </div>
                        )}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* ── SIDEBAR CARD ── */}
                            <div className="bg-[#0F172A] rounded-3xl border border-slate-800 p-8 h-fit shadow-xl">
                                <div className="flex flex-col items-center mb-8 pb-8 border-b border-slate-800/50">
                                    <div className="relative group mb-4">
                                        <div className="w-28 h-28 rounded-full border-4 border-indigo-500/30 overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                            {photoPreview ? <img src={photoPreview} alt="Profile" className="w-full h-full object-cover"/> : <span className="text-4xl font-black text-white">{safeStr(currentUser?.name, 'U').charAt(0).toUpperCase()}</span>}
                                        </div>
                                        <button type="button" onClick={() => photoInputRef.current?.click()} className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1">
                                            <FiEdit2 size={18}/><span className="text-[9px] font-black uppercase tracking-wider">Change</span>
                                        </button>
                                        <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange}/>
                                        <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-[#0F172A]"/>
                                    </div>
                                    <h2 className="text-xl font-bold text-white">{currentUser?.name}</h2>
                                    <p className="text-slate-500 text-xs mt-0.5">{safeStr(currentUser?.employeeId) || 'Staff'}</p>
                                    <span className="mt-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">● Active Staff</span>
                                    {photoFile && <div className="mt-3 flex items-center gap-2 text-xs text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20"><FiCheckCircle size={11}/> New photo ready to save</div>}
                                </div>
                                <div className="space-y-3 mb-6 text-sm">
                                    {[{ label: 'Email', val: safeStr(currentUser?.email, 'Not set') }, { label: 'Phone', val: safeStr(currentUser?.phone, 'Not set') }, { label: 'City', val: safeStr(currentUser?.city, 'Not set') }].map(r => (
                                        <div key={r.label} className="flex justify-between items-center py-2 border-b border-slate-800/60">
                                            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">{r.label}</span>
                                            <span className="text-slate-300 text-xs font-medium truncate max-w-[130px]">{r.val}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-1.5">
                                    {[{ id: 'profile', icon: <FiUser size={15}/>, label: 'Edit Profile' }, { id: 'security', icon: <FiShield size={15}/>, label: 'Change Password' }].map(t => (
                                        <button key={t.id} onClick={() => { setSettingTab(t.id); setSettingMsg(null); setOtpStep('idle'); setOtpInput(''); }}
                                            className={`w-full text-left p-3.5 rounded-2xl flex items-center gap-3 transition-all font-bold text-sm ${settingTab === t.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                                            {t.icon} {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* ── MAIN PANEL ── */}
                            <div className="lg:col-span-2 space-y-5">
                                {/* PROFILE TAB */}
                                {settingTab === 'profile' && (
                                    <form onSubmit={handleSaveProfile} className="bg-[#0F172A] rounded-3xl border border-slate-800 p-8 shadow-xl">
                                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><FiEdit2 className="text-indigo-400"/> Edit Profile</h3>
                                        <div className="grid grid-cols-2 gap-5 mb-5">
                                            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Full Name *</label><input required type="text" value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-[#080C14] border border-slate-700 rounded-xl p-3.5 text-white outline-none focus:border-indigo-500 transition-all text-sm"/></div>
                                            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Phone</label><input type="text" maxLength="10" value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))} placeholder="10-digit mobile" className="w-full bg-[#080C14] border border-slate-700 rounded-xl p-3.5 text-white outline-none focus:border-indigo-500 transition-all text-sm"/></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-5 mb-5">
                                            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Email</label><input type="email" value={profileForm.email} onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} placeholder="you@example.com" className="w-full bg-[#080C14] border border-slate-700 rounded-xl p-3.5 text-white outline-none focus:border-indigo-500 transition-all text-sm"/></div>
                                            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">City</label><input type="text" value={profileForm.city} onChange={e => setProfileForm(f => ({ ...f, city: e.target.value }))} placeholder="e.g. Ahmedabad" className="w-full bg-[#080C14] border border-slate-700 rounded-xl p-3.5 text-white outline-none focus:border-indigo-500 transition-all text-sm"/></div>
                                        </div>
                                        <div className="space-y-1.5 mb-6"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Address</label><textarea rows="3" value={profileForm.address} onChange={e => setProfileForm(f => ({ ...f, address: e.target.value }))} placeholder="Street, area, landmark…" className="w-full bg-[#080C14] border border-slate-700 rounded-xl p-3.5 text-white outline-none focus:border-indigo-500 transition-all resize-none text-sm"/></div>
                                        <div className="p-4 bg-[#080C14] border border-slate-800 rounded-2xl flex items-center gap-4 mb-6">
                                            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0">{photoPreview ? <img src={photoPreview} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-slate-500"><FiUser size={20}/></div>}</div>
                                            <div className="flex-1 min-w-0"><p className="text-white text-sm font-bold">{photoFile ? photoFile.name : 'Profile Photo'}</p><p className="text-slate-500 text-xs">{photoFile ? `${(photoFile.size / 1024).toFixed(0)} KB — Ready to upload` : 'JPG, PNG up to 3MB'}</p></div>
                                            <button type="button" onClick={() => photoInputRef.current?.click()} className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all shrink-0">{photoFile ? 'Change' : 'Upload'}</button>
                                        </div>
                                        <div className="flex justify-end">
                                            <button type="submit" disabled={settingLoading} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg text-sm">
                                                {settingLoading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Saving…</> : <><FiSave size={15}/> Save Profile</>}
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {/* SECURITY TAB — OTP-gated password change */}
                                {settingTab === 'security' && (
                                    <div className="bg-[#0F172A] rounded-3xl border border-slate-800 p-8 shadow-xl">
                                        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><FiLock className="text-indigo-400"/> Change Password</h3>
                                        <p className="text-slate-500 text-sm mb-6">An OTP will be generated to confirm your identity before changing your password.</p>
                                        {/* Step 1 — Enter passwords */}
                                        {(otpStep === 'idle' || otpStep === 'sending') && (
                                            <div className="space-y-4">
                                                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Current Password *</label><input type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} placeholder="Enter your current password" className="w-full bg-[#080C14] border border-slate-700 rounded-xl p-3.5 text-white outline-none focus:border-indigo-500 transition-all text-sm"/></div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">New Password *</label>
                                                    <input type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="Min 6 characters" className="w-full bg-[#080C14] border border-slate-700 rounded-xl p-3.5 text-white outline-none focus:border-indigo-500 transition-all text-sm"/>
                                                    {pwForm.newPassword && (
                                                        <div className="flex gap-1 mt-2">
                                                            {[1,2,3,4].map(i => { const len = pwForm.newPassword.length, s = len < 6 ? 1 : len < 10 ? 2 : len < 14 ? 3 : 4; return <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= s ? (s <= 1 ? 'bg-red-500' : s <= 2 ? 'bg-orange-400' : s <= 3 ? 'bg-yellow-400' : 'bg-emerald-400') : 'bg-slate-800'}`}/>; })}
                                                            <span className="text-[10px] text-slate-500 ml-2 font-bold">{pwForm.newPassword.length < 6 ? 'Weak' : pwForm.newPassword.length < 10 ? 'Fair' : pwForm.newPassword.length < 14 ? 'Good' : 'Strong'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Confirm New Password *</label>
                                                    <input type="password" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Re-enter new password"
                                                        className={`w-full bg-[#080C14] border rounded-xl p-3.5 text-white outline-none focus:border-indigo-500 transition-all text-sm ${pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword ? 'border-red-500' : 'border-slate-700'}`}/>
                                                    {pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword && <p className="text-red-400 text-xs font-bold flex items-center gap-1"><FiX size={11}/> Passwords do not match</p>}
                                                    {pwForm.confirmPassword && pwForm.confirmPassword === pwForm.newPassword && pwForm.newPassword && <p className="text-emerald-400 text-xs font-bold flex items-center gap-1"><FiCheckCircle size={11}/> Passwords match</p>}
                                                </div>
                                                <button onClick={handleRequestOtp} disabled={otpStep === 'sending'}
                                                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg">
                                                    {otpStep === 'sending' ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Generating OTP…</> : <><FiShield size={15}/> Get OTP to Continue</>}
                                                </button>
                                            </div>
                                        )}
                                        {/* Step 2 — Enter OTP */}
                                        {otpStep === 'verify' && (
                                            <div className="space-y-5">
                                                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-start gap-3">
                                                    <FiShield className="text-indigo-400 mt-0.5 shrink-0" size={18}/>
                                                    <div><p className="text-indigo-300 font-bold text-sm">OTP Generated</p><p className="text-indigo-400/70 text-xs mt-0.5">Check the notification for your OTP. In production this would be sent to your registered email/phone.</p></div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Enter 6-Digit OTP</label>
                                                    <input type="text" maxLength="6" value={otpInput} onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))} placeholder="000000" className="w-full bg-[#080C14] border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-emerald-500 transition-all text-2xl font-mono tracking-[0.5em] text-center"/>
                                                </div>
                                                {otpTimer > 0 && <p className="text-center text-slate-500 text-xs font-bold">OTP expires in <span className="text-indigo-400">{otpTimer}s</span></p>}
                                                {otpTimer === 0 && <p className="text-center text-red-400 text-xs font-bold">OTP expired. <button onClick={() => setOtpStep('idle')} className="underline">Generate a new one</button></p>}
                                                <div className="flex gap-3">
                                                    <button onClick={() => { setOtpStep('idle'); setOtpInput(''); setSettingMsg(null); }} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all text-sm">← Back</button>
                                                    <button onClick={handleVerifyOtpAndChange} disabled={otpInput.length !== 6 || settingLoading || otpTimer === 0}
                                                        className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg text-sm">
                                                        {settingLoading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Verifying…</> : <><FiCheckCircle size={15}/> Verify & Change Password</>}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {/* Step 3 — Done */}
                                        {otpStep === 'done' && (
                                            <div className="flex flex-col items-center py-8 text-center">
                                                <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-5"><FiCheckCircle size={36} className="text-emerald-400"/></div>
                                                <h4 className="text-xl font-bold text-white mb-2">Password Changed!</h4>
                                                <p className="text-slate-400 text-sm mb-6 max-w-xs">Your password has been updated and saved to the database.</p>
                                                <button onClick={() => { setOtpStep('idle'); setSettingMsg(null); }} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all text-sm">Change Again</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* ══ CHECKOUT MODAL ══ */}
            {showBillModal && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-[#0F172A] border border-slate-700 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden">
                        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-[#131C31]">
                            <h2 className="text-xl font-black text-white flex items-center gap-2"><FiUser className="text-indigo-400"/> Customer Details</h2>
                            <button onClick={() => setShowBillModal(false)} className="text-slate-400 hover:text-white p-2 transition-colors"><FiX size={22}/></button>
                        </div>
                        <form onSubmit={handleCheckout} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Customer Name *</label><input required type="text" placeholder="e.g. Rahul Sharma" value={customerForm.name} onChange={e => setCustomerForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-[#080C14] border border-slate-700 text-white p-3.5 rounded-xl outline-none focus:border-indigo-500 transition-all text-sm"/></div>
                                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Phone Number *</label><input required type="text" maxLength="10" placeholder="10-digit number" value={customerForm.phone} onChange={e => setCustomerForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))} className="w-full bg-[#080C14] border border-slate-700 text-white p-3.5 rounded-xl outline-none focus:border-indigo-500 transition-all text-sm"/></div>
                            </div>
                            <div className="space-y-1.5 relative">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">City *</label>
                                <input required type="text" placeholder="Start typing city…" value={customerForm.city} onChange={handleCityInput} className="w-full bg-[#080C14] border border-slate-700 text-white p-3.5 rounded-xl outline-none focus:border-indigo-500 transition-all text-sm"/>
                                {showCityDrop && filteredCities.length > 0 && (
                                    <ul className="absolute z-20 w-full bg-[#1e293b] border border-slate-700 mt-1 max-h-36 overflow-y-auto rounded-xl shadow-xl">
                                        {filteredCities.map(c => <li key={c} onClick={() => { setCustomerForm(f => ({ ...f, city: c })); setShowCityDrop(false); }} className="p-3 hover:bg-indigo-600 cursor-pointer text-sm font-medium transition-colors">{c}</li>)}
                                    </ul>
                                )}
                            </div>
                            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Address (Optional)</label><textarea rows="2" placeholder="Street, area…" value={customerForm.homeAddress} onChange={e => setCustomerForm(f => ({ ...f, homeAddress: e.target.value }))} className="w-full bg-[#080C14] border border-slate-700 text-white p-3.5 rounded-xl outline-none focus:border-indigo-500 transition-all resize-none text-sm"/></div>
                            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex justify-between items-center">
                                <div><p className="text-[10px] text-indigo-300 font-black uppercase tracking-wider">Total Payable</p><p className="text-2xl font-black text-white">Rs.{finalTotal.toFixed(2)}</p></div>
                                <div className="text-right text-xs text-slate-400"><p>{cartItemCount} items</p>{discountVal > 0 && <p className="text-emerald-400 font-bold">Saved Rs.{discountVal.toFixed(2)}</p>}</div>
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowBillModal(false)} className="flex-1 py-3.5 text-slate-400 font-bold hover:text-white hover:bg-slate-800 rounded-xl transition-all text-sm">Cancel</button>
                                <button type="submit" className="flex-[2] py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm"><FiPrinter size={15}/> Complete Sale & Print Bill</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══ INVOICE DETAIL MODAL ══ */}
            {selectedSale && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-[#0F172A] border border-slate-700 rounded-3xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-[#131C31]">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2"><FiFileText className="text-indigo-400"/> Invoice</h2>
                            <button onClick={() => setSelectedSale(null)} className="text-slate-400 hover:text-white p-2 transition-colors"><FiX size={22}/></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 bg-[#080C14]">
                            <div className="flex justify-between mb-6 pb-5 border-b border-slate-800">
                                <div><h2 className="text-xl font-black text-white">STYLESYNC RETAIL</h2><p className="text-xs text-indigo-400 mt-0.5 font-bold">{safeStr(selectedSale.invoiceId) || ('#' + safeStr(selectedSale._id).slice(-6).toUpperCase())}</p></div>
                                <div className="text-right text-xs text-slate-500"><p>{new Date(selectedSale.date || selectedSale.createdAt).toLocaleDateString()}</p><p>{new Date(selectedSale.date || selectedSale.createdAt).toLocaleTimeString()}</p></div>
                            </div>
                            <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-4 mb-5 flex justify-between">
                                <div><p className="text-[9px] text-slate-500 font-black uppercase tracking-wider mb-0.5">Billed To</p><p className="font-bold text-white">{safeStr(selectedSale.customerName, 'Walk-in')}</p><p className="text-xs text-slate-400">{safeStr(selectedSale.customerPhone, 'N/A')}</p></div>
                                {selectedSale.storeLocation && <div className="text-right"><p className="text-[9px] text-slate-500 font-black uppercase tracking-wider mb-0.5">City</p><p className="font-bold text-white text-sm">{selectedSale.storeLocation}</p></div>}
                            </div>
                            <table className="w-full text-sm mb-5">
                                <thead className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800"><tr><th className="pb-2 text-left">Item</th><th className="pb-2 text-center">Qty</th><th className="pb-2 text-right">Total</th></tr></thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {safeArr(selectedSale.items).map((item, i) => (
                                        <tr key={i}><td className="py-3 text-white font-medium">{item.name}</td><td className="py-3 text-center text-slate-400">{safeNum(item.quantity, 1)}</td><td className="py-3 text-right font-mono text-white">Rs.{(safeNum(item.price) * safeNum(item.quantity, 1)).toFixed(2)}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="border-t border-slate-800 pt-4 space-y-2">
                                <div className="flex justify-between text-sm text-slate-400"><span>Subtotal</span><span>Rs.{safeNum(selectedSale.subtotal || selectedSale.totalAmount).toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm text-emerald-400 font-bold"><span>Discount</span><span>-Rs.{safeNum(selectedSale.discount).toFixed(2)}</span></div>
                                <div className="flex justify-between text-xl font-black text-white pt-3 border-t border-slate-800"><span>Total</span><span className="text-indigo-400">Rs.{safeNum(selectedSale.totalAmount).toFixed(2)}</span></div>
                            </div>
                        </div>
                        <div className="p-4 bg-[#131C31] border-t border-slate-800 flex gap-3">
                            <button onClick={() => setSelectedSale(null)} className="flex-1 py-3 text-slate-400 font-bold hover:text-white bg-slate-800 rounded-xl transition-all text-sm">Close</button>
                            <button onClick={() => generateBillPDF(selectedSale)} className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm"><FiPrinter size={15}/> Download PDF</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffDashboard;