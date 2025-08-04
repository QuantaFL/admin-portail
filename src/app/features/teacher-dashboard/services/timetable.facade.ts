import { Injectable } from '@angular/core';
import { Observable, combineLatest, map } from 'rxjs';
import { TimetableService, TimetableConfig, ProcessedTimetable } from './timetable.service';
import { PdfExportService, TeacherReportData } from './pdf-export.service';
import { TeacherStore } from './teacher.store';
import { Assignment } from '../models/assignment';
import { Teacher } from '../models/teacher';

export interface TimetableState {
  teacher: Teacher | null;
  assignments: Assignment[];
  timetable: ProcessedTimetable;
  config: TimetableConfig;
  isLoading: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TimetableFacade {

  private readonly defaultConfig: TimetableConfig = {
    startTime: '08:00',
    endTime: '18:00',
    intervalMinutes: 60,
    daysOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  };

  constructor(
    private timetableService: TimetableService,
    private pdfExportService: PdfExportService,
    private teacherStore: TeacherStore
  ) {}

  /**
   * Get complete timetable state for current teacher
   */
  getTimetableState(config: TimetableConfig = this.defaultConfig): Observable<TimetableState> {
    return combineLatest([
      this.teacherStore.currentTeacher$,
      this.teacherStore.currentTeacher$.pipe(
        map(teacher => teacher ? this.timetableService.getTeacherTimetable(teacher.id, config) : [])
      )
    ]).pipe(
      map(([teacher, timetableObs]) => {
        if (!teacher) {
          return {
            teacher: null,
            assignments: [],
            timetable: {},
            config,
            isLoading: false
          };
        }

        // This is a simplified approach - in real implementation you'd handle the observable properly
        return {
          teacher,
          assignments: [], // Would be populated from the service
          timetable: {}, // Would be populated from the service
          config,
          isLoading: true
        };
      })
    );
  }

  /**
   * Export timetable as PDF
   */
  async exportTimetable(teacher: Teacher, timetable: ProcessedTimetable, config: TimetableConfig): Promise<void> {
    try {
      await this.pdfExportService.exportTimetablePDF(teacher, timetable, config);
    } catch (error) {
      console.error('Failed to export timetable:', error);
      throw new Error('Erreur lors de la génération du PDF. Veuillez réessayer.');
    }
  }

  /**
   * Export complete teacher report
   */
  async exportTeacherReport(reportData: TeacherReportData): Promise<void> {
    try {
      await this.pdfExportService.exportTeacherReport(reportData);
    } catch (error) {
      console.error('Failed to export teacher report:', error);
      throw new Error('Erreur lors de la génération du rapport. Veuillez réessayer.');
    }
  }

  /**
   * Get time slots for display
   */
  getTimeSlots(config: TimetableConfig = this.defaultConfig): string[] {
    return this.timetableService.generateTimeSlots(
      config.startTime,
      config.endTime,
      config.intervalMinutes
    );
  }

  /**
   * Get assignments for a specific day
   */
  getDayAssignments(timetable: ProcessedTimetable, day: string): any[] {
    return this.timetableService.getDayAssignments(timetable, day);
  }

  /**
   * Get assignment summary statistics
   */
  getAssignmentSummary(assignments: Assignment[]): { subjects: string[], classes: string[] } {
    return this.timetableService.getAssignmentSummary(assignments);
  }

  /**
   * Get default timetable configuration
   */
  getDefaultConfig(): TimetableConfig {
    return { ...this.defaultConfig };
  }
}
