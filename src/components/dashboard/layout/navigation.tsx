import React from "react";
import type { PermissionKey } from "@/lib/permissions";
import {
    LayoutDashboard,
    BarChart,
    Users,
    User,
    GraduationCap,
    BookOpen,
    FileEdit,
    ClipboardCheck,
    TrendingUp,
    Library,
    Presentation,
    HelpCircle,
    FileText,
    Book,
    School,
    Table,
    FileQuestion,
    FileSignature,
    ScrollText,
    Award,
    History,
    UploadCloud,
    Building,
    CalendarCheck,
    CalendarDays,
    MessageSquare,
    Wallet,
    Settings
} from "lucide-react";

export interface NavItem {
    name: string;
    href: string;
    icon: React.ReactNode;
    roles: string[];
    badge?: "uploadRequests";
    permissionKey?: PermissionKey;
}

export interface NavGroup {
    label: string;
    icon: React.ReactNode;
    items: NavItem[];
}

export type NavEntry = NavItem | NavGroup;

export function isGroup(entry: NavEntry): entry is NavGroup {
    return "items" in entry;
}

export const navigation: NavEntry[] = [
    {
        name: "Dashboard",
        href: "/dashboard",
        icon: <LayoutDashboard className="w-5 h-5" />,
        roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "PROPRIETOR", "CLASS_TEACHER", "SUBJECT_TEACHER", "STUDENT", "PARENT"]
    },
    {
        name: "Insights",
        href: "/dashboard/insights",
        icon: <BarChart className="w-5 h-5" />,
        roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "PROPRIETOR"],
        permissionKey: "insights",
    },
    {
        name: "My Wards",
        href: "/dashboard/wards",
        icon: <Users className="w-5 h-5" />,
        roles: ["PARENT"],
        permissionKey: "wards",
    },
    {
        name: "My Profile",
        href: "/dashboard/profile",
        icon: <User className="w-5 h-5" />,
        roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "PROPRIETOR", "CLASS_TEACHER", "SUBJECT_TEACHER", "STUDENT", "PARENT"]
    },
    {
        label: "People",
        icon: <Users className="w-4 h-4" />,
        items: [
            { name: "Students", href: "/dashboard/students", icon: <GraduationCap className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "CLASS_TEACHER"], permissionKey: "students" },
            { name: "Teachers", href: "/dashboard/teachers", icon: <Users className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"], permissionKey: "teachers" },
        ]
    },
    {
        label: "Academics",
        icon: <BookOpen className="w-4 h-4" />,
        items: [
            { name: "Score Entry", href: "/dashboard/scores", icon: <FileEdit className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "CLASS_TEACHER", "SUBJECT_TEACHER"], permissionKey: "scoreEntry" },
            { name: "Score Reviews", href: "/dashboard/score-reviews", icon: <ClipboardCheck className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "CLASS_TEACHER"], permissionKey: "scoreReviews" },
            { name: "Class Progress", href: "/dashboard/progress", icon: <TrendingUp className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "CLASS_TEACHER", "SUBJECT_TEACHER"], permissionKey: "classProgress" },
            { name: "Subjects", href: "/dashboard/subjects", icon: <Library className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"], permissionKey: "subjects" },
            { name: "Lessons", href: "/dashboard/lessons", icon: <Presentation className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "CLASS_TEACHER", "SUBJECT_TEACHER", "STUDENT"], permissionKey: "lessons" },
            { name: "Quizzes", href: "/dashboard/quizzes", icon: <HelpCircle className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "CLASS_TEACHER", "SUBJECT_TEACHER", "STUDENT"], permissionKey: "quizzes" },
            { name: "Assignments", href: "/dashboard/assignments", icon: <FileText className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "CLASS_TEACHER", "SUBJECT_TEACHER", "STUDENT"], permissionKey: "assignments" },
            { name: "Scheme of Work", href: "/dashboard/scheme-of-work", icon: <Book className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "CLASS_TEACHER", "SUBJECT_TEACHER", "STUDENT"], permissionKey: "schemesOfWork" },
            { name: "My Progress", href: "/dashboard/my-progress", icon: <TrendingUp className="w-5 h-5" />, roles: ["STUDENT"], permissionKey: "myProgress" },
            { name: "Classes", href: "/dashboard/classes", icon: <School className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"], permissionKey: "classes" },
            { name: "Broadsheet", href: "/dashboard/broadsheet", icon: <Table className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "CLASS_TEACHER"], permissionKey: "broadsheet" },
            { name: "Dummy", href: "/dashboard/dummy", icon: <FileQuestion className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"], permissionKey: "dummy" },
            { name: "Transcripts", href: "/dashboard/transcripts", icon: <FileSignature className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"], permissionKey: "transcripts" },
        ]
    },
    {
        label: "Reports",
        icon: <ScrollText className="w-4 h-4" />,
        items: [
            { name: "Report Cards", href: "/dashboard/reports", icon: <Award className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "CLASS_TEACHER", "PARENT", "STUDENT"], permissionKey: "reportCards" },
            { name: "Historical Records", href: "/dashboard/legacy-records", icon: <History className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"], permissionKey: "legacyRecords" },
            { name: "Upload Requests", href: "/dashboard/scores/upload-requests", icon: <UploadCloud className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"], badge: "uploadRequests", permissionKey: "uploadRequests" },
        ]
    },
    {
        label: "School",
        icon: <Building className="w-4 h-4" />,
        items: [
            { name: "Attendance", href: "/dashboard/attendance", icon: <CalendarCheck className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "CLASS_TEACHER"], permissionKey: "attendance" },
            { name: "Public Holidays", href: "/dashboard/public-holidays", icon: <CalendarDays className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"], permissionKey: "publicHolidays" },
            { name: "Behaviour & Skills", href: "/dashboard/assessments", icon: <Award className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "CLASS_TEACHER"], permissionKey: "behaviour" },
            { name: "Communication", href: "/dashboard/communication", icon: <MessageSquare className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"], permissionKey: "communication" },
            { name: "Fees", href: "/dashboard/fees", icon: <Wallet className="w-5 h-5" />, roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "PARENT"], permissionKey: "fees" },
        ]
    },
    {
        name: "Settings",
        href: "/dashboard/settings",
        icon: <Settings className="w-5 h-5" />,
        roles: ["SUPER_ADMIN", "SCHOOL_ADMIN"],
    },
    {
        name: "Help & Support",
        href: "/dashboard/help",
        icon: <HelpCircle className="w-5 h-5" />,
        roles: ["SUPER_ADMIN", "SCHOOL_ADMIN", "PROPRIETOR", "CLASS_TEACHER", "SUBJECT_TEACHER", "STUDENT", "PARENT"]
    }
];
