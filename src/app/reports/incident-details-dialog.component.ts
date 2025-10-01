import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-incident-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule
  ],
  template: `
  <div class="dialog-container mx-auto flex flex-col lg:flex-row gap-6 p-6 w-full max-w-[1200px] bg-white rounded-2xl shadow-lg overflow-auto">

    <!-- Left Column: Media / Thumbnails -->
    <div class="lg:w-1/3 flex flex-col items-center gap-3">
      <div class="w-full h-64 bg-gray-100 rounded-xl shadow-inner flex items-center justify-center overflow-hidden">
        <ng-container *ngIf="imagePreviews.length; else noMedia">
          <div class="flex flex-wrap gap-2 justify-center overflow-auto">
            <img *ngFor="let img of imagePreviews" [src]="img" alt="Incident Media" class="w-24 h-24 object-cover rounded-lg">
          </div>
        </ng-container>
        <ng-template #noMedia>
          <div class="flex flex-col items-center justify-center text-gray-400 gap-2">
            <mat-icon class="text-5xl">image_not_supported</mat-icon>
            <span>No Media</span>
          </div>
        </ng-template>
      </div>
      <input type="file" multiple (change)="onFileSelected($event)" class="mt-2 w-full text-sm" />
    </div>

    <!-- Right Column: Form -->
    <div class="lg:w-2/3 flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <h3 class="text-blue-600 font-semibold text-lg">People Involved</h3>
        <mat-form-field class="w-full bg-gray-50 rounded-lg shadow-inner p-2">
          <mat-label>Who's Involved</mat-label>
          <input matInput [(ngModel)]="data.whoInvolved" placeholder="e.g. John Doe, Jane Smith" class="bg-transparent">
        </mat-form-field>
        <mat-form-field class="w-full bg-gray-50 rounded-lg shadow-inner p-2">
          <mat-label>No. of People Involved</mat-label>
          <input matInput type="number" min="0" [(ngModel)]="data.peopleCount" class="bg-transparent">
        </mat-form-field>
      </div>

      <div class="flex flex-col gap-2">
        <h3 class="text-blue-600 font-semibold text-lg">Incident Information</h3>
        <mat-form-field class="w-full bg-gray-50 rounded-lg shadow-inner p-2">
          <mat-label>Details</mat-label>
          <textarea matInput rows="4" [(ngModel)]="data.details" placeholder="Brief description of the incident..." class="bg-transparent"></textarea>
        </mat-form-field>
        <mat-form-field class="w-full bg-gray-50 rounded-lg shadow-inner p-2">
          <mat-label>Additional Notes</mat-label>
          <textarea matInput rows="3" [(ngModel)]="data.notes" placeholder="Any other relevant remarks..." class="bg-transparent"></textarea>
        </mat-form-field>
      </div>

      <div class="flex flex-wrap justify-end gap-3 mt-4">
        <button mat-stroked-button color="warn" class="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-50 transition" (click)="onCancel()">
          <mat-icon>cancel</mat-icon> Cancel
        </button>
        <button mat-raised-button color="red" class="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-blue-700 text-white rounded-lg shadow transition transform hover:-translate-y-0.5" (click)="onSave()">
          <mat-icon>save</mat-icon> Save & Export
        </button>
      </div>
    </div>

  </div>
  `,
  styles: [`
    .dialog-container { box-sizing: border-box; max-height: 90vh; }
    mat-form-field { width: 100%; }
    input.mat-input-element, textarea.mat-input-element { padding: 0.5rem 0.75rem; font-size: 0.95rem; color: #374151; }
    img { border-radius: 0.75rem; }
    @media (max-width: 1024px) { .dialog-container { flex-direction: column; } }
  `]
})
export class IncidentDetailsDialog {
  selectedFiles: File[] = [];
  imagePreviews: string[] = [];

  constructor(
    private http: HttpClient,
    public dialogRef: MatDialogRef<IncidentDetailsDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    this.selectedFiles = Array.from(input.files);
    this.imagePreviews = [];

    this.selectedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => this.imagePreviews.push(reader.result as string);
      reader.readAsDataURL(file);
    });
  }

  onSave(): void {
    const formData = new FormData();

    // Ensure defaults for missing fields
    formData.append('incident_id', this.data.incident_id || 'N/A');
    formData.append('from_role', this.data.from_role || 'N/A');
    formData.append('to_role', this.data.to_role || 'N/A');
    formData.append('status', this.data.status || 'Pending');
    formData.append('whoInvolved', this.data.whoInvolved?.trim() || 'N/A');
    formData.append('peopleCount', (this.data.peopleCount ?? 0).toString());
    formData.append('details', this.data.details?.trim() || 'No additional details provided.');
    formData.append('notes', this.data.notes?.trim() || 'No notes provided.');
    formData.append('timestamp', Date.now().toString());

    // Append selected files
    this.selectedFiles.forEach(file => formData.append('images', file, file.name));

    this.http.post(`${environment.backendUrl}/api/report/request_data`, formData)
      .subscribe({
        next: res => this.dialogRef.close(res),
        error: err => {
          console.error(err);
          alert('Failed to save incident report. Please try again.');
        }
      });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
