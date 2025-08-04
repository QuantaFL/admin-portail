import { Component, OnInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { TimetableFacade } from '../../services/timetable.facade';
import { TimetableService, ProcessedTimetable, TimetableConfig } from '../../services/timetable.service';
import { TeacherReportData } from '../../services/pdf-export.service';
import { TeacherStore } from '../../services/teacher.store';
import { Assignment } from '../../models/assignment';
import { Teacher } from '../../models/teacher';

interface TimetableSlot {
  subject: string;
  className: string;
  startTime: string;
  endTime: string;
  color: string;
}

@Component({
  selector: 'app-teacher-timetable',
  templateUrl: './teacher-timetable.component.html',
  styleUrls: ['./teacher-timetable.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class TeacherTimetableComponent implements OnInit, OnDestroy {
  @ViewChild('timetableContainer', { static: false }) timetableContainer!: ElementRef;

  daysOfWeek: string[] = [];
  timeSlots: string[] = [];
  timetable: ProcessedTimetable = {};
  isExporting = false;

  currentTeacher: Teacher | null = null;
  assignments: Assignment[] = [];
  config: TimetableConfig;

  private destroy$ = new Subject<void>();

  constructor(
    private timetableFacade: TimetableFacade,
    private timetableService: TimetableService,
    private teacherStore: TeacherStore
  ) {
    this.config = this.timetableFacade.getDefaultConfig();
    this.daysOfWeek = this.config.daysOfWeek;
    this.timeSlots = this.timetableFacade.getTimeSlots(this.config);
  }

  ngOnInit(): void {
    this.initializeTimetable();
    this.loadTeacherData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize empty timetable structure
   */
  private initializeTimetable(): void {
    this.timetable = {};
    this.daysOfWeek.forEach(day => {
      this.timetable[day] = {};
    });
  }

  /**
   * Load teacher data and process timetable
   */
  private loadTeacherData(): void {
    this.teacherStore.currentTeacher$
      .pipe(takeUntil(this.destroy$))
      .subscribe(teacher => {
        this.currentTeacher = teacher;
        if (teacher) {
          this.loadTimetableData(teacher.id);
        }
      });
  }

  /**
   * Load and process timetable data for teacher
   */
  private loadTimetableData(teacherId: number): void {
    this.timetableService.getTeacherTimetable(teacherId, this.config)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (processedTimetable) => {
          this.timetable = processedTimetable;
        },
        error: (error) => {
          console.error('Failed to load timetable:', error);

        }
      });

    this.teacherStore.currentTeacher$
      .pipe(takeUntil(this.destroy$))
      .subscribe(teacher => {
        if (teacher) {
          this.assignments = teacher.assignements || [];
        }
      });
  }

  /**
   * Export timetable as PDF
   */
  async exportTimetablePDF(): Promise<void> {
    if (!this.currentTeacher) {
      console.error('No teacher data available for export');
      return;
    }

    this.isExporting = true;

    try {
      await this.timetableFacade.exportTimetable(
        this.currentTeacher,
        this.timetable,
        this.config
      );
    } catch (error) {
      console.error('Export failed:', error);
      alert('Erreur lors de la génération du PDF. Veuillez réessayer.');
    } finally {
      this.isExporting = false;
    }
  }

  /**
   * Export complete teacher report as PDF
   */
  async exportTeacherReport(): Promise<void> {
    if (!this.currentTeacher) {
      console.error('No teacher or assignment data available for report');
      return;
    }

    this.isExporting = true;

    try {
      const reportData: TeacherReportData = {
        teacher: this.currentTeacher,
        assignments: this.assignments,
        timetable: this.timetable,
        config: this.config
      };

      await this.timetableFacade.exportTeacherReport(reportData);
    } catch (error) {
      console.error('Report export failed:', error);
      alert('Erreur lors de la génération du rapport. Veuillez réessayer.');
    } finally {
      this.isExporting = false;
    }
  }

  /**
   * Get assignments for a specific day (for template use)
   */
  getDayAssignments(day: string): TimetableSlot[] {
    return this.timetableFacade.getDayAssignments(this.timetable, day);
  }

  /**
   * Get assignment summary (for template use)
   */
  getAssignmentSummary(): { subjects: string[], classes: string[] } {
    return this.timetableFacade.getAssignmentSummary(this.assignments);
  }

  /**
   * Get teacher's full name (for template use)
   */
  getTeacherFullName(): string {
    if (!this.currentTeacher) return 'Enseignant';
    const firstName = this.currentTeacher.userModel?.first_name || '';
    const lastName = this.currentTeacher.userModel?.last_name || '';
    return `${firstName} ${lastName}`.trim() || `Enseignant ${this.currentTeacher.id}`;
  }
}
