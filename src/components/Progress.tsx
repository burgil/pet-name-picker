interface ProgressProps {
    text: string;
    percentage: number;
    total?: number;
}

function formatBytes(size: number): string {
    const i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
    const units = ['B', 'kB', 'MB', 'GB', 'TB'];
    return +((size / Math.pow(1024, i)).toFixed(2)) * 1 + units[i]!;
}

export default function Progress({ text, percentage, total }: ProgressProps) {
    const pct = Math.max(0, Math.min(100, Number(percentage ?? 0) || 0));
    const insideVisible = pct > 8; // when the fill is wide enough to show text legibly

    const overlayText = `${text} (${pct.toFixed(2)}%${total === undefined || isNaN(total) ? '' : ` of ${formatBytes(total)}`})`;

    return (
        <div className="relative w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden mb-0.5">
            <div
                className={`h-6 transition-all duration-300 ease-in-out ${insideVisible ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                style={{ width: `${pct}%` }}
            >
                <div className="h-full flex items-center px-2 text-sm font-medium">
                    {insideVisible ? `${text} (${pct.toFixed(2)}%)` : null}
                </div>
            </div>

            <div className={`absolute inset-0 flex items-center justify-center pointer-events-none px-2`}>
                <span className={`text-sm font-medium ${pct > 50 ? 'text-white' : 'text-gray-700 dark:text-gray-100'}`}>
                    {overlayText}
                </span>
            </div>
        </div>
    );
}
