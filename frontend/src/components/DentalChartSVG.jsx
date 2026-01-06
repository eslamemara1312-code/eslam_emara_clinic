import React from 'react';
import { universalToPalmer, toothToNumber } from '../utils/toothUtils';

// Tooth Shapes defined as SVG paths (Simplified realistic shapes)
const TOOTH_PATHS = {
    // Upper Molar Right (1, 2, 3)
    upperMolarRight: "M10,5 C15,0 35,0 40,5 C45,15 45,35 40,45 C35,50 15,50 10,45 C5,35 5,15 10,5 Z M15,15 L20,20 M30,15 L25,20 M25,25 L25,35",
    upperPremolarRight: "M12,8 C17,3 33,3 38,8 C42,15 42,30 38,40 C33,45 17,45 12,40 C8,30 8,15 12,8 Z M25,15 L25,30",
    upperCanineRight: "M15,10 C20,5 30,5 35,10 C40,20 35,40 25,48 C15,40 10,20 15,10 Z",
    upperIncisorRight: "M10,10 C15,8 35,8 40,10 C42,20 40,40 35,45 C30,48 20,48 15,45 C10,40 8,20 10,10 Z",

    // Upper Left
    upperIncisorLeft: "M10,10 C15,8 35,8 40,10 C42,20 40,40 35,45 C30,48 20,48 15,45 C10,40 8,20 10,10 Z",
    upperCanineLeft: "M15,10 C20,5 30,5 35,10 C40,20 35,40 25,48 C15,40 10,20 15,10 Z",
    upperPremolarLeft: "M12,8 C17,3 33,3 38,8 C42,15 42,30 38,40 C33,45 17,45 12,40 C8,30 8,15 12,8 Z M25,15 L25,30",
    upperMolarLeft: "M10,5 C15,0 35,0 40,5 C45,15 45,35 40,45 C35,50 15,50 10,45 C5,35 5,15 10,5 Z M15,15 L20,20 M30,15 L25,20 M25,25 L25,35",

    // Lower
    lowerMolar: "M10,5 C15,0 35,0 40,5 C45,15 45,35 40,45 C35,50 15,50 10,45 C5,35 5,15 10,5 Z M15,15 L20,20 M30,15 L25,20 M25,25 L25,35",
    lowerPremolar: "M12,8 C17,3 33,3 38,8 C42,15 42,30 38,40 C33,45 17,45 12,40 C8,30 8,15 12,8 Z M25,15 L25,30",
    lowerCanine: "M15,10 C20,5 30,5 35,10 C40,20 35,40 25,48 C15,40 10,20 15,10 Z",
    lowerIncisor: "M15,12 C18,10 32,10 35,12 C36,20 35,35 32,40 C28,42 22,42 18,40 C15,35 14,20 15,12 Z",
};

// --- Palmer Notation Helper ---
const getPalmerLabel = (id, isPediatric) => {
    return universalToPalmer(id, isPediatric);
};

const getToothPath = (id, isPediatric) => {
    if (isPediatric) {
        switch (id) {
            case 'A': return TOOTH_PATHS.upperMolarRight;
            case 'B': return TOOTH_PATHS.upperMolarRight;
            case 'C': return TOOTH_PATHS.upperCanineRight;
            case 'D': return TOOTH_PATHS.upperIncisorRight;
            case 'E': return TOOTH_PATHS.upperIncisorRight;
            case 'F': return TOOTH_PATHS.upperIncisorLeft;
            case 'G': return TOOTH_PATHS.upperIncisorLeft;
            case 'H': return TOOTH_PATHS.upperCanineLeft;
            case 'I': return TOOTH_PATHS.upperMolarLeft;
            case 'J': return TOOTH_PATHS.upperMolarLeft;
            case 'K': return TOOTH_PATHS.lowerMolar;
            case 'L': return TOOTH_PATHS.lowerMolar;
            case 'M': return TOOTH_PATHS.lowerCanine;
            case 'N': return TOOTH_PATHS.lowerIncisor;
            case 'O': return TOOTH_PATHS.lowerIncisor;
            case 'P': return TOOTH_PATHS.lowerIncisor;
            case 'Q': return TOOTH_PATHS.lowerIncisor;
            case 'R': return TOOTH_PATHS.lowerCanine;
            case 'S': return TOOTH_PATHS.lowerMolar;
            case 'T': return TOOTH_PATHS.lowerMolar;
            default: return TOOTH_PATHS.upperMolarRight;
        }
    }

    const n = parseInt(id);
    if (n >= 1 && n <= 3) return TOOTH_PATHS.upperMolarRight;
    if (n >= 4 && n <= 5) return TOOTH_PATHS.upperPremolarRight;
    if (n === 6) return TOOTH_PATHS.upperCanineRight;
    if (n >= 7 && n <= 8) return TOOTH_PATHS.upperIncisorRight;
    if (n >= 9 && n <= 10) return TOOTH_PATHS.upperIncisorLeft;
    if (n === 11) return TOOTH_PATHS.upperCanineLeft;
    if (n >= 12 && n <= 13) return TOOTH_PATHS.upperPremolarLeft;
    if (n >= 14 && n <= 16) return TOOTH_PATHS.upperMolarLeft;
    if (n >= 17 && n <= 19) return TOOTH_PATHS.lowerMolar;
    if (n >= 20 && n <= 21) return TOOTH_PATHS.lowerPremolar;
    if (n === 22) return TOOTH_PATHS.lowerCanine;
    if (n >= 23 && n <= 26) return TOOTH_PATHS.lowerIncisor;
    if (n === 27) return TOOTH_PATHS.lowerCanine;
    if (n >= 28 && n <= 29) return TOOTH_PATHS.lowerPremolar;
    if (n >= 30 && n <= 32) return TOOTH_PATHS.lowerMolar;

    return TOOTH_PATHS.upperMolarRight;
};

const STATUS_STYLES = {
    Healthy: { fill: '#ffffff', stroke: '#94a3b8' },
    Decayed: { fill: '#fecaca', stroke: '#ef4444' },
    Filled: { fill: '#bfdbfe', stroke: '#3b82f6' },
    Missing: { fill: '#f1f5f9', stroke: '#e2e8f0', opacity: 0.3 },
    Crown: { fill: '#fef08a', stroke: '#eab308' },
    RootCanal: { fill: '#e9d5ff', stroke: '#a855f7' },
};

function SVGTooth({ number, status, onClick, isPediatric }) {
    const path = getToothPath(number, isPediatric);
    const condition = status?.condition || 'Healthy';
    const style = STATUS_STYLES[condition];
    const palmerLabel = getPalmerLabel(number, isPediatric);

    return (
        <div
            className="flex flex-col items-center gap-1 cursor-pointer group relative"
            onClick={() => onClick(number)}
        >
            <svg width="50" height="60" viewBox="0 0 50 60" className="transition-transform transform group-hover:scale-110 duration-200">
                <path
                    d={path}
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth="2"
                    className="transition-colors duration-300"
                />
                {condition === 'Decayed' && <circle cx="25" cy="25" r="5" fill="#ef4444" />}
            </svg>
            <div className="flex flex-col items-center absolute -bottom-6">
                {/* Palmer Bracket Visual Aid - Optional but helpful */}
                <span className="text-sm font-bold text-slate-600 font-mono border-t border-slate-300 pt-1 w-full text-center">
                    {palmerLabel}
                </span>
            </div>
        </div>
    );
}

export default function DentalChartSVG({ teethStatus, onToothClick, isPediatric }) {
    // Config - Universal IDs
    const adultUpperRight = [1, 2, 3, 4, 5, 6, 7, 8];
    const adultUpperLeft = [9, 10, 11, 12, 13, 14, 15, 16];
    // Lower Arch in Palmer is usually displayed 8..1 | 1..8 meaning Right 8 to Right 1 then Left 1 to Left 8
    // My previous layout was standard view: Right side of mouth is on Left of screen?
    // Let's stick to the previous layout:
    // Upper Arch: UR 8..1 | UL 1..8
    // Lower Arch: LR 8..1 | LL 1..8 ? No.

    // VISUAL LAYOUT:
    // Screen Left = Patient Right.
    // So Row 1: UR8, UR7 ... UR1 | UL1 ... UL8
    // Row 2: LR8, LR7 ... LR1 | LL1 ... LL8

    // My `adultUpperRight` is [1..8]. 1 is Back Right (UR8). 8 is Front Right (UR1).
    // So mapping [1..8] creates UR8...UR1. Correct.

    // `adultUpperLeft` is [9..16]. 9 is Front Left (UL1). 16 is Back Left (UL8).
    // So mapping [9..16] creates UL1...UL8. Correct.

    // Lower:
    // Default Universal is 17 (Back Left) -> 32 (Back Right).
    // Screen Left (Patient Right): LR8...LR1.
    // Screen Right (Patient Left): LL1...LL8.

    // Universal 32 is LR Back (LR8). 25 is LR Front (LR1).
    // So I need to render [32..25] for the LEFT side of the screen (Patient Right).
    const adultLowerRight = [32, 31, 30, 29, 28, 27, 26, 25];

    // Universal 24 is LL Front (LL1). 17 is LL Back (LL8).
    // So I need to render [24..17] for the RIGHT side of the screen (Patient Left).
    const adultLowerLeft = [24, 23, 22, 21, 20, 19, 18, 17];

    const childUpperRight = ['A', 'B', 'C', 'D', 'E'];
    const childUpperLeft = ['F', 'G', 'H', 'I', 'J'];
    const childLowerRight = ['T', 'S', 'R', 'Q', 'P'];
    const childLowerLeft = ['O', 'N', 'M', 'L', 'K'];

    const upperRight = isPediatric ? childUpperRight : adultUpperRight;
    const upperLeft = isPediatric ? childUpperLeft : adultUpperLeft;
    const lowerRight = isPediatric ? childLowerRight : adultLowerRight;
    const lowerLeft = isPediatric ? childLowerLeft : adultLowerLeft;

    return (
        <div className="bg-slate-50 p-8 rounded-3xl shadow-inner overflow-x-auto text-center">
            <h3 className="text-lg font-bold mb-8 text-slate-700">
                {isPediatric ? 'مخطط الأسنان (أطفال)' : 'مخطط الأسنان (بالغين)'}
                <span className="block text-xs text-slate-400 font-normal mt-1">Palmer Notation</span>
            </h3>

            <div className="inline-flex flex-col gap-16 min-w-[700px]">
                {/* Upper Arch */}
                <div className="flex justify-center gap-1 relative">
                    {/* Cross line for Palmer */}
                    <div className="absolute inset-y-0 left-1/2 w-0.5 bg-slate-300"></div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-300"></div>

                    <div className="flex gap-1 px-4 pb-4">
                        {upperRight.map(n => (
                            <SVGTooth key={n} number={n} status={teethStatus[toothToNumber(n)]} onClick={onToothClick} isPediatric={isPediatric} />
                        ))}
                    </div>
                    <div className="w-0.5"></div>
                    <div className="flex gap-1 px-4 pb-4">
                        {upperLeft.map(n => (
                            <SVGTooth key={n} number={n} status={teethStatus[toothToNumber(n)]} onClick={onToothClick} isPediatric={isPediatric} />
                        ))}
                    </div>
                </div>

                {/* Lower Arch */}
                <div className="flex justify-center gap-1 relative">
                    {/* Cross line for Palmer */}
                    <div className="absolute inset-y-0 left-1/2 w-0.5 bg-slate-300"></div>
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-slate-300"></div>

                    <div className="flex gap-1 px-4 pt-4">
                        {lowerRight.map(n => (
                            <SVGTooth key={n} number={n} status={teethStatus[toothToNumber(n)]} onClick={onToothClick} isPediatric={isPediatric} />
                        ))}
                    </div>
                    <div className="w-0.5"></div>
                    <div className="flex gap-1 px-4 pt-4">
                        {lowerLeft.map(n => (
                            <SVGTooth key={n} number={n} status={teethStatus[toothToNumber(n)]} onClick={onToothClick} isPediatric={isPediatric} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-6 mt-12 justify-center text-sm border-t border-slate-200 pt-6">
                {Object.entries(STATUS_STYLES).map(([status, style]) => (
                    <div key={status} className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full border shadow-sm" style={{ backgroundColor: style.fill, borderColor: style.stroke, borderWidth: 2 }} />
                        <span className="font-medium text-slate-600">
                            {status === 'Healthy' ? 'سليم' :
                                status === 'Decayed' ? 'تسوس' :
                                    status === 'Filled' ? 'حشو' :
                                        status === 'Missing' ? 'مخلوع' :
                                            status === 'Crown' ? 'طربوش' : 'عصب'}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
