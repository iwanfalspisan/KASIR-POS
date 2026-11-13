import React, { useState } from 'react';
import {
  Language,
  StoreBrandingSettings,
  TRANSLATIONS,
} from '../data/i18nAndSettings';
import { BrandLogo } from './PosIllustrations';
import {
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  User,
} from 'lucide-react';

interface LoginViewProps {
  storeSettings: StoreBrandingSettings;
  onToggleLanguage: () => void;
  onLoginSuccess: (cashierName: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  storeSettings,
  onToggleLanguage,
  onLoginSuccess,
}) => {
  const t = TRANSLATIONS[storeSettings.language as Language];
  const primaryColor = storeSettings.primaryColor || '#FF2457';

  const expectedUsername = storeSettings.loginUsername || 'kasir@pinkpos.id';
  const expectedPassword = storeSettings.loginPassword || '123456';

  const [username, setUsername] = useState(expectedUsername);
  const [password, setPassword] = useState(expectedPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    if (!username.trim() || !password.trim()) {
      setErrorMsg(
        storeSettings.language === 'id'
          ? 'Mohon isi username dan password/PIN'
          : 'Please enter username and password/PIN'
      );
      return;
    }

    if (
      username.trim().toLowerCase() !== expectedUsername.trim().toLowerCase() ||
      password.trim() !== expectedPassword.trim()
    ) {
      setErrorMsg(t.invalidCredentialsError);
      return;
    }

    setErrorMsg('');
    setIsLoggingIn(true);
    await new Promise((r) => setTimeout(r, 400));
    const displayUser = username.includes('@')
      ? username.split('@')[0]
      : username.trim();
    setIsLoggingIn(false);
    onLoginSuccess(displayUser);
  };

  return (
    <div className="w-[94%] sm:w-[88%] md:w-[84%] lg:w-[82%] max-w-[900px] xl:max-w-[940px] h-[88dvh] sm:h-[86dvh] lg:h-[86dvh] min-h-[580px] max-h-[840px] mx-auto my-auto bg-white rounded-[24px] sm:rounded-[28px] lg:rounded-[32px] shadow-2xl border-[4px] sm:border-[5px] lg:border-[6px] border-white grid grid-cols-1 lg:grid-cols-12 overflow-y-auto lg:overflow-hidden relative animate-stage-transition">
      {/* Top-Right Language Switcher */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleLanguage}
          className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl bg-[#F8F9FA] hover:bg-slate-200/70 text-[#2D3748] text-[11px] sm:text-xs font-extrabold border border-slate-200/70 transition-all cursor-pointer whitespace-nowrap shrink-0"
        >
          <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: primaryColor }} />
          <span>
            {storeSettings.language === 'id' ? 'Bahasa: ID' : 'Language: EN'}
          </span>
        </button>
      </div>

      {/* Left Brand Showcase Column (5 cols) with Transparent POS & Culinary Vector Background */}
      <div
        style={{ backgroundColor: `${primaryColor}0D` }}
        className="lg:col-span-5 p-6 sm:p-8 lg:p-11 xl:p-13 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-100 relative overflow-hidden isolate"
      >
        {/* ==================================================================
            TRANSPARENT VECTOR BACKGROUND ILLUSTRATION (Adapts to Theme Color)
           ================================================================== */}
        <div
          aria-hidden="true"
          className="pointer-events-none select-none absolute inset-0 -z-10 overflow-hidden"
        >
          {/* Soft Ambient Glows */}
          <div
            style={{
              background: `radial-gradient(circle at center, ${primaryColor}22 0%, transparent 70%)`,
            }}
            className="absolute -top-24 -right-24 w-80 h-80 rounded-full blur-2xl"
          />
          <div
            style={{
              background: `radial-gradient(circle at center, ${primaryColor}1A 0%, transparent 72%)`,
            }}
            className="absolute -bottom-28 -left-20 w-96 h-96 rounded-full blur-2xl"
          />

          {/* Full-Panel Transparent Vector Art: POS Terminal, Analytics Curve, Receipt & Culinary Watermarks */}
          <svg
            viewBox="0 0 520 760"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid slice"
            className="w-full h-full"
          >
            <defs>
              <pattern
                id="posLoginDotGrid"
                width="26"
                height="26"
                patternUnits="userSpaceOnUse"
              >
                <circle
                  cx="2"
                  cy="2"
                  r="1.35"
                  fill={primaryColor}
                  fillOpacity="0.11"
                />
              </pattern>
              <linearGradient
                id="posChartGrad"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={primaryColor} stopOpacity="0.15" />
                <stop offset="100%" stopColor={primaryColor} stopOpacity="0.0" />
              </linearGradient>
              <linearGradient
                id="posCardGrad"
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <stop offset="0%" stopColor={primaryColor} stopOpacity="0.11" />
                <stop offset="100%" stopColor={primaryColor} stopOpacity="0.03" />
              </linearGradient>
            </defs>

            {/* Subtle Dot Matrix Grid */}
            <rect width="520" height="760" fill="url(#posLoginDotGrid)" />

            {/* Decorative Concentric Geometric Rings (Top Right) */}
            <circle
              cx="450"
              cy="120"
              r="145"
              stroke={primaryColor}
              strokeOpacity="0.08"
              strokeWidth="1.5"
              strokeDasharray="6 6"
            />
            <circle
              cx="450"
              cy="120"
              r="102"
              stroke={primaryColor}
              strokeOpacity="0.11"
              strokeWidth="1.5"
            />
            <circle
              cx="450"
              cy="120"
              r="58"
              fill={primaryColor}
              fillOpacity="0.05"
            />

            {/* Floating Analytics & Sales Chart Card (Upper-Middle Right) */}
            <g transform="translate(215, 130) rotate(-4)">
              <rect
                x="0"
                y="0"
                width="270"
                height="165"
                rx="22"
                fill="url(#posCardGrad)"
                stroke={primaryColor}
                strokeOpacity="0.16"
                strokeWidth="1.5"
              />
              {/* Header bars inside card */}
              <rect
                x="22"
                y="22"
                width="76"
                height="9"
                rx="4.5"
                fill={primaryColor}
                fillOpacity="0.18"
              />
              <rect
                x="22"
                y="37"
                width="46"
                height="6"
                rx="3"
                fill={primaryColor}
                fillOpacity="0.11"
              />
              <circle
                cx="236"
                cy="30"
                r="14"
                fill={primaryColor}
                fillOpacity="0.10"
              />
              {/* Smooth Rising Sales Trend Curve */}
              <path
                d="M22 132 C 62 126, 78 96, 114 102 C 148 106, 168 68, 202 72 C 224 75, 236 48, 248 44 L 248 144 L 22 144 Z"
                fill="url(#posChartGrad)"
              />
              <path
                d="M22 132 C 62 126, 78 96, 114 102 C 148 106, 168 68, 202 72 C 224 75, 236 48, 248 44"
                stroke={primaryColor}
                strokeOpacity="0.28"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle
                cx="114"
                cy="102"
                r="4.5"
                fill="#FFFFFF"
                fillOpacity="0.8"
                stroke={primaryColor}
                strokeOpacity="0.35"
                strokeWidth="2.5"
              />
              <circle
                cx="202"
                cy="72"
                r="4.5"
                fill="#FFFFFF"
                fillOpacity="0.8"
                stroke={primaryColor}
                strokeOpacity="0.35"
                strokeWidth="2.5"
              />
              <circle
                cx="248"
                cy="44"
                r="5.5"
                fill={primaryColor}
                fillOpacity="0.35"
              />
            </g>

            {/* Transparent POS Register & Thermal Receipt Vector (Lower Right) */}
            <g transform="translate(230, 445) rotate(3)">
              {/* POS Screen Frame */}
              <rect
                x="20"
                y="30"
                width="250"
                height="175"
                rx="20"
                fill="url(#posCardGrad)"
                stroke={primaryColor}
                strokeOpacity="0.16"
                strokeWidth="1.75"
              />
              {/* Product Grid Tiles inside POS Screen */}
              <rect
                x="38"
                y="50"
                width="62"
                height="48"
                rx="10"
                fill={primaryColor}
                fillOpacity="0.09"
              />
              <rect
                x="110"
                y="50"
                width="62"
                height="48"
                rx="10"
                fill={primaryColor}
                fillOpacity="0.09"
              />
              <rect
                x="38"
                y="108"
                width="62"
                height="48"
                rx="10"
                fill={primaryColor}
                fillOpacity="0.09"
              />
              <rect
                x="110"
                y="108"
                width="62"
                height="48"
                rx="10"
                fill={primaryColor}
                fillOpacity="0.14"
              />
              {/* Cart Sidebar inside POS Screen */}
              <rect
                x="184"
                y="50"
                width="68"
                height="136"
                rx="12"
                fill={primaryColor}
                fillOpacity="0.08"
                stroke={primaryColor}
                strokeOpacity="0.14"
                strokeWidth="1.2"
              />
              <rect
                x="194"
                y="160"
                width="48"
                height="16"
                rx="6"
                fill={primaryColor}
                fillOpacity="0.22"
              />
              {/* POS Stand Base */}
              <path
                d="M115 205 L175 205 L192 238 L98 238 Z"
                fill={primaryColor}
                fillOpacity="0.10"
              />
              <rect
                x="78"
                y="238"
                width="134"
                height="12"
                rx="6"
                fill={primaryColor}
                fillOpacity="0.15"
              />
            </g>

            {/* Floating Thermal Receipt & Barcode Vector (Bottom Left-Center) */}
            <g transform="translate(36, 520) rotate(-6)">
              <path
                d="M0 14 C0 6.268 6.268 0 14 0 H126 C133.732 0 140 6.268 140 14 V168 L128 160 L116 168 L104 160 L92 168 L80 160 L68 168 L56 160 L44 168 L32 160 L20 168 L10 160 L0 168 Z"
                fill="url(#posCardGrad)"
                stroke={primaryColor}
                strokeOpacity="0.15"
                strokeWidth="1.5"
              />
              <line
                x1="20"
                y1="28"
                x2="86"
                y2="28"
                stroke={primaryColor}
                strokeOpacity="0.20"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <line
                x1="20"
                y1="48"
                x2="118"
                y2="48"
                stroke={primaryColor}
                strokeOpacity="0.14"
                strokeWidth="3"
                strokeDasharray="4 4"
              />
              <line
                x1="20"
                y1="68"
                x2="92"
                y2="68"
                stroke={primaryColor}
                strokeOpacity="0.14"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <line
                x1="20"
                y1="86"
                x2="108"
                y2="86"
                stroke={primaryColor}
                strokeOpacity="0.14"
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* Barcode stripes inside receipt */}
              <g opacity="0.20" fill={primaryColor}>
                <rect x="24" y="114" width="3" height="24" rx="1" />
                <rect x="31" y="114" width="6" height="24" rx="1" />
                <rect x="41" y="114" width="2" height="24" rx="1" />
                <rect x="47" y="114" width="5" height="24" rx="1" />
                <rect x="56" y="114" width="3" height="24" rx="1" />
                <rect x="63" y="114" width="7" height="24" rx="1" />
                <rect x="74" y="114" width="2" height="24" rx="1" />
                <rect x="80" y="114" width="5" height="24" rx="1" />
                <rect x="89" y="114" width="4" height="24" rx="1" />
                <rect x="97" y="114" width="6" height="24" rx="1" />
                <rect x="107" y="114" width="3" height="24" rx="1" />
                <rect x="114" y="114" width="2" height="24" rx="1" />
              </g>
            </g>

            {/* Subtle Culinary Line-Art Watermark (Burger & Specialty Coffee Cup) */}
            <g
              transform="translate(42, 185) rotate(-8)"
              stroke={primaryColor}
              strokeOpacity="0.12"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Coffee Cup */}
              <path d="M18 36 H66 V62 C66 75.255 55.255 86 42 86 C28.745 86 18 75.255 18 62 V36 Z" />
              <path d="M66 44 H74 C79.523 44 84 48.477 84 54 C84 59.523 79.523 64 74 64 H66" />
              <line x1="12" y1="94" x2="72" y2="94" />
              <path d="M32 24 C32 18, 38 18, 38 12" />
              <path d="M48 24 C48 18, 54 18, 54 12" />
            </g>

            {/* Flowing Abstract Wave Lines Across Bottom */}
            <path
              d="M -40 690 C 90 640, 220 730, 360 675 C 440 645, 500 660, 560 630"
              stroke={primaryColor}
              strokeOpacity="0.12"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M -40 720 C 110 670, 240 755, 380 700 C 455 670, 510 685, 560 655"
              stroke={primaryColor}
              strokeOpacity="0.08"
              strokeWidth="1.5"
              strokeDasharray="5 5"
              fill="none"
            />
          </svg>
        </div>

        <div className="relative z-10 flex items-center gap-3 pr-28 sm:pr-0">
          <BrandLogo
            size="md"
            color={primaryColor}
            logoType={storeSettings.logoType}
            customLogoUrl={storeSettings.customLogoUrl}
          />
          <div className="min-w-0">
            <h2 className="font-extrabold text-sm sm:text-lg text-[#2D3748] leading-tight truncate">
              {storeSettings.storeName}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 truncate">
              {storeSettings.storeTagline}
            </p>
          </div>
        </div>

        <div className="relative z-10 my-5 sm:my-8 lg:my-10 space-y-2.5 sm:space-y-3.5">
          <span
            style={{ color: primaryColor }}
            className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider block"
          >
            Point of Sale System
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#2D3748] leading-tight">
            {storeSettings.storeName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md">
            {storeSettings.language === 'id'
              ? 'Sistem manajemen kasir restoran, pemantauan stok real-time, dan analitik penjualan terpadu.'
              : 'Integrated restaurant point of sale, real-time inventory monitoring, and sales analytics.'}
          </p>
        </div>

        <div className="relative z-10 text-[11px] sm:text-xs text-slate-400 hidden sm:flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{storeSettings.storeName} · Enterprise POS</span>
        </div>
      </div>

      {/* Right Login Form Column (7 cols) */}
      <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 xl:p-14 flex flex-col justify-center max-w-lg mx-auto w-full">
        <div className="mb-5 sm:mb-7">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#2D3748]">
            {t.loginWelcome}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {t.loginSubtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-4.5">
          <div>
            <label className="block text-xs font-bold text-[#2D3748] mb-2">
              {t.usernameLabel}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={expectedUsername}
                className="w-full bg-[#F8F9FA] border border-slate-200 rounded-2xl pl-11 pr-4 py-3 sm:py-3.5 text-sm font-medium text-[#2D3748] focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#2D3748] mb-2">
              {t.passwordLabel}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full bg-[#F8F9FA] border border-slate-200 rounded-2xl pl-11 pr-11 py-3 sm:py-3.5 text-sm font-medium text-[#2D3748] focus:outline-none focus:border-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                title={showPassword ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs font-semibold text-rose-600">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            style={{ backgroundColor: primaryColor }}
            className="w-full py-3.5 sm:py-4 rounded-2xl text-white font-bold text-sm sm:text-base shadow-lg hover:opacity-95 disabled:opacity-70 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  {storeSettings.language === 'id'
                    ? 'Memverifikasi...'
                    : 'Signing in...'}
                </span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>{t.loginButton}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
