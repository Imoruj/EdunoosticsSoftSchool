
import React from "react";
import { Trait } from "../../types";

interface AffectiveTraitsWebProps {
    traits: Trait[];
    displayOptions?: any;
    sectionStyle?: any;
    title?: string;
}

export const AffectiveTraitsWeb: React.FC<AffectiveTraitsWebProps> = ({ traits, displayOptions = {}, sectionStyle = {}, title = "AFFECTIVE TRAITS" }) => {
    const showOption = (key: string) => displayOptions[key] !== false;

    const containerStyle = {
        borderWidth: sectionStyle.borderWidth || '2px',
        borderStyle: sectionStyle.borderStyle || 'solid',
        borderColor: sectionStyle.borderColor || '#14532d'
    };

    const headerStyle = {
        backgroundColor: sectionStyle.headerBg || '#f3f4f6',
        color: sectionStyle.headerText || '#1f2937',
        borderBottom: `${sectionStyle.borderWidth || '1px'} ${sectionStyle.borderStyle || 'solid'} ${sectionStyle.borderColor || '#14532d'}`
    };

    const borderStyle = {
        borderColor: sectionStyle.borderColor || '#14532d'
    };

    return (
        <div className="border-2 h-fit w-full" style={containerStyle}>
            <div className="p-1 text-center font-bold text-[10px] border-b" style={headerStyle}>{title}</div>
            <div className="grid grid-cols-[2fr_repeat(5,1fr)] bg-gray-50 border-b text-[9px] text-center font-bold" style={borderStyle}>
                <div className="p-1 border-r text-left" style={borderStyle}>TRAIT</div>
                <div className="p-1 border-r" style={borderStyle}>1</div>
                <div className="p-1 border-r" style={borderStyle}>2</div>
                <div className="p-1 border-r" style={borderStyle}>3</div>
                <div className="p-1 border-r" style={borderStyle}>4</div>
                <div className="p-1">5</div>
            </div>
            {traits.map((trait, i) => {
                const traitKey = trait.name.replace(/\s+/g, '');
                if (showOption(`showTrait${traitKey}`) === false) return null;
                return (
                    <div key={i} className="grid grid-cols-[2fr_repeat(5,1fr)] border-b last:border-b-0 text-[9px] items-center" style={borderStyle}>
                        <div className="p-1 border-r bg-gray-50 font-medium" style={borderStyle}>{trait.name}</div>
                        {[1, 2, 3, 4, 5].map(n => (
                            <div key={n} className="p-1 border-r text-center h-full flex items-center justify-center font-bold" style={{ ...borderStyle, color: borderStyle.borderColor }}>
                                {trait.rating === n ? '✓' : ''}
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
    );
};
