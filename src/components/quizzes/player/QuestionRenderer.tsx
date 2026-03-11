"use client";

import type { QuizQuestion, MCQData, TrueFalseData, FillBlankData, DragDropData, ShortAnswerData, LongAnswerData } from "@/lib/db/types";
import { useState, useEffect } from "react";

interface QuestionRendererProps {
    question: QuizQuestion;
    value: any;
    onChange: (value: any) => void;
    disabled?: boolean;
}

export function QuestionRenderer({ question, value, onChange, disabled = false }: QuestionRendererProps) {
    return (
        <div className="space-y-6">
            <div className="prose max-w-none text-gray-800">
                <h3 className="text-lg font-medium">{question.questionText}</h3>
                {question.imageUrl && (
                    <img src={question.imageUrl} alt="Question" className="mt-4 max-h-64 object-contain rounded-lg border border-gray-200" />
                )}
            </div>

            <div className="mt-6">
                <QuestionInput
                    question={question}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                />
            </div>
        </div>
    );
}

function QuestionInput({ question, value, onChange, disabled }: QuestionRendererProps) {
    const [selectedDragItem, setSelectedDragItem] = useState<string | null>(null);

    useEffect(() => {
        setSelectedDragItem(null);
    }, [question.id]);

    switch (question.type) {
        case "multiple_choice": {
            const data = question.data as MCQData;
            const selectedIds = Array.isArray(value) ? value : (value ? [value] : []);

            const toggleOption = (id: string) => {
                if (disabled) return;
                if (data.multipleCorrect) {
                    if (selectedIds.includes(id)) {
                        onChange(selectedIds.filter(i => i !== id));
                    } else {
                        onChange([...selectedIds, id]);
                    }
                } else {
                    onChange(id);
                }
            };

            return (
                <div className="space-y-3">
                    {data.options.map((option) => {
                        const isSelected = selectedIds.includes(option.id);
                        return (
                            <div
                                key={option.id}
                                onClick={() => toggleOption(option.id)}
                                className={`
                  relative flex items-center p-4 cursor-pointer rounded-xl border-2 transition-all
                  ${disabled ? 'opacity-80 cursor-default' : 'hover:border-blue-300'}
                  ${isSelected ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 bg-white'}
                `}
                            >
                                <div className="flex h-5 items-center">
                                    <input
                                        type={data.multipleCorrect ? "checkbox" : "radio"}
                                        checked={isSelected}
                                        onChange={() => { }} // Handled by div click
                                        disabled={disabled}
                                        className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 ${data.multipleCorrect ? 'rounded' : 'rounded-full'}`}
                                    />
                                </div>
                                <div className="ml-3 flex flex-col gap-2 w-full">
                                    <span className={`block text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                                        {option.text}
                                    </span>
                                    {option.imageUrl && (
                                        <img src={option.imageUrl} alt={option.text} className="max-h-32 object-contain rounded-lg border border-gray-100" />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        }

        case "true_false": {
            return (
                <div className="grid grid-cols-2 gap-4">
                    {[true, false].map((opt) => {
                        const isSelected = value === opt;
                        return (
                            <button
                                key={opt.toString()}
                                type="button"
                                disabled={disabled}
                                onClick={() => onChange(opt)}
                                className={`
                  p-4 text-center rounded-xl border-2 transition-all font-medium text-lg
                  ${disabled ? 'opacity-80 cursor-default' : 'hover:border-blue-300'}
                  ${isSelected ? 'border-blue-500 bg-blue-50/50 text-blue-700' : 'border-gray-200 bg-white text-gray-700'}
                `}
                            >
                                {opt ? "True" : "False"}
                            </button>
                        )
                    })}
                </div>
            );
        }

        case "fill_blank": {
            const data = question.data as FillBlankData;
            const answers = (value as Record<string, string>) || {};

            // Parse template to render inputs instead of [blank]
            const parts = data.template.split('[blank]');

            return (
                <div className="p-6 bg-white border-2 border-gray-200 rounded-xl text-lg leading-relaxed text-gray-800">
                    {parts.map((part, index) => {
                        const isLast = index === parts.length - 1;
                        const blankData = data.blanks[index];

                        return (
                            <span key={index}>
                                {part}
                                {!isLast && blankData && (
                                    <input
                                        type="text"
                                        disabled={disabled}
                                        value={answers[blankData.id] || ''}
                                        onChange={(e) => {
                                            onChange({ ...answers, [blankData.id]: e.target.value });
                                        }}
                                        className="mx-2 inline-block w-32 border-b-2 border-gray-400 focus:border-blue-500 focus:outline-none bg-transparent text-center px-2 py-1 text-blue-700 font-medium disabled:opacity-80 disabled:bg-gray-50"
                                    />
                                )}
                            </span>
                        );
                    })}
                </div>
            );
        }

        case "drag_drop": {
            const data = question.data as DragDropData;
            const matches = (value as Record<string, string>) || {}; // itemId -> zoneId

            // We'll build a simple click-to-select matching UI instead of native drag-drop for now 
            // (as dnd-kit requires heavy context setup that is overkill here)
            const handleZoneClick = (zoneId: string) => {
                if (disabled || !selectedDragItem) return;

                const newMatches = { ...matches };
                // If an item is already in this zone and multiple not allowed, remove existing item from zone
                const zoneSettings = data.zones.find(z => z.id === zoneId);
                if (zoneSettings && !zoneSettings.acceptMultiple) {
                    Object.entries(newMatches).forEach(([iId, zId]) => {
                        if (zId === zoneId) delete newMatches[iId];
                    });
                }

                newMatches[selectedDragItem] = zoneId;
                onChange(newMatches);
                setSelectedDragItem(null);
            };

            const unassignedItems = data.items.filter(item => !matches[item.id]);

            return (
                <div className="space-y-8">
                    {/* Drop Zones container */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {data.zones.map((zone) => {
                            const itemsInZone = data.items.filter(item => matches[item.id] === zone.id);

                            return (
                                <div
                                    key={zone.id}
                                    onClick={() => handleZoneClick(zone.id)}
                                    className={`
                    p-4 rounded-xl border-2 min-h-[120px] transition-colors
                    ${selectedDragItem && !disabled ? 'border-dashed border-blue-400 bg-blue-50/30 cursor-pointer' : 'border-gray-200 bg-gray-50'}
                  `}
                                >
                                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">{zone.label}</h4>

                                    <div className="flex flex-col gap-2">
                                        {itemsInZone.map(item => (
                                            <div
                                                key={item.id}
                                                className="bg-white p-3 rounded-lg border shadow-sm flex justify-between items-center"
                                            >
                                                <span className="font-medium text-gray-800">{item.content}</span>
                                                {!disabled && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const newMatches = { ...matches };
                                                            delete newMatches[item.id];
                                                            onChange(newMatches);
                                                        }}
                                                        className="text-gray-400 hover:text-red-500"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        {itemsInZone.length === 0 && !selectedDragItem && (
                                            <p className="text-sm text-gray-400 italic text-center py-4">Drag items here</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Draggable Items Bank */}
                    <div className="p-4 bg-white border border-gray-200 shadow-sm rounded-xl">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Items Bank</h4>
                        <div className="flex flex-wrap gap-3">
                            {unassignedItems.map(item => (
                                <button
                                    key={item.id}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => setSelectedDragItem(selectedDragItem === item.id ? null : item.id)}
                                    className={`
                    px-4 py-2 rounded-lg border font-medium transition-all shadow-sm
                    ${disabled ? 'opacity-50 cursor-default bg-gray-50 border-gray-200' :
                                            selectedDragItem === item.id ? 'bg-blue-600 text-white border-blue-600 scale-105 shadow-md' : 'bg-white text-gray-800 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                        }
                  `}
                                >
                                    {item.content}
                                </button>
                            ))}
                            {unassignedItems.length === 0 && (
                                <p className="text-sm text-gray-400 italic w-full text-center">All items assigned</p>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        case "short_answer": {
            const data = question.data as ShortAnswerData;
            return (
                <textarea
                    disabled={disabled}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    maxLength={data.maxLength || 200}
                    placeholder="Type your answer here..."
                    rows={3}
                    className="w-full rounded-xl border-2 border-gray-200 p-4 text-gray-900 focus:border-blue-500 focus:ring-0 disabled:opacity-80 disabled:bg-gray-50"
                />
            );
        }

        case "long_answer": {
            const data = question.data as LongAnswerData;
            return (
                <div className="space-y-2">
                    <textarea
                        disabled={disabled}
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        maxLength={data.maxLength || 5000}
                        placeholder="Type your detailed answer here..."
                        rows={8}
                        className="w-full rounded-xl border-2 border-gray-200 p-4 text-gray-900 focus:border-blue-500 focus:ring-0 disabled:opacity-80 disabled:bg-gray-50"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                        <span>Minimum length: {data.minLength || 0} characters</span>
                        <span>{String(value || '').length} / {data.maxLength || 5000}</span>
                    </div>
                </div>
            );
        }

        default:
            return <div className="p-4 bg-red-50 text-red-600 rounded-lg">Unsupported question type</div>;
    }
}
