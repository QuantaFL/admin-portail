export interface CreateTeacherRequest {
  hire_date: string;
  role_id: number;
  nationality: string;
  photo?: File;
  cv?: File;
  diplomas?: File;
  user: {
    first_name: string;
    last_name: string;
    birthday: string;
    email: string;
    password: string;
    adress: string;
    phone: string;
    gender: string;
  };
  assignment: {
    subject_id: number;
    class_model_id: number;
    day_of_week: string;
    start_time: string;
    end_time: string;
    coefficient: number;
  };
}

export interface FileUploadConfigTeachers {
  label: string;
  accept: string;
  maxSize: number; // en MB
  required: boolean;
  placeholder: string;
}

export interface TeacherResponseTeachers {
  id: number;
  hire_date: string;
  nationality: string;
  photo_url?: string;
  cv_url?: string;
  diplomas_url?: string;
}
