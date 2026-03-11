
import { SchoolHeaderWeb } from './SchoolHeaderWeb';
import { SchoolLogoWeb } from './SchoolLogoWeb';
import { TermInfoWeb } from './TermInfoWeb';
import { StudentProfileWeb } from './StudentProfileWeb';
import { StudentPhotoWeb } from './StudentPhotoWeb';
import { AttendanceWeb } from './AttendanceWeb';
import { ScoreSummaryWeb } from './ScoreSummaryWeb';
import { AcademicTableWeb } from './AcademicTableWeb';
import { AffectiveTraitsWeb } from './AffectiveTraitsWeb';
import { PsychomotorWeb } from './PsychomotorWeb';
import { BehaviourKeyWeb } from './BehaviourKeyWeb';
import { GradeKeyWeb } from './GradeKeyWeb';
import { CommentsWeb } from './CommentsWeb';

export const WEB_COMPONENT_REGISTRY: Record<string, React.FC<any>> = {
    SchoolHeader: SchoolHeaderWeb,
    SchoolLogo: SchoolLogoWeb,
    TermInfo: TermInfoWeb,
    StudentProfile: StudentProfileWeb,
    StudentPhoto: StudentPhotoWeb,
    Attendance: AttendanceWeb,
    ScoreSummary: ScoreSummaryWeb,
    AcademicTable: AcademicTableWeb,
    AffectiveTraits: AffectiveTraitsWeb,
    Psychomotor: PsychomotorWeb,
    BehaviourKey: BehaviourKeyWeb,
    GradeKey: GradeKeyWeb,
    Comments: CommentsWeb,
};
