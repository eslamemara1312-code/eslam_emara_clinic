// Tooth Number Utilities
// Maps pediatric tooth letters (Universal) to FDI numeric notation for database storage

// Universal Pediatric Notation: A-T (Primary/Deciduous teeth)
// FDI Pediatric Notation: 51-85
// Mapping:
// UR: A=55, B=54, C=53, D=52, E=51
// UL: F=61, G=62, H=63, I=64, J=65
// LL: K=75, L=74, M=73, N=72, O=71
// LR: P=81, Q=82, R=83, S=84, T=85

const PEDIATRIC_LETTER_TO_NUMBER = {
    'A': 55, 'B': 54, 'C': 53, 'D': 52, 'E': 51,  // Upper Right
    'F': 61, 'G': 62, 'H': 63, 'I': 64, 'J': 65,  // Upper Left
    'K': 75, 'L': 74, 'M': 73, 'N': 72, 'O': 71,  // Lower Left
    'P': 81, 'Q': 82, 'R': 83, 'S': 84, 'T': 85   // Lower Right
};

const PEDIATRIC_NUMBER_TO_LETTER = Object.fromEntries(
    Object.entries(PEDIATRIC_LETTER_TO_NUMBER).map(([k, v]) => [v, k])
);

export const toothToNumber = (toothId) => {
    // If it's a letter (pediatric), convert to FDI number
    if (typeof toothId === 'string' && /^[A-T]$/.test(toothId)) {
        return PEDIATRIC_LETTER_TO_NUMBER[toothId];
    }
    // If it's already a number or numeric string, return as integer
    return parseInt(toothId);
};

export const toothToDisplay = (toothNumber, isPediatric) => {
    // If pediatric mode and number is in pediatric range (51-85), convert to letter
    if (isPediatric && toothNumber >= 51 && toothNumber <= 85) {
        return PEDIATRIC_NUMBER_TO_LETTER[toothNumber] || toothNumber;
    }
    // Otherwise return as-is
    return toothNumber;
};
