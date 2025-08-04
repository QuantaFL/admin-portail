import {Component, OnInit} from '@angular/core';
import {Teacher} from "../../models/teacher";
import {TeacherService} from "../../services/teacher.service";
import {AssignmentService} from "../../services/assignment.service";
import {ToastrService} from 'ngx-toastr';

@Component({
  selector: 'app-teacher-list',
  templateUrl: './teacher-list.component.html',
  styleUrl: './teacher-list.component.scss'
})
export class TeacherListComponent implements OnInit {
  teachers: Teacher[] = [];
  loading = false;
  error: string | null = null;
  
  // Modal properties
  isTerminationModalOpen = false;
  selectedTeacher: Teacher | null = null;

  constructor(
    private teacherService: TeacherService,
    private assignmentService: AssignmentService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.fetchTeachers();
  }

  fetchTeachers(): void {
    this.loading = true;
    this.teacherService.getAllTeacher().subscribe({
      next: (res) => {
        console.log('All teachers from API:', res);
        // Filtrer pour n'afficher que les enseignants avec status=true
        this.teachers = res.filter(teacher => teacher.status === true).reverse();
        console.log('Filtered active teachers:', this.teachers);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching teachers:', err);
        this.error = 'Erreur lors du chargement des enseignants';
        this.loading = false;
      }
    });
  }

  openTerminationModal(teacher: Teacher): void {
    console.log('Opening termination modal for teacher:', teacher);
    this.selectedTeacher = teacher;
    this.isTerminationModalOpen = true;
  }

  closeTerminationModal(): void {
    console.log('Closing termination modal');
    this.isTerminationModalOpen = false;
    this.selectedTeacher = null;
  }

  confirmTermination(teacher: Teacher): void {
    console.log('Confirming termination for teacher:', teacher);
    
    this.teacherService.toggleTeacherStatus(teacher.id).subscribe({
      next: (response) => {
        console.log('Teacher status toggled successfully:', response);
        
        const teacherName = `${teacher.userModel.first_name} ${teacher.userModel.last_name}`;
        if (response.status) {
          this.toastr.success(`Contrat de ${teacherName} réactivé avec succès`, 'Succès');
        } else {
          this.toastr.success(`Contrat de ${teacherName} résilié avec succès`, 'Succès');
        }
        
        // Refresh the teacher list to remove terminated teachers
        this.fetchTeachers();
        this.closeTerminationModal();
      },
      error: (error) => {
        console.error('Error toggling teacher status:', error);
        this.toastr.error('Erreur lors de la résiliation du contrat', 'Erreur');
      }
    });
  }
}
