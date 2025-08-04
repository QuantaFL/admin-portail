// Utility cache interface for dashboard home
interface DashboardCache<T> {
  key: string;
  data: T;
}

import {Component, Input, OnInit} from '@angular/core';
import {TeacherDashboardService} from '../../services/teacher-dashboard.service';
import {AcademicYear} from '../../models/academic-year';
import {Term} from '../../models/term';
import {TeacherStore} from '../../services/teacher.store';
import {Teacher} from '../../models/teacher';
import {Subject} from '../../models/subject';
import {PerformanceSummary} from '../../models/performance-summary';
import {of} from 'rxjs';
import {catchError, filter, switchMap, tap} from 'rxjs/operators';
import {Assignment} from "../../models/assignment";
  interface Terms {
  start: Date;
  end: Date;
}
@Component({
  selector: 'app-teacher-dashboard-home',
  templateUrl: './teacher-dashboard-home.component.html',
  styleUrl: './teacher-dashboard-home.component.scss'
})
export class TeacherDashboardHomeComponent implements OnInit {
  currentAcademicYear: AcademicYear | null = null;
  currentTerm: Term | null = null;
  currentTeacher: Teacher | null = null;
  uniqueSubjects: Subject[] = [];
  subjectIdToSubject: { [id: number]: Subject } = {};
  uniqueSubjectIds: number[] = [];
  assignements: Assignment[] = [];
  @Input() isSidebarCollapsed: boolean = false;
  performanceSummary: PerformanceSummary | null = null;
  progressPercent: number = 0;
  daysRemaining: number = 0;
  scheduledExamsCount: number = 0;

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

  constructor(private teacherDashboardService: TeacherDashboardService, private teacherStore: TeacherStore) { }

  ngOnInit(): void {
    this.teacherStore.currentTeacher$.pipe(
      filter(teacher => !!teacher),
      tap(teacher => {
        this.currentTeacher = teacher;
        // Academic year cache
        const yearCacheKey = `dashboard_academic_year_${teacher!.id}`;
        const maxAge = 5 * 60 * 1000;
        const yearCache = this.getCache<AcademicYear>(yearCacheKey, maxAge);
        if (yearCache) {
          this.currentAcademicYear = yearCache;
          this.calculateProgressAndDays();
          this.fetchScheduledExams();
        } else {
          this.teacherDashboardService.getCurrentAcademicYear().subscribe(year => {
            this.currentAcademicYear = year;
            this.setCache(yearCacheKey, year);
            this.calculateProgressAndDays();
            this.fetchScheduledExams();
          });
        }
        // Term cache
        const termCacheKey = `dashboard_term_${teacher!.id}`;
        const termCache = this.getCache<Term>(termCacheKey, maxAge);
        if (termCache) {
          this.currentTerm = termCache;
        } else {
          this.teacherDashboardService.getCurrentTerm().subscribe(term => {
            this.currentTerm = term;
            this.setCache(termCacheKey, term);
          });
        }
      }),
      switchMap(teacher => {
        const maxAge = 5 * 60 * 1000;
        const assignmentsCacheKey = `dashboard_assignments_${teacher!.id}`;
        const assignmentsCache = this.getCache<Assignment[]>(assignmentsCacheKey, maxAge);
        if (assignmentsCache) {
          this.assignements = assignmentsCache;
          this.uniqueSubjectIds = Array.from(new Set(assignmentsCache.map(a => a.subject_id).filter((id: number) => !!id)));
          return of(assignmentsCache);
        }
        return this.teacherDashboardService.getAssignmentsForTeacher(teacher!.id).pipe(
          tap(assignments => {
            this.assignements = assignments;
            this.setCache(assignmentsCacheKey, assignments);
            this.uniqueSubjectIds = Array.from(new Set(assignments.map(a => a.subject_id).filter((id: number) => !!id)));
          })
        );
      }),
      switchMap(() => {
        const maxAge = 5 * 60 * 1000;
        if (this.uniqueSubjectIds.length > 0) {
          const subjectsCacheKey = `dashboard_subjects_${(this.currentTeacher && this.currentTeacher.id) || 'unknown'}`;
          const subjectsCache = this.getCache<Subject[]>(subjectsCacheKey, maxAge);
          if (subjectsCache) {
            this.uniqueSubjects = subjectsCache;
            this.subjectIdToSubject = {};
            for (const subj of subjectsCache) {
              this.subjectIdToSubject[subj.id] = subj;
            }
            return of(subjectsCache);
          }
          return this.teacherDashboardService.fetchSubjectsByIds(this.uniqueSubjectIds).pipe(
            tap(subjects => {
              this.uniqueSubjects = subjects;
              this.setCache(subjectsCacheKey, subjects);
              this.subjectIdToSubject = {};
              for (const subj of subjects) {
                this.subjectIdToSubject[subj.id] = subj;
              }
            }),
            catchError(err => {
              console.error('Error fetching subjects:', err);
              this.uniqueSubjects = [];
              this.subjectIdToSubject = {};
              return of([]);
            })
          );
        } else {
          this.uniqueSubjects = [];
          this.subjectIdToSubject = {};
          return of([]);
        }
      }),
      switchMap(() => {
        const maxAge = 5 * 60 * 1000;
        const classSubjects = this.assignements
          .filter(a => a.class_model_id && a.subject_id)
          .map(a => ({ classId: a.class_model_id, subjectId: a.subject_id }));
        if (classSubjects.length > 0) {
          const perfCacheKey = `dashboard_perf_${(this.currentTeacher && this.currentTeacher.id) || 'unknown'}`;
          const perfCache = this.getCache<PerformanceSummary>(perfCacheKey, maxAge);
          if (perfCache) {
            this.performanceSummary = perfCache;
            return of(perfCache);
          }
          return this.teacherDashboardService.getBulkPerformanceSummary(classSubjects).pipe(
            tap(summary => {
              this.performanceSummary = summary;
              this.setCache(perfCacheKey, summary);
              console.log(summary)
            }),
            catchError(err => {
              this.performanceSummary = null;
              console.error('Error fetching bulk performance summary:', err);
              return of(null);
            })
          );
        } else {
          this.performanceSummary = null;
          return of(null);
        }
      }),
      catchError(err => {
        console.error('Error in dashboard data flow:', err);
        return of(null);
      })
    ).subscribe();
  }


  private calculateProgressAndDays(): void {
    if (this.currentAcademicYear) {
      const start = new Date(this.currentAcademicYear.start_date);
      const end = new Date(this.currentAcademicYear.end_date);
      const now = new Date();
      const total = end.getTime() - start.getTime();
      const elapsed = Math.max(0, Math.min(now.getTime() - start.getTime(), total));
      this.progressPercent = total > 0 ? Math.round((elapsed / total) * 100) : 0;
      this.daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    } else {
      this.progressPercent = 0;
      this.daysRemaining = 0;
    }
  }

  /**
   * Fetches the number of scheduled exams for the current academic year and term.
   * Replace with actual service call as needed.
   */
  private fetchScheduledExams(): void {
    // TODO: Replace with actual service call to fetch exams for current term/year
    // Example: this.teacherDashboardService.getScheduledExams(this.currentAcademicYear?.id, this.currentTerm?.id)
    //   .subscribe(exams => this.scheduledExamsCount = exams.length);
    this.scheduledExamsCount = 8; // Placeholder for demo
  }

  private fetchCurrentAcademicYear(): void {
    this.teacherDashboardService.getCurrentAcademicYear().pipe(
      tap(year => {
        this.currentAcademicYear = year;
        this.calculateProgressAndDays();
        this.fetchScheduledExams();
      })
    ).subscribe();
  }

  splitAcademicYear(startDateStr: string, endDateStr: string): { term1: Terms; term2: Terms } {
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



  /**
   * Fetches the current term for the teacher.
   * This should be called after fetching the current academic year.
   */

  fetchCurrentTerm(): void {
    this.teacherDashboardService.getCurrentTerm().subscribe({
      next: (term: Term) => {
        this.currentTerm = term;
      },
      error: (err: any) => {
        console.error('Error fetching current term:', err);
      }
    });
  }

  fetchTeacherProfile(): void {
    this.teacherDashboardService.getTeacherProfile().subscribe({
      next: (teacher: Teacher) => {
        this.currentTeacher = teacher;
        this.teacherStore.setTeacher(teacher); // Update the store with the full profile
        this.setUniqueSubjectsFromTeacher(teacher); // Ensure uniqueSubjects is updated after profile fetch
      },
      error: (err: any) => {
        console.error('Error fetching teacher profile:', err);
      }
    });
  }

  /**
   * Sets uniqueSubjects from the teacher's subjects, deduplicated by subject id.
   * @param teacher The current teacher object
   */
  setUniqueSubjectsFromTeacher(teacher: Teacher): void {
    if (teacher && Array.isArray(teacher.subjects)) {
      const seen = new Set<number>();
      this.uniqueSubjects = teacher.subjects.filter(subj => {
        if (subj && !seen.has(subj.id)) {
          seen.add(subj.id);
          return true;
        }
        return false;
      });
    } else {
      this.uniqueSubjects = [];
    }
  }

  get academicYearLabel(): string {
    return this.currentAcademicYear?.label || 'N/A';
  }

  get termName(): string {
    return this.currentTerm?.name || 'N/A';
  }

  get assignedSubjectsNames(): string {
    // Deprecated: use uniqueSubjects in template instead
    return this.currentTeacher?.subjects?.map(s => s.name).join(', ') || 'N/A';
  }

  /**
   * Returns a comma-separated string of unique subject names for the teacher.
   */
  getUniqueSubjectNames(): string {
    return (this.uniqueSubjects && this.uniqueSubjects.length)
      ? this.uniqueSubjects.map(subject => subject?.name).filter(Boolean).join(', ')
      : '';
  }
}
