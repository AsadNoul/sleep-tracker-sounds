import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Mask, Rect, Circle, G } from 'react-native-svg';

export type NightprintLogoVariant = 'dark' | 'light' | 'mono';

interface NightprintLogoProps {
  size?: number;
  variant?: NightprintLogoVariant;
  accessibilityLabel?: string;
}

// Gradient stops per variant — geometry is identical across all three (ported
// 1:1 from nightprint-mark[-light|-mono].svg); only the stroke gradient colors change.
const VARIANT_STOPS: Record<NightprintLogoVariant, [string, string, string]> = {
  dark: ['#C2572C', '#E89A56', '#FFCB8F'],
  light: ['#1F1A14', '#B8471C', '#D98A3D'],
  mono: ['#FFFFFF', '#FFFFFF', '#FFFFFF'],
};

// Each ring: [radius, dasharray, rotation] — pixel-faithful to the source SVG's
// concentric fingerprint-ridge rings clipped into a crescent via the mask.
const RINGS: Array<{ r: number; dash: string; rotate: number }> = [
  { r: 14, dash: '29.9 10 15.8 10', rotate: 0 },
  { r: 24, dash: '63.3 16 27.1 16', rotate: 37 },
  { r: 34, dash: '72.6 22 38.5 22', rotate: 74 },
  { r: 44, dash: '116.1 10 49.8 10', rotate: 111 },
  { r: 54, dash: '115.4 16 61.1 16', rotate: 148 },
  { r: 64, dash: '168.9 22 72.4 22', rotate: 185 },
  { r: 74, dash: '158.1 10 83.7 10', rotate: 222 },
  { r: 84, dash: '221.7 16 95.0 16', rotate: 259 },
  { r: 94, dash: '200.8 22 106.3 22', rotate: 296 },
];

export default function NightprintLogo({
  size = 120,
  variant = 'dark',
  accessibilityLabel = 'Nightprint logo',
}: NightprintLogoProps) {
  const gradientId = `nightprint-gradient-${variant}`;
  const maskId = `nightprint-mask-${variant}`;
  const [c1, c2, c3] = VARIANT_STOPS[variant];

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 220 220"
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor={c1} />
          <Stop offset="0.55" stopColor={c2} />
          <Stop offset="1" stopColor={c3} />
        </LinearGradient>
        <Mask id={maskId}>
          <Rect width={220} height={220} fill="#000" />
          <Circle cx={110} cy={110} r={92} fill="#fff" />
          <Circle cx={152} cy={80} r={74} fill="#000" />
        </Mask>
      </Defs>
      <G
        mask={`url(#${maskId})`}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={5.5}
        strokeLinecap="round"
      >
        {RINGS.map((ring) => (
          <Circle
            key={ring.r}
            cx={104}
            cy={118}
            r={ring.r}
            strokeDasharray={ring.dash}
            origin={`104, 118`}
            rotation={ring.rotate}
          />
        ))}
      </G>
    </Svg>
  );
}
