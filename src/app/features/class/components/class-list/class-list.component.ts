import { Component, OnInit } from '@angular/core';
import { ClassService } from '../../services/class.service';
import { ReportCardService } from '../../services/report-card.service';
import { ClassModel } from '../../../teacher-dashboard/models/class-model';
import { ReportCard } from '../../models/report-card.model';
import { Router } from '@angular/router';
import { ReportCardService, ReportCard } from '../../services/report-card.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-class-list',
  templateUrl: './class-list.component.html',
  styleUrls: ['./class-list.component.scss']
})
export class ClassListComponent implements OnInit {

  constructor(
    private classService: ClassService,
    private reportCardService: ReportCardService,
    private router: Router,
    private reportCardService: ReportCardService,
    private toastr: ToastrService
  ) {

  }

  classes: ClassModel[] = [];
  loading = false;
  error: string | null = null;

  // Modal properties
  isModalOpen = false;
  isViewSubjectsModalOpen = false;
  selectedClass: ClassModel | null = null;

  // Report card properties
  generatedReportCards: { [classId: number]: ReportCard[] } = {};
  generatingReportCards: { [classId: number]: boolean } = {};
  reportCardErrors: { [classId: number]: string } = {};
  
  // Report card generation
  generatingBulletins = false;

  goToClass() {
    this.router.navigateByUrl('/class');
  }

  addSubject(classe: ClassModel) {
    console.log('Opening modal for class:', classe);
    this.selectedClass = classe;
    this.isModalOpen = true;
  }

  generateBulletin(classe: ClassModel) {
    if (!classe.id) {
      this.reportCardErrors[0] = 'ID de classe invalide';
      return;
    }

    const classId = classe.id;
    this.generatingReportCards[classId] = true;
    this.reportCardErrors[classId] = '';

    this.reportCardService.generateReportCards(classId).subscribe({
      next: (response) => {
        console.log('Report cards generated successfully:', response);
        console.log('Response type:', typeof response);
        console.log('Is array?', Array.isArray(response));
        console.log('Response.report_cards:', response.report_cards);

        if (Array.isArray(response)) {
          this.generatedReportCards[classId] = response;
        } else if (response.report_cards && Array.isArray(response.report_cards)) {

          this.generatedReportCards[classId] = response.report_cards;
        } else {
          console.error('Unexpected response format:', response);
          this.reportCardErrors[classId] = 'Format de réponse inattendu';
        }

        console.log('Stored report cards for class', classId, ':', this.generatedReportCards[classId]);
        this.generatingReportCards[classId] = false;
      },
      error: (error) => {
        console.error('Error generating report cards:', error);
        this.reportCardErrors[classId] = 'Erreur lors de la génération des bulletins';
        this.generatingReportCards[classId] = false;
      }
    });
  }

  /**
   * Download a single report card
   */
  downloadReportCard(reportCard: ReportCard): void {
    this.reportCardService.downloadReportCard(reportCard);
  }

  /**
   * Download all report cards for a class as individual files
   */
  downloadAllReportCards(classId: number): void {
    const reportCards = this.generatedReportCards[classId];
    if (reportCards && reportCards.length > 0) {
      this.reportCardService.downloadAllReportCards(reportCards);
    }
  }

  /**
   * Download all report cards for a class as a ZIP file
   */
  async downloadReportCardsAsZip(classId: number): Promise<void> {
    const reportCards = this.generatedReportCards[classId];
    const classe = this.classes.find(c => c.id === classId);

    if (reportCards && reportCards.length > 0 && classe) {
      await this.reportCardService.createZipAndDownload(reportCards, classe.name);
    }
  }

  /**
   * Check if report cards are generated for a class
   */
  hasGeneratedReportCards(classId: number): boolean {
    return this.generatedReportCards[classId] && this.generatedReportCards[classId].length > 0;
  }

  /**
   * Check if report cards are being generated for a class
   */
  isGeneratingReportCards(classId: number): boolean {
    return this.generatingReportCards[classId] || false;
  }

  /**
   * Get report card error for a class
   */
  getReportCardError(classId: number): string {
    return this.reportCardErrors[classId] || '';
  }

  /**
   * Clear generated report cards for a class
   */
  clearReportCards(classId: number): void {
    delete this.generatedReportCards[classId];
    delete this.reportCardErrors[classId];
  }

  /**
   * Track by function for report card list performance
   */
  trackByReportCardId(index: number, reportCard: ReportCard): number {
    return reportCard.id;
  }

  viewSubjects(classe: ClassModel) {
    console.log('Opening subjects view for class:', classe);
    this.selectedClass = classe;
    this.isViewSubjectsModalOpen = true;
  }

  closeModal() {
    console.log('Closing modal');
    this.isModalOpen = false;
    this.selectedClass = null;
  }

  closeViewSubjectsModal() {
    console.log('Closing view subjects modal');
    this.isViewSubjectsModalOpen = false;
    this.selectedClass = null;
  }

  onSubjectAssigned(response: any) {
    console.log('Subject assigned successfully:', response);
    // Optionally refresh the class list or show a success message
    this.getAllClasses();
  }



  ngOnInit(): void {
        this.getAllClasses();

  }

  showInfo(classe: any): void {
    alert('Classe: ' + classe.name + '\nNiveau: ' + classe.level);
  }
    getAllClasses(): void {
    this.classService.getAll().subscribe({
      next: (classesResponse) => {
        console.log('Classes fetched successfully:',classesResponse);
        this.classes = classesResponse.reverse(); // Reverse to show the latest classes first
        this.classes = classesResponse;
      },
      error: () => {
        this.error = 'Erreur lors de la récupération des classes.';
      }
    });
  }
}
