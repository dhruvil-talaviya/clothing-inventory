import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../App';
import {
    FiHome, FiSearch, FiShoppingCart, FiTrash2, FiLogOut,
    FiGrid, FiSettings, FiX, FiPackage, FiClock,
    FiFileText, FiUser, FiCheckCircle, FiEdit2,
    FiPlus, FiMinus, FiTag, FiCreditCard, FiAlertTriangle,
    FiEye, FiShield, FiLock, FiSave, FiPrinter, FiCalendar, FiStar,
    FiSmartphone, FiDollarSign, FiMail
} from 'react-icons/fi';
import { BiBarcodeReader } from 'react-icons/bi';

// ─── RAZORPAY CONFIG (set your key here) ─────────────────────────────────────
const RAZORPAY_KEY_ID = 'rzp_test_SQfxCbnImN5fbE';// ← paste your key_id here

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const INDIAN_CITIES = ["Mumbai","Delhi","Bangalore","Hyderabad","Ahmedabad","Chennai","Kolkata","Surat","Pune","Jaipur","Lucknow","Kanpur","Nagpur","Indore","Thane","Bhopal","Visakhapatnam","Patna","Vadodara","Ghaziabad","Ludhiana","Agra","Nashik","Rajkot","Varanasi","Srinagar","Aurangabad","Amritsar","Navi Mumbai","Allahabad","Ranchi","Coimbatore","Jabalpur","Gwalior","Vijayawada","Jodhpur","Madurai","Raipur","Kota","Guwahati","Chandigarh","Solapur","Mysore","Gurgaon"];

const CATEGORY_ORDER = ["All","Shirt","T-Shirt","Jeans","Trousers","Shoes","Jacket","Kurta","Saree","Watch","Accessories"];

const ALL_SIZES  = ['XS','S','M','L','XL','XXL'];
const GRADIENTS  = ['from-violet-500 to-indigo-600','from-rose-500 to-pink-600','from-amber-500 to-orange-600','from-teal-500 to-cyan-600','from-fuchsia-500 to-purple-600','from-lime-500 to-emerald-600'];

const PAYMENT_METHODS = [
    { id:'cash', label:'Cash',  icon:FiDollarSign, activeClass:'border-emerald-500 bg-emerald-500/10 text-emerald-400', dotClass:'bg-emerald-400' },
    { id:'upi',  label:'UPI',   icon:FiSmartphone, activeClass:'border-indigo-500  bg-indigo-500/10  text-indigo-400',  dotClass:'bg-indigo-400'  },
    { id:'card', label:'Card',  icon:FiCreditCard, activeClass:'border-violet-500  bg-violet-500/10  text-violet-400',  dotClass:'bg-violet-400'  },
];

// ─── SAFE HELPERS ─────────────────────────────────────────────────────────────
const safeNum = (v, fb=0)  => { const n=Number(v); return isNaN(n)?fb:n; };
const safeStr = (v, fb='') => (v==null?fb:String(v));
const safeArr = (v)        => (Array.isArray(v)?v:[]);

// ─── EVENT STATUS ─────────────────────────────────────────────────────────────
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
const fmtDate = (ds) => ds ? new Date(ds).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '--';

// ─── PRODUCT IMAGE FALLBACK ───────────────────────────────────────────────────
const getProductImage = (name='') => {
    const n = name.toLowerCase();
    if (n.includes('t-shirt')) return 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=80';
    if (n.includes('shirt'))   return 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=400&q=80';
    if (n.includes('jean'))    return 'https://images.unsplash.com/photo-1542272617-08f08630329e?auto=format&fit=crop&w=400&q=80';
    if (n.includes('shoe'))    return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80';
    if (n.includes('watch'))   return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80';
    return 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=400&q=80';
};

// ─── PDF GENERATOR ────────────────────────────────────────────────────────────
const generateBillPDF = (sale) => {
    try {
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });

        const PW  = 210;
        const PH  = 297;
        const ML  = 18;
        const MR  = 18;
        const CW  = PW - ML - MR;
        const RX  = PW - MR;

        const LH = 5.5;

        const invId    = safeStr(sale.invoiceId) || ('#' + safeStr(sale._id).slice(-6).toUpperCase());
        const saleDate = new Date(sale.date || Date.now());
        const dateStr  = saleDate.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
        const timeStr  = saleDate.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
        const payLabel = sale.paymentMethod === 'upi' ? 'UPI'
                       : sale.paymentMethod === 'card' ? 'Card' : 'Cash';
        const subtotal = safeNum(sale.subtotal ?? sale.totalAmount);
        const discount = safeNum(sale.discount);
        const total    = safeNum(sale.totalAmount);

        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, PW, 48, 'F');
        doc.setFillColor(99, 102, 241);
        doc.rect(0, 46, PW, 2, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.text('STYLESYNC', ML, 20);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('RETAIL & FASHION', ML, 28);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text('TAX INVOICE', RX, 14, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(129, 140, 248);
        doc.text(invId, RX, 22, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(dateStr, RX, 30, { align: 'right' });
        doc.text(timeStr, RX, 37, { align: 'right' });

        const cardY  = 54;
        const cardH  = 36;
        const cardW  = (CW - 6) / 2;
        const c1x    = ML;
        const c2x    = ML + cardW + 6;
        const cPad   = 5;

        doc.setFillColor(246, 248, 251);
        doc.setDrawColor(218, 224, 232);
        doc.setLineWidth(0.25);
        doc.roundedRect(c1x, cardY, cardW, cardH, 2, 2, 'FD');
        doc.roundedRect(c2x, cardY, cardW, cardH, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(99, 102, 241);
        doc.text('BILLED TO', c1x + cPad, cardY + 8);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        const cName = doc.splitTextToSize(safeStr(sale.customerName, 'Walk-in Customer'), cardW - cPad*2)[0];
        doc.text(cName, c1x + cPad, cardY + 16);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text('Ph: ' + safeStr(sale.customerPhone, 'N/A'), c1x + cPad, cardY + 23);
        if (sale.customerAddress) {
            const addr = doc.splitTextToSize(safeStr(sale.customerAddress), cardW - cPad*2)[0];
            doc.text(addr, c1x + cPad, cardY + 30);
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(99, 102, 241);
        doc.text('SALE INFO', c2x + cPad, cardY + 8);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        const sName = doc.splitTextToSize(safeStr(sale.staffName || sale.soldBy, 'Staff'), cardW - cPad*2)[0];
        doc.text(sName, c2x + cPad, cardY + 16);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        if (sale.storeLocation) {
            doc.text('City: ' + safeStr(sale.storeLocation), c2x + cPad, cardY + 23);
            doc.text('Payment: ' + payLabel, c2x + cPad, cardY + 30);
        } else {
            doc.text('Payment: ' + payLabel, c2x + cPad, cardY + 23);
        }

        const tableY = cardY + cardH + 8;

        autoTable(doc, {
            startY: tableY,
            head: [['ITEM DESCRIPTION', 'QTY', 'UNIT PRICE', 'TOTAL']],
            body: safeArr(sale.items).map(item => {
                const qty   = safeNum(item.quantity, 1);
                const price = safeNum(item.price);
                return [
                    safeStr(item.name),
                    String(qty),
                    'Rs.' + price.toFixed(2),
                    'Rs.' + (price * qty).toFixed(2),
                ];
            }),
            theme: 'grid',
            headStyles: {
                fillColor: [15, 23, 42],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 7,
                halign: 'left',
                cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
            },
            bodyStyles: {
                fontSize: 8,
                cellPadding: { top: 4.5, bottom: 4.5, left: 4, right: 4 },
                textColor: [30, 30, 30],
                lineColor: [220, 226, 234],
                lineWidth: 0.2,
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                0: { cellWidth: 'auto', halign: 'left' },
                1: { cellWidth: 16,     halign: 'center' },
                2: { cellWidth: 32,     halign: 'right' },
                3: { cellWidth: 34,     halign: 'right', fontStyle: 'bold' },
            },
            margin: { left: ML, right: MR },
            tableLineColor: [218, 224, 232],
            tableLineWidth: 0.25,
        });

        const totY = (doc.lastAutoTable?.finalY ?? tableY) + 6;
        const ROW = 9;

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(218, 224, 232);
        doc.setLineWidth(0.25);
        doc.rect(ML, totY, CW, ROW, 'FD');

        const row1Base = totY + ROW - 2.5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Subtotal', ML + 5, row1Base);
        doc.setTextColor(30, 30, 30);
        doc.text('Rs.' + subtotal.toFixed(2), RX - 5, row1Base, { align: 'right' });

        doc.setFillColor(240, 253, 244);
        doc.setDrawColor(218, 224, 232);
        doc.rect(ML, totY + ROW, CW, ROW, 'FD');

        const row2Base = totY + ROW * 2 - 2.5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Discount', ML + 5, row2Base);
        doc.setTextColor(22, 163, 74);
        doc.text('- Rs.' + discount.toFixed(2), RX - 5, row2Base, { align: 'right' });

        const totRowH = 13;
        doc.setFillColor(15, 23, 42);
        doc.rect(ML, totY + ROW * 2, CW, totRowH, 'F');

        const row3Base = totY + ROW * 2 + totRowH - 3.5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text('TOTAL PAYABLE', ML + 5, row3Base);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(129, 140, 248);
        doc.text('Rs.' + total.toFixed(2), RX - 5, row3Base, { align: 'right' });

        const afterTotY = totY + ROW * 2 + totRowH + 8;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        const badgeTxt = 'Paid via ' + payLabel;
        const bTxtW    = doc.getTextWidth(badgeTxt);
        const bW       = bTxtW + 12;
        const bH       = 7;
        const bX       = RX - bW;
        const bY       = afterTotY;
        doc.setFillColor(237, 233, 254);
        doc.setDrawColor(196, 181, 253);
        doc.setLineWidth(0.3);
        doc.roundedRect(bX, bY, bW, bH, 1.5, 1.5, 'FD');
        doc.setTextColor(109, 40, 217);
        doc.text(badgeTxt, bX + bW / 2, bY + bH - 2, { align: 'center' });

        const footerY = afterTotY + bH + 8;
        doc.setDrawColor(218, 224, 232);
        doc.setLineWidth(0.4);
        doc.line(ML, footerY, RX, footerY);

        const f1 = footerY + 8;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(99, 102, 241);
        doc.text('Thank you for shopping with StyleSync!', PW / 2, f1, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Returns & exchanges accepted within 7 days with this invoice.', PW / 2, f1 + 7, { align: 'center' });
        doc.text('www.stylesync.in  |  support@stylesync.in', PW / 2, f1 + 13, { align: 'center' });

        const filename = 'StyleSync_' + invId + '_' + safeStr(sale.customerName, 'Customer').replace(/[^a-z0-9]/gi, '_') + '.pdf';
        doc.save(filename);

    } catch (err) {
        console.error('PDF error:', err);
        alert('Sale saved! PDF failed: ' + err.message);
    }
};

// ─── BARCODE SCANNER HOOK ─────────────────────────────────────────────────────
const useBarcodeScanner = (onScan, enabled) => {
    const bufRef=useRef(''), tRef=useRef(0), cbRef=useRef(onScan);
    useEffect(()=>{ cbRef.current=onScan; },[onScan]);
    useEffect(()=>{
        if (!enabled) return;
        const handler=(e)=>{
            const tag=document.activeElement?.tagName?.toUpperCase();
            if (['INPUT','TEXTAREA','SELECT'].includes(tag)) return;
            const now=Date.now();
            if (now-tRef.current>300 && bufRef.current) bufRef.current='';
            tRef.current=now;
            if (e.key==='Enter'){ const sku=bufRef.current.trim(); if(sku.length>=4) cbRef.current(sku); bufRef.current=''; return; }
            if (e.key.length===1) bufRef.current+=e.key;
        };
        window.addEventListener('keydown',handler);
        return ()=>window.removeEventListener('keydown',handler);
    },[enabled]);
};

// ─── SIZE MODAL ───────────────────────────────────────────────────────────────
const SizeModal = ({ product, onConfirm, onClose }) => {
    if (!product) return null;
    const variants=safeArr(product.variants), hasVariants=variants.length>0;
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[250] flex items-center justify-center p-4"
            onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
            <div className="bg-[#0F172A] border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="p-5 border-b border-slate-800 bg-[#131C31] flex items-center gap-4">
                    <img src={safeStr(product.image)||getProductImage(product.name)} alt={product.name}
                        onError={e=>{ e.target.onerror=null; e.target.src=getProductImage(product.name); }}
                        className="w-16 h-16 rounded-2xl object-cover border border-slate-700 shrink-0"/>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">
                            {hasVariants?'Select Size to Add':'Confirm Add to Cart'}
                        </p>
                        <h3 className="text-base font-black text-white leading-tight line-clamp-2">{product.name}</h3>
                        {product.color && <p className="text-xs text-slate-400 mt-0.5">{product.color}</p>}
                        <p className="text-emerald-400 font-black text-lg mt-0.5">Rs.{safeNum(product.price).toFixed(2)}</p>
                    </div>
                    <button onClick={onClose} className="shrink-0 w-8 h-8 bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 rounded-xl flex items-center justify-center transition-all">
                        <FiX size={15}/>
                    </button>
                </div>
                <div className="p-5">
                    {hasVariants ? (
                        <>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Tap a size to instantly add to cart</p>
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                {ALL_SIZES.map(size=>{
                                    const v=variants.find(x=>x.size===size), stock=safeNum(v?.stock), exists=!!v, inStock=exists&&stock>0, isLow=inStock&&stock<=5;
                                    return (
                                        <button key={size} disabled={!inStock} onClick={()=>onConfirm(product,size,v)}
                                            className={`flex flex-col items-center justify-center py-5 rounded-2xl border font-black text-2xl transition-all duration-150
                                                ${!exists?'opacity-20 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-700'
                                                :!inStock?'opacity-40 cursor-not-allowed bg-red-950/30 border-red-800/30 text-red-500'
                                                :'bg-[#080C14] border-slate-700 hover:border-indigo-500 hover:bg-indigo-600/15 text-white cursor-pointer active:scale-95'}`}>
                                            <span>{size}</span>
                                            {exists&&<span className={`text-[9px] font-black mt-1.5 ${!inStock?'text-red-500':isLow?'text-orange-400':'text-emerald-400'}`}>
                                                {!inStock?'OUT':isLow?`${stock} left!`:`${stock} in stock`}
                                            </span>}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="flex gap-1.5 flex-wrap pt-3 border-t border-slate-800">
                                {variants.map(v=>(
                                    <span key={v.size} className={`text-[10px] font-black px-2 py-1 rounded-lg border
                                        ${safeNum(v.stock)<=0?'bg-red-500/10 text-red-400 border-red-500/20'
                                        :safeNum(v.stock)<=5?'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                        :'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                        {v.size}: {v.stock}
                                    </span>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-[#080C14] rounded-2xl border border-slate-800">
                                <div>
                                    <p className="text-xs text-slate-500 font-bold mb-0.5">Available Stock</p>
                                    <p className={`text-3xl font-black ${safeNum(product.stock)<=0?'text-red-400':'text-white'}`}>{safeNum(product.stock)} units</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 font-bold mb-0.5">Price</p>
                                    <p className="text-2xl font-black text-emerald-400">Rs.{safeNum(product.price).toFixed(2)}</p>
                                </div>
                            </div>
                            <button disabled={safeNum(product.stock)<=0} onClick={()=>onConfirm(product,'OS',null)}
                                className={`w-full py-4 rounded-xl font-black text-white text-lg transition-all
                                    ${safeNum(product.stock)<=0?'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    :'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 active:scale-95'}`}>
                                {safeNum(product.stock)<=0?'Out of Stock':`Add to Cart  Rs.${safeNum(product.price).toFixed(2)}`}
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
    const minOrder=safeNum(offer.minOrder||offer.minOrderValue), isEligible=subtotal>=minOrder;
    const val=safeNum(offer.value||offer.discountPercent), type=safeStr(offer.type).toLowerCase();
    const label=type==='percentage'?`${val}% off`:`Rs.${val} off`;
    return (
        <div onClick={()=>isEligible&&onSelect(offer)}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all select-none
                ${!isEligible?'opacity-50 cursor-not-allowed border-slate-800 bg-slate-900/40'
                :isSelected?'cursor-pointer border-indigo-500 bg-indigo-500/10'
                :'cursor-pointer border-slate-700 bg-[#080C14] hover:border-indigo-400/50'}`}>
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isEligible?(isSelected?'bg-indigo-500 text-white':'bg-slate-800 text-indigo-400'):'bg-slate-800 text-slate-600'}`}>
                    {isEligible?<FiTag size={13}/>:<FiLock size={13}/>}
                </div>
                <div>
                    <p className={`text-sm font-black ${isEligible?'text-white':'text-slate-500'}`}>{offer.code}</p>
                    <p className={`text-[10px] font-bold ${isEligible?'text-emerald-400':'text-slate-600'}`}>{label}</p>
                </div>
            </div>
            <div className="text-right shrink-0 ml-2">
                {isEligible ? (
                    <span className={`text-[10px] font-black px-2 py-1 rounded-md ${isSelected?'bg-indigo-500 text-white':'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                        {isSelected?'✓ Applied':'Eligible'}
                    </span>
                ) : (
                    <div>
                        <span className="text-[10px] font-black px-2 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 block">Locked</span>
                        <span className="text-[9px] text-slate-500 block mt-0.5">Add Rs.{(minOrder-subtotal).toFixed(2)} more</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── NAV ICON ─────────────────────────────────────────────────────────────────
const NavIcon = ({ icon, active, onClick, label, badge }) => (
    <div onClick={onClick} className={`relative flex flex-col items-center justify-center w-full py-3 cursor-pointer group transition-all duration-300 ${active?'text-indigo-400':'text-slate-500 hover:text-slate-300'}`}>
        <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-indigo-500 rounded-r-full transition-all duration-300 ${active?'opacity-100 scale-100':'opacity-0 scale-0'}`}/>
        <div className={`relative p-2.5 rounded-2xl transition-all duration-300 ${active?'bg-indigo-500/10':'group-hover:bg-slate-800'}`}>
            {icon}
            {badge>0&&<span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full text-[8px] font-black text-white flex items-center justify-center animate-pulse">{badge}</span>}
        </div>
        <span className={`text-[9px] font-bold mt-1 tracking-wider transition-all duration-300 ${active?'opacity-100':'opacity-0 group-hover:opacity-100'}`}>{label}</span>
    </div>
);

const StatCard = ({ title, value, icon, color }) => {
    const cls={indigo:'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',emerald:'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',blue:'bg-blue-500/10 text-blue-400 border-blue-500/20'};
    return (
        <div className={`p-5 rounded-2xl border ${cls[color]} flex items-center gap-4`}>
            <div className="p-3 rounded-xl bg-[#0F172A] text-xl">{icon}</div>
            <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{title}</p><h3 className="text-2xl font-black text-white">{value}</h3></div>
        </div>
    );
};

const StaffEventBadge = ({ status }) => {
    const map={Upcoming:{cls:'bg-blue-500/10 text-blue-400 border-blue-500/30',dot:'bg-blue-400',pulse:false},Active:{cls:'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',dot:'bg-emerald-400',pulse:true},Completed:{cls:'bg-slate-700/50 text-slate-400 border-slate-600',dot:'bg-slate-500',pulse:false}};
    const c=map[status]||map.Completed;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${c.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${c.pulse?'animate-pulse':''}`}/>{status}
        </span>
    );
};

const DarkScrollStyle = () => (
    <style>{`
        .ds::-webkit-scrollbar { width: 4px; height: 4px; }
        .ds::-webkit-scrollbar-track { background: transparent; }
        .ds::-webkit-scrollbar-thumb { background: #334155; border-radius: 99px; }
        .ds::-webkit-scrollbar-thumb:hover { background: #475569; }
        * { scrollbar-width: thin; scrollbar-color: #334155 transparent; }
    `}</style>
);

// ══════════════════════════════════════════════════════════════════════════════
// MAIN STAFF DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
const StaffDashboard = () => {
 

    const navigate = useNavigate();
    const { setStatus, setAuthUser, setAccessToken } = useAuth();

    const handleLogout = useCallback(async () => {
        try {
            await axios.post('http://localhost:5001/api/auth/logout', {}, { withCredentials: true });
        } catch { /* server down — still log out locally */ }
        setAccessToken(null);
        setAuthUser(null);
        setStatus('invalid');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
        navigate('/', { replace: true });
    }, [navigate, setStatus, setAuthUser, setAccessToken]);

    const [user]        = useState(()=>{ try{ return JSON.parse(localStorage.getItem('user'))||null; }catch{ return null; } });
    const [currentUser, setCurrentUser] = useState(()=>{ try{ return JSON.parse(localStorage.getItem('user'))||user; }catch{ return user; } });
    const [view, setView] = useState('pos');

    const [products,     setProducts]     = useState([]);
    const [activeOffers, setActiveOffers] = useState([]);
    const [events,       setEvents]       = useState([]);
    const [stats,        setStats]        = useState({ revenue:0, count:0 });
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
    const [invoiceEmail,  setInvoiceEmail]  = useState('');
    const [emailSending,  setEmailSending]  = useState(false);
    const [emailStatus,   setEmailStatus]   = useState(null);
    const [razorpayLoading, setRazorpayLoading] = useState(false);

    const [showBillModal,  setShowBillModal]  = useState(false);
    const [customerForm,   setCustomerForm]   = useState({ name:'', phone:'', email:'', homeAddress:'', city:'' });
    const [showCityDrop,   setShowCityDrop]   = useState(false);
    const [filteredCities, setFilteredCities] = useState([]);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash');

    const [eventFilter, setEventFilter] = useState('All');

    const [settingTab,     setSettingTab]     = useState('profile');
    const [profileForm,    setProfileForm]    = useState(()=>{
        const f=(()=>{ try{ return JSON.parse(localStorage.getItem('user'))||{}; }catch{ return {}; } })();
        return { name:safeStr(f.name||user?.name), phone:safeStr(f.phone||user?.phone), address:safeStr(f.address||user?.address), email:safeStr(f.email||user?.email), city:safeStr(f.city||user?.city) };
    });
    const [photoPreview,   setPhotoPreview]   = useState(safeStr(user?.photo)||null);
    const [photoFile,      setPhotoFile]      = useState(null);
    const [settingLoading, setSettingLoading] = useState(false);
    const [settingMsg,     setSettingMsg]     = useState(null);
    const [pwForm,         setPwForm]         = useState({ currentPassword:'', newPassword:'', confirmPassword:'' });
    const [otpStep,        setOtpStep]        = useState('idle');
    const [otpCode,        setOtpCode]        = useState('');
    const [otpInput,       setOtpInput]       = useState('');
    const [otpTimer,       setOtpTimer]       = useState(0);
    const otpTimerRef   = useRef(null);
    const photoInputRef = useRef(null);

    const [toast,       setToast]       = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [shiftStart]                  = useState(new Date());

    const notify = useCallback((text, type='success')=>{ setToast({text,type}); setTimeout(()=>setToast(null),3000); },[]);

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
    
        // ✅ Products
        if (pR.status === 'fulfilled') {
            setProducts(
                safeArr(pR.value.data).filter(p => p.isAvailable !== false)
            );
        }
    
        // ✅ Stats
        if (sR.status === 'fulfilled') {
            setStats({
                revenue: safeNum(sR.value.data?.revenue),
                count: safeNum(sR.value.data?.count),
            });
        }
    
        // ✅ History
        if (hR.status === 'fulfilled') {
            setSalesHistory(safeArr(hR.value.data));
        }
    
        // 🔥 ✅ UPDATED COUPON FILTER (EXPIRED HIDE FIX)
        // ✅ FIX — replaces the old one-liner
if (oR.status==='fulfilled') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setActiveOffers(
        safeArr(oR.value.data).filter(o =>
            o.isActive &&
            (!o.validUntil || new Date(o.validUntil) >= today)
        )
    );
}
    
        // ✅ Events
        if (eR.status === 'fulfilled') {
            setEvents(safeArr(eR.value.data));
        }
    
    }, [user]);
    useEffect(()=>{
        const clock=setInterval(()=>setCurrentTime(new Date()),1000);
        fetchData();
        const poll=setInterval(fetchData,15000);
        return ()=>{ clearInterval(clock); clearInterval(poll); };
    },[fetchData]);

    const eventsWithLiveStatus = useMemo(()=>events.map(e=>({...e,_liveStatus:computeEventStatus(e)})),[events]);
    const activeEventCount     = useMemo(()=>eventsWithLiveStatus.filter(e=>e._liveStatus==='Active').length,[eventsWithLiveStatus]);

    const availableCategories = useMemo(()=>{
        const presentCats = new Set(products.map(p=>safeStr(p.category)).filter(Boolean));
        return CATEGORY_ORDER.filter(c => c==='All' || presentCats.has(c));
    },[products]);

    useEffect(()=>{
        if (category!=='All' && !availableCategories.includes(category)) setCategory('All');
    },[availableCategories, category]);

    const resolveScan = useCallback((sku)=>{
        const up=sku.toUpperCase().trim();
        for (const p of products){
            for (const v of safeArr(p.variants)){ if(safeStr(v.sku).toUpperCase()===up) return {product:p,size:v.size,variant:v}; }
            if(safeStr(p.sku).toUpperCase()===up) return {product:p,size:null,variant:null};
        }
        return null;
    },[products]);

    const addToCartWithSize = useCallback((product,size,variant)=>{
        const stockForSize=variant?safeNum(variant.stock):safeNum(product.stock);
        if(stockForSize<=0){ notify(`${product.name} (${size}) is out of stock!`,'error'); return; }
        const cartKey=`${product._id}_${size}`;
        setCart(prev=>{
            const existing=prev.find(x=>x._cartKey===cartKey);
            if(existing){
                if(existing.qty>=stockForSize){ notify('Maximum available stock reached!','error'); return prev; }
                return prev.map(x=>x._cartKey===cartKey?{...x,qty:x.qty+1}:x);
            }
            return [...prev,{...product,_cartKey:cartKey,_size:size,_sku:safeStr(variant?.sku||product.sku),_maxStock:stockForSize,productId:product._id,qty:1}];
        });
        notify(`Added: ${product.name}${size!=='OS'?` (${size})`:''}`);
        setSizeModal(null);
    },[notify]);

    const handleScan = useCallback((sku)=>{
        const r=resolveScan(sku);
        if(!r)         { setScanStatus({type:'error',msg:`No product found for SKU: ${sku}`}); }
        else if(r.size){ addToCartWithSize(r.product,r.size,r.variant); setScanStatus({type:'success',msg:`Added: ${r.product.name} (${r.size})`}); }
        else           { setSizeModal(r.product); setScanStatus({type:'success',msg:`Found: ${r.product.name} — select size`}); }
        setTimeout(()=>setScanStatus(null),2500);
    },[resolveScan,addToCartWithSize]);

    useBarcodeScanner(handleScan, scannerOn&&view==='pos');

    const openSizeModal = useCallback((product)=>{
        const variants=safeArr(product.variants), totalStk=safeNum(product.totalStock??product.stock);
        if(!variants.some(v=>safeNum(v.stock)>0)&&totalStk<=0){ notify('This product is out of stock!','error'); return; }
        setSizeModal(product);
    },[notify]);

    const updateQty = useCallback((cartKey,delta)=>{
        setCart(prev=>prev.map(item=>{
            if(item._cartKey!==cartKey) return item;
            const next=Math.max(1,item.qty+delta);
            if(delta>0&&next>(item._maxStock||9999)){ notify('Stock limit reached!','error'); return item; }
            return {...item,qty:next};
        }));
    },[notify]);

    const removeItem = useCallback((cartKey)=>setCart(prev=>prev.filter(x=>x._cartKey!==cartKey)),[]);

    const subtotal      = useMemo(()=>cart.reduce((a,i)=>a+safeNum(i.price)*safeNum(i.qty,1),0),[cart]);
    const discountVal   = useMemo(()=>{
        if(!selectedDiscount) return 0;
        const min=safeNum(selectedDiscount.minOrder||selectedDiscount.minOrderValue);
        if(subtotal<min) return 0;
        const val=safeNum(selectedDiscount.value||selectedDiscount.discountPercent), type=safeStr(selectedDiscount.type).toLowerCase();
        return type==='percentage'?(subtotal*val)/100:val;
    },[selectedDiscount,subtotal]);
    const finalTotal    = Math.max(0,subtotal-discountVal);
    const cartItemCount = useMemo(()=>cart.reduce((a,i)=>a+safeNum(i.qty,1),0),[cart]);
    const eligibleCount = useMemo(()=>activeOffers.filter(o=>subtotal>=safeNum(o.minOrder||o.minOrderValue)).length,[activeOffers,subtotal]);

    useEffect(()=>{
        if(!selectedDiscount) return;
        const min=safeNum(selectedDiscount.minOrder||selectedDiscount.minOrderValue);
        if(subtotal<min){ setSelectedDiscount(null); notify(`Coupon removed — cart below Rs.${min} minimum`,'error'); }
    },[subtotal]); // eslint-disable-line

    const filteredProducts = useMemo(()=>products.filter(p=>
        safeStr(p.name).toLowerCase().includes(search.toLowerCase())&&(category==='All'||p.category===category)
    ),[products,search,category]);

    const handleCityInput = (e)=>{
        const v=e.target.value;
        setCustomerForm(f=>({...f,city:v}));
        if(v){ setFilteredCities(INDIAN_CITIES.filter(c=>c.toLowerCase().startsWith(v.toLowerCase()))); setShowCityDrop(true); }
        else setShowCityDrop(false);
    };

    const handlePhotoChange = (e)=>{
        const file=e.target.files[0]; if(!file) return;
        if(file.size>3*1024*1024){ setSettingMsg({type:'error',text:'Photo must be under 3MB.'}); return; }
        setPhotoFile(file);
        const reader=new FileReader(); reader.onload=(ev)=>setPhotoPreview(ev.target.result); reader.readAsDataURL(file);
    };

    const handleSaveProfile = async (e)=>{
        e.preventDefault();
        const userId=user?.id||user?._id; if(!userId) return;
        setSettingLoading(true); setSettingMsg(null);
        try {
            const fp=new FormData();
            fp.append('name',profileForm.name); fp.append('phone',profileForm.phone);
            fp.append('address',profileForm.address); fp.append('email',profileForm.email); fp.append('city',profileForm.city);
            if(photoFile) fp.append('photo',photoFile);
            const res=await axios.put(`http://localhost:5001/api/staff/profile/${userId}`,fp,{headers:{'Content-Type':'multipart/form-data'}});
            const su=res.data?.user||{};
            const updated={...currentUser,...su,name:profileForm.name,phone:profileForm.phone,address:profileForm.address,email:profileForm.email,city:profileForm.city,...(su.photo?{photo:su.photo}:{})};
            localStorage.setItem('user',JSON.stringify(updated));
            setCurrentUser(updated); setProfileForm(f=>({...f,...updated}));
            if(su.photo) setPhotoPreview(su.photo);
            setPhotoFile(null); setSettingMsg({type:'success',text:'Profile updated successfully!'}); notify('Profile saved!');
        } catch(err){ setSettingMsg({type:'error',text:err.response?.data?.message||'Failed to update profile.'}); }
        finally{ setSettingLoading(false); }
    };

    const startOtpTimer = ()=>{
        setOtpTimer(60); clearInterval(otpTimerRef.current);
        otpTimerRef.current=setInterval(()=>{ setOtpTimer(t=>{ if(t<=1){ clearInterval(otpTimerRef.current); return 0; } return t-1; }); },1000);
    };

    const handleRequestOtp = async () => {
        if (!pwForm.currentPassword) { setSettingMsg({ type: 'error', text: 'Enter your current password first.' }); return; }
        if (pwForm.newPassword.length < 6) { setSettingMsg({ type: 'error', text: 'New password must be at least 6 characters.' }); return; }
        if (pwForm.newPassword !== pwForm.confirmPassword) { setSettingMsg({ type: 'error', text: 'New passwords do not match.' }); return; }
        setOtpStep('sending'); setSettingMsg(null);
        try {
            await axios.post('http://localhost:5001/api/auth/send-otp', { phone: currentUser.phone });
            setOtpStep('verify');
            startOtpTimer();
            notify('OTP sent to your registered mobile number!');
        } catch (err) {
            setOtpStep('idle');
            setSettingMsg({ type: 'error', text: err.response?.data?.message || 'Failed to send OTP.' });
        }
    };

    const handleVerifyOtpAndChange = async () => {
        const userId = user?.id || user?._id;
        setSettingLoading(true); setSettingMsg(null);
        try {
            await axios.post('http://localhost:5001/api/auth/verify-otp', {
                phone: currentUser.phone,
                otp: otpInput.trim(),
            });
            await axios.post('http://localhost:5001/api/staff/change-password', {
                userId,
                currentPassword: pwForm.currentPassword,
                newPassword: pwForm.newPassword,
            });
            setOtpStep('done');
            setSettingMsg({ type: 'success', text: 'Password changed successfully!' });
            setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setOtpInput('');
            clearInterval(otpTimerRef.current);
            notify('Password updated!');
        } catch (err) {
            setSettingMsg({ type: 'error', text: err.response?.data?.message || 'OTP verification or password change failed.' });
            setOtpStep('idle');
        } finally { setSettingLoading(false); }
    };

    const completeSale = async (saleData) => {
        const res = await axios.post('http://localhost:5001/api/staff/create-sale', saleData);
        const savedSale = { ...saleData, _id: res.data?.sale?._id||'', invoiceId: res.data?.sale?.invoiceId||'', date: new Date() };
        notify('Sale completed! Opening invoice...');
        setCart([]); setSelectedDiscount(null); setShowBillModal(false);
        setCustomerForm({ name:'', phone:'', email:'', homeAddress:'', city:'' });
        setSelectedPaymentMethod('cash');
        fetchData();
        setTimeout(() => { setSelectedSale(savedSale); setInvoiceEmail(saleData.customerEmail||''); }, 300);
    };

    const loadRazorpay = () => new Promise((resolve) => {
        if (window.Razorpay) { resolve(true); return; }
        const s = document.createElement('script');
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.onload  = () => resolve(true);
        s.onerror = () => resolve(false);
        document.body.appendChild(s);
    });

    const handleCheckout = async (e) => {
        e.preventDefault();
        const userId = user?.id || user?._id;
        if (!userId)                          { notify('Session expired. Please log in again.', 'error'); return; }
        if (cart.length === 0)                { notify('Cart is empty!', 'error'); return; }
        if (customerForm.phone.length !== 10) { notify('Enter a valid 10-digit phone number.', 'error'); return; }

        const saleData = {
            items: cart.map(i => ({
                productId: i._id || i.productId,
                name:      `${safeStr(i.name)}${i._size && i._size !== 'OS' ? ` (${i._size})` : ''}`,
                price:     safeNum(i.price),
                quantity:  safeNum(i.qty, 1),
                sku:       safeStr(i._sku),
                size:      safeStr(i._size),
            })),
            soldBy:          userId,
            staffId:         userId,
            staffName:       safeStr(currentUser?.name, 'Staff'),
            customerName:    customerForm.name,
            customerPhone:   customerForm.phone,
            customerEmail:   customerForm.email,
            customerAddress: customerForm.homeAddress,
            storeLocation:   customerForm.city,
            subtotal,
            discount:        discountVal,
            totalAmount:     finalTotal,
            paymentMethod:   selectedPaymentMethod,
        };

        if (selectedPaymentMethod === 'cash') {
            try { await completeSale(saleData); }
            catch (err) { notify(safeStr(err.response?.data?.message, 'Checkout failed.'), 'error'); }
            return;
        }

        try {
            setRazorpayLoading(true);
            const loaded = await loadRazorpay();
            if (!loaded) { notify('Razorpay failed to load. Check internet connection.', 'error'); setRazorpayLoading(false); return; }

            const amountPaise = Math.round(finalTotal * 100);
            const orderRes = await axios.post('http://localhost:5001/api/staff/create-razorpay-order', {
                amount: amountPaise,
                currency: 'INR',
                receipt: `rcpt_${Date.now()}`,
            });
            const { id: order_id, currency: orderCurrency, amount: orderAmount } = orderRes.data;

            const rzpOptions = {
                key:          RAZORPAY_KEY_ID,
                amount:       orderAmount,
                currency:     orderCurrency,
                order_id,
                name:         'StyleSync',
                description:  `Bill for ${safeStr(customerForm.name, 'Walk-in Customer')}`,
                prefill: {
                    name:    customerForm.name    || '',
                    email:   customerForm.email   || '',
                    contact: customerForm.phone   || '',
                },
                config: {
                    display: {
                        blocks: {
                            utib: { name: selectedPaymentMethod === 'upi' ? 'Pay via UPI' : 'Pay via Card', instruments: [
                                selectedPaymentMethod === 'upi' ? { method: 'upi' } : { method: 'card' }
                            ]},
                        },
                        sequence:    ['block.utib'],
                        preferences: { show_default_blocks: false },
                    },
                },
                theme:   { color: '#6366f1' },
                modal:   { ondismiss: () => { notify('Payment cancelled.', 'error'); setRazorpayLoading(false); } },
                handler: async (response) => {
                    try {
                        await axios.post('http://localhost:5001/api/staff/verify-razorpay-payment', {
                            razorpay_order_id:   response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature:  response.razorpay_signature,
                        });
                        saleData.razorpayPaymentId = response.razorpay_payment_id;
                        saleData.razorpayOrderId   = response.razorpay_order_id;
                        await completeSale(saleData);
                    } catch (verifyErr) {
                        notify('Payment done but verification failed. Contact admin.', 'error');
                        console.error('Razorpay verify error:', verifyErr);
                    } finally {
                        setRazorpayLoading(false);
                    }
                },
            };

            if (!RAZORPAY_KEY_ID || RAZORPAY_KEY_ID.includes('REPLACE')) {
                notify('Add your Razorpay Key ID to RAZORPAY_KEY_ID in StaffDashboard.jsx line 17', 'error');
                setRazorpayLoading(false);
                return;
            }
            const rzp = new window.Razorpay(rzpOptions);
            rzp.on('payment.failed', (response) => {
                notify('Payment failed: ' + response.error.description, 'error');
                setRazorpayLoading(false);
            });
            rzp.open();

        } catch (err) {
            console.error('Razorpay init error:', err);
            notify(safeStr(err.response?.data?.message, 'Could not initiate payment. Check console.'), 'error');
            setRazorpayLoading(false);
        }
    };

    const handleSendInvoiceEmail = async (sale, email) => {
        if (!email || !email.includes('@')) { notify('Enter a valid email address.', 'error'); return; }
        setEmailSending(true); setEmailStatus(null);
        try {
            await axios.post('http://localhost:5001/api/staff/send-invoice-email', { saleId: sale._id, email });
            setEmailStatus('sent');
            notify('Invoice emailed successfully!');
        } catch (err) {
            setEmailStatus('error');
            notify(err.response?.data?.message || 'Failed to send email.', 'error');
        } finally {
            setEmailSending(false);
        }
    };

    const shiftDuration = new Date(currentTime-shiftStart).toISOString().substr(11,8);

    const filteredStaffEvents = useMemo(()=>
        eventsWithLiveStatus.filter(e=>eventFilter==='All'||e._liveStatus===eventFilter)
            .sort((a,b)=>new Date(a.startDate||a.date)-new Date(b.startDate||b.date))
    ,[eventsWithLiveStatus,eventFilter]);

    // ══════════════════════════════════════════════════════════════════════════
    return (
        <div className="flex h-screen bg-[#080C14] font-sans text-slate-200 overflow-hidden">
            <DarkScrollStyle/>

            {/* TOAST */}
            {toast&&(
                <div className={`fixed top-4 right-4 z-[400] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 font-bold text-white border text-sm ${toast.type==='error'?'bg-red-900/95 border-red-700':'bg-[#1e293b] border-indigo-600'}`}>
                    {toast.type==='error'?<FiAlertTriangle className="text-red-400 shrink-0" size={15}/>:<FiCheckCircle className="text-emerald-400 shrink-0" size={15}/>}
                    {toast.text}
                </div>
            )}

            {sizeModal&&<SizeModal product={sizeModal} onConfirm={addToCartWithSize} onClose={()=>setSizeModal(null)}/>}

            {/* ── SIDEBAR ── */}
            <nav className="w-16 bg-[#0F172A] flex flex-col items-center py-6 border-r border-slate-800/60 z-20 shrink-0">
                <div className="mb-8 w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                    <FiPackage size={18} className="text-white"/>
                </div>
                <div className="flex-1 space-y-1 w-full">
                    <NavIcon icon={<FiHome size={18}/>}     active={view==='home'}     onClick={()=>setView('home')}     label="Home"/>
                    <NavIcon icon={<FiGrid size={18}/>}     active={view==='pos'}      onClick={()=>setView('pos')}      label="Billing"/>
                    <NavIcon icon={<FiFileText size={18}/>} active={view==='history'}  onClick={()=>setView('history')}  label="History"/>
                    <NavIcon icon={<FiCalendar size={18}/>} active={view==='events'}   onClick={()=>setView('events')}   label="Events" badge={activeEventCount}/>
                    <NavIcon icon={<FiSettings size={18}/>} active={view==='settings'} onClick={()=>setView('settings')} label="Settings"/>
                </div>
                {/* ✅ FIX: was onClick={()=>navigate('/')} — now calls handleLogout which clears localStorage first */}
                <button onClick={handleLogout} className="p-3 mt-auto text-slate-600 hover:text-red-400 transition-colors">
                    <FiLogOut size={18}/>
                </button>
            </nav>

            <main className="flex-1 flex flex-col overflow-hidden min-w-0">

                {/* ══ HOME ══ */}
                {view==='home'&&(
                    <div className="p-6 h-full overflow-y-auto ds">
                        <header className="flex justify-between items-start mb-6">
                            <div>
                                <h1 className="text-2xl font-black text-white">Retail Command Center</h1>
                                <p className="text-slate-500 text-sm mt-0.5">Operator: <span className="text-indigo-400 font-bold">{currentUser?.name}</span></p>
                            </div>
                            <div className="bg-[#0F172A] border border-slate-800 px-4 py-3 rounded-xl text-right">
                                <p className="text-2xl font-mono font-bold text-white">{currentTime.toLocaleTimeString()}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5 font-bold uppercase tracking-wider">Shift: {shiftDuration}</p>
                            </div>
                        </header>
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <StatCard title="Today's Revenue" value={`Rs.${safeNum(stats.revenue).toFixed(2)}`} icon={<FiCreditCard/>} color="indigo"/>
                            <StatCard title="Today's Sales"   value={safeNum(stats.count)}                     icon={<FiCheckCircle/>} color="emerald"/>
                            <StatCard title="Shift Timer"     value={shiftDuration}                            icon={<FiClock/>}       color="blue"/>
                        </div>
                        {eventsWithLiveStatus.filter(e=>e._liveStatus==='Active').length>0&&(
                            <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3">
                                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shrink-0"/>
                                <div className="flex-1 min-w-0">
                                    <p className="text-emerald-400 font-black text-sm">Active Events Running Now</p>
                                    <p className="text-emerald-300/70 text-xs mt-0.5 truncate">{eventsWithLiveStatus.filter(e=>e._liveStatus==='Active').map(e=>e.title).join(' • ')}</p>
                                </div>
                                <button onClick={()=>setView('events')} className="text-xs text-emerald-400 font-bold hover:underline shrink-0">View →</button>
                            </div>
                        )}
                        <div className="bg-[#0F172A] rounded-2xl border border-slate-800 p-6">
                            <h2 className="text-lg font-bold text-white mb-4">Recent Sales</h2>
                            {salesHistory.length===0?<p className="text-slate-500 text-sm">No sales recorded yet.</p>:(
                                <div className="space-y-2.5">
                                    {salesHistory.slice(0,5).map(sale=>{
                                        const qty=safeArr(sale.items).reduce((s,i)=>s+safeNum(i.quantity,1),0);
                                        return (
                                            <div key={sale._id} className="flex items-center justify-between p-3.5 bg-[#080C14] rounded-xl border border-slate-800 hover:border-indigo-500/40 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center shrink-0"><FiFileText size={14}/></div>
                                                    <div>
                                                        <p className="font-bold text-white text-sm">{safeStr(sale.customerName,'Walk-in')}</p>
                                                        <p className="text-xs text-slate-500">{new Date(sale.date||sale.createdAt).toLocaleTimeString()} • {qty} item{qty!==1?'s':''}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono font-bold text-emerald-400 text-sm">+Rs.{safeNum(sale.totalAmount).toFixed(2)}</span>
                                                    <button onClick={()=>setSelectedSale(sale)} className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"><FiEye size={13}/></button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ══ POS / BILLING ══ */}
                {view==='pos'&&(
                    <div className="flex h-full overflow-hidden">
                        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                            <div className="px-4 pt-3 pb-2 border-b border-slate-800 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-1.5 overflow-x-auto ds flex-1 min-w-0 pb-1">
                                        {availableCategories.map(cat=>(
                                            <button key={cat} onClick={()=>setCategory(cat)}
                                                className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border transition-all shrink-0
                                                    ${category===cat?'bg-indigo-600 text-white border-indigo-500':'bg-[#0F172A] text-slate-400 border-slate-800 hover:text-white hover:border-slate-600'}`}>
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="relative shrink-0">
                                        <FiSearch className="absolute left-3 top-2.5 text-slate-500" size={13}/>
                                        <input type="text" placeholder="Search…" onChange={e=>setSearch(e.target.value)}
                                            className="bg-[#0F172A] border border-slate-800 rounded-xl py-2 pl-8 pr-3 text-white w-44 text-xs outline-none focus:border-indigo-500 transition-all"/>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto ds p-4">
                                {filteredProducts.length===0?(
                                    <div className="h-64 flex flex-col items-center justify-center text-slate-600">
                                        <FiPackage size={36} className="mb-3 opacity-30"/>
                                        <p className="font-bold text-sm">No products found</p>
                                    </div>
                                ):(
                                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                                        {filteredProducts.map(p=>{
                                            const variants=safeArr(p.variants);
                                            const total=variants.length>0?variants.reduce((a,v)=>a+safeNum(v.stock),0):safeNum(p.totalStock??p.stock);
                                            const isOut=total<=0, isLow=!isOut&&total<=10;
                                            const availSz=variants.filter(v=>safeNum(v.stock)>0).map(v=>v.size);
                                            return (
                                                <div key={p._id} onClick={()=>!isOut&&openSizeModal(p)}
                                                    className={`group bg-[#0F172A] rounded-xl border overflow-hidden transition-all flex flex-col
                                                        ${isOut?'opacity-50 cursor-not-allowed border-slate-800':'border-slate-800 hover:border-indigo-500/60 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/10 cursor-pointer'}`}>
                                                    <div className="relative h-40 overflow-hidden bg-slate-900">
                                                        <img src={safeStr(p.image)||getProductImage(p.name)} alt={p.name}
                                                            onError={e=>{ e.target.onerror=null; e.target.src=getProductImage(p.name); }}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"/>
                                                        {!isOut&&<div className="absolute inset-0 bg-indigo-700/75 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <span className="bg-white text-indigo-700 font-black text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transform scale-75 group-hover:scale-100 transition-transform"><FiPlus size={12}/> Pick Size</span>
                                                        </div>}
                                                        {isLow&&!isOut&&<span className="absolute top-2 left-2 bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase">Low</span>}
                                                        {isOut&&<span className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase">Out</span>}
                                                    </div>
                                                    <div className="p-3 flex-1 flex flex-col">
                                                        <h4 className="font-bold text-white text-xs line-clamp-2 leading-tight mb-1.5">{p.name}</h4>
                                                        {availSz.length>0&&<div className="flex gap-1 flex-wrap mb-1.5">
                                                            {availSz.map(s=><span key={s} className="text-[8px] font-black px-1 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{s}</span>)}
                                                        </div>}
                                                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-800/50">
                                                            <span className="text-sm font-black text-white">Rs.{safeNum(p.price).toFixed(2)}</span>
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isOut?'bg-red-500/10 text-red-400':isLow?'bg-orange-500/10 text-orange-400':'bg-emerald-500/10 text-emerald-400'}`}>{total} units</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Cart sidebar ── */}
                        <div className="w-[340px] xl:w-[380px] shrink-0 bg-[#0F172A] border-l border-slate-800 flex flex-col">
                            <div className="p-4 border-b border-slate-800 shrink-0 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-base font-black text-white flex items-center gap-2"><FiShoppingCart className="text-indigo-400" size={16}/> Current Bill</h2>
                                    {cartItemCount>0&&<span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{cartItemCount} items</span>}
                                </div>
                                <div className="bg-[#080C14] rounded-xl border border-slate-800 p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <BiBarcodeReader className="text-indigo-400" size={12}/> Scanner
                                        </span>
                                        <button onClick={()=>setScannerOn(v=>!v)}
                                            className={`text-[9px] font-black px-2 py-0.5 rounded-md border transition-all ${scannerOn?'bg-emerald-500/10 text-emerald-400 border-emerald-500/20':'bg-slate-800 text-slate-500 border-slate-700'}`}>
                                            {scannerOn?'● ACTIVE':'○ OFF'}
                                        </button>
                                    </div>
                                    {scanStatus&&(
                                        <div className={`flex items-center gap-1.5 p-2 rounded-lg text-[10px] font-bold border ${scanStatus.type==='success'?'bg-emerald-500/10 text-emerald-400 border-emerald-500/20':'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                            {scanStatus.type==='success'?<FiCheckCircle size={10}/>:<FiAlertTriangle size={10}/>} {scanStatus.msg}
                                        </div>
                                    )}
                                    <form onSubmit={e=>{ e.preventDefault(); if(manualSku.trim()){ handleScan(manualSku.trim()); setManualSku(''); } }} className="flex gap-2">
                                        <input type="text" value={manualSku} onChange={e=>setManualSku(e.target.value)} placeholder="Type SKU or scan barcode…"
                                            className="flex-1 bg-[#0F172A] border border-slate-700 rounded-lg py-1.5 px-2.5 text-white text-xs font-mono outline-none focus:border-indigo-500 transition-all min-w-0"/>
                                        <button type="submit" className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shrink-0">Go</button>
                                    </form>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto ds p-3 space-y-2">
                                {cart.length===0?(
                                    <div className="h-full flex flex-col items-center justify-center text-slate-700 gap-2">
                                        <FiShoppingCart size={32} className="opacity-20"/>
                                        <p className="text-xs font-bold text-slate-600">Cart is empty</p>
                                        <p className="text-[10px] text-slate-700">Click a product to pick its size</p>
                                    </div>
                                ):cart.map(item=>(
                                    <div key={item._cartKey} className="flex items-center gap-2.5 p-2.5 bg-[#080C14] rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                                        <img src={safeStr(item.image)||getProductImage(item.name)} alt={item.name}
                                            onError={e=>{ e.target.onerror=null; e.target.src=getProductImage(item.name); }}
                                            className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-700"/>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-white truncate">{item.name}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[9px] text-slate-500">Rs.{safeNum(item.price).toFixed(2)}</span>
                                                {item._size&&item._size!=='OS'&&<span className="text-[8px] font-black bg-indigo-500/15 text-indigo-400 px-1 py-0.5 rounded border border-indigo-500/20">{item._size}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-0.5 bg-[#0F172A] border border-slate-700 rounded-lg p-0.5 shrink-0">
                                            <button onClick={()=>updateQty(item._cartKey,-1)} className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-all"><FiMinus size={10}/></button>
                                            <span className="text-xs font-black text-white w-5 text-center">{item.qty}</span>
                                            <button onClick={()=>updateQty(item._cartKey, 1)} className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-all"><FiPlus  size={10}/></button>
                                        </div>
                                        <button onClick={()=>removeItem(item._cartKey)} className="text-slate-700 hover:text-red-400 transition-colors p-1 shrink-0"><FiTrash2 size={13}/></button>
                                    </div>
                                ))}
                            </div>

                            <div className="p-3 border-t border-slate-800 space-y-3 shrink-0">
                                <div>
                                    <button onClick={()=>setShowCoupons(v=>!v)} className="w-full flex items-center justify-between group mb-1.5">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <FiTag className="text-indigo-400" size={11}/> Apply Coupon
                                            {activeOffers.length>0&&<span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black ${eligibleCount>0?'bg-emerald-500/20 text-emerald-400':'bg-slate-800 text-slate-500'}`}>{eligibleCount}/{activeOffers.length} eligible</span>}
                                        </span>
                                        <span className="text-[10px] text-slate-600 group-hover:text-slate-400 transition-colors">{showCoupons?'▲':'▼'}</span>
                                    </button>
                                    {selectedDiscount&&!showCoupons&&(
                                        <div className="flex items-center justify-between p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 mb-1.5">
                                            <div className="flex items-center gap-1.5"><FiCheckCircle className="text-indigo-400" size={11}/><span className="text-xs font-black text-white">{selectedDiscount.code}</span><span className="text-xs text-emerald-400 font-bold">-Rs.{discountVal.toFixed(2)}</span></div>
                                            <button onClick={()=>setSelectedDiscount(null)} className="text-slate-500 hover:text-red-400 transition-colors"><FiX size={11}/></button>
                                        </div>
                                    )}
                                    {showCoupons&&(
                                        <div className="space-y-1.5 max-h-40 overflow-y-auto ds pr-0.5">
                                            {activeOffers.length===0?<p className="text-xs text-slate-600 text-center py-3">No active coupons.</p>
                                              :[...activeOffers].sort((a,b)=>{ const aOk=subtotal>=safeNum(a.minOrder||a.minOrderValue); const bOk=subtotal>=safeNum(b.minOrder||b.minOrderValue); return bOk-aOk; })
                                                .map(offer=><CouponRow key={offer._id} offer={offer} subtotal={subtotal} isSelected={selectedDiscount?._id===offer._id} onSelect={o=>{ setSelectedDiscount(p=>p?._id===o._id?null:o); setShowCoupons(false); }}/>)
                                            }
                                        </div>
                                    )}
                                </div>
                                <div className="bg-[#080C14] border border-slate-800 rounded-xl p-3 space-y-1.5">
                                    <div className="flex justify-between text-xs text-slate-400"><span>Subtotal</span><span className="font-mono text-slate-200">Rs.{subtotal.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-xs text-emerald-400"><span>Discount</span><span className="font-mono">-Rs.{discountVal.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-lg font-black text-white pt-1.5 border-t border-slate-800"><span>Total</span><span className="text-indigo-400">Rs.{finalTotal.toFixed(2)}</span></div>
                                </div>
                                <button onClick={()=>{ if(cart.length>0) setShowBillModal(true); }} disabled={cart.length===0}
                                    className={`w-full py-3 rounded-xl font-black text-white flex items-center justify-center gap-2 transition-all text-xs ${cart.length>0?'bg-indigo-600 hover:bg-indigo-500 active:scale-95':'bg-slate-800 text-slate-500 cursor-not-allowed'}`}>
                                    <FiCreditCard size={14}/> Proceed to Checkout
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══ HISTORY ══ */}
                {view==='history'&&(
                    <div className="p-6 h-full overflow-y-auto ds">
                        <div className="flex justify-between items-center mb-6">
                            <div><h2 className="text-2xl font-black text-white">Sales History</h2><p className="text-slate-500 text-sm mt-0.5">All your past transactions</p></div>
                            <div className="relative"><FiSearch className="absolute left-3 top-2.5 text-slate-500" size={13}/><input type="text" placeholder="Search invoice, name, phone…" onChange={e=>setHistorySearch(e.target.value)} className="bg-[#0F172A] border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-white w-72 text-sm outline-none focus:border-indigo-500 transition-all"/></div>
                        </div>
                        <div className="bg-[#0F172A] rounded-2xl border border-slate-800 overflow-hidden">
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="bg-[#131C31] text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800">
                                    <tr>{['Invoice','Customer','Items','Amount','Date',''].map(h=><th key={h} className="p-4">{h}</th>)}</tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {salesHistory.filter(h=>{ const q=historySearch.toLowerCase(); return safeStr(h.invoiceId||h._id).toLowerCase().includes(q)||safeStr(h.customerName).toLowerCase().includes(q)||safeStr(h.customerPhone).includes(q); })
                                        .map(s=>{
                                            const qty=safeArr(s.items).reduce((a,i)=>a+safeNum(i.quantity,1),0);
                                            return (
                                                <tr key={s._id} className="hover:bg-slate-800/30 transition-colors">
                                                    <td className="p-4 font-mono text-indigo-400 font-bold text-xs">{safeStr(s.invoiceId)||('#'+safeStr(s._id).slice(-6).toUpperCase())}</td>
                                                    <td className="p-4"><p className="font-bold text-white text-sm">{safeStr(s.customerName,'Walk-in')}</p><p className="text-xs text-slate-500">{safeStr(s.customerPhone,'N/A')}</p></td>
                                                    <td className="p-4"><span className="bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full text-xs font-bold">{qty} units</span></td>
                                                    <td className="p-4 font-black text-emerald-400 text-sm">Rs.{safeNum(s.totalAmount).toFixed(2)}</td>
                                                    <td className="p-4 text-slate-400 text-xs">{new Date(s.date||s.createdAt).toLocaleString([],{dateStyle:'medium',timeStyle:'short'})}</td>
                                                    <td className="p-4 text-right"><button onClick={()=>setSelectedSale(s)} className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all"><FiEye size={13}/></button></td>
                                                </tr>
                                            );
                                        })}
                                    {salesHistory.length===0&&<tr><td colSpan="6" className="p-10 text-center text-slate-500 text-sm">No sales history yet.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ══ EVENTS ══ */}
                {view==='events'&&(
                    <div className="p-6 h-full overflow-y-auto ds">
                        <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-6">
                            <div><h1 className="text-2xl font-black text-white flex items-center gap-2"><FiStar className="text-yellow-400" size={20}/> Events & Promotions</h1><p className="text-slate-500 text-sm mt-0.5">Store campaigns — view only</p></div>
                            <div className="flex gap-1 bg-[#0F172A] p-1 rounded-xl border border-slate-800">
                                {['All','Active','Upcoming','Completed'].map(f=>{
                                    const count=f==='All'?eventsWithLiveStatus.length:eventsWithLiveStatus.filter(e=>e._liveStatus===f).length;
                                    return (
                                        <button key={f} onClick={()=>setEventFilter(f)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${eventFilter===f?'bg-indigo-600 text-white':'text-slate-400 hover:text-white'}`}>
                                            {f}{f==='Active'&&count>0&&<span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"/>}<span className="opacity-60 text-[10px]">{count}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </header>
                        {filteredStaffEvents.length===0?(
                            <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-12 flex flex-col items-center text-slate-500">
                                <FiCalendar size={32} className="mb-3"/><p className="text-base font-bold text-white">No Events Found</p>
                                <p className="text-sm text-slate-500 mt-1">{eventFilter!=='All'?`No ${eventFilter.toLowerCase()} events right now.`:'Admin has not scheduled any events yet.'}</p>
                            </div>
                        ):(
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {filteredStaffEvents.map((ev,i)=>{
                                    const status=ev._liveStatus, isNow=status==='Active';
                                    const grad=GRADIENTS[ev.title?.charCodeAt(0)%GRADIENTS.length]||GRADIENTS[0];
                                    const start=ev.startDate?new Date(ev.startDate):(ev.date?new Date(ev.date):null);
                                    const day=start?start.toLocaleDateString('en-IN',{day:'2-digit'}):'--';
                                    const month=start?start.toLocaleDateString('en-US',{month:'short'}).toUpperCase():'--';
                                    const year=start?start.getFullYear():'';
                                    return (
                                        <div key={ev._id||i} className={`bg-[#0F172A] rounded-2xl border overflow-hidden transition-all ${isNow?'border-emerald-500/50':'border-slate-800 hover:border-indigo-500/40'}`}>
                                            <div className={`bg-gradient-to-r ${grad} px-5 py-3.5 flex items-center justify-between`}>
                                                <div><p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">{month} {year}</p><p className="text-white text-3xl font-black leading-none">{day}</p></div>
                                                <StaffEventBadge status={status}/>
                                            </div>
                                            <div className="p-4">
                                                <h3 className="font-bold text-white text-base leading-snug mb-1">{safeStr(ev.title||ev.name,'Special Event')}</h3>
                                                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-3">{safeStr(ev.description,'Join us for this promotion.')}</p>
                                                {ev.saleOffer&&<div className="flex items-center gap-1.5 mb-3 p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg"><FiTag className="text-indigo-400" size={11}/><span className="text-indigo-300 text-xs font-bold">{ev.saleOffer}</span></div>}
                                                <div className="flex items-center gap-2 text-[10px] text-slate-500 border-t border-slate-800/60 pt-2.5">
                                                    <FiCalendar size={9} className="text-slate-600"/>
                                                    <span>{fmtDate(ev.startDate||ev.date)}</span>
                                                    {ev.endDate&&ev.endDate!==ev.startDate&&<><span className="text-slate-700">→</span><span>{fmtDate(ev.endDate)}</span></>}
                                                    {ev.location&&<><span className="text-slate-700 ml-auto">📍</span><span>{ev.location}</span></>}
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
                {view==='settings'&&(
                    <div className="p-6 h-full overflow-y-auto ds">
                        <div className="mb-6"><h1 className="text-2xl font-black text-white">Account Settings</h1><p className="text-slate-500 text-sm mt-0.5">Manage your profile, photo and security</p></div>
                        {settingMsg&&(
                            <div className={`mb-5 p-3.5 rounded-xl flex items-center gap-3 border text-sm font-bold ${settingMsg.type==='success'?'bg-emerald-500/10 text-emerald-400 border-emerald-500/20':'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                {settingMsg.type==='success'?<FiCheckCircle size={16}/>:<FiAlertTriangle size={16}/>}
                                {settingMsg.text}
                                <button onClick={()=>setSettingMsg(null)} className="ml-auto opacity-60 hover:opacity-100"><FiX size={13}/></button>
                            </div>
                        )}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="bg-[#0F172A] rounded-2xl border border-slate-800 p-6 h-fit">
                                <div className="flex flex-col items-center mb-6 pb-6 border-b border-slate-800/50">
                                    <div className="relative group mb-3">
                                        <div className="w-24 h-24 rounded-full border-4 border-indigo-500/30 overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                            {photoPreview?<img src={photoPreview} alt="Profile" className="w-full h-full object-cover"/>:<span className="text-3xl font-black text-white">{safeStr(currentUser?.name,'U').charAt(0).toUpperCase()}</span>}
                                        </div>
                                        <button type="button" onClick={()=>photoInputRef.current?.click()} className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1">
                                            <FiEdit2 size={16}/><span className="text-[9px] font-black uppercase tracking-wider">Change</span>
                                        </button>
                                        <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange}/>
                                        <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#0F172A]"/>
                                    </div>
                                    <h2 className="text-lg font-bold text-white">{currentUser?.name}</h2>
                                    <p className="text-slate-500 text-xs mt-0.5">{safeStr(currentUser?.employeeId)||'Staff'}</p>
                                    <span className="mt-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">● Active Staff</span>
                                    {photoFile&&<div className="mt-2.5 flex items-center gap-1.5 text-xs text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20"><FiCheckCircle size={10}/> New photo ready</div>}
                                </div>
                                <div className="space-y-2.5 mb-5 text-sm">
                                    {[{label:'Email',val:safeStr(currentUser?.email,'Not set')},{label:'Phone',val:safeStr(currentUser?.phone,'Not set')},{label:'City',val:safeStr(currentUser?.city,'Not set')}].map(r=>(
                                        <div key={r.label} className="flex justify-between items-center py-1.5 border-b border-slate-800/60">
                                            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">{r.label}</span>
                                            <span className="text-slate-300 text-xs truncate max-w-[130px]">{r.val}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-1">
                                    {[{id:'profile',icon:<FiUser size={14}/>,label:'Edit Profile'},{id:'security',icon:<FiShield size={14}/>,label:'Change Password'}].map(t=>(
                                        <button key={t.id} onClick={()=>{ setSettingTab(t.id); setSettingMsg(null); setOtpStep('idle'); setOtpInput(''); }}
                                            className={`w-full text-left p-3 rounded-xl flex items-center gap-2.5 transition-all font-bold text-sm ${settingTab===t.id?'bg-indigo-600 text-white':'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                                            {t.icon} {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="lg:col-span-2 space-y-4">
                                {settingTab==='profile'&&(
                                    <form onSubmit={handleSaveProfile} className="bg-[#0F172A] rounded-2xl border border-slate-800 p-6">
                                        <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2"><FiEdit2 className="text-indigo-400" size={16}/> Edit Profile</h3>
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Full Name *</label><input required type="text" value={profileForm.name} onChange={e=>setProfileForm(f=>({...f,name:e.target.value}))} className="w-full bg-[#080C14] border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500 transition-all text-sm"/></div>
                                            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Phone</label><input type="text" maxLength="10" value={profileForm.phone} onChange={e=>setProfileForm(f=>({...f,phone:e.target.value.replace(/\D/g,'')}))} placeholder="10-digit mobile" className="w-full bg-[#080C14] border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500 transition-all text-sm"/></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Email</label><input type="email" value={profileForm.email} onChange={e=>setProfileForm(f=>({...f,email:e.target.value}))} placeholder="you@example.com" className="w-full bg-[#080C14] border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500 transition-all text-sm"/></div>
                                            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">City</label><input type="text" value={profileForm.city} onChange={e=>setProfileForm(f=>({...f,city:e.target.value}))} placeholder="e.g. Surat" className="w-full bg-[#080C14] border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500 transition-all text-sm"/></div>
                                        </div>
                                        <div className="space-y-1.5 mb-5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Address</label><textarea rows="3" value={profileForm.address} onChange={e=>setProfileForm(f=>({...f,address:e.target.value}))} placeholder="Street, area, landmark…" className="w-full bg-[#080C14] border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500 transition-all resize-none text-sm"/></div>
                                        <div className="p-3 bg-[#080C14] border border-slate-800 rounded-xl flex items-center gap-3 mb-5">
                                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0">{photoPreview?<img src={photoPreview} alt="" className="w-full h-full object-cover"/>:<div className="w-full h-full flex items-center justify-center text-slate-500"><FiUser size={16}/></div>}</div>
                                            <div className="flex-1 min-w-0"><p className="text-white text-sm font-bold">{photoFile?photoFile.name:'Profile Photo'}</p><p className="text-slate-500 text-xs">{photoFile?`${(photoFile.size/1024).toFixed(0)} KB — Ready to upload`:'JPG, PNG up to 3MB'}</p></div>
                                            <button type="button" onClick={()=>photoInputRef.current?.click()} className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-bold transition-all shrink-0">{photoFile?'Change':'Upload'}</button>
                                        </div>
                                        <div className="flex justify-end">
                                            <button type="submit" disabled={settingLoading} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all text-sm">
                                                {settingLoading?<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Saving…</>:<><FiSave size={14}/> Save Profile</>}
                                            </button>
                                        </div>
                                    </form>
                                )}
                                {settingTab==='security'&&(
                                    <div className="bg-[#0F172A] rounded-2xl border border-slate-800 p-6">
                                        <h3 className="text-lg font-bold text-white mb-1.5 flex items-center gap-2"><FiLock className="text-indigo-400" size={16}/> Change Password</h3>
                                        <p className="text-slate-500 text-sm mb-5">An OTP will be generated to confirm your identity.</p>
                                        {(otpStep==='idle'||otpStep==='sending')&&(
                                            <div className="space-y-4">
                                                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Current Password *</label><input type="password" value={pwForm.currentPassword} onChange={e=>setPwForm(f=>({...f,currentPassword:e.target.value}))} placeholder="Enter your current password" className="w-full bg-[#080C14] border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500 transition-all text-sm"/></div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">New Password *</label>
                                                    <input type="password" value={pwForm.newPassword} onChange={e=>setPwForm(f=>({...f,newPassword:e.target.value}))} placeholder="Min 6 characters" className="w-full bg-[#080C14] border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-indigo-500 transition-all text-sm"/>
                                                    {pwForm.newPassword&&(
                                                        <div className="flex gap-1 mt-1.5">
                                                            {[1,2,3,4].map(i=>{ const len=pwForm.newPassword.length, s=len<6?1:len<10?2:len<14?3:4; return <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i<=s?(s<=1?'bg-red-500':s<=2?'bg-orange-400':s<=3?'bg-yellow-400':'bg-emerald-400'):'bg-slate-800'}`}/>; })}
                                                            <span className="text-[10px] text-slate-500 ml-2 font-bold">{pwForm.newPassword.length<6?'Weak':pwForm.newPassword.length<10?'Fair':pwForm.newPassword.length<14?'Good':'Strong'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Confirm New Password *</label>
                                                    <input type="password" value={pwForm.confirmPassword} onChange={e=>setPwForm(f=>({...f,confirmPassword:e.target.value}))} placeholder="Re-enter new password"
                                                        className={`w-full bg-[#080C14] border rounded-xl p-3 text-white outline-none focus:border-indigo-500 transition-all text-sm ${pwForm.confirmPassword&&pwForm.confirmPassword!==pwForm.newPassword?'border-red-500':'border-slate-700'}`}/>
                                                    {pwForm.confirmPassword&&pwForm.confirmPassword!==pwForm.newPassword&&<p className="text-red-400 text-xs font-bold flex items-center gap-1"><FiX size={10}/> Passwords do not match</p>}
                                                    {pwForm.confirmPassword&&pwForm.confirmPassword===pwForm.newPassword&&pwForm.newPassword&&<p className="text-emerald-400 text-xs font-bold flex items-center gap-1"><FiCheckCircle size={10}/> Passwords match</p>}
                                                </div>
                                                <button onClick={handleRequestOtp} disabled={otpStep==='sending'}
                                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all text-sm">
                                                    {otpStep==='sending'?<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Generating OTP…</>:<><FiShield size={14}/> Get OTP to Continue</>}
                                                </button>
                                            </div>
                                        )}
                                        {otpStep==='verify'&&(
                                            <div className="space-y-4">
                                                <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-start gap-3">
                                                    <FiShield className="text-indigo-400 mt-0.5 shrink-0" size={16}/>
                                                    <div><p className="text-indigo-300 font-bold text-sm">OTP Generated</p><p className="text-indigo-400/70 text-xs mt-0.5">Check the notification for your OTP.</p></div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Enter 6-Digit OTP</label>
                                                    <input type="text" maxLength="6" value={otpInput} onChange={e=>setOtpInput(e.target.value.replace(/\D/g,''))} placeholder="000000" className="w-full bg-[#080C14] border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-emerald-500 transition-all text-2xl font-mono tracking-[0.5em] text-center"/>
                                                </div>
                                                {otpTimer>0&&<p className="text-center text-slate-500 text-xs font-bold">OTP expires in <span className="text-indigo-400">{otpTimer}s</span></p>}
                                                {otpTimer===0&&<p className="text-center text-red-400 text-xs font-bold">OTP expired. <button onClick={()=>setOtpStep('idle')} className="underline">Generate a new one</button></p>}
                                                <div className="flex gap-3">
                                                    <button onClick={()=>{ setOtpStep('idle'); setOtpInput(''); setSettingMsg(null); }} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all text-sm">← Back</button>
                                                    <button onClick={handleVerifyOtpAndChange} disabled={otpInput.length!==6||settingLoading||otpTimer===0}
                                                        className="flex-[2] py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all text-sm">
                                                        {settingLoading?<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Verifying…</>:<><FiCheckCircle size={14}/> Verify & Change</>}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {otpStep==='done'&&(
                                            <div className="flex flex-col items-center py-8 text-center">
                                                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-4"><FiCheckCircle size={30} className="text-emerald-400"/></div>
                                                <h4 className="text-lg font-bold text-white mb-2">Password Changed!</h4>
                                                <p className="text-slate-400 text-sm mb-5 max-w-xs">Your password has been updated and saved.</p>
                                                <button onClick={()=>{ setOtpStep('idle'); setSettingMsg(null); }} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all text-sm">Change Again</button>
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
            {showBillModal&&(
                <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-[#0F172A] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#131C31]">
                            <h2 className="text-lg font-black text-white flex items-center gap-2"><FiUser className="text-indigo-400" size={16}/> Customer Details</h2>
                            <button onClick={()=>setShowBillModal(false)} className="text-slate-400 hover:text-white p-1.5 transition-colors"><FiX size={20}/></button>
                        </div>
                        <form onSubmit={handleCheckout} className="p-5 space-y-4 overflow-y-auto ds max-h-[80vh]">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Customer Name *</label><input required type="text" placeholder="e.g. Rahul Sharma" value={customerForm.name} onChange={e=>setCustomerForm(f=>({...f,name:e.target.value}))} className="w-full bg-[#080C14] border border-slate-700 text-white p-3 rounded-xl outline-none focus:border-indigo-500 transition-all text-sm"/></div>
                                <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Phone Number *</label><input required type="text" maxLength="10" placeholder="10-digit number" value={customerForm.phone} onChange={e=>setCustomerForm(f=>({...f,phone:e.target.value.replace(/\D/g,'')}))} className="w-full bg-[#080C14] border border-slate-700 text-white p-3 rounded-xl outline-none focus:border-indigo-500 transition-all text-sm"/></div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    Email Address
                                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[8px] font-black normal-case tracking-normal">Invoice will be emailed</span>
                                </label>
                                <input type="email" placeholder="customer@email.com (optional)" value={customerForm.email}
                                    onChange={e=>setCustomerForm(f=>({...f,email:e.target.value}))}
                                    className="w-full bg-[#080C14] border border-slate-700 text-white p-3 rounded-xl outline-none focus:border-indigo-500 transition-all text-sm"/>
                            </div>
                            <div className="space-y-1.5 relative">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">City *</label>
                                <input required type="text" placeholder="Start typing city…" value={customerForm.city} onChange={handleCityInput} className="w-full bg-[#080C14] border border-slate-700 text-white p-3 rounded-xl outline-none focus:border-indigo-500 transition-all text-sm"/>
                                {showCityDrop&&filteredCities.length>0&&(
                                    <ul className="absolute z-20 w-full bg-[#1e293b] border border-slate-700 mt-1 max-h-36 overflow-y-auto ds rounded-xl shadow-xl">
                                        {filteredCities.map(c=><li key={c} onClick={()=>{ setCustomerForm(f=>({...f,city:c})); setShowCityDrop(false); }} className="p-2.5 hover:bg-indigo-600 cursor-pointer text-sm font-medium transition-colors">{c}</li>)}
                                    </ul>
                                )}
                            </div>
                            <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Address (Optional)</label><textarea rows="2" placeholder="Street, area…" value={customerForm.homeAddress} onChange={e=>setCustomerForm(f=>({...f,homeAddress:e.target.value}))} className="w-full bg-[#080C14] border border-slate-700 text-white p-3 rounded-xl outline-none focus:border-indigo-500 transition-all resize-none text-sm"/></div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Payment Method *</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {PAYMENT_METHODS.map(({id,label,icon:Icon,activeClass,dotClass})=>{
                                        const isActive=selectedPaymentMethod===id;
                                        return (
                                            <button key={id} type="button" onClick={()=>setSelectedPaymentMethod(id)}
                                                className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all duration-150 select-none
                                                    ${isActive?`${activeClass} shadow-lg`:'border-slate-700 bg-[#080C14] text-slate-500 hover:border-slate-600 hover:text-slate-300'}`}>
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive?'bg-current/10':'bg-slate-800'}`}>
                                                    <Icon size={16} className={isActive?'':'text-slate-500'}/>
                                                </div>
                                                <span className="text-xs font-black">{label}</span>
                                                {isActive&&<span className={`w-1.5 h-1.5 rounded-full ${dotClass}`}/>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] text-indigo-300 font-black uppercase tracking-wider">Total Payable</p>
                                    <p className="text-2xl font-black text-white">Rs.{finalTotal.toFixed(2)}</p>
                                </div>
                                <div className="text-right text-xs text-slate-400">
                                    <p>{cartItemCount} items</p>
                                    {discountVal>0&&<p className="text-emerald-400 font-bold">Saved Rs.{discountVal.toFixed(2)}</p>}
                                    <p className="text-slate-500 mt-0.5 capitalize">via {selectedPaymentMethod==='card'?'Card':selectedPaymentMethod==='upi'?'UPI':'Cash'}</p>
                                    {customerForm.email&&<p className="text-indigo-400 text-[10px] mt-1 font-bold flex items-center gap-1 justify-end"><FiMail size={9}/> Invoice will be emailed</p>}
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={()=>setShowBillModal(false)} className="flex-1 py-3 text-slate-400 font-bold hover:text-white hover:bg-slate-800 rounded-xl transition-all text-sm">Cancel</button>
                                <button type="submit" disabled={razorpayLoading} className={
                                    'flex-[2] py-3 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed ' +
                                    (selectedPaymentMethod==='cash'?'bg-emerald-600 hover:bg-emerald-500':selectedPaymentMethod==='upi'?'bg-indigo-600 hover:bg-indigo-500':'bg-violet-600 hover:bg-violet-500')
                                }>
                                    {razorpayLoading?(<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Processing...</>)
                                    :selectedPaymentMethod==='cash'?(<><FiPrinter size={14}/><span>Complete Sale</span></>)
                                    :selectedPaymentMethod==='upi'?(<><FiSmartphone size={14}/><span>Pay via UPI</span></>)
                                    :(<><FiCreditCard size={14}/><span>Pay via Card</span></>)}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══ INVOICE DETAIL MODAL ══ */}
            {selectedSale&&(
                <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-[#0F172A] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#131C31]">
                            <h2 className="text-base font-bold text-white flex items-center gap-2"><FiFileText className="text-indigo-400" size={15}/> Invoice</h2>
                            <button onClick={()=>{ setSelectedSale(null); setInvoiceEmail(''); setEmailStatus(null); }} className="text-slate-400 hover:text-white p-1.5 transition-colors"><FiX size={20}/></button>
                        </div>
                        <div className="p-5 overflow-y-auto ds flex-1 bg-[#080C14]">
                            <div className="flex justify-between mb-5 pb-4 border-b border-slate-800">
                                <div><h2 className="text-lg font-black text-white">STYLESYNC RETAIL</h2><p className="text-xs text-indigo-400 mt-0.5 font-bold">{safeStr(selectedSale.invoiceId)||('#'+safeStr(selectedSale._id).slice(-6).toUpperCase())}</p></div>
                                <div className="text-right text-xs text-slate-500"><p>{new Date(selectedSale.date||selectedSale.createdAt).toLocaleDateString()}</p><p>{new Date(selectedSale.date||selectedSale.createdAt).toLocaleTimeString()}</p></div>
                            </div>
                            <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-3.5 mb-4 flex justify-between">
                                <div><p className="text-[9px] text-slate-500 font-black uppercase tracking-wider mb-0.5">Billed To</p><p className="font-bold text-white text-sm">{safeStr(selectedSale.customerName,'Walk-in')}</p><p className="text-xs text-slate-400">{safeStr(selectedSale.customerPhone,'N/A')}</p></div>
                                <div className="text-right space-y-1">
                                    {selectedSale.storeLocation&&<div><p className="text-[9px] text-slate-500 font-black uppercase tracking-wider mb-0.5">City</p><p className="font-bold text-white text-sm">{selectedSale.storeLocation}</p></div>}
                                    {selectedSale.paymentMethod&&<div><p className="text-[9px] text-slate-500 font-black uppercase tracking-wider mb-0.5">Paid via</p><p className="font-bold text-indigo-400 text-sm capitalize">{selectedSale.paymentMethod==='card'?'Card':selectedSale.paymentMethod==='upi'?'UPI':'Cash'}</p></div>}
                                </div>
                            </div>
                            <table className="w-full text-sm mb-4">
                                <thead className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800"><tr><th className="pb-2 text-left">Item</th><th className="pb-2 text-center">Qty</th><th className="pb-2 text-right">Total</th></tr></thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {safeArr(selectedSale.items).map((item,i)=>(
                                        <tr key={i}><td className="py-2.5 text-white font-medium text-sm">{item.name}</td><td className="py-2.5 text-center text-slate-400 text-sm">{safeNum(item.quantity,1)}</td><td className="py-2.5 text-right font-mono text-white text-sm">Rs.{(safeNum(item.price)*safeNum(item.quantity,1)).toFixed(2)}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="border-t border-slate-800 pt-3 space-y-1.5 mb-4">
                                <div className="flex justify-between text-sm text-slate-400"><span>Subtotal</span><span>Rs.{safeNum(selectedSale.subtotal||selectedSale.totalAmount).toFixed(2)}</span></div>
                                <div className="flex justify-between text-sm text-emerald-400 font-bold"><span>Discount</span><span>-Rs.{safeNum(selectedSale.discount).toFixed(2)}</span></div>
                                <div className="flex justify-between text-lg font-black text-white pt-2 border-t border-slate-800"><span>Total</span><span className="text-indigo-400">Rs.{safeNum(selectedSale.totalAmount).toFixed(2)}</span></div>
                            </div>
                            <div className="bg-[#0F172A] border border-slate-700 rounded-xl p-3.5 space-y-2.5">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <FiMail className="text-indigo-400" size={11}/> Email Invoice to Customer
                                </p>
                                {emailStatus==='sent'&&(
                                    <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-bold">
                                        <FiCheckCircle size={12}/> Invoice sent successfully!
                                    </div>
                                )}
                                {emailStatus==='error'&&(
                                    <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-bold">
                                        <FiAlertTriangle size={12}/> Failed to send. Check email &amp; try again.
                                    </div>
                                )}
                                {selectedSale.customerEmail&&emailStatus!=='sent'&&(
                                    <p className="text-[10px] text-slate-500">
                                        Last used: <span className="text-indigo-400 font-bold">{selectedSale.customerEmail}</span>
                                        <button onClick={()=>setInvoiceEmail(selectedSale.customerEmail)} className="ml-2 text-indigo-400 underline hover:text-indigo-300">use this</button>
                                    </p>
                                )}
                                <div className="flex gap-2">
                                    <input type="email" placeholder="customer@email.com" value={invoiceEmail}
                                        onChange={e=>{ setInvoiceEmail(e.target.value); setEmailStatus(null); }}
                                        className="flex-1 bg-[#080C14] border border-slate-700 rounded-xl py-2.5 px-3 text-white text-xs outline-none focus:border-indigo-500 transition-all"/>
                                    <button onClick={()=>handleSendInvoiceEmail(selectedSale, invoiceEmail)}
                                        disabled={emailSending||!invoiceEmail}
                                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shrink-0">
                                        {emailSending?<><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Sending…</>:<><FiMail size={12}/> Send</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-[#131C31] border-t border-slate-800 flex gap-3">
                            <button onClick={()=>{ setSelectedSale(null); setInvoiceEmail(''); setEmailStatus(null); }} className="flex-1 py-2.5 text-slate-400 font-bold hover:text-white bg-slate-800 rounded-xl transition-all text-sm">Close</button>
                            <button onClick={()=>generateBillPDF(selectedSale)} className="flex-[2] py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm"><FiPrinter size={13}/> Download PDF</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffDashboard;