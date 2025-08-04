import {Subject} from './subject';
import {ClassModel} from './class-model';
import {Term} from "./term";
import {Teacher} from "./teacher";

export interface Assignment {
  id: number;
  created_at: string;
  updated_at: string;
  teacher_id: number;
  class_model_id: number;
  subject_id: number;
  academic_year_id?: number;
  teacher?: Teacher;
  classModel?: ClassModel;
  subject?: Subject;
  term?: Term;
  academicYear?: any;
  day_of_week: string[];
  start_time: string;
  end_time: string;
  coefficient?: number;
  isActive?: boolean;
  term_id?: number | null;
}
