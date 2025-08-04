import {User} from "../../auth/models/user";

export interface Subject {
  id: number;
  name: string;
  level: string;
  coefficient: number;
  created_at: string;
  updated_at: string;
  pivot: {
    teacher_id: number;
    subject_id: number;
  };
}

export interface Teacher {
  id: number;
  hire_date: string;
  created_at: string;
  updated_at: string;
  user_model_id: number;
  subjects: Subject[];
  userModel: User;
  count?: number;
  isActive?: boolean;
  status?: boolean;
}
