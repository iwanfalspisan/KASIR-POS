import React, { useState } from 'react';
import {
  PermanentGoogleConfig,
  ProductItem,
  formatRupiah,
  generateAppsScriptCode,
} from '../data/posData';
import {
  Language,
  StoreBrandingSettings,
  THEME_COLOR_PRESETS,
  TRANSLATIONS,
} from '../data/i18nAndSettings';
import { BrandLogo } from './PosIllustrations';
import {
  Check,
  Copy,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  FolderKanban,
  Image as ImageIcon,
  KeyRound,
  Link2,
  Lock,
  Palette,
  Percent,
  RefreshCw,
  Save,
  Store,
  User,
} from 'lucide-react';

interface GoogleCloudIntegrationPanelProps {
  config: PermanentGoogleConfig;
  onUpdateConfig: (newConfig: PermanentGoogleConfig) => void;
  storeSettings: StoreBrandingSettings;
  onUpdateStoreSettings: (
    newSettings: StoreBrandingSettings,
    logoUpload?: { data: string; name: string; mime: string }
  ) => Promise<void>;
  products: ProductItem[];
  onSyncAllToCloud?: () => Promise<void>;
}

const TAX_RATE_PRESETS = [0, 5, 10, 11, 12];

export const GoogleCloudIntegrationPanel: React.FC<
  GoogleCloudIntegrationPanelProps
> = ({
  config,
  onUpdateConfig,
  storeSettings,
  onUpdateStoreSettings,
  products,
  onSyncAllToCloud,
}) => {
  const t = TRANSLATIONS[storeSettings.language as Language];
  const isId = storeSettings.language === 'id';
  const primaryColor = storeSettings.primaryColor || '#FF2457';

  // Cloud Links State
  const [appsScriptUrl, setAppsScriptUrl] = useState(config.APPS_SCRIPT_URL);
  const [googleSheetUrl, setGoogleSheetUrl] = useState(config.GOOGLE_SHEET_URL);
  const [googleDriveUrl, setGoogleDriveUrl] = useState(
    config.GOOGLE_DRIVE_FOLDER_URL
  );
  const [savedBanner, setSavedBanner] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncAllSuccess, setSyncAllSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  React.useEffect(() => {
    setGoogleSheetUrl(config.GOOGLE_SHEET_URL);
  }, [config.GOOGLE_SHEET_URL]);

  // Store Branding & Theme State
  const [storeName, setStoreName] = useState(storeSettings.storeName);
  const [storeTagline, setStoreTagline] = useState(storeSettings.storeTagline);
  const [logoType, setLogoType] = useState<'default_m' | 'custom_image'>(
    storeSettings.logoType
  );
  const [customLogoUrl, setCustomLogoUrl] = useState(
    storeSettings.customLogoUrl
  );
  const [selectedColor, setSelectedColor] = useState(
    storeSettings.primaryColor
  );
  const [uploadedLogoFile, setUploadedLogoFile] = useState<{
    data: string;
    name: string;
    mime: string;
  } | null>(null);
  const [brandingSaved, setBrandingSaved] = useState(false);

  // Tax Settings State
  const [taxEnabled, setTaxEnabled] = useState<boolean>(
    storeSettings.taxEnabled !== false
  );
  const [taxName, setTaxName] = useState<string>(
    storeSettings.taxName || 'PBF'
  );
  const [taxRate, setTaxRate] = useState<string>(
    String(storeSettings.taxRate ?? 5)
  );
  const [taxSaved, setTaxSaved] = useState(false);

  // Login User & Password Settings State
  const [loginUsername, setLoginUsername] = useState<string>(
    storeSettings.loginUsername || 'kasir@pinkpos.id'
  );
  const [loginPassword, setLoginPassword] = useState<string>(
    storeSettings.loginPassword || '123456'
  );
  const [confirmLoginPassword, setConfirmLoginPassword] = useState<string>(
    storeSettings.loginPassword || '123456'
  );
  const [showLoginPass, setShowLoginPass] = useState<boolean>(false);
  const [loginAccountSaved, setLoginAccountSaved] = useState<boolean>(false);
  const [loginAccountError, setLoginAccountError] = useState<string>('');

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: StoreBrandingSettings = {
      ...storeSettings,
      storeName: storeName.trim() || 'PinkPOS Resto',
      storeTagline: storeTagline.trim(),
      logoType,
      customLogoUrl: uploadedLogoFile
        ? uploadedLogoFile.data
        : customLogoUrl.trim(),
      primaryColor: selectedColor,
    };
    await onUpdateStoreSettings(updated, uploadedLogoFile || undefined);
    setBrandingSaved(true);
    setTimeout(() => setBrandingSaved(false), 3000);
  };

  const handleSelectColor = (hex: string) => {
    setSelectedColor(hex);
    onUpdateStoreSettings({
      ...storeSettings,
      storeName: storeName.trim() || storeSettings.storeName,
      logoType,
      customLogoUrl: uploadedLogoFile
        ? uploadedLogoFile.data
        : customLogoUrl.trim(),
      primaryColor: hex,
    });
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoType('custom_image');
        setCustomLogoUrl(reader.result);
        setUploadedLogoFile({
          data: reader.result,
          name: file.name,
          mime: file.type || 'image/png',
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTaxSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedRate = Math.max(0, Math.min(100, Number(taxRate) || 0));
    const updated: StoreBrandingSettings = {
      ...storeSettings,
      taxEnabled,
      taxName: taxName.trim() || 'PBF',
      taxRate: parsedRate,
    };
    await onUpdateStoreSettings(updated);
    setTaxSaved(true);
    setTimeout(() => setTaxSaved(false), 3000);
  };

  const handleSaveLoginAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginAccountError(
        isId
          ? 'User dan password tidak boleh kosong!'
          : 'Username and password cannot be empty!'
      );
      return;
    }
    if (loginPassword.trim() !== confirmLoginPassword.trim()) {
      setLoginAccountError(t.passwordMismatchError);
      return;
    }
    setLoginAccountError('');
    const updated: StoreBrandingSettings = {
      ...storeSettings,
      loginUsername: loginUsername.trim(),
      loginPassword: loginPassword.trim(),
    };
    await onUpdateStoreSettings(updated);
    setLoginAccountSaved(true);
    setTimeout(() => setLoginAccountSaved(false), 3000);
  };

  const handleSavePermanentConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      ...config,
      APPS_SCRIPT_URL: appsScriptUrl.trim(),
      GOOGLE_SHEET_URL: googleSheetUrl.trim(),
      GOOGLE_DRIVE_FOLDER_URL: googleDriveUrl.trim(),
      LAST_SYNCED: new Date().toLocaleTimeString(),
    });
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);
  };

  const copyText = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const generatedScript = generateAppsScriptCode({
    ...config,
    APPS_SCRIPT_URL: appsScriptUrl.trim(),
    GOOGLE_SHEET_URL: googleSheetUrl.trim(),
    GOOGLE_DRIVE_FOLDER_URL: googleDriveUrl.trim(),
  });

  const sampleSubTotal = 100000;
  const numericRate = Math.max(0, Math.min(100, Number(taxRate) || 0));
  const sampleTax = taxEnabled
    ? Math.round(sampleSubTotal * (numericRate / 100))
    : 0;

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 md:pb-10 animate-menu-transition">
      {/* ====================================================================
          SECTION 1: STORE BRANDING, LOGO & APP COLOR CUSTOMIZER
         ==================================================================== */}
      <form
        onSubmit={handleSaveBranding}
        style={{ animationDelay: '0ms' }}
        className="animate-card-enter bg-white p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] shadow-2xs border border-slate-100 space-y-4 sm:space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              style={{
                backgroundColor: `${primaryColor}15`,
                color: primaryColor,
              }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            >
              <Store className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold text-[#2D3748] truncate">
                {t.storeCustomizationTitle}
              </h2>
              <p className="text-xs text-slate-400 line-clamp-1">
                {t.storeCustomizationDesc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#F8F9FA] border border-slate-100">
              <BrandLogo
                size="sm"
                color={selectedColor}
                logoType={logoType}
                customLogoUrl={customLogoUrl}
              />
              <span className="font-extrabold text-xs text-[#2D3748]">
                {storeName || 'PinkPOS'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-[#2D3748] mb-1">
                {t.storeNameInput}
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="PinkPOS Resto"
                className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#2D3748] focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2D3748] mb-1">
                {t.storeTaglineInput}
              </label>
              <input
                type="text"
                value={storeTagline}
                onChange={(e) => setStoreTagline(e.target.value)}
                placeholder="Fast Food & Specialty Coffee"
                className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-600 focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-[#2D3748] mb-2">
                <Palette className="w-4 h-4" style={{ color: selectedColor }} />
                <span>{t.appThemeColorLabel}</span>
              </label>
              <div className="flex flex-wrap items-center gap-2.5">
                {THEME_COLOR_PRESETS.map((preset) => {
                  const active =
                    selectedColor.toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => handleSelectColor(preset.hex)}
                      title={preset.name}
                      style={{ backgroundColor: preset.hex }}
                      className={`w-8 h-8 rounded-xl transition-transform cursor-pointer flex items-center justify-center ${
                        active
                          ? 'scale-110 ring-2 ring-offset-2 ring-slate-800 shadow-md'
                          : 'hover:scale-105 opacity-85 hover:opacity-100'
                      }`}
                    >
                      {active && <Check className="w-4 h-4 text-white" />}
                    </button>
                  );
                })}

                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F8F9FA] border border-slate-200 text-xs font-mono cursor-pointer">
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => handleSelectColor(e.target.value)}
                    className="w-5 h-5 rounded border-0 cursor-pointer bg-transparent"
                  />
                  <span>{selectedColor.toUpperCase()}</span>
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-3.5">
            <label className="block text-xs font-bold text-[#2D3748]">
              {isId ? 'Pilih Jenis Logo Toko' : 'Select Store Logo Style'}
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setLogoType('default_m')}
                style={
                  logoType === 'default_m'
                    ? {
                        borderColor: selectedColor,
                        backgroundColor: `${selectedColor}0D`,
                      }
                    : undefined
                }
                className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                  logoType === 'default_m'
                    ? 'text-[#2D3748]'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {t.logoOptionDefault}
              </button>
              <button
                type="button"
                onClick={() => setLogoType('custom_image')}
                style={
                  logoType === 'custom_image'
                    ? {
                        borderColor: selectedColor,
                        backgroundColor: `${selectedColor}0D`,
                      }
                    : undefined
                }
                className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                  logoType === 'custom_image'
                    ? 'text-[#2D3748]'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {t.logoOptionCustom}
              </button>
            </div>

            {logoType === 'custom_image' && (
              <div className="space-y-2.5 pt-1">
                <input
                  type="text"
                  value={
                    customLogoUrl.startsWith('data:image') ? '' : customLogoUrl
                  }
                  onChange={(e) => {
                    setUploadedLogoFile(null);
                    setCustomLogoUrl(e.target.value);
                  }}
                  placeholder="Paste Google Drive Image Link (https://drive.google.com/file/d/...)"
                  className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono focus:outline-none"
                />

                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl p-2.5 text-xs text-slate-600 cursor-pointer transition-colors">
                  <ImageIcon
                    className="w-4 h-4"
                    style={{ color: selectedColor }}
                  />
                  <span>
                    {uploadedLogoFile
                      ? `Logo: ${uploadedLogoFile.name}`
                      : t.uploadLogoBtn}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs text-emerald-600 font-semibold">
                {brandingSaved
                  ? isId
                    ? 'Pengaturan toko berhasil disimpan!'
                    : 'Store settings saved!'
                  : ''}
              </span>
              <button
                type="submit"
                style={{ backgroundColor: selectedColor }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md hover:opacity-95 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {t.saveBrandingBtn}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* ====================================================================
          SECTION 2: PENGATURAN PAJAK & BIAYA LAYANAN (TAX SETTINGS)
         ==================================================================== */}
      <form
        onSubmit={handleSaveTaxSettings}
        style={{ animationDelay: '45ms' }}
        className="animate-card-enter bg-white p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] shadow-2xs border border-slate-100 space-y-4 sm:space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              style={{
                backgroundColor: `${primaryColor}15`,
                color: primaryColor,
              }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            >
              <Percent className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-base sm:text-lg text-[#2D3748] truncate">
                {t.taxSettingsTitle}
              </h3>
              <p className="text-xs text-slate-400 line-clamp-1">{t.taxSettingsDesc}</p>
            </div>
          </div>

          <label className="inline-flex items-center gap-2.5 px-3.5 sm:px-4 py-2 rounded-2xl bg-[#F8F9FA] border border-slate-200/80 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={taxEnabled}
              onChange={(e) => setTaxEnabled(e.target.checked)}
              style={{ accentColor: primaryColor }}
              className="w-4 h-4 rounded cursor-pointer"
            />
            <span className="text-xs font-extrabold text-[#2D3748]">
              {t.taxEnabledLabel}
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 items-end">
          <div className="md:col-span-4">
            <label className="block text-xs font-bold text-[#2D3748] mb-1.5">
              {t.taxNameLabel}
            </label>
            <input
              type="text"
              required
              disabled={!taxEnabled}
              value={taxName}
              onChange={(e) => setTaxName(e.target.value)}
              placeholder="PBF / PB1 / PPN"
              className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-[#2D3748] disabled:opacity-50 focus:outline-none focus:border-slate-400"
            />
          </div>

          <div className="md:col-span-5">
            <label className="block text-xs font-bold text-[#2D3748] mb-1.5">
              {t.taxRateLabel}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                required
                disabled={!taxEnabled}
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-24 bg-[#F8F9FA] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-extrabold tabular-nums text-[#2D3748] disabled:opacity-50 focus:outline-none focus:border-slate-400"
              />
              <div className="flex flex-wrap items-center gap-1.5">
                {TAX_RATE_PRESETS.map((rate) => {
                  const active = Number(taxRate) === rate && taxEnabled;
                  return (
                    <button
                      key={rate}
                      type="button"
                      disabled={!taxEnabled}
                      onClick={() => setTaxRate(String(rate))}
                      style={
                        active
                          ? { backgroundColor: primaryColor, color: '#FFFFFF' }
                          : undefined
                      }
                      className={`px-3 py-2 rounded-xl text-xs font-extrabold tabular-nums transition-all cursor-pointer disabled:opacity-40 ${
                        active
                          ? 'shadow-xs'
                          : 'bg-[#F8F9FA] text-slate-600 hover:bg-slate-200/70 border border-slate-200/70'
                      }`}
                    >
                      {rate}%
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="md:col-span-3 flex flex-col items-end justify-end gap-2">
            <button
              type="submit"
              style={{ backgroundColor: primaryColor }}
              className="w-full py-2.5 px-4 rounded-xl text-white text-xs font-bold shadow-md hover:opacity-95 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{t.saveTaxBtn}</span>
            </button>
          </div>
        </div>

        {/* Live Tax Preview Box */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#F8F9FA] border border-slate-100 text-xs">
          <div className="text-slate-500">
            <span className="font-bold text-[#2D3748]">
              {isId ? 'Simulasi Perhitungan Pajak:' : 'Tax Calculation Preview:'}
            </span>{' '}
            Sub Total {formatRupiah(sampleSubTotal)} +{' '}
            <strong className="text-[#2D3748]">
              {taxName || 'PBF'} ({taxEnabled ? numericRate : 0}%):{' '}
              {formatRupiah(sampleTax)}
            </strong>{' '}
            ={' '}
            <strong style={{ color: primaryColor }}>
              {formatRupiah(sampleSubTotal + sampleTax)}
            </strong>
          </div>
          {taxSaved && (
            <span className="text-emerald-600 font-bold">
              {isId
                ? 'Pengaturan pajak berhasil disimpan!'
                : 'Tax settings saved!'}
            </span>
          )}
        </div>
      </form>

      {/* ====================================================================
          SECTION 2B: PENGATURAN AKUN LOGIN (USER & PASSWORD)
         ==================================================================== */}
      <form
        onSubmit={handleSaveLoginAccount}
        style={{ animationDelay: '90ms' }}
        className="animate-card-enter bg-white p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] shadow-2xs border border-slate-100 space-y-4 sm:space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              style={{
                backgroundColor: `${primaryColor}15`,
                color: primaryColor,
              }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            >
              <KeyRound className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-base sm:text-lg text-[#2D3748] truncate">
                {t.loginAccountSettingsTitle}
              </h3>
              <p className="text-xs text-slate-400 line-clamp-1">
                {t.loginAccountSettingsDesc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#F8F9FA] border border-slate-200/80 text-xs max-w-full">
            <User className="w-3.5 h-3.5 shrink-0" style={{ color: primaryColor }} />
            <span className="text-slate-500 font-medium shrink-0">
              {isId ? 'User Aktif:' : 'Active User:'}
            </span>
            <span className="font-extrabold text-[#2D3748] truncate">
              {storeSettings.loginUsername || 'kasir@pinkpos.id'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-[#2D3748] mb-1.5">
              {t.newUsernameLabel}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="kasir@pinkpos.id"
                className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-[#2D3748] focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#2D3748] mb-1.5">
              {t.newPasswordLabel}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showLoginPass ? 'text' : 'password'}
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••"
                className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm font-bold text-[#2D3748] focus:outline-none focus:border-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowLoginPass((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                title={showLoginPass ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showLoginPass ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#2D3748] mb-1.5">
              {t.confirmPasswordLabel}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showLoginPass ? 'text' : 'password'}
                required
                value={confirmLoginPassword}
                onChange={(e) => setConfirmLoginPassword(e.target.value)}
                placeholder="••••••"
                className="w-full bg-[#F8F9FA] border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm font-bold text-[#2D3748] focus:outline-none focus:border-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowLoginPass((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                title={showLoginPass ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showLoginPass ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="text-xs">
            {loginAccountError ? (
              <span className="text-rose-600 font-bold">
                {loginAccountError}
              </span>
            ) : loginAccountSaved ? (
              <span className="text-emerald-600 font-bold">
                {t.loginAccountSavedMsg}
              </span>
            ) : (
              <span className="text-slate-400">
                {isId
                  ? 'Perubahan user & password langsung berlaku pada halaman Login.'
                  : 'Changes take effect immediately on the Login screen.'}
              </span>
            )}
          </div>

          <button
            type="submit"
            style={{ backgroundColor: primaryColor }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md hover:opacity-95 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{t.saveLoginAccountBtn}</span>
          </button>
        </div>
      </form>

      {/* ====================================================================
          SECTION 3: CLOUD CONFIGURATION & CODE.GS
         ==================================================================== */}
      <form
        onSubmit={handleSavePermanentConfig}
        style={{ animationDelay: '135ms' }}
        className="animate-card-enter bg-white p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] shadow-2xs border border-slate-100 space-y-4 sm:space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link2 className="w-5 h-5 shrink-0" style={{ color: primaryColor }} />
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm sm:text-base text-[#2D3748] truncate">
                {isId
                  ? 'Konfigurasi Endpoint Cloud & Penyimpanan'
                  : 'Cloud Endpoint & Storage Configuration'}
              </h3>
              <p className="text-xs text-slate-400 line-clamp-1">
                {isId
                  ? 'Tautan koneksi layanan database dan penyimpanan media toko'
                  : 'Database and media storage connection endpoints'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {onSyncAllToCloud && (
              <button
                type="button"
                disabled={isSyncingAll}
                onClick={async () => {
                  setIsSyncingAll(true);
                  setSyncAllSuccess(false);
                  try {
                    await onSyncAllToCloud();
                    setSyncAllSuccess(true);
                    setTimeout(() => setSyncAllSuccess(false), 3500);
                  } finally {
                    setIsSyncingAll(false);
                  }
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 shrink-0 ${isSyncingAll ? 'animate-spin' : ''}`}
                />
                <span className="truncate">
                  {isSyncingAll
                    ? isId
                      ? 'Membuat & Menyinkronkan Sheet...'
                      : 'Creating & Syncing Sheets...'
                    : syncAllSuccess
                    ? isId
                      ? 'Sheet Otomatis Tersinkron!'
                      : 'Sheets Auto-Synced!'
                    : isId
                    ? 'Buat & Sinkronkan Sheet Otomatis'
                    : 'Auto-Create & Sync Sheets'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* 1. Link URL Google Apps Script */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#2D3748]">
            1. Link URL Google Apps Script (Web App Exec URL)
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              required
              value={appsScriptUrl}
              onChange={(e) => setAppsScriptUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="flex-1 bg-[#F8F9FA] border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-[#2D3748] focus:outline-none min-w-0"
            />
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => copyText('script', appsScriptUrl)}
                className="flex-1 sm:flex-initial px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedKey === 'script' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                Salin
              </button>
              <a
                href={appsScriptUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  backgroundColor: `${primaryColor}15`,
                  color: primaryColor,
                }}
                className="flex-1 sm:flex-initial px-3 py-2.5 rounded-xl hover:opacity-90 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Buka
              </a>
            </div>
          </div>
        </div>

        {/* 2. Link URL Google Sheet Database */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#2D3748]">
            2. Link URL Database Google Sheet
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              required
              value={googleSheetUrl}
              onChange={(e) => setGoogleSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/.../edit"
              className="flex-1 bg-[#F8F9FA] border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-[#2D3748] focus:outline-none min-w-0"
            />
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => copyText('sheet', googleSheetUrl)}
                className="flex-1 sm:flex-initial px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedKey === 'sheet' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                Salin
              </button>
              <a
                href={googleSheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial px-3 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Database className="w-3.5 h-3.5" />
                Buka
              </a>
            </div>
          </div>
        </div>

        {/* 3. Link URL Google Drive Image Folder */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#2D3748]">
            3. Link URL Folder Google Drive Gambar Produk & Logo
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              required
              value={googleDriveUrl}
              onChange={(e) => setGoogleDriveUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              className="flex-1 bg-[#F8F9FA] border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-[#2D3748] focus:outline-none min-w-0"
            />
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => copyText('drive', googleDriveUrl)}
                className="flex-1 sm:flex-initial px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedKey === 'drive' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                Salin
              </button>
              <a
                href={googleDriveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial px-3 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <FolderKanban className="w-3.5 h-3.5" />
                Buka Drive
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-500">
            {savedBanner ? (
              <span className="text-emerald-600 font-semibold">
                {isId
                  ? 'Ketiga link berhasil disimpan!'
                  : 'All links saved successfully!'}
              </span>
            ) : (
              <span>
                {isId
                  ? 'Tautan konfigurasi tersimpan di perangkat ini.'
                  : 'Configuration endpoints are saved on this device.'}
              </span>
            )}
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2D3748] hover:bg-slate-800 text-white text-xs font-semibold transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isId ? 'Simpan Link' : 'Save Links'}
          </button>
        </div>
      </form>

      {/* ====================================================================
          SECTION 4: GOOGLE APPS SCRIPT (CODE.GS) TEMPLATE
         ==================================================================== */}
      <div className="bg-white p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] shadow-2xs border border-slate-100 flex flex-col justify-between space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
          <div className="min-w-0">
            <h3 className="font-bold text-sm sm:text-base text-[#2D3748]">
              Kode Google Apps Script (Code.gs)
            </h3>
            <p className="text-xs text-slate-400">
              {isId
                ? 'Skrip backend untuk manajemen produk, stok, kategori, transaksi, dan penyimpanan gambar.'
                : 'Backend script for products, stock, categories, orders, and image storage.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => copyText('codegs', generatedScript)}
            className="px-3.5 py-2 rounded-xl bg-[#2D3748] hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            {copiedKey === 'codegs' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Tersalin!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Salin Code.gs
              </>
            )}
          </button>
        </div>

        <pre className="bg-slate-900 text-slate-100 rounded-xl p-3.5 sm:p-4 text-[10px] sm:text-[11px] font-mono overflow-x-auto max-h-64 leading-relaxed">
          {generatedScript}
        </pre>
      </div>
    </div>
  );
};
