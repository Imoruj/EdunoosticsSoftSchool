function cleanJsonCandidate(value: string) {
    return value
        .trim()
        .replace(/^\uFEFF/, "")
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .replace(/^json\s*/i, "");
}

function repairJsonCandidate(value: string) {
    return cleanJsonCandidate(value)
        .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g, '$1"$2"$3')
        .replace(/,\s*([}\]])/g, "$1");
}

function collectBalancedJsonCandidates(raw: string) {
    const candidates = new Set<string>();

    for (let start = 0; start < raw.length; start++) {
        const opening = raw[start];
        if (opening !== "{" && opening !== "[") continue;

        const stack = [opening === "{" ? "}" : "]"];
        let inString = false;
        let escaped = false;

        for (let index = start + 1; index < raw.length; index++) {
            const char = raw[index];

            if (inString) {
                if (escaped) {
                    escaped = false;
                    continue;
                }
                if (char === "\\") {
                    escaped = true;
                    continue;
                }
                if (char === "\"") {
                    inString = false;
                }
                continue;
            }

            if (char === "\"") {
                inString = true;
                continue;
            }

            if (char === "{") {
                stack.push("}");
                continue;
            }

            if (char === "[") {
                stack.push("]");
                continue;
            }

            if ((char === "}" || char === "]") && char === stack[stack.length - 1]) {
                stack.pop();
                if (stack.length === 0) {
                    candidates.add(raw.slice(start, index + 1));
                    break;
                }
            }
        }
    }

    return Array.from(candidates);
}

function collectJsonCandidates(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return [];

    const candidates = new Set<string>([trimmed]);
    for (const match of trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) {
        const candidate = match[1]?.trim();
        if (candidate) candidates.add(candidate);
    }

    for (const candidate of collectBalancedJsonCandidates(trimmed)) {
        candidates.add(candidate);
    }

    return Array.from(candidates);
}

export function parseJsonFromModelOutput<T = unknown>(raw: string): T | null {
    for (const candidate of collectJsonCandidates(raw)) {
        for (const attempt of [cleanJsonCandidate(candidate), repairJsonCandidate(candidate)]) {
            if (!attempt) continue;
            try {
                return JSON.parse(attempt) as T;
            } catch {
                continue;
            }
        }
    }

    return null;
}

type ObjectiveSection = "objectives" | "waecObjectives" | "jambObjectives" | "igcseObjectives";

export interface ObjectivePayloadLike {
    objectives?: string[] | string;
    waecObjectives?: string[] | string;
    jambObjectives?: string[] | string;
    igcseObjectives?: string[] | string;
}

const OBJECTIVE_SECTION_ALIASES: Record<ObjectiveSection, string[]> = {
    objectives: [
        "general classroom learning objectives",
        "general week objectives",
        "general learning objectives",
        "classroom learning objectives",
        "learning objectives",
        "general objectives",
        "week objectives",
        "generalObjectives",
        "objectives",
    ],
    waecObjectives: [
        "waec ssce objectives",
        "waec exam content",
        "waec objectives",
        "waecObjectives",
        "waec ssce",
        "waec",
    ],
    jambObjectives: [
        "jamb / utme content",
        "jamb utme objectives",
        "jamb objectives",
        "jambObjectives",
        "jamb / utme",
        "jamb utme",
        "utme objectives",
        "utme content",
        "jamb/utme",
        "jamb",
        "utme",
    ],
    igcseObjectives: [
        "cambridge igcse objectives",
        "cambridge igcse content",
        "cambridge objectives",
        "igcse objectives",
        "igcseObjectives",
        "cambridge igcse",
        "cambridge",
        "igcse",
    ],
};

function normalizeObjectiveLine(value: string) {
    return value
        .replace(/^\s*(?:[-*•]+|\d+[\)\].:-])\s*/g, "")
        .replace(/^[\s"'`[{(]+/, "")
        .replace(/[\s"',`}\])]+$/g, "")
        .trim();
}

function detectObjectiveSection(line: string) {
    const plain = line
        .trim()
        .replace(/^[{[(,\s]+/, "")
        .replace(/^#+\s*/, "")
        .replace(/[*`"]/g, "")
        .trim();

    for (const [section, aliases] of Object.entries(OBJECTIVE_SECTION_ALIASES) as Array<[ObjectiveSection, string[]]>) {
        for (const alias of aliases.sort((a, b) => b.length - a.length)) {
            const headingPattern = new RegExp(`^${escapeRegExp(alias)}\\s*(?::|-)?\\s*(.*)$`, "i");
            const match = plain.match(headingPattern);
            if (!match) continue;

            const remainder = normalizeObjectiveLine(match[1] ?? "");
            return {
                section,
                remainder: remainder && !/^[\[{(]+$/.test(remainder) ? remainder : "",
            };
        }
    }

    return null;
}

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasAnyObjectiveContent(payload: ObjectivePayloadLike) {
    return Object.values(payload).some((value) => {
        if (Array.isArray(value)) return value.some((item) => String(item).trim());
        return typeof value === "string" && value.trim().length > 0;
    });
}

function mapObjectivePayloadRecord(record: Record<string, unknown>) {
    const result: ObjectivePayloadLike = {};

    for (const [section, aliases] of Object.entries(OBJECTIVE_SECTION_ALIASES) as Array<[ObjectiveSection, string[]]>) {
        const knownKeys = [section, ...aliases].map((value) => value.toLowerCase().replace(/[^a-z]/g, ""));

        for (const [rawKey, rawValue] of Object.entries(record)) {
            const normalizedKey = rawKey.toLowerCase().replace(/[^a-z]/g, "");
            if (!knownKeys.includes(normalizedKey)) continue;

            if (Array.isArray(rawValue)) {
                result[section] = rawValue.map((item) => String(item));
                break;
            }

            if (typeof rawValue === "string") {
                result[section] = rawValue;
                break;
            }
        }
    }

    return result;
}

export function extractObjectivePayloadFromModelOutput(raw: string): ObjectivePayloadLike | null {
    const parsed = parseJsonFromModelOutput<unknown>(raw);
    if (parsed && !Array.isArray(parsed) && typeof parsed === "object") {
        const mappedPayload = mapObjectivePayloadRecord(parsed as Record<string, unknown>);
        if (hasAnyObjectiveContent(mappedPayload)) {
            return mappedPayload;
        }
    }

    const sectionLines: Record<ObjectiveSection, string[]> = {
        objectives: [],
        waecObjectives: [],
        jambObjectives: [],
        igcseObjectives: [],
    };

    let currentSection: ObjectiveSection | null = null;
    for (const rawLine of cleanJsonCandidate(raw).replace(/\r\n?/g, "\n").split("\n")) {
        const line = rawLine.trim();
        if (!line || /^[\]}),]+$/.test(line)) continue;

        const detectedSection = detectObjectiveSection(line);
        if (detectedSection) {
            currentSection = detectedSection.section;
            if (detectedSection.remainder) {
                sectionLines[currentSection].push(detectedSection.remainder);
            }
            continue;
        }

        if (!currentSection) continue;

        const cleanedLine = normalizeObjectiveLine(line);
        if (!cleanedLine || /^[\[{(]+$/.test(cleanedLine)) continue;
        sectionLines[currentSection].push(cleanedLine);
    }

    const fallbackPayload: ObjectivePayloadLike = Object.fromEntries(
        Object.entries(sectionLines).map(([section, lines]) => [section, lines])
    ) as ObjectivePayloadLike;

    return hasAnyObjectiveContent(fallbackPayload) ? fallbackPayload : null;
}

function normalizeIntegerList(input: unknown) {
    const rawValues = Array.isArray(input)
        ? input
        : typeof input === "string"
            ? input.split(/[^0-9]+/)
            : [];

    const uniqueValues = new Set<number>();
    for (const rawValue of rawValues) {
        const parsed = typeof rawValue === "number"
            ? rawValue
            : Number.parseInt(String(rawValue), 10);

        if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 17) {
            uniqueValues.add(parsed);
        }
    }

    return Array.from(uniqueValues).sort((a, b) => a - b).slice(0, 5);
}

export function extractSdgNumbersFromModelOutput(raw: string) {
    const parsed = parseJsonFromModelOutput<unknown>(raw);

    if (Array.isArray(parsed)) {
        const numbers = normalizeIntegerList(parsed);
        if (numbers.length > 0) return numbers;
    }

    if (parsed && typeof parsed === "object") {
        const record = parsed as Record<string, unknown>;
        for (const key of ["sdgNumbers", "sdgs", "goals"]) {
            const numbers = normalizeIntegerList(record[key]);
            if (numbers.length > 0) return numbers;
        }
    }

    for (const match of raw.matchAll(/\[([^[\]]+)\]/g)) {
        const numbers = normalizeIntegerList(match[1]);
        if (numbers.length > 0) return numbers;
    }

    const taggedNumbers = normalizeIntegerList(
        Array.from(raw.matchAll(/\bSDG\s*#?\s*(1[0-7]|[1-9])\b/gi), (match) => match[1])
    );
    if (taggedNumbers.length > 0) return taggedNumbers;

    return normalizeIntegerList(raw);
}
