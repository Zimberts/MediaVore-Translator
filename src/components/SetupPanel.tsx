import React, { useRef, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { parseByFilename } from '../utils/parsers';
import { FieldMapperModal } from './FieldMapperModal';

export function SetupPanel({ onFinish }: { onFinish: () => void }) {
    const { parsedFile, setParsedFile, mapping } = useAppContext();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showMapper, setShowMapper] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target?.result as string;
            try {
                const rows = parseByFilename(file.name, text);
                if (!rows || rows.length === 0) {
                    setError('No valid data found in file.');
                    return;
                }
                const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
                setParsedFile({ fileName: file.name, headers, rows });
            } catch (err: any) {
                setError(`Failed to parse: ${err.message}`);
            }
        };
        reader.readAsText(file);
    };

    const isMappingValid = !!mapping.title;

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="bg-[#3498db] text-white w-6 h-6 inline-flex justify-center items-center rounded-full text-sm">1</span>
                Data Setup
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-lg font-semibold border-b border-gray-200 pb-2 mb-3">Input File</h3>
                    <div className="mb-4">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".csv,.json,.yaml,.yml"
                            onChange={handleFileChange}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-[#2ecc71] hover:bg-[#27ae60] text-white px-4 py-2 flex rounded font-bold cursor-pointer transition-colors"
                        >
                            Choose CSV / JSON
                        </button>
                        {parsedFile && (
                            <p className="mt-2 text-sm text-gray-600 bg-gray-100 p-2 rounded inline-block">
                                Loaded: <strong>{parsedFile.fileName}</strong> ({parsedFile.rows.length} rows)
                            </p>
                        )}
                        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold border-b border-gray-200 pb-2 mb-3">Field Mapping</h3>
                    {parsedFile ? (
                        <div className="bg-gray-50 border border-gray-200 p-4 rounded-md">
                            <div className="text-sm space-y-1 mb-4">
                                <div><span className="font-bold w-20 inline-block">Title:</span> {mapping.title || <span className="text-red-500">Not set</span>}</div>
                                <div><span className="font-bold w-20 inline-block">Type:</span> {mapping.type || <span className="text-gray-400">Not set</span>}</div>
                                {mapping.hasSeries && (
                                    <>
                                        <div><span className="font-bold w-20 inline-block">Season:</span> {mapping.season || <span className="text-gray-400">Not set</span>}</div>
                                        <div><span className="font-bold w-20 inline-block">Episode:</span> {mapping.episode || <span className="text-gray-400">Not set</span>}</div>
                                    </>
                                )}
                                <div><span className="font-bold w-20 inline-block">Date:</span> {mapping.date || <span className="text-gray-400">Not set</span>}</div>
                            </div>
                            <button
                                onClick={() => setShowMapper(true)}
                                className="bg-[#3498db] hover:bg-[#2980b9] text-white px-4 py-2 rounded font-bold cursor-pointer transition-colors"
                            >
                                Configure Mapping
                            </button>
                        </div>
                    ) : (
                        <p className="text-gray-500 italic text-sm">Please load a file first</p>
                    )}
                </div>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-200 flex justify-end">
                <button
                    disabled={!parsedFile || !isMappingValid}
                    onClick={onFinish}
                    className={`px-6 py-2 rounded font-bold text-lg transition-colors ${!parsedFile || !isMappingValid
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-[#9b59b6] hover:bg-[#8e44ad] text-white cursor-pointer shadow-sm'
                        }`}
                >
                    Begin Processing &rarr;
                </button>
            </div>

            {showMapper && (
                <FieldMapperModal onClose={() => setShowMapper(false)} />
            )}
        </div>
    );
}
