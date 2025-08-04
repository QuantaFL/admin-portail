import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ReportCard {
  id: number;
  average_grade: number;
  honors: string;
  path: string;
  pdf_url: string;
  rank: string;
  created_at: string;
  updated_at: string;
  student_session_id: number;
  term_id: number;
}

export interface GenerateReportCardRequest {
  class_model_id: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReportCardService {
  private apiUrl = 'http://127.0.0.1:8000/api/v1/report-cards';

  constructor(private http: HttpClient) {}

  generateReportCards(classModelId: number): Observable<ReportCard[]> {
    console.log('Generating report cards for class ID:', classModelId);
    const requestData: GenerateReportCardRequest = {
      class_model_id: classModelId
    };
    return this.http.post<ReportCard[]>(`${this.apiUrl}/generate`, requestData);
  }

  downloadReportCard(reportCardId: number, filename: string): void {
    console.log('Downloading report card ID:', reportCardId);
    
    const downloadUrl = `${this.apiUrl}/${reportCardId}/download`;
    console.log('Download URL:', downloadUrl);
    
    // Utiliser l'endpoint spécifique de téléchargement
    this.http.get(downloadUrl, { responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        // Créer un URL temporaire pour le blob
        const blobUrl = URL.createObjectURL(blob);
        
        // Créer un lien de téléchargement
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        
        // Ajouter au DOM temporairement pour déclencher le téléchargement
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Nettoyer l'URL temporaire
        URL.revokeObjectURL(blobUrl);
        
        console.log('Report card downloaded successfully:', filename);
      },
      error: (error) => {
        console.error('Error downloading report card:', error);
      }
    });
  }

  downloadAllReportCards(reportCards: ReportCard[]): void {
    console.log('Downloading all report cards, count:', reportCards.length);
    
    reportCards.forEach((reportCard, index) => {
      // Créer un nom de fichier descriptif
      const filename = `bulletin_rang_${reportCard.rank}_note_${reportCard.average_grade}_id_${reportCard.id}.pdf`;
      
      // Délai entre les téléchargements pour éviter de surcharger le navigateur
      setTimeout(() => {
        this.downloadReportCard(reportCard.id, filename);
      }, index * 800); // 800ms entre chaque téléchargement
    });
  }

  private extractFilenameFromUrl(url: string): string {
    try {
      const urlParts = url.split('/');
      return urlParts[urlParts.length - 1] || '';
    } catch (error) {
      console.error('Error extracting filename from URL:', error);
      return '';
    }
  }
}
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ReportCard, ReportCardGenerationResponse } from '../models/report-card.model';

@Injectable({
  providedIn: 'root'
})
export class ReportCardService {
  private apiUrl = 'http://localhost:8000/api/v1/report-cards';

  constructor(private http: HttpClient) {}

  /**
   * Generate report cards for a specific class
   */
  generateReportCards(classModelId: number): Observable<ReportCardGenerationResponse> {
    return this.http.post<ReportCardGenerationResponse>(`${this.apiUrl}/generate`, {
      class_model_id: classModelId
    });
  }

  /**
   * Download a single report card PDF
   */
  downloadReportCard(reportCard: ReportCard): void {
    const link = document.createElement('a');
    link.href = reportCard.pdf_url;
    link.download = reportCard.path.split('/').pop() || `bulletin_${reportCard.student_session_id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Download all report cards as individual files
   */
  downloadAllReportCards(reportCards: ReportCard[]): void {
    reportCards.forEach((reportCard, index) => {
      setTimeout(() => {
        this.downloadReportCard(reportCard);
      }, index * 500); // Stagger downloads to avoid browser blocking
    });
  }

  /**
   * Get report cards for a specific class
   */
  getReportCardsByClass(classId: number): Observable<ReportCard[]> {
    return this.http.get<ReportCard[]>(`${this.apiUrl}/class/${classId}`);
  }

  /**
   * Create a ZIP file with all report cards (browser-based solution)
   */
  async createZipAndDownload(reportCards: ReportCard[], className: string): Promise<void> {
    try {
      const JSZip = await import('jszip');
      const zip = new JSZip.default();

     const classFolder = zip.folder(`Bulletins_${className}_${new Date().toLocaleDateString('fr-FR')}`);

      for (const reportCard of reportCards) {
        try {
          const response = await fetch(reportCard.pdf_url);
          const blob = await response.blob();
          const fileName = reportCard.path.split('/').pop() || `bulletin_${reportCard.student_session_id}.pdf`;
          classFolder?.file(fileName, blob);
        } catch (error) {
          console.error(`Failed to download ${reportCard.pdf_url}:`, error);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `Bulletins_${className}_${new Date().toLocaleDateString('fr-FR')}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Error creating ZIP file:', error);
      // Fallback to individual downloads
      this.downloadAllReportCards(reportCards);
    }
  }
}
