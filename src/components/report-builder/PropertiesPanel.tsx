
import React, { useEffect, useState } from 'react';
import { useBuilder } from './BuilderContext';
import { LayoutColumn, LayoutRow } from '../reports/templates/DynamicReportTemplate';

export const PropertiesPanel: React.FC = () => {
    const { layout, selectedId, updateColumnWidth, removeRow, removeColumn } = useBuilder();
    const [selectedItem, setSelectedItem] = useState<{ type: 'row' | 'column', item: any, parentRow?: LayoutRow } | null>(null);

    useEffect(() => {
        if (!selectedId) {
            setSelectedItem(null);
            return;
        }

        // Find in rows
        const row = layout.rows.find(r => r.id === selectedId);
        if (row) {
            setSelectedItem({ type: 'row', item: row });
            return;
        }

        // Find in columns
        for (const r of layout.rows) {
            const col = r.columns.find(c => c.id === selectedId);
            if (col) {
                setSelectedItem({ type: 'column', item: col, parentRow: r });
                return;
            }
        }

        setSelectedItem(null);
    }, [selectedId, layout]);

    if (!selectedItem) {
        return (
            <div className="w-64 bg-white border-l border-gray-200 p-4 h-full">
                <p className="text-sm text-gray-500 text-center mt-10">Select an item to edit properties</p>
            </div>
        );
    }

    return (
        <div className="w-64 bg-white border-l border-gray-200 p-4 h-full overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">Properties</h2>

            <div className="mb-4">
                <label className="text-xs font-semibold text-gray-500 uppercase">ID</label>
                <div className="font-mono text-sm">{selectedItem.item.id}</div>
            </div>

            <div className="mb-4">
                <label className="text-xs font-semibold text-gray-500 uppercase">Type</label>
                <div className="text-sm capitalize">{selectedItem.type}</div>
            </div>

            {selectedItem.type === 'column' && selectedItem.parentRow && (
                <>
                    <div className="mb-6">
                        <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Width (%)</label>
                        <input
                            type="number"
                            min="5"
                            max="100"
                            value={(selectedItem.item as LayoutColumn).width}
                            onChange={(e) => updateColumnWidth(selectedItem.parentRow!.id, selectedItem.item.id, parseInt(e.target.value))}
                            className="w-full border border-gray-300 rounded p-2 text-sm"
                        />
                    </div>
                    <div className="mb-6">
                        <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Component</label>
                        <div className="p-2 bg-gray-50 rounded border border-gray-200 text-sm">
                            {(selectedItem.item as LayoutColumn).componentId || "None"}
                        </div>
                    </div>

                    <button
                        onClick={() => removeColumn(selectedItem.parentRow!.id, selectedItem.item.id)}
                        className="w-full py-2 bg-red-50 text-red-600 rounded  hover:bg-red-100 text-sm"
                    >
                        Delete Column
                    </button>
                </>
            )}

            {selectedItem.type === 'row' && (
                <button
                    onClick={() => removeRow(selectedItem.item.id)}
                    className="w-full py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm"
                >
                    Delete Row
                </button>
            )}

        </div>
    );
};
