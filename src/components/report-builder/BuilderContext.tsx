
import React, { createContext, useContext, useState, useEffect } from 'react';
import { LayoutConfig, LayoutRow, LayoutColumn } from '../reports/types';
import { toast } from "react-hot-toast";
import { showSuccessMessage } from "@/lib/successMessage";

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

interface BuilderContextType {
    layout: LayoutConfig;
    selectedId: string | null; // Can be row ID or column ID
    selectItem: (id: string | null) => void;

    // Actions
    addRow: () => void;
    removeRow: (rowId: string) => void;
    addColumn: (rowId: string) => void;
    removeColumn: (rowId: string, colId: string) => void;
    updateColumnWidth: (rowId: string, colId: string, width: number) => void;
    setComponent: (rowId: string, colId: string, componentId: string | null) => void;
    moveRow: (dragIndex: number, hoverIndex: number) => void;
    saveLayout: () => void;

    isDragEnabled: boolean;
    setDragEnabled: (enabled: boolean) => void;
}

const BuilderContext = createContext<BuilderContextType | undefined>(undefined);

export const useBuilder = () => {
    const context = useContext(BuilderContext);
    if (!context) {
        throw new Error('useBuilder must be used within a BuilderProvider');
    }
    return context;
};

// ----------------------------------------------------------------------
// Utils
// ----------------------------------------------------------------------

const generateId = () => Math.random().toString(36).substr(2, 9);

const INITIAL_LAYOUT: LayoutConfig = {
    rows: [
        {
            id: 'header_row',
            columns: [
                { id: 'c1', width: 20, componentId: 'SchoolLogo' },
                { id: 'c2', width: 80, componentId: 'SchoolHeader' },
            ],
        },
        {
            id: 'term_row',
            columns: [{ id: 'c3', width: 100, componentId: 'TermInfo' }]
        },
        {
            id: 'personal_row',
            columns: [
                { id: 'c4', width: 40, componentId: 'StudentProfile' },
                { id: 'c5', width: 20, componentId: 'StudentPhoto' },
                { id: 'c6', width: 40, componentId: 'Attendance' }
            ]
        },
        {
            id: 'score_row',
            columns: [{ id: 'c7', width: 100, componentId: 'ScoreSummary' }]
        },
        {
            id: 'academic_row',
            columns: [{ id: 'c8', width: 100, componentId: 'AcademicTable' }]
        },
        {
            id: 'traits_row',
            columns: [
                { id: 'c9', width: 50, componentId: 'AffectiveTraits' },
                { id: 'c10', width: 50, componentId: 'Psychomotor' }
            ]
        },
        {
            id: 'keys_row',
            columns: [
                { id: 'c11', width: 50, componentId: 'BehaviourKey' },
                { id: 'c12', width: 50, componentId: 'GradeKey' }
            ]
        },
        {
            id: 'comments_row',
            columns: [{ id: 'c13', width: 100, componentId: 'Comments' }]
        }
    ],
};

// ----------------------------------------------------------------------
// Provider
// ----------------------------------------------------------------------

export const BuilderProvider: React.FC<{ children: React.ReactNode; initialLayout?: LayoutConfig }> = ({ children, initialLayout }) => {
    const [layout, setLayout] = useState<LayoutConfig>(initialLayout || INITIAL_LAYOUT);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isDragEnabled, setDragEnabled] = useState(true);
    const [fullConfig, setFullConfig] = useState<any>(null);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch('/api/settings/report-card');
                const data = await res.json();
                if (data && data.displayOptions?.customLayout) {
                    setLayout(data.displayOptions.customLayout);
                }
                setFullConfig(data);
            } catch (error) {
                console.error("Failed to fetch config:", error);
            }
        };
        fetchConfig();
    }, []);

    const selectItem = (id: string | null) => {
        setSelectedId(id);
    };

    const addRow = () => {
        const newRow: LayoutRow = {
            id: `row_${generateId()}`,
            columns: [{ id: `col_${generateId()}`, width: 100, componentId: null }],
        };
        setLayout((prev) => ({
            ...prev,
            rows: [...prev.rows, newRow],
        }));
    };

    const removeRow = (rowId: string) => {
        setLayout((prev) => ({
            ...prev,
            rows: prev.rows.filter((r) => r.id !== rowId),
        }));
    };

    const addColumn = (rowId: string) => {
        setLayout((prev) => {
            const rowIndex = prev.rows.findIndex((r) => r.id === rowId);
            if (rowIndex === -1) return prev;

            const row = prev.rows[rowIndex];
            const newColId = `col_${generateId()}`;
            const currentCols = row.columns.length;
            const newColsCount = currentCols + 1;
            const newWidth = Math.floor(100 / newColsCount);

            // Redistribute widths roughly equally
            const updatedCols = row.columns.map((c) => ({ ...c, width: newWidth }));
            // Add new column
            updatedCols.push({ id: newColId, width: 100 - (newWidth * currentCols), componentId: null });

            const updatedRows = [...prev.rows];
            updatedRows[rowIndex] = { ...row, columns: updatedCols };

            return { ...prev, rows: updatedRows };
        });
    };

    const removeColumn = (rowId: string, colId: string) => {
        setLayout((prev) => {
            const rowIndex = prev.rows.findIndex((r) => r.id === rowId);
            if (rowIndex === -1) return prev;

            const row = prev.rows[rowIndex];
            if (row.columns.length <= 1) return prev; // Must have at least one column

            const updatedCols = row.columns.filter(c => c.id !== colId);
            // Redistribute width of removed column to the last remaining column
            const lastCol = updatedCols[updatedCols.length - 1];
            lastCol.width += row.columns.find(c => c.id === colId)?.width || 0;

            const updatedRows = [...prev.rows];
            updatedRows[rowIndex] = { ...row, columns: updatedCols };

            return { ...prev, rows: updatedRows };
        });
    };

    const updateColumnWidth = (rowId: string, colId: string, width: number) => {
        // Complex logic needed here to adjust neighbors, for now simplified
        setLayout((prev) => {
            const rowIndex = prev.rows.findIndex((r) => r.id === rowId);
            if (rowIndex === -1) return prev;

            const row = prev.rows[rowIndex];
            const updatedCols = row.columns.map(c => c.id === colId ? { ...c, width } : c);

            const updatedRows = [...prev.rows];
            updatedRows[rowIndex] = { ...row, columns: updatedCols };

            return { ...prev, rows: updatedRows };
        });
    };

    const setComponent = (rowId: string, colId: string, componentId: string | null) => {
        console.log("Setting component:", { rowId, colId, componentId });
        setLayout((prev) => {
            const rowIndex = prev.rows.findIndex((r) => r.id === rowId);
            if (rowIndex === -1) return prev;

            const row = prev.rows[rowIndex];
            const updatedCols = row.columns.map(c => c.id === colId ? { ...c, componentId } : c);

            const updatedRows = [...prev.rows];
            updatedRows[rowIndex] = { ...row, columns: updatedCols };

            return { ...prev, rows: updatedRows };
        });
    };

    const moveRow = (dragIndex: number, hoverIndex: number) => {
        setLayout((prev) => {
            const updatedRows = [...prev.rows];
            const [removed] = updatedRows.splice(dragIndex, 1);
            updatedRows.splice(hoverIndex, 0, removed);
            return { ...prev, rows: updatedRows };
        });
    };

    const saveLayout = async () => {
        try {
            console.log("Saving Layout:", JSON.stringify(layout, null, 2));

            const configToSave = {
                ...fullConfig,
                displayOptions: {
                    ...(fullConfig?.displayOptions || {}),
                    customLayout: layout
                }
            };

            const res = await fetch('/api/settings/report-card', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(configToSave)
            });

            if (res.ok) {
                showSuccessMessage("Layout saved successfully!", { title: "Layout Saved!" });
            } else {
                throw new Error("Failed to save");
            }
        } catch (error) {
            console.error("Error saving layout:", error);
            toast.error("Failed to save layout.");
        }
    };

    return (
        <BuilderContext.Provider
            value={{
                layout,
                selectedId,
                selectItem,
                addRow,
                removeRow,
                addColumn,
                removeColumn,
                updateColumnWidth,
                setComponent,
                moveRow,
                saveLayout,
                isDragEnabled,
                setDragEnabled
            }}
        >
            {children}
        </BuilderContext.Provider>
    );
};
