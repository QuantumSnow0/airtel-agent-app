import { Dimensions, PixelRatio } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Base dimensions (iPhone 12/13/14 - 390x844)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

/**
 * Scale a size based on screen width
 * @param size - The size to scale
 * @returns Scaled size
 */
export const scaleWidth = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  return Math.round(size * scale);
};

/**
 * Scale a size based on screen height
 * @param size - The size to scale
 * @returns Scaled size
 */
export const scaleHeight = (size: number): number => {
  const scale = SCREEN_HEIGHT / BASE_HEIGHT;
  return Math.round(size * scale);
};

/**
 * Scale font size based on screen width
 * @param size - Font size to scale
 * @returns Scaled font size
 */
export const scaleFont = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

/**
 * Get responsive padding horizontal
 * Scales between 16 (small screens) and 24 (large screens)
 */
export const getResponsivePadding = (): number => {
  if (SCREEN_WIDTH < 360) {
    return 12; // Very small screens
  } else if (SCREEN_WIDTH < 400) {
    return 16; // Small screens
  } else if (SCREEN_WIDTH < 480) {
    return 20; // Medium screens
  } else {
    return 24; // Large screens
  }
};

/**
 * Get responsive padding for cards/containers
 */
export const getCardPadding = (): number => {
  if (SCREEN_WIDTH < 360) {
    return 12;
  } else if (SCREEN_WIDTH < 400) {
    return 14;
  } else {
    return 16;
  }
};

/**
 * Get responsive icon size
 */
export const getIconSize = (baseSize: number = 24): number => {
  if (SCREEN_WIDTH < 360) {
    return baseSize * 0.9;
  } else if (SCREEN_WIDTH > 480) {
    return baseSize * 1.1;
  }
  return baseSize;
};

/**
 * Get screen width
 */
export const getScreenWidth = (): number => SCREEN_WIDTH;

/**
 * Get screen height
 */
export const getScreenHeight = (): number => SCREEN_HEIGHT;

/**
 * Check if device is small screen
 */
export const isSmallScreen = (): boolean => SCREEN_WIDTH < 360;

/**
 * Check if device is large screen
 */
export const isLargeScreen = (): boolean => SCREEN_WIDTH > 480;





