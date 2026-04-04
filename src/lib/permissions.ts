import type { FeatureFlags } from "@/lib/getSchoolFeatures";

export const MANAGED_ROLE_PERMISSION_ROLES = [
    "SCHOOL_ADMIN",
    "PROPRIETOR",
    "CLASS_TEACHER",
    "SUBJECT_TEACHER",
    "PARENT",
    "STUDENT",
] as const;

export type ManagedRolePermissionRole = typeof MANAGED_ROLE_PERMISSION_ROLES[number];

export const ROLE_PERMISSION_LABELS: Record<ManagedRolePermissionRole, string> = {
    SCHOOL_ADMIN: "School Admin",
    PROPRIETOR: "Proprietor",
    CLASS_TEACHER: "Class Teacher",
    SUBJECT_TEACHER: "Subject Teacher",
    PARENT: "Parent",
    STUDENT: "Student",
};

export const ROLE_PERMISSION_DESCRIPTIONS: Record<ManagedRolePermissionRole, string> = {
    SCHOOL_ADMIN: "Controls school operations and staff-facing workflows.",
    PROPRIETOR: "Executive overview access for leadership users.",
    CLASS_TEACHER: "Class-level reporting, attendance, and student oversight.",
    SUBJECT_TEACHER: "Teaching and assessment access for assigned subjects.",
    PARENT: "Parent-facing access to wards, reports, and fees.",
    STUDENT: "Student-facing access to learning and performance tools.",
};

type PermissionGroup = "General" | "People" | "Academics" | "Reports" | "School";
type SchoolFeatureKey = keyof FeatureFlags;

export type PermissionDefinition = {
    key: string;
    label: string;
    description: string;
    group: PermissionGroup;
    defaultRoles: ManagedRolePermissionRole[];
    pathPrefixes: string[];
    schoolFeatureKey?: SchoolFeatureKey;
};

export const ROLE_PERMISSION_DEFINITIONS = [
    {
        key: "insights",
        label: "Insights",
        description: "Executive insights and balanced-scorecard analytics.",
        group: "General",
        defaultRoles: ["SCHOOL_ADMIN", "PROPRIETOR"],
        pathPrefixes: ["/dashboard/insights"],
    },
    {
        key: "wards",
        label: "My Wards",
        description: "Parent ward overview and ward-specific access.",
        group: "General",
        defaultRoles: ["PARENT"],
        pathPrefixes: ["/dashboard/wards"],
    },
    {
        key: "students",
        label: "Students",
        description: "Student list, profiles, and student management tools.",
        group: "People",
        defaultRoles: ["SCHOOL_ADMIN", "CLASS_TEACHER"],
        pathPrefixes: ["/dashboard/students"],
        schoolFeatureKey: "studentsEnabled",
    },
    {
        key: "teachers",
        label: "Teachers",
        description: "Staff accounts, assignments, imports, and credentials.",
        group: "People",
        defaultRoles: ["SCHOOL_ADMIN"],
        pathPrefixes: ["/dashboard/teachers"],
        schoolFeatureKey: "teachersEnabled",
    },
    {
        key: "scoreEntry",
        label: "Score Entry",
        description: "Enter and manage student assessment scores.",
        group: "Academics",
        defaultRoles: ["SCHOOL_ADMIN", "CLASS_TEACHER", "SUBJECT_TEACHER"],
        pathPrefixes: ["/dashboard/scores"],
        schoolFeatureKey: "scoreEntryEnabled",
    },
    {
        key: "scoreReviews",
        label: "Score Reviews",
        description: "Review and approve submitted subject scores.",
        group: "Academics",
        defaultRoles: ["SCHOOL_ADMIN", "CLASS_TEACHER"],
        pathPrefixes: ["/dashboard/score-reviews"],
        schoolFeatureKey: "scoreReviewsEnabled",
    },
    {
        key: "classProgress",
        label: "Class Progress",
        description: "Track class-level academic progress and trends.",
        group: "Academics",
        defaultRoles: ["SCHOOL_ADMIN", "CLASS_TEACHER", "SUBJECT_TEACHER"],
        pathPrefixes: ["/dashboard/progress"],
    },
    {
        key: "subjects",
        label: "Subjects",
        description: "Manage subjects, subject offerings, and composites.",
        group: "Academics",
        defaultRoles: ["SCHOOL_ADMIN"],
        pathPrefixes: ["/dashboard/subjects"],
        schoolFeatureKey: "subjectsEnabled",
    },
    {
        key: "lessons",
        label: "Lessons",
        description: "Lesson notes, studio tools, and lesson publishing.",
        group: "Academics",
        defaultRoles: ["SCHOOL_ADMIN", "CLASS_TEACHER", "SUBJECT_TEACHER", "STUDENT"],
        pathPrefixes: ["/dashboard/lessons"],
        schoolFeatureKey: "lessonsEnabled",
    },
    {
        key: "quizzes",
        label: "Quizzes",
        description: "Quiz creation, participation, and quiz history.",
        group: "Academics",
        defaultRoles: ["SCHOOL_ADMIN", "CLASS_TEACHER", "SUBJECT_TEACHER", "STUDENT"],
        pathPrefixes: ["/dashboard/quizzes"],
        schoolFeatureKey: "quizzesEnabled",
    },
    {
        key: "assignments",
        label: "Assignments",
        description: "Assignment creation, grading, and student submissions.",
        group: "Academics",
        defaultRoles: ["SCHOOL_ADMIN", "CLASS_TEACHER", "SUBJECT_TEACHER", "STUDENT"],
        pathPrefixes: ["/dashboard/assignments"],
        schoolFeatureKey: "assignmentsEnabled",
    },
    {
        key: "schemesOfWork",
        label: "Scheme of Work",
        description: "Curriculum planning, terms, weeks, and collaborator workflow.",
        group: "Academics",
        defaultRoles: ["SCHOOL_ADMIN", "CLASS_TEACHER", "SUBJECT_TEACHER", "STUDENT"],
        pathPrefixes: ["/dashboard/scheme-of-work"],
        schoolFeatureKey: "schemesOfWorkEnabled",
    },
    {
        key: "myProgress",
        label: "My Progress",
        description: "Student-only academic progress dashboard.",
        group: "Academics",
        defaultRoles: ["STUDENT"],
        pathPrefixes: ["/dashboard/my-progress"],
    },
    {
        key: "classes",
        label: "Classes",
        description: "Class arms, class settings, and class teacher assignments.",
        group: "Academics",
        defaultRoles: ["SCHOOL_ADMIN"],
        pathPrefixes: ["/dashboard/classes"],
        schoolFeatureKey: "classesEnabled",
    },
    {
        key: "broadsheet",
        label: "Broadsheet",
        description: "Broadsheet generation and class-wide result sheets.",
        group: "Academics",
        defaultRoles: ["SCHOOL_ADMIN", "CLASS_TEACHER"],
        pathPrefixes: ["/dashboard/broadsheet"],
        schoolFeatureKey: "broadsheetEnabled",
    },
    {
        key: "dummy",
        label: "Dummy",
        description: "Dummy result workflow and related admin tools.",
        group: "Academics",
        defaultRoles: ["SCHOOL_ADMIN"],
        pathPrefixes: ["/dashboard/dummy"],
    },
    {
        key: "transcripts",
        label: "Transcripts",
        description: "Transcript generation and transcript downloads.",
        group: "Academics",
        defaultRoles: ["SCHOOL_ADMIN"],
        pathPrefixes: ["/dashboard/transcripts"],
        schoolFeatureKey: "transcriptsEnabled",
    },
    {
        key: "reportCards",
        label: "Report Cards",
        description: "Report card generation, publishing, and viewing.",
        group: "Reports",
        defaultRoles: ["SCHOOL_ADMIN", "CLASS_TEACHER", "PARENT", "STUDENT"],
        pathPrefixes: ["/dashboard/reports"],
        schoolFeatureKey: "reportCardsEnabled",
    },
    {
        key: "legacyRecords",
        label: "Historical Records",
        description: "Legacy student data and historical import tools.",
        group: "Reports",
        defaultRoles: ["SCHOOL_ADMIN"],
        pathPrefixes: ["/dashboard/legacy-records"],
        schoolFeatureKey: "legacyRecordsEnabled",
    },
    {
        key: "uploadRequests",
        label: "Upload Requests",
        description: "Bulk score upload requests and approval workflow.",
        group: "Reports",
        defaultRoles: ["SCHOOL_ADMIN"],
        pathPrefixes: ["/dashboard/scores/upload-requests"],
        schoolFeatureKey: "uploadRequestsEnabled",
    },
    {
        key: "attendance",
        label: "Attendance",
        description: "Daily attendance marking and attendance history.",
        group: "School",
        defaultRoles: ["SCHOOL_ADMIN", "CLASS_TEACHER"],
        pathPrefixes: ["/dashboard/attendance"],
        schoolFeatureKey: "attendanceEnabled",
    },
    {
        key: "publicHolidays",
        label: "Public Holidays",
        description: "School calendar holidays and non-school-day configuration.",
        group: "School",
        defaultRoles: ["SCHOOL_ADMIN"],
        pathPrefixes: ["/dashboard/public-holidays"],
    },
    {
        key: "behaviour",
        label: "Behaviour & Skills",
        description: "Affective traits, psychomotor skills, and related reports.",
        group: "School",
        defaultRoles: ["SCHOOL_ADMIN", "CLASS_TEACHER"],
        pathPrefixes: ["/dashboard/assessments"],
        schoolFeatureKey: "behaviourEnabled",
    },
    {
        key: "communication",
        label: "Communication",
        description: "School messaging, SMS, and email broadcasting.",
        group: "School",
        defaultRoles: ["SCHOOL_ADMIN"],
        pathPrefixes: ["/dashboard/communication"],
        schoolFeatureKey: "communicationEnabled",
    },
    {
        key: "fees",
        label: "Fees",
        description: "Fee structures, payment status, and parent fee view.",
        group: "School",
        defaultRoles: ["SCHOOL_ADMIN", "PARENT"],
        pathPrefixes: ["/dashboard/fees"],
        schoolFeatureKey: "feesEnabled",
    },
] as const satisfies readonly PermissionDefinition[];

export type PermissionKey = typeof ROLE_PERMISSION_DEFINITIONS[number]["key"];
export type PermissionState = Record<PermissionKey, boolean>;

const PERMISSION_DEFINITION_MAP = new Map<string, PermissionDefinition>(
    ROLE_PERMISSION_DEFINITIONS.map((definition) => [definition.key, definition])
);

const SORTED_PATH_MATCHERS = [...ROLE_PERMISSION_DEFINITIONS]
    .flatMap((definition) =>
        definition.pathPrefixes.map((pathPrefix) => ({
            key: definition.key,
            pathPrefix,
        }))
    )
    .sort((left, right) => right.pathPrefix.length - left.pathPrefix.length);

export function isManagedRolePermissionRole(value: string): value is ManagedRolePermissionRole {
    return (MANAGED_ROLE_PERMISSION_ROLES as readonly string[]).includes(value);
}

export function getPermissionDefinition(key: PermissionKey): PermissionDefinition {
    return PERMISSION_DEFINITION_MAP.get(key)!;
}

export function getRoleDefaultPermissionKeys(role: ManagedRolePermissionRole): PermissionKey[] {
    return ROLE_PERMISSION_DEFINITIONS
        .filter((definition) => (definition.defaultRoles as readonly ManagedRolePermissionRole[]).includes(role))
        .map((definition) => definition.key as PermissionKey);
}

export function getRolePermissionDefinitions(role: ManagedRolePermissionRole): PermissionDefinition[] {
    return ROLE_PERMISSION_DEFINITIONS.filter((definition) =>
        (definition.defaultRoles as readonly ManagedRolePermissionRole[]).includes(role)
    );
}

export function createEmptyPermissionState(): PermissionState {
    return Object.fromEntries(
        ROLE_PERMISSION_DEFINITIONS.map((definition) => [definition.key, false])
    ) as PermissionState;
}

export function createPermissionState(enabledKeys: PermissionKey[]): PermissionState {
    const enabledSet = new Set(enabledKeys);
    return Object.fromEntries(
        ROLE_PERMISSION_DEFINITIONS.map((definition) => [definition.key, enabledSet.has(definition.key)])
    ) as PermissionState;
}

export function matchPermissionKeyForPath(pathname: string): PermissionKey | null {
    const normalized = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;

    for (const matcher of SORTED_PATH_MATCHERS) {
        if (normalized === matcher.pathPrefix || normalized.startsWith(`${matcher.pathPrefix}/`)) {
            return matcher.key as PermissionKey;
        }
    }

    return null;
}
