"use client";

import React from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useSensor, useSensors, PointerSensor, MouseSensor, TouchSensor, closestCenter, pointerWithin } from '@dnd-kit/core';
import { BuilderProvider, useBuilder } from './BuilderContext';
import { Toolbox } from './Toolbox';
import { Canvas } from './Canvas';
import { createPortal } from 'react-dom';
import { PropertiesPanel } from './PropertiesPanel';
import { GripVertical } from 'lucide-react';

const BuilderContent: React.FC = () => {
    const { layout, setComponent, moveRow, saveLayout, isDragEnabled, setDragEnabled } = useBuilder();
    const [activeId, setActiveId] = React.useState<string | null>(null);
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        // Dropping a Component from Toolbox to a Column
        if (active.data.current?.type === 'component' && over.data.current?.type === 'column') {
            const componentId = active.data.current.componentId;
            const { rowId, colId } = over.data.current;
            console.log(`Dropping component ${componentId} to row ${rowId}, col ${colId}`);
            setComponent(rowId, colId, componentId);
            return;
        }

        // Reordering Rows
        if (active.data.current?.type === 'row' && over.data.current?.type === 'row') {
            const activeId = active.id;
            const overId = over.id;

            if (activeId !== overId) {
                const oldIndex = layout.rows.findIndex((r: any) => r.id === activeId);
                const newIndex = layout.rows.findIndex((r: any) => r.id === overId);

                if (oldIndex !== -1 && newIndex !== -1) {
                    console.log(`🔄 Reordering row from ${oldIndex} to ${newIndex}`);
                    moveRow(oldIndex, newIndex);
                }
            }
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex flex-col h-screen overflow-hidden">
                <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
                    <h1 className="font-bold text-lg">Report Card Builder</h1>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 mr-4 border-r pr-4 border-gray-200">
                            <span className="text-sm font-medium text-gray-700">Edit Mode</span>
                            <button
                                onClick={() => setDragEnabled(!isDragEnabled)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isDragEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDragEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                                />
                            </button>
                        </div>
                        <button className="px-3 py-1 text-sm border rounded bg-white hover:bg-gray-50">Preview</button>
                        <button onClick={saveLayout} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Save Layout</button>
                    </div>
                </header>
                <div className="flex flex-1 overflow-hidden">
                    <Toolbox />
                    <Canvas />
                    <PropertiesPanel />
                </div>
            </div>
            {isMounted && createPortal(
                <DragOverlay>
                    {activeId ? (
                        <div className="p-3 bg-white shadow-xl border-2 rounded border-blue-500 opacity-90 w-48 font-bold text-blue-600 flex items-center gap-2">
                            <GripVertical size={16} />
                            {activeId.replace('toolbox-', '')}
                        </div>
                    ) : null}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    );
};

export const Builder: React.FC = () => {
    return (
        <BuilderProvider>
            <BuilderContent />
        </BuilderProvider>
    );
};
