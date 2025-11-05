// src/components/ResultsDisplay.tsx

type CalculationResults = { [key: string]: { value: number | string; label: string } };

interface ResultsDisplayProps {
    results: CalculationResults;
}

// Function to format numbers nicely
const formatResult = (value: number | string) => {
    if (typeof value === 'number') {
        return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
    }
    return value;
};

export default function ResultsDisplay({ results }: ResultsDisplayProps) {
    return (
        <div className="space-y-3 pt-4 border-t mt-4">
            {Object.keys(results).map((key) => (
                <div key={key} className="flex">
                    <label className="w-48 text-left mr-4 font-semibold">{results[key].label}</label>
                    <p className="font-mono">{formatResult(results[key].value)}</p>
                </div>
            ))}
        </div>
    );
}