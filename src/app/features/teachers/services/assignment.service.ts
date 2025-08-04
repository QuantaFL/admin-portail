import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ToggleAssignmentRequest {
  teacher_id: number;
}

export interface CreateAssignmentRequest {
  teacher_id?: number;
  class_model_id?: number;
  subject_id?: number;
  day_of_week?: string;
  start_time?: string;
  end_time?: string;
  coefficient?: number;
}

export interface ToggleAssignmentResponse {
  id: number;
  teacher_id: number;
  class_model_id: number;
  subject_id: number;
  academic_year_id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  coefficient: number;
  isActive: boolean;
  assignment_number: string;
  created_at: string;
  updated_at: string;
  teacher: {
    id: number;
    hire_date: string;
    userModel: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
    };
  };
  subject: {
    id: number;
    name: string;
    level: string;
  };
  classModel: {
    id: number;
    name: string;
    level: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AssignmentService {
  private apiUrl = 'http://localhost:8000/api/v1/assignements';

  constructor(private http: HttpClient) {}

  toggleAssignmentStatusByTeacher(teacherId: number): Observable<ToggleAssignmentResponse> {
    return this.http.post<ToggleAssignmentResponse>(`${this.apiUrl}/toggle-status-by-teacher`, {
      teacher_id: teacherId
    });
  }

  createAssignment(assignmentData: CreateAssignmentRequest): Observable<ToggleAssignmentResponse> {
    console.log('Creating assignment with data:', assignmentData);
    return this.http.post<ToggleAssignmentResponse>(this.apiUrl, assignmentData);
  }
}