
import React from 'react';
import { useBuilder } from './BuilderContext';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, GripVertical, Plus, Columns } from 'lucide-react';
import { WEB_COMPONENT_REGISTRY } from '../reports/blocks/web/WebBlockRegistry';
import { MOCK_REPORT_DATA } from './MockData';

export const Canvas: React.FC = () => {
    const { layout, addRow, isDragEnabled } = useBuilder();

    return (
        <div className="flex-1 bg-gray-100 p-8 h-full overflow-y-auto">
            <div className="max-w-[210mm] mx-auto bg-white min-h-[297mm] shadow-lg p-8 flex flex-col gap-2 relative">
                <SortableContext items={layout.rows.map(r => r.id)} strategy={verticalListSortingStrategy}>
                    {layout.rows.map((row) => (
                        <SortableRow key={row.id} row={row} />
                    ))}
                </SortableContext>

                {isDragEnabled && (
                    <button
                        onClick={addRow}
                        className="mt-4 w-full py-3 border-2 border-dashed border-gray-300 rounded text-gray-500 hover:border-blue-500 hover:text-blue-500 flex items-center justify-center gap-2"
                    >
                        <Plus size={20} /> Add New Row
                    </button>
                )}
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// Sub-components (Row & Col)
// ----------------------------------------------------------------------

import { LayoutRow, LayoutColumn } from '../reports/templates/DynamicReportTemplate';

const SortableRow: React.FC<{ row: LayoutRow }> = ({ row }) => {
    const { isDragEnabled, removeRow, addColumn, moveRow } = useBuilder();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({
        id: row.id,
        data: { type: 'row', rowId: row.id },
        disabled: !isDragEnabled
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="group relative border border-gray-200 hover:border-blue-300 rounded p-1 bg-white"
        >
            {/* Row Controls */}
            {isDragEnabled && (
                <div className="absolute -left-10 top-2 flex flex-col gap-1 opacity-100 group-hover:opacity-100 transition-opacity">
                    <button {...listeners} {...attributes} className="p-1.5 bg-gray-200 rounded text-gray-600 hover:bg-gray-300 cursor-move">
                        <GripVertical size={14} />
                    </button>
                    <button onClick={() => removeRow(row.id)} className="p-1.5 bg-red-100 rounded text-red-500 hover:bg-red-200">
                        <Trash2 size={14} />
                    </button>
                    <button onClick={() => addColumn(row.id)} className="p-1.5 bg-blue-100 rounded text-blue-500 hover:bg-blue-200" title="Split into Columns">
                        <Columns size={14} />
                    </button>
                </div>
            )}

            {/* Columns Container */}
            <div className="flex w-full min-h-[60px]">
                {row.columns.map((col, idx) => (
                    <CanvasColumn key={col.id} column={col} rowId={row.id} isLast={idx === row.columns.length - 1} />
                ))}
            </div>
        </div>
    );
};

const CanvasColumn: React.FC<{ column: LayoutColumn; rowId: string; isLast: boolean }> = ({ column, rowId, isLast }) => {
    const { isDragEnabled, updateColumnWidth, setComponent, selectItem, selectedId } = useBuilder();
    const { setNodeRef, isOver } = useDroppable({
        id: column.id,
        data: { type: 'column', rowId, colId: column.id },
        disabled: !isDragEnabled
    });

    const isSelected = selectedId === column.id;

    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.pageX;
        const startWidth = column.width;
        const parentElement = e.currentTarget.parentElement;
        if (!parentElement) return;
        const parentWidth = parentElement.offsetWidth;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.pageX - startX;
            const deltaPercent = (deltaX / parentWidth) * 100;
            const newWidth = Math.max(5, Math.min(100, Math.round(startWidth + deltaPercent)));
            updateColumnWidth(rowId, column.id, newWidth);
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    return (
        <div
            ref={setNodeRef}
            className={`relative min-h-[60px] flex items-center justify-center border-r border-dashed border-gray-200 last:border-r-0 transition-all ${isOver ? 'bg-blue-100 ring-2 ring-blue-400 z-10' : ''} ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50 z-20' : ''}`}
            style={{ width: `${column.width}%` }}
            onClick={(e) => { e.stopPropagation(); selectItem(column.id); }}
        >
            {column.componentId ? (
                <div className="w-full h-full p-1 flex items-center justify-center relative group">
                    <div className="w-full h-full pointer-events-none">
                        {renderComponent(column.componentId)}
                    </div>
                    {isDragEnabled && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setComponent(rowId, column.id, null); }}
                            className="absolute top-1 right-1 p-1 bg-white shadow-sm border rounded-full text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-50"
                        >
                            <Trash2 size={12} />
                        </button>
                    )}
                </div>
            ) : (
                <div className="w-full h-full p-2 flex items-center justify-center text-xs text-gray-400 pointer-events-none italic">
                    {isDragEnabled ? 'Drop Here' : ''}
                </div>
            )}

            {/* Resize Handle */}
            {!isLast && isDragEnabled && (
                <div
                    onMouseDown={handleResizeStart}
                    className="absolute top-0 -right-1 w-2 h-full cursor-col-resize hover:bg-blue-400 z-30 transition-colors"
                />
            )}
        </div>
    );
};

// Helper for rendering web components
const renderComponent = (componentId: string) => {
    const Component = WEB_COMPONENT_REGISTRY[componentId];
    if (!Component) return <div className="text-red-500 text-[10px]">Error: {componentId}</div>;

    const props = getComponentProps(componentId);
    return <Component {...props} />;
};

const getComponentProps = (componentId: string) => {
    const data = MOCK_REPORT_DATA;
    const displayOptions = data.config?.displayOptions || {};
    const baseProps = { displayOptions, sectionStyle: {} };
    switch (componentId) {
        case "SchoolLogo": return { ...baseProps, school: data.school };
        case "SchoolHeader": return { ...baseProps, school: data.school };
        case "TermInfo": return { ...baseProps, term: data.term };
        case "StudentProfile": return { ...baseProps, student: data.student };
        case "StudentPhoto": return { ...baseProps, student: data.student };
        case "Attendance": return { ...baseProps, attendance: data.attendance };
        case "ScoreSummary": return { ...baseProps, academic: data.academic };
        case "AcademicTable": return { ...baseProps, academic: data.academic };
        case "AffectiveTraits": return { ...baseProps, traits: data.affective };
        case "Psychomotor": return { ...baseProps, skills: data.psychomotor };
        case "BehaviourKey": return { ...baseProps };
        case "GradeKey": return { ...baseProps };
        case "Comments": return { ...baseProps, comments: data.comments, school: data.school };
        default: return baseProps;
    }
};
