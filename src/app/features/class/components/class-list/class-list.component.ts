import { Component, OnInit } from '@angular/core';
import { ClassService } from '../../services/class.service';
import { ClassModel } from '../../../teacher-dashboard/models/class-model';
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
    console.log('Generating bulletin for class:', classe);
    
    if (this.generatingBulletins) {
      this.toastr.warning('Génération en cours, veuillez patienter...', 'Attention');
      return;
    }

    this.generatingBulletins = true;
    this.toastr.info('Génération des bulletins en cours...', 'Information');

    this.reportCardService.generateReportCards(classe.id!).subscribe({
      next: (reportCards: ReportCard[]) => {
        console.log('Report cards generated successfully:', reportCards);
        console.log('Number of report cards:', reportCards.length);
        
        // Afficher chaque URL pour vérification
        reportCards.forEach((card, index) => {
          console.log(`Report card ${index + 1}:`, {
            id: card.id,
            rank: card.rank,
            average_grade: card.average_grade,
            pdf_url: card.pdf_url
          });
        });
        
        if (reportCards && reportCards.length > 0) {
          this.toastr.success(`${reportCards.length} bulletins générés avec succès`, 'Succès');
          
          // Télécharger tous les PDFs via l'endpoint de téléchargement
          this.reportCardService.downloadAllReportCards(reportCards);
        } else {
          this.toastr.warning('Aucun bulletin généré pour cette classe', 'Attention');
        }
        
        this.generatingBulletins = false;
      },
      error: (error) => {
        console.error('Error generating report cards:', error);
        this.toastr.error('Erreur lors de la génération des bulletins', 'Erreur');
        this.generatingBulletins = false;
      }
    });
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
