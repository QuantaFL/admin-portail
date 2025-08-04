import {Injectable} from '@angular/core';
import {Student} from "../models/student";
import {firstValueFrom, Observable} from "rxjs";
import {HttpClient} from '@angular/common/http';
import {UpdateStudentRequest} from "../requests/updateStudentRequest";
import {AcademicYear} from "../../teacher-dashboard/models/academic-year";

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private apiUrl = 'http://localhost:8000/api/v1/students';

  constructor(private http: HttpClient) {}

  async getAllStudentss(): Promise<Student[]> {
    return await firstValueFrom(this.http.get<Student[]>(this.apiUrl));
  }
  getAllStudents(): Observable<Student[]> {
    return this.http.get<Student[]>(this.apiUrl);
  }
  getCurrentAcademicYear(): Observable<AcademicYear> {
    return this.http.get<AcademicYear>('http://localhost:8000/api/v1/academic-year/current');
  }


  getStudentById(id: number): Observable<Student> {
    return this.http.get<Student>(`${this.apiUrl}/${id}`);
  }

  createStudent(student: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/inscription`, student);
  }

  updateStudent(id: number, student: UpdateStudentRequest): Observable<Student> {
    return this.http.put<Student>(`${this.apiUrl}/${id}`, student);
  }
}
