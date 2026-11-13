import React, { useEffect, useState } from 'react';
import { CategoryId, resolveGoogleDriveImageUrl } from '../data/posData';

/**
 * Stylized Brand Logo from the reference video (00:01 - 00:23)
 * Supports dynamic primaryColor AND custom store logo image (Google Drive / uploaded).
 */
export const BrandLogo: React.FC<{
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  logoType?: 'default_m' | 'custom_image';
  customLogoUrl?: string;
}> = ({
  className = '',
  size = 'sm',
  color = '#FF2457',
  logoType = 'default_m',
  customLogoUrl = '',
}) => {
  const scale = size === 'lg' ? 2.1 : size === 'md' ? 1.35 : 1;

  if (logoType === 'custom_image' && customLogoUrl.trim()) {
    const dim = size === 'lg' ? 76 : size === 'md' ? 52 : 42;
    return (
      <img
        src={resolveGoogleDriveImageUrl(customLogoUrl)}
        alt="Store Logo"
        referrerPolicy="no-referrer"
        style={{ width: dim, height: dim }}
        className={`object-contain rounded-xl ${className}`}
      />
    );
  }

  return (
    <svg
      width={44 * scale}
      height={28 * scale}
      viewBox="0 0 44 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Left Dot */}
      <circle cx="7" cy="20" r="4.5" fill={color} />
      {/* Middle Slanted Capsule */}
      <rect
        x="13"
        y="4"
        width="8.5"
        height="22"
        rx="4.25"
        transform="rotate(-28 13 4)"
        fill={color}
      />
      {/* Right Slanted Capsule */}
      <rect
        x="26"
        y="4"
        width="8.5"
        height="22"
        rx="4.25"
        transform="rotate(-28 26 4)"
        fill={color}
      />
    </svg>
  );
};

/**
 * EXACT OPENING ANIMATION FROM REFERENCE VIDEO (00:00 -> 00:03)
 * Stage 1 (0.0s - 0.9s): Three dots bounce/pulse horizontally in the center (● ● •)
 * Stage 2 (0.9s - 1.8s): Middle & right dots extrude at -28deg into the 'm' logo in the center
 * Stage 3 (1.8s - 2.55s): The 'm' logo glides from center to top-left corner of the tablet frame
 */
export const VideoOpeningAnimation: React.FC<{
  primaryColor: string;
  logoType?: 'default_m' | 'custom_image';
  customLogoUrl?: string;
  storeName?: string;
  onComplete: () => void;
}> = ({
  primaryColor = '#FF2457',
  logoType = 'default_m',
  customLogoUrl = '',
  onComplete,
}) => {
  const [stage, setStage] = useState<'dots' | 'morph' | 'fly'>('dots');

  useEffect(() => {
    const t1 = setTimeout(() => setStage('morph'), 850);
    const t2 = setTimeout(() => setStage('fly'), 1750);
    const t3 = setTimeout(() => onComplete(), 2550);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <div
      onClick={onComplete}
      title="Click anywhere to skip"
      className="w-full h-full bg-white rounded-none sm:rounded-[28px] lg:rounded-[34px] shadow-2xl border-0 sm:border-[5px] lg:border-[6px] border-white relative overflow-hidden cursor-pointer select-none flex items-center justify-center"
    >
      {/* Animated Logo Container that moves from center (50%, 50%) to top-left corner (46px, 46px) */}
      <div
        style={{
          transition: 'all 750ms cubic-bezier(0.22, 1, 0.36, 1)',
          position: 'absolute',
          top: stage === 'fly' ? '44px' : '50%',
          left: stage === 'fly' ? '52px' : '50%',
          transform:
            stage === 'fly'
              ? 'translate(-50%, -50%) scale(1)'
              : 'translate(-50%, -50%) scale(2.35)',
        }}
        className="flex items-center justify-center"
      >
        {logoType === 'custom_image' &&
        customLogoUrl.trim() &&
        stage !== 'dots' ? (
          <img
            src={resolveGoogleDriveImageUrl(customLogoUrl)}
            alt="Logo"
            referrerPolicy="no-referrer"
            className="w-11 h-11 object-contain rounded-xl transition-all duration-500"
          />
        ) : (
          <svg
            width="64"
            height="40"
            viewBox="0 0 64 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="overflow-visible"
          >
            {/* Dot 1 (Left circle: stays circular in both 'dots' and 'morph' stages) */}
            <circle
              cx={stage === 'dots' ? '14' : '12'}
              cy={stage === 'dots' ? '20' : '27'}
              r={stage === 'dots' ? '6.5' : '5.5'}
              fill={primaryColor}
              style={{
                transition: 'all 550ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
              className={stage === 'dots' ? 'animate-pulse' : ''}
            />

            {/* Shape 2 (Middle dot -> morphs into slanted capsule 1) */}
            <rect
              x={stage === 'dots' ? '26' : '21'}
              y={stage === 'dots' ? '13.5' : '6'}
              width={stage === 'dots' ? '13' : '10.5'}
              height={stage === 'dots' ? '13' : '27'}
              rx={stage === 'dots' ? '6.5' : '5.25'}
              fill={primaryColor}
              style={{
                transformOrigin: '26px 20px',
                transform:
                  stage === 'dots' ? 'rotate(0deg)' : 'rotate(-28deg)',
                transition: 'all 600ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            />

            {/* Shape 3 (Right smaller dot -> morphs into slanted capsule 2) */}
            <rect
              x={stage === 'dots' ? '46' : '37'}
              y={stage === 'dots' ? '16' : '6'}
              width={stage === 'dots' ? '8' : '10.5'}
              height={stage === 'dots' ? '8' : '27'}
              rx={stage === 'dots' ? '4' : '5.25'}
              fill={primaryColor}
              style={{
                transformOrigin: '48px 20px',
                transform:
                  stage === 'dots' ? 'rotate(0deg)' : 'rotate(-28deg)',
                transition: 'all 600ms cubic-bezier(0.34, 1.56, 0.64, 1) 60ms',
              }}
            />
          </svg>
        )}
      </div>
    </div>
  );
};

/**
 * Category Icons matching the reference video (Hot, Burger, Pizza, Snack, Soft Drink, Coffee, Ice Cream)
 */
export const CategoryIcon: React.FC<{
  category: string;
  active: boolean;
}> = ({ category, active }) => {
  const accentFill = active ? '#FFCC33' : 'transparent';
  const secondaryFill = active ? '#FFE680' : '#F1F5F9';
  const strokeColor = active ? '#2D3748' : '#64748B';

  switch (category) {
    case 'hot':
      return (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          {active && <circle cx="17" cy="19" r="8" fill={accentFill} />}
          <path
            d="M16.5 4.5C16.5 4.5 23.5 10.5 23.5 17.5C23.5 21.9183 19.9183 25.5 15.5 25.5C11.0817 25.5 7.5 21.9183 7.5 17.5C7.5 14.2 9.3 11.2 11.5 9.5C11.5 12.2 13.5 13.5 13.5 13.5C12.8 9.5 16.5 4.5 16.5 4.5Z"
            stroke={strokeColor}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15.5 25.5C13.5 25.5 12 23.9 12 21.8C12 19.8 14 18.2 15.5 16.8C17 18.2 19 19.8 19 21.8C19 23.9 17.5 25.5 15.5 25.5Z"
            fill={active ? '#FF9F1C' : 'none'}
            stroke={strokeColor}
            strokeWidth="1.5"
          />
        </svg>
      );

    case 'burger':
      return (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          {active && <ellipse cx="16" cy="16" rx="9" ry="7" fill={accentFill} />}
          <path
            d="M7 14C7 9.5 11 7 16 7C21 7 25 9.5 25 14H7Z"
            fill={secondaryFill}
            stroke={strokeColor}
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M5.5 17.5H26.5"
            stroke={strokeColor}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M7.5 20.5H24.5V22C24.5 23.6569 23.1569 25 21.5 25H10.5C8.84315 25 7.5 23.6569 7.5 22V20.5Z"
            fill={secondaryFill}
            stroke={strokeColor}
            strokeWidth="1.75"
          />
        </svg>
      );

    case 'pizza':
      return (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          {active && <circle cx="16" cy="17" r="7.5" fill={accentFill} />}
          <path
            d="M16 6L25.5 24C22.5 25.8 19.3 26.5 16 26.5C12.7 26.5 9.5 25.8 6.5 24L16 6Z"
            stroke={strokeColor}
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M8 21C10.5 22.3 13.2 23 16 23C18.8 23 21.5 22.3 24 21"
            stroke={strokeColor}
            strokeWidth="1.5"
          />
          <circle cx="16" cy="15" r="1.5" fill={strokeColor} />
          <circle cx="13.5" cy="19" r="1.5" fill={strokeColor} />
          <circle cx="18.5" cy="18.5" r="1.5" fill={strokeColor} />
        </svg>
      );

    case 'snack':
      return (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          {active && <circle cx="16" cy="18" r="7.5" fill={accentFill} />}
          <path
            d="M9.5 14H22.5L20.5 25.5H11.5L9.5 14Z"
            stroke={strokeColor}
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M11.5 14V8.5M14.5 14V7M17.5 14V7.5M20.5 14V9"
            stroke={strokeColor}
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'soft_drink':
      return (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          {active && <circle cx="16" cy="18" r="7.5" fill={accentFill} />}
          <path
            d="M10 12H22L20.2 25.5H11.8L10 12Z"
            stroke={strokeColor}
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M8.5 12H23.5"
            stroke={strokeColor}
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d="M16 12V7.5L19.5 5.5"
            stroke={strokeColor}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'coffee':
      return (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          {active && <circle cx="15" cy="18" r="8" fill={accentFill} />}
          <path
            d="M8.5 13H20.5V19C20.5 22.3137 17.8137 25 14.5 25C11.1863 25 8.5 22.3137 8.5 19V13Z"
            stroke={strokeColor}
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M20.5 14.5H22.5C24.1569 14.5 25.5 15.8431 25.5 17.5C25.5 19.1569 24.1569 20.5 22.5 20.5H20.5"
            stroke={strokeColor}
            strokeWidth="1.75"
          />
          <path
            d="M12 8.5V10.5M15 7.5V10.5M18 8.5V10.5"
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'ice_cream':
    default:
      return (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          {active && <circle cx="16" cy="14" r="7.5" fill={accentFill} />}
          <path
            d="M11.5 15.5L16 26L20.5 15.5H11.5Z"
            stroke={strokeColor}
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M10.5 14C10.5 10.9624 12.9624 8.5 16 8.5C19.0376 8.5 21.5 10.9624 21.5 14C21.5 14.8 21.2 15.5 20.5 15.5H11.5C10.8 15.5 10.5 14.8 10.5 14Z"
            stroke={strokeColor}
            strokeWidth="1.75"
          />
        </svg>
      );
  }
};

/**
 * Animated Vector Illustration from the "Order Success" screen in the reference video (00:21 - 00:23)
 */
export const OrderSuccessIllustration: React.FC<{ primaryColor?: string }> = ({
  primaryColor = '#FF2457',
}) => {
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <svg
      viewBox="0 0 340 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-[280px] sm:max-w-[350px] h-auto mx-auto select-none overflow-visible"
    >
      {/* Base Ground Line */}
      <line
        x1="20"
        y1="152"
        x2="320"
        y2="152"
        stroke="#2D3748"
        strokeWidth="1.6"
        strokeLinecap="round"
        style={{
          transformOrigin: '170px 152px',
          transform: drawn ? 'scaleX(1)' : 'scaleX(0.1)',
          transition: 'transform 500ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />

      {/* Left Takeout Paper Bag */}
      <g
        style={{
          transformOrigin: '85px 152px',
          transform: drawn
            ? 'translateY(0) scale(1)'
            : 'translateY(24px) scale(0.85)',
          opacity: drawn ? 1 : 0,
          transition: 'all 500ms cubic-bezier(0.34, 1.56, 0.64, 1) 80ms',
        }}
      >
        <path
          d="M68 62H106L114 152H56L68 62Z"
          fill="#FFFFFF"
          stroke="#2D3748"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M68 62L78 78H108"
          stroke="#2D3748"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M74 62H106L102 74H70L74 62Z"
          fill={primaryColor}
          opacity="0.9"
        />
      </g>

      {/* Center POS Cash Register */}
      <g
        style={{
          transformOrigin: '180px 152px',
          transform: drawn ? 'scale(1)' : 'scale(0.88)',
          opacity: drawn ? 1 : 0,
          transition: 'all 500ms cubic-bezier(0.34, 1.56, 0.64, 1) 160ms',
        }}
      >
        {/* Back Accent Block */}
        <rect x="148" y="80" width="96" height="44" rx="2" fill={primaryColor} />

        {/* Receipt Popping Out Top */}
        <g
          style={{
            transform: drawn ? 'translateY(0)' : 'translateY(22px)',
            transition: 'transform 650ms cubic-bezier(0.34, 1.56, 0.64, 1) 340ms',
          }}
        >
          <path
            d="M174 52H208L204 82H170L174 52Z"
            fill="#FFFFFF"
            stroke="#2D3748"
            strokeWidth="1.5"
          />
          <line
            x1="178"
            y1="60"
            x2="200"
            y2="60"
            stroke="#94A3B8"
            strokeWidth="1.5"
          />
          <line
            x1="177"
            y1="67"
            x2="196"
            y2="67"
            stroke="#94A3B8"
            strokeWidth="1.5"
          />
          <line
            x1="176"
            y1="74"
            x2="192"
            y2="74"
            stroke="#94A3B8"
            strokeWidth="1.5"
          />
        </g>

        {/* Register Slanted Keyboard / Top Body */}
        <path
          d="M118 118L138 92H232L244 118H118Z"
          fill="#FFFFFF"
          stroke="#2D3748"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <rect
          x="146"
          y="98"
          width="34"
          height="13"
          fill="#FFF5F7"
          stroke="#2D3748"
          strokeWidth="1.3"
        />
        <line
          x1="192"
          y1="100"
          x2="220"
          y2="100"
          stroke="#2D3748"
          strokeWidth="1.5"
        />
        <line
          x1="194"
          y1="106"
          x2="224"
          y2="106"
          stroke="#2D3748"
          strokeWidth="1.5"
        />

        {/* Register Lower Drawer Base */}
        <rect
          x="114"
          y="118"
          width="134"
          height="34"
          fill="#FFF3B0"
          stroke="#2D3748"
          strokeWidth="1.6"
        />
        <line
          x1="142"
          y1="118"
          x2="142"
          y2="152"
          stroke="#2D3748"
          strokeWidth="1.5"
        />
        <circle
          cx="195"
          cy="135"
          r="3.5"
          stroke="#2D3748"
          strokeWidth="1.5"
          fill="#FFFFFF"
        />
      </g>

      {/* Right Takeaway Coffee Cup */}
      <g
        style={{
          transformOrigin: '273px 152px',
          transform: drawn
            ? 'translateY(0) scale(1)'
            : 'translateY(24px) scale(0.85)',
          opacity: drawn ? 1 : 0,
          transition: 'all 500ms cubic-bezier(0.34, 1.56, 0.64, 1) 260ms',
        }}
      >
        <path
          d="M254 90H292L286 152H260L254 90Z"
          fill="#FFFFFF"
          stroke="#2D3748"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M256 108H290L288 132H258L256 108Z"
          fill={primaryColor}
          stroke="#2D3748"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M250 84H296V90H250V84Z"
          fill="#FFFFFF"
          stroke="#2D3748"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M256 78H290L293 84H253L256 78Z"
          fill={primaryColor}
          stroke="#2D3748"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};
