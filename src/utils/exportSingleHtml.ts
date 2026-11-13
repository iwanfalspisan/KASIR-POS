import {
  PermanentGoogleConfig,
  ProductItem,
  generateAppsScriptCode,
} from '../data/posData';

export function buildSelfContainedHtml(
  config: PermanentGoogleConfig,
  products: ProductItem[]
): string {
  const serializedConfig = JSON.stringify(config, null, 2);
  const serializedProducts = JSON.stringify(products, null, 2);
  const appsScriptCode = generateAppsScriptCode(config)
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PinkPOS — Point of Sale (Rupiah Edition)</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background-color: #F4F5F7;
      color: #2D3748;
    }
    .tabular-nums { font-variant-numeric: tabular-nums; }
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-thumb { background: rgba(160,174,192,0.35); border-radius: 9999px; }
  </style>
</head>
<body class="w-screen h-screen overflow-hidden bg-[#F4F5F7] text-[#2D3748] antialiased selection:bg-[#FF2457]/15 selection:text-[#FF2457]">
  <div id="app" class="w-full h-full"></div>

  <script>
    const PERMANENT_GOOGLE_CONFIG = ${serializedConfig};
    const INITIAL_PRODUCTS = ${serializedProducts};
    const APPS_SCRIPT_CODE = \`${appsScriptCode}\`;

    function formatRupiah(amount) {
      return 'Rp ' + Math.round(Number(amount) || 0).toLocaleString('id-ID');
    }

    const state = {
      activeNav: 'home',
      activeCategory: 'hot',
      searchQuery: '',
      orderSuccess: false,
      cart: [],
      products: JSON.parse(localStorage.getItem('pinkpos_products_idr')) || INITIAL_PRODUCTS,
      orders: JSON.parse(localStorage.getItem('pinkpos_orders_idr')) || [],
      config: JSON.parse(localStorage.getItem('pinkpos_google_config')) || PERMANENT_GOOGLE_CONFIG
    };

    function resolveDriveImg(url) {
      if (!url) return '';
      if (url.startsWith('data:image/')) return url;
      const m1 = url.match(/\\/file\\/d\\/([a-zA-Z0-9_-]+)/);
      if (m1 && m1[1]) return 'https://lh3.googleusercontent.com/d/' + m1[1] + '=w600';
      const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (m2 && m2[1]) return 'https://lh3.googleusercontent.com/d/' + m2[1] + '=w600';
      return url;
    }

    function addToCart(productId) {
      const product = state.products.find(p => p.id === productId);
      if (!product || product.stock <= 0) return;
      const existing = state.cart.find(item => item.product.id === productId);
      if (existing) {
        existing.quantity += 1;
      } else {
        state.cart.push({ product, quantity: 1 });
      }
      render();
    }

    function updateQty(productId, delta) {
      const idx = state.cart.findIndex(item => item.product.id === productId);
      if (idx === -1) return;
      state.cart[idx].quantity += delta;
      if (state.cart[idx].quantity <= 0) {
        state.cart.splice(idx, 1);
      }
      render();
    }

    function clearCart() {
      state.cart = [];
      render();
    }

    async function chargeOrder() {
      if (state.cart.length === 0) return;
      const subTotal = state.cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
      const taxPbf = Math.round(subTotal * 0.05);
      const total = subTotal + taxPbf;
      const orderRecord = {
        orderId: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
        createdAt: new Date().toLocaleString('id-ID'),
        items: state.cart.map(i => ({ id: i.product.id, name: i.product.name, price: i.product.price, quantity: i.quantity, subtotal: i.product.price * i.quantity })),
        subTotal,
        taxPbf,
        total
      };
      state.orders.unshift(orderRecord);
      localStorage.setItem('pinkpos_orders_idr', JSON.stringify(state.orders));
      state.orderSuccess = true;
      state.cart = [];
      render();

      try {
        await fetch(state.config.APPS_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'saveOrder', ...orderRecord })
        });
      } catch (e) {}
    }

    function render() {
      const subTotal = state.cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
      const taxPbf = Math.round(subTotal * 0.05);
      const total = subTotal + taxPbf;

      const filtered = state.products
        .filter(p => p.categories.includes(state.activeCategory))
        .filter(p => p.name.toLowerCase().includes(state.searchQuery.toLowerCase()));

      const categories = [
        { id: 'hot', label: 'Populer' },
        { id: 'burger', label: 'Burger' },
        { id: 'pizza', label: 'Pizza' },
        { id: 'snack', label: 'Camilan' },
        { id: 'soft_drink', label: 'Minuman' },
        { id: 'coffee', label: 'Kopi' },
        { id: 'ice_cream', label: 'Es Krim' }
      ];

      document.getElementById('app').innerHTML = \`
        <div class="w-screen h-screen overflow-hidden flex bg-[#F4F5F7]">
          <aside class="w-24 bg-white border-r border-slate-100 flex flex-col items-center py-7 justify-between shrink-0">
            <div class="flex flex-col items-center gap-8">
              <div class="flex items-end gap-1 cursor-pointer" onclick="state.orderSuccess=false;state.activeNav='home';render()">
                <span class="w-2.5 h-2.5 rounded-full bg-[#FF2457]"></span>
                <span class="w-2.5 h-6 rounded-full bg-[#FF2457] -rotate-25"></span>
                <span class="w-2.5 h-5 rounded-full bg-[#FF2457] -rotate-25"></span>
              </div>
              <nav class="flex flex-col gap-4">
                <button onclick="state.orderSuccess=false;state.activeNav='home';render()" class="w-16 h-16 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all \${state.activeNav==='home' ? 'bg-[#FF2457] text-white shadow-lg shadow-[#FF2457]/30' : 'text-slate-400 hover:text-slate-700'}">
                  <span class="text-xs font-semibold">Beranda</span>
                </button>
              </nav>
            </div>
          </aside>

          \${state.orderSuccess ? \`
            <main class="flex-1 bg-white flex flex-col items-center justify-center p-8 text-center">
              <h2 class="text-2xl font-bold text-[#2D3748] mb-10">Order Success</h2>
              <p class="text-slate-400 text-lg max-w-md mb-10">Pesanan Anda siap untuk diantar.<br/>Mohon tunggu sebentar</p>
              <button onclick="state.orderSuccess=false;render()" class="bg-[#FF2457] hover:bg-[#e01b49] text-white font-semibold px-14 py-4 rounded-xl shadow-lg shadow-[#FF2457]/30 transition-all">
                Kembali ke beranda
              </button>
            </main>
          \` : \`
            <main class="flex-1 p-8 overflow-y-auto">
              <div class="flex items-center justify-between mb-6">
                <h1 class="text-2xl font-bold text-[#2D3748]">Order Menu</h1>
                <input
                  type="text"
                  value="\${state.searchQuery}"
                  oninput="state.searchQuery=this.value;render()"
                  placeholder="Cari makanan cepat saji, kopi, dll"
                  class="bg-white rounded-xl px-4 py-2.5 text-sm w-72 border border-slate-100 focus:outline-none focus:border-[#FF2457]"
                />
              </div>

              <div class="flex gap-3 overflow-x-auto pb-4 mb-6">
                \${categories.map(c => \`
                  <button onclick="state.activeCategory='\${c.id}';render()" class="px-5 py-2.5 rounded-xl bg-white flex items-center justify-center shrink-0 transition-all \${state.activeCategory===c.id ? 'bg-[#FF2457] text-white shadow-md font-bold' : 'border border-slate-100 text-slate-600 hover:border-slate-200 font-semibold'}">
                    <span class="text-xs">\${c.label}</span>
                  </button>
                \`).join('')}
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                \${filtered.map(p => {
                  const isLow = (p.stock ?? 20) > 0 && (p.stock ?? 20) <= (p.lowStockThreshold ?? 5);
                  return \`
                  <div onclick="addToCart('\${p.id}')" class="bg-white rounded-[22px] p-5 flex flex-col items-center text-center cursor-pointer hover:-translate-y-1 hover:shadow-md transition-all relative">
                    \${p.isNew ? '<span class="absolute top-4 right-5 bg-[#FF2457] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">New</span>' : ''}
                    \${isLow ? '<span class="absolute top-4 left-4 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Stok Menipis (' + p.stock + ')</span>' : ''}
                    <img src="\${resolveDriveImg(p.imageUrl)}" alt="\${p.name}" class="w-28 h-24 object-contain mb-3" />
                    <h3 class="font-bold text-[#2D3748] text-base">\${p.name}</h3>
                    <p class="text-slate-400 text-sm font-medium tabular-nums mt-0.5">\${formatRupiah(p.price)}</p>
                  </div>
                \`;}).join('')}
              </div>
            </main>

            <aside class="w-96 bg-white border-l border-slate-100 p-7 flex flex-col justify-between shrink-0">
              <div>
                <div class="flex items-center justify-between mb-6">
                  <h2 class="text-xl font-bold text-[#2D3748]">Order Menu</h2>
                  <button onclick="clearCart()" class="text-slate-400 hover:text-[#FF2457] text-xs font-semibold">Kosongkan</button>
                </div>
                <div class="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                  \${state.cart.length === 0 ? '<div class="py-16 text-center text-xs text-slate-400">Belum ada pesanan dipilih</div>' : state.cart.map(item => \`
                    <div class="flex items-center justify-between gap-3">
                      <div class="flex items-center gap-3">
                        <img src="\${resolveDriveImg(item.product.imageUrl)}" class="w-12 h-12 object-contain rounded-xl bg-slate-50 p-1" />
                        <div>
                          <div class="font-bold text-sm text-[#2D3748]">\${item.product.name}</div>
                          <div class="text-xs text-slate-400 tabular-nums">\${formatRupiah(item.product.price)}</div>
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <button onclick="updateQty('\${item.product.id}', -1)" class="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold">-</button>
                        <span class="text-xs font-bold text-slate-500 w-6 text-center tabular-nums">x\${item.quantity}</span>
                        <button onclick="updateQty('\${item.product.id}', 1)" class="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold">+</button>
                      </div>
                      <div class="font-bold text-xs text-[#2D3748] tabular-nums w-20 text-right">\${formatRupiah(item.product.price * item.quantity)}</div>
                    </div>
                  \`).join('')}
                </div>
                <div class="border-t border-dashed border-slate-200 my-6 pt-5 space-y-2.5 text-sm">
                  <div class="flex justify-between text-slate-500">
                    <span>Sub Total</span>
                    <span class="font-bold text-[#2D3748] tabular-nums">\${formatRupiah(subTotal)}</span>
                  </div>
                  <div class="flex justify-between text-slate-400 text-xs">
                    <span>PBF (5%)</span>
                    <span class="tabular-nums">\${formatRupiah(taxPbf)}</span>
                  </div>
                </div>
              </div>
              <button onclick="chargeOrder()" class="w-full bg-[#FF2457] hover:bg-[#e01b49] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#FF2457]/30 transition-all tabular-nums">
                Bayar \${formatRupiah(total)}
              </button>
            </aside>
          \`}
        </div>
      \`;
    }

    render();
  </script>
</body>
</html>`;
}
