import React, { useMemo, useState } from 'react';
import {
  OrderRecord,
  ProductItem,
  formatRupiah,
  resolveGoogleDriveImageUrl,
} from '../data/posData';
import {
  Language,
  StoreBrandingSettings,
  TRANSLATIONS,
} from '../data/i18nAndSettings';
import {
  ArrowUpRight,
  BarChart3,
  DollarSign,
  FileText,
  Receipt,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';

interface SalesDashboardViewProps {
  orders: OrderRecord[];
  products: ProductItem[];
  storeSettings: StoreBrandingSettings;
  onOpenPdfReport: () => void;
}

type ChartPeriod = 'today' | '7days' | 'monthly' | 'yearly';

/**
 * Parses an Indonesian or standard date string (e.g. "11/11/2026, 19:42" or "11/11/2026, 21.05.12")
 * into day-of-week (0=Mon..6=Sun), week-of-month (0..3), month (0..11), and short time label.
 */
function parseOrderDateInfo(createdAt: string, fallbackIndex = 0) {
  const trimmed = (createdAt || '').trim();
  // Match dd/mm/yyyy or yyyy-mm-dd
  const dmyMatch = trimmed.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  const timeMatch = trimmed.match(/(\d{1,2})[:.](\d{2})/);

  let dateObj: Date | null = null;
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const hour = timeMatch ? parseInt(timeMatch[1], 10) : 12;
    const minute = timeMatch ? parseInt(timeMatch[2], 10) : 0;
    const candidate = new Date(year, month, day, hour, minute);
    if (!isNaN(candidate.getTime())) {
      dateObj = candidate;
    }
  } else {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      dateObj = parsed;
    }
  }

  if (!dateObj) {
    dateObj = new Date();
  }

  // Convert JS getDay() (0=Sun, 1=Mon..6=Sat) -> (0=Mon..6=Sun)
  const jsDay = dateObj.getDay();
  const mondayBasedDay = jsDay === 0 ? 6 : jsDay - 1;
  const dayOfMonth = dateObj.getDate();
  const weekOfMonth = Math.min(3, Math.floor((dayOfMonth - 1) / 7));
  const monthIdx = dateObj.getMonth();
  const hour = dateObj.getHours();
  const timeLabel = timeMatch
    ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`
    : `${String(9 + (fallbackIndex % 10)).padStart(2, '0')}:00`;

  return {
    dateObj,
    mondayBasedDay,
    weekOfMonth,
    monthIdx,
    hour,
    timeLabel,
  };
}

export const SalesDashboardView: React.FC<SalesDashboardViewProps> = ({
  orders,
  products,
  storeSettings,
  onOpenPdfReport,
}) => {
  const t = TRANSLATIONS[storeSettings.language as Language];
  const isId = storeSettings.language === 'id';
  const primaryColor = storeSettings.primaryColor || '#FF2457';
  const [period, setPeriod] = useState<ChartPeriod>('7days');
  const [hoveredBarIdx, setHoveredBarIdx] = useState<number | null>(null);

  // Fast O(1) Product Lookup Map for thousands of transactions without lag
  const productLookup = useMemo(() => {
    const byId = new Map<string, ProductItem>();
    const byName = new Map<string, ProductItem>();
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      byId.set(p.id, p);
      byName.set(p.name.toLowerCase(), p);
    }
    return { byId, byName };
  }, [products]);

  // Compute 100% Real KPIs in Rupiah directly from sold orders (single O(N) pass)
  const kpis = useMemo(() => {
    let totalRevenue = 0;
    let totalTax = 0;
    let totalUnitsSold = 0;
    const totalOrders = orders.length;

    for (let i = 0; i < totalOrders; i++) {
      const o = orders[i];
      totalRevenue += o.total;
      totalTax += o.taxPbf;
      const items = o.items;
      for (let j = 0; j < items.length; j++) {
        totalUnitsSold += items[j].quantity;
      }
    }

    const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    return {
      totalRevenue,
      totalOrders,
      avgOrder,
      totalTax,
      totalUnitsSold,
    };
  }, [orders]);

  // Build Chart Series Data in Rupiah 100% synchronized with sold orders (orders)
  const chartData = useMemo(() => {
    // Chronological order (oldest -> newest)
    const chronologicalOrders = [...orders].reverse();

    if (period === 'today') {
      if (chronologicalOrders.length === 0) {
        return [
          { label: '08:00', revenue: 0, orders: 0 },
          { label: '12:00', revenue: 0, orders: 0 },
          { label: '16:00', revenue: 0, orders: 0 },
          { label: isId ? 'Sekarang' : 'Now', revenue: 0, orders: 0 },
        ];
      }

      // If only 1 order exists, show item-by-item sales breakdown of that order + total order point
      if (chronologicalOrders.length === 1) {
        const singleOrder = chronologicalOrders[0];
        const itemPoints = singleOrder.items.map((it) => ({
          label:
            it.name.length > 12 ? `${it.name.slice(0, 11)}…` : it.name,
          revenue: it.subtotal,
          orders: it.quantity,
        }));
        return [
          ...itemPoints,
          {
            label: `${singleOrder.orderId} (Total)`,
            revenue: singleOrder.total,
            orders: 1,
          },
        ];
      }

      // If <= 12 orders, plot each transaction directly
      if (chronologicalOrders.length <= 12) {
        return chronologicalOrders.map((ord, idx) => {
          const info = parseOrderDateInfo(ord.createdAt, idx);
          return {
            label: `${ord.orderId.replace('ORD-', '#')} (${info.timeLabel})`,
            revenue: ord.total,
            orders: 1,
          };
        });
      }

      // If > 12 orders (up to thousands of transactions), group into 8 time slots so SVG rendering is zero-lag
      const slotLabels = [
        '00:00–08:59',
        '09:00–10:59',
        '11:00–12:59',
        '13:00–14:59',
        '15:00–16:59',
        '17:00–18:59',
        '19:00–20:59',
        '21:00–23:59',
      ];
      const shortLabels = [
        '08:00',
        '10:00',
        '12:00',
        '14:00',
        '16:00',
        '18:00',
        '20:00',
        '22:00',
      ];
      const buckets = shortLabels.map((label, i) => ({
        label,
        slotRange: slotLabels[i],
        revenue: 0,
        orders: 0,
      }));

      for (let i = 0; i < chronologicalOrders.length; i++) {
        const ord = chronologicalOrders[i];
        const { hour } = parseOrderDateInfo(ord.createdAt, i);
        let slotIdx = 0;
        if (hour < 9) slotIdx = 0;
        else if (hour < 11) slotIdx = 1;
        else if (hour < 13) slotIdx = 2;
        else if (hour < 15) slotIdx = 3;
        else if (hour < 17) slotIdx = 4;
        else if (hour < 19) slotIdx = 5;
        else if (hour < 21) slotIdx = 6;
        else slotIdx = 7;

        buckets[slotIdx].revenue += ord.total;
        buckets[slotIdx].orders += 1;
      }

      return buckets;
    }

    if (period === '7days') {
      const days = isId
        ? ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const buckets = days.map((label) => ({
        label,
        revenue: 0,
        orders: 0,
      }));

      for (let i = 0; i < chronologicalOrders.length; i++) {
        const ord = chronologicalOrders[i];
        const { mondayBasedDay } = parseOrderDateInfo(ord.createdAt, i);
        buckets[mondayBasedDay].revenue += ord.total;
        buckets[mondayBasedDay].orders += 1;
      }

      return buckets;
    }

    if (period === 'monthly') {
      const weeks = isId
        ? ['Mgg 1', 'Mgg 2', 'Mgg 3', 'Mgg 4']
        : ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      const buckets = weeks.map((label) => ({
        label,
        revenue: 0,
        orders: 0,
      }));

      for (let i = 0; i < chronologicalOrders.length; i++) {
        const ord = chronologicalOrders[i];
        const { weekOfMonth } = parseOrderDateInfo(ord.createdAt, i);
        buckets[weekOfMonth].revenue += ord.total;
        buckets[weekOfMonth].orders += 1;
      }

      return buckets;
    }

    // Yearly
    const monthLabels = isId
      ? ['Jan–Feb', 'Mar–Apr', 'Mei–Jun', 'Jul–Agu', 'Sep–Okt', 'Nov–Des']
      : ['Jan–Feb', 'Mar–Apr', 'May–Jun', 'Jul–Aug', 'Sep–Oct', 'Nov–Dec'];
    const buckets = monthLabels.map((label) => ({
      label,
      revenue: 0,
      orders: 0,
    }));

    for (let i = 0; i < chronologicalOrders.length; i++) {
      const ord = chronologicalOrders[i];
      const { monthIdx } = parseOrderDateInfo(ord.createdAt, i);
      const bucketIdx = Math.min(5, Math.floor(monthIdx / 2));
      buckets[bucketIdx].revenue += ord.total;
      buckets[bucketIdx].orders += 1;
    }

    return buckets;
  }, [period, orders, isId]);

  const peakDataRevenue = useMemo(
    () => Math.max(...chartData.map((d) => d.revenue), 0),
    [chartData]
  );

  const maxRevenue = useMemo(() => {
    if (peakDataRevenue <= 0) return 100000;
    const step = peakDataRevenue >= 1000000 ? 100000 : 25000;
    return Math.ceil((peakDataRevenue * 1.15) / step) * step;
  }, [peakDataRevenue]);

  const formatCompactRupiah = (val: number) => {
    if (val === 0) return 'Rp 0';
    if (val >= 1000000) {
      return `Rp ${(val / 1000000).toFixed(1)}jt`;
    }
    if (val >= 1000) {
      return `Rp ${(val / 1000).toFixed(0)}rb`;
    }
    return formatRupiah(val);
  };

  // Y-axis ticks (100%, 75%, 50%, 25%, 0%)
  const yAxisTicks = useMemo(() => {
    return [1, 0.75, 0.5, 0.25, 0].map((ratio) => ({
      ratio,
      label: ratio === 0 ? 'Rp 0' : formatCompactRupiah(maxRevenue * ratio),
    }));
  }, [maxRevenue]);

  // Normalized 0..1000 coordinates for full-width responsive SVG path
  const normalizedPoints = useMemo(() => {
    const count = chartData.length;
    return chartData.map((d, idx) => {
      const xPct = count > 1 ? (idx / (count - 1)) * 100 : 50;
      const rawRatio = maxRevenue > 0 ? (d.revenue / maxRevenue) * 88 : 0;
      const yPct = d.revenue > 0 ? Math.min(92, Math.max(8, rawRatio)) : 2;
      const svgX = (xPct / 100) * 1000;
      const svgY = 300 - (yPct / 100) * 300;
      return {
        ...d,
        xPct,
        yPct,
        svgX,
        svgY,
      };
    });
  }, [chartData, maxRevenue]);

  // Smooth cubic bezier SVG path across 1000x300 viewBox
  const smoothLinePath = useMemo(() => {
    if (normalizedPoints.length === 0) return '';
    if (normalizedPoints.length === 1) {
      const p = normalizedPoints[0];
      return `M 0 ${p.svgY} L 1000 ${p.svgY}`;
    }
    return normalizedPoints.reduce((acc, pt, i, arr) => {
      if (i === 0) return `M ${pt.svgX.toFixed(1)} ${pt.svgY.toFixed(1)}`;
      const prev = arr[i - 1];
      const cpX1 = prev.svgX + (pt.svgX - prev.svgX) * 0.42;
      const cpY1 = prev.svgY;
      const cpX2 = prev.svgX + (pt.svgX - prev.svgX) * 0.58;
      const cpY2 = pt.svgY;
      return `${acc} C ${cpX1.toFixed(1)} ${cpY1.toFixed(1)}, ${cpX2.toFixed(1)} ${cpY2.toFixed(1)}, ${pt.svgX.toFixed(1)} ${pt.svgY.toFixed(1)}`;
    }, '');
  }, [normalizedPoints]);

  const smoothAreaPath = useMemo(() => {
    if (normalizedPoints.length === 0) return '';
    const first = normalizedPoints[0];
    const last = normalizedPoints[normalizedPoints.length - 1];
    return `${smoothLinePath} L ${last.svgX.toFixed(1)} 300 L ${first.svgX.toFixed(1)} 300 Z`;
  }, [smoothLinePath, normalizedPoints]);

  // Category Breakdown in Rupiah (O(N) with O(1) Map lookup)
  const categoryStats = useMemo(() => {
    const map: Record<string, { label: string; amount: number }> = {
      burger: { label: t.catBurger, amount: 0 },
      coffee: { label: t.catCoffee, amount: 0 },
      pizza: { label: t.catPizza, amount: 0 },
      snack: { label: t.catSnack, amount: 0 },
      soft_drink: { label: t.catSoftDrink, amount: 0 },
      ice_cream: { label: t.catIceCream, amount: 0 },
    };

    for (let i = 0; i < orders.length; i++) {
      const items = orders[i].items;
      for (let j = 0; j < items.length; j++) {
        const it = items[j];
        const prod =
          productLookup.byId.get(it.id) ||
          productLookup.byName.get(it.name.toLowerCase());
        const cat =
          prod?.categories.find((c) => c !== 'hot') || 'burger';
        if (!map[cat]) {
          map[cat] = { label: cat, amount: 0 };
        }
        map[cat].amount += it.subtotal;
      }
    }

    const totalSoldItemsAmount =
      Object.values(map).reduce((s, v) => s + v.amount, 0) || 0;

    return Object.entries(map)
      .map(([id, val]) => ({
        id,
        label: val.label,
        amount: val.amount,
        pct:
          totalSoldItemsAmount > 0
            ? Math.round((val.amount / totalSoldItemsAmount) * 100)
            : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [orders, productLookup, t]);

  // Top Selling Products in Rupiah (O(N) with O(1) Map lookup)
  const topProducts = useMemo(() => {
    const counts: Record<
      string,
      { qty: number; rev: number; fallbackName: string; fallbackPrice: number }
    > = {};

    for (let i = 0; i < orders.length; i++) {
      const items = orders[i].items;
      for (let j = 0; j < items.length; j++) {
        const it = items[j];
        if (!counts[it.id]) {
          counts[it.id] = {
            qty: 0,
            rev: 0,
            fallbackName: it.name,
            fallbackPrice: it.price,
          };
        }
        counts[it.id].qty += it.quantity;
        counts[it.id].rev += it.subtotal;
      }
    }

    const soldList = Object.entries(counts)
      .map(([id, stat]) => {
        const foundProd =
          productLookup.byId.get(id) ||
          productLookup.byName.get(stat.fallbackName.toLowerCase());
        const product: ProductItem = foundProd || {
          id,
          name: stat.fallbackName,
          barcode: '899100210000',
          price: stat.fallbackPrice,
          categories: ['hot'],
          popularity: 90,
          imageUrl: products[0]?.imageUrl || '',
          stock: 20,
          lowStockThreshold: 5,
        };
        return {
          product,
          totalQty: stat.qty,
          totalRev: stat.rev,
        };
      })
      .sort((a, b) => b.totalRev - a.totalRev);

    if (soldList.length > 0) {
      return soldList.slice(0, 5);
    }

    // If 0 orders exist yet, show top 5 catalog products with 0 sold
    return products.slice(0, 5).map((p) => ({
      product: p,
      totalQty: 0,
      totalRev: 0,
    }));
  }, [products, productLookup, orders]);

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 md:pb-8 animate-menu-transition">
      {/* Header + Period Filter + Print PDF Report Button */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4 bg-white p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] border border-slate-100 shadow-2xs">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-extrabold text-[#2D3748] truncate">
            {t.dashboardTitle}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 line-clamp-1">
            {t.dashboardSubtitle}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between sm:justify-end gap-2 sm:gap-2.5">
          {/* Segmented Period Selector */}
          <div className="grid grid-cols-4 sm:flex items-center bg-[#F4F5F7] p-1 rounded-xl overflow-x-auto max-w-full">
            {(
              [
                { id: 'today', label: t.periodToday },
                { id: '7days', label: t.period7Days },
                { id: 'monthly', label: t.periodMonthly },
                { id: 'yearly', label: t.periodYearly },
              ] as { id: ChartPeriod; label: string }[]
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPeriod(item.id)}
                style={
                  period === item.id
                    ? { backgroundColor: primaryColor, color: '#FFFFFF' }
                    : undefined
                }
                className={`px-2 sm:px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap text-center truncate ${
                  period === item.id
                    ? 'shadow-xs'
                    : 'text-slate-500 hover:text-[#2D3748]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Cetak Laporan PDF Button */}
          <button
            type="button"
            onClick={onOpenPdfReport}
            style={{ backgroundColor: primaryColor }}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2.5 sm:py-2 rounded-xl text-white text-xs font-bold shadow-md hover:opacity-95 transition-opacity cursor-pointer shrink-0 whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span>{t.printPdfReportBtn}</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards in Rupiah (2x2 on HP & Tablet, 4x1 on Desktop) */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4">
        <div
          style={{ animationDelay: '0ms' }}
          className="animate-card-enter bg-white p-3.5 sm:p-5 rounded-[18px] sm:rounded-[22px] border border-slate-100 flex items-center justify-between gap-2 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200"
        >
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-400 block truncate">
              {t.kpiRevenue}
            </span>
            <div className="text-sm sm:text-lg lg:text-xl font-extrabold text-[#2D3748] tabular-nums mt-0.5 sm:mt-1 truncate">
              {formatRupiah(kpis.totalRevenue)}
            </div>
            <span className="inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] font-bold text-emerald-600 mt-1 truncate">
              <ArrowUpRight className="w-3 h-3 shrink-0" /> {kpis.totalUnitsSold}{' '}
              {isId ? 'item terjual' : 'items sold'}
            </span>
          </div>
          <div
            style={{
              backgroundColor: `${primaryColor}15`,
              color: primaryColor,
            }}
            className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0"
          >
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div
          style={{ animationDelay: '35ms' }}
          className="animate-card-enter bg-white p-3.5 sm:p-5 rounded-[18px] sm:rounded-[22px] border border-slate-100 flex items-center justify-between gap-2 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200"
        >
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-400 block truncate">
              {t.kpiOrders}
            </span>
            <div className="text-sm sm:text-lg lg:text-xl font-extrabold text-[#2D3748] tabular-nums mt-0.5 sm:mt-1">
              {kpis.totalOrders}
            </div>
            <span className="text-[10px] sm:text-[11px] font-medium text-emerald-600 mt-1 block truncate">
              {t.completedStatus}
            </span>
          </div>
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div
          style={{ animationDelay: '70ms' }}
          className="animate-card-enter bg-white p-3.5 sm:p-5 rounded-[18px] sm:rounded-[22px] border border-slate-100 flex items-center justify-between gap-2 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200"
        >
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-400 block truncate">
              {t.kpiAvgOrder}
            </span>
            <div className="text-sm sm:text-lg lg:text-xl font-extrabold text-[#2D3748] tabular-nums mt-0.5 sm:mt-1 truncate">
              {formatRupiah(kpis.avgOrder)}
            </div>
            <span className="text-[10px] sm:text-[11px] font-medium text-emerald-600 mt-1 block truncate">
              {isId
                ? `Dari ${kpis.totalOrders} transaksi`
                : `From ${kpis.totalOrders} orders`}
            </span>
          </div>
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div
          style={{ animationDelay: '105ms' }}
          className="animate-card-enter bg-white p-3.5 sm:p-5 rounded-[18px] sm:rounded-[22px] border border-slate-100 flex items-center justify-between gap-2 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200"
        >
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-400 block truncate">
              {t.kpiTax} ({storeSettings.taxName || 'PBF'}{' '}
              {storeSettings.taxEnabled !== false
                ? storeSettings.taxRate ?? 5
                : 0}
              %)
            </span>
            <div className="text-sm sm:text-lg lg:text-xl font-extrabold text-[#2D3748] tabular-nums mt-0.5 sm:mt-1 truncate">
              {formatRupiah(kpis.totalTax)}
            </div>
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 mt-1 block truncate">
              {storeSettings.taxName || 'PBF'}{' '}
              {storeSettings.taxEnabled !== false
                ? `${storeSettings.taxRate ?? 5}% Otomatis`
                : 'Nonaktif (0%)'}
            </span>
          </div>
          <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* Main Sales Charts Row: Full-Width Proportional Area/Line Chart + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Large Full-Bleed Sales & Revenue Trend Chart (8 Cols) */}
        <div className="lg:col-span-8 bg-white p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] border border-slate-100 flex flex-col justify-between overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4 sm:mb-5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                style={{
                  backgroundColor: `${primaryColor}15`,
                  color: primaryColor,
                }}
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              >
                <BarChart3 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-extrabold text-sm sm:text-lg text-[#2D3748] truncate">
                  {t.chartRevenueTitle}
                </h2>
                <p className="text-[11px] text-slate-400 line-clamp-1">
                  {isId
                    ? 'Data grafik disinkronkan langsung dari transaksi yang sudah terjual'
                    : 'Chart data is synchronized directly from completed sales orders'}
                </p>
              </div>
            </div>

            {hoveredBarIdx !== null && normalizedPoints[hoveredBarIdx] ? (
              <div
                style={{ backgroundColor: primaryColor }}
                className="text-[11px] sm:text-xs font-extrabold text-white px-3 py-1.5 rounded-xl tabular-nums shadow-sm"
              >
                {normalizedPoints[hoveredBarIdx].label}:{' '}
                {formatRupiah(normalizedPoints[hoveredBarIdx].revenue)} (
                {normalizedPoints[hoveredBarIdx].orders}{' '}
                {period === 'today' && orders.length === 1
                  ? isId
                    ? 'item'
                    : 'items'
                  : isId
                  ? 'pesanan'
                  : 'orders'}
                )
              </div>
            ) : (
              <div className="text-[11px] sm:text-xs font-bold text-slate-600 bg-[#F8F9FA] px-3 py-1.5 rounded-xl border border-slate-100 tabular-nums">
                {isId ? 'Total Terjual:' : 'Total Sold:'}{' '}
                <strong style={{ color: primaryColor }}>
                  {formatRupiah(kpis.totalRevenue)}
                </strong>{' '}
                ({kpis.totalOrders} {isId ? 'pesanan' : 'orders'})
              </div>
            )}
          </div>

          {/* Full-Width Responsive Chart Canvas (Fills 100% Width & Height on Computer, Tablet, and HP) */}
          <div
            key={period}
            className="w-full flex gap-1.5 sm:gap-4 items-stretch pt-4 pb-2 animate-subview-transition"
          >
            {/* Y-Axis Labels Column */}
            <div className="flex flex-col justify-between text-[9px] sm:text-xs font-bold text-slate-400 tabular-nums pb-7 select-none shrink-0 text-right w-11 sm:w-16">
              {yAxisTicks.map((tick, i) => (
                <span key={i} className="leading-none">
                  {tick.label}
                </span>
              ))}
            </div>

            {/* Main Plot Area (100% Flexible Width) */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="relative w-full h-[195px] sm:h-[250px] lg:h-[290px] px-2.5 sm:px-5">
                {/* Horizontal Dashed Grid Lines */}
                <div className="absolute inset-x-0 inset-y-0 flex flex-col justify-between pointer-events-none">
                  {yAxisTicks.map((_, idx) => (
                    <div
                      key={idx}
                      className="w-full border-b border-dashed border-slate-200/80"
                    />
                  ))}
                </div>

                {/* Inner Coordinate Box matching Data Points */}
                <div className="relative w-full h-full">
                  {/* Full-Bleed Stretched SVG Curve & Gradient Fill */}
                  <svg
                    viewBox="0 0 1000 300"
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
                  >
                    <defs>
                      <linearGradient
                        id="salesFullAreaGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={primaryColor}
                          stopOpacity="0.34"
                        />
                        <stop
                          offset="75%"
                          stopColor={primaryColor}
                          stopOpacity="0.08"
                        />
                        <stop
                          offset="100%"
                          stopColor={primaryColor}
                          stopOpacity="0.0"
                        />
                      </linearGradient>
                    </defs>

                    <path
                      d={smoothAreaPath}
                      fill="url(#salesFullAreaGrad)"
                    />
                    <path
                      d={smoothLinePath}
                      fill="none"
                      stroke={primaryColor}
                      strokeWidth="4.5"
                      vectorEffect="non-scaling-stroke"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  {/* Crisp HTML Data Points, Vertical Guide Bars & Value Pills (Never Distorted!) */}
                  {normalizedPoints.map((pt, idx) => {
                    const isHovered = hoveredBarIdx === idx;
                    return (
                      <div
                        key={pt.label}
                        style={{ left: `${pt.xPct}%` }}
                        onMouseEnter={() => setHoveredBarIdx(idx)}
                        onMouseLeave={() => setHoveredBarIdx(null)}
                        onClick={() =>
                          setHoveredBarIdx(isHovered ? null : idx)
                        }
                        className="absolute inset-y-0 -translate-x-1/2 w-8 sm:w-14 flex flex-col items-center cursor-pointer group z-10"
                      >
                        {/* Subtle Vertical Hover Guide Bar */}
                        <div
                          style={{
                            height: `${pt.yPct}%`,
                            backgroundColor: isHovered
                              ? `${primaryColor}18`
                              : 'transparent',
                          }}
                          className="absolute bottom-0 w-5 sm:w-9 rounded-t-lg transition-colors duration-200 group-hover:bg-slate-900/5"
                        />

                        {/* Data Point Circle + Floating Value Label */}
                        <div
                          style={{ bottom: `${pt.yPct}%` }}
                          className="absolute translate-y-1/2 flex flex-col items-center"
                        >
                          {/* Value Pill Above Circle */}
                          <span
                            style={
                              isHovered
                                ? {
                                    backgroundColor: primaryColor,
                                    color: '#FFFFFF',
                                  }
                                : undefined
                            }
                            className={`mb-2 px-1 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[11px] font-extrabold tabular-nums whitespace-nowrap transition-all shadow-2xs ${
                              isHovered
                                ? 'scale-110 shadow-md z-20'
                                : 'bg-white/95 text-[#2D3748] border border-slate-200/80'
                            }`}
                          >
                            {formatCompactRupiah(pt.revenue)}
                          </span>

                          {/* Crisp Circle Node */}
                          <div
                            style={{
                              borderColor: primaryColor,
                              backgroundColor: isHovered
                                ? primaryColor
                                : '#FFFFFF',
                            }}
                            className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full border-[3px] transition-transform duration-200 shadow-xs ${
                              isHovered ? 'scale-125' : 'group-hover:scale-115'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* X-Axis Day / Period Labels Row */}
              <div className="relative w-full h-7 px-2.5 sm:px-5 mt-2">
                <div className="relative w-full h-full">
                  {normalizedPoints.map((pt, idx) => {
                    const isHovered = hoveredBarIdx === idx;
                    return (
                      <span
                        key={pt.label}
                        style={{
                          left: `${pt.xPct}%`,
                          color: isHovered ? primaryColor : undefined,
                        }}
                        className={`absolute top-1 -translate-x-1/2 text-[9px] sm:text-xs font-extrabold whitespace-nowrap transition-colors max-w-[54px] sm:max-w-none truncate ${
                          isHovered ? '' : 'text-slate-500'
                        }`}
                      >
                        {pt.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Sales Distribution (4 Cols) */}
        <div className="lg:col-span-4 bg-white p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] border border-slate-100 flex flex-col justify-between">
          <h2 className="font-extrabold text-sm sm:text-lg text-[#2D3748] mb-4">
            {t.chartCategoryTitle}
          </h2>

          <div className="space-y-4 my-auto">
            {categoryStats.map((cat) => (
              <div key={cat.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="font-bold text-[#2D3748] truncate">
                    {cat.label}
                  </span>
                  <span className="text-slate-500 font-semibold tabular-nums shrink-0">
                    {formatRupiah(cat.amount)} ({cat.pct}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(6, cat.pct))}%`,
                      backgroundColor: primaryColor,
                    }}
                    className="h-full rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Selling Products Leaderboard */}
      <div className="bg-white p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] border border-slate-100">
        <h2 className="font-extrabold text-sm sm:text-lg text-[#2D3748] mb-4">
          {t.chartTopProducts}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
          {topProducts.map((item, index) => (
            <div
              key={item.product.id}
              style={{ animationDelay: `${index * 35}ms` }}
              className="animate-card-enter p-3 sm:p-4 rounded-2xl bg-[#F8F9FA] border border-slate-100 flex flex-col items-center text-center relative hover:-translate-y-0.5 hover:shadow-xs transition-all duration-200"
            >
              <span
                style={{ backgroundColor: primaryColor }}
                className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center tabular-nums"
              >
                #{index + 1}
              </span>
              <img
                src={resolveGoogleDriveImageUrl(item.product.imageUrl)}
                alt={item.product.name}
                referrerPolicy="no-referrer"
                className="w-20 h-18 sm:w-28 sm:h-24 object-contain my-2"
              />
              <h3 className="font-bold text-xs sm:text-sm text-[#2D3748] line-clamp-1">
                {item.product.name}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 tabular-nums">
                {item.totalQty} {t.unitsSold} ·{' '}
                <strong className="text-[#2D3748] block sm:inline">
                  {formatRupiah(item.totalRev)}
                </strong>
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
