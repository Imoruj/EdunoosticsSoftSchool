"use client";

import React from 'react';
import { Builder } from '@/components/report-builder/Builder';

export default function ReportBuilderPage() {
    return (
        <div className="h-[calc(100vh-theme(spacing.16))] -m-4 sm:-m-6 lg:-m-8">
            <Builder />
        </div>
    );
};
