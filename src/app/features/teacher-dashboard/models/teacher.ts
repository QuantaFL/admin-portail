import { UserModel } from "./user-model";
import { Subject } from "./subject";
import { ClassModel } from "./class-model";
import {Assignment} from "./assignment";

export interface Teacher {
  id: number;
  hire_date: string;
  created_at: string;
  updated_at: string;
  user_model_id: number;
  subjects: Subject[];
  assigned_classes: ClassModel[];
  userModel: UserModel;
  assignements?: Assignment[];
}
