import { Component, OnInit } from '@angular/core';
import {Router} from "@angular/router";
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {TeacherService} from "../../services/teacher.service";
import {SubjectService} from "../../../subjects/services/subject.service";
import {ClassService} from "../../../class/services/class.service";
import {Subject} from "../../../subjects/models/subject";
import {ClassModel} from "../../../class/models/class";
import {CreateTeacherRequest, FileUploadConfigTeachers} from "../../requests/createTeacherRequest";
import { ToastrService } from 'ngx-toastr';
import { FileValidatorsTeachers } from '../../validators/file-validators-teachers';

@Component({
  selector: 'app-add-teacher',
  templateUrl: './add-teacher.component.html',
  styleUrl: './add-teacher.component.scss'
})
export class AddTeacherComponent implements OnInit {
  currentStep = 0;
  totalSteps = 5;
  
  // Formulaires séparés pour chaque étape
  personalInfoForm = new FormGroup({
    firstName: new FormControl('', [Validators.required]),
    lastName: new FormControl('', [Validators.required]),
    birthday: new FormControl('', [Validators.required]),
    gender: new FormControl('M', [Validators.required]),
    nationality: new FormControl('', [Validators.required])
  });

  contactForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    phone: new FormControl('', [Validators.required]),
    address: new FormControl('', [Validators.required])
  });

  professionalForm = new FormGroup({
    hireDate: new FormControl('', [Validators.required]),
    subjectId: new FormControl('', [Validators.required]),
    classModelId: new FormControl('', [Validators.required]),
    coefficient: new FormControl('', [Validators.required, Validators.min(1)])
  });

  scheduleForm = new FormGroup({
    dayOfWeek: new FormControl('', [Validators.required]),
    startTime: new FormControl('', [Validators.required]),
    endTime: new FormControl('', [Validators.required])
  });

  // Nouveau formulaire pour les documents
  documentsFormTeachers = new FormGroup({
    photoTeachers: new FormControl(null, [
      FileValidatorsTeachers.maxSizeTeachers(2),
      FileValidatorsTeachers.fileTypeTeachers(['.jpg', '.jpeg', '.png'])
    ]),
    cvTeachers: new FormControl(null, [
      FileValidatorsTeachers.maxSizeTeachers(5),
      FileValidatorsTeachers.fileTypeTeachers(['.pdf', '.doc', '.docx'])
    ]),
    diplomasTeachers: new FormControl(null, [
      FileValidatorsTeachers.maxSizeTeachers(10),
      FileValidatorsTeachers.fileTypeTeachers(['.pdf', '.jpg', '.jpeg', '.png'])
    ])
  });

  subjects: Subject[] = [];
  classes: ClassModel[] = [];
  
  // Configuration des fichiers
  fileConfigsTeachers: { [key: string]: FileUploadConfigTeachers } = {
    photoTeachers: {
      label: "Photo de profil",
      accept: ".jpg,.jpeg,.png",
      maxSize: 2,
      required: false,
      placeholder: "Sélectionner une photo (optionnel)"
    },
    cvTeachers: {
      label: "Curriculum Vitae", 
      accept: ".pdf,.doc,.docx",
      maxSize: 5,
      required: false,
      placeholder: "Télécharger le CV (optionnel)"
    },
    diplomasTeachers: {
      label: "Diplômes",
      accept: ".pdf,.jpg,.jpeg,.png", 
      maxSize: 10,
      required: false,
      placeholder: "Joindre les diplômes (optionnel)"
    }
  };
  
  // Preview des fichiers sélectionnés
  filePreviewsTeachers: { [key: string]: { name: string, size: string, url?: string } } = {};
  
  steps = [
    { 
      title: 'Informations personnelles',
      subtitle: 'Renseignez les données personnelles de l\'enseignant',
      form: this.personalInfoForm,
      icon: '👤'
    },
    { 
      title: 'Informations de contact',
      subtitle: 'Coordonnées et adresse de l\'enseignant',
      form: this.contactForm,
      icon: '📧'
    },
    { 
      title: 'Informations professionnelles',
      subtitle: 'Matière, classe et date d\'embauche',
      form: this.professionalForm,
      icon: '💼'
    },
    { 
      title: 'Emploi du temps',
      subtitle: 'Planification des cours',
      form: this.scheduleForm,
      icon: '📅'
    },
    { 
      title: 'Documents',
      subtitle: 'Fichiers et pièces justificatives',
      form: this.documentsFormTeachers,
      icon: '📄'
    }
  ];

  daysOfWeek = [
    { value: 'monday', label: 'Lundi' },
    { value: 'tuesday', label: 'Mardi' },
    { value: 'wednesday', label: 'Mercredi' },
    { value: 'thursday', label: 'Jeudi' },
    { value: 'friday', label: 'Vendredi' },
    { value: 'saturday', label: 'Samedi' },
    { value: 'sunday', label: 'Dimanche' }
  ];
  
  genders = [
    { value: 'M', label: 'Masculin' },
    { value: 'F', label: 'Féminin' }
  ];

  // Liste des nationalités disponibles
  nationalities = [
    'Afghane',
    'Albanaise',
    'Algérienne',
    'Allemande',
    'Américaine',
    'Andorrane',
    'Angolaise',
    'Antiguaise-et-Barbudienne',
    'Argentine',
    'Arménienne',
    'Australienne',
    'Autrichienne',
    'Azerbaïdjanaise',
    'Bahaméenne',
    'Bahreïnienne',
    'Bangladaise',
    'Barbadienne',
    'Belge',
    'Bélizienne',
    'Béninoise',
    'Bhoutanaise',
    'Biélorusse',
    'Birmane',
    'Bolivienne',
    'Bosnienne',
    'Botswanaise',
    'Brésilienne',
    'Britannique',
    'Brunéienne',
    'Bulgare',
    'Burkinabé',
    'Burundaise',
    'Cambodgienne',
    'Camerounaise',
    'Canadienne',
    'Cap-verdienne',
    'Centrafricaine',
    'Chilienne',
    'Chinoise',
    'Chypriote',
    'Colombienne',
    'Comorienne',
    'Congolaise',
    'Costaricaine',
    'Croate',
    'Cubaine',
    'Danoise',
    'Djiboutienne',
    'Dominicaine',
    'Dominiquaise',
    'Égyptienne',
    'Émirienne',
    'Équatorienne',
    'Érythréenne',
    'Espagnole',
    'Estonienne',
    'Éthiopienne',
    'Fidjienne',
    'Finlandaise',
    'Française',
    'Gabonaise',
    'Gambienne',
    'Géorgienne',
    'Ghanéenne',
    'Grecque',
    'Grenadienne',
    'Guatémaltèque',
    'Guinéenne',
    'Équato-guinéenne',
    'Bissau-guinéenne',
    'Guyanienne',
    'Haïtienne',
    'Hondurienne',
    'Hongroise',
    'Indienne',
    'Indonésienne',
    'Irakienne',
    'Iranienne',
    'Irlandaise',
    'Islandaise',
    'Israélienne',
    'Italienne',
    'Ivoirienne',
    'Jamaïcaine',
    'Japonaise',
    'Jordanienne',
    'Kazakhe',
    'Kényane',
    'Kirghize',
    'Kiribatienne',
    'Koweïtienne',
    'Laotienne',
    'Lesothane',
    'Lettone',
    'Libanaise',
    'Libérienne',
    'Libyenne',
    'Liechtensteinoise',
    'Lituanienne',
    'Luxembourgeoise',
    'Macédonienne',
    'Malgache',
    'Malaisienne',
    'Malawienne',
    'Maldivienne',
    'Malienne',
    'Maltaise',
    'Marocaine',
    'Marshallaise',
    'Mauricienne',
    'Mauritanienne',
    'Mexicaine',
    'Micronésienne',
    'Moldave',
    'Monégasque',
    'Mongole',
    'Monténégrine',
    'Mozambicaine',
    'Namibienne',
    'Nauruane',
    'Népalaise',
    'Nicaraguayenne',
    'Nigérienne',
    'Nigériane',
    'Norvégienne',
    'Néo-zélandaise',
    'Omanaise',
    'Ougandaise',
    'Ouzbèke',
    'Pakistanaise',
    'Panaméenne',
    'Papouane-néo-guinéenne',
    'Paraguayenne',
    'Néerlandaise',
    'Péruvienne',
    'Philippine',
    'Polonaise',
    'Portugaise',
    'Qatarienne',
    'Roumaine',
    'Russe',
    'Rwandaise',
    'Saint-lucienne',
    'Saint-marinaise',
    'Salomonaise',
    'Salvadorienne',
    'Samoane',
    'São-toméenne',
    'Saoudienne',
    'Sénégalaise',
    'Serbe',
    'Seychelloise',
    'Sierra-léonaise',
    'Singapourienne',
    'Slovaque',
    'Slovène',
    'Somalienne',
    'Soudanaise',
    'Sud-soudanaise',
    'Sri-lankaise',
    'Suédoise',
    'Suisse',
    'Surinamaise',
    'Swazie',
    'Syrienne',
    'Tadjike',
    'Tanzanienne',
    'Tchadienne',
    'Tchèque',
    'Thaïlandaise',
    'Timoraise',
    'Togolaise',
    'Tonguienne',
    'Trinidadienne',
    'Tunisienne',
    'Turkmène',
    'Turque',
    'Tuvaluane',
    'Ukrainienne',
    'Uruguayenne',
    'Vanuatuane',
    'Vénézuélienne',
    'Vietnamienne',
    'Yéménite',
    'Zambienne',
    'Zimbabwéenne'
  ];

  constructor(
    private router: Router,
    private teacherService: TeacherService,
    private subjectService: SubjectService,
    private classService: ClassService,
    private toast: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadSubjects();
    this.loadClasses();
  }

  loadSubjects(): void {
    this.subjectService.getAllSubject().subscribe({
      next: (subjects) => {
        this.subjects = subjects;
      },
      error: (err) => {
        console.error('Error loading subjects:', err);
      }
    });
  }

  loadClasses(): void {
    this.classService.getAllClasses().subscribe({
      next: (classes) => {
        this.classes = classes;
      },
      error: (err) => {
        console.error('Error loading classes:', err);
      }
    });
  }

  nextStep(): void {
    if (this.isCurrentStepValid() && this.currentStep < this.totalSteps - 1) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  goToStep(step: number): void {
    // Permet de naviguer vers une étape seulement si toutes les étapes précédentes sont valides
    if (step <= this.currentStep || this.areAllPreviousStepsValid(step)) {
      this.currentStep = step;
    }
  }

  isCurrentStepValid(): boolean {
    return this.steps[this.currentStep].form.valid;
  }

  areAllPreviousStepsValid(targetStep: number): boolean {
    for (let i = 0; i < targetStep; i++) {
      if (!this.steps[i].form.valid) {
        return false;
      }
    }
    return true;
  }

  canProceedToStep(stepIndex: number): boolean {
    return stepIndex <= this.currentStep || this.areAllPreviousStepsValid(stepIndex);
  }

  isStepCompleted(stepIndex: number): boolean {
    return stepIndex < this.currentStep || this.steps[stepIndex].form.valid;
  }

  getAllFormData(): any {
    return {
      ...this.personalInfoForm.value,
      ...this.contactForm.value,
      ...this.professionalForm.value,
      ...this.scheduleForm.value,
      ...this.documentsFormTeachers.value
    };
  }

  // Méthodes pour gérer les fichiers
  onFileSelectedTeachers(event: Event, fieldName: string): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
      const control = this.documentsFormTeachers.get(fieldName);
      control?.setValue(file);
      control?.markAsTouched();
      
      // Créer preview
      this.filePreviewsTeachers[fieldName] = {
        name: file.name,
        size: FileValidatorsTeachers.getFileSizeTeachers(file.size)
      };
      
      // Pour les images, créer une preview URL
      if (fieldName === 'photoTeachers' && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.filePreviewsTeachers[fieldName].url = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      }
      
      console.log('File selected for', fieldName, ':', file);
    }
  }

  removeFileTeachers(fieldName: string): void {
   const control = this.documentsFormTeachers.get(fieldName);
    control?.setValue(null);
    delete this.filePreviewsTeachers[fieldName];

    const fileInput = document.getElementById(fieldName) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }

    this.toast.info(`Fichier supprimé pour ${this.fileConfigsTeachers[fieldName]?.label || fieldName}`, 'Suppression');
    console.log(`[AddTeacher] Fichier supprimé pour le champ: ${fieldName}`);
  }

  getFileErrorTeachers(fieldName: string): string | null {
    const control = this.documentsFormTeachers.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['maxSizeTeachers']) {
        const maxSizeMB = control.errors['maxSizeTeachers'].maxSizeMB;
        return `Le fichier dépasse la taille maximale de ${maxSizeMB}MB`;
      }
      if (control.errors['fileTypeTeachers']) {
        const allowedTypes = control.errors['fileTypeTeachers'].allowedTypes.join(', ');
        return `Type de fichier non autorisé. Types acceptés: ${allowedTypes}`;
      }
    }
    return null;
  }

  hasFilePreviewTeachers(fieldName: string): boolean {
    return !!this.filePreviewsTeachers[fieldName];
  }
  

  onSubmit(): void {
    if (this.areAllFormsValid()) {
      const formData = this.getAllFormData();
      
      // Créer FormData pour envoyer les fichiers
      const submitFormData = new FormData();
      
      // Ajouter les données JSON
      const teacherData = {
        hire_date: formData.hireDate ?? '',
        role_id: 2,
        nationality: formData.nationality ?? '',
        user: {
          first_name: formData.firstName ?? '',
          last_name: formData.lastName ?? '',
          birthday: formData.birthday ?? '',
          email: formData.email ?? '',
          password: 'MotDePasseSecurise123!',
          adress: formData.address ?? '',
          phone: formData.phone ?? '',
          gender: formData.gender ?? 'M'
        },
        assignment: {
          subject_id: Number(formData.subjectId) || 0,
          class_model_id: Number(formData.classModelId) || 0,
          day_of_week: formData.dayOfWeek ?? '',
          start_time: formData.startTime ?? '',
          end_time: formData.endTime ?? '',
          coefficient: Number(formData.coefficient) || 1
        }
      };
      
      // Ajouter les données en tant que JSON
       // Ajout des champs imbriqués pour Laravel
      Object.entries(teacherData.user).forEach(([key, value]) => {
        submitFormData.append(`user[${key}]`, value as string);
      });
      Object.entries(teacherData.assignment).forEach(([key, value]) => {
        submitFormData.append(`assignment[${key}]`, value as string);
      });
      submitFormData.append('hire_date', teacherData.hire_date);
      submitFormData.append('role_id', teacherData.role_id.toString());
      submitFormData.append('nationality', teacherData.nationality);
      
      // Ajouter les fichiers
      if (formData.photoTeachers) {
        submitFormData.append('photo', formData.photoTeachers);
      }
      if (formData.cvTeachers) {
        submitFormData.append('cv', formData.cvTeachers);
      }
      if (formData.diplomasTeachers) {
        submitFormData.append('diplomas', formData.diplomasTeachers);
      }
      
      console.log('Sending teacher data with files:', submitFormData);
      
     this.teacherService.createTeacherWithFiles(submitFormData).subscribe({
        next: (res) => {
          console.log('Teacher created:', res);
          this.toast.success('Enseignant créé avec succès', 'Succès');
          this.router.navigateByUrl('/list_teacher');
        },
        error: (err) => {
          this.toast.error('Erreur lors de l\'enregistrement de l\'enseignant', 'Erreur');
          console.error('Error creating teacher:', err);
        }
      });
    } else {
      console.log('Some forms are invalid');
      this.markAllFormsAsTouched();
    }
  }

  areAllFormsValid(): boolean {
    return this.personalInfoForm.valid && 
           this.contactForm.valid && 
           this.professionalForm.valid && 
           this.scheduleForm.valid &&
           this.documentsFormTeachers.valid;
  }

  markAllFormsAsTouched(): void {
    this.personalInfoForm.markAllAsTouched();
    this.contactForm.markAllAsTouched();
    this.professionalForm.markAllAsTouched();
    this.scheduleForm.markAllAsTouched();
    this.documentsFormTeachers.markAllAsTouched();
  }

  getSelectedSubjectName(): string {
    const subjectId = this.professionalForm.get('subjectId')?.value;
    const subject = this.subjects.find(s => s.id === Number(subjectId));
    return subject?.name || '';
  }

  getSelectedClassName(): string {
    const classId = this.professionalForm.get('classModelId')?.value;
    const classModel = this.classes.find(c => c.id === Number(classId));
    return classModel?.name || '';
  }
}
