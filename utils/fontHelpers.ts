/**
 * Font Utility Helper
 * Use this to quickly add Poppins font to existing text styles
 */

export const withPoppins = (weight: 'light' | 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black' = 'regular') => {
    const fontMap = {
        light: 'Poppins-Light',
        regular: 'Poppins-Regular',
        medium: 'Poppins-Medium',
        semibold: 'Poppins-SemiBold',
        bold: 'Poppins-Bold',
        extrabold: 'Poppins-ExtraBold',
        black: 'Poppins-Black',
    };

    return { fontFamily: fontMap[weight] };
};

// Quick access helpers
export const poppinsRegular = { fontFamily: 'Poppins-Regular' };
export const poppinsMedium = { fontFamily: 'Poppins-Medium' };
export const poppinsSemiBold = { fontFamily: 'Poppins-SemiBold' };
export const poppinsBold = { fontFamily: 'Poppins-Bold' };
export const poppinsBlack = { fontFamily: 'Poppins-Black' };

/**
 * Usage in StyleSheet:
 * 
 * const styles = StyleSheet.create({
 *   title: {
 *     fontSize: 24,
 *     ...poppinsBold,  // Quick way
 *     color: '#fff',
 *   },
 *   body: {
 *     fontSize: 14,
 *     ...withPoppins('medium'),  // Flexible way
 *   }
 * });
 */
