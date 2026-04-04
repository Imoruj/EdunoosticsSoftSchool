"use client";

import React from "react";

export interface Annotation {
    x: number; // Percentage from left (0-100)
    y: number; // Percentage from top (0-100)
    label: string;
    description: string;
}

interface AnnotatedVisualProps {
    src: string;
    alt: string;
    caption: string;
    annotations?: Annotation[];
}

export const AnnotatedVisual = ({ src, alt, caption, annotations = [] }: AnnotatedVisualProps) => {
    return (
        <div className="my-12 group">
            <div className="relative overflow-hidden rounded-2xl border border-gray-200 shadow-xl transition-all duration-300 group-hover:shadow-2xl bg-white">
                <img 
                    src={src} 
                    alt={alt} 
                    className="w-full h-auto block" 
                />
                
                {/* Annotations Layer */}
                <div className="absolute inset-0 pointer-events-none">
                    {annotations.map((ann, idx) => (
                        <div 
                            key={idx}
                            className="absolute pointer-events-auto group/ann"
                            style={{ left: `${ann.x}%`, top: `${ann.y}%` }}
                        >
                            {/* Pulse Effect */}
                            <div className="absolute -inset-2 bg-primary-500/30 rounded-full animate-ping" />
                            
                            {/* Marker */}
                            <div className="relative w-6 h-6 bg-primary-600 border-2 border-white rounded-full shadow-lg flex items-center justify-center text-[10px] font-bold text-white cursor-help">
                                {idx + 1}
                            </div>

                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 p-3 bg-gray-900 text-white rounded-xl shadow-2xl opacity-0 translate-y-2 group-hover/ann:opacity-100 group-hover/ann:translate-y-0 transition-all duration-200 z-50">
                                <div className="text-xs font-bold text-primary-400 mb-1">
                                    {ann.label}
                                </div>
                                <div className="text-[10px] leading-tight text-gray-300">
                                    {ann.description}
                                </div>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900" />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-2xl" />
            </div>

            <div className="mt-6 flex flex-col items-center">
                <p className="text-sm text-gray-500 font-medium italic">
                    {caption}
                </p>
                {annotations.length > 0 && (
                    <div className="mt-4 flex flex-wrap justify-center gap-4">
                        {annotations.map((ann, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs text-gray-500 max-w-[200px]">
                                <span className="w-5 h-5 shrink-0 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-900 border border-gray-200">
                                    {idx + 1}
                                </span>
                                <div>
                                    <span className="font-bold text-gray-700 block">{ann.label}:</span>
                                    {ann.description}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
