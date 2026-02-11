// Grainient preset configuration for Zenko Gaming Platform
// Tactical theme - Subtle movement, static grain, sharp defined zones, professional gaming aesthetic
// Using dark purple gradient: #110722 (dark purple) → #24163C (medium dark purple) → #431B8A (purple-900)
// Optimized for dark gaming aesthetic with subtle, professional movement

export const GRAINIENT_PRESETS = {
  tactical: {
    color1: "#431B8A", // purple-900 - deep purple accent
    color2: "#24163C", // medium dark purple
    color3: "#110722", // dark purple base
    timeSpeed: 0.35, // Slow but noticeable movement
    colorBalance: -0.35, // More balanced
    warpStrength: 0.5, // Subtle but visible warping
    warpFrequency: 2.0, // Low-medium frequency
    warpSpeed: 0.55, // Gentle, deliberate movement
    warpAmplitude: 20, // Noticeable waves
    blendAngle: 0,
    blendSoftness: 0.05, // Sharp, defined edges
    rotationAmount: 180, // Moderate rotation
    noiseScale: 2,
    grainAmount: 0.15, // More visible grain
    grainScale: 6, // Larger grain texture
    grainAnimated: false, // Static grain for stability
    contrast: 1.3, // High contrast for defined zones
    gamma: 1.12, // Brighter
    saturation: 0.75, // Moderate saturation
    centerX: 0,
    centerY: 0,
    zoom: 0.95,
  },
};
