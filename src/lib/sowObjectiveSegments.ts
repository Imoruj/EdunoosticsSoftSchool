export type ObjectiveSection = "objectives" | "waecObjectives" | "jambObjectives" | "igcseObjectives";

export interface ObjectiveItem {
    id: string;
    text: string;
    keywords: string[];
}

export interface ObjectiveSegments {
    objectives: ObjectiveItem[];
    waecObjectives: ObjectiveItem[];
    jambObjectives: ObjectiveItem[];
    igcseObjectives: ObjectiveItem[];
}

type ObjectiveValue = string | string[] | null | undefined;

interface ObjectivePayloadInput {
    objectives?: ObjectiveValue;
    waecObjectives?: ObjectiveValue;
    jambObjectives?: ObjectiveValue;
    igcseObjectives?: ObjectiveValue;
}

interface NormalizeObjectiveSectionResult {
    text: string;
    items: ObjectiveItem[];
}

export interface NormalizedObjectivePayload {
    objectives: string;
    waecObjectives: string;
    jambObjectives: string;
    igcseObjectives: string;
    objectiveSegments: ObjectiveSegments;
}

const SECTION_ORDER: ObjectiveSection[] = ["objectives", "waecObjectives", "jambObjectives", "igcseObjectives"];

const SECTION_PREFIXES: Record<ObjectiveSection, string> = {
    objectives: "general",
    waecObjectives: "waec",
    jambObjectives: "jamb",
    igcseObjectives: "igcse",
};

const STOP_WORDS = new Set([
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how", "in", "into", "is",
    "it", "of", "on", "or", "that", "the", "their", "this", "to", "under", "with", "why", "will",
    "students", "student", "learners", "lesson", "week", "topic", "content", "objective",
    "objectives", "exam", "focus", "understand", "know", "identify", "explain", "discuss",
]);

function normalizeLineBreaks(value: string) {
    return value.replace(/\r\n?/g, "\n");
}

function stripSegmentLabel(value: string) {
    return value.replace(
        /^(?:general(?: week)? objectives?|waec(?: exam content)?|jamb(?:\s*\/\s*utme)?(?: content| objectives?)?|cambridge igcse(?: content| objectives?)?|igcse(?: content| objectives?)?)\s*:\s*/i,
        ""
    );
}

function splitInlineLists(value: string) {
    return value
        .replace(/\s+(?=\d+[\)\.:-]\s+)/g, "\n")
        .replace(/\s*(?:;|\u2022)\s*/g, "\n");
}

function cleanItem(value: string) {
    return stripSegmentLabel(value)
        .replace(/^\s*(?:[-*]+|\d+[\)\.:-])\s*/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function toLines(value: ObjectiveValue): string[] {
    if (!value) return [];

    const rawItems = Array.isArray(value)
        ? value.flatMap((entry) => normalizeLineBreaks(String(entry)).split("\n"))
        : splitInlineLists(normalizeLineBreaks(String(value))).split("\n");

    const uniqueItems = new Set<string>();
    const lines: string[] = [];

    for (const rawItem of rawItems) {
        const item = cleanItem(rawItem);
        if (!item) continue;

        const itemKey = item.toLowerCase();
        if (uniqueItems.has(itemKey)) continue;
        uniqueItems.add(itemKey);
        lines.push(item);
    }

    return lines;
}

function extractKeywords(text: string) {
    const uniqueKeywords = new Set<string>();
    const words = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter(Boolean);

    for (const word of words) {
        if (word.length < 3) continue;
        if (STOP_WORDS.has(word)) continue;
        uniqueKeywords.add(word);
    }

    return Array.from(uniqueKeywords).slice(0, 8);
}

export function normalizeObjectiveSection(section: ObjectiveSection, value: ObjectiveValue): NormalizeObjectiveSectionResult {
    const lines = toLines(value);
    const items = lines.map((line, index) => ({
        id: `${SECTION_PREFIXES[section]}-${index + 1}`,
        text: line,
        keywords: extractKeywords(line),
    }));

    return {
        text: items.map((item) => `- ${item.text}`).join("\n"),
        items,
    };
}

export function normalizeObjectivePayload(payload: ObjectivePayloadInput): NormalizedObjectivePayload {
    const normalizedSections = Object.fromEntries(
        SECTION_ORDER.map((section) => [section, normalizeObjectiveSection(section, payload[section])])
    ) as Record<ObjectiveSection, NormalizeObjectiveSectionResult>;

    return {
        objectives: normalizedSections.objectives.text,
        waecObjectives: normalizedSections.waecObjectives.text,
        jambObjectives: normalizedSections.jambObjectives.text,
        igcseObjectives: normalizedSections.igcseObjectives.text,
        objectiveSegments: {
            objectives: normalizedSections.objectives.items,
            waecObjectives: normalizedSections.waecObjectives.items,
            jambObjectives: normalizedSections.jambObjectives.items,
            igcseObjectives: normalizedSections.igcseObjectives.items,
        },
    };
}
