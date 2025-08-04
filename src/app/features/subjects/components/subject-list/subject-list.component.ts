import { Component, OnInit } from '@angular/core';
import { SubjectService } from '../../services/subject.service';
import { Subject } from '../../models/subject';
import { ToastrService } from 'ngx-toastr';
import { CreateSubjectRequest } from '../../requests/createSubjectRequest';

@Component({
  selector: 'app-subject-list',
  templateUrl: './subject-list.component.html',
  styleUrl: './subject-list.component.scss'
})
export class SubjectListComponent implements OnInit {
  subjects: Subject[] = [];
  loading = false;
  error: string | null = null;
  
  // Modal properties
  isAddSubjectModalOpen = false;
  isSubmittingSubject = false;
  
  // Form data
  subjectForm: CreateSubjectRequest = {
    name: '',
    coefficient: 1,
    level: ''
  };

  // Liste des niveaux disponibles
  availableLevels = [
    '6ème',
    '5ème',
    '4ème',
    '3ème',
    'Seconde',
    'Première S1',
    'Première S2',
    'Première L',
    'Terminale S1',
    'Terminale S2',
    'Terminale L'
  ];

  constructor(
    private subjectService: SubjectService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.fetchSubjects();
  }

  fetchSubjects(): void {
    this.loading = true;
    this.subjectService.getAllSubject().subscribe({
      next: (res) => {
        console.log(res.reverse());
        // Flatten nested array if needed
        if (Array.isArray(res) && Array.isArray(res[0])) {
          this.subjects = res[0];
        } else if (Array.isArray(res)) {
          this.subjects = res;
        } else if (res) {
          this.subjects = [res];
        } else {
          this.subjects = [];
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement des matières';
        this.loading = false;
      }
    });
  }

  openAddSubjectModal(): void {
    console.log('Opening add subject modal - isAddSubjectModalOpen:', this.isAddSubjectModalOpen);
    this.isAddSubjectModalOpen = true;
    console.log('After setting - isAddSubjectModalOpen:', this.isAddSubjectModalOpen);
    this.resetForm();
  }

  closeAddSubjectModal(): void {
    console.log('Closing add subject modal');
    this.isAddSubjectModalOpen = false;
    this.resetForm();
  }

  resetForm(): void {
    this.subjectForm = {
      name: '',
      coefficient: 1,
      level: ''
    };
  }

  submitSubject(): void {
    console.log('Submitting subject form:', this.subjectForm);

    // Validation
    if (!this.subjectForm.name.trim()) {
      this.toastr.error('Le nom de la matière est requis', 'Erreur');
      return;
    }

    if (this.subjectForm.coefficient <= 0) {
      this.toastr.error('Le coefficient doit être supérieur à 0', 'Erreur');
      return;
    }

    if (!this.subjectForm.level || !this.subjectForm.level.trim()) {
      this.toastr.error('Le niveau est requis', 'Erreur');
      return;
    }

    this.isSubmittingSubject = true;

    this.subjectService.createSubject(this.subjectForm).subscribe({
      next: (response) => {
        console.log('Subject created successfully:', response);
        this.toastr.success(`Matière "${this.subjectForm.name}" créée avec succès`, 'Succès');
        this.closeAddSubjectModal();
        this.fetchSubjects(); // Refresh the list
        this.isSubmittingSubject = false;
      },
      error: (error) => {
        console.error('Error creating subject:', error);
        this.toastr.error('Erreur lors de la création de la matière', 'Erreur');
        this.isSubmittingSubject = false;
      }
    });
  }

  toggleSubjectStatus(subject: Subject): void {
    console.log('Toggling status for subject:', subject);
    
    this.subjectService.toggleSubjectStatus(subject.name).subscribe({
      next: (response) => {
        console.log('Subject status toggled successfully:', response);
        
        // Update the local subject status
        const index = this.subjects.findIndex(s => s.name === subject.name);
        if (index !== -1) {
          this.subjects[index] = response;
        }
        
        const statusText = response.status ? 'activée' : 'désactivée';
        this.toastr.success(`Matière "${subject.name}" ${statusText} avec succès`, 'Succès');
      },
      error: (error) => {
        console.error('Error toggling subject status:', error);
        this.toastr.error('Erreur lors du changement de statut de la matière', 'Erreur');
      }
    });
  }
}
