import React, { useEffect, useState } from 'react';
import {
  CategoryItem,
  OrderRecord,
  ProductItem,
  formatRupiah,
} from '../data/posData';
import { StoreBrandingSettings } from '../data/i18nAndSettings';
import { BrandLogo } from './PosIllustrations';
import {
  CreditCard,
  Download,
  FileText,
  Printer,
  Receipt,
  User,
  X,
} from 'lucide-react';

/**
 * Helper to print HTML content cleanly inside an iframe (never uses window.open)
 */
export function triggerIframePrint(htmlString: string) {
  const existingFrame = document.getElementById('pos-print-iframe');
  if (existingFrame) {
    existingFrame.remove();
  }
  const iframe = document.createElement('iframe');
  iframe.id = 'pos-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(htmlString);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 180);
  }
}

export type ThermalPaperWidth = '80mm' | '58mm';

/**
 * Builds clean ESC/POS-style HTML formatted specifically for 80mm or 58mm Thermal Receipt Printers
 */
export function buildThermalReceiptHtml(
  order: OrderRecord,
  storeSettings: StoreBrandingSettings,
  cashierName: string,
  options?: {
    paperWidth?: ThermalPaperWidth;
    customerNameOverride?: string;
    paymentMethodOverride?: string;
    footerNoteOverride?: string;
  }
): string {
  const isId = storeSettings.language === 'id';
  const paperWidth = options?.paperWidth || '80mm';
  const bodyWidth = paperWidth === '58mm' ? '48mm' : '72mm';
  const fontSize = paperWidth === '58mm' ? '11px' : '12px';

  const totalQty = order.items.reduce((sum, it) => sum + it.quantity, 0);
  const taxTitle = `${storeSettings.taxName || 'PBF'} (${
    storeSettings.taxEnabled !== false ? (storeSettings.taxRate ?? 5) : 0
  }%)`;

  const displayCustomer =
    options?.customerNameOverride !== undefined
      ? options.customerNameOverride.trim()
      : (order.customerName || '').trim();
  const displayPayment =
    options?.paymentMethodOverride !== undefined
      ? options.paymentMethodOverride.trim()
      : (order.paymentMethod || (isId ? 'Tunai' : 'Cash')).trim();
  const displayNote =
    options?.footerNoteOverride !== undefined &&
    options.footerNoteOverride.trim()
      ? options.footerNoteOverride.trim()
      : isId
      ? 'Terima kasih atas kunjungan Anda!'
      : 'Thank you for your order!';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Struk_${order.orderId}</title>
  <style>
    @page {
      size: ${paperWidth} auto;
      margin: 0mm;
    }
    @media print {
      html, body {
        width: ${paperWidth};
        margin: 0 !important;
        padding: 0 !important;
      }
    }
    body {
      font-family: 'Courier New', Courier, monospace;
      width: ${bodyWidth};
      margin: 0 auto;
      padding: 4mm 2mm;
      color: #000000;
      background: #FFFFFF;
      font-size: ${fontSize};
      line-height: 1.42;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 7px 0; }
    .double-divider { border-top: 2px solid #000; margin: 7px 0; }
    .row { display: flex; justify-content: space-between; margin: 2.5px 0; gap: 6px; }
    .item-name { font-weight: bold; margin-top: 4px; word-break: break-word; }
    .total-row { font-size: ${paperWidth === '58mm' ? '13px' : '14px'}; font-weight: bold; margin-top: 5px; }
  </style>
</head>
<body>
  <div class="center">
    <div class="bold" style="font-size:${paperWidth === '58mm' ? '14px' : '16px'};">${storeSettings.storeName}</div>
    <div style="font-size:${paperWidth === '58mm' ? '10px' : '11px'};">${storeSettings.storeTagline}</div>
  </div>
  <div class="double-divider"></div>
  <div class="row"><span>No. Order:</span><span class="bold">${order.orderId}</span></div>
  <div class="row"><span>Tanggal:</span><span>${order.createdAt}</span></div>
  <div class="row"><span>Kasir:</span><span>${order.cashierName || cashierName}</span></div>
  ${
    displayCustomer
      ? `<div class="row"><span>${isId ? 'Pelanggan:' : 'Customer:'}</span><span class="bold">${displayCustomer}</span></div>`
      : ''
  }
  ${
    displayPayment
      ? `<div class="row"><span>${isId ? 'Metode Bayar:' : 'Payment:'}</span><span class="bold">${displayPayment}</span></div>`
      : ''
  }
  <div class="divider"></div>
  ${order.items
    .map(
      (item) => `
    <div class="item-name">${item.name}</div>
    <div class="row">
      <span>${item.quantity} x ${formatRupiah(item.price)}</span>
      <span class="bold">${formatRupiah(item.subtotal)}</span>
    </div>
  `
    )
    .join('')}
  <div class="divider"></div>
  <div class="row"><span>Sub Total (${totalQty} item)</span><span>${formatRupiah(order.subTotal)}</span></div>
  <div class="row"><span>${taxTitle}</span><span>${formatRupiah(order.taxPbf)}</span></div>
  <div class="double-divider"></div>
  <div class="row total-row"><span>TOTAL BAYAR</span><span>${formatRupiah(order.total)}</span></div>
  <div class="divider"></div>
  <div class="center" style="margin-top:8px;font-size:${paperWidth === '58mm' ? '10px' : '11px'};">
    ${displayNote}
  </div>
</body>
</html>`;
}

/**
 * Immediately sends the thermal receipt to the printer when clicking 'Bayar' (Charge)
 */
export function printThermalReceiptNow(
  order: OrderRecord,
  storeSettings: StoreBrandingSettings,
  cashierName: string,
  paperWidth: ThermalPaperWidth = '80mm'
) {
  const html = buildThermalReceiptHtml(order, storeSettings, cashierName, {
    paperWidth,
  });
  triggerIframePrint(html);
}

export interface PrintPreviewModalProps {
  order: OrderRecord | null;
  storeSettings: StoreBrandingSettings;
  cashierName: string;
  onClose: () => void;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  order,
  storeSettings,
  cashierName,
  onClose,
}) => {
  const isId = storeSettings.language === 'id';
  const primaryColor = storeSettings.primaryColor || '#FF2457';

  const [paperWidth, setPaperWidth] = useState<ThermalPaperWidth>('80mm');
  const [editableCustomer, setEditableCustomer] = useState<string>('');
  const [editablePayment, setEditablePayment] = useState<string>('');
  const [customNote, setCustomNote] = useState<string>('');

  useEffect(() => {
    if (order) {
      setEditableCustomer(order.customerName || '');
      setEditablePayment(
        order.paymentMethod || (isId ? 'Tunai' : 'Cash')
      );
      setCustomNote(
        isId
          ? 'Terima kasih atas kunjungan Anda!'
          : 'Thank you for your order!'
      );
    }
  }, [order, isId]);

  if (!order) return null;

  const totalQty = order.items.reduce((sum, it) => sum + it.quantity, 0);
  const taxTitle = `${storeSettings.taxName || 'PBF'} (${
    storeSettings.taxEnabled !== false ? (storeSettings.taxRate ?? 5) : 0
  }%)`;

  const displayCustomer = editableCustomer.trim();
  const displayPayment = editablePayment.trim();
  const displayNote =
    customNote.trim() ||
    (isId
      ? 'Terima kasih atas kunjungan Anda!'
      : 'Thank you for your order!');

  const handlePrint = () => {
    const html = buildThermalReceiptHtml(order, storeSettings, cashierName, {
      paperWidth,
      customerNameOverride: displayCustomer,
      paymentMethodOverride: displayPayment,
      footerNoteOverride: displayNote,
    });
    triggerIframePrint(html);
  };

  const handleDownloadReceipt = () => {
    const html = buildThermalReceiptHtml(order, storeSettings, cashierName, {
      paperWidth,
      customerNameOverride: displayCustomer,
      paymentMethodOverride: displayPayment,
      footerNoteOverride: displayNote,
    });
    const blob = new Blob([html], {
      type: 'text/html;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Struk-Thermal-${paperWidth}-${order.orderId}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-modal-backdrop"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-[26px] sm:rounded-[30px] shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[94dvh] sm:max-h-[92vh] animate-modal-pop"
      >
        {/* Top Modal Header + Thermal Paper Size Selector (80mm / 58mm) */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#F8F9FA] border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              style={{
                backgroundColor: `${primaryColor}15`,
                color: primaryColor,
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0"
            >
              <Printer className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-xs sm:text-base text-[#2D3748] truncate">
                {isId
                  ? 'Pratinjau Cetak Struk Printer Thermal'
                  : 'Thermal Printer Receipt Preview'}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400 line-clamp-1">
                {isId
                  ? 'Periksa rincian struk thermal (80mm / 58mm) sebelum dikirim ke printer'
                  : 'Check thermal receipt details (80mm / 58mm) before sending to printer'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            {/* Thermal Paper Size Selector Tabs */}
            <div className="flex items-center bg-slate-200/70 p-1 rounded-xl text-[11px] sm:text-xs flex-1 sm:flex-initial">
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                style={
                  paperWidth === '80mm'
                    ? { backgroundColor: primaryColor, color: '#FFFFFF' }
                    : undefined
                }
                className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  paperWidth === '80mm'
                    ? 'shadow-2xs'
                    : 'text-slate-600 hover:text-[#2D3748]'
                }`}
              >
                <Receipt className="w-3.5 h-3.5 shrink-0" />
                <span>Thermal 80mm</span>
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                style={
                  paperWidth === '58mm'
                    ? { backgroundColor: primaryColor, color: '#FFFFFF' }
                    : undefined
                }
                className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  paperWidth === '58mm'
                    ? 'shadow-2xs'
                    : 'text-slate-600 hover:text-[#2D3748]'
                }`}
              >
                <Receipt className="w-3.5 h-3.5 shrink-0" />
                <span>Thermal 58mm</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer border border-slate-200/60 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Split Body: Left = Live Thermal Paper Roll Preview | Right = Details Check & Print Action */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 min-h-0">
          {/* LEFT 6 COLS: LIVE THERMAL RECEIPT (80mm / 58mm) PAPER PREVIEW */}
          <div className="lg:col-span-6 p-4 sm:p-6 bg-slate-100/75 flex items-start justify-center lg:overflow-y-auto">
            <div
              key={paperWidth}
              className={`animate-subview-transition bg-white mx-auto ${
                paperWidth === '58mm' ? 'max-w-[245px]' : 'max-w-[315px]'
              } w-full p-4 sm:p-5 rounded-xl shadow-md border border-slate-200/80 font-mono text-xs text-slate-800 space-y-3 transition-all`}
            >
              <div className="flex flex-col items-center text-center space-y-1">
                <BrandLogo
                  size="sm"
                  color={primaryColor}
                  logoType={storeSettings.logoType}
                  customLogoUrl={storeSettings.customLogoUrl}
                />
                <div className="font-extrabold text-sm text-[#2D3748] pt-1">
                  {storeSettings.storeName}
                </div>
                <div className="text-[11px] text-slate-400">
                  {storeSettings.storeTagline}
                </div>
              </div>

              <div className="border-t-2 border-slate-800 pt-2.5 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">No. Order:</span>
                  <span className="font-bold">{order.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    {isId ? 'Waktu:' : 'Date:'}
                  </span>
                  <span>{order.createdAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    {isId ? 'Kasir:' : 'Cashier:'}
                  </span>
                  <span>{order.cashierName || cashierName}</span>
                </div>
                {displayCustomer && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">
                      {isId ? 'Pelanggan:' : 'Customer:'}
                    </span>
                    <span className="font-bold text-[#2D3748]">
                      {displayCustomer}
                    </span>
                  </div>
                )}
                {displayPayment && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">
                      {isId ? 'Metode Bayar:' : 'Payment:'}
                    </span>
                    <span className="font-bold text-[#2D3748]">
                      {displayPayment}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2.5 space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-bold text-[#2D3748]">{item.name}</div>
                    <div className="flex justify-between text-[11px] text-slate-500 tabular-nums">
                      <span>
                        {item.quantity} x {formatRupiah(item.price)}
                      </span>
                      <span className="font-semibold text-[#2D3748]">
                        {formatRupiah(item.subtotal)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2.5 space-y-1 text-[11px] tabular-nums">
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Sub Total ({totalQty} item)
                  </span>
                  <span className="font-bold">
                    {formatRupiah(order.subTotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{taxTitle}</span>
                  <span>{formatRupiah(order.taxPbf)}</span>
                </div>
              </div>

              <div className="border-t-2 border-slate-800 pt-2.5 flex justify-between items-center text-sm font-extrabold text-[#2D3748] tabular-nums">
                <span>TOTAL BAYAR</span>
                <span style={{ color: primaryColor }}>
                  {formatRupiah(order.total)}
                </span>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-3 text-center text-[11px] text-slate-400">
                {displayNote}
              </div>
            </div>
          </div>

          {/* RIGHT 6 COLS: DOUBLE-CHECK DETAILS BEFORE SENDING TO THERMAL PRINTER */}
          <div className="lg:col-span-6 p-5 sm:p-6 bg-white flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-extrabold text-sm text-[#2D3748]">
                  {isId
                    ? 'Pemeriksaan Rincian Struk Thermal'
                    : 'Verify Thermal Receipt Details'}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isId
                    ? 'Pastikan rincian menu, nama pelanggan, dan metode bayar sudah sesuai sebelum dicetak:'
                    : 'Verify items, customer name, and payment method before printing:'}
                </p>
              </div>

              {/* Quick Summary Verification Box */}
              <div className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-slate-200/70 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">ID Order</span>
                  <span className="font-extrabold text-[#2D3748] font-mono">
                    {order.orderId}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">
                    {isId ? 'Ukuran Kertas Thermal' : 'Thermal Paper Size'}
                  </span>
                  <span className="font-bold text-[#2D3748]">
                    {paperWidth === '80mm'
                      ? '80mm (Standar Kasir)'
                      : '58mm (Mini Portable)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">
                    {isId ? 'Jumlah Menu' : 'Total Items'}
                  </span>
                  <span className="font-bold text-[#2D3748]">
                    {order.items.length}{' '}
                    {isId ? `menu (${totalQty} pcs)` : `items (${totalQty} qty)`}
                  </span>
                </div>
                <div className="border-t border-slate-200/80 pt-2 flex items-center justify-between">
                  <span className="font-extrabold text-[#2D3748]">
                    {isId ? 'Total Bayar' : 'Grand Total'}
                  </span>
                  <span
                    style={{ color: primaryColor }}
                    className="font-extrabold text-sm sm:text-base tabular-nums"
                  >
                    {formatRupiah(order.total)}
                  </span>
                </div>
              </div>

              {/* Editable Pre-Print Fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#2D3748] mb-1">
                    {isId
                      ? 'Nama Pelanggan pada Struk'
                      : 'Customer Name on Receipt'}
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={editableCustomer}
                      onChange={(e) => setEditableCustomer(e.target.value)}
                      placeholder={
                        isId
                          ? 'Opsional (Mis. Budi Santoso / Meja 4)'
                          : 'Optional (e.g., John / Table 4)'
                      }
                      className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl pl-8.5 pr-3 py-2 text-xs font-semibold text-[#2D3748] focus:outline-none focus:border-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#2D3748] mb-1">
                    {isId ? 'Metode Pembayaran' : 'Payment Method'}
                  </label>
                  <div className="relative">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={editablePayment}
                      onChange={(e) => setEditablePayment(e.target.value)}
                      placeholder="Tunai / QRIS / Debit / Transfer"
                      className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl pl-8.5 pr-3 py-2 text-xs font-semibold text-[#2D3748] focus:outline-none focus:border-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#2D3748] mb-1">
                    {isId ? 'Pesan Penutup Struk' : 'Receipt Footer Note'}
                  </label>
                  <input
                    type="text"
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder={
                      isId
                        ? 'Terima kasih atas kunjungan Anda!'
                        : 'Thank you for your visit!'
                    }
                    className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Print & Download Action Buttons */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleDownloadReceipt}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#2D3748] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isId ? 'Unduh Struk' : 'Download'}</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                style={{ backgroundColor: primaryColor }}
                className="flex-1 py-2.5 px-5 rounded-xl text-white text-xs font-extrabold shadow-md hover:opacity-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>
                  {isId
                    ? `Cetak ke Printer Thermal (${paperWidth})`
                    : `Print Thermal Receipt (${paperWidth})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Keep ReceiptPrintModal alias for compatibility
export const ReceiptPrintModal = PrintPreviewModal;

interface PdfReportModalProps {
  isOpen: boolean;
  orders: OrderRecord[];
  products: ProductItem[];
  categories: CategoryItem[];
  storeSettings: StoreBrandingSettings;
  onClose: () => void;
}

export const PdfReportModal: React.FC<PdfReportModalProps> = ({
  isOpen,
  orders,
  products,
  categories,
  storeSettings,
  onClose,
}) => {
  if (!isOpen) return null;

  const primaryColor = storeSettings.primaryColor || '#FF2457';
  const isId = storeSettings.language === 'id';

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const totalSubtotal = orders.reduce((s, o) => s + o.subTotal, 0);
  const totalTax = orders.reduce((s, o) => s + o.taxPbf, 0);
  const avgOrder = orders.length > 0 ? totalRevenue / orders.length : 0;

  // Build printable A4 PDF Report HTML
  const buildPdfReportHtml = () => `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Laporan_Penjualan_${storeSettings.storeName.replace(/\s+/g, '_')}</title>
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1E293B;
      margin: 0;
      padding: 0;
      font-size: 12px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid ${primaryColor};
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .store-title { font-size: 22px; font-weight: 800; color: #0F172A; }
    .store-sub { font-size: 12px; color: #64748B; margin-top: 2px; }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 22px;
    }
    .kpi-box {
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 12px;
      background: #F8FAFC;
    }
    .kpi-label { font-size: 11px; color: #64748B; font-weight: 600; }
    .kpi-val { font-size: 16px; font-weight: 800; color: #0F172A; margin-top: 4px; }
    h3 { font-size: 14px; font-weight: 800; margin: 18px 0 8px 0; color: #0F172A; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
    th, td { border: 1px solid #E2E8F0; padding: 8px 10px; text-align: left; font-size: 11px; }
    th { background: #F1F5F9; font-weight: 700; color: #334155; }
    .right { text-align: right; }
    .footer { margin-top: 28px; font-size: 10px; color: #94A3B8; text-align: center; border-top: 1px solid #E2E8F0; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="store-title">${storeSettings.storeName}</div>
      <div class="store-sub">${storeSettings.storeTagline}</div>
    </div>
    <div class="right">
      <div style="font-weight:800;font-size:14px;color:${primaryColor};">
        ${isId ? 'LAPORAN PENJUALAN & TRANSAKSI POS' : 'OFFICIAL POS SALES REPORT'}
      </div>
      <div class="store-sub">${isId ? 'Dicetak pada:' : 'Printed on:'} ${new Date().toLocaleString('id-ID')}</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-box">
      <div class="kpi-label">${isId ? 'Total Pendapatan' : 'Total Revenue'}</div>
      <div class="kpi-val">${formatRupiah(totalRevenue)}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">${isId ? 'Total Transaksi' : 'Total Orders'}</div>
      <div class="kpi-val">${orders.length} Pesanan</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">${isId ? 'Rata-rata Transaksi' : 'Average Order'}</div>
      <div class="kpi-val">${formatRupiah(avgOrder)}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-label">${isId ? 'Total Pajak PBF (5%)' : 'Total Tax (5%)'}</div>
      <div class="kpi-val">${formatRupiah(totalTax)}</div>
    </div>
  </div>

  <h3>${isId ? '1. Daftar Riwayat Transaksi Penjualan' : '1. Transaction History'}</h3>
  <table>
    <thead>
      <tr>
        <th>No</th>
        <th>ID Order</th>
        <th>${isId ? 'Waktu Transaksi' : 'Date & Time'}</th>
        <th>${isId ? 'Rincian Menu' : 'Items'}</th>
        <th class="right">Sub Total</th>
        <th class="right">PBF (5%)</th>
        <th class="right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${orders
        .map(
          (ord, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${ord.orderId}</strong></td>
          <td>${ord.createdAt}</td>
          <td>${ord.items.map((it) => `${it.quantity}x ${it.name}`).join(', ')}</td>
          <td class="right">${formatRupiah(ord.subTotal)}</td>
          <td class="right">${formatRupiah(ord.taxPbf)}</td>
          <td class="right"><strong>${formatRupiah(ord.total)}</strong></td>
        </tr>
      `
        )
        .join('')}
      <tr>
        <td colspan="4" class="right"><strong>TOTAL KESELURUHAN</strong></td>
        <td class="right"><strong>${formatRupiah(totalSubtotal)}</strong></td>
        <td class="right"><strong>${formatRupiah(totalTax)}</strong></td>
        <td class="right"><strong>${formatRupiah(totalRevenue)}</strong></td>
      </tr>
    </tbody>
  </table>

  <h3>${isId ? '2. Ringkasan Katalog Menu Aktif' : '2. Active Menu Catalog'} (${products.length} Menu, ${categories.length} Kategori)</h3>
  <table>
    <thead>
      <tr>
        <th>No</th>
        <th>${isId ? 'Nama Menu' : 'Product Name'}</th>
        <th>${isId ? 'Kategori' : 'Category'}</th>
        <th class="right">${isId ? 'Harga Satuan' : 'Unit Price'}</th>
      </tr>
    </thead>
    <tbody>
      ${products
        .map((p, i) => {
          const nonHot = p.categories.filter((c) => c.toLowerCase() !== 'hot');
          const rawList = nonHot.length > 0 ? nonHot : p.categories;
          const displayCats = rawList
            .map((raw) => {
              const found = categories.find(
                (c) =>
                  c.id.toLowerCase() === raw.toLowerCase() ||
                  c.name.toLowerCase() === raw.toLowerCase() ||
                  (c.nameEn && c.nameEn.toLowerCase() === raw.toLowerCase())
              );
              return found ? (isId ? found.name : found.nameEn || found.name) : raw;
            })
            .join(', ');
          return `
        <tr>
          <td>${i + 1}</td>
          <td>${p.name}</td>
          <td>${displayCats}</td>
          <td class="right">${formatRupiah(p.price)}</td>
        </tr>
      `;
        })
        .join('')}
    </tbody>
  </table>

  <div class="footer">
    ${storeSettings.storeName} · Official Point of Sale Report
  </div>
</body>
</html>`;

  const handlePrintPdf = () => {
    triggerIframePrint(buildPdfReportHtml());
  };

  const handleDownloadReportHtml = () => {
    const blob = new Blob([buildPdfReportHtml()], {
      type: 'text/html;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan-POS-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-modal-backdrop">
      <div className="bg-white rounded-t-[26px] sm:rounded-[28px] shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[94dvh] sm:max-h-[90vh] animate-modal-pop">
        {/* Top Modal Bar */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#F8F9FA] border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="w-5 h-5 shrink-0" style={{ color: primaryColor }} />
            <div className="min-w-0">
              <h3 className="font-extrabold text-xs sm:text-base text-[#2D3748] truncate">
                {isId
                  ? 'Laporan Penjualan & Transaksi POS (Siap Cetak PDF)'
                  : 'Official POS Sales & Transaction PDF Report'}
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400 line-clamp-1">
                {isId
                  ? 'Klik "Cetak / Simpan PDF" di bawah lalu pilih "Save as PDF" pada dialog cetak'
                  : 'Click "Print / Save as PDF" below and choose "Save as PDF"'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer shrink-0 border border-slate-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* A4 Report Preview Body */}
        <div className="p-3.5 sm:p-8 overflow-y-auto space-y-5 sm:space-y-6 bg-slate-50 flex-1">
          <div className="bg-white p-4 sm:p-8 rounded-2xl shadow-xs border border-slate-200/80 space-y-5 sm:space-y-6">
            {/* Report Header */}
            <div
              style={{ borderColor: primaryColor }}
              className="flex flex-wrap items-start justify-between gap-3 sm:gap-4 border-b-2 pb-4 sm:pb-5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <BrandLogo
                  size="md"
                  color={primaryColor}
                  logoType={storeSettings.logoType}
                  customLogoUrl={storeSettings.customLogoUrl}
                />
                <div className="min-w-0">
                  <h2 className="text-base sm:text-xl font-extrabold text-[#2D3748] truncate">
                    {storeSettings.storeName}
                  </h2>
                  <p className="text-xs text-slate-400 truncate">
                    {storeSettings.storeTagline}
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <span
                  style={{ color: primaryColor }}
                  className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider block"
                >
                  {isId ? 'Laporan Resmi Penjualan POS' : 'POS Sales Report'}
                </span>
                <span className="text-[11px] sm:text-xs text-slate-400">
                  {new Date().toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* KPI Summary Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="p-3 sm:p-3.5 rounded-xl bg-[#F8F9FA] border border-slate-100">
                <span className="text-[10px] sm:text-[11px] text-slate-400 font-semibold block truncate">
                  {isId ? 'Total Pendapatan' : 'Total Revenue'}
                </span>
                <span className="text-xs sm:text-base font-extrabold text-[#2D3748] tabular-nums block truncate mt-0.5">
                  {formatRupiah(totalRevenue)}
                </span>
              </div>
              <div className="p-3 sm:p-3.5 rounded-xl bg-[#F8F9FA] border border-slate-100">
                <span className="text-[10px] sm:text-[11px] text-slate-400 font-semibold block truncate">
                  {isId ? 'Total Pesanan' : 'Total Orders'}
                </span>
                <span className="text-xs sm:text-base font-extrabold text-[#2D3748] tabular-nums block truncate mt-0.5">
                  {orders.length} {isId ? 'Transaksi' : 'Orders'}
                </span>
              </div>
              <div className="p-3 sm:p-3.5 rounded-xl bg-[#F8F9FA] border border-slate-100">
                <span className="text-[10px] sm:text-[11px] text-slate-400 font-semibold block truncate">
                  {isId ? 'Rata-rata Transaksi' : 'Average Order'}
                </span>
                <span className="text-xs sm:text-base font-extrabold text-[#2D3748] tabular-nums block truncate mt-0.5">
                  {formatRupiah(avgOrder)}
                </span>
              </div>
              <div className="p-3 sm:p-3.5 rounded-xl bg-[#F8F9FA] border border-slate-100">
                <span className="text-[10px] sm:text-[11px] text-slate-400 font-semibold block truncate">
                  {isId ? 'Total Pajak PBF (5%)' : 'Total Tax (5%)'}
                </span>
                <span className="text-xs sm:text-base font-extrabold text-[#2D3748] tabular-nums block truncate mt-0.5">
                  {formatRupiah(totalTax)}
                </span>
              </div>
            </div>

            {/* Orders Table (Windowed to latest 100 in preview for zero lag) */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <h4 className="font-extrabold text-xs sm:text-sm text-[#2D3748]">
                  {isId
                    ? 'Rincian Transaksi Penjualan'
                    : 'Transaction History Breakdown'}
                </h4>
                {orders.length > 100 && (
                  <span className="text-[11px] font-semibold text-slate-400">
                    {isId
                      ? `Menampilkan 100 transaksi terbaru dari total ${orders.length} transaksi`
                      : `Showing latest 100 of ${orders.length} transactions`}
                  </span>
                )}
              </div>
              <div className="overflow-x-auto -mx-2 px-2">
                <table className="w-full min-w-[540px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600">
                      <th className="py-2.5 px-3 font-bold">No</th>
                      <th className="py-2.5 px-3 font-bold">ID Order</th>
                      <th className="py-2.5 px-3 font-bold">
                        {isId ? 'Waktu' : 'Date'}
                      </th>
                      <th className="py-2.5 px-3 font-bold">
                        {isId ? 'Item Pesanan' : 'Items'}
                      </th>
                      <th className="py-2.5 px-3 font-bold text-right">
                        Sub Total
                      </th>
                      <th className="py-2.5 px-3 font-bold text-right">
                        PBF 5%
                      </th>
                      <th className="py-2.5 px-3 font-bold text-right">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.slice(0, 100).map((ord, idx) => (
                      <tr key={ord.orderId}>
                        <td className="py-2 px-3">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-[#2D3748] whitespace-nowrap">
                          {ord.orderId}
                        </td>
                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                          {ord.createdAt}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {ord.items
                            .map((i) => `${i.quantity}x ${i.name}`)
                            .join(', ')}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums whitespace-nowrap">
                          {formatRupiah(ord.subTotal)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums whitespace-nowrap">
                          {formatRupiah(ord.taxPbf)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-[#2D3748] tabular-nums whitespace-nowrap">
                          {formatRupiah(ord.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={handleDownloadReportHtml}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#2D3748] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>{isId ? 'Unduh File Laporan' : 'Download Report File'}</span>
          </button>
          <button
            type="button"
            onClick={handlePrintPdf}
            style={{ backgroundColor: primaryColor }}
            className="px-6 py-2.5 rounded-xl text-white text-xs font-bold shadow-md hover:opacity-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>
              {isId ? 'Cetak / Simpan sebagai PDF' : 'Print / Save as PDF'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
