
import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useBuilder } from './BuilderContext';

// Component IDs must match those handled in DynamicReportTemplate
const BLOCKS = [
    { id: 'SchoolLogo', label: 'School Logo' },
    { id: 'SchoolHeader', label: 'School Header' },
    { id: 'TermInfo', label: 'Term Header' },
    { id: 'StudentProfile', label: 'Student Profile' },
    { id: 'StudentPhoto', label: 'Student Photo' },
    { id: 'Attendance', label: 'Attendance Table' },
    { id: 'ScoreSummary', label: 'Score Summary' },
    { id: 'AcademicTable', label: 'Academic Grades' },
    { id: 'AffectiveTraits', label: 'Affective Traits' },
    { id: 'Psychomotor', label: 'Psychomotor Skills' },
    { id: 'BehaviourKey', label: 'Behaviour Key' },
    { id: 'GradeKey', label: 'Grade Key' },
    { id: 'Comments', label: 'Comments / Signatures' },
];

export const Toolbox: React.FC = () => {
    return (
        <div className="w-64 bg-white border-r border-gray-200 p-4 h-full overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">Components</h2>
            <div className="grid grid-cols-1 gap-2">
                {BLOCKS.map((block) => (
                    <DraggableBlock key={block.id} id={block.id} label={block.label} />
                ))}
            </div>
        </div>
    );
};

import { GripVertical } from 'lucide-react';

interface DraggableBlockProps {
    id: string;
    label: string;
}

const DraggableBlock: React.FC<DraggableBlockProps> = ({ id, label }) => {
    const { isDragEnabled } = useBuilder();
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `toolbox-${id}`,
        data: {
            type: 'component',
            componentId: id,
        },
        disabled: !isDragEnabled,
    });

    return (
        <div
            ref={setNodeRef}
            {...(isDragEnabled ? listeners : {})}
            {...(isDragEnabled ? attributes : {})}
            className={`p-3 bg-white border border-gray-200 rounded text-sm font-medium flex items-center gap-2 transition-all ${isDragEnabled ? 'cursor-grab hover:bg-gray-50 shadow-sm' : 'cursor-not-allowed opacity-50 bg-gray-50'} ${isDragging ? 'opacity-30' : 'opacity-100'}`}
        >
            <GripVertical size={14} className={isDragEnabled ? 'text-gray-400' : 'text-gray-300'} />
            {label}
        </div>
    );
};
