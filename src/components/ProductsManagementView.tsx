import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CategoryId,
  CategoryItem,
  FOOD_ILLUSTRATIONS,
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
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Barcode,
  Check,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  Image as ImageIcon,
  Layers,
  PackagePlus,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UtensilsCrossed,
  X,
} from 'lucide-react';

interface ProductsManagementViewProps {
  products: ProductItem[];
  categories: CategoryItem[];
  storeSettings: StoreBrandingSettings;
  onUpsertProduct: (
    product: ProductItem,
    base64Image?: { data: string; name: string; mime: string }
  ) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onUpdateCategories: (newCategories: CategoryItem[]) => Promise<void>;
}

export const ProductsManagementView: React.FC<ProductsManagementViewProps> = ({
  products,
  categories,
  storeSettings,
  onUpsertProduct,
  onDeleteProduct,
  onUpdateCategories,
}) => {
  const t = TRANSLATIONS[storeSettings.language as Language];
  const isId = storeSettings.language === 'id';
  const primaryColor = storeSettings.primaryColor || '#FF2457';

  // Sub-view toggle: 'products' | 'categories'
  const [subTab, setSubTab] = useState<'products' | 'categories'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');

  // Product Form State (Includes Barcode, Stock & Low Stock Threshold)
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodBarcode, setProdBarcode] = useState('');
  const [prodPrice, setProdPrice] = useState('35000');
  const [prodCategory, setProdCategory] = useState<CategoryId>('burger');
  const [prodStock, setProdStock] = useState('20');
  const [prodThreshold, setProdThreshold] = useState('5');
  const [prodIsNew, setProdIsNew] = useState(true);
  const [prodDriveLink, setProdDriveLink] = useState('');
  const [uploadedFile, setUploadedFile] = useState<{
    data: string;
    name: string;
    mime: string;
  } | null>(null);
  const [isSavingProd, setIsSavingProd] = useState(false);

  // Category Form State (Icon-free!)
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchCat =
        filterCat === 'all' ? true : p.categories.includes(filterCat);
      const matchSearch = q
        ? p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q))
        : true;
      return matchCat && matchSearch;
    });
  }, [products, filterCat, searchQuery]);

  const generateNextBarcode = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `89910021${randomSuffix}`;
  };

  const handleOpenAddProduct = () => {
    setEditingProductId(null);
    setProdName('');
    setProdBarcode(generateNextBarcode());
    setProdPrice('35000');
    setProdCategory(
      categories.find((c) => c.id !== 'hot')?.id ||
        categories[0]?.id ||
        'burger'
    );
    setProdStock('20');
    setProdThreshold('5');
    setProdIsNew(true);
    setProdDriveLink('');
    setUploadedFile(null);
    setShowProductForm(true);
  };

  const handleOpenEditProduct = (prod: ProductItem) => {
    setEditingProductId(prod.id);
    setProdName(prod.name);
    setProdBarcode(prod.barcode || generateNextBarcode());
    setProdPrice(String(Math.round(prod.price)));
    const mainCat =
      prod.categories.find((c) => c !== 'hot') ||
      prod.categories[0] ||
      'burger';
    setProdCategory(mainCat);
    setProdStock(String(prod.stock ?? 20));
    setProdThreshold(String(prod.lowStockThreshold ?? 5));
    setProdIsNew(Boolean(prod.isNew));
    setProdDriveLink(
      prod.imageUrl.startsWith('data:image') ? '' : prod.imageUrl
    );
    setUploadedFile(null);
    setShowProductForm(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedFile({
          data: reader.result,
          name: file.name,
          mime: file.type || 'image/png',
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) return;
    setIsSavingProd(true);
    try {
      const existing = editingProductId
        ? products.find((p) => p.id === editingProductId)
        : undefined;

      const resolvedUrl = uploadedFile
        ? uploadedFile.data
        : prodDriveLink.trim()
        ? resolveGoogleDriveImageUrl(prodDriveLink.trim())
        : existing
        ? existing.imageUrl
        : FOOD_ILLUSTRATIONS.tripleBurger;

      const payload: ProductItem = {
        id: editingProductId || 'prod-' + Date.now(),
        name: prodName.trim(),
        barcode: prodBarcode.trim() || generateNextBarcode(),
        price: Math.max(500, Math.round(Number(prodPrice) || 0)),
        categories: Array.from(new Set(['hot', prodCategory])),
        isNew: prodIsNew,
        isHidden: existing?.isHidden || false,
        popularity: existing?.popularity || 95,
        imageUrl: resolvedUrl,
        stock: Math.max(0, Math.round(Number(prodStock) || 0)),
        lowStockThreshold: Math.max(0, Math.round(Number(prodThreshold) || 0)),
      };

      await onUpsertProduct(payload, uploadedFile || undefined);
      setShowProductForm(false);
      setEditingProductId(null);
    } finally {
      setIsSavingProd(false);
    }
  };

  // Category Management Handlers (Icon-Free)
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    if (editingCatId) {
      const updated = categories.map((c) =>
        c.id === editingCatId
          ? {
              ...c,
              name: catName.trim(),
              nameEn: catName.trim(),
            }
          : c
      );
      await onUpdateCategories(updated);
      setEditingCatId(null);
    } else {
      const slug =
        catName
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_') +
        '_' +
        Date.now().toString().slice(-3);
      const newCat: CategoryItem = {
        id: slug,
        name: catName.trim(),
        nameEn: catName.trim(),
      };
      await onUpdateCategories([...categories, newCat]);
    }
    setCatName('');
  };

  const handleStartEditCategory = (cat: CategoryItem) => {
    setEditingCatId(cat.id);
    setCatName(cat.name);
  };

  const handleDeleteCategory = async (catId: string) => {
    if (categories.length <= 1) return;
    const updated = categories.filter((c) => c.id !== catId);
    await onUpdateCategories(updated);
  };

  const handleMoveCategoryOrder = async (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= categories.length) return;
    const reordered = [...categories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);
    await onUpdateCategories(reordered);
  };

  // Horizontal Category Filter Bar Slider Refs & State
  const filterCatScrollRef = useRef<HTMLDivElement | null>(null);
  const isDraggingFilterCatRef = useRef(false);
  const filterCatDragStartXRef = useRef(0);
  const filterCatScrollStartLeftRef = useRef(0);
  const filterCatHasDraggedRef = useRef(false);
  const [canScrollFilterLeft, setCanScrollFilterLeft] = useState(false);
  const [canScrollFilterRight, setCanScrollFilterRight] = useState(false);

  const updateFilterScrollButtons = useCallback(() => {
    const el = filterCatScrollRef.current;
    if (!el) return;
    setCanScrollFilterLeft(el.scrollLeft > 4);
    setCanScrollFilterRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(updateFilterScrollButtons, 60);
    window.addEventListener('resize', updateFilterScrollButtons);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', updateFilterScrollButtons);
    };
  }, [categories, subTab, updateFilterScrollButtons]);

  const handleSlideFilterCategories = (direction: 'left' | 'right') => {
    const el = filterCatScrollRef.current;
    if (!el) return;
    const scrollAmount = Math.max(el.clientWidth * 0.6, 200);
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 md:pb-10 animate-menu-transition">
      {/* Top Header & Sub-Tab Switcher */}
      <div className="bg-white p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] border border-slate-100 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
          <div
            style={{
              backgroundColor: `${primaryColor}15`,
              color: primaryColor,
            }}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0"
          >
            <UtensilsCrossed className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-extrabold text-[#2D3748] truncate">
              {t.productsMenuTitle}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 line-clamp-1">
              {t.productsMenuSubtitle}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
          <div className="grid grid-cols-2 sm:flex items-center bg-[#F4F5F7] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setSubTab('products')}
              style={
                subTab === 'products'
                  ? { backgroundColor: primaryColor, color: '#FFFFFF' }
                  : undefined
              }
              className={`px-3 sm:px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                subTab === 'products'
                  ? 'shadow-xs'
                  : 'text-slate-500 hover:text-[#2D3748]'
              }`}
            >
              <PackagePlus className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {isId ? 'Daftar Menu' : 'Menu Items'} ({products.length})
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('categories')}
              style={
                subTab === 'categories'
                  ? { backgroundColor: primaryColor, color: '#FFFFFF' }
                  : undefined
              }
              className={`px-3 sm:px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                subTab === 'categories'
                  ? 'shadow-xs'
                  : 'text-slate-500 hover:text-[#2D3748]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {t.categorySettingsBtn} ({categories.length})
              </span>
            </button>
          </div>

          {subTab === 'products' && (
            <button
              type="button"
              onClick={handleOpenAddProduct}
              style={{ backgroundColor: primaryColor }}
              className="px-4 py-2.5 rounded-xl text-white text-xs font-bold shadow-md hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>{t.addNewMenuBtn}</span>
            </button>
          )}
        </div>
      </div>

      {/* ====================================================================
          SUB-TAB 1: PRODUCTS MENU MANAGEMENT (WITH BARCODE, STOCK & THRESHOLD)
         ==================================================================== */}
      {subTab === 'products' && (
        <div key="subtab-products" className="space-y-4 sm:space-y-5 animate-subview-transition">
          {showProductForm && (
            <form
              onSubmit={handleSubmitProduct}
              className="bg-white p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] border-2 shadow-lg space-y-4 animate-modal-pop"
              style={{ borderColor: `${primaryColor}40` }}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-base text-[#2D3748]">
                  {editingProductId
                    ? isId
                      ? 'Edit Menu, Barcode & Pengaturan Stok'
                      : 'Edit Menu, Barcode & Stock Settings'
                    : isId
                    ? 'Tambah Menu Produk Baru'
                    : 'Add New Menu Item'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowProductForm(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-[#2D3748] mb-1">
                    {isId ? 'Nama Menu' : 'Menu Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="Mis. Burger Wagyu Spesial"
                    className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D3748] mb-1">
                    {t.barcodeInputLabel}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      required
                      value={prodBarcode}
                      onChange={(e) => setProdBarcode(e.target.value)}
                      placeholder="899100210001"
                      className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono font-bold tabular-nums focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setProdBarcode(generateNextBarcode())}
                      title={isId ? 'Acak Kode Barcode' : 'Generate Barcode'}
                      className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer shrink-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D3748] mb-1">
                    {isId ? 'Harga (Rupiah Rp)' : 'Price (IDR Rp)'}
                  </label>
                  <input
                    type="number"
                    step="500"
                    min="500"
                    required
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    placeholder="35000"
                    className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold tabular-nums focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D3748] mb-1">
                    {t.stockInputLabel}
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold tabular-nums focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D3748] mb-1">
                    {t.thresholdInputLabel}
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={prodThreshold}
                    onChange={(e) => setProdThreshold(e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold tabular-nums focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <div>
                  <label className="block text-xs font-bold text-[#2D3748] mb-1">
                    {isId ? 'Kategori Menu' : 'Category'}
                  </label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {isId ? cat.name : cat.nameEn || cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D3748] mb-1">
                    {isId ? 'Link Gambar (Opsional)' : 'Image Link (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={prodDriveLink}
                    onChange={(e) => setProdDriveLink(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2D3748] mb-1">
                    {isId
                      ? 'Atau Upload File Gambar'
                      : 'Or Upload Product Image'}
                  </label>
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl p-2 text-xs text-slate-600 cursor-pointer">
                    <ImageIcon
                      className="w-4 h-4"
                      style={{ color: primaryColor }}
                    />
                    <span className="truncate">
                      {uploadedFile
                        ? uploadedFile.name
                        : isId
                        ? 'Pilih file gambar (JPG/PNG)'
                        : 'Choose image file'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <label className="flex items-center gap-2 text-xs font-bold text-[#2D3748] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prodIsNew}
                    onChange={(e) => setProdIsNew(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span>
                    {isId
                      ? 'Tampilkan Label "New" pada Kartu Menu'
                      : 'Show "New" Tag on Card'}
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowProductForm(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold cursor-pointer"
                  >
                    {isId ? 'Batal' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProd}
                    style={{ backgroundColor: primaryColor }}
                    className="px-6 py-2.5 rounded-xl text-white text-xs font-bold shadow-md hover:opacity-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {isSavingProd
                        ? 'Menyimpan...'
                        : editingProductId
                        ? isId
                          ? 'Simpan Perubahan Menu'
                          : 'Update Menu'
                        : isId
                        ? 'Tambahkan Menu'
                        : 'Save New Menu'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Filter & Search Bar (With Slidable Category Bar) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {canScrollFilterLeft && (
                <button
                  type="button"
                  onClick={() => handleSlideFilterCategories('left')}
                  className="w-8 h-8.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 text-[#2D3748] shadow-2xs flex items-center justify-center shrink-0 cursor-pointer transition-all active:scale-95"
                  title={isId ? 'Geser Kiri' : 'Slide Left'}
                >
                  <ChevronLeft className="w-4 h-4" style={{ color: primaryColor }} />
                </button>
              )}

              <div
                ref={filterCatScrollRef}
                onScroll={updateFilterScrollButtons}
                onMouseDown={(e) => {
                  const el = filterCatScrollRef.current;
                  if (!el) return;
                  isDraggingFilterCatRef.current = true;
                  filterCatHasDraggedRef.current = false;
                  filterCatDragStartXRef.current = e.pageX - el.offsetLeft;
                  filterCatScrollStartLeftRef.current = el.scrollLeft;
                }}
                onMouseMove={(e) => {
                  if (!isDraggingFilterCatRef.current) return;
                  const el = filterCatScrollRef.current;
                  if (!el) return;
                  const x = e.pageX - el.offsetLeft;
                  const walk = (x - filterCatDragStartXRef.current) * 1.35;
                  if (Math.abs(walk) > 5) {
                    filterCatHasDraggedRef.current = true;
                    e.preventDefault();
                  }
                  el.scrollLeft = filterCatScrollStartLeftRef.current - walk;
                  updateFilterScrollButtons();
                }}
                onMouseUp={() => {
                  isDraggingFilterCatRef.current = false;
                }}
                onMouseLeave={() => {
                  isDraggingFilterCatRef.current = false;
                }}
                onWheel={(e) => {
                  const el = filterCatScrollRef.current;
                  if (!el) return;
                  if (
                    Math.abs(e.deltaY) > Math.abs(e.deltaX) &&
                    el.scrollWidth > el.clientWidth
                  ) {
                    el.scrollLeft += e.deltaY;
                    updateFilterScrollButtons();
                  }
                }}
                className="flex-1 flex items-center gap-2 overflow-x-auto touch-pan-x pb-1 no-scrollbar cursor-grab active:cursor-grabbing select-none"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    if (filterCatHasDraggedRef.current) {
                      e.preventDefault();
                      filterCatHasDraggedRef.current = false;
                      return;
                    }
                    setFilterCat('all');
                    e.currentTarget.scrollIntoView({
                      behavior: 'smooth',
                      inline: 'nearest',
                      block: 'nearest',
                    });
                  }}
                  style={
                    filterCat === 'all'
                      ? { backgroundColor: primaryColor, color: '#FFF' }
                      : undefined
                  }
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 select-none ${
                    filterCat === 'all'
                      ? 'shadow-xs'
                      : 'bg-white text-slate-500 hover:text-[#2D3748]'
                  }`}
                >
                  {isId ? 'Semua Kategori' : 'All Categories'}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={(e) => {
                      if (filterCatHasDraggedRef.current) {
                        e.preventDefault();
                        filterCatHasDraggedRef.current = false;
                        return;
                      }
                      setFilterCat(cat.id);
                      e.currentTarget.scrollIntoView({
                        behavior: 'smooth',
                        inline: 'nearest',
                        block: 'nearest',
                      });
                    }}
                    style={
                      filterCat === cat.id
                        ? { backgroundColor: primaryColor, color: '#FFF' }
                        : undefined
                    }
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 select-none ${
                      filterCat === cat.id
                        ? 'shadow-xs'
                        : 'bg-white text-slate-500 hover:text-[#2D3748]'
                    }`}
                  >
                    {isId ? cat.name : cat.nameEn || cat.name}
                  </button>
                ))}
              </div>

              {canScrollFilterRight && (
                <button
                  type="button"
                  onClick={() => handleSlideFilterCategories('right')}
                  className="w-8 h-8.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 text-[#2D3748] shadow-2xs flex items-center justify-center shrink-0 cursor-pointer transition-all active:scale-95"
                  title={isId ? 'Geser Kanan' : 'Slide Right'}
                >
                  <ChevronRight className="w-4 h-4" style={{ color: primaryColor }} />
                </button>
              )}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isId ? 'Cari nama / barcode...' : 'Search name / barcode...'
                }
                className="w-full bg-white rounded-xl pl-10 pr-4 py-2 text-xs border border-slate-200/80 focus:outline-none"
              />
            </div>
          </div>

          {/* Medium-Sized Product Cards Grid with Larger Clear Thumbnail, Barcode, Stock, Edit & Delete */}
          <div
            key={filterCat}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 sm:gap-4 animate-subview-transition"
          >
            {filteredProducts.map((prod, idx) => {
              const isOutOfStock = prod.stock <= 0;
              const isLowStock =
                !isOutOfStock && prod.stock <= prod.lowStockThreshold;

              return (
                <div
                  key={prod.id}
                  style={{ animationDelay: `${Math.min(idx, 12) * 22}ms` }}
                  className="animate-card-enter bg-white rounded-[16px] sm:rounded-[18px] p-2.5 sm:p-3.5 border border-slate-100 flex flex-col justify-between relative group hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
                >
                  {/* Top Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-1 w-full mb-1">
                    {isOutOfStock ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                        <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{t.outOfStockBadge}</span>
                      </span>
                    ) : isLowStock ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                        <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">
                          {t.lowStockBadge} ({prod.stock})
                        </span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400 tabular-nums">
                        Stok: {prod.stock}
                      </span>
                    )}

                    {prod.isNew && (
                      <span
                        style={{ backgroundColor: primaryColor }}
                        className="text-white text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      >
                        {t.newBadge}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col items-center text-center mt-0.5">
                    {/* Enlarged Clear Product Photo Thumbnail */}
                    <div className="w-full h-24 sm:h-28 lg:h-32 flex items-center justify-center my-1.5 rounded-xl bg-slate-50 overflow-hidden">
                      <img
                        src={resolveGoogleDriveImageUrl(prod.imageUrl)}
                        alt={prod.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <h3 className="font-bold text-xs sm:text-[13px] text-[#2D3748] line-clamp-1">
                      {prod.name}
                    </h3>
                    <p
                      style={{ color: primaryColor }}
                      className="font-extrabold text-xs tabular-nums mt-0.5"
                    >
                      {formatRupiah(prod.price)}
                    </p>
                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200/70 text-[9px] font-mono text-slate-400 mt-1 max-w-full truncate">
                      <Barcode className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                      <span className="truncate">{prod.barcode}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleOpenEditProduct(prod)}
                      className="flex-1 py-2 sm:py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#2D3748] text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>{t.editMenuBtn}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteProduct(prod.id)}
                      className="p-2 sm:p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                      title={t.deleteMenuBtn}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ====================================================================
          SUB-TAB 2: CATEGORY SETTINGS (NO ICONS!)
         ==================================================================== */}
      {subTab === 'categories' && (
        <div
          key="subtab-categories"
          className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 animate-subview-transition"
        >
          {/* Add / Edit Category Form (5 cols) */}
          <form
            onSubmit={handleSaveCategory}
            className="lg:col-span-5 bg-white p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] border border-slate-100 space-y-4 h-fit animate-card-enter"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus
                  className="w-5 h-5"
                  style={{ color: primaryColor }}
                />
                <h3 className="font-extrabold text-sm sm:text-base text-[#2D3748]">
                  {editingCatId
                    ? isId
                      ? 'Edit Kategori'
                      : 'Edit Category'
                    : t.addCategoryBtn}
                </h3>
              </div>
              {editingCatId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCatId(null);
                    setCatName('');
                  }}
                  className="text-xs text-slate-400 hover:text-slate-700"
                >
                  {isId ? 'Batal' : 'Cancel'}
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D3748] mb-1.5">
                {isId ? 'Nama Kategori' : 'Category Name'}
              </label>
              <input
                type="text"
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder={t.categoryNamePlaceholder}
                className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none"
              />
            </div>

            <button
              type="submit"
              style={{ backgroundColor: primaryColor }}
              className="w-full py-3 rounded-xl text-white text-xs font-bold shadow-md hover:opacity-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>
                {editingCatId
                  ? isId
                    ? 'Simpan Perubahan Kategori'
                    : 'Update Category'
                  : t.addCategoryBtn}
              </span>
            </button>
          </form>

          {/* Existing Categories List (Icon-Free, 7 cols) */}
          <div className="lg:col-span-7 bg-white p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] border border-slate-100 space-y-4">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-[#2D3748]">
                {t.categorySectionTitle} ({categories.length})
              </h3>
              <p className="text-xs text-slate-400">{t.categorySectionDesc}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((cat, idx) => {
                const itemCount = products.filter((p) =>
                  p.categories.includes(cat.id)
                ).length;

                return (
                  <div
                    key={cat.id}
                    style={{ animationDelay: `${Math.min(idx, 10) * 25}ms` }}
                    className="animate-card-enter p-3.5 sm:p-4 rounded-2xl bg-[#F8F9FA] border border-slate-100 flex items-center justify-between gap-3 hover:-translate-y-0.5 hover:shadow-xs transition-all duration-200"
                  >
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-sm text-[#2D3748] truncate">
                        {cat.name}
                      </h4>
                      <span className="text-xs text-slate-400">
                        {itemCount} {isId ? 'Menu Produk' : 'Products'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveCategoryOrder(idx, -1)}
                        className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-500 disabled:opacity-30 transition-colors cursor-pointer"
                        title={isId ? 'Geser Urutan ke Kiri / Atas' : 'Move Left / Up'}
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === categories.length - 1}
                        onClick={() => handleMoveCategoryOrder(idx, 1)}
                        className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-500 disabled:opacity-30 transition-colors cursor-pointer"
                        title={isId ? 'Geser Urutan ke Kanan / Bawah' : 'Move Right / Down'}
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEditCategory(cat)}
                        className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {cat.id !== 'hot' && categories.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-2 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
