// Cache structure for grades
interface GradesCache {
  key: string;
  grades: any[];
}

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TeacherDashboardService } from '../../services/teacher-dashboard.service';
import { Term } from '../../models/term';
import { Grade } from '../../models/grade';
import { StudentSession } from '../../models/student-session';
import { Subject } from '../../models/subject';
import { Dialog } from '@angular/cdk/dialog';
import { StudentDetailsModalComponent } from '../student-details-modal/student-details-modal.component';
import { Assignment } from "../../models/assignment";
import { Student } from '../../models/student';
import { forkJoin } from 'rxjs';
import { TeacherStore } from '../../services/teacher.store';
import { ClassModel } from '../../models/class-model';
import {Teacher} from "../../models/teacher";
import { StudentNote } from '../../models/student-note';
import { ToastrService } from 'ngx-toastr';


@Component({
  selector: 'app-class-details',
  templateUrl: './class-details.component.html',
  styleUrl: './class-details.component.scss'
})
export class ClassDetailsComponent implements OnInit {
  public termSubmitted: boolean = false;
  public finalGrades: { student: Student, finalGrade: number, rank: number }[] = [];
  // Simple in-memory cache for grades batch fetching
  private _gradesCache: GradesCache | null = null;
  // Simple in-memory cache for grades batch fetching
  private _finalGradesCache: { student: Student, finalGrade: number, rank: number }[] | null = null;
  private _finalGradesCacheKey: string = '';
  studentNotes: StudentNote[] = [];
  // Map: assignmentId -> StudentNote[]
  assignmentNotesMap: { [assignmentId: number]: StudentNote[] } = {};
  /**
   * Fetch notes for all assignments of all subjects the teacher teaches in this class.
   * Populates assignmentNotesMap for quick access.
   */
  fetchAllAssignmentNotes(): void {
    if (!this.classId || !this.currentTeacher || this.assignements.length === 0) {
      console.warn('[DEBUG] fetchAllAssignmentNotes early return:', {
        classId: this.classId,
        currentTeacher: this.currentTeacher,
        assignementsLength: this.assignements.length
      });
      return;
    }

    // Use teacher.teacher_id if present, else teacher.id
    const teacherId = (this.currentTeacher as any).teacher_id || this.currentTeacher.id;
    console.log('[DEBUG] fetchAllAssignmentNotes using teacherId:', teacherId);
    const requests = [];
    for (const assignment of this.assignements) {
      if (!assignment.subject_id) continue;
      console.log('[DEBUG] Fetching notes for assignment:', assignment.id, 'subject:', assignment.subject_id, 'teacher:', this.currentTeacher.id);
      requests.push(
        this.teacherDashboardService.getTeacherClassAssignmentsNotes(
          teacherId,
          this.classId,
          assignment.subject_id,
          assignment.id
        )
          .pipe()
      );
    }
    if (requests.length === 0) return;
    // Use forkJoin to fetch all notes in parallel
    forkJoin(requests).subscribe({
      next: (allNotes: StudentNote[][]) => {
        this.assignmentNotesMap = {};
        let hasSubmittedGrade = false;
        for (let i = 0; i < this.assignements.length; i++) {
          const assignment = this.assignements[i];
          if (!assignment.subject_id) continue;
          this.assignmentNotesMap[assignment.id] = allNotes[i] || [];
          // Check for submitted status in any grade
          for (const note of allNotes[i] || []) {
            for (const grade of note.grades) {
              if (grade.status === 'submitted') {
                hasSubmittedGrade = true;
                break;
              }
            }
            if (hasSubmittedGrade) break;
          }
        }
        // Set studentNotes and grades for the first assignment (if any)
        const firstAssignment = this.assignements[0];
        if (firstAssignment) {
          this.studentNotes = this.assignmentNotesMap[firstAssignment.id] || [];
          // Flatten grades for this assignment for UI use
          this.grades = [];
          const notes = this.assignmentNotesMap[firstAssignment.id] || [];
          console.log('[DEBUG] Notes for first assignment:', notes);
          for (const note of notes) {
            // Find the full student session object
            const studentSession = this.students
              .map(s => s.latest_student_session)
              .find(ss => ss && ss.id === note.student_session_id);
            console.log('[DEBUG] Processing note:', note, 'Found studentSession:', studentSession);
            for (const grade of note.grades) {
              console.log('[DEBUG] Adding grade:', grade, 'for studentSession:', studentSession, 'assignment:', firstAssignment);
              this.grades.push({
                ...grade,
                student_session: studentSession || { id: note.student_session_id },
                assignement: firstAssignment,
              });
            }
          }
          console.log('[DEBUG] Final grades array:', this.grades);
        }
        // Pre-fill gradeInputs for all assignments
        for (const assignment of this.assignements) {
          const notes = this.assignmentNotesMap[assignment.id] || [];
          for (const note of notes) {
            const sessionId = note.student_session_id;
            for (const grade of note.grades) {
              const key = `${sessionId}_${assignment.id}_${grade.type}`;
              this.gradeInputs[key] = grade.mark;
            }
          }
        }
        if (hasSubmittedGrade) {
          this.termSubmitted = true;
          this.computeFinalGradesAndRank();
        }
        console.log('Fetched all assignment notes:', this.assignmentNotesMap);
      },
      error: (err) => {
        this.assignmentNotesMap = {};
        console.error('Error fetching all assignment notes:', err);
      }
    });
  }


  /**
   * Fetch student notes for a specific assignment in this class, subject, and teacher.
   */
  fetchStudentNotesForAssignment(subjectId: number, assignmentId: number): void {
    if (!this.classId || !subjectId || !assignmentId || !this.currentTeacher) return;
    // Use teacher.teacher_id if present, else teacher.id
    const teacherId = (this.currentTeacher as any).teacher_id || this.currentTeacher.id;
    console.log('[DEBUG] fetchStudentNotesForAssignment using teacherId:', teacherId);
    this.teacherDashboardService.getTeacherClassAssignmentsNotes(
      teacherId,
      this.classId,
      subjectId,
      assignmentId
    ).subscribe({
      next: (notes: StudentNote[]) => {
        this.studentNotes = notes;
        // Flatten grades for this assignment for UI use
        this.grades = [];
        // Find the assignment object
        const assignmentObj = this.assignements.find(a => a.id === assignmentId);
        let hasSubmittedGrade = false;
        console.log('[DEBUG] Notes for assignment', assignmentId, ':', notes);
        for (const note of notes) {
          // Find the full student session object
          const studentSession = this.students
            .map(s => s.latest_student_session)
            .find(ss => ss && ss.id === note.student_session_id);
          console.log('[DEBUG] Processing note:', note, 'Found studentSession:', studentSession);
          for (const grade of note.grades) {
            if (grade.status === 'submitted') {
              hasSubmittedGrade = true;
            }
            console.log('[DEBUG] Adding grade:', grade, 'for studentSession:', studentSession, 'assignment:', assignmentObj);
            this.grades.push({
              ...grade,
              student_session: studentSession || { id: note.student_session_id },
              assignement: assignmentObj || { id: assignmentId },
            });
            const key = `${note.student_session_id}_${assignmentId}_${grade.type}`;
            this.gradeInputs[key] = grade.mark;
          }
        }
        if (hasSubmittedGrade) {
          this.termSubmitted = true;
          this.computeFinalGradesAndRank();
        }
        console.log('[DEBUG] Final grades array:', this.grades);
        console.log('Fetched student notes for assignment:', notes);
      },
      error: (err) => {
        this.studentNotes = [];
        this.grades = [];
        console.error('Error fetching student notes for assignment:', err);
      }
    });
  }
  classId: number | null = null;
  currentClass: ClassModel | null = null;
  currentTerm: Term | null = null;
  grades: any[] = [];
  students: Student[] = [];
  uniqueSubjectIds: number[] = []; // Changed to number[] for subject IDs
  gradeTypes: string[] = ['exam', 'quiz'];
  assignements: Assignment[] = [];
  currentTeacher : Teacher | null = null;
  // Always show these types
  loading: boolean = false;
  errorMessage: string = '';
  gradeInputs: { [key: string]: number | null } = {};
  uniqueSubjects: Subject[] = [];
  subjectIdToSubject: { [id: number]: Subject } = {};

  constructor(
    private route: ActivatedRoute,
    private teacherDashboardService: TeacherDashboardService,
    private dialog: Dialog,
    private teacherStore: TeacherStore,
    private toast: ToastrService
  ) { }
  /**
   * Utility for localStorage caching with expiry
   */
  private getCache<T>(key: string, maxAgeMs: number): T | null {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.ts < maxAgeMs) {
        return parsed.data as T;
      }
    } catch {}
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.classId = Number(params.get('id'));
      if (this.classId) {
        this.fetchClassDetailsAndGrades();

      }
    });
  }

  fetchClassDetailsAndGrades(): void {
    if (!this.classId) return;
    // 5 min expiry
    const maxAge = 5 * 60 * 1000;
    // Try cache for term and class
    const termCache = this.getCache<any>(`term_${this.classId}`, maxAge);
    const classCache = this.getCache<any>(`class_${this.classId}`, maxAge);
    if (termCache && classCache) {
      this.currentTerm = termCache;
      this.currentClass = classCache;
      const studentIds = (classCache.current_academic_year_student_sessions).map((session: StudentSession) => session.student_id);
      const studentsCache = this.getCache<any[]>(`students_${this.classId}`, maxAge);
      if (studentsCache) {
        this.students = studentsCache;
        this.fetchTeacherAssignmentsAndGrades();
        return;
      }
    }
    // Fallback to backend
    forkJoin({
      currentTerm: this.teacherDashboardService.getCurrentTerm(),
      currentClass: this.teacherDashboardService.getClassById(this.classId),
    }).subscribe({
      next: ({ currentTerm, currentClass }) => {
        this.currentTerm = currentTerm;
        this.currentClass = currentClass;
        this.setCache(`term_${this.classId}`, currentTerm);
        this.setCache(`class_${this.classId}`, currentClass);
        const studentIds = (currentClass.current_academic_year_student_sessions).map((session: StudentSession) => session.student_id);
        if (studentIds.length > 0) {
          this.teacherDashboardService.fetchStudentsByIds(studentIds).subscribe({
            next: (students) => {
              this.students = students;
              this.setCache(`students_${this.classId}`, students);
              this.fetchTeacherAssignmentsAndGrades();
            },
            error: (err) => {
              this.students = [];
              console.error('Error fetching students by IDs:', err);
            }
          });
        } else {
          this.students = [];
        }
      },
      error: (err: any) => {
        console.error('Error fetching class details or students:', err);
      }
    });
  }

  /**
   * Fetch assignments for this class, then grades. Ensures uniqueSubjects is always set.
   */
  fetchTeacherAssignmentsAndGrades(): void {
    if (!this.classId) return;
    this.teacherStore.currentTeacher$.subscribe(teacher => {
      if (!teacher) return;
      this.currentTeacher = teacher;
      const teacherId = (teacher as any).teacher_id || teacher.id;
      // 5 min expiry
      const maxAge = 5 * 60 * 1000;
      const assignmentsCache = this.getCache<any[]>(`assignments_${this.classId}_${teacherId}`, maxAge);
      if (assignmentsCache) {
        this.assignements = assignmentsCache.filter(a => a.class_model_id === this.classId);
        this.uniqueSubjectIds = this.assignements.map(a => a.subject?.id).filter((id): id is number => !!id);
        this.gradeTypes = ['quiz', 'exam'];
        const subjectsCache = this.getCache<any[]>(`subjects_${this.classId}_${teacherId}`, maxAge);
        if (subjectsCache) {
          this.uniqueSubjects = subjectsCache;
          this.subjectIdToSubject = {};
          for (const subj of subjectsCache) {
            this.subjectIdToSubject[subj.id] = subj;
          }
          if (subjectsCache.length > 0 && this.assignements.length > 0) {
            this.fetchAllAssignmentNotes();
          } else {
            this.fetchGradesForAllStudents();
          }
          return;
        }
      }
      // Fallback to backend
      this.teacherDashboardService.getAssignmentsForTeacher(teacherId).subscribe({
        next: (assignments) => {
          this.setCache(`assignments_${this.classId}_${teacherId}`, assignments);
          const filteredAssignments = assignments.filter(a => a.class_model_id === this.classId);
          this.assignements = filteredAssignments;
          this.uniqueSubjectIds = this.assignements.map(a => a.subject?.id).filter((id): id is number => !!id);
          this.gradeTypes = ['quiz', 'exam'];
          if (this.uniqueSubjectIds.length > 0) {
            this.teacherDashboardService.fetchSubjectsByIds(this.uniqueSubjectIds).subscribe({
              next: (subjects: Subject[]) => {
                this.setCache(`subjects_${this.classId}_${teacherId}`, subjects);
                this.uniqueSubjects = subjects;
                this.subjectIdToSubject = {};
                for (const subj of subjects) {
                  this.subjectIdToSubject[subj.id] = subj;
                }
                if (subjects.length > 0 && this.assignements.length > 0) {
                  this.fetchAllAssignmentNotes();
                } else {
                  this.fetchGradesForAllStudents();
                }
              },
              error: (err) => {
                this.uniqueSubjects = [];
                this.subjectIdToSubject = {};
                this.fetchGradesForAllStudents();
                console.error('Error fetching subjects:', err);
              }
            });
          } else {
            this.uniqueSubjects = [];
            this.subjectIdToSubject = {};
            this.fetchGradesForAllStudents();
          }
        },
        error: (err) => {
          this.assignements = [];
          this.uniqueSubjectIds = [];
          this.uniqueSubjects = [];
          this.subjectIdToSubject = {};
          this.gradeTypes = ['quiz', 'exam'];
          console.error('Error fetching assignments:', err);
        }
      });
    });
  }

  /**
   * Fetch all grades for all students in the class, using the new batch endpoint and passing all available context.
   */
  fetchGradesForAllStudents(): void {
    if (!this.classId || !this.currentTerm || this.students.length === 0) return;

    let teacherId: number | undefined;
    if (this.currentTeacher && this.currentTeacher.id) {
      teacherId = this.currentTeacher.id;
    }
    // Create a cache key based on class, term, teacher
    const cacheKey = `${this.classId}|${this.currentTerm.id}|${teacherId}`;
    if (this._gradesCache && this._gradesCache.key === cacheKey) {
      this.grades = this._gradesCache.grades;
      this.gradeInputs = {};
      for (const student of this.students) {
        const sessionId = student.latest_student_session?.id;
        if (!sessionId) continue;
        for (const assignment of this.assignements) {
          for (const type of this.gradeTypes) {
            const key = `${sessionId}_${assignment.id}_${type}`;
            const grade = this.grades.find(g => g.student_session?.id === sessionId && g.assignement?.id === assignment.id && g.type === type);
            this.gradeInputs[key] = grade ? grade.mark : null;
          }
        }
      }
      return;
    }
    this.teacherDashboardService.getAllGradesForClass(
      this.classId,
      teacherId
    ).subscribe({
      next: (response: any[]) => {
        // Flatten grades from backend response
        const flatGrades: any[] = [];
        for (const entry of response) {
          // If grades is an error, log assignment and student session IDs
          if (entry.grades && entry.grades.error) {
            const sessionId = entry.student_session?.id || 'unknown';
            console.warn(`Assignment not found for Student Session ID: ${sessionId}. Assignment ID not present in backend response.`);
            continue;
          }
          if (Array.isArray(entry.grades)) {
            for (const grade of entry.grades) {
              flatGrades.push({
                ...grade,
                student: entry.student,
                student_session: entry.student_session
              });
            }
          }
        }
        this.grades = flatGrades;
        // Cache the grades
        this._gradesCache = { key: cacheKey, grades: flatGrades };
        this.gradeInputs = {};
        for (const student of this.students) {
          const sessionId = student.latest_student_session?.id;
          if (!sessionId) continue;
          for (const assignment of this.assignements) {
            for (const type of this.gradeTypes) {
              const key = `${sessionId}_${assignment.id}_${type}`;
              const grade = this.grades.find(g => g.student_session?.id === sessionId && g.assignement?.id === assignment.id && g.type === type);
              this.gradeInputs[key] = grade ? grade.mark : null;
            }
          }
        }
        // Log for debugging
        console.log('gradeInputs:', this.gradeInputs);
        console.log('assignements:', this.assignements);
        console.log('gradeTypes:', this.gradeTypes);
        console.log('students:', this.students);
      },
      error: (err: any) => {
        console.error('Error fetching grades for class:', err);
      }
    });
  }

  getGrade(studentSessionId: number, assignmentId: number, type: string): number | null {
    const key = `${studentSessionId}_${assignmentId}_${type}`;
    if (this.gradeInputs.hasOwnProperty(key)) {
      const value = this.gradeInputs[key];
      if (value === null) {
       } else {
        // console.log('getGrade: Found grade for', { studentSessionId, assignmentId, type, value });
      }
      return value;
    }
    const grade = this.grades.find(g => {
      const match = g.student_session?.id === studentSessionId &&
        g.assignement?.id === assignmentId &&
        g.type === type;
      if (match) {
        console.log('getGrade: Matched grade object', { studentSessionId, assignmentId, type, grade });
      }
      return match;
    });
    // Removed 'getGrade: No grade found for' log as requested
    return grade ? grade.mark : null;
  }

  updateGrades(studentId: number, subjectId: number, type: string, event: any): void {
    const value = event.target.value === '' ? null : Number(event.target.value);
    const key = `${studentId}_${subjectId}_${type}`;
    this.gradeInputs[key] = value;
  }

  saveGrades(): void {
    if (!this.currentTerm) return;
    this.loading = true;
    this.errorMessage = '';
    const gradesBatch: any[] = [];
    for (const student of this.students) {
      const sessionId = student.latest_student_session?.id;
      if (!sessionId) continue;
      for (const assignment of this.assignements) {
        for (const type of this.gradeTypes) {
          const key = `${sessionId}_${assignment.id}_${type}`;
          const mark = this.gradeInputs[key];
          if (mark === null || mark === undefined || isNaN(mark)) continue;
          gradesBatch.push({
            student_session_id: sessionId,
            assignement_id: assignment.id,
            type,
            mark
          });
        }
      }
    }
    if (gradesBatch.length === 0) {
      this.loading = false;
      return;
    }
    console.log('Saving grades batch:', gradesBatch);
    this.teacherDashboardService.addGradesBatch(gradesBatch).subscribe({
      next: () => {
        // After saving, refresh student notes for the first assignment of the first subject
        if (this.uniqueSubjects.length > 0 && this.assignements.length > 0) {
          const firstSubject = this.uniqueSubjects[0];
          const firstAssignment = this.assignements.find(a => a.subject_id === firstSubject.id);
          if (firstAssignment) {
            this.fetchStudentNotesForAssignment(firstSubject.id, firstAssignment.id);
          }
        }
        this.loading = false;
        this.toast.success('Notes enregistrées avec succès !', 'Succès');
      },
      error: (err: any) => {
        this.errorMessage = 'Erreur lors de l\'enregistrement des notes.';
        this.loading = false;
        this.toast.error(this.errorMessage, 'Erreur');
      }
    });
  }

  submitMessage: string = '';

  canSubmitTermGrades(): boolean {
    if (!this.currentTerm) {
      // console.log('[canSubmitTermGrades] Disabled: No currentTerm');
      return false;
    }
    const now = new Date();
    let termEnd: Date | null = null;
    const academicYear = this.currentTerm.academic_year;
    if (academicYear) {
      const split = this.splitAcademicYear(academicYear.start_date, academicYear.end_date);
      if (this.currentTerm.name && this.currentTerm.name.toLowerCase().includes('1')) {
        termEnd = split.term1.end;
      } else {
        termEnd = split.term2.end;
      }
    }
    if (!termEnd && (this.currentTerm as any).end_date) {
      termEnd = new Date((this.currentTerm as any).end_date);
    }
    if (!termEnd) {
      console.log('[canSubmitTermGrades] Disabled: No termEnd');
      return false;
    }
    const msInWeek = 1000 * 60 * 60 * 24 * 7;
    const weeksLeft = (termEnd.getTime() - now.getTime()) / msInWeek;
    console.log('[canSubmitTermGrades] termEnd:', termEnd, 'now:', now, 'weeksLeft:', weeksLeft);
    if (weeksLeft < 0) {
      console.log('[canSubmitTermGrades] Disabled: Term already ended');
      return false;
    }
    // At least one student must have a non-empty grade
    let hasNonEmptyGrade = false;
    for (const student of this.students) {
      const sessionId = student.latest_student_session?.id;
      if (!sessionId) continue;
      for (const assignment of this.assignements) {
        for (const type of this.gradeTypes) {
          const key = `${sessionId}_${assignment.id}_${type}`;
          const mark = this.gradeInputs[key];
          if (mark !== null && mark !== undefined) {
            hasNonEmptyGrade = true;
            console.log('[canSubmitTermGrades] Found non-empty grade:', { key, mark });
            break;
          }
        }
        if (hasNonEmptyGrade) break;
      }
      if (hasNonEmptyGrade) break;
    }
    if (!hasNonEmptyGrade) {
      console.log('[canSubmitTermGrades] Disabled: No non-empty grades found');
      return false;
    } else {
      console.log('[canSubmitTermGrades] Enabled: At least one non-empty grade found');
    }
    return true;
  }

  /**
   * Splits an academic year into two terms, returns { term1, term2 } with start and end dates.
   * Copied from teacher-dashboard-home.component.ts for term logic.
   */
  splitAcademicYear(startDateStr: string, endDateStr: string): { term1: { start: Date; end: Date }; term2: { start: Date; end: Date } } {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("Invalid start or end date");
    }
    const totalTime = endDate.getTime() - startDate.getTime();
    const halfTime = totalTime / 2;
    const midDate = new Date(startDate.getTime() + halfTime);
    midDate.setHours(0, 0, 0, 0);
    const term1End = new Date(midDate);
    term1End.setDate(term1End.getDate() - 1);
    return {
      term1: { start: startDate, end: term1End },
      term2: { start: midDate, end: endDate }
    };
  }

  onSubmitTermGrades(): void {
    this.submitMessage = '';
    if (!this.currentTerm || !this.classId) {
      this.submitMessage = 'Terme ou classe non disponible.';
      return;
    }
    // Custom confirmation UI (could be a modal, here just a styled message)
    if (!window.confirm('Êtes-vous sûr de vouloir soumettre les notes pour ce terme ? Cette action est irréversible.')) {
      this.submitMessage = 'Soumission annulée.';
      return;
    }
    this.loading = true;
    this.teacherDashboardService.submitTermNotes(this.classId, this.currentTerm.id).subscribe({
      next: (res) => {
        this.submitMessage = 'Notes du terme soumises avec succès !';
        this.toast.success('Notes du terme soumises avec succès !', 'Succès');
        // After submitting, reload the class details to lock the UI and show the final sheet
        this.fetchClassDetailsAndGrades();
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors de la soumission des notes du terme:', err);
        this.submitMessage = 'Erreur lors de la soumission des notes du terme.';
        this.errorMessage = 'Erreur lors de la soumission des notes du terme.';
        this.loading = false;
        this.toast.error('Erreur lors de la soumission des notes du terme. Veuillez vérifier la console pour plus de détails.', 'Erreur');
      }
    });
  }

  showStudentInfo(student: Student) {
    this.dialog.open(StudentDetailsModalComponent, {
      data: student,
      panelClass: 'custom-dialog-container'
    });
  }


  /**
   * Computes the final grade for each student and assigns a rank based on descending order.
   * Called when the term is submitted or when any grade is locked.
   */
  computeFinalGradesAndRank(): void {
    // Create a cache key based on grades, students, and assignments
    const gradesKey = JSON.stringify(this.gradeInputs);
    const studentsKey = JSON.stringify(this.students.map(s => s.id));
    const assignmentsKey = JSON.stringify(this.assignements.map(a => a.id));
    const cacheKey = gradesKey + '|' + studentsKey + '|' + assignmentsKey;
    if (this._finalGradesCache && this._finalGradesCacheKey === cacheKey) {
      this.finalGrades = this._finalGradesCache;
      return;
    }
    if (!this.students || this.students.length === 0) {
      this.finalGrades = [];
      this._finalGradesCache = [];
      this._finalGradesCacheKey = cacheKey;
      return;
    }
    // Compute average for each student
    const studentAverages = this.students.map((student: any) => {
      const sessionId = student.latest_student_session?.id;
      if (!sessionId) return { student, finalGrade: 0 };
      // Collect all grades for this student
      let total = 0;
      let count = 0;
      for (const assignment of this.assignements || []) {
        for (const type of this.gradeTypes || []) {
          const key = `${sessionId}_${assignment.id}_${type}`;
          const mark = this.gradeInputs ? this.gradeInputs[key] : null;
          if (mark !== null && mark !== undefined && !isNaN(mark)) {
            total += mark;
            count++;
          }
        }
      }
      const avg = count > 0 ? total / count : 0;
      return { student, finalGrade: Math.round(avg * 100) / 100 };
    });
    // Sort by finalGrade descending
    const sorted = [...studentAverages].sort((a, b) => b.finalGrade - a.finalGrade);
    // Assign rank (1-based, handle ties)
    let lastGrade: number | null = null;
    let lastRank = 0;
    let actualRank = 0;
    const ranked = sorted.map((entry, idx) => {
      actualRank++;
      if (lastGrade !== null && entry.finalGrade === lastGrade) {
        // Same grade as previous, same rank
        return { ...entry, rank: lastRank };
      } else {
        lastRank = actualRank;
        lastGrade = entry.finalGrade;
        return { ...entry, rank: lastRank };
      }
    });
    // Restore original student order for display, but keep rank
    this.finalGrades = this.students.map((student: any) => {
      const found = ranked.find((r: any) => r.student.id === student.id);
      return found ? found : { student, finalGrade: 0, rank: ranked.length };
    });
    // Cache the result
    this._finalGradesCache = this.finalGrades;
    this._finalGradesCacheKey = cacheKey;
  }

  /**
   * Returns the final grades sorted by rank ascending for display.
   */
  get sortedFinalGrades() {
    return [...this.finalGrades].sort((a, b) => a.rank - b.rank);
  }
}
