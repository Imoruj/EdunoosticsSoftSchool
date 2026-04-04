"use client";

import React, { useState, useMemo } from "react";
import { 
    Download, 
    Printer, 
    BookOpen, 
    UserCheck, 
    GraduationCap, 
    ClipboardCheck, 
    TrendingUp,
    FileText,
    CalendarCheck,
    Settings,
    ChevronRight,
    HelpCircle,
    Users,
    User,
    Library,
    Presentation,
    Table,
    FileQuestion,
    FileSignature,
    ScrollText,
    Award,
    History,
    UploadCloud,
    Building,
    CalendarDays,
    MessageSquare,
    Wallet,
    LayoutDashboard,
    Search,
    CheckCircle2,
    Info,
    AlertCircle,
    Plus,
    X,
    Filter,
    ArrowRightCircle,
    Eye,
    Save,
    FileEdit,
    School,
    BarChart3
} from "lucide-react";
import { AnnotatedVisual, Annotation } from "@/components/help/AnnotatedVisual";

// --- Types & Components ---

interface Action {
    label: string;
    description: string;
    icon?: React.ReactNode;
}

interface ManualSection {
    id: string;
    title: string;
    icon: React.ReactNode;
    description: string;
    content: React.ReactNode;
    keywords: string[]; // For searching
}

const ActionTable = ({ actions }: { actions: Action[] }) => (
    <div className="my-6 overflow-hidden border border-gray-200 rounded-xl bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Action / Button</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Function Description</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {actions.map((action, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 flex items-center gap-2">
                            {action.icon && <span className="text-gray-400">{action.icon}</span>}
                            {action.label}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                            {action.description}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const ProTip = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-6 rounded-r-lg">
        <div className="flex items-center gap-2 text-blue-800 font-bold mb-1">
            <Info className="w-4 h-4" /> Pro Tip
        </div>
        <div className="text-sm text-blue-700 leading-relaxed font-medium">
            {children}
        </div>
    </div>
);

const HelpPage = () => {
    const [activeTab, setActiveTab] = useState("overview");
    const [searchQuery, setSearchQuery] = useState("");

    const handlePrint = () => {
        window.print();
    };

    const sections: ManualSection[] = [
        {
            id: "overview",
            title: "1. Dashboard & Core Navigation",
            icon: <LayoutDashboard className="w-5 h-5" />,
            description: "A centralized hub for school metrics and quick actions.",
            keywords: ["dashboard", "home", "analytics", "summary", "stats", "overview", "search", "term"],
            content: (
                <div className="space-y-8">
                    <div className="prose prose-blue max-w-none">
                        <p className="text-lg leading-relaxed text-gray-600">
                            The dashboard gives you an bird&apos;s eye view of the entire school. It connects all modules through global search and quick-filter tools.
                        </p>
                    </div>

                    <AnnotatedVisual 
                        src="/images/help/dashboard_home.png" 
                        alt="Dashboard Interface" 
                        caption="Main Dashboard interface highlighting real-time school statistics and navigation shortcuts."
                        annotations={[
                            { x: 30, y: 15, label: "Global Search", description: "Search for any student, teacher, or class arm instantly." },
                            { x: 85, y: 15, label: "Term & Session Selector", description: "Switch between academic years and terms to view historical data." },
                            { x: 50, y: 40, label: "Health Cards", description: "Monitor critical indicators like enrollment trends and school health." }
                        ]}
                    />

                    <ActionTable actions={[
                        { label: "Search Bar", icon: <Search className="w-4 h-4" />, description: "Located at the top. Type any name or ID to jump directly to a profile." },
                        { label: "Term Dropdown", icon: <CalendarDays className="w-4 h-4" />, description: "Switch active context. Affects all reports and views on the page." },
                        { label: "Notification Bell", icon: <AlertCircle className="w-4 h-4" />, description: "View system alerts, score review approvals, or registration errors." },
                    ]} />
                </div>
            )
        },
        {
            id: "insights",
            title: "2. Executive Insights",
            icon: <BarChart3 className="w-5 h-5" />,
            description: "Deep-dive analytics for School Owners and Administrators.",
            keywords: ["insights", "analytics", "trends", "proprietor", "executive", "health", "enrollment"],
            content: (
                <div className="space-y-8">
                    <div className="prose prose-blue max-w-none">
                        <p className="text-gray-600">The Insights module transforms raw data into actionable intelligence across six primary focus areas.</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-semibold text-gray-900 mt-6">
                            <div className="p-3 bg-slate-50 rounded-xl border">Enrollment & Growth</div>
                            <div className="p-3 bg-slate-50 rounded-xl border">Academic Performance</div>
                            <div className="p-3 bg-slate-50 rounded-xl border">Attendance Health</div>
                            <div className="p-3 bg-slate-50 rounded-xl border">Financial Summary</div>
                            <div className="p-3 bg-slate-50 rounded-xl border">Operations & Staff</div>
                            <div className="p-3 bg-slate-50 rounded-xl border">Communication Impact</div>
                        </div>
                    </div>

                    <ProTip>
                        The "Priority Alerts" card on the Insights overview highlights classes with missing registers or unpublished report cards that need urgent attention.
                    </ProTip>

                    <ActionTable actions={[
                        { label: "Executive Filter", icon: <Filter className="w-4 h-4" />, description: "Filter all analytics by Class Level or specific Term ranges." },
                        { label: "Export Panel", icon: <Download className="w-4 h-4" />, description: "Generate a summary of insights for your end-of-term board meetings." },
                    ]} />
                </div>
            )
        },
        {
            id: "people",
            title: "3. People Management",
            icon: <Users className="w-5 h-5" />,
            description: "Full lifecycle management for Students, Teachers, and Parents.",
            keywords: ["students", "teachers", "staff", "onboarding", "profiles", "admission", "promotion", "bulk", "parents"],
            content: (
                <div className="space-y-12">
                    <section>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <GraduationCap className="w-7 h-7 text-primary-600" />
                            Student Lifecycle [Admin/Teacher]
                        </h3>
                        <p className="text-gray-600 mb-6">Manage every student from the moment they enter the school until they graduate.</p>

                        <AnnotatedVisual 
                            src="/images/help/add_student.png" 
                            alt="Student Form" 
                            caption="Student registration interface with mandatory bio-data fields."
                            annotations={[
                                { x: 70, y: 25, label: "Admission Number", description: "Must be unique. The system uses this to link all academic history." },
                                { x: 70, y: 55, label: "Class Assignment", description: "Allocate the student to a specific Arm (e.g., Gold, Diamond)." }
                            ]}
                        />

                        <ActionTable actions={[
                            { label: "Manual Admit", icon: <Plus className="w-4 h-4" />, description: "Add a single student via the UI form." },
                            { label: "Bulk Import", icon: <UploadCloud className="w-4 h-4" />, description: "Upload hundreds of students at once via our Excel template." },
                            { label: "Batch Promotion", icon: <TrendingUp className="w-4 h-4" />, description: "Available at session end. Advance all students in a class to the next level." },
                        ]} />

                        <AnnotatedVisual src="/images/help/students_list.png" alt="Students List" caption="Comprehensive list with status filters (Active/Inactive)." />
                    </section>

                    <section className="pt-12 border-t border-gray-200">
                        <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <UserCheck className="w-7 h-7 text-green-600" />
                            Staff & Teacher Roles
                        </h3>
                        <AnnotatedVisual 
                            src="/images/help/add_teacher.png" 
                            alt="Staff Profile" 
                            caption="Linking staff to their specific academic responsibilities." 
                            annotations={[
                                { x: 70, y: 40, label: "Subject Allocation", description: "Assign specific subjects. Only these will appear for the teacher in Score Entry." },
                                { x: 70, y: 70, label: "Role Permission", description: "Choose between Subject Teacher, Class Teacher, or Admin." }
                            ]}
                        />
                    </section>
                </div>
            )
        },
        {
            id: "academics",
            title: "4. Academic Core",
            icon: <ClipboardCheck className="w-5 h-5" />,
            description: "The engine for scores, reviews, subjects, and curriculum management.",
            keywords: ["scores", "grading", "subjects", "classes", "reviews", "progress", "ca", "exam", "selection", "approval"],
            content: (
                <div className="space-y-12">
                    <section>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <FileEdit className="w-7 h-7 text-indigo-600" />
                            Score Entry & Approval
                        </h3>
                        <p className="text-gray-600 mb-8 leading-relaxed">Teachers record Continuous Assessments (CA) and Exams. Admins must then review and approve these scores.</p>

                        <div className="space-y-12">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                                <div className="prose prose-blue italic">
                                    <h4 className="text-lg font-bold">1. Subject Selection</h4>
                                    <p>Select your Session, Term, Class, and Subject. The system filters these based on your teacher assignment.</p>
                                </div>
                                <AnnotatedVisual src="/images/help/score_entry_initial.png" alt="Score Selection" caption="Pre-filtering the score sheet for entry." />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                                <AnnotatedVisual 
                                    src="/images/help/score_entry_table.png" 
                                    alt="Score Grid" 
                                    caption="The direct-entry grid with real-time validation." 
                                    annotations={[
                                        { x: 50, y: 50, label: "Auto-Save Grid", description: "Values are saved periodically. Invalid scores (e.g., >40 in CA) will turn red." },
                                        { x: 85, y: 5, label: "Final Submission", description: "Submit the entire sheet for review once complete." }
                                    ]}
                                />
                                <div className="prose prose-blue italic">
                                    <h4 className="text-lg font-bold">2. Score Review Desk</h4>
                                    <p>Admins (Principals/HODs) use the <strong>Review Desk</strong> to inspect submissions. They can <strong>Approve</strong> or <strong>Reject</strong> with mandatory feedback notes.</p>
                                </div>
                            </div>
                        </div>

                        <ActionTable actions={[
                            { label: "Approve Sheet", icon: <CheckCircle2 className="w-4 h-4 text-green-600" />, description: "Finalizes scores for report card generation." },
                            { label: "Reject with Note", icon: <X className="w-4 h-4 text-red-600" />, description: "Reverts scores to teacher for correction. Requires a reason." },
                        ]} />
                    </section>

                    <section className="pt-12 border-t border-gray-200">
                        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <School className="w-7 h-7 text-amber-600" />
                            Class & Subject Repositories
                        </h3>
                        <AnnotatedVisual 
                            src="/images/help/add_class.png" 
                            alt="Class Config" 
                            caption="Organizing the school structure via Levels and Arms." 
                             annotations={[
                                { x: 75, y: 40, label: "Level (e.g. Primary 1)", description: "The broad academic grade level." },
                                { x: 75, y: 70, label: "Arm (e.g. Diamond)", description: "The specific classroom group." }
                            ]}
                        />
                    </section>
                </div>
            )
        },
        {
            id: "learning",
            title: "5. Digital Learning",
            icon: <Presentation className="w-5 h-5" />,
            description: "Interactive Lessons, Schemes of Work, Quizzes, and Assignments.",
            keywords: ["lessons", "scheme", "sow", "quizzes", "assignments", "e-learning", "materials", "builder", "quiz player"],
            content: (
                <div className="space-y-12">
                    <section>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <BookOpen className="w-7 h-7 text-orange-600" />
                            Lesson & Scheme Builder
                        </h3>
                        <p className="text-gray-600 mb-6">Create rich, multimedia lesson content and map it to your weekly Scheme of Work.</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <AnnotatedVisual 
                                src="/images/help/create_scheme.png" 
                                alt="Scheme Editor" 
                                caption="Mapping topics to the academic calendar." 
                                annotations={[
                                    { x: 30, y: 50, label: "Week Selector", description: "Select which week this topic will be taught." },
                                    { x: 70, y: 50, label: "Learning Goals", description: "What students should know by the end of the topic." }
                                ]}
                            />
                            <div className="prose prose-sm prose-blue bg-white border p-6 rounded-2xl shadow-sm">
                                <h4 className="font-bold text-gray-900">Lesson Components:</h4>
                                <ul className="text-xs space-y-2">
                                    <li><strong>Text Blocks:</strong> For basic instructional content.</li>
                                    <li><strong>Image/Video:</strong> Embed visuals from YouTube or your device.</li>
                                    <li><strong>Interactive Quizzes:</strong> Auto-graded multiple choice questions.</li>
                                    <li><strong>Assignments:</strong> File upload tasks with set deadlines.</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section className="pt-12 border-t border-gray-200">
                        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <FileQuestion className="w-7 h-7 text-indigo-500" />
                            Student Experience (Quizzes & Tasks)
                        </h3>
                        <AnnotatedVisual 
                            src="/images/help/create_assignment.png" 
                            alt="Assignment Interface" 
                            caption="Students view task instructions and upload their work directly." 
                             annotations={[
                                { x: 80, y: 20, label: "Deadline Countdown", description: "Shows remaining time for submission." },
                                { x: 50, y: 80, label: "Dropzone", description: "Students drag and drop PDFs or images here." }
                            ]}
                        />
                    </section>
                </div>
            )
        },
        {
            id: "administration",
            title: "6. School Administration",
            icon: <Building className="w-5 h-5" />,
            description: "Daily operations: Attendance, Communication, Holidays, and Behaviour.",
            keywords: ["attendance", "messages", "sms", "email", "fees", "holidays", "communication", "behaviour", "skills", "traits"],
            content: (
                <div className="space-y-12">
                    <section>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <CalendarCheck className="w-7 h-7 text-green-600" />
                            Attendance Tracking
                        </h3>
                        <p className="text-gray-600 mb-6 font-medium bg-green-50 p-3 rounded-lg inline-block border border-green-100">
                            The system uses "Cycle Marking". You can mark the whole class as Present and then toggled individual Absentees.
                        </p>
                        <AnnotatedVisual 
                            src="/images/help/mark_attendance.png" 
                            alt="Attendance marking" 
                            caption="Managing the daily register." 
                            annotations={[
                                { x: 80, y: 15, label: "Mark All Present", description: "A massive time saver for teachers. Click first, then adjust absentees." },
                                { x: 50, y: 50, label: "Status Toggle", description: "Click the status bubble to toggle Presence/Absence/Lateness." }
                            ]}
                        />
                    </section>

                    <section className="pt-12 border-t border-gray-200">
                        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Award className="w-7 h-7 text-rose-600" />
                            Behaviour & Skills Assessment
                        </h3>
                        <p className="text-gray-600 mb-8 italic">Used by Class Teachers. Assess Affective Traits (Neatness, Punctuality) and Psychomotor Skills (Crafts, Sports) on a 1-5 scale.</p>
                        <div className="bg-gray-100/50 p-6 rounded-2xl border border-gray-200 text-center font-bold text-gray-900">
                            ACTION: Click any rating box multiple times to cycle through scores [1 → 2 → 3 → 4 → 5 → RESET]
                        </div>
                    </section>

                    <section className="pt-12 border-t border-gray-200">
                        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <MessageSquare className="w-7 h-7 text-blue-600" />
                            Targeted Communication
                        </h3>
                        <AnnotatedVisual 
                            src="/images/help/compose_message.png" 
                            alt="Messaging" 
                            caption="Broadcasting via SMS and Email." 
                            annotations={[
                                { x: 30, y: 25, label: "Audience Filter", description: "Select 'By Class' or 'By Role' (e.g., all parents of Primary 4)." },
                                { x: 30, y: 45, label: "Channel Switch", description: "Toggle between SMS (Urgent) and Email (Bulletins)." }
                            ]}
                        />
                    </section>
                </div>
            )
        },
        {
            id: "results",
            title: "7. Registry & Results",
            icon: <Award className="w-5 h-5" />,
            description: "Finalizing, Printing, and Publishing Report Cards and Transcripts.",
            keywords: ["report cards", "transcripts", "broadsheet", "records", "printing", "publishing", "legacy", "historical"],
            content: (
                <div className="space-y-12">
                    <section>
                        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <ScrollText className="w-7 h-7 text-rose-600" />
                            The Report Card Publishing Cycle
                        </h3>
                        <p className="text-gray-600 mb-10 leading-relaxed text-lg">
                            Transform approved scores into final documents. This is a three-step mandatory workflow.
                        </p>

                        <AnnotatedVisual 
                            src="/images/help/report_workflow.png" 
                            alt="Report Workflow" 
                            caption="Visualizing the automated flow from Generate to Publish." 
                            annotations={[
                                { x: 15, y: 50, label: "1. Preview", description: "Click to see a live draft of the report card. No scores can be changed here (Review Desk only)." },
                                { x: 50, y: 50, label: "2. Generate", description: "Renders the PDF into the system storage." },
                                { x: 85, y: 50, label: "3. Publish", description: "The single most important step. Without this, parents cannot see results on their portal." }
                            ]}
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
                            <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                <h5 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                    <Table className="w-5 h-5 text-primary-600" />
                                    Master Broadsheets
                                </h5>
                                <p className="text-sm text-gray-500 mb-4 italic">A top-down view of every score for every student in a class arm. Ideal for board meetings and session-end awards.</p>
                                <ActionTable actions={[
                                    { label: "Export Class Broadsheet", icon: <Download className="w-4 h-4" />, description: "Download to Excel for custom filtering or ranking." }
                                ]} />
                            </div>
                            <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                <h5 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                    <History className="w-5 h-5 text-slate-600" />
                                    Legacy/Historical Records
                                </h5>
                                <p className="text-sm text-gray-500 mb-4 italic">Access documents from previous academic sessions. You can upload old PDF report cards to ensure continuous student history.</p>
                            </div>
                        </div>
                    </section>
                </div>
            )
        },
        {
            id: "settings",
            title: "8. System Configuration",
            icon: <Settings className="w-5 h-5" />,
            description: "Personalizing platform constants: Grading, Identity, and Weights.",
            keywords: ["settings", "profile", "grading", "scales", "logo", "signatures", "identity", "assessment types", "weighting"],
            content: (
                <div className="space-y-10">
                    <section>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Settings className="w-7 h-7 text-gray-600" />
                            Platform Rules [Super-Admin Only]
                        </h3>
                        <AnnotatedVisual 
                            src="/images/help/settings_overview.png" 
                            alt="Settings dashboard" 
                            caption="The foundation of all other academic modules." 
                            annotations={[
                                { x: 75, y: 25, label: "School Profile", description: "Logo and signatures. Keep these high-res for clear report cards." },
                                { x: 75, y: 45, label: "Grading Scale", description: "Map scores to grades (e.g. 75-100 = A1)." },
                                { x: 75, y: 65, label: "Assessment Types", description: "Define weights (e.g. CA 40%, Exam 60%)." }
                            ]}
                        />
                    </section>
                </div>
            )
        }
    ];

    const filteredSections = useMemo(() => {
        if (!searchQuery) return sections;
        const query = searchQuery.toLowerCase();
        return sections.filter(s => 
            s.title.toLowerCase().includes(query) || 
            s.description.toLowerCase().includes(query) ||
            s.keywords.some(k => k.includes(query))
        );
    }, [searchQuery, sections]);

    const activeSection = sections.find(s => s.id === activeTab) || sections[0];

    return (
        <div className="flex min-h-screen bg-gray-50/50 no-print font-sans">
            {/* Sidebar Navigation */}
            <div className="w-80 bg-white border-r sticky top-0 h-screen overflow-y-auto no-print hidden lg:block">
                <div className="p-8">
                    <div className="flex items-center gap-4 mb-10 group relative">
                        <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-200 transform transition-transform group-hover:rotate-6">
                            <HelpCircle className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="font-black text-gray-900 leading-tight text-xl">User Manual</h1>
                            <p className="text-xs text-primary-600 font-bold tracking-widest uppercase mt-0.5">Exhaustive Guide v2.0</p>
                        </div>
                    </div>

                    {/* Search Field */}
                    <div className="relative mb-8">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Find an action..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all placeholder:text-gray-400 font-medium"
                        />
                    </div>

                    <div className="space-y-1">
                        {filteredSections.map(section => (
                            <button
                                key={section.id}
                                onClick={() => setActiveTab(section.id)}
                                className={`w-full flex items-center gap-4 px-4 py-3.5 text-sm font-semibold rounded-2xl transition-all duration-200 ${
                                    activeTab === section.id 
                                    ? "bg-primary-600 text-white shadow-lg shadow-primary-200" 
                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                }`}
                            >
                                <span className={activeTab === section.id ? "text-white" : "text-gray-400"}>
                                    {section.icon}
                                </span>
                                {section.title}
                            </button>
                        ))}
                    </div>

                    <div className="mt-16 pt-8 border-t border-gray-100">
                        <div className="bg-gray-900 rounded-2xl p-6 text-white relative overflow-hidden shadow-xl">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Printer className="w-16 h-16 text-white" />
                            </div>
                            <h5 className="font-bold mb-2 relative z-10">Action Guide Offline?</h5>
                            <p className="text-xs text-gray-400 mb-6 relative z-10 leading-relaxed font-medium">Download the full exhaustive manual as a structured PDF for your school handbook.</p>
                            <button 
                                onClick={handlePrint}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-gray-900 rounded-xl text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all"
                            >
                                <Printer className="w-4 h-4" />
                                PRINT FULL MANUAL
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 p-6 lg:p-16 overflow-y-auto print:p-0 print:overflow-visible bg-white lg:bg-transparent">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-16 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center gap-2 text-xs font-bold text-primary-600 uppercase tracking-widest mb-4">
                            <BookOpen className="w-4 h-4" />
                            <span>System Documentation</span>
                            <ChevronRight className="w-3 h-3 text-gray-300" />
                            <span className="text-gray-400">Searchable Actions</span>
                            <ChevronRight className="w-3 h-3 text-gray-300" />
                            <span className="text-gray-400">{activeSection.title}</span>
                        </div>
                        <h1 className="text-5xl font-black text-gray-900 tracking-tight leading-tight">
                            {activeSection.title}
                        </h1>
                        <p className="text-2xl text-gray-400 mt-4 font-medium leading-relaxed">
                            {activeSection.description}
                        </p>
                    </div>

                    <div className="pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                        {activeSection.content}
                    </div>
                </div>
            </main>

            {/* Print Layout optimizations */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    main { width: 100% !important; padding: 0 !important; margin: 0 !important; }
                    .page-break { page-break-after: always; }
                }
            ` }} />

            {/* Print-Only Layout (Multi-page Manual) */}
            <div className="hidden print:block w-full">
                {sections.map((section, idx) => (
                    <div key={section.id} className="p-12 space-y-10 page-break">
                        <div className="pb-6 border-b-4 border-gray-900">
                             <div className="flex justify-between items-end">
                                <div>
                                    <span className="text-sm font-black text-primary-600 block mb-1">CHAPTER {idx + 1}</span>
                                    <h1 className="text-5xl font-black text-gray-900">{section.title}</h1>
                                </div>
                                <span className="text-sm text-gray-400 font-bold uppercase tracking-widest">School Management System Manual</span>
                             </div>
                        </div>
                        <div className="py-6 text-2xl text-gray-500 italic font-medium leading-relaxed">
                            {section.description}
                        </div>
                        <div className="print-content">
                            {section.content}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HelpPage;
