export type Language = 'en' | 'id';

export interface StoreBrandingSettings {
  storeName: string;
  storeTagline: string;
  logoType: 'default_m' | 'custom_image';
  customLogoUrl: string;
  primaryColor: string;
  secondaryAccentColor: string;
  language: Language;
  autoTwoWaySync: boolean;
  taxEnabled: boolean;
  taxName: string;
  taxRate: number;
  loginUsername?: string;
  loginPassword?: string;
}

export const DEFAULT_STORE_SETTINGS: StoreBrandingSettings = {
  storeName: 'PinkPOS Resto',
  storeTagline: 'Fast Food & Specialty Coffee',
  logoType: 'default_m',
  customLogoUrl: '',
  primaryColor: '#FF2457',
  secondaryAccentColor: '#FFCC33',
  language: 'id',
  autoTwoWaySync: true,
  taxEnabled: true,
  taxName: 'PBF',
  taxRate: 5,
  loginUsername: 'kasir@pinkpos.id',
  loginPassword: '123456',
};

export const THEME_COLOR_PRESETS = [
  { name: 'Hot Pink (Video Default)', hex: '#FF2457' },
  { name: 'Vibrant Magenta', hex: '#E11D48' },
  { name: 'Sunset Orange', hex: '#F97316' },
  { name: 'Emerald Fresh', hex: '#10B981' },
  { name: 'Ocean Royal Blue', hex: '#2563EB' },
  { name: 'Electric Violet', hex: '#7C3AED' },
  { name: 'Modern Slate', hex: '#1E293B' },
];

export const TRANSLATIONS = {
  en: {
    // Sidebar
    navHome: 'Home',
    navProducts: 'Products',
    navDashboard: 'Dashboard',
    navMessages: 'Messages',
    navBills: 'Transactions',
    navSetting: 'Setting',
    navLogout: 'Log out',

    // Header & POS Home
    orderMenuTitle: 'Order Menu',
    searchPlaceholder: 'Search menu or scan barcode...',
    barcodeScannerBtn: 'Barcode Scanner',
    barcodeScannerReady: 'USB / Bluetooth Scanner Ready',
    barcodeInputPlaceholder: 'Scan or type barcode (e.g. 899100210001)...',
    barcodeInputLabel: 'Barcode (EAN / SKU)',
    barcodeScannedToast: 'Barcode Scanned',
    barcodeNotFoundToast: 'Barcode not found in catalog',
    quickScanSimulatorTitle: 'Quick Scan Test (Click item to simulate scan)',
    sortByLabel: 'Sort By :',
    sortPopular: 'Popular',
    sortPriceAsc: 'Price: Low to High',
    sortPriceDesc: 'Price: High to Low',
    sortNewest: 'Newest',
    newBadge: 'New',
    lowStockBadge: 'Low Stock',
    outOfStockBadge: 'Out of Stock',
    stockLeftLabel: 'left',
    subTotal: 'Sub Total',
    taxLabel: 'PBF (5%)',
    chargeBtn: 'Charge',
    emptyCartTitle: 'Your Order Menu is empty',
    emptyCartDesc: 'Select any item or scan a barcode to start a new order.',
    clearOrder: 'Clear Order Menu',
    showFullscreenCartBtn: 'Show Fullscreen Cart',
    closeFullscreenCartBtn: 'Minimize Cart',
    customerNameLabel: 'Customer Name (Optional)',
    customerNamePlaceholder: 'Customer Name (Optional)...',
    customerLabel: 'Customer',
    paymentMethodLabel: 'Payment Method',
    payCash: 'Cash',
    payQris: 'QRIS',
    payCard: 'Debit / Card',
    payTransfer: 'Transfer / E-Wallet',

    // Categories
    catHot: 'Hot',
    catBurger: 'Burger',
    catPizza: 'Pizza',
    catSnack: 'Snack',
    catSoftDrink: 'Soft Drink',
    catCoffee: 'Coffee',
    catIceCream: 'Ice Cream',

    // Order Success & Receipt
    orderSuccessTitle: 'Order Success',
    backToHome: 'Back to home',
    printReceiptBtn: 'Print Receipt',
    totalPaid: 'Total Paid',
    completedStatus: 'Paid & Completed',

    // Products Menu
    productsMenuTitle: 'Product Menu Management',
    productsMenuSubtitle:
      'Manage menu items, barcodes, pricing, stock levels, and low-stock alerts',
    addNewMenuBtn: 'Add New Menu',
    editMenuBtn: 'Edit',
    deleteMenuBtn: 'Delete',
    hideMenuBtn: 'Hide',
    unhideMenuBtn: 'Unhide',
    hiddenBadge: 'Hidden',
    showHiddenMenusBtn: 'Hidden Menus',
    restoreAllMenusBtn: 'Unhide All',
    hideSidebarBtn: 'Hide Sidebar',
    showSidebarBtn: 'Show Sidebar',
    hideOrderPanelBtn: 'Hide Order Menu',
    showOrderPanelBtn: 'Show Order Menu',
    categorySettingsBtn: 'Manage Categories',
    stockInputLabel: 'Available Stock',
    thresholdInputLabel: 'Low Stock Threshold',

    // Category Settings
    categorySectionTitle: 'Category Management',
    categorySectionDesc:
      'Add, rename, or remove product categories displayed on the POS menu',
    addCategoryBtn: 'Add Category',
    categoryNamePlaceholder: 'Category Name (e.g. Dessert)',

    // Print PDF Report
    printPdfReportBtn: 'Print PDF Report',
    salesReportTitle: 'Official POS Sales & Transaction Report',

    // Login Page
    loginWelcome: 'Welcome Back',
    loginSubtitle: 'Sign in to access your Point of Sale terminal',
    usernameLabel: 'Username or Email',
    passwordLabel: 'Password / Cashier PIN',
    loginButton: 'Sign In to POS',
    quickDemoLogin: 'Quick Cashier Login (1-Click)',
    replayIntro: 'Replay Opening Animation',

    // Dashboard & Charts
    dashboardTitle: 'Sales Analytics & Performance',
    dashboardSubtitle: 'Overview of store revenue, orders, and top menu items',
    periodToday: 'Today',
    period7Days: '7 Days',
    periodMonthly: 'Monthly',
    periodYearly: 'Yearly',
    kpiRevenue: 'Total Revenue',
    kpiOrders: 'Total Orders',
    kpiAvgOrder: 'Average Order',
    kpiTax: 'Total Tax',
    chartRevenueTitle: 'Sales & Revenue Trend',
    chartCategoryTitle: 'Sales by Category',
    chartTopProducts: 'Top Selling Products',
    unitsSold: 'sold',

    // Messages
    messagesTitle: 'Kitchen & Cashier Live Messages',
    messagesPlaceholder: 'Write order note or kitchen instruction...',
    sendBtn: 'Send',

    // Transactions (formerly Bills)
    billsTitle: 'Transactions & Order History',
    billsSubtitle: 'Complete record of completed customer transactions',
    deleteBill: 'Void / Delete Transaction',
    previewSuccess: 'Preview Order Success',

    // Settings, Branding & Tax
    storeCustomizationTitle: 'Store Branding, Logo & Theme Color',
    storeCustomizationDesc:
      'Customize your store name, logo, and primary application color',
    storeNameInput: 'Store Name',
    storeTaglineInput: 'Store Tagline',
    logoOptionDefault: 'Stylized "M" Vector Logo',
    logoOptionCustom: 'Custom Store Logo',
    uploadLogoBtn: 'Upload Store Logo Image',
    appThemeColorLabel: 'Application Primary Color',
    saveBrandingBtn: 'Save Store Settings',
    taxSettingsTitle: 'Tax & Service Charge Settings',
    taxSettingsDesc:
      'Configure automatic tax calculation, tax label, and percentage rate applied to orders',
    taxEnabledLabel: 'Enable Automatic Tax on Orders',
    taxNameLabel: 'Tax Name / Label (e.g. PBF, PB1, PPN, GST)',
    taxRateLabel: 'Tax Percentage Rate (%)',
    saveTaxBtn: 'Save Tax Settings',

    // Login User & Password Settings
    loginAccountSettingsTitle: 'Login Account Settings (User & Password)',
    loginAccountSettingsDesc:
      'Change the username/user and password/PIN used to sign in to the POS application',
    newUsernameLabel: 'Login Username / User',
    newPasswordLabel: 'New Login Password / PIN',
    confirmPasswordLabel: 'Confirm New Password / PIN',
    saveLoginAccountBtn: 'Save User & Password',
    loginAccountSavedMsg: 'Login user & password updated successfully!',
    passwordMismatchError: 'Password confirmation does not match!',
    invalidCredentialsError:
      'Invalid username or password/PIN! Please check your login credentials.',
  },
  id: {
    // Sidebar
    navHome: 'Beranda',
    navProducts: 'Produk',
    navDashboard: 'Dasbor',
    navMessages: 'Pesan',
    navBills: 'Transaksi',
    navSetting: 'Pengaturan',
    navLogout: 'Keluar',

    // Header & POS Home
    orderMenuTitle: 'Order Menu',
    searchPlaceholder: 'Cari menu atau scan barcode...',
    barcodeScannerBtn: 'Scan Barcode',
    barcodeScannerReady: 'Scanner USB / Bluetooth Aktif',
    barcodeInputPlaceholder: 'Scan atau ketik kode barcode (mis. 899100210001)...',
    barcodeInputLabel: 'Kode Barcode (EAN / SKU)',
    barcodeScannedToast: 'Barcode Terdeteksi',
    barcodeNotFoundToast: 'Kode barcode tidak ditemukan',
    quickScanSimulatorTitle: 'Simulasi Scan Cepat (Klik item untuk test scan)',
    sortByLabel: 'Urutkan :',
    sortPopular: 'Populer',
    sortPriceAsc: 'Harga: Rendah ke Tinggi',
    sortPriceDesc: 'Harga: Tinggi ke Rendah',
    sortNewest: 'Terbaru',
    newBadge: 'New',
    lowStockBadge: 'Stok Menipis',
    outOfStockBadge: 'Stok Habis',
    stockLeftLabel: 'tersisa',
    subTotal: 'Sub Total',
    taxLabel: 'PBF (5%)',
    chargeBtn: 'Bayar',
    emptyCartTitle: 'Belum ada pesanan',
    emptyCartDesc: 'Pilih menu atau scan barcode produk untuk membuat pesanan baru.',
    clearOrder: 'Kosongkan Pesanan',
    showFullscreenCartBtn: 'Show Fullscreen Cart',
    closeFullscreenCartBtn: 'Kecilkan Keranjang',
    customerNameLabel: 'Nama Pelanggan (Opsional)',
    customerNamePlaceholder: 'Nama Pelanggan (Opsional)...',
    customerLabel: 'Pelanggan',
    paymentMethodLabel: 'Metode Pembayaran',
    payCash: 'Tunai',
    payQris: 'QRIS',
    payCard: 'Debit / Kredit',
    payTransfer: 'Transfer / E-Wallet',

    // Categories
    catHot: 'Populer',
    catBurger: 'Burger',
    catPizza: 'Pizza',
    catSnack: 'Camilan',
    catSoftDrink: 'Minuman',
    catCoffee: 'Kopi',
    catIceCream: 'Es Krim',

    // Order Success & Receipt
    orderSuccessTitle: 'Order Success',
    backToHome: 'Kembali ke beranda',
    printReceiptBtn: 'Cetak Struk',
    totalPaid: 'Total Dibayar',
    completedStatus: 'Lunas',

    // Products Menu
    productsMenuTitle: 'Manajemen Menu Produk',
    productsMenuSubtitle:
      'Kelola daftar menu, kode barcode, harga, jumlah stok, dan batas stok minimum',
    addNewMenuBtn: 'Tambah Menu Baru',
    editMenuBtn: 'Edit',
    deleteMenuBtn: 'Hapus',
    hideMenuBtn: 'Hide',
    unhideMenuBtn: 'Tampilkan',
    hiddenBadge: 'Tersembunyi',
    showHiddenMenusBtn: 'Menu Tersembunyi',
    restoreAllMenusBtn: 'Tampilkan Semua',
    hideSidebarBtn: 'Sembunyikan Navigasi',
    showSidebarBtn: 'Tampilkan Navigasi',
    hideOrderPanelBtn: 'Hide Order Menu',
    showOrderPanelBtn: 'Tampilkan Order Menu',
    categorySettingsBtn: 'Pengaturan Kategori',
    stockInputLabel: 'Stok Tersedia',
    thresholdInputLabel: 'Batas Minimum Stok',

    // Category Settings
    categorySectionTitle: 'Pengaturan Kategori Menu',
    categorySectionDesc:
      'Tambah, ubah nama, atau hapus kategori menu produk',
    addCategoryBtn: 'Tambah Kategori',
    categoryNamePlaceholder: 'Nama Kategori (mis. Dessert / Paket Hemat)',

    // Print PDF Report
    printPdfReportBtn: 'Cetak Laporan PDF',
    salesReportTitle: 'Laporan Resmi Penjualan & Transaksi POS',

    // Login Page
    loginWelcome: 'Selamat Datang',
    loginSubtitle: 'Masuk untuk mengakses sistem kasir Point of Sale',
    usernameLabel: 'Username atau Email Kasir',
    passwordLabel: 'Password / PIN Kasir',
    loginButton: 'Masuk ke Aplikasi POS',
    quickDemoLogin: 'Login Cepat Kasir (1-Klik)',
    replayIntro: 'Putar Animasi Pembuka',

    // Dashboard & Charts
    dashboardTitle: 'Grafik Penjualan & Analitik',
    dashboardSubtitle: 'Ringkasan performa pendapatan, transaksi, dan menu terlaris',
    periodToday: 'Hari Ini',
    period7Days: '7 Hari',
    periodMonthly: 'Bulanan',
    periodYearly: 'Tahunan',
    kpiRevenue: 'Total Pendapatan',
    kpiOrders: 'Total Pesanan',
    kpiAvgOrder: 'Rata-rata Transaksi',
    kpiTax: 'Total Pajak',
    chartRevenueTitle: 'Grafik Tren Penjualan & Pendapatan',
    chartCategoryTitle: 'Penjualan per Kategori',
    chartTopProducts: 'Produk Terlaris',
    unitsSold: 'terjual',

    // Messages
    messagesTitle: 'Pesan Dapur & Kasir',
    messagesPlaceholder: 'Tulis catatan pesanan atau instruksi dapur...',
    sendBtn: 'Kirim',

    // Transaksi
    billsTitle: 'Transaksi & Riwayat Pesanan',
    billsSubtitle: 'Rekapitulasi transaksi pembayaran pelanggan',
    deleteBill: 'Hapus / Batalkan Transaksi',
    previewSuccess: 'Lihat Layar Order Success',

    // Settings, Branding & Tax
    storeCustomizationTitle: 'Pengaturan Nama Toko, Logo & Warna Aplikasi',
    storeCustomizationDesc:
      'Sesuaikan identitas nama toko, logo, dan warna tema aplikasi',
    storeNameInput: 'Nama Toko',
    storeTaglineInput: 'Slogan / Deskripsi Toko',
    logoOptionDefault: 'Logo Vektor "M"',
    logoOptionCustom: 'Logo Kustom',
    uploadLogoBtn: 'Upload Gambar Logo Toko',
    appThemeColorLabel: 'Warna Utama Aplikasi',
    saveBrandingBtn: 'Simpan Pengaturan Toko',
    taxSettingsTitle: 'Pengaturan Pajak & Biaya Layanan',
    taxSettingsDesc:
      'Atur nama pajak (PBF / PB1 / PPN), status aktif, dan persentase pajak otomatis pada transaksi',
    taxEnabledLabel: 'Aktifkan Perhitungan Pajak Otomatis',
    taxNameLabel: 'Nama / Label Pajak (mis. PBF, PB1, PPN)',
    taxRateLabel: 'Persentase Pajak (%)',
    saveTaxBtn: 'Simpan Pengaturan Pajak',

    // Pengaturan Akun Login (User & Password)
    loginAccountSettingsTitle: 'Pengaturan Akun Login (User & Password)',
    loginAccountSettingsDesc:
      'Ubah username/user dan password/PIN untuk masuk (login) ke aplikasi POS',
    newUsernameLabel: 'User / Username Login',
    newPasswordLabel: 'Password / PIN Login Baru',
    confirmPasswordLabel: 'Konfirmasi Password / PIN Baru',
    saveLoginAccountBtn: 'Simpan User & Password',
    loginAccountSavedMsg: 'User dan password login berhasil diperbarui!',
    passwordMismatchError: 'Konfirmasi password tidak sesuai!',
    invalidCredentialsError:
      'User atau password/PIN salah! Silakan periksa kembali.',
  },
};
