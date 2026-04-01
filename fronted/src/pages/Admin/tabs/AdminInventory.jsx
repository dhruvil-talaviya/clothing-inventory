import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    FiPlus, FiSearch, FiPackage, FiCheckCircle, FiAlertCircle,
    FiX, FiEdit2, FiTrash2, FiTag, FiLayers, FiAlertTriangle,
    FiGrid, FiList, FiRefreshCw, FiDownload, FiChevronDown, FiChevronRight,
    FiImage, FiUpload, FiBell
} from 'react-icons/fi';
import { BiBarcodeReader } from 'react-icons/bi';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const CATEGORIES = [
    { value:'Shirt',       label:'Shirt',       prefix:'SHT' },
    { value:'T-Shirt',     label:'T-Shirt',     prefix:'TSH' },
    { value:'Jeans',       label:'Jeans',       prefix:'JNS' },
    { value:'Trousers',    label:'Trousers',    prefix:'TRS' },
    { value:'Shoes',       label:'Shoes',       prefix:'SHO' },
    { value:'Jacket',      label:'Jacket',      prefix:'JKT' },
    { value:'Kurta',       label:'Kurta',       prefix:'KRT' },
    { value:'Saree',       label:'Saree',       prefix:'SAR' },
    { value:'Watch',       label:'Watch',       prefix:'WTC' },
    { value:'Accessories', label:'Accessories', prefix:'ACC' },
];

// ─── HELPERS ───────────────────────────────────────────────────────────────── 
const generateSKU = (category, name, size) => {
    const cat   = CATEGORIES.find(c => c.value === category)?.prefix || 'GEN';
    const brand = name ? name.replace(/[^a-zA-Z]/g,'').toUpperCase().slice(0,3).padEnd(3,'X') : 'XXX';
    const seq   = Math.floor(Math.random() * 9000) + 1000;
    return `${cat}-${brand}-${size||'OS'}-${new Date().getFullYear()}-${seq}`;
};

const blankSizes = () => Object.fromEntries(SIZES.map(s => [s, { stock:'', sku:'' }]));
const BLANK_FORM  = { name:'', category:'', costPrice:'', price:'', color:'', description:'', sizes: blankSizes() };

const stockColor = (n) =>
    n <= 0 ? 'bg-red-500/10 text-red-400 border-red-500/20'
    : n <= 5 ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

const stockDot = (n) =>
    n <= 0 ? 'bg-red-500' : n <= 5 ? 'bg-orange-400' : 'bg-emerald-400';

// ── Low stock helpers ──────────────────────────────────────────────────────────
// A product is "low stock" if ANY of its size variants has stock <= 5
const isProductLowStock = (p) => {
    const variants = p.variants || [];
    if (variants.length > 0) {
        return variants.some(v => Number(v.stock || 0) <= 5);
    }
    return Number(p.stock || 0) <= 5;
};

// Returns list of {name, sizes[]} describing which sizes are low/out
const getLowStockDetails = (p) => {
    const variants = p.variants || [];
    const lowSizes = variants.length > 0
        ? variants.filter(v => Number(v.stock || 0) <= 5).map(v => ({ size: v.size, stock: Number(v.stock || 0) }))
        : Number(p.stock || 0) <= 5 ? [{ size: 'Stock', stock: Number(p.stock || 0) }] : [];
    return lowSizes;
};

// ─── BARCODE DISPLAY ──────────────────────────────────────────────────────────
const BarcodeDisplay = ({ sku, size: bSize = 'sm' }) => {
    if (!sku) return null;
    const bars = sku.split('').map((c, i) => ({ w:(c.charCodeAt(0)%3)+1, isSpace: i%7===6 }));
    return (
        <div className="flex flex-col items-start gap-1">
            <div className={`flex items-end gap-[1px] ${bSize==='lg'?'h-10':'h-6'} overflow-hidden`}>
                {bars.map((bar, i) => (
                    <div key={i} className={`${bar.isSpace?'bg-transparent':'bg-slate-300'} rounded-[1px]`}
                        style={{ width:`${bar.w+1}px`, height:`${60+(i%3)*20}%` }}/>
                ))}
                <div className="bg-slate-300 rounded-[1px]" style={{ width:'2px', height:'100%' }}/>
            </div>
            <span className="text-[9px] font-mono text-slate-500 tracking-widest">{sku}</span>
        </div>
    );
};

// ─── TOGGLE ───────────────────────────────────────────────────────────────────
const ToggleSwitch = ({ checked, onChange }) => (
    <div onClick={e => { e.stopPropagation(); onChange(); }}
        className={`relative w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${checked?'bg-emerald-500':'bg-slate-700'}`}>
        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${checked?'translate-x-6':'translate-x-0'}`}/>
    </div>
);

// ─── SIZE STOCK INPUT ─────────────────────────────────────────────────────────
const SizeStockInput = ({ sizes, onChange }) => (
    <div className="grid grid-cols-3 gap-3">
        {SIZES.map(size => (
            <div key={size} className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>{size}</span>
                    <span className="text-indigo-400 font-mono text-[9px]">{sizes[size]?.sku?.slice(-9)||'—'}</span>
                </label>
                <input type="number" min="0" placeholder="0"
                    value={sizes[size]?.stock ?? ''}
                    onChange={e => onChange(size, e.target.value)}
                    className="w-full p-2.5 bg-[#0f172a] border border-slate-700 rounded-lg text-white text-sm outline-none focus:border-indigo-500 transition-all text-center font-bold"/>
            </div>
        ))}
    </div>
);

// ─── DELETE MODAL ─────────────────────────────────────────────────────────────
const DeleteModal = ({ product, onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onCancel}>
        <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center mb-4">
                    <FiTrash2 size={22} className="text-rose-400"/>
                </div>
                <h3 className="text-white font-black text-lg mb-1">Delete Product?</h3>
                <p className="text-slate-400 text-sm mb-2">You're about to permanently delete:</p>
                <p className="text-white font-bold text-sm bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl mb-5 w-full truncate">{product?.name}</p>
                <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl mb-5 w-full">
                    <FiAlertTriangle size={14} className="text-rose-400 shrink-0"/>
                    <p className="text-rose-300 text-xs font-semibold">This action cannot be undone.</p>
                </div>
                <div className="flex gap-3 w-full">
                    <button onClick={onCancel} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 hover:text-white font-bold rounded-xl text-sm transition-all">Cancel</button>
                    <button onClick={onConfirm} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                        <FiTrash2 size={13}/> Delete
                    </button>
                </div>
            </div>
        </div>
    </div>
);

// ─── IMAGE UPLOAD FIELD ───────────────────────────────────────────────────────
const ImageUploadField = ({ preview, onFileChange, onClear }) => {
    const inputRef = useRef(null);
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FiImage size={10}/> Product Image
            </label>
            {preview ? (
                <div className="relative group rounded-xl overflow-hidden border border-slate-700 bg-[#0f172a]">
                    <img src={preview} alt="Product preview" className="w-full h-44 object-cover"/>
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                        <button type="button" onClick={() => inputRef.current?.click()}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all">
                            <FiUpload size={12}/> Change Image
                        </button>
                        <button type="button" onClick={onClear}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all">
                            <FiX size={12}/> Remove
                        </button>
                    </div>
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <FiCheckCircle size={9} className="text-emerald-400"/> Image Ready
                    </div>
                </div>
            ) : (
                <div onClick={() => inputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-xl h-44 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group bg-[#0f172a] hover:bg-indigo-500/5">
                    <div className="w-12 h-12 bg-slate-800 group-hover:bg-indigo-500/15 rounded-xl flex items-center justify-center transition-all">
                        <FiImage size={22} className="text-slate-500 group-hover:text-indigo-400 transition-colors"/>
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-bold text-slate-400 group-hover:text-slate-200 transition-colors">Click to upload image</p>
                        <p className="text-[10px] text-slate-600 mt-0.5">JPG, PNG, WEBP up to 5MB</p>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-400 border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 rounded-full">Browse Files</span>
                </div>
            )}
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange}/>
        </div>
    );
};

// ─── PRODUCT FORM ─────────────────────────────────────────────────────────────
const ProductForm = ({ form, setForm, onSubmit, onClose, title, submitLabel, submitColor, regenerateSKUs, imagePreview, onImageChange, onImageClear }) => (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-[#1e293b] rounded-2xl w-full max-w-2xl border border-slate-700 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#0f172a]">
                <h3 className="text-xl font-black text-white">{title}</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white p-2 bg-slate-800 rounded-xl"><FiX size={18}/></button>
            </div>
            <form onSubmit={onSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
                <ImageUploadField preview={imagePreview} onFileChange={onImageChange} onClear={onImageClear}/>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Product Name *</label>
                        <input required placeholder="e.g. Classic Slim Fit Shirt"
                            className="w-full p-3.5 bg-[#0f172a] border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500 transition-all"
                            value={form.name} onChange={e => setForm(f=>({...f, name:e.target.value}))}
                            onBlur={() => regenerateSKUs(form, setForm)}/>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Category *</label>
                        <select required className="w-full p-3.5 bg-[#0f172a] border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500 transition-all"
                            value={form.category} onChange={e => setForm(f=>({...f, category:e.target.value}))}
                            onBlur={() => regenerateSKUs(form, setForm)}>
                            <option value="" disabled>Select Category</option>
                            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Color / Variant</label>
                        <input placeholder="e.g. Navy Blue"
                            className="w-full p-3.5 bg-[#0f172a] border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500 transition-all"
                            value={form.color} onChange={e => setForm(f=>({...f, color:e.target.value}))}/>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cost Price (₹)</label>
                        <input type="number" step="0.01" min="0" placeholder="0.00"
                            className="w-full p-3.5 bg-[#0f172a] border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500 transition-all"
                            value={form.costPrice} onChange={e => setForm(f=>({...f, costPrice:e.target.value}))}/>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Selling Price (₹) *</label>
                        <input type="number" step="0.01" min="0" required placeholder="0.00"
                            className="w-full p-3.5 bg-[#0f172a] border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500 transition-all"
                            value={form.price} onChange={e => setForm(f=>({...f, price:e.target.value}))}/>
                    </div>
                </div>

                <div className="bg-[#0f172a] rounded-xl border border-slate-800 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm font-black text-white">Size-wise Stock</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Each size is tracked separately. Leave blank = 0 stock.</p>
                        </div>
                        <button type="button" onClick={() => regenerateSKUs(form, setForm)}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-bold border border-indigo-500/20 px-2 py-1 rounded-lg bg-indigo-500/5 transition-all">
                            <FiRefreshCw size={10}/> Regen SKUs
                        </button>
                    </div>
                    <div className="flex gap-2 mb-4 flex-wrap">
                        {SIZES.map(s => {
                            const val = Number(form.sizes[s]?.stock || 0);
                            return (
                                <div key={s} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black transition-all
                                    ${val > 0 ? stockColor(val) : 'bg-slate-800/50 border-slate-700 text-slate-600'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${val > 0 ? stockDot(val) : 'bg-slate-600'}`}/>
                                    {s}: {val > 0 ? val : '—'}
                                </div>
                            );
                        })}
                    </div>
                    <SizeStockInput sizes={form.sizes} onChange={(size, val) =>
                        setForm(f => ({
                            ...f,
                            sizes: {
                                ...f.sizes,
                                [size]: { stock: val, sku: f.sizes[size]?.sku || generateSKU(f.category, f.name, size) }
                            }
                        }))
                    }/>
                    {SIZES.some(s => form.sizes[s]?.sku) && (
                        <div className="mt-4 pt-4 border-t border-slate-800/60">
                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2">Generated SKUs</p>
                            <div className="space-y-1">
                                {SIZES.filter(s => form.sizes[s]?.sku).map(s => (
                                    <div key={s} className="flex items-center gap-2">
                                        <span className="text-[9px] font-black bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded w-8 text-center">{s}</span>
                                        <span className="font-mono text-[10px] text-slate-500">{form.sizes[s]?.sku}</span>
                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ml-auto ${Number(form.sizes[s]?.stock||0)>0 ? stockColor(Number(form.sizes[s]?.stock)) : 'bg-slate-800 text-slate-600 border-slate-700'}`}>
                                            {Number(form.sizes[s]?.stock||0) > 0 ? `${form.sizes[s].stock} units` : 'no stock'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <button type="submit" className={`w-full ${submitColor} text-white py-4 rounded-xl font-bold shadow-lg transition-all`}>
                    {submitLabel}
                </button>
            </form>
        </div>
    </div>
);

// ─── EXPANDABLE PRODUCT ROW (Table view) ──────────────────────────────────────
const ProductTableRow = ({ p, stockColor, onBarcode, onEdit, onDelete, onToggle }) => {
    const [expanded, setExpanded] = useState(false);
    const variants   = p.variants || [];
    const totalStock = variants.length > 0
        ? variants.reduce((a, v) => a + Number(v.stock || 0), 0)
        : Number(p.stock || 0);
    const hasVariants = variants.length > 0;
    const hasLowSizes = isProductLowStock(p);

    return (
        <>
            <tr
                className={`hover:bg-slate-800/40 transition-colors group cursor-pointer select-none
                    ${expanded ? 'bg-slate-800/30 border-l-2 border-indigo-500' : ''}
                    ${hasLowSizes && !expanded ? 'border-l-2 border-orange-500/60' : ''}`}
                onClick={() => hasVariants && setExpanded(v => !v)}
            >
                <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-slate-700 bg-[#0f172a]">
                            {p.image ? (
                                <img src={p.image} alt={p.name} className="w-full h-full object-cover"
                                    onError={e => { e.target.onerror = null; e.target.style.display = 'none'; e.target.parentNode.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg xmlns=\'http://www.w3.org/2000/svg\' width=\'14\' height=\'14\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'#6366f1\' stroke-width=\'2\'><rect x=\'3\' y=\'3\' width=\'18\' height=\'18\' rx=\'2\'/><circle cx=\'8.5\' cy=\'8.5\' r=\'1.5\'/><polyline points=\'21 15 16 10 5 21\'/></svg></div>'; }}
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-slate-800 flex items-center justify-center">
                                    <FiPackage className="text-indigo-400" size={14}/>
                                </div>
                            )}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-white font-semibold text-sm leading-tight">{p.name}</p>
                                {hasVariants && (
                                    <span className="text-indigo-400 shrink-0">
                                        {expanded ? <FiChevronDown size={13}/> : <FiChevronRight size={13}/>}
                                    </span>
                                )}
                                {hasLowSizes && (
                                    <span className="shrink-0 flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-orange-500/15 text-orange-400 border border-orange-500/25">
                                        <FiAlertTriangle size={8}/> LOW
                                    </span>
                                )}
                            </div>
                            {p.color && <p className="text-slate-500 text-[10px] mt-0.5">{p.color}</p>}
                        </div>
                    </div>
                </td>

                <td className="px-5 py-3.5">
                    {hasVariants ? (
                        <div className="space-y-1">
                            {variants.slice(0, 2).map(v => (
                                <div key={v.size} className="flex items-center gap-2">
                                    <span className="text-[9px] font-bold bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">{v.size}</span>
                                    <span className="font-mono text-[10px] text-slate-400">{v.sku}</span>
                                </div>
                            ))}
                            {variants.length > 2 && (
                                <span className="text-[10px] text-indigo-400 font-semibold">+{variants.length - 2} more</span>
                            )}
                        </div>
                    ) : (
                        <span className="font-mono text-[11px] text-slate-400">{p.sku || '—'}</span>
                    )}
                    <button onClick={e => { e.stopPropagation(); onBarcode(p); }}
                        className="mt-1.5 flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 opacity-0 group-hover:opacity-100 transition-all">
                        <BiBarcodeReader size={11}/> Barcodes
                    </button>
                </td>

                <td className="px-5 py-3.5">
                    <span className="bg-slate-800 text-slate-400 px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wide font-semibold border border-slate-700">
                        {p.category || 'General'}
                    </span>
                </td>

                <td className="px-5 py-3.5">
                    <p className="font-bold text-emerald-400 text-sm">₹{Number(p.price || 0).toFixed(2)}</p>
                    {p.costPrice && <p className="text-[10px] text-slate-500 mt-0.5">Cost: ₹{Number(p.costPrice).toFixed(2)}</p>}
                </td>

                <td className="px-5 py-3.5">
                    {hasVariants ? (
                        <div className="flex gap-1 flex-wrap">
                            {SIZES.map(size => {
                                const v = variants.find(x => x.size === size);
                                if (!v) return (
                                    <span key={size} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/50 text-slate-600 font-bold border border-slate-700/50">{size}</span>
                                );
                                return (
                                    <span key={size} className={`text-[9px] px-2 py-1 rounded-lg border font-black ${stockColor(v.stock)}`}>
                                        {size}<br/><span className="text-[8px]">{v.stock}</span>
                                    </span>
                                );
                            })}
                        </div>
                    ) : (
                        <span className={`px-3 py-1.5 rounded-lg font-bold text-xs border ${totalStock <= 5 ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : totalStock <= 0 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                            {totalStock} units {totalStock <= 5 && '⚠️'}
                        </span>
                    )}
                </td>

                <td className="px-5 py-3.5">
                    <div className="flex justify-center">
                        <ToggleSwitch checked={p.isAvailable !== false} onChange={() => onToggle(p._id)}/>
                    </div>
                </td>

                <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                        <button onClick={() => onBarcode(p)} title="Barcodes" className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-indigo-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all"><BiBarcodeReader size={14}/></button>
                        <button onClick={() => onEdit(p)}    title="Edit"     className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-indigo-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all"><FiEdit2 size={13}/></button>
                        <button onClick={() => onDelete(p)}  title="Delete"   className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-red-400   bg-slate-800 hover:bg-slate-700 rounded-lg transition-all"><FiTrash2 size={13}/></button>
                    </div>
                </td>
            </tr>

            {expanded && hasVariants && variants.map((v, idx) => (
                <tr key={`${p._id}_${v.size}`}
                    className={`bg-[#0a1628] border-l-2 border-indigo-500/50 transition-colors
                        ${idx === variants.length - 1 ? 'border-b border-slate-700/50' : ''}`}>
                    <td className="py-3 pl-16 pr-5">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm border ${stockColor(v.stock)}`}>
                                {v.size}
                            </div>
                            <div>
                                <p className="text-slate-300 text-sm font-bold">{p.name} — {v.size}</p>
                                <p className="text-slate-500 text-[10px]">Size variant</p>
                            </div>
                        </div>
                    </td>
                    <td className="py-3 px-5"><span className="font-mono text-[10px] text-slate-400">{v.sku || '—'}</span></td>
                    <td className="py-3 px-5"><span className="text-[10px] text-slate-600 italic">{p.category}</span></td>
                    <td className="py-3 px-5"><span className="text-emerald-400 font-bold text-sm">₹{Number(p.price || 0).toFixed(2)}</span></td>
                    <td className="py-3 px-5">
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${stockDot(v.stock)}`}/>
                            <span className={`font-black text-sm ${v.stock <= 0 ? 'text-red-400' : v.stock <= 5 ? 'text-orange-400' : 'text-white'}`}>{v.stock}</span>
                            <span className="text-slate-500 text-xs">units</span>
                            {v.stock <= 0 && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">OUT</span>}
                            {v.stock > 0 && v.stock <= 5 && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">LOW</span>}
                        </div>
                    </td>
                    <td className="py-3 px-5"/><td className="py-3 px-5"/>
                </tr>
            ))}
        </>
    );
};

// ─── LOW STOCK ALERT BANNER ───────────────────────────────────────────────────
const LowStockBanner = ({ lowStockProducts, outOfStockProducts, onDismiss, onFilterLow }) => {
    const outCount = outOfStockProducts.length;
    const lowCount = lowStockProducts.length;

    return (
        <div className="rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-red-500/10 overflow-hidden">
            {/* Header row */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-orange-500/20">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-orange-500/20 border border-orange-500/40 rounded-xl flex items-center justify-center">
                        <FiBell size={15} className="text-orange-400"/>
                    </div>
                    <div>
                        <p className="text-orange-300 font-black text-sm">Stock Alert</p>
                        <p className="text-orange-400/70 text-[10px] font-semibold">
                            {outCount > 0 && `${outCount} size${outCount > 1 ? 's' : ''} out of stock`}
                            {outCount > 0 && lowCount > 0 && ' · '}
                            {lowCount > 0 && `${lowCount} size${lowCount > 1 ? 's' : ''} running low (≤5)`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onFilterLow}
                        className="text-[11px] font-bold text-orange-300 hover:text-white border border-orange-500/30 hover:border-orange-400 bg-orange-500/10 hover:bg-orange-500/20 px-3 py-1.5 rounded-lg transition-all">
                        View Affected
                    </button>
                    <button onClick={onDismiss} className="p-1.5 text-orange-400/60 hover:text-orange-300 rounded-lg transition-all">
                        <FiX size={15}/>
                    </button>
                </div>
            </div>

            {/* Product chips */}
            <div className="px-5 py-3 flex flex-wrap gap-2">
                {[...outOfStockProducts, ...lowStockProducts.filter(p => !outOfStockProducts.find(o => o._id === p._id))]
                    .slice(0, 8)
                    .map(p => {
                        const lowSizes = getLowStockDetails(p);
                        const hasOut   = lowSizes.some(s => s.stock <= 0);
                        return (
                            <div key={p._id}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold
                                    ${hasOut
                                        ? 'bg-red-500/10 border-red-500/25 text-red-300'
                                        : 'bg-orange-500/10 border-orange-500/25 text-orange-300'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${hasOut ? 'bg-red-400' : 'bg-orange-400'}`}/>
                                <span className="max-w-[120px] truncate">{p.name}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black ml-1
                                    ${hasOut ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                    {lowSizes.map(s => `${s.size}:${s.stock}`).join(' ')}
                                </span>
                            </div>
                        );
                    })}
                {(outOfStockProducts.length + lowStockProducts.length) > 8 && (
                    <span className="px-2.5 py-1.5 rounded-xl border border-slate-700 text-slate-400 text-[11px] font-bold bg-slate-800/50">
                        +{outOfStockProducts.length + lowStockProducts.length - 8} more
                    </span>
                )}
            </div>
        </div>
    );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const AdminInventory = () => {
    const [products,         setProducts]         = useState([]);
    const [search,           setSearch]           = useState('');
    const [categoryFilter,   setCategoryFilter]   = useState('All');
    const [viewMode,         setViewMode]         = useState('table');
    const [showAddModal,     setShowAddModal]     = useState(false);
    const [showEditModal,    setShowEditModal]    = useState(false);
    const [showBarcodeModal, setShowBarcodeModal] = useState(null);
    const [deleteTarget,     setDeleteTarget]     = useState(null);
    const [selectedProduct,  setSelectedProduct]  = useState(null);
    const [msg,              setMsg]              = useState({ text:'', type:'' });
    const [isLoading,        setIsLoading]        = useState(false);
    const [productForm,      setProductForm]      = useState(BLANK_FORM);
    const [editForm,         setEditForm]         = useState(BLANK_FORM);
    const [showAlertBanner,  setShowAlertBanner]  = useState(true);
    const [stockFilter,      setStockFilter]      = useState('All'); // 'All' | 'low'

    const [addImageFile,     setAddImageFile]     = useState(null);
    const [addImagePreview,  setAddImagePreview]  = useState(null);
    const [editImageFile,    setEditImageFile]    = useState(null);
    const [editImagePreview, setEditImagePreview] = useState(null);

    useEffect(() => { fetchProducts(); }, []);

    const fetchProducts = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('https://clothing-inventory-bbhg.onrender.com/api/admin/products').catch(() => ({ data: [] }));
            setProducts(res.data || []);
            setShowAlertBanner(true); // re-show banner on refresh
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    };

    const notify = (text, type) => { setMsg({ text, type }); setTimeout(() => setMsg({ text:'', type:'' }), 3500); };

    const regenerateSKUs = (form, setFormFn) => {
        const newSizes = { ...form.sizes };
        SIZES.forEach(size => { newSizes[size] = { ...newSizes[size], sku: generateSKU(form.category, form.name, size) }; });
        setFormFn(f => ({ ...f, sizes: newSizes }));
    };

    const makeImageHandler = (setFile, setPreview) => (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { notify('Image must be under 5MB.', 'error'); return; }
        setFile(file);
        const reader = new FileReader();
        reader.onload = ev => setPreview(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        if (!SIZES.some(s => Number(productForm.sizes[s]?.stock) > 0)) { notify('Add stock for at least one size.', 'error'); return; }
        try {
            const variants   = SIZES.filter(s => Number(productForm.sizes[s]?.stock) > 0)
                .map(s => ({ size:s, sku:productForm.sizes[s].sku || generateSKU(productForm.category, productForm.name, s), stock:Number(productForm.sizes[s].stock) }));
            const totalStock = variants.reduce((a, b) => a + b.stock, 0);
            const formData = new FormData();
            formData.append('name', productForm.name);
            formData.append('category', productForm.category);
            formData.append('costPrice', productForm.costPrice);
            formData.append('price', productForm.price);
            formData.append('color', productForm.color);
            formData.append('description', productForm.description);
            formData.append('sku', variants[0]?.sku || '');
            formData.append('stock', totalStock);
            formData.append('variants', JSON.stringify(variants));
            formData.append('totalStock', totalStock);
            formData.append('isAvailable', true);
            if (addImageFile) formData.append('image', addImageFile);
            await axios.post('https://clothing-inventory-bbhg.onrender.com/api/admin/add-product', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            notify('✅ Product Added Successfully!', 'success');
            setShowAddModal(false);
            setProductForm(BLANK_FORM);
            setAddImageFile(null); setAddImagePreview(null);
            fetchProducts();
        } catch { notify('Failed to add product', 'error'); }
    };

    const openEditModal = (product) => {
        setSelectedProduct(product);
        const sizes = blankSizes();
        if (product.variants?.length) {
            product.variants.forEach(v => { sizes[v.size] = { stock: v.stock, sku: v.sku }; });
        } else {
            sizes['M'] = { stock: product.stock || 0, sku: product.sku || generateSKU(product.category, product.name, 'M') };
        }
        setEditForm({ name:product.name||'', category:product.category||'', costPrice:product.costPrice||'', price:product.price||'', color:product.color||'', description:product.description||'', sizes });
        setEditImagePreview(product.image || null);
        setEditImageFile(null);
        setShowEditModal(true);
    };

    const handleEditProduct = async (e) => {
        e.preventDefault();
        try {
            const variants   = SIZES.filter(s => Number(editForm.sizes[s]?.stock) > 0 || editForm.sizes[s]?.sku)
                .map(s => ({ size:s, sku:editForm.sizes[s]?.sku || generateSKU(editForm.category, editForm.name, s), stock:Number(editForm.sizes[s]?.stock || 0) }));
            const totalStock = variants.reduce((a, b) => a + b.stock, 0);
            const formData = new FormData();
            formData.append('name', editForm.name);
            formData.append('category', editForm.category);
            formData.append('costPrice', editForm.costPrice);
            formData.append('price', editForm.price);
            formData.append('color', editForm.color);
            formData.append('description', editForm.description);
            formData.append('sku', variants[0]?.sku || '');
            formData.append('stock', totalStock);
            formData.append('variants', JSON.stringify(variants));
            formData.append('totalStock', totalStock);
            if (editImageFile) formData.append('image', editImageFile);
            if (!editImagePreview && !editImageFile) formData.append('removeImage', 'true');
            await axios.put(`https://clothing-inventory-bbhg.onrender.com/api/admin/edit-product/${selectedProduct._id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            notify('✅ Product Updated!', 'success');
            setShowEditModal(false);
            setEditImageFile(null); setEditImagePreview(null);
            fetchProducts();
        } catch { notify('Failed to update product', 'error'); }
    };

    const handleDeleteProduct = async () => {
        if (!deleteTarget) return;
        try {
            await axios.delete(`https://clothing-inventory-bbhg.onrender.com/api/admin/delete-product/${deleteTarget._id}`);
            notify('Product Deleted', 'success'); setDeleteTarget(null); fetchProducts();
        } catch { notify('Failed to delete', 'error'); }
    };

    const toggleStatus = async (id) => {
        try {
            await axios.put(`https://clothing-inventory-bbhg.onrender.com/api/admin/product-status/${id}`);
            setProducts(prev => prev.map(p => p._id === id ? { ...p, isAvailable: !p.isAvailable } : p));
        } catch { notify('Failed to update status', 'error'); }
    };

    // ── Computed low/out stock lists ───────────────────────────────────────────
    // LOW: any size variant with stock > 0 AND <= 5
    const lowStockProducts  = products.filter(p => {
        const variants = p.variants || [];
        return variants.length > 0
            ? variants.some(v => Number(v.stock || 0) > 0 && Number(v.stock || 0) <= 5)
            : Number(p.stock || 0) > 0 && Number(p.stock || 0) <= 5;
    });
    // OUT: any size with stock === 0 (and product has variants)
    const outOfStockProducts = products.filter(p => {
        const variants = p.variants || [];
        return variants.length > 0
            ? variants.some(v => Number(v.stock || 0) <= 0)
            : Number(p.stock || 0) <= 0;
    });

    const lowStockCount = lowStockProducts.length + outOfStockProducts.length; // total affected products

    // ── Filters ────────────────────────────────────────────────────────────────
    const filtered = products.filter(p => {
        const q = search.toLowerCase();
        const matchSearch =
            (p.name || '').toLowerCase().includes(q) ||
            (p.sku  || '').toLowerCase().includes(q) ||
            (p.variants || []).some(v => (v.sku || '').toLowerCase().includes(q));
        const matchCat   = categoryFilter === 'All' || p.category === categoryFilter;
        const matchStock = stockFilter === 'All' || isProductLowStock(p);
        return matchSearch && matchCat && matchStock;
    });

    const totalUnits = products.reduce((a, p) => {
        const variants = p.variants || [];
        return a + (variants.length > 0 ? variants.reduce((s, v) => s + Number(v.stock || 0), 0) : Number(p.stock || 0));
    }, 0);

    const showBanner = showAlertBanner && (lowStockProducts.length > 0 || outOfStockProducts.length > 0);

    return (
        <div className="space-y-5 relative">

            {/* TOAST */}
            {msg.text && (
                <div className={`fixed top-6 right-6 z-[200] px-5 py-3.5 rounded-xl font-bold text-white flex items-center gap-2.5 shadow-2xl text-sm
                    ${msg.type === 'success' ? 'bg-emerald-600 border border-emerald-500' : 'bg-red-600 border border-red-500'}`}>
                    {msg.type === 'success' ? <FiCheckCircle size={16}/> : <FiAlertCircle size={16}/>} {msg.text}
                </div>
            )}

            {/* ── LOW STOCK ALERT BANNER ── */}
            {showBanner && (
                <LowStockBanner
                    lowStockProducts={lowStockProducts}
                    outOfStockProducts={outOfStockProducts}
                    onDismiss={() => setShowAlertBanner(false)}
                    onFilterLow={() => setStockFilter(f => f === 'low' ? 'All' : 'low')}
                />
            )}

            {/* STATS — 4 equal cards, consistent height */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label:'Total Products',  value:products.length,                                   color:'indigo',  icon:<FiPackage size={18}/>    },
                    { label:'Total Units',     value:totalUnits.toLocaleString('en-IN'),                color:'blue',    icon:<FiLayers size={18}/>     },
                    { label:'Low / Out Stock', value:lowStockCount, color:lowStockCount>0?'red':'emerald', icon:<FiAlertTriangle size={18}/> },
                    { label:'Active Listings', value:products.filter(p=>p.isAvailable!==false).length, color:'emerald', icon:<FiCheckCircle size={18}/> },
                ].map(s => {
                    const isLowCard  = s.label === 'Low / Out Stock';
                    const clickable  = isLowCard && lowStockCount > 0;
                    const colorClass = s.color === 'indigo'  ? 'border-indigo-500/25 text-indigo-400'
                                     : s.color === 'blue'    ? 'border-blue-500/25 text-blue-400'
                                     : s.color === 'red'     ? 'border-red-500/25 text-red-400'
                                     :                         'border-emerald-500/25 text-emerald-400';
                    return (
                        <div key={s.label}
                            onClick={clickable ? () => setStockFilter(f => f === 'low' ? 'All' : 'low') : undefined}
                            className={`h-24 px-5 rounded-2xl border flex items-center gap-4 bg-[#0f172a] transition-all select-none
                                ${clickable ? 'cursor-pointer hover:brightness-110 active:scale-[0.98]' : ''}
                                ${colorClass}`}>
                            {/* Icon box */}
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border
                                ${s.color==='indigo' ? 'bg-indigo-500/10 border-indigo-500/20'
                                : s.color==='blue'   ? 'bg-blue-500/10 border-blue-500/20'
                                : s.color==='red'    ? 'bg-red-500/10 border-red-500/20'
                                :                      'bg-emerald-500/10 border-emerald-500/20'}
                                ${isLowCard && lowStockCount > 0 ? 'animate-pulse' : ''}`}>
                                {s.icon}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5 truncate">{s.label}</p>
                                <p className="text-2xl font-black text-white leading-none">{s.value}</p>
                                {isLowCard && lowStockCount > 0 && (
                                    <p className="text-[10px] text-orange-400 font-semibold mt-1">
                                        {outOfStockProducts.length > 0 && `${outOfStockProducts.length} out`}
                                        {outOfStockProducts.length > 0 && lowStockProducts.length > 0 && ' · '}
                                        {lowStockProducts.length > 0 && `${lowStockProducts.length} low`}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── CONTROLS — Row 1: search + actions ── */}
            <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative group flex-1 max-w-xs">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={15}/>
                    <input
                        type="text"
                        placeholder="Search name, SKU…"
                        className="w-full h-9 bg-[#1e293b] border border-slate-700 rounded-xl pl-9 pr-4 text-white text-sm outline-none focus:border-indigo-500 transition-all"
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {/* Spacer */}
                <div className="flex-1"/>

                {/* View toggle */}
                <div className="flex bg-[#0f172a] border border-slate-800 rounded-xl p-1 gap-0.5">
                    <button
                        onClick={() => setViewMode('table')}
                        title="Table view"
                        className={`w-8 h-7 flex items-center justify-center rounded-lg transition-all
                            ${viewMode==='table' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                        <FiList size={15}/>
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        title="Grid view"
                        className={`w-8 h-7 flex items-center justify-center rounded-lg transition-all
                            ${viewMode==='grid' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                        <FiGrid size={15}/>
                    </button>
                </div>

                {/* Refresh */}
                <button
                    onClick={fetchProducts}
                    title="Refresh inventory"
                    className={`w-9 h-9 flex items-center justify-center bg-[#1e293b] border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 rounded-xl transition-all
                        ${isLoading ? 'animate-spin pointer-events-none opacity-60' : ''}`}>
                    <FiRefreshCw size={15}/>
                </button>

                {/* Add Product */}
                <button
                    onClick={() => { setProductForm(BLANK_FORM); setAddImageFile(null); setAddImagePreview(null); setShowAddModal(true); }}
                    className="h-9 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-sm font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-900/30 transition-all whitespace-nowrap">
                    <FiPlus size={15}/> Add Product
                </button>
            </div>

            {/* ── CONTROLS — Row 2: category + stock filters ── */}
            <div className="flex items-center gap-2 flex-wrap">
                {/* Category pills */}
                <div className="flex items-center gap-1 bg-[#0f172a] border border-slate-800 rounded-xl p-1">
                    <button
                        onClick={() => setCategoryFilter('All')}
                        className={`px-3 h-7 rounded-lg text-xs font-bold transition-all
                            ${categoryFilter==='All' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-200'}`}>
                        All
                    </button>
                    {CATEGORIES.map(c => (
                        <button
                            key={c.value}
                            onClick={() => setCategoryFilter(c.value)}
                            className={`px-3 h-7 rounded-lg text-xs font-bold transition-all
                                ${categoryFilter===c.value ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-200'}`}>
                            {c.label}
                        </button>
                    ))}
                </div>

                {/* Divider */}
                <div className="w-px h-6 bg-slate-700 mx-1"/>

                {/* Low stock filter */}
                <button
                    onClick={() => setStockFilter(f => f === 'low' ? 'All' : 'low')}
                    className={`h-9 px-3 flex items-center gap-2 rounded-xl text-xs font-bold border transition-all
                        ${stockFilter === 'low'
                            ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                            : 'bg-[#0f172a] border-slate-800 text-slate-500 hover:text-slate-200 hover:border-slate-600'}`}>
                    <FiAlertTriangle size={12}/>
                    Low Stock
                    {lowStockCount > 0 && (
                        <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center
                            ${stockFilter === 'low' ? 'bg-orange-500/50 text-orange-100' : 'bg-orange-500/25 text-orange-400'}`}>
                            {lowStockCount}
                        </span>
                    )}
                </button>

                {/* Active filter chip */}
                {stockFilter === 'low' && (
                    <div className="flex items-center gap-1.5 h-9 px-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                        <span className="text-orange-300 text-xs font-semibold">
                            {filtered.length} product{filtered.length !== 1 ? 's' : ''} affected
                        </span>
                        <button
                            onClick={() => setStockFilter('All')}
                            className="text-orange-400 hover:text-white ml-1 transition-colors">
                            <FiX size={12}/>
                        </button>
                    </div>
                )}
            </div>

            {/* ── TABLE VIEW ── */}
            {viewMode === 'table' && (
                <div className="bg-[#1e293b] rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
                    <div className="px-5 h-10 border-b border-slate-800 flex items-center gap-4 bg-[#131c31]">
                        <span className="text-[10px] text-slate-600 font-medium tracking-wide">↕ Click row to expand sizes</span>
                        <div className="flex items-center gap-4 ml-auto">
                            {[['bg-emerald-400','In Stock'],['bg-orange-400','Low (≤5)'],['bg-red-500','Out']].map(([dot,lbl]) => (
                                <span key={lbl} className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                                    <span className={`w-1.5 h-1.5 rounded-full ${dot}`}/>{lbl}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#0f172a] text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-700/80">
                                <tr>
                                    {['Product','SKU / Barcodes','Category','Price','Size Stock','Active','Actions'].map((h, i) => (
                                        <th key={h} className={`px-5 py-3 ${i===5?'text-center':''} ${i===6?'text-right':''}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50 text-sm text-slate-300">
                                {isLoading ? (
                                    <tr><td colSpan="7" className="p-12 text-center text-slate-500">Loading inventory...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan="7" className="p-12 text-center text-slate-500">No products found.</td></tr>
                                ) : filtered.map(p => (
                                    <ProductTableRow key={p._id} p={p} stockColor={stockColor}
                                        onBarcode={setShowBarcodeModal} onEdit={openEditModal}
                                        onDelete={setDeleteTarget} onToggle={toggleStatus}/>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── GRID VIEW ── */}
            {viewMode === 'grid' && (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filtered.map(p => {
                        const variants   = p.variants || [];
                        const totalStock = variants.length > 0
                            ? variants.reduce((a, v) => a + Number(v.stock || 0), 0) : Number(p.stock || 0);
                        const hasLow     = isProductLowStock(p);
                        return (
                            <div key={p._id} className={`bg-[#1e293b] rounded-2xl border overflow-hidden hover:border-indigo-500/40 transition-all group
                                ${hasLow ? 'border-orange-500/40' : 'border-slate-700'}`}>
                                <div className="h-40 bg-[#0f172a] overflow-hidden relative">
                                    {p.image ? (
                                        <img src={p.image} alt={p.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            onError={e => { e.target.onerror = null; e.target.style.display = 'none'; }}/>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-700">
                                            <FiImage size={28} className="opacity-30"/>
                                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">No Image</span>
                                        </div>
                                    )}
                                    {hasLow && (
                                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-orange-500/90 text-white text-[10px] font-black px-2 py-1 rounded-lg">
                                            <FiAlertTriangle size={10}/> LOW STOCK
                                        </div>
                                    )}
                                </div>
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-slate-800 text-slate-400 border border-slate-700">{p.category}</span>
                                        <ToggleSwitch checked={p.isAvailable !== false} onChange={() => toggleStatus(p._id)}/>
                                    </div>
                                    <h4 className="font-black text-white text-base leading-tight mb-0.5">{p.name}</h4>
                                    {p.color && <p className="text-[10px] text-slate-500 mb-3">{p.color}</p>}
                                    <p className="text-2xl font-black text-emerald-400 mb-3">₹{Number(p.price || 0).toFixed(2)}</p>

                                    {variants.length > 0 ? (
                                        <>
                                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2">Stock per size</p>
                                            <div className="grid grid-cols-3 gap-1.5 mb-4">
                                                {SIZES.map(size => {
                                                    const v = variants.find(x => x.size === size);
                                                    if (!v) return (
                                                        <div key={size} className="text-center py-2 rounded-lg bg-slate-800/30 border border-slate-700/30">
                                                            <p className="text-[9px] font-black text-slate-600">{size}</p>
                                                            <p className="text-[9px] text-slate-700 font-bold">—</p>
                                                        </div>
                                                    );
                                                    return (
                                                        <div key={size} className={`text-center py-2 rounded-lg border ${stockColor(v.stock)}`}>
                                                            <p className="text-[9px] font-black">{size}</p>
                                                            <p className="text-sm font-black">{v.stock}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="flex items-center justify-between mb-3 px-1">
                                                <span className="text-[10px] text-slate-500 font-bold">Total</span>
                                                <span className={`text-sm font-black ${totalStock <= 0 ? 'text-red-400' : totalStock <= 10 ? 'text-orange-400' : 'text-white'}`}>{totalStock} units</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className={`flex items-center justify-between p-3 rounded-xl border mb-4 ${stockColor(totalStock)}`}>
                                            <span className="text-xs font-black">Stock</span>
                                            <span className="text-lg font-black">{totalStock} units</span>
                                        </div>
                                    )}

                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => setShowBarcodeModal(p)} className="flex-1 py-2 text-xs font-bold bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-lg transition-all flex items-center justify-center gap-1">
                                            <BiBarcodeReader size={13}/> Barcodes
                                        </button>
                                        <button onClick={() => openEditModal(p)}   className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all"><FiEdit2 size={14}/></button>
                                        <button onClick={() => setDeleteTarget(p)} className="p-2 bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-400 rounded-lg transition-all"><FiTrash2 size={14}/></button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* BARCODE MODAL */}
            {showBarcodeModal && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[#0f172a] rounded-2xl w-full max-w-2xl border border-slate-700 shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#1e293b]">
                            <div>
                                <h3 className="text-xl font-black text-white flex items-center gap-2"><BiBarcodeReader className="text-indigo-400"/> Barcode Sheet</h3>
                                <p className="text-slate-400 text-sm mt-0.5">{showBarcodeModal.name} — All Size Variants</p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-all"><FiDownload size={14}/> Print Sheet</button>
                                <button onClick={() => setShowBarcodeModal(null)} className="text-slate-400 hover:text-white p-2 bg-slate-800 rounded-xl"><FiX size={20}/></button>
                            </div>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[70vh]">
                            <div className="bg-[#1e293b] rounded-xl p-4 mb-6 flex justify-between items-center border border-slate-700">
                                <div>
                                    <p className="font-black text-white text-lg">{showBarcodeModal.name}</p>
                                    <p className="text-slate-400 text-sm">{showBarcodeModal.category} • ₹{Number(showBarcodeModal.price || 0).toFixed(2)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Units</p>
                                    <p className="text-3xl font-black text-white">
                                        {(showBarcodeModal.variants || []).reduce((a, v) => a + Number(v.stock || 0), 0) || showBarcodeModal.stock || 0}
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {(showBarcodeModal.variants?.length
                                    ? showBarcodeModal.variants
                                    : [{ size:'ONE SIZE', sku:showBarcodeModal.sku, stock:showBarcodeModal.stock }]
                                ).map(v => (
                                    <div key={v.size} className="bg-[#1e293b] border border-slate-700 rounded-xl p-5 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl font-black text-white">{v.size}</span>
                                                <span className={`text-xs font-bold px-2 py-1 rounded-md border ${stockColor(v.stock)}`}>{v.stock} in stock</span>
                                            </div>
                                            <FiTag className="text-slate-600"/>
                                        </div>
                                        <div className="bg-white rounded-lg p-3 flex flex-col items-center"><BarcodeDisplay sku={v.sku} size="lg"/></div>
                                        <div className="bg-[#0f172a] rounded-lg p-3">
                                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Full SKU</p>
                                            <p className="font-mono text-xs text-indigo-400 font-bold break-all">{v.sku}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD MODAL */}
            {showAddModal && (
                <ProductForm form={productForm} setForm={setProductForm}
                    onSubmit={handleAddProduct}
                    onClose={() => { setShowAddModal(false); setAddImageFile(null); setAddImagePreview(null); }}
                    title="Add New Product" submitLabel="+ Add Product to Inventory"
                    submitColor="bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25"
                    regenerateSKUs={regenerateSKUs}
                    imagePreview={addImagePreview}
                    onImageChange={makeImageHandler(setAddImageFile, setAddImagePreview)}
                    onImageClear={() => { setAddImageFile(null); setAddImagePreview(null); }}/>
            )}

            {/* EDIT MODAL */}
            {showEditModal && (
                <ProductForm form={editForm} setForm={setEditForm}
                    onSubmit={handleEditProduct}
                    onClose={() => { setShowEditModal(false); setEditImageFile(null); setEditImagePreview(null); }}
                    title="Edit Product" submitLabel="Save Changes"
                    submitColor="bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/25"
                    regenerateSKUs={regenerateSKUs}
                    imagePreview={editImagePreview}
                    onImageChange={makeImageHandler(setEditImageFile, setEditImagePreview)}
                    onImageClear={() => { setEditImageFile(null); setEditImagePreview(null); }}/>
            )}

            {/* DELETE MODAL */}
            {deleteTarget && (
                <DeleteModal product={deleteTarget} onConfirm={handleDeleteProduct} onCancel={() => setDeleteTarget(null)}/>
            )}
        </div>
    );
};

export default AdminInventory;