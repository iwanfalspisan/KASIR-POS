import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  Barcode,
  Bell,
  Bluetooth,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  EyeOff,
  FileText,
  Globe,
  Home,
  LogOut,
  Maximize2,
  Minimize2,
  Minus,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  Plus,
  Printer,
  QrCode,
  Receipt,
  ScanBarcode,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  SquarePen,
  Trash2,
  Usb,
  User,
  UtensilsCrossed,
  Wallet,
  X,
} from 'lucide-react';
import {
  CartItem,
  CategoryId,
  CategoryItem,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  OrderRecord,
  PERMANENT_GOOGLE_CONFIG,
  PermanentGoogleConfig,
  ProductItem,
  formatRupiah,
  normalizePriceToIdr,
  resolveGoogleDriveImageUrl,
} from './data/posData';
import {
  DEFAULT_STORE_SETTINGS,
  Language,
  StoreBrandingSettings,
  TRANSLATIONS,
} from './data/i18nAndSettings';
import {
  BrandLogo,
  OrderSuccessIllustration,
  VideoOpeningAnimation,
} from './components/PosIllustrations';
import { GoogleCloudIntegrationPanel } from './components/GoogleCloudIntegrationPanel';
import { SalesDashboardView } from './components/SalesDashboardView';
import { ProductsManagementView } from './components/ProductsManagementView';
import {
  PdfReportModal,
  PrintPreviewModal,
  printThermalReceiptNow,
} from './components/PrintModals';
import { LoginView } from './components/LoginView';

type NavTab =
  | 'home'
  | 'products'
  | 'dashboard'
  | 'bills'
  | 'setting';
type SortOption = 'popular' | 'price_asc' | 'price_desc' | 'newest';

/**
 * Plays a crisp POS laser scanner beep using Web Audio API (no external audio file needed)
 */
function playScannerBeep(success = true) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = success ? 'sine' : 'sawtooth';
    osc.frequency.setValueAtTime(success ? 1850 : 340, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + (success ? 0.11 : 0.22)
    );
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (success ? 0.12 : 0.24));
  } catch {
    // ignore if browser blocks autoplay audio
  }
}

export default function App() {
  // Opening animation plays first when the application is opened
  const [showOpeningAnim, setShowOpeningAnim] = useState<boolean>(true);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pinkpos_auth_session');
      return saved ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });
  const [cashierName, setCashierName] = useState<string>('Admin Kasir');

  // Navigation & View States
  const [activeNav, setActiveNav] = useState<NavTab>('home');
  const [activeCategory, setActiveCategory] = useState<CategoryId>('hot');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [lastCompletedOrder, setLastCompletedOrder] =
    useState<OrderRecord | null>(null);

  // Print Modals State (Receipt & PDF Report)
  const [receiptOrderToPrint, setReceiptOrderToPrint] =
    useState<OrderRecord | null>(null);
  const [isPdfReportOpen, setIsPdfReportOpen] = useState<boolean>(false);

  // Store Branding & Tax Settings (Logo, Store Name, App Primary Color, Language, Tax)
  const [storeSettings, setStoreSettings] = useState<StoreBrandingSettings>(
    () => {
      try {
        const saved = localStorage.getItem('pinkpos_store_branding');
        if (saved) return { ...DEFAULT_STORE_SETTINGS, ...JSON.parse(saved) };
      } catch {
        // ignore
      }
      return DEFAULT_STORE_SETTINGS;
    }
  );

  const t = TRANSLATIONS[storeSettings.language as Language];
  const isId = storeSettings.language === 'id';
  const primaryColor = storeSettings.primaryColor || '#FF2457';

  // Permanently Embedded Google Cloud Configuration
  const [googleConfig, setGoogleConfig] = useState<PermanentGoogleConfig>(
    () => {
      try {
        const saved = localStorage.getItem('pinkpos_permanent_google_config');
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
      return PERMANENT_GOOGLE_CONFIG;
    }
  );

  // Dynamic Categories State (Icon-free)
  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('pinkpos_categories_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_CATEGORIES;
  });

  // Products Catalog State in Rupiah with Barcode, Stock & Low Stock Threshold
  const [products, setProducts] = useState<ProductItem[]>(() => {
    try {
      const saved = localStorage.getItem('pinkpos_products_catalog_idr');
      if (saved) {
        const parsed: ProductItem[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p, idx) => {
            const fallback = INITIAL_PRODUCTS.find((ip) => ip.id === p.id);
            const hasLegacySvg =
              !p.imageUrl || p.imageUrl.startsWith('data:image/svg+xml');
            return {
              ...p,
              imageUrl:
                hasLegacySvg && fallback ? fallback.imageUrl : p.imageUrl,
              barcode:
                p.barcode ||
                fallback?.barcode ||
                `89910021${String(idx + 1).padStart(4, '0')}`,
              price: normalizePriceToIdr(p.price),
              stock:
                typeof p.stock === 'number'
                  ? p.stock
                  : fallback?.stock ?? 20,
              lowStockThreshold:
                typeof p.lowStockThreshold === 'number'
                  ? p.lowStockThreshold
                  : fallback?.lowStockThreshold ?? 5,
            };
          });
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_PRODUCTS;
  });

  // Order Menu starts EMPTY when first opening the application
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<
    'cash' | 'qris' | 'debit' | 'transfer'
  >('cash');

  // Micro-interaction states
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [categoryTransitionKey, setCategoryTransitionKey] = useState(0);

  // USB / Bluetooth Barcode Scanner States
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [manualBarcodeInput, setManualBarcodeInput] = useState('');
  const [scanToast, setScanToast] = useState<{
    type: 'success' | 'error';
    code: string;
    message: string;
  } | null>(null);
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const scanToastTimeoutRef = useRef<number | null>(null);

  // Orders History in Rupiah
  const [orders, setOrders] = useState<OrderRecord[]>(() => {
    try {
      const saved = localStorage.getItem('pinkpos_orders_history_idr');
      if (saved) {
        const parsed: OrderRecord[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [
      {
        orderId: 'ORD-849201',
        createdAt: '11/11/2026, 19:42',
        cashierName: 'Admin Kasir',
        items: [
          {
            id: 'prod-cheese-burger',
            name: 'Cheese Burger',
            price: 30000,
            quantity: 2,
            subtotal: 60000,
          },
          {
            id: 'prod-coffee-latte',
            name: 'Coffee Latte',
            price: 18000,
            quantity: 3,
            subtotal: 54000,
          },
          {
            id: 'prod-chicken-nugget',
            name: 'Chicken Nugget',
            price: 25000,
            quantity: 2,
            subtotal: 50000,
          },
        ],
        subTotal: 164000,
        taxPbf: 8200,
        total: 172200,
        syncedToSheet: true,
      },
    ];
  });

  const [showNotificationPopover, setShowNotificationPopover] = useState(false);
  // Fullscreen Mobile Cart State
  const [mobileFullscreenCartOpen, setMobileFullscreenCartOpen] =
    useState(false);
  // Hide/Show Left Sidebar Navigation Menu State
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  // Logout Warning Confirmation Modal State
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);

  // High-Performance Windowed Pagination & Search for Transaksi (Handles Thousands of Transactions Without Lag)
  const [transactionSearchQuery, setTransactionSearchQuery] = useState('');
  const [visibleOrdersLimit, setVisibleOrdersLimit] = useState(30);

  // Horizontal Category Slider Refs & State (Supports Mouse Drag, Wheel, Touch Swipe & Left/Right Buttons)
  const categoryScrollRef = useRef<HTMLDivElement | null>(null);
  const isDraggingCatRef = useRef(false);
  const catDragStartXRef = useRef(0);
  const catScrollStartLeftRef = useRef(0);
  const catHasDraggedRef = useRef(false);
  const [canScrollCatLeft, setCanScrollCatLeft] = useState(false);
  const [canScrollCatRight, setCanScrollCatRight] = useState(false);

  const updateCatScrollButtons = useCallback(() => {
    const el = categoryScrollRef.current;
    if (!el) return;
    setCanScrollCatLeft(el.scrollLeft > 4);
    setCanScrollCatRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(updateCatScrollButtons, 60);
    window.addEventListener('resize', updateCatScrollButtons);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', updateCatScrollButtons);
    };
  }, [categories, activeNav, isSidebarHidden, updateCatScrollButtons]);

  const handleSlideCategories = useCallback((direction: 'left' | 'right') => {
    const el = categoryScrollRef.current;
    if (!el) return;
    const scrollAmount = Math.max(el.clientWidth * 0.6, 220);
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  }, []);

  // Filtered Orders for Transaksi View (Fast O(N) filter, sliced to visibleOrdersLimit for DOM)
  const filteredOrders = useMemo(() => {
    const q = transactionSearchQuery.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.orderId.toLowerCase().includes(q) ||
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        (o.paymentMethod && o.paymentMethod.toLowerCase().includes(q)) ||
        o.createdAt.toLowerCase().includes(q) ||
        o.items.some((it) => it.name.toLowerCase().includes(q))
    );
  }, [orders, transactionSearchQuery]);

  const displayedOrders = useMemo(
    () => filteredOrders.slice(0, visibleOrdersLimit),
    [filteredOrders, visibleOrdersLimit]
  );

  // Low Stock Products Calculation (stock <= lowStockThreshold)
  const lowStockProducts = useMemo(
    () =>
      products.filter(
        (p) => (p.stock ?? 0) <= (p.lowStockThreshold ?? 5)
      ),
    [products]
  );

  useEffect(() => {
    document.title = `${storeSettings.storeName} — Point of Sale`;
  }, [storeSettings.storeName]);

  // Apply dynamic theme color to text highlight selection (::selection)
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', primaryColor);
    root.style.setProperty('--theme-selection-bg', `${primaryColor}26`);
  }, [primaryColor]);

  // Non-blocking asynchronous localStorage persistence so large order histories never lag the UI
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(
          'pinkpos_store_branding',
          JSON.stringify(storeSettings)
        );
      } catch {
        // ignore
      }
    }, 80);
    return () => window.clearTimeout(id);
  }, [storeSettings]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(
          'pinkpos_permanent_google_config',
          JSON.stringify(googleConfig)
        );
      } catch {
        // ignore
      }
    }, 80);
    return () => window.clearTimeout(id);
  }, [googleConfig]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(
          'pinkpos_categories_list',
          JSON.stringify(categories)
        );
      } catch {
        // ignore
      }
    }, 80);
    return () => window.clearTimeout(id);
  }, [categories]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(
          'pinkpos_products_catalog_idr',
          JSON.stringify(products)
        );
      } catch {
        // ignore
      }
    }, 100);
    return () => window.clearTimeout(id);
  }, [products]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(
          'pinkpos_orders_history_idr',
          JSON.stringify(orders)
        );
      } catch {
        // ignore
      }
    }, 150);
    return () => window.clearTimeout(id);
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'pinkpos_auth_session',
        JSON.stringify(isAuthenticated)
      );
    } catch {
      // ignore
    }
  }, [isAuthenticated]);

  // ==========================================================================
  // AUTOMATIC SHEET CREATION & REAL-TIME 2-WAY CLOUD DATABASE ENGINE
  // ==========================================================================
  const latestStateRef = useRef({
    products,
    orders,
    categories,
    storeSettings,
  });
  useEffect(() => {
    latestStateRef.current = { products, orders, categories, storeSettings };
  }, [products, orders, categories, storeSettings]);

  const pushToCloudDatabase = useCallback(
    async (payload: Record<string, unknown>) => {
      const scriptUrl = googleConfig.APPS_SCRIPT_URL?.trim();
      if (!scriptUrl) return;
      const bodyStr = JSON.stringify(payload);

      try {
        // Use text/plain so Google Apps Script accepts POST without CORS preflight rejection
        const res = await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: bodyStr,
        });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data && typeof data.sheetUrl === 'string' && data.sheetUrl) {
            setGoogleConfig((prev) =>
              prev.GOOGLE_SHEET_URL === data.sheetUrl
                ? prev
                : {
                    ...prev,
                    GOOGLE_SHEET_URL: data.sheetUrl,
                    LAST_SYNCED: new Date().toLocaleTimeString(),
                  }
            );
          }
          return;
        }
      } catch {
        // Fallback to no-cors fire-and-forget if browser blocks cross-origin redirect reading
        try {
          await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: bodyStr,
          });
        } catch {
          // silent background sync
        }
      }
    },
    [googleConfig.APPS_SCRIPT_URL]
  );

  // Full Automatic Sheet Creation & Bulk Sync (Products, Orders, Categories, StoreSettings)
  const handleSyncAllToCloud = useCallback(async () => {
    const current = latestStateRef.current;
    await pushToCloudDatabase({
      action: 'syncAll',
      products: current.products,
      orders: current.orders,
      categories: current.categories,
      storeSettings: current.storeSettings,
    });
  }, [pushToCloudDatabase]);

  const handleSyncTwoWay = useCallback(async () => {
    try {
      const scriptUrl = googleConfig.APPS_SCRIPT_URL?.trim();
      if (!scriptUrl) return;
      const url = `${scriptUrl}?action=getAllData&t=${Date.now()}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.sheetUrl === 'string' && data.sheetUrl) {
          setGoogleConfig((prev) =>
            prev.GOOGLE_SHEET_URL === data.sheetUrl
              ? prev
              : {
                  ...prev,
                  GOOGLE_SHEET_URL: data.sheetUrl,
                  LAST_SYNCED: new Date().toLocaleTimeString(),
                }
          );
        }

        const hasRemoteProducts =
          Array.isArray(data.products) && data.products.length > 0;
        const hasRemoteOrders =
          Array.isArray(data.orders) && data.orders.length > 0;
        const hasRemoteCategories =
          Array.isArray(data.categories) && data.categories.length > 0;

        if (hasRemoteProducts) {
          setProducts(
            data.products.map((p: ProductItem, idx: number) => ({
              ...p,
              barcode:
                p.barcode || `89910021${String(idx + 1).padStart(4, '0')}`,
              price: normalizePriceToIdr(p.price),
              stock: typeof p.stock === 'number' ? p.stock : 20,
              lowStockThreshold:
                typeof p.lowStockThreshold === 'number'
                  ? p.lowStockThreshold
                  : 5,
            }))
          );
        }
        if (hasRemoteOrders) {
          setOrders(data.orders);
        }
        if (hasRemoteCategories) {
          setCategories(data.categories);
        }
        if (data.storeSettings && data.storeSettings.storeName) {
          setStoreSettings((prev) => ({ ...prev, ...data.storeSettings }));
        }

        // If the Google Sheet was just auto-created and is still empty, automatically populate all tabs!
        if (!hasRemoteProducts && !hasRemoteCategories) {
          handleSyncAllToCloud();
        }
      }
    } catch {
      // silent background sync
    }
  }, [googleConfig.APPS_SCRIPT_URL, handleSyncAllToCloud]);

  useEffect(() => {
    handleSyncTwoWay();
  }, [handleSyncTwoWay]);

  // Cart Handlers
  const handleAddToCart = useCallback((product: ProductItem) => {
    if (product.stock <= 0) return;
    setJustAddedId(product.id);
    setTimeout(() => setJustAddedId(null), 260);

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return updated;
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  // ==========================================================================
  // USB & BLUETOOTH BARCODE SCANNER ENGINE (HID Keyboard Wedge + Manual Scan)
  // ==========================================================================
  const triggerScanToast = useCallback(
    (type: 'success' | 'error', code: string, message: string) => {
      if (scanToastTimeoutRef.current) {
        window.clearTimeout(scanToastTimeoutRef.current);
      }
      setScanToast({ type, code, message });
      scanToastTimeoutRef.current = window.setTimeout(() => {
        setScanToast(null);
      }, 3200);
    },
    []
  );

  const handleBarcodeScanned = useCallback(
    (rawCode: string): boolean => {
      const cleaned = rawCode.trim();
      if (!cleaned) return false;

      const matchedProduct = products.find(
        (p) =>
          (p.barcode && p.barcode.toLowerCase() === cleaned.toLowerCase()) ||
          p.id.toLowerCase() === cleaned.toLowerCase()
      );

      if (!matchedProduct) {
        playScannerBeep(false);
        triggerScanToast(
          'error',
          cleaned,
          `${t.barcodeNotFoundToast}: ${cleaned}`
        );
        return false;
      }

      if ((matchedProduct.stock ?? 20) <= 0) {
        playScannerBeep(false);
        triggerScanToast(
          'error',
          cleaned,
          `${matchedProduct.name} — ${t.outOfStockBadge}`
        );
        return false;
      }

      playScannerBeep(true);
      handleAddToCart(matchedProduct);
      triggerScanToast(
        'success',
        matchedProduct.barcode,
        `${matchedProduct.name} (+1) · ${formatRupiah(matchedProduct.price)}`
      );
      return true;
    },
    [products, handleAddToCart, triggerScanToast, t]
  );

  // Global USB / Bluetooth HID Keyboard Wedge Listener on Home Screen
  useEffect(() => {
    if (showOpeningAnim || !isAuthenticated || activeNav !== 'home' || orderSuccess) {
      return;
    }

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (isInputFocused) return;

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;

      if (e.key === 'Enter' || e.key === 'Tab') {
        if (barcodeBufferRef.current.length >= 4) {
          e.preventDefault();
          const scannedCode = barcodeBufferRef.current;
          barcodeBufferRef.current = '';
          handleBarcodeScanned(scannedCode);
        } else {
          barcodeBufferRef.current = '';
        }
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (timeDiff > 120) {
          barcodeBufferRef.current = e.key;
        } else {
          barcodeBufferRef.current += e.key;
        }
        lastKeyTimeRef.current = now;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    showOpeningAnim,
    isAuthenticated,
    activeNav,
    orderSuccess,
    handleBarcodeScanned,
  ]);

  // Toggle Language (EN <-> ID)
  const handleToggleLanguage = () => {
    const nextLang: Language = storeSettings.language === 'id' ? 'en' : 'id';
    const updated: StoreBrandingSettings = {
      ...storeSettings,
      language: nextLang,
    };
    setStoreSettings(updated);
    pushToCloudDatabase({ action: 'saveStoreSettings', settings: updated });
  };

  // Update Store Branding, Tax & Login Account Settings
  const handleUpdateStoreSettings = async (
    newSettings: StoreBrandingSettings,
    logoUpload?: { data: string; name: string; mime: string }
  ) => {
    setStoreSettings(newSettings);
    if (newSettings.loginUsername) {
      const displayUser = newSettings.loginUsername.includes('@')
        ? newSettings.loginUsername.split('@')[0]
        : newSettings.loginUsername;
      setCashierName(displayUser);
    }
    await pushToCloudDatabase({
      action: 'saveStoreSettings',
      settings: newSettings,
      logoBase64: logoUpload?.data,
      logoFileName: logoUpload?.name,
      logoMimeType: logoUpload?.mime,
    });
  };

  // Update Dynamic Categories
  const handleUpdateCategories = async (newCategories: CategoryItem[]) => {
    setCategories(newCategories);
    if (!newCategories.some((c) => c.id === activeCategory)) {
      setActiveCategory(newCategories[0]?.id || 'hot');
    }
    await pushToCloudDatabase({
      action: 'saveCategories',
      categories: newCategories,
    });
  };

  // Upsert (Add or Edit) Product
  const handleUpsertProduct = async (
    productPayload: ProductItem,
    base64Image?: { data: string; name: string; mime: string }
  ) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === productPayload.id);
      if (exists) {
        return prev.map((p) =>
          p.id === productPayload.id ? productPayload : p
        );
      }
      return [productPayload, ...prev];
    });

    setCart((prev) =>
      prev.map((c) =>
        c.product.id === productPayload.id
          ? { ...c, product: productPayload }
          : c
      )
    );

    await pushToCloudDatabase({
      action: 'upsertProduct',
      ...productPayload,
      base64Data: base64Image?.data,
      fileName: base64Image?.name,
      mimeType: base64Image?.mime,
    });
  };

  // Delete Product
  const handleDeleteProduct = async (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setCart((prev) => prev.filter((c) => c.product.id !== productId));
    await pushToCloudDatabase({ action: 'deleteProduct', id: productId });
  };

  // Delete / Void Order in Bills
  const handleDeleteOrder = async (orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.orderId !== orderId));
    await pushToCloudDatabase({ action: 'deleteOrder', orderId });
  };

  // Filtered and Sorted Products
  const visibleProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = products.filter((item) => {
      const matchesCategory = q
        ? true
        : item.categories.includes(activeCategory);
      const matchesSearch = q
        ? item.name.toLowerCase().includes(q) ||
          (item.barcode && item.barcode.toLowerCase().includes(q)) ||
          item.categories.some((c) => c.includes(q))
        : true;
      return matchesCategory && matchesSearch;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'newest') return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
      return b.popularity - a.popularity;
    });
  }, [products, activeCategory, searchQuery, sortBy]);

  // Dynamic Tax Rate & Cart Calculations in Rupiah
  const activeTaxRate =
    storeSettings.taxEnabled !== false ? (storeSettings.taxRate ?? 5) : 0;
  const activeTaxLabel = `${storeSettings.taxName || 'PBF'} (${activeTaxRate}%)`;

  const { subTotal, taxPbf, totalAmount, totalItemsCount } = useMemo(() => {
    const sub = cart.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    const tax = Math.round(sub * (activeTaxRate / 100));
    const tot = sub + tax;
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    return {
      subTotal: sub,
      taxPbf: tax,
      totalAmount: tot,
      totalItemsCount: count,
    };
  }, [cart, activeTaxRate]);

  const handleUpdateQuantity = (productId: string, delta: number) => {
    const target = cart.find((c) => c.product.id === productId);
    if (!target) return;

    if (target.quantity + delta <= 0) {
      handleRemoveFromCart(productId);
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: item.quantity + delta }
          : item
      )
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setRemovingItemId(productId);
    setTimeout(() => {
      setCart((prev) => prev.filter((item) => item.product.id !== productId));
      setRemovingItemId(null);
    }, 240);
  };

  const handleClearCart = () => {
    setCart([]);
    setCustomerName('');
  };

  // Charge Button Handler -> Deducts Stock, Saves Order & Shows Order Success Screen
  const handleChargeOrder = async () => {
    if (cart.length === 0) return;

    const trimmedCustomer = customerName.trim();
    const paymentMethodMap: Record<
      'cash' | 'qris' | 'debit' | 'transfer',
      string
    > = {
      cash: t.payCash,
      qris: t.payQris,
      debit: t.payCard,
      transfer: t.payTransfer,
    };
    const selectedPaymentLabel = paymentMethodMap[paymentMethod] || t.payCash;

    const newOrder: OrderRecord = {
      orderId: `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
      createdAt: new Date().toLocaleString('id-ID'),
      cashierName,
      ...(trimmedCustomer ? { customerName: trimmedCustomer } : {}),
      paymentMethod: selectedPaymentLabel,
      items: cart.map((item) => ({
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        subtotal: Math.round(item.product.price * item.quantity),
      })),
      subTotal: Math.round(subTotal),
      taxPbf: Math.round(taxPbf),
      total: Math.round(totalAmount),
      syncedToSheet: true,
    };

    // Deduct stock quantities from purchased products
    setProducts((prev) =>
      prev.map((prod) => {
        const orderedItem = cart.find((c) => c.product.id === prod.id);
        if (!orderedItem) return prod;
        return {
          ...prod,
          stock: Math.max(0, (prod.stock ?? 20) - orderedItem.quantity),
        };
      })
    );

    setOrders((prev) => [newOrder, ...prev]);
    setLastCompletedOrder(newOrder);
    setOrderSuccess(true);
    setMobileFullscreenCartOpen(false);
    setCart([]);
    setCustomerName('');

    // Immediately print thermal receipt upon clicking 'Bayar'
    printThermalReceiptNow(newOrder, storeSettings, cashierName, '80mm');

    await pushToCloudDatabase({
      action: 'saveOrder',
      ...newOrder,
    });
  };

  // Order Menu panel ONLY opens for 'home' menu
  const isOrderMenuVisible = activeNav === 'home' && !orderSuccess;

  return (
    /* Full-Screen Viewport with Stylish Outer Application Frame (Bingkai) */
    <div
      style={
        {
          '--theme-primary': primaryColor,
          '--theme-selection-bg': `${primaryColor}26`,
        } as React.CSSProperties
      }
      className="w-screen h-dvh overflow-hidden bg-[#E3E8EF] p-0 sm:p-2 lg:p-3.5 flex items-center justify-center"
    >
      {/* ====================================================================
          STAGE 1: OPENING ANIMATION ON FIRST APP LOAD (Framed on Tablet/Desktop, Fullscreen on Mobile)
         ==================================================================== */}
      {showOpeningAnim ? (
        <VideoOpeningAnimation
          primaryColor={primaryColor}
          logoType={storeSettings.logoType}
          customLogoUrl={storeSettings.customLogoUrl}
          storeName={storeSettings.storeName}
          onComplete={() => setShowOpeningAnim(false)}
        />
      ) : !isAuthenticated ? (
        /* ==================================================================
           STAGE 2: LOGIN PAGE (Framed on Tablet/Desktop, Fullscreen on Mobile)
           ================================================================== */
        <LoginView
          storeSettings={storeSettings}
          onToggleLanguage={handleToggleLanguage}
          onLoginSuccess={(user) => {
            setCashierName(user);
            setIsAuthenticated(true);
            setShowOpeningAnim(true);
          }}
        />
      ) : (
        /* ==================================================================
           STAGE 3: FRAMED FULL-SCREEN POS WORKSPACE (Responsive across Mobile, Tablet & Desktop)
           ================================================================== */
        <div className="w-full h-full bg-[#F8F9FA] rounded-none sm:rounded-[26px] lg:rounded-[32px] shadow-2xl border-0 sm:border-[5px] lg:border-[6px] border-white flex flex-col md:flex-row overflow-hidden relative animate-stage-transition">
          {/* Floating Barcode Scan Notification Toast */}
          {scanToast && (
            <div
              className={`fixed top-4 sm:top-5 left-1/2 -translate-x-1/2 z-50 px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-2xl shadow-xl border flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-bold animate-modal-pop max-w-[92vw] ${
                scanToast.type === 'success'
                  ? 'bg-slate-900 text-white border-slate-700'
                  : 'bg-rose-600 text-white border-rose-500'
              }`}
            >
              {scanToast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-white shrink-0" />
              )}
              <span className="font-mono text-[10px] sm:text-[11px] px-2 py-0.5 rounded bg-white/15 shrink-0">
                {scanToast.code}
              </span>
              <span className="truncate">{scanToast.message}</span>
            </div>
          )}

          {/* MOBILE COMPACT TOP BRAND BAR (< 768px) */}
          {!isSidebarHidden && (
            <div className="md:hidden w-full bg-white border-b border-slate-100 px-3 py-2 flex items-center justify-between shrink-0 z-20">
              <button
                type="button"
                onClick={() => {
                  setOrderSuccess(false);
                  setActiveNav('home');
                }}
                className="p-1 rounded-xl hover:bg-slate-50 transition-transform active:scale-95 cursor-pointer focus:outline-none flex items-center gap-2 min-w-0"
                title={storeSettings.storeName}
              >
                <BrandLogo
                  color={primaryColor}
                  logoType={storeSettings.logoType}
                  customLogoUrl={storeSettings.customLogoUrl}
                />
                <div className="text-left min-w-0">
                  <span className="block font-extrabold text-xs sm:text-sm text-[#2D3748] tracking-tight truncate max-w-[150px] sm:max-w-[220px]">
                    {storeSettings.storeName}
                  </span>
                  <span className="block text-[10px] text-slate-400 font-medium truncate max-w-[150px] sm:max-w-[220px]">
                    {storeSettings.storeTagline}
                  </span>
                </div>
              </button>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSidebarHidden(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 text-[11px] font-bold transition-colors cursor-pointer"
                  title={t.hideSidebarBtn}
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Hide</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirmModal(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-[11px] font-bold transition-colors cursor-pointer"
                  title={t.navLogout}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t.navLogout}</span>
                </button>
              </div>
            </div>
          )}

          {/* TABLET & DESKTOP LEFT VERTICAL NAVIGATION RAIL (>= 768px) */}
          {!isSidebarHidden && (
            <aside className="hidden md:flex md:w-[78px] lg:w-[88px] bg-white border-r border-slate-100 flex-col items-center justify-between px-2 py-4 lg:py-5 shrink-0 z-20 animate-sidebar-slide">
              {/* Top Brand Logo */}
              <button
                type="button"
                onClick={() => {
                  setOrderSuccess(false);
                  setActiveNav('home');
                }}
                className="p-1.5 rounded-2xl hover:bg-slate-50 transition-transform active:scale-95 cursor-pointer focus:outline-none flex items-center justify-center"
                title={storeSettings.storeName}
              >
                <BrandLogo
                  color={primaryColor}
                  logoType={storeSettings.logoType}
                  customLogoUrl={storeSettings.customLogoUrl}
                />
              </button>

              {/* Vertical 5-Menu Navigation Stack */}
              <nav className="flex flex-col items-center gap-1.5 w-full">
                {[
                  { id: 'home', label: t.navHome, icon: Home },
                  {
                    id: 'products',
                    label: t.navProducts,
                    icon: UtensilsCrossed,
                  },
                  { id: 'dashboard', label: t.navDashboard, icon: PieChart },
                  { id: 'bills', label: t.navBills, icon: Receipt },
                  { id: 'setting', label: t.navSetting, icon: SlidersHorizontal },
                ].map((item) => {
                  const IconComponent = item.icon;
                  const isActive = activeNav === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setOrderSuccess(false);
                        setMobileFullscreenCartOpen(false);
                        setActiveNav(item.id as NavTab);
                      }}
                      style={
                        isActive
                          ? {
                              backgroundColor: primaryColor,
                              boxShadow: `0 8px 18px -4px ${primaryColor}55`,
                            }
                          : undefined
                      }
                      className={`w-[58px] lg:w-[64px] h-[52px] lg:h-[56px] rounded-[16px] flex flex-col items-center justify-center gap-0.5 transition-all duration-200 cursor-pointer shrink-0 ${
                        isActive
                          ? 'text-white scale-[1.03]'
                          : 'text-slate-400 hover:text-[#2D3748] hover:bg-slate-50'
                      }`}
                    >
                      <IconComponent className="w-[18px] h-[18px] stroke-[2]" />
                      <span className="text-[10px] font-semibold tracking-tight truncate max-w-full px-0.5">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </nav>

              {/* Bottom Hide Sidebar & Logout Buttons */}
              <div className="flex flex-col items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsSidebarHidden(true)}
                  className="flex flex-col items-center justify-center gap-0.5 text-slate-400 hover:text-[#2D3748] transition-colors cursor-pointer px-2 py-1 rounded-xl hover:bg-slate-50"
                  title={t.hideSidebarBtn}
                >
                  <PanelLeftClose className="w-4 h-4" />
                  <span className="text-[10px] font-semibold">Hide</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowLogoutConfirmModal(true)}
                  className="flex flex-col items-center justify-center gap-0.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title={t.navLogout}
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-[10px] font-medium whitespace-nowrap">
                    {t.navLogout}
                  </span>
                </button>
              </div>
            </aside>
          )}

          {/* Floating Unhide Sidebar Button on non-Home screens when Sidebar is hidden */}
          {isSidebarHidden && activeNav !== 'home' && (
            <button
              type="button"
              onClick={() => setIsSidebarHidden(false)}
              className="fixed top-3.5 left-3.5 z-40 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/95 backdrop-blur border border-slate-200 text-[#2D3748] hover:bg-slate-50 text-xs font-bold shadow-md cursor-pointer transition-all"
              title={t.showSidebarBtn}
            >
              <PanelLeftOpen className="w-4 h-4" />
              <span>{t.showSidebarBtn}</span>
            </button>
          )}

          {/* ================================================================
              ORDER SUCCESS SCREEN (Subtitle text removed per user instruction!)
             ================================================================ */}
          {orderSuccess ? (
            <main className="flex-1 bg-white flex flex-col items-center justify-center p-5 sm:p-10 lg:p-12 text-center animate-menu-transition overflow-y-auto">
              <h1 className="text-xl sm:text-2xl lg:text-[26px] font-extrabold text-[#2D3748] mb-4 sm:mb-8">
                {t.orderSuccessTitle}
              </h1>

              <div className="my-1 sm:my-4 w-full flex items-center justify-center overflow-hidden">
                <OrderSuccessIllustration primaryColor={primaryColor} />
              </div>

              {lastCompletedOrder && (
                <div className="mt-4 sm:mt-5 mb-6 sm:mb-7 text-xs text-slate-400 flex flex-wrap items-center justify-center gap-2 px-2">
                  <span className="font-semibold text-[#2D3748]">
                    {lastCompletedOrder.orderId}
                  </span>
                  {lastCompletedOrder.customerName && (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 font-bold text-[#2D3748]">
                        <User className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                        <span>{lastCompletedOrder.customerName}</span>
                      </span>
                    </>
                  )}
                  {lastCompletedOrder.paymentMethod && (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        <span>{lastCompletedOrder.paymentMethod}</span>
                      </span>
                    </>
                  )}
                  <span>·</span>
                  <span
                    style={{ color: primaryColor }}
                    className="tabular-nums font-bold"
                  >
                    {t.totalPaid}: {formatRupiah(lastCompletedOrder.total)}
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 w-full max-w-md sm:max-w-none mt-1">
                {lastCompletedOrder && (
                  <button
                    type="button"
                    onClick={() => setReceiptOrderToPrint(lastCompletedOrder)}
                    className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-[#2D3748] font-bold text-xs sm:text-sm lg:text-base px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: primaryColor }} />
                    <span>{t.printReceiptBtn}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setOrderSuccess(false);
                    setActiveNav('home');
                  }}
                  style={{
                    backgroundColor: primaryColor,
                    boxShadow: `0 12px 24px -6px ${primaryColor}55`,
                  }}
                  className="w-full sm:w-auto hover:opacity-95 active:scale-[0.98] text-white font-bold text-xs sm:text-sm lg:text-base px-10 sm:px-14 py-3.5 sm:py-4 rounded-2xl transition-all cursor-pointer"
                >
                  {t.backToHome}
                </button>
              </div>
            </main>
          ) : (
            /* ================================================================
               MAIN WORKSPACE + CONDITIONAL RIGHT ORDER MENU PANEL
               ================================================================ */
            <>
              <main className="flex-1 min-w-0 flex flex-col h-full overflow-y-auto px-3 sm:px-5 lg:px-7 py-3 sm:py-5 lg:py-6">
                {/* Animated wrapper for every sidebar menu transition */}
                <div key={activeNav} className="animate-menu-transition flex-1 flex flex-col min-w-0">
                  {/* ==========================================================
                      1. HOME VIEW (Symmetrical Categories + Barcode + Product Grid)
                     ========================================================== */}
                  {activeNav === 'home' && (
                    <>
                      {/* Top Header Row: Title + Unhide Buttons + Search/Barcode Bar + USB/BT Scanner Popover + Language + Bell + Profile */}
                      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 mb-3 sm:mb-4">
                        <div className="flex items-center justify-between sm:justify-start gap-2.5 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            {isSidebarHidden && (
                              <button
                                type="button"
                                onClick={() => setIsSidebarHidden(false)}
                                className="h-9 px-2.5 rounded-xl bg-white hover:bg-slate-50 text-[#2D3748] text-xs font-bold border border-slate-200/80 shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0"
                                title={t.showSidebarBtn}
                              >
                                <PanelLeftOpen
                                  className="w-4 h-4"
                                  style={{ color: primaryColor }}
                                />
                                <span className="hidden sm:inline">Menu</span>
                              </button>
                            )}
                            <div className="min-w-0">
                              <h1 className="text-base sm:text-lg lg:text-xl font-extrabold text-[#2D3748] tracking-tight truncate">
                                {t.orderMenuTitle}
                              </h1>
                              <p className="hidden sm:block text-[11px] text-slate-400 font-medium truncate">
                                {storeSettings.storeName} · {storeSettings.storeTagline}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                          {/* Search & Direct Barcode Input (Press Enter to scan barcode directly) */}
                          <div className="relative flex-1 sm:w-48 md:w-56 xl:w-64 min-w-0">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && searchQuery.trim()) {
                                  e.preventDefault();
                                  const matched = handleBarcodeScanned(
                                    searchQuery.trim()
                                  );
                                  if (matched) {
                                    setSearchQuery('');
                                  }
                                }
                              }}
                              placeholder={t.searchPlaceholder}
                              className="w-full h-9 sm:h-10 bg-white rounded-xl sm:rounded-2xl pl-8.5 sm:pl-9 pr-7 sm:pr-8 text-xs sm:text-sm text-[#2D3748] placeholder:text-slate-300 shadow-2xs border border-slate-100 focus:border-slate-300 focus:outline-none transition-all"
                            />
                            {searchQuery && (
                              <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* USB / Bluetooth Barcode Scanner Button & Popover */}
                          <div className="relative shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setShowNotificationPopover(false);
                                setShowScannerModal((prev) => !prev);
                              }}
                              className="h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl sm:rounded-2xl bg-white hover:bg-slate-50 text-[#2D3748] text-xs font-extrabold flex items-center gap-1.5 sm:gap-2 shadow-2xs border border-slate-100 transition-all cursor-pointer shrink-0"
                              title={t.barcodeScannerReady}
                            >
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                              <ScanBarcode
                                className="w-4 h-4 shrink-0"
                                style={{ color: primaryColor }}
                              />
                              <span className="hidden xl:inline whitespace-nowrap">
                                {t.barcodeScannerBtn}
                              </span>
                            </button>

                            {showScannerModal && (
                              <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-24 sm:top-full sm:mt-2 sm:w-88 bg-white rounded-[24px] shadow-2xl border border-slate-100 p-4 z-40 text-xs space-y-3.5 animate-fade-in">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                  <div className="flex items-center gap-2">
                                    <div
                                      style={{
                                        backgroundColor: `${primaryColor}15`,
                                        color: primaryColor,
                                      }}
                                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                                    >
                                      <ScanBarcode className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <div className="font-extrabold text-[#2D3748] text-xs">
                                        {t.barcodeScannerReady}
                                      </div>
                                      <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1">
                                          <Usb className="w-3 h-3" /> USB HID
                                        </span>
                                        <span>·</span>
                                        <span className="inline-flex items-center gap-1">
                                          <Bluetooth className="w-3 h-3" /> Bluetooth
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setShowScannerModal(false)}
                                    className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Direct Barcode Scan Input */}
                                <form
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    if (!manualBarcodeInput.trim()) return;
                                    const ok = handleBarcodeScanned(
                                      manualBarcodeInput
                                    );
                                    if (ok) setManualBarcodeInput('');
                                  }}
                                  className="flex gap-2"
                                >
                                  <input
                                    type="text"
                                    autoFocus
                                    value={manualBarcodeInput}
                                    onChange={(e) =>
                                      setManualBarcodeInput(e.target.value)
                                    }
                                    placeholder={t.barcodeInputPlaceholder}
                                    className="flex-1 min-w-0 bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#2D3748] focus:outline-none focus:border-slate-400"
                                  />
                                  <button
                                    type="submit"
                                    style={{ backgroundColor: primaryColor }}
                                    className="px-3.5 py-2 rounded-xl text-white font-bold text-xs shadow-xs hover:opacity-95 cursor-pointer shrink-0"
                                  >
                                    Scan
                                  </button>
                                </form>

                                {/* Quick 1-Click Barcode Simulator for Testing */}
                                <div>
                                  <div className="text-[11px] font-bold text-slate-400 mb-2">
                                    {t.quickScanSimulatorTitle}
                                  </div>
                                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                                    {products.slice(0, 10).map((prod) => (
                                      <button
                                        key={prod.id}
                                        type="button"
                                        onClick={() =>
                                          handleBarcodeScanned(prod.barcode)
                                        }
                                        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#F8F9FA] hover:bg-slate-100 text-left transition-colors cursor-pointer"
                                      >
                                        <div className="min-w-0">
                                          <div className="font-bold text-[#2D3748] truncate">
                                            {prod.name}
                                          </div>
                                          <div className="font-mono text-[10px] text-slate-400 flex items-center gap-1">
                                            <Barcode className="w-3 h-3" />
                                            <span>{prod.barcode}</span>
                                          </div>
                                        </div>
                                        <span
                                          style={{ color: primaryColor }}
                                          className="font-extrabold tabular-nums shrink-0"
                                        >
                                          + {formatRupiah(prod.price)}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Clean Language Toggle Button (ID / EN) */}
                          <button
                            type="button"
                            onClick={handleToggleLanguage}
                            className="h-9 sm:h-10 px-2.5 sm:px-3 rounded-xl sm:rounded-2xl bg-white hover:bg-slate-50 text-[#2D3748] text-xs font-extrabold flex items-center gap-1 shadow-2xs border border-slate-100 transition-colors cursor-pointer shrink-0"
                            title="Ganti Bahasa (Indonesia / English)"
                          >
                            <Globe
                              className="w-3.5 h-3.5"
                              style={{ color: primaryColor }}
                            />
                            <span>{storeSettings.language.toUpperCase()}</span>
                          </button>

                          {/* Notification Bell with Low Stock Alerts */}
                          <div className="relative shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setShowScannerModal(false);
                                setShowNotificationPopover((prev) => !prev);
                              }}
                              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#2D3748] shadow-2xs transition-colors cursor-pointer relative"
                              title={
                                isId
                                  ? 'Notifikasi Stok Menipis'
                                  : 'Low Stock Notifications'
                              }
                            >
                              <Bell className="w-4 h-4" />
                              {lowStockProducts.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-amber-500 text-white text-[9px] sm:text-[10px] font-extrabold flex items-center justify-center tabular-nums shadow-xs">
                                  {lowStockProducts.length}
                                </span>
                              )}
                            </button>
                            {showNotificationPopover && (
                              <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-24 sm:top-full sm:mt-2 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-30 text-xs space-y-3 animate-fade-in">
                                <div className="font-extrabold text-[#2D3748] flex items-center justify-between border-b border-slate-100 pb-2.5">
                                  <span className="flex items-center gap-1.5">
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                    <span>
                                      {isId
                                        ? `Peringatan Stok (${lowStockProducts.length})`
                                        : `Low Stock Alerts (${lowStockProducts.length})`}
                                    </span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowNotificationPopover(false)
                                    }
                                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {lowStockProducts.length === 0 ? (
                                  <p className="text-slate-400 py-2">
                                    {isId
                                      ? 'Semua stok produk berada di atas batas minimum.'
                                      : 'All products are well stocked above threshold.'}
                                  </p>
                                ) : (
                                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                    {lowStockProducts.map((lp) => (
                                      <div
                                        key={lp.id}
                                        className="flex items-center justify-between gap-2 p-2 rounded-xl bg-amber-50/70 border border-amber-200/70"
                                      >
                                        <div className="min-w-0">
                                          <div className="font-bold text-[#2D3748] truncate">
                                            {lp.name}
                                          </div>
                                          <div className="text-[11px] text-amber-700 font-medium">
                                            {isId
                                              ? `Batas minimum: ${lp.lowStockThreshold}`
                                              : `Threshold: ${lp.lowStockThreshold}`}
                                          </div>
                                        </div>
                                        <span
                                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold shrink-0 tabular-nums ${
                                            lp.stock <= 0
                                              ? 'bg-rose-100 text-rose-700'
                                              : 'bg-amber-200/80 text-amber-900'
                                          }`}
                                        >
                                          {lp.stock <= 0
                                            ? t.outOfStockBadge
                                            : `${t.stockLeftLabel}: ${lp.stock}`}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowNotificationPopover(false);
                                    setActiveNav('products');
                                  }}
                                  style={{ color: primaryColor }}
                                  className="w-full pt-1 text-center font-bold hover:underline cursor-pointer"
                                >
                                  {isId
                                    ? 'Atur Stok & Ambang Batas di Menu Produk →'
                                    : 'Manage Stock & Thresholds in Products →'}
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Cashier Profile Avatar */}
                          <button
                            type="button"
                            onClick={() => setActiveNav('setting')}
                            style={{
                              backgroundColor: `${primaryColor}18`,
                              color: primaryColor,
                            }}
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl font-extrabold text-xs flex items-center justify-center hover:opacity-85 transition-opacity cursor-pointer shrink-0 uppercase"
                            title={cashierName}
                          >
                            {cashierName.slice(0, 2)}
                          </button>
                        </div>
                      </header>

                      {/* Slidable Horizontal Category Tabs (Supports Mouse Click-and-Drag, Touch Swipe, Wheel & Left/Right Slide Buttons) */}
                      <section
                        aria-label="Product Categories"
                        className="relative flex items-center gap-1.5 mb-3 sm:mb-4"
                      >
                        {canScrollCatLeft && (
                          <button
                            type="button"
                            onClick={() => handleSlideCategories('left')}
                            className="w-8 h-9 sm:h-9.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 text-[#2D3748] shadow-xs flex items-center justify-center shrink-0 cursor-pointer transition-all active:scale-95 z-10"
                            title={isId ? 'Geser Kategori ke Kiri' : 'Slide Categories Left'}
                          >
                            <ChevronLeft className="w-4 h-4" style={{ color: primaryColor }} />
                          </button>
                        )}

                        <div
                          ref={categoryScrollRef}
                          onScroll={updateCatScrollButtons}
                          onMouseDown={(e) => {
                            const el = categoryScrollRef.current;
                            if (!el) return;
                            isDraggingCatRef.current = true;
                            catHasDraggedRef.current = false;
                            catDragStartXRef.current = e.pageX - el.offsetLeft;
                            catScrollStartLeftRef.current = el.scrollLeft;
                          }}
                          onMouseMove={(e) => {
                            if (!isDraggingCatRef.current) return;
                            const el = categoryScrollRef.current;
                            if (!el) return;
                            const x = e.pageX - el.offsetLeft;
                            const walk = (x - catDragStartXRef.current) * 1.35;
                            if (Math.abs(walk) > 5) {
                              catHasDraggedRef.current = true;
                              e.preventDefault();
                            }
                            el.scrollLeft = catScrollStartLeftRef.current - walk;
                            updateCatScrollButtons();
                          }}
                          onMouseUp={() => {
                            isDraggingCatRef.current = false;
                          }}
                          onMouseLeave={() => {
                            isDraggingCatRef.current = false;
                          }}
                          onWheel={(e) => {
                            const el = categoryScrollRef.current;
                            if (!el) return;
                            if (
                              Math.abs(e.deltaY) > Math.abs(e.deltaX) &&
                              el.scrollWidth > el.clientWidth
                            ) {
                              el.scrollLeft += e.deltaY;
                              updateCatScrollButtons();
                            }
                          }}
                          className="flex-1 flex items-center gap-1.5 sm:gap-2 overflow-x-auto touch-pan-x py-1 px-0.5 no-scrollbar cursor-grab active:cursor-grabbing select-none"
                        >
                          {categories.map((cat) => {
                            const isActive = activeCategory === cat.id;
                            const label = isId
                              ? cat.name
                              : cat.nameEn || cat.name;
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={(e) => {
                                  if (catHasDraggedRef.current) {
                                    e.preventDefault();
                                    catHasDraggedRef.current = false;
                                    return;
                                  }
                                  setActiveCategory(cat.id);
                                  setSearchQuery('');
                                  setCategoryTransitionKey((k) => k + 1);
                                  e.currentTarget.scrollIntoView({
                                    behavior: 'smooth',
                                    inline: 'nearest',
                                    block: 'nearest',
                                  });
                                }}
                                style={
                                  isActive
                                    ? {
                                        backgroundColor: primaryColor,
                                        borderColor: primaryColor,
                                        boxShadow: `0 5px 12px -4px ${primaryColor}45`,
                                      }
                                    : undefined
                                }
                                className={`min-w-[104px] sm:min-w-[122px] flex-1 shrink-0 h-9 sm:h-9.5 px-3.5 sm:px-4 rounded-xl border flex items-center justify-center text-center transition-all duration-200 cursor-pointer select-none ${
                                  isActive
                                    ? 'text-white font-extrabold'
                                    : 'bg-white text-slate-500 hover:text-[#2D3748] font-bold border-slate-200/80 hover:border-slate-300'
                                }`}
                              >
                                <span className="text-[11px] sm:text-xs tracking-tight whitespace-nowrap">
                                  {label}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {canScrollCatRight && (
                          <button
                            type="button"
                            onClick={() => handleSlideCategories('right')}
                            className="w-8 h-9 sm:h-9.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 text-[#2D3748] shadow-xs flex items-center justify-center shrink-0 cursor-pointer transition-all active:scale-95 z-10"
                            title={isId ? 'Geser Kategori ke Kanan' : 'Slide Categories Right'}
                          >
                            <ChevronRight className="w-4 h-4" style={{ color: primaryColor }} />
                          </button>
                        )}
                      </section>

                      {/* Subheader: Order Menu + Sort By Dropdown */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <h2 className="text-xs sm:text-base lg:text-lg font-extrabold text-[#2D3748]">
                          {t.orderMenuTitle}
                        </h2>

                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-slate-400 font-medium">
                            {t.sortByLabel}
                          </span>
                          <div className="relative inline-flex items-center">
                            <select
                              value={sortBy}
                              onChange={(e) =>
                                setSortBy(e.target.value as SortOption)
                              }
                              aria-label="Sort products"
                              className="appearance-none bg-transparent pr-5 font-bold text-[#2D3748] focus:outline-none cursor-pointer"
                            >
                              <option value="popular">{t.sortPopular}</option>
                              <option value="price_asc">
                                {t.sortPriceAsc}
                              </option>
                              <option value="price_desc">
                                {t.sortPriceDesc}
                              </option>
                              <option value="newest">{t.sortNewest}</option>
                            </select>
                            <ChevronDown
                              className="w-3.5 h-3.5 absolute right-0 pointer-events-none"
                              style={{ color: primaryColor }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Responsive Product Menu Grid in Rupiah (2 cols on HP, 3 cols on Phablet/Tablet, 3-5 cols on Laptop/Desktop) */}
                      <div
                        key={categoryTransitionKey}
                        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 sm:gap-3.5 pb-32 md:pb-24 lg:pb-6"
                      >
                        {visibleProducts.map((product, index) => {
                          const inCartItem = cart.find(
                            (c) => c.product.id === product.id
                          );
                          const isJustAdded = justAddedId === product.id;
                          const stockQty = product.stock ?? 20;
                          const threshold = product.lowStockThreshold ?? 5;
                          const isOutOfStock = stockQty <= 0;
                          const isLowStock =
                            !isOutOfStock && stockQty <= threshold;

                          return (
                            <div
                              key={product.id}
                              onClick={() => handleAddToCart(product)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleAddToCart(product);
                                }
                              }}
                              style={{
                                animationDelay: `${Math.min(index, 12) * 24}ms`,
                                borderColor: isJustAdded
                                  ? primaryColor
                                  : isLowStock
                                  ? '#FCD34D'
                                  : 'transparent',
                              }}
                              className={`animate-card-enter group bg-white rounded-[16px] sm:rounded-[18px] p-2.5 sm:p-3.5 flex flex-col items-center text-center relative select-none border-2 transition-all duration-200 ${
                                isOutOfStock
                                  ? 'opacity-60 cursor-not-allowed'
                                  : isJustAdded
                                  ? 'scale-[0.95] shadow-sm cursor-pointer'
                                  : 'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/75 cursor-pointer'
                              }`}
                            >
                              {/* Top Row: Left Quantity Badge + Right Stock / New Badge */}
                              <div className="w-full flex items-center justify-between gap-1 mb-0.5 z-10 min-h-[20px]">
                                <div>
                                  {inCartItem && (
                                    <span
                                      style={{ backgroundColor: primaryColor }}
                                      className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center tabular-nums shadow-xs shrink-0"
                                    >
                                      {inCartItem.quantity}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center justify-end min-w-0">
                                  {isOutOfStock ? (
                                    <span className="inline-flex items-center gap-0.5 bg-rose-50 text-rose-600 border border-rose-200 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full truncate">
                                      <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                      <span className="truncate">
                                        {t.outOfStockBadge}
                                      </span>
                                    </span>
                                  ) : isLowStock ? (
                                    <span className="inline-flex items-center gap-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full truncate">
                                      <AlertTriangle className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                                      <span className="truncate">
                                        {t.lowStockBadge} ({stockQty})
                                      </span>
                                    </span>
                                  ) : product.isNew ? (
                                    <span
                                      style={{ backgroundColor: primaryColor }}
                                      className="text-white text-[9px] font-bold px-2 py-0.5 rounded-t-full rounded-br-full shadow-2xs"
                                    >
                                      {t.newBadge}
                                    </span>
                                  ) : null}
                                </div>
                              </div>

                              {/* Enlarged Clear Product Photo Thumbnail */}
                              <div className="w-full h-24 sm:h-28 lg:h-32 flex items-center justify-center my-1.5 rounded-xl bg-slate-50 overflow-hidden">
                                <img
                                  src={resolveGoogleDriveImageUrl(
                                    product.imageUrl
                                  )}
                                  alt={product.name}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src =
                                      INITIAL_PRODUCTS[0].imageUrl;
                                  }}
                                />
                              </div>

                              <h3 className="font-bold text-[#2D3748] text-xs sm:text-[13px] tracking-tight line-clamp-1 w-full">
                                {product.name}
                              </h3>

                              <p
                                style={{ color: primaryColor }}
                                className="font-extrabold text-[11px] sm:text-xs tabular-nums mt-0.5"
                              >
                                {formatRupiah(product.price)}
                              </p>

                              <div className="inline-flex items-center gap-1 text-[9px] font-mono text-slate-300 mt-0.5 max-w-full truncate">
                                <Barcode className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{product.barcode}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* ==========================================================
                      2. PRODUCTS & CATEGORY MANAGEMENT VIEW
                     ========================================================== */}
                  {activeNav === 'products' && (
                    <div className="pb-20 md:pb-6">
                      <ProductsManagementView
                        products={products}
                        categories={categories}
                        storeSettings={storeSettings}
                        onUpsertProduct={handleUpsertProduct}
                        onDeleteProduct={handleDeleteProduct}
                        onUpdateCategories={handleUpdateCategories}
                      />
                    </div>
                  )}

                  {/* ==========================================================
                      3. DASHBOARD VIEW (Sales Charts in Rupiah & PDF Report)
                     ========================================================== */}
                  {activeNav === 'dashboard' && (
                    <div className="pb-20 md:pb-6">
                      <SalesDashboardView
                        orders={orders}
                        products={products}
                        storeSettings={storeSettings}
                        onOpenPdfReport={() => setIsPdfReportOpen(true)}
                      />
                    </div>
                  )}

                  {/* ==========================================================
                      4. TRANSAKSI VIEW (Order History + Instant Search + Windowed Pagination for Thousands of Orders)
                     ========================================================== */}
                  {activeNav === 'bills' && (
                    <div className="space-y-4 sm:space-y-6 pb-20 md:pb-8">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 bg-white p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] border border-slate-100">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <h1 className="text-lg sm:text-2xl font-extrabold text-[#2D3748]">
                              {t.billsTitle}
                            </h1>
                            <span
                              style={{
                                backgroundColor: `${primaryColor}15`,
                                color: primaryColor,
                              }}
                              className="px-2.5 py-0.5 rounded-full text-xs font-extrabold tabular-nums"
                            >
                              {filteredOrders.length}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {t.billsSubtitle}
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
                          {/* Instant Transaction Search Input */}
                          <div className="relative flex-1 sm:w-64 min-w-0">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={transactionSearchQuery}
                              onChange={(e) => {
                                setTransactionSearchQuery(e.target.value);
                                setVisibleOrdersLimit(30);
                              }}
                              placeholder={
                                isId
                                  ? 'Cari ID Order, pelanggan, metode, menu...'
                                  : 'Search Order ID, customer, payment, item...'
                              }
                              className="w-full h-10 bg-[#F8F9FA] rounded-xl pl-9 pr-8 text-xs text-[#2D3748] placeholder:text-slate-400 border border-slate-200/80 focus:border-slate-300 focus:outline-none transition-all"
                            />
                            {transactionSearchQuery && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTransactionSearchQuery('');
                                  setVisibleOrdersLimit(30);
                                }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setIsPdfReportOpen(true)}
                            style={{ backgroundColor: primaryColor }}
                            className="h-10 px-4 rounded-xl text-white text-xs font-bold shadow-md hover:opacity-95 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{t.printPdfReportBtn}</span>
                          </button>
                        </div>
                      </div>

                      {displayedOrders.length === 0 ? (
                        <div className="bg-white p-8 sm:p-10 rounded-[20px] sm:rounded-[24px] border border-slate-100 text-center text-slate-400 text-xs sm:text-sm font-semibold">
                          {isId
                            ? 'Tidak ada transaksi yang cocok dengan pencarian.'
                            : 'No matching transactions found.'}
                        </div>
                      ) : (
                        <div className="space-y-3.5 sm:space-y-4">
                          {displayedOrders.map((ord, idx) => (
                            <div
                              key={ord.orderId}
                              style={{
                                animationDelay: `${Math.min(idx, 12) * 22}ms`,
                              }}
                              className="animate-card-enter bg-white p-3.5 sm:p-5 rounded-[20px] sm:rounded-[22px] border border-slate-100 space-y-3 hover:-translate-y-0.5 hover:shadow-xs transition-all duration-200"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                  <span className="font-extrabold text-sm sm:text-base text-[#2D3748]">
                                    {ord.orderId}
                                  </span>
                                  {ord.customerName && (
                                    <span
                                      style={{
                                        backgroundColor: `${primaryColor}14`,
                                        color: primaryColor,
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                                    >
                                      <User className="w-3 h-3" />
                                      <span>{ord.customerName}</span>
                                    </span>
                                  )}
                                  {ord.paymentMethod && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">
                                      <CreditCard className="w-3 h-3" />
                                      <span>{ord.paymentMethod}</span>
                                    </span>
                                  )}
                                  <span className="text-[11px] sm:text-xs text-slate-400">
                                    {ord.createdAt}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-50">
                                  <div className="text-left sm:text-right">
                                    <span
                                      style={{ color: primaryColor }}
                                      className="text-sm sm:text-lg font-extrabold tabular-nums"
                                    >
                                      {formatRupiah(ord.total)}
                                    </span>
                                    <span className="block text-[10px] sm:text-[11px] text-emerald-600 font-medium">
                                      {t.completedStatus}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {/* Cetak Struk Button */}
                                    <button
                                      type="button"
                                      onClick={() => setReceiptOrderToPrint(ord)}
                                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#2D3748] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                      <Printer
                                        className="w-3.5 h-3.5"
                                        style={{ color: primaryColor }}
                                      />
                                      <span>{t.printReceiptBtn}</span>
                                    </button>

                                    {/* Hapus Transaksi Button */}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteOrder(ord.orderId)
                                      }
                                      title={t.deleteBill}
                                      className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-xs text-slate-600">
                                {ord.items.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="flex justify-between bg-slate-50 px-3 py-2 rounded-xl gap-2"
                                  >
                                    <span className="truncate">
                                      {item.quantity}x {item.name}
                                    </span>
                                    <span className="font-semibold tabular-nums shrink-0">
                                      {formatRupiah(item.subtotal)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}

                          {/* Load More Button for Windowed Pagination (Zero Lag for Thousands of Transactions) */}
                          {filteredOrders.length > visibleOrdersLimit && (
                            <div className="pt-2 flex flex-col items-center gap-2">
                              <span className="text-xs text-slate-400 font-medium">
                                {isId
                                  ? `Menampilkan ${displayedOrders.length} dari ${filteredOrders.length} transaksi`
                                  : `Showing ${displayedOrders.length} of ${filteredOrders.length} transactions`}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setVisibleOrdersLimit((prev) => prev + 50)
                                }
                                style={{
                                  borderColor: primaryColor,
                                  color: primaryColor,
                                }}
                                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white hover:bg-slate-50 border-2 text-xs font-extrabold transition-all cursor-pointer shadow-2xs"
                              >
                                {isId
                                  ? `Tampilkan Lebih Banyak (+50 Transaksi)`
                                  : `Load More (+50 Transactions)`}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ==========================================================
                      5. SETTING VIEW (Branding, Tax Settings, Cloud Config)
                     ========================================================== */}
                  {activeNav === 'setting' && (
                    <div className="pb-20 md:pb-6">
                      <GoogleCloudIntegrationPanel
                        config={googleConfig}
                        onUpdateConfig={(newCfg) => {
                          setGoogleConfig(newCfg);
                          setTimeout(() => handleSyncAllToCloud(), 100);
                        }}
                        storeSettings={storeSettings}
                        onUpdateStoreSettings={handleUpdateStoreSettings}
                        products={products}
                        onSyncAllToCloud={handleSyncAllToCloud}
                      />
                    </div>
                  )}
                </div>
              </main>

              {/* ==============================================================
                  RIGHT ORDER MENU / CART PANEL (Desktop Sidebar + Tablet Slide-Over Drawer + Mobile Bottom Sheet)
                 ============================================================== */}
              {isOrderMenuVisible && (
                <>
                  {/* Backdrop on Mobile & Tablet when Cart Drawer is Open */}
                  {mobileFullscreenCartOpen && (
                    <div
                      onClick={() => setMobileFullscreenCartOpen(false)}
                      className="fixed inset-0 z-40 bg-slate-900/45 backdrop-blur-xs lg:hidden animate-modal-backdrop"
                    />
                  )}

                  <aside
                    className={`${
                      mobileFullscreenCartOpen
                        ? 'fixed inset-x-0 bottom-0 top-10 sm:top-0 sm:left-auto sm:w-[390px] md:w-[410px] z-50 flex rounded-t-[26px] sm:rounded-none shadow-2xl animate-fullscreen-cart'
                        : 'hidden lg:flex lg:w-[310px] xl:w-[350px] 2xl:w-[380px] animate-order-panel-slide'
                    } bg-white border-l border-slate-100/80 flex-col justify-between p-4 sm:p-5 xl:p-6 shrink-0 transition-all duration-300`}
                  >
                    <div className="flex-1 flex flex-col min-h-0">
                      <div className="flex items-center justify-between mb-3.5 sm:mb-4">
                        <div className="flex items-center gap-2">
                          <h2 className="text-base xl:text-lg font-extrabold text-[#2D3748] tracking-tight">
                            {t.orderMenuTitle}
                          </h2>
                          {totalItemsCount > 0 && (
                            <span
                              style={{
                                backgroundColor: `${primaryColor}15`,
                                color: primaryColor,
                              }}
                              className="px-2 py-0.5 rounded-full text-[11px] font-extrabold tabular-nums"
                            >
                              {totalItemsCount} item
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={cart.length === 0}
                            onClick={() => {
                              if (cart.length === 0) return;
                              const paymentMethodMap: Record<
                                'cash' | 'qris' | 'debit' | 'transfer',
                                string
                              > = {
                                cash: t.payCash,
                                qris: t.payQris,
                                debit: t.payCard,
                                transfer: t.payTransfer,
                              };
                              setReceiptOrderToPrint({
                                orderId: 'PREVIEW-DRAFT',
                                createdAt: new Date().toLocaleString('id-ID'),
                                cashierName,
                                ...(customerName.trim()
                                  ? { customerName: customerName.trim() }
                                  : {}),
                                paymentMethod:
                                  paymentMethodMap[paymentMethod] || t.payCash,
                                items: cart.map((item) => ({
                                  id: item.product.id,
                                  name: item.product.name,
                                  price: item.product.price,
                                  quantity: item.quantity,
                                  subtotal: Math.round(
                                    item.product.price * item.quantity
                                  ),
                                })),
                                subTotal: Math.round(subTotal),
                                taxPbf: Math.round(taxPbf),
                                total: Math.round(totalAmount),
                              });
                            }}
                            title={
                              isId
                                ? 'Pratinjau Struk / Faktur Sebelum Bayar'
                                : 'Preview Receipt / Invoice Before Charge'
                            }
                            className="h-8 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 disabled:opacity-40 flex items-center gap-1 text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            <Printer
                              className="w-3.5 h-3.5"
                              style={{ color: primaryColor }}
                            />
                            <span>{isId ? 'Pratinjau' : 'Preview'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleClearCart}
                            disabled={cart.length === 0}
                            title={t.clearOrder}
                            className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 disabled:opacity-40 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <SquarePen className="w-3.5 h-3.5" />
                          </button>
                          {mobileFullscreenCartOpen && (
                            <button
                              type="button"
                              onClick={() => setMobileFullscreenCartOpen(false)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 lg:hidden cursor-pointer"
                            >
                              <Minimize2 className="w-3.5 h-3.5" />
                              <span>{t.closeFullscreenCartBtn}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Optional Customer Name Field in Cart Sidebar */}
                      <div className="mb-3">
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">
                          {t.customerNameLabel}
                        </label>
                        <div className="relative">
                          <User
                            className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                          />
                          <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder={t.customerNamePlaceholder}
                            className="w-full bg-[#F8F9FA] border border-slate-200/80 rounded-xl pl-8.5 pr-7 py-2 text-xs font-semibold text-[#2D3748] placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-slate-300 transition-colors"
                          />
                          {customerName && (
                            <button
                              type="button"
                              onClick={() => setCustomerName('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                              title="Clear"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Selected Cart Items List in Rupiah */}
                      <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                        {cart.length === 0 ? (
                          <div className="h-44 sm:h-52 flex flex-col items-center justify-center text-center text-slate-400 px-4">
                            <p className="text-sm font-semibold text-slate-500 mb-1">
                              {t.emptyCartTitle}
                            </p>
                            <p className="text-xs text-slate-400">
                              {t.emptyCartDesc}
                            </p>
                          </div>
                        ) : (
                          cart.map((item) => {
                            const isRemoving =
                              removingItemId === item.product.id;
                            const lineTotal =
                              item.product.price * item.quantity;

                            return (
                              <div
                                key={item.product.id}
                                className={`animate-cart-item-enter group flex items-center justify-between gap-2 py-1.5 rounded-2xl transition-all duration-240 ${
                                  isRemoving
                                    ? '-translate-x-28 opacity-0 scale-95'
                                    : 'translate-x-0 opacity-100 scale-100'
                                }`}
                              >
                                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                                  <div className="w-11 h-11 xl:w-12 xl:h-12 rounded-2xl bg-[#F8F9FA] flex items-center justify-center shrink-0 overflow-hidden">
                                    <img
                                      src={resolveGoogleDriveImageUrl(
                                        item.product.imageUrl
                                      )}
                                      alt={item.product.name}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="font-bold text-xs sm:text-[13px] text-[#2D3748] truncate">
                                      {item.product.name}
                                    </h4>
                                    <p className="text-[11px] font-semibold text-slate-400 tabular-nums mt-0.5">
                                      {formatRupiah(item.product.price)}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateQuantity(
                                        item.product.id,
                                        -1
                                      )
                                    }
                                    className="w-7 h-7 sm:w-6 sm:h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="text-xs font-bold text-slate-500 w-6 text-center tabular-nums">
                                    x{item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateQuantity(item.product.id, 1)
                                    }
                                    className="w-7 h-7 sm:w-6 sm:h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="font-extrabold text-xs text-[#2D3748] tabular-nums w-18 sm:w-20 text-right">
                                    {formatRupiah(lineTotal)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveFromCart(item.product.id)
                                    }
                                    title="Hapus item"
                                    className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-600 transition-opacity cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Dashed Separator & Sub Total / Dynamic Tax Breakdown in Rupiah */}
                      <div className="border-t border-dashed border-slate-200 mt-3.5 pt-3 mb-3 space-y-1.5">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="font-semibold text-slate-500">
                            {t.subTotal}
                          </span>
                          <span className="font-extrabold text-[#2D3748] tabular-nums">
                            {formatRupiah(subTotal)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-400">
                            {activeTaxLabel}
                          </span>
                          <span className="font-semibold text-slate-400 tabular-nums">
                            {formatRupiah(taxPbf)}
                          </span>
                        </div>
                      </div>

                      {/* Payment Method Selector (Tunai, QRIS, Debit/Kredit, Transfer/E-Wallet) */}
                      <div className="mb-3.5">
                        <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
                          {t.paymentMethodLabel}
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(
                            [
                              {
                                id: 'cash',
                                label: t.payCash,
                                icon: Banknote,
                              },
                              {
                                id: 'qris',
                                label: t.payQris,
                                icon: QrCode,
                              },
                              {
                                id: 'debit',
                                label: t.payCard,
                                icon: CreditCard,
                              },
                              {
                                id: 'transfer',
                                label: t.payTransfer,
                                icon: Wallet,
                              },
                            ] as const
                          ).map((pm) => {
                            const IconComp = pm.icon;
                            const isSelected = paymentMethod === pm.id;
                            return (
                              <button
                                key={pm.id}
                                type="button"
                                onClick={() => setPaymentMethod(pm.id)}
                                style={
                                  isSelected
                                    ? {
                                        backgroundColor: `${primaryColor}14`,
                                        borderColor: primaryColor,
                                        color: primaryColor,
                                      }
                                    : undefined
                                }
                                className={`px-2.5 py-2 rounded-xl border text-[11px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                                  isSelected
                                    ? 'shadow-2xs'
                                    : 'bg-[#F8F9FA] border-slate-200/80 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                <IconComp className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{pm.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Prominent Bottom Action Button in Rupiah */}
                    <button
                      type="button"
                      onClick={handleChargeOrder}
                      disabled={cart.length === 0}
                      style={{
                        backgroundColor: primaryColor,
                        boxShadow: `0 12px 24px -6px ${primaryColor}55`,
                      }}
                      className="w-full py-3.5 sm:py-4 px-6 rounded-2xl hover:opacity-95 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm sm:text-base transition-all cursor-pointer tabular-nums"
                    >
                      {t.chargeBtn} {formatRupiah(totalAmount)}
                    </button>
                  </aside>

                  {/* MOBILE & TABLET VIEW (< 1024px): 'Show Fullscreen Cart' Floating Action Bar Inside Frame */}
                  {!mobileFullscreenCartOpen && (
                    <div
                      className={`lg:hidden absolute ${
                        !isSidebarHidden
                          ? 'bottom-[68px] md:bottom-4'
                          : 'bottom-3 md:bottom-4'
                      } left-3 right-3 sm:left-5 sm:right-5 z-30`}
                    >
                      <button
                        type="button"
                        onClick={() => setMobileFullscreenCartOpen(true)}
                        style={{
                          backgroundColor: primaryColor,
                          boxShadow: `0 14px 28px -6px ${primaryColor}65`,
                        }}
                        className="w-full text-white font-extrabold py-3 sm:py-3.5 px-4 sm:px-5 rounded-2xl flex items-center justify-between text-xs sm:text-sm tabular-nums cursor-pointer active:scale-[0.99] transition-all"
                      >
                        <span className="inline-flex items-center gap-2 min-w-0">
                          <Maximize2 className="w-4 h-4 shrink-0" />
                          <span className="truncate">{t.showFullscreenCartBtn}</span>
                          <span className="px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-extrabold shrink-0">
                            {totalItemsCount}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 shrink-0 ml-2">
                          <ShoppingBag className="w-4 h-4" />
                          <span>{formatRupiah(totalAmount)}</span>
                        </span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* MOBILE DOCKED BOTTOM NAVIGATION BAR (< 768px) — Ergonomic Thumb-Zone Navigation */}
          {!isSidebarHidden && !orderSuccess && (
            <nav
              aria-label="Mobile Bottom Navigation"
              className="md:hidden w-full bg-white border-t border-slate-100 px-2 py-1.5 grid grid-cols-5 gap-1 shrink-0 z-30"
            >
              {[
                { id: 'home', label: t.navHome, icon: Home },
                {
                  id: 'products',
                  label: t.navProducts,
                  icon: UtensilsCrossed,
                },
                { id: 'dashboard', label: t.navDashboard, icon: PieChart },
                { id: 'bills', label: t.navBills, icon: Receipt },
                { id: 'setting', label: t.navSetting, icon: SlidersHorizontal },
              ].map((item) => {
                const IconComponent = item.icon;
                const isActive = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setOrderSuccess(false);
                      setMobileFullscreenCartOpen(false);
                      setActiveNav(item.id as NavTab);
                    }}
                    style={
                      isActive
                        ? {
                            backgroundColor: primaryColor,
                            boxShadow: `0 6px 14px -4px ${primaryColor}55`,
                          }
                        : undefined
                    }
                    className={`h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'text-white'
                        : 'text-slate-400 hover:text-[#2D3748] hover:bg-slate-50'
                    }`}
                  >
                    <IconComponent className="w-4 h-4 stroke-[2]" />
                    <span className="text-[10px] font-semibold tracking-tight truncate max-w-full px-0.5">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      )}

      {/* Receipt & Invoice Print Preview Modal */}
      <PrintPreviewModal
        order={receiptOrderToPrint}
        storeSettings={storeSettings}
        cashierName={cashierName}
        onClose={() => setReceiptOrderToPrint(null)}
      />

      {/* Official PDF Sales & Transaction Report Modal */}
      <PdfReportModal
        isOpen={isPdfReportOpen}
        orders={orders}
        products={products}
        categories={categories}
        storeSettings={storeSettings}
        onClose={() => setIsPdfReportOpen(false)}
      />

      {/* Logout Warning Confirmation Modal */}
      {showLogoutConfirmModal && (
        <div
          onClick={() => setShowLogoutConfirmModal(false)}
          className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4 animate-modal-backdrop"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[26px] shadow-2xl border border-slate-100 max-w-sm w-full p-6 text-center space-y-4 animate-modal-pop"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-extrabold text-[#2D3748]">
                {isId ? 'Konfirmasi Keluar Akun' : 'Confirm Logout'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {isId
                  ? 'Apakah Anda yakin ingin keluar dari sesi kasir saat ini?'
                  : 'Are you sure you want to log out from the current cashier session?'}
              </p>
              {totalItemsCount > 0 && (
                <div className="mt-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] font-bold text-amber-800">
                  {isId
                    ? `Perhatian: Masih ada ${totalItemsCount} item di keranjang pesanan yang belum diselesaikan.`
                    : `Warning: You still have ${totalItemsCount} unpaid item(s) in the order cart.`}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirmModal(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#2D3748] text-xs font-extrabold transition-colors cursor-pointer"
              >
                {isId ? 'Batal' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirmModal(false);
                  setOrderSuccess(false);
                  setMobileFullscreenCartOpen(false);
                  setIsAuthenticated(false);
                }}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isId ? 'Ya, Keluar' : 'Yes, Logout'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
