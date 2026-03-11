
import React from "react";
import { Trait } from "../../types";
import { AffectiveTraitsWeb } from "./AffectiveTraitsWeb";

interface PsychomotorWebProps {
    skills: Trait[];
    displayOptions?: any;
    sectionStyle?: any;
}

export const PsychomotorWeb: React.FC<PsychomotorWebProps> = ({ skills, displayOptions = {}, sectionStyle = {} }) => {
    // Skills use showSkill[Name] instead of showTrait[Name]
    // We rewrite displayOptions slightly for the generic component
    const mappedOptions = { ...displayOptions };
    skills.forEach(s => {
        const skillKey = s.name.replace(/\s+/g, '');
        if (displayOptions[`showSkill${skillKey}`] !== undefined) {
            mappedOptions[`showTrait${skillKey}`] = displayOptions[`showSkill${skillKey}`];
        }
    });

    return <AffectiveTraitsWeb traits={skills} displayOptions={mappedOptions} sectionStyle={sectionStyle} title="PSYCHOMOTOR SKILLS" />;
};
