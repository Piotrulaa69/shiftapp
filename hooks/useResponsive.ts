import { useWindowDimensions } from 'react-native';

export const BREAKPOINTS = {
  phone: 480,
  tablet: 768,
  desktop: 1024,
};

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isPhone = width < BREAKPOINTS.phone;
  const isTablet = width >= BREAKPOINTS.phone && width < BREAKPOINTS.desktop;
  const isDesktop = width >= BREAKPOINTS.desktop;
  const isWeb = width >= BREAKPOINTS.phone;

  const columns = isDesktop ? 3 : isTablet ? 2 : 1;

  const cardMaxWidth = isDesktop ? 420 : isTablet ? 360 : undefined;

  const horizontalPadding = isDesktop ? 32 : isTablet ? 24 : 16;

  return {
    width,
    height,
    isPhone,
    isTablet,
    isDesktop,
    isWeb,
    columns,
    cardMaxWidth,
    horizontalPadding,
  };
}
