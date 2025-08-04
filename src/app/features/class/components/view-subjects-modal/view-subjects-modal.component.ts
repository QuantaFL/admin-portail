import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { ClassModel } from '../../../teacher-dashboard/models/class-model';
import { TeacherService } from '../../../teachers/services/teacher.service';
import { AssignmentService, CreateAssignmentRequest } from '../../../teachers/services/assignment.service';
import { Teacher } from '../../../teachers/models/teacher';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-view-subjects-modal',
  templateUrl: './view-subjects-modal.component.html',
  styleUrls: ['./view-subjects-modal.component.scss']
})
export class ViewSubjectsModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() selectedClass: ClassModel | null = null;
  @Output() close = new EventEmitter<void>();

  loading = false;
  error: string | null = null;
  teachers: Teacher[] = [];
  
  // Assignment modal properties
  isAssignmentModalOpen = false;
  selectedSubject: any = null;
  assignmentForm = {
    teacher_id: 0,
    day_of_week: '',
    start_time: '',
    end_time: '',
    coefficient: 0
  };

  daysOfWeek = [
    { value: 'monday', label: 'Lundi' },
    { value: 'tuesday', label: 'Mardi' },
    { value: 'wednesday', label: 'Mercredi' },
    { value: 'thursday', label: 'Jeudi' },
    { value: 'friday', label: 'Vendredi' },
    { value: 'saturday', label: 'Samedi' },
    { value: 'sunday', label: 'Dimanche' }
  ];

  constructor(
    private teacherService: TeacherService,
    private assignmentService: AssignmentService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    if (this.isOpen && this.selectedClass) {
      this.loadClassData();
      this.loadTeachers();
    }
  }

  ngOnChanges(): void {
    if (this.isOpen && this.selectedClass) {
      this.loadClassData();
      this.loadTeachers();
    }
  }

  loadClassData(): void {
    // Utilisez directement les données de la classe passée en input
    // Pas besoin d'appel API supplémentaire
    this.loading = false;
    this.error = null;
    
    console.log('Using cached class data with subjects:', this.selectedClass);
    
    if (this.selectedClass && !this.selectedClass.subjects) {
      console.warn('Class data does not contain subjects. You may need to ensure the API returns subjects with classes.');
    }
  }

  get classSubjects() {
    return this.selectedClass?.subjects || [];
  }

  loadTeachers(): void {
    this.teacherService.getAllTeacher().subscribe({
      next: (teachers) => {
        // Filtrer pour n'afficher que les enseignants avec status=true
        this.teachers = teachers.filter(teacher => teacher.status === true);
        console.log('Active teachers loaded:', this.teachers);
      },
      error: (error) => {
        console.error('Error loading teachers:', error);
        this.toastr.error('Erreur lors du chargement des enseignants', 'Erreur');
      }
    });
  }

  openAssignmentModal(subject: any): void {
    console.log('Opening assignment modal for subject:', subject);
    this.selectedSubject = subject;
    this.isAssignmentModalOpen = true;
    
    // Reset form
    this.assignmentForm = {
      teacher_id: 0,
      day_of_week: '',
      start_time: '',
      end_time: '',
      coefficient: subject.coefficient || 1
    };
  }

  closeAssignmentModal(): void {
    this.isAssignmentModalOpen = false;
    this.selectedSubject = null;
  }

  submitAssignment(): void {
    if (!this.selectedClass || !this.selectedSubject) {
      this.toastr.error('Données manquantes pour l\'assignement', 'Erreur');
      return;
    }

    if (this.assignmentForm.teacher_id === 0 || !this.assignmentForm.day_of_week || 
        !this.assignmentForm.start_time || !this.assignmentForm.end_time) {
      this.toastr.error('Veuillez remplir tous les champs requis', 'Erreur');
      return;
    }

    const assignmentData: CreateAssignmentRequest = {
      teacher_id: this.assignmentForm.teacher_id,
      class_model_id: this.selectedClass.id,
      subject_id: this.selectedSubject.id,
      day_of_week: this.assignmentForm.day_of_week,
      start_time: this.assignmentForm.start_time,
      end_time: this.assignmentForm.end_time,
      coefficient: this.assignmentForm.coefficient
    };

    console.log('Submitting assignment:', assignmentData);

    this.assignmentService.createAssignment(assignmentData).subscribe({
      next: (response) => {
        console.log('Assignment created successfully:', response);
        this.toastr.success('Assignement créé avec succès', 'Succès');
        this.closeAssignmentModal();
      },
      error: (error) => {
        console.error('Error creating assignment:', error);
        this.toastr.error('Erreur lors de la création de l\'assignement', 'Erreur');
      }
    });
  }

  closeModal(): void {
    this.isOpen = false;
    this.error = null;
    this.closeAssignmentModal();
    this.close.emit();
  }
}