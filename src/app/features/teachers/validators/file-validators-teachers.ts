import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class FileValidatorsTeachers {
  
  static maxSizeTeachers(maxSizeMB: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const file = control.value as File;
      
      if (!file) {
        return null; // Pas d'erreur si pas de fichier (optionnel)
      }
      
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      
      if (file.size > maxSizeBytes) {
        return {
          maxSizeTeachers: {
            actualSize: file.size,
            maxSize: maxSizeBytes,
            maxSizeMB: maxSizeMB
          }
        };
      }
      
      return null;
    };
  }
  
  static fileTypeTeachers(allowedTypes: string[]): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const file = control.value as File;
      
      if (!file) {
        return null; // Pas d'erreur si pas de fichier (optionnel)
      }
      
      const fileName = file.name.toLowerCase();
      const isValidType = allowedTypes.some(type => 
        fileName.endsWith(type.toLowerCase())
      );
      
      if (!isValidType) {
        return {
          fileTypeTeachers: {
            actualType: file.type,
            allowedTypes: allowedTypes
          }
        };
      }
      
      return null;
    };
  }
  
  static getFileSizeTeachers(sizeInBytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = sizeInBytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
  
  static isValidFileTypeTeachers(fileName: string, allowedTypes: string[]): boolean {
    const lowerFileName = fileName.toLowerCase();
    return allowedTypes.some(type => lowerFileName.endsWith(type.toLowerCase()));
  }
}