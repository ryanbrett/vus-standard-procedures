// src/constants.ts

export const DENSITIES = {
    aluminum: 0.097,
    corrugated: 0.0066522,
    acm: 0.0484,
    hdpe: 0.0348011,
    hdpe_023: 0.068,
    magnet: 0.1292
};

export const THICKNESSES = {
    corrugated: 0.15748,
    acm: 0.118,
    magnet30: 0.030,
    magnet60: 0.060
};

export const PART_GROUP_OPTIONS = {
    signs: [
        { value: 'aluminum_sign', text: 'Aluminum Sign' },
        { value: 'acm_sign', text: 'ACM' },
        { value: 'hdpe_sign', text: 'HDPE' },
        { value: 'corrugated', text: 'Corrugated' }
    ],
    decals: [
        { value: 'digital_print', text: 'Digital Print (Roll)' },
        { value: 'magnet', text: 'Magnet Sheet' },
        { value: 'banner', text: 'Banner' },       
        { value: 'opus_cut_decal', text: 'Opus Cut Decal' },
        { value: 'screenDecal', text: 'Screen (Decal)' }
    ],
    lineMarkers: [
        { value: 'bullet', text: 'Bullet Markers' },
        { value: 'delta', text: 'Delta Markers' },
        { value: 'drv', text: 'DRV Markers' }        
    ],
    other: [
        { value: 'vhbTape', text: 'VHB Tape' },       
        { value: 'frame', text: 'Frames' },
        { value: 'accessories', text: 'Accessories' }
    ]
};

export const DETAIL_PART_TYPES = ['digital_print', 'magnet', 'opus_cut_decal', 'vhbTape'];