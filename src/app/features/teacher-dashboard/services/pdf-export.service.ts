import { Injectable } from '@angular/core';
import jsPDF from "jspdf";
import { Assignment } from '../models/assignment';
import { Teacher } from '../models/teacher';
import { TimetableSlot, ProcessedTimetable, TimetableConfig } from './timetable.service';

export interface TeacherReportData {
  teacher: Teacher;
  assignments: Assignment[];
  timetable: ProcessedTimetable;
  config: TimetableConfig;
}

@Injectable({
  providedIn: 'root'
})
export class PdfExportService {

  /**
   * Export timetable as PDF in landscape format
   */
  async exportTimetablePDF(
    teacher: Teacher,
    timetable: ProcessedTimetable,
    config: TimetableConfig
  ): Promise<void> {
    const pdf = new jsPDF('l', 'mm', 'a4');

    this.addTimetableHeader(pdf, teacher);
    this.generateTimetableTable(pdf, timetable, config, 20, 50);

    const fileName = this.generateFileName('emploi-du-temps', teacher);
    pdf.save(fileName);
  }

  /**
   * Export complete teacher report as PDF
   */
  async exportTeacherReport(reportData: TeacherReportData): Promise<void> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    let yPosition = 20;

    // Header
    yPosition = this.addReportHeader(pdf, yPosition);

    // Teacher Information
    yPosition = this.addTeacherInfo(pdf, reportData.teacher, yPosition);

    // Assignment Summary
    yPosition = this.addAssignmentSummary(pdf, reportData.assignments, yPosition);

    // Weekly Schedule
    yPosition = this.addWeeklySchedule(pdf, reportData.timetable, reportData.config, yPosition);

    // Visual Timetable
    pdf.addPage();
    this.addVisualTimetableSection(pdf, reportData.timetable, reportData.config);

    // Footer
    this.addReportFooter(pdf);

    const fileName = this.generateFileName('rapport-enseignant', reportData.teacher);
    pdf.save(fileName);
  }

  /**
   * Add timetable header for simple export
   */
  private addTimetableHeader(pdf: jsPDF, teacher: Teacher): void {
    pdf.setFontSize(20);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Emploi du Temps', 20, 20);

    pdf.setFontSize(14);
    pdf.text(`Enseignant: ${this.getTeacherFullName(teacher)}`, 20, 32);
    pdf.text(`Date d'exportation: ${new Date().toLocaleDateString('fr-FR')}`, 20, 40);
  }

  /**
   * Add report header
   */
  private addReportHeader(pdf: jsPDF, yPosition: number): number {
    pdf.setFontSize(22);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Rapport Complet de l\'Enseignant', 20, yPosition);
    return yPosition + 20;
  }

  /**
   * Add teacher information section
   */
  private addTeacherInfo(pdf: jsPDF, teacher: Teacher, yPosition: number): number {
    pdf.setFontSize(16);
    pdf.setTextColor(51, 51, 51);
    pdf.text('Informations Personnelles', 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Nom: ${this.getTeacherFullName(teacher)}`, 25, yPosition);
    yPosition += 8;
    pdf.text(`Date d'embauche: ${this.formatDate(teacher.hire_date)}`, 25, yPosition);
    yPosition += 8;
    pdf.text(`ID Enseignant: ${teacher.id}`, 25, yPosition);

    return yPosition + 18;
  }

  /**
   * Add assignment summary section
   */
  private addAssignmentSummary(pdf: jsPDF, assignments: Assignment[], yPosition: number): number {
    const summary = this.getAssignmentSummary(assignments);

    pdf.setFontSize(16);
    pdf.setTextColor(51, 51, 51);
    pdf.text('Résumé des Affectations', 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Nombre total de cours: ${assignments.length}`, 25, yPosition);
    yPosition += 8;
    pdf.text(`Matières enseignées: ${summary.subjects.join(', ')}`, 25, yPosition);
    yPosition += 8;
    pdf.text(`Classes enseignées: ${summary.classes.join(', ')}`, 25, yPosition);

    return yPosition + 18;
  }

  /**
   * Add weekly schedule breakdown
   */
  private addWeeklySchedule(
    pdf: jsPDF,
    timetable: ProcessedTimetable,
    config: TimetableConfig,
    yPosition: number
  ): number {
    pdf.setFontSize(16);
    pdf.setTextColor(51, 51, 51);
    pdf.text('Planning Hebdomadaire', 20, yPosition);
    yPosition += 10;

    for (const day of config.daysOfWeek) {
      const dayAssignments = this.getDayAssignments(timetable, day);

      if (dayAssignments.length > 0) {
        pdf.setFontSize(14);
        pdf.setTextColor(0, 0, 0);
        pdf.text(`${day}:`, 25, yPosition);
        yPosition += 7;

        dayAssignments.forEach(assignment => {
          const text = `  • ${assignment.startTime}-${assignment.endTime}: ${assignment.subject} (${assignment.className})`;
          pdf.setFontSize(11);
          pdf.text(text, 30, yPosition);
          yPosition += 6;
        });
        yPosition += 5;
      }

      // Check for page break
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }
    }

    return yPosition;
  }

  /**
   * Add visual timetable section
   */
  private addVisualTimetableSection(
    pdf: jsPDF,
    timetable: ProcessedTimetable,
    config: TimetableConfig
  ): void {
    let yPosition = 20;

    pdf.setFontSize(16);
    pdf.setTextColor(51, 51, 51);
    pdf.text('Emploi du Temps Visuel', 20, yPosition);
    yPosition += 15;

    this.generateTimetableTable(pdf, timetable, config, 20, yPosition, true);
  }

  /**
   * Generate timetable as a clean table
   */
  private generateTimetableTable(
    pdf: jsPDF,
    timetable: ProcessedTimetable,
    config: TimetableConfig,
    startX: number,
    startY: number,
    isPortrait: boolean = false
  ): void {
    const cellWidth = isPortrait ? 30 : 45;
    const cellHeight = 15;
    const headerHeight = 20;
    const timeSlots = this.generateTimeSlots(config);

    let currentY = startY;

    // Draw headers
    currentY = this.drawTableHeaders(pdf, config.daysOfWeek, startX, currentY, cellWidth, headerHeight);

    // Draw time slots and data
    this.drawTableContent(pdf, timetable, timeSlots, config.daysOfWeek, startX, currentY, cellWidth, cellHeight, isPortrait);
  }

  /**
   * Draw table headers
   */
  private drawTableHeaders(
    pdf: jsPDF,
    daysOfWeek: string[],
    startX: number,
    currentY: number,
    cellWidth: number,
    headerHeight: number
  ): number {
    pdf.setFillColor(200, 200, 200);
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');

    // Time header
    pdf.rect(startX, currentY, cellWidth, headerHeight, 'FD');
    pdf.text('Heure', startX + cellWidth / 2, currentY + headerHeight / 2 + 2, { align: 'center' });

    // Day headers
    daysOfWeek.forEach((day, index) => {
      const x = startX + cellWidth + (index * cellWidth);
      pdf.rect(x, currentY, cellWidth, headerHeight, 'FD');
      pdf.text(day, x + cellWidth / 2, currentY + headerHeight / 2 + 2, { align: 'center' });
    });

    return currentY + headerHeight;
  }

  /**
   * Draw table content
   */
  private drawTableContent(
    pdf: jsPDF,
    timetable: ProcessedTimetable,
    timeSlots: string[],
    daysOfWeek: string[],
    startX: number,
    startY: number,
    cellWidth: number,
    cellHeight: number,
    isPortrait: boolean
  ): void {
    let currentY = startY;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);

    timeSlots.forEach(timeSlot => {
      // Time slot label
      pdf.setFillColor(240, 240, 240);
      pdf.rect(startX, currentY, cellWidth, cellHeight, 'FD');
      pdf.setTextColor(0, 0, 0);
      pdf.text(timeSlot, startX + cellWidth / 2, currentY + cellHeight / 2 + 1, { align: 'center' });

      // Day cells
      daysOfWeek.forEach((day, dayIndex) => {
        const x = startX + cellWidth + (dayIndex * cellWidth);
        this.drawTableCell(pdf, timetable[day]?.[timeSlot], x, currentY, cellWidth, cellHeight);
      });

      currentY += cellHeight;

      // Handle page breaks for portrait mode
      if (isPortrait && currentY > 250) {
        pdf.addPage();
        currentY = 20;
        currentY = this.drawTableHeaders(pdf, daysOfWeek, startX, currentY, cellWidth, 20);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
      }
    });
  }

  /**
   * Draw individual table cell
   */
  private drawTableCell(
    pdf: jsPDF,
    slot: TimetableSlot | undefined,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    pdf.rect(x, y, width, height, 'S');

    if (slot) {
      pdf.setFillColor(245, 245, 245);
      pdf.rect(x, y, width, height, 'F');
      pdf.rect(x, y, width, height, 'S');

      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(7);

      // Subject name (bold)
      pdf.setFont('helvetica', 'bold');
      const subjectText = this.truncateText(pdf, slot.subject, width - 4);
      pdf.text(subjectText, x + 2, y + 4);

      // Class name
      pdf.setFont('helvetica', 'normal');
      const classText = this.truncateText(pdf, slot.className, width - 4);
      pdf.text(classText, x + 2, y + 8);

      // Time
      pdf.setFontSize(6);
      const timeText = `${slot.startTime}-${slot.endTime}`;
      pdf.text(timeText, x + 2, y + 12);
    }
  }

  /**
   * Add footer to report
   */
  private addReportFooter(pdf: jsPDF): void {
    const pageCount = pdf.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Page ${i} sur ${pageCount}`, 180, 285);
      pdf.text(
        `Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`,
        20,
        285
      );
    }
  }

  /**
   * Generate filename for export
   */
  private generateFileName(prefix: string, teacher: Teacher): string {
    const teacherName = this.getTeacherFullName(teacher).replace(/\s+/g, '-');
    const date = new Date().toISOString().split('T')[0];
    return `${prefix}-${teacherName}-${date}.pdf`;
  }

  /**
   * Get teacher's full name
   */
  private getTeacherFullName(teacher: Teacher): string {
    if (!teacher) return 'Enseignant';
    const firstName = teacher.userModel?.first_name || '';
    const lastName = teacher.userModel?.last_name || '';
    return `${firstName} ${lastName}`.trim() || `Enseignant ${teacher.id}`;
  }

  /**
   * Format date for display
   */
  private formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  /**
   * Generate time slots
   */
  private generateTimeSlots(config: TimetableConfig): string[] {
    const slots: string[] = [];
    let currentTime = new Date(`1970-01-01T${config.startTime}:00`);
    const endTime = new Date(`1970-01-01T${config.endTime}:00`);

    while (currentTime < endTime) {
      slots.push(currentTime.toTimeString().substring(0, 5));
      currentTime.setMinutes(currentTime.getMinutes() + config.intervalMinutes);
    }

    return slots;
  }

  /**
   * Get assignments for a specific day
   */
  private getDayAssignments(timetable: ProcessedTimetable, day: string): TimetableSlot[] {
    const daySlots = timetable[day] || {};
    return Object.values(daySlots).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  /**
   * Get assignment summary statistics
   */
  private getAssignmentSummary(assignments: Assignment[]): { subjects: string[], classes: string[] } {
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

  /**
   * Truncate text to fit in cell width
   */
  private truncateText(pdf: jsPDF, text: string, maxWidth: number): string {
    const textWidth = pdf.getTextWidth(text);
    if (textWidth <= maxWidth) {
      return text;
    }

    let truncated = text;
    while (pdf.getTextWidth(truncated + '...') > maxWidth && truncated.length > 1) {
      truncated = truncated.slice(0, -1);
    }

    return truncated + '...';
  }
}
