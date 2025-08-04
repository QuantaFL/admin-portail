import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Assignment } from '../models/assignment';
import { TeacherDashboardService } from './teacher-dashboard.service';

export interface TimetableSlot {
  subject: string;
  className: string;
  startTime: string;
  endTime: string;
  color: string;
}

export interface ProcessedTimetable {
  [day: string]: { [timeSlot: string]: TimetableSlot };
}

export interface TimetableConfig {
  startTime: string;
  endTime: string;
  intervalMinutes: number;
  daysOfWeek: string[];
}

@Injectable({
  providedIn: 'root'
})
export class TimetableService {

  private readonly dayMapping: { [key: string]: string } = {
    'monday': 'Monday',
    'tuesday': 'Tuesday',
    'wednesday': 'Wednesday',
    'thursday': 'Thursday',
    'friday': 'Friday',
    'saturday': 'Saturday',
    'sunday': 'Sunday'
  };

  private readonly colorPalette = [
    '#FFADAD', '#FFD6A5', '#FDFFB6', '#CAFFBF',
    '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF'
  ];

  private subjectColorMap = new Map<string, string>();

  constructor(private teacherDashboardService: TeacherDashboardService) {
  }

  /**
   * Get processed timetable for a teacher
   */
  getTeacherTimetable(teacherId: number, config: TimetableConfig): Observable<ProcessedTimetable> {
    return this.teacherDashboardService.getAssignmentsForTeacher(teacherId).pipe(
      map(assignments => this.processAssignments(assignments, config))
    );
  }

  /**
   * Generate time slots for the timetable
   */
  generateTimeSlots(start: string, end: string, intervalMinutes: number): string[] {
    const slots: string[] = [];
    let currentTime = new Date(`1970-01-01T${start}:00`);
    const endTime = new Date(`1970-01-01T${end}:00`);

    while (currentTime < endTime) {
      slots.push(currentTime.toTimeString().substring(0, 5));
      currentTime.setMinutes(currentTime.getMinutes() + intervalMinutes);
    }

    return slots;
  }

  /**
   * Process assignments into a structured timetable
   */
  private processAssignments(assignments: Assignment[], config: TimetableConfig): ProcessedTimetable {
    const timetable: ProcessedTimetable = {};
    const timeSlots = this.generateTimeSlots(config.startTime, config.endTime, config.intervalMinutes);

    // Initialize timetable structure
    config.daysOfWeek.forEach(day => {
      timetable[day] = {};
    });

    assignments.forEach((assignment, index) => {
      if (!this.isValidAssignment(assignment)) {
        console.warn(`Assignment ${index} is invalid:`, assignment);
        return;
      }

      const startTime = this.extractTimeFromDateTime(assignment.start_time);
      const endTime = this.extractTimeFromDateTime(assignment.end_time);

      if (!startTime || !endTime) {
        console.warn(`Assignment ${index} has invalid time format:`, {
          start: assignment.start_time,
          end: assignment.end_time
        });
        return;
      }

      // Process each day for this assignment
      assignment.day_of_week.forEach(dayKey => {
        const dayName = this.dayMapping[dayKey.toLowerCase()];

        if (!dayName || !timetable[dayName]) {
          console.warn(`Invalid day: ${dayKey}`);
          return;
        }

        const matchingTimeSlot = this.findMatchingTimeSlot(startTime, timeSlots);
        if (!matchingTimeSlot) {
          console.warn(`No matching time slot for ${startTime}`);
          return;
        }

        const color = this.getSubjectColor(assignment.subject!.name);

        timetable[dayName][matchingTimeSlot] = {
          subject: assignment.subject!.name,
          className: assignment.classModel!.name,
          startTime,
          endTime,
          color
        };
      });
    });

    return timetable;
  }

  /**
   * Validate assignment has required fields
   */
  private isValidAssignment(assignment: Assignment): boolean {
    return !!(
      assignment.day_of_week &&
      assignment.start_time &&
      assignment.end_time &&
      assignment.subject?.name &&
      assignment.classModel?.name
    );
  }

  /**
   * Extract time (HH:MM) from datetime string
   */
  private extractTimeFromDateTime(datetime: string): string | null {
    try {
      if (datetime.includes('T')) {
        const timePart = datetime.split('T')[1];
        if (timePart) {
          const timeOnly = timePart.substring(0, 5);
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (timeRegex.test(timeOnly)) {
            return timeOnly;
          }
        }
      }

      const date = new Date(datetime);
      if (!isNaN(date.getTime())) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      }

      return null;
    } catch (error) {
      console.error('Error extracting time from datetime:', datetime, error);
      return null;
    }
  }

  /**
   * Find the best matching time slot for a given time
   */
  private findMatchingTimeSlot(targetTime: string, timeSlots: string[]): string | null {
    if (timeSlots.includes(targetTime)) {
      return targetTime;
    }

    const targetMinutes = this.timeToMinutes(targetTime);
    let bestMatch: string | null = null;
    let bestMatchMinutes = -1;

    for (const slot of timeSlots) {
      const slotMinutes = this.timeToMinutes(slot);
      if (slotMinutes <= targetMinutes && slotMinutes > bestMatchMinutes) {
        bestMatch = slot;
        bestMatchMinutes = slotMinutes;
      }
    }

    return bestMatch;
  }

  /**
   * Convert time string to minutes since midnight
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Get or assign color for a subject
   */
  private getSubjectColor(subjectName: string): string {
    if (!this.subjectColorMap.has(subjectName)) {
      const colorIndex = this.subjectColorMap.size % this.colorPalette.length;
      this.subjectColorMap.set(subjectName, this.colorPalette[colorIndex]);
    }
    return this.subjectColorMap.get(subjectName)!;
  }

  /**
   * Get assignments for a specific day from processed timetable
   */
  getDayAssignments(timetable: ProcessedTimetable, day: string): TimetableSlot[] {
    const daySlots = timetable[day] || {};
    return Object.values(daySlots).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  /**
   * Get summary statistics from assignments
   */
  getAssignmentSummary(assignments: Assignment[]): { subjects: string[], classes: string[] } {
    const subjects = new Set<string>();
    const classes = new Set<string>();

    assignments.forEach(assignment => {
      if (assignment.subject?.name) subjects.add(assignment.subject.name);
      if (assignment.classModel?.name) classes.add(assignment.classModel.name);
    });

    return {
      subjects: Array.from(subjects),
      classes: Array.from(classes)
    };
  }
}
