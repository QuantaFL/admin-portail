import { Component, OnInit } from '@angular/core';
import { Teacher } from '../../models/teacher';
import { TeacherService } from '../../services/teacher.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-terminated-teacher-list',
  templateUrl: './terminated-teacher-list.component.html',
  styleUrls: ['./terminated-teacher-list.component.scss']
})
export class TerminatedTeacherListComponent implements OnInit {
  terminatedTeachers: Teacher[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private teacherService: TeacherService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.fetchTerminatedTeachers();
  }
  gotoTeacherList() {
      this.router.navigateByUrl('/list_teacher'); // Navigate to the teacher list
  }

  fetchTerminatedTeachers(): void {
    this.loading = true;
    this.teacherService.getAllTeacher().subscribe({
      next: (res) => {
        console.log('All teachers:', res);
        // Filtrer pour n'afficher que les enseignants avec status=false
        this.terminatedTeachers = res.filter(teacher => teacher.status === false);
        this.loading = false;
        console.log('Terminated teachers:', this.terminatedTeachers);
      },
      error: (err) => {
        console.error('Error fetching terminated teachers:', err);
        this.error = 'Erreur lors du chargement des enseignants résiliés';
        this.loading = false;
      }
    });
  }

  reactivateTeacher(teacher: Teacher): void {
    console.log('Reactivating teacher:', teacher);
    
    this.teacherService.toggleTeacherStatus(teacher.id).subscribe({
      next: (response) => {
        console.log('Teacher status toggled successfully:', response);
        
        const teacherName = `${teacher.userModel.first_name} ${teacher.userModel.last_name}`;
        if (response.status) {
          this.toastr.success(`Contrat de ${teacherName} réactivé avec succès`, 'Succès');
        } else {
          this.toastr.success(`Contrat de ${teacherName} désactivé avec succès`, 'Succès');
        }
        
        // Refresh the terminated teacher list
        this.fetchTerminatedTeachers();
      },
      error: (error) => {
        console.error('Error toggling teacher status:', error);
        this.toastr.error('Erreur lors de la réactivation du contrat', 'Erreur');
      }
    });
  }
}