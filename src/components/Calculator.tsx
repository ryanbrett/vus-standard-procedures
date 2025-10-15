// src/components/Calculator.tsx

import { useState, useEffect } from 'react';
import { PART_GROUP_OPTIONS, DENSITIES, THICKNESSES } from '../constants';
import ResultsDisplay from './ResultsDisplay'; // We will create this next

type PartGroup = keyof typeof PART_GROUP_OPTIONS;
// Define a type for our results object
type CalculationResults = { [key: string]: { value: number | string; label: string } };

export default function Calculator() {
    // --- STATE ---
    // Main selectors
    const [partGroup, setPartGroup] = useState<PartGroup>('lineMarkers');
    const [partType, setPartType] = useState('bullet');
    // Item dimensions
    const [itemWidth, setItemWidth] = useState('48');
    const [itemHeight, setItemHeight] = useState('24');
    // Conditional options state
    const [alGauge, setAlGauge] = useState('.024');
    const [acmSheetSize, setAcmSheetSize] = useState('96');
    const [hdpeSheetSize, setHdpeSheetSize] = useState('.023');
    const [corrSheetSize, setCorrSheetSize] = useState('4mm');
    const [magnetRollWidth, setMagnetRollWidth] = useState('24');
    const [magnetThickness, setMagnetThickness] = useState('0.030');
    const [digitalPrintRollWidth, setDigitalPrintRollWidth] = useState('54');
    const [includeBleed, setIncludeBleed] = useState(true);
    const [opusSheetWidth, setOpusSheetWidth] = useState('12');
    const [opusSheetHeight, setOpusSheetHeight] = useState('18');
    // Bullet marker options state
    const [sleeveLength, setSleeveLength] = useState('16');
    const [tubeGauge, setTubeGauge] = useState('0.100');
    const [tubeLength, setTubeLength] = useState('72');
    const [customTubeLength, setCustomTubeLength] = useState('');
    const [includeDomeCapPlug, setIncludeDomeCapPlug] = useState(true);
    const [includeSleeve, setIncludeSleeve] = useState(true);
    const [includeT3Head, setIncludeT3Head] = useState(false);
    const [includeRainCap, setIncludeRainCap] = useState(false);
    const [includeUChannel, setIncludeUChannel] = useState(false);

    // State for results and errors
    const [results, setResults] = useState<CalculationResults | null>(null);
    const [error, setError] = useState<string>('');

    // --- EFFECTS ---
    useEffect(() => {
        const firstPartType = PART_GROUP_OPTIONS[partGroup][0]?.value;
        if (firstPartType) {
            setPartType(firstPartType);
        }
        setResults(null); // Clear results when group changes
        setError('');
    }, [partGroup]);

    useEffect(() => {
        setResults(null); // Clear results when type changes
        setError('');
    }, [partType]);


    // --- CALCULATION LOGIC ---
    const handleCalculate = () => {
        const width = parseFloat(itemWidth);
        const height = parseFloat(itemHeight);
        let calculatedResults: CalculationResults = {};

        // Reset error
        setError('');

        if ((isNaN(width) || isNaN(height)) && partType !== 'bullet') {
            setError("Please enter valid numbers for width and height.");
            setResults(null);
            return;
        }

        const calculateWeight = (l: number, w: number, thickness: number, density: number) => l * w * thickness * density;

        switch (partType) {
            case 'aluminum_sign':
            case 'corrugated': {
                const sheetWidth = 96;
                const sheetHeight = 48;
                const numUpWidth = Math.floor(sheetWidth / width);
                const numUpHeight = Math.floor(sheetHeight / height);
                const numUpSwappedWidth = Math.floor(sheetWidth / height);
                const numUpSwappedHeight = Math.floor(sheetHeight / width);
                const maxNumUp = Math.max(numUpWidth * numUpHeight, numUpSwappedWidth * numUpSwappedHeight);
                const isAluminum = partType === 'aluminum_sign';
                
                calculatedResults = {
                    qty: { value: maxNumUp, label: "# Up / Inverse Qty:" },
                    percentWaste: { value: 1 / maxNumUp, label: "% Out of Material:" },
                    weight: {
                        value: calculateWeight(width, height, isAluminum ? parseFloat(alGauge) : THICKNESSES.corrugated, isAluminum ? DENSITIES.aluminum : DENSITIES.corrugated),
                        label: isAluminum ? "Aluminum Weight:" : "Corrugated Weight:"
                    }
                };
                break;
            }
            case 'bullet': {
                const tubeData = { "0.100": 0.4599, "0.110": 0.482195, "0.125": 0.5211, "0.218": 0.9073, "0.318": 1.29512 };
                const finalTubeLength = tubeLength === 'custom' ? parseFloat(customTubeLength) || 0 : parseFloat(tubeLength);
                const tubeWeight = (finalTubeLength / 12) * (tubeData[tubeGauge as keyof typeof tubeData] || 0);
                const headWeight = (includeSleeve ? (sleeveLength === '16' ? 0.65 : 0.95) : 0) + (includeDomeCapPlug ? 0.152 : 0);
                const totalWeight = tubeWeight + headWeight + (includeT3Head ? 0.6 : 0) + (includeRainCap ? 0.05 : 0) + (includeUChannel ? 1.12 : 0);

                calculatedResults = {
                    bulletHeadWeight: { value: headWeight, label: "Bullet Head Weight:" },
                    tubeWeight: { value: tubeWeight, label: "Tube Weight:" },
                    weight: { value: totalWeight, label: "Total Marker Weight:" }
                };
                break;
            }
             // Add other cases here based on calculate.js...
        }

        setResults(calculatedResults);
    };

    // --- RENDER ---
    return (
        <div className="p-5 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Standard Procedures <span className="text-sm font-normal">v0.9.2</span></h1>
            
            <div className="space-y-3">
                {/* All input fields remain the same as the previous step... */}
                 <div className="flex items-center">
                    <label htmlFor="partGroup" className="w-48 text-right mr-4 font-semibold">Part Group:</label>
                    <select id="partGroup" value={partGroup} onChange={(e) => setPartGroup(e.target.value as PartGroup)} className="w-48 p-2 border rounded bg-gray-700 text-white">
                        <option value="signs">Signs</option> <option value="decals">Decals</option> <option value="lineMarkers">Markers</option> <option value="other">Other</option>
                    </select>
                </div>
                <div className="flex items-center">
                    <label htmlFor="partType" className="w-48 text-right mr-4 font-semibold">Part Type:</label>
                    <select id="partType" value={partType} onChange={(e) => setPartType(e.target.value)} className="w-48 p-2 border rounded bg-gray-700 text-white">
                        {PART_GROUP_OPTIONS[partGroup].map(option => ( <option key={option.value} value={option.value}>{option.text}</option> ))}
                    </select>
                </div>
                {partType === 'aluminum_sign' && (
                    <div className="flex items-center">
                        <label htmlFor="alGauge_options" className="w-48 text-right mr-4 font-semibold">Aluminum Gauge:</label>
                        <select id="alGauge_options" value={alGauge} onChange={(e) => setAlGauge(e.target.value)} className="w-48 p-2 border rounded bg-gray-700 text-white">
                            <option value=".024">.024</option> <option value=".040">.040</option> <option value=".050">.050</option> <option value=".063">.063</option> <option value=".080">.080</option> <option value=".090">.090</option> <option value=".125">.125</option>
                        </select>
                    </div>
                )}
                 {partType === 'corrugated' && (
                     <div className="flex items-center">
                        <label htmlFor="corr_options" className="w-48 text-right mr-4 font-semibold">Corrugated Sheet Size:</label>
                        <select id="corr_options" value={corrSheetSize} onChange={(e) => setCorrSheetSize(e.target.value)} className="w-48 p-2 border rounded bg-gray-700 text-white" disabled>
                            <option value="4mm">4mm x 96in x 48in</option>
                        </select>
                    </div>
                )}
                {partType === 'bullet' && (
                    <div className="space-y-3">
                        <div className="flex items-center">
                            <label htmlFor="sleeveLength" className="w-48 text-right mr-4 font-semibold">Sleeve Length:</label>
                            <select id="sleeveLength" value={sleeveLength} onChange={(e) => setSleeveLength(e.target.value)} className="w-48 p-2 border rounded bg-gray-700 text-white">
                                <option value="16">16in Sleeve</option> <option value="22">22in Sleeve</option>
                            </select>
                        </div>
                        <div className="flex items-center">
                            <label htmlFor="tubeGauge" className="w-48 text-right mr-4 font-semibold">Tube Gauge:</label>
                            <select id="tubeGauge" value={tubeGauge} onChange={(e) => setTubeGauge(e.target.value)} className="w-48 p-2 border rounded bg-gray-700 text-white">
                                <option value="0.100">.100</option> <option value="0.110">.110</option> <option value="0.125">.125</option> <option value="0.218">.218</option> <option value="0.318">.318</option>
                            </select>
                        </div>
                         <div className="flex items-center">
                            <label htmlFor="tubeLength" className="w-48 text-right mr-4 font-semibold">Tube Length:</label>
                            <select id="tubeLength" value={tubeLength} onChange={(e) => setTubeLength(e.target.value)} className="w-48 p-2 border rounded bg-gray-700 text-white">
                                <option value="66">66in</option> <option value="72">72in</option> <option value="84">84in</option> <option value="96">96in</option> <option value="custom">Custom</option>
                            </select>
                        </div>
                         {tubeLength === 'custom' && (
                            <div className="flex items-center">
                                <label htmlFor="customLengthInput" className="w-48 text-right mr-4 font-semibold">Custom Length:</label>
                                <input type="text" id="customLengthInput" value={customTubeLength} onChange={(e) => setCustomTubeLength(e.target.value)} placeholder="Enter custom length" className="w-48 p-2 border rounded"/>
                            </div>
                        )}
                        <div className="ml-[200px] grid grid-cols-2 gap-x-4 gap-y-2 w-max">
                            <label className="flex items-center"><input type="checkbox" checked={includeDomeCapPlug} onChange={(e) => setIncludeDomeCapPlug(e.target.checked)} className="mr-2"/>Dome Cap Plug</label>
                            <label className="flex items-center"><input type="checkbox" checked={includeSleeve} onChange={(e) => setIncludeSleeve(e.target.checked)} className="mr-2"/>Bullet Sleeve</label>
                            <label className="flex items-center"><input type="checkbox" checked={includeT3Head} onChange={(e) => setIncludeT3Head(e.target.checked)} className="mr-2"/>T3 Head</label>
                            <label className="flex items-center"><input type="checkbox" checked={includeRainCap} onChange={(e) => setIncludeRainCap(e.target.checked)} className="mr-2"/>Rain Cap</label>
                            <label className="flex items-center"><input type="checkbox" checked={includeUChannel} onChange={(e) => setIncludeUChannel(e.target.checked)} className="mr-2"/>U-Channel</label>
                        </div>
                    </div>
                )}
                {partType !== 'bullet' && (
                     <div className="space-y-3 pt-4 border-t mt-4">
                        <div className="flex items-center">
                            <label htmlFor="itemWidth" className="w-48 text-right mr-4 font-semibold">Item Size Width:</label>
                            <input id="itemWidth" type="number" value={itemWidth} onChange={e => setItemWidth(e.target.value)} placeholder="Width in Inches" step="0.001" className="w-48 p-2 border rounded bg-gray-700 text-white" />
                        </div>
                        <div className="flex items-center">
                            <label htmlFor="itemHeight" className="w-48 text-right mr-4 font-semibold">Item Size Height:</label>
                            <input id="itemHeight" type="number" value={itemHeight} onChange={e => setItemHeight(e.target.value)} placeholder="Height in Inches" step="0.001" className="w-48 p-2 border rounded bg-gray-700 text-white" />
                        </div>
                    </div>
                )}
            </div>
            
            <div className="mt-6">
                <button onClick={handleCalculate} className="ml-[150px] bg-gray-300 text-white py-2 px-4 rounded hover:bg-blue-700">Calculate</button>
                {error && <div className="mt-2 ml-[200px] font-bold text-red-600">{error}</div>}
                {results && <ResultsDisplay results={results} />}
            </div>
        </div>
    );
}