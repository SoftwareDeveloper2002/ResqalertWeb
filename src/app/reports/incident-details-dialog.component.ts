import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
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
    <!-- LEFT COLUMN: Media -->
    <div class="lg:w-1/3 flex flex-col items-center gap-3">
      <div class="w-full min-h-64 bg-gray-100 rounded-xl shadow-inner flex flex-col items-center justify-start p-2 overflow-auto">
        <!-- ✅ Image Previews -->
        <div *ngIf="imagePreviews.length" class="flex flex-wrap gap-2 justify-center mb-3">
          <img *ngFor="let img of imagePreviews"
               [src]="img"
               alt="Incident Photo"
               class="w-24 h-24 object-cover rounded-lg shadow cursor-pointer hover:scale-105 transition" />
        </div>

        <!-- ✅ Video Previews -->
        <div *ngIf="videoPreviews.length" class="flex flex-wrap gap-2 justify-center">
          <video *ngFor="let vid of videoPreviews"
                 [src]="vid"
                 controls
                 class="w-28 h-28 rounded-lg shadow"></video>
        </div>

        <!-- ❌ No Media -->
        <ng-container *ngIf="!imagePreviews.length && !videoPreviews.length">
          <div class="flex flex-col items-center justify-center text-gray-400 gap-2 mt-10">
            <mat-icon class="text-5xl">image_not_supported</mat-icon>
            <span>No Media</span>
          </div>
        </ng-container>
      </div>

      <input type="file"
             multiple
             accept="image/*,video/*"
             (change)="onFileSelected($event)"
             class="mt-2 w-full text-sm" />
    </div>

    <!-- RIGHT COLUMN: Form -->
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

        <!-- ✅ Location -->
        <div *ngIf="data.latitude && data.longitude" class="text-gray-700 text-sm mb-2">
          <p><strong>Latitude:</strong> {{ data.latitude }}</p>
          <p><strong>Longitude:</strong> {{ data.longitude }}</p>
          <a [href]="getMapLink()" target="_blank" class="text-blue-500 underline">📍 View on Google Maps</a>
        </div>

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
        <button mat-stroked-button color="warn"
                class="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-50 transition"
                (click)="onCancel()">
          <mat-icon>cancel</mat-icon> Cancel
        </button>
        <button mat-raised-button color="primary"
                class="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-50 transition"
                (click)="onSave()">
          <mat-icon>save</mat-icon> Save & Export
        </button>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .dialog-container { box-sizing: border-box; max-height: 90vh; }
    mat-form-field { width: 100%; }
    input.mat-input-element, textarea.mat-input-element {
      padding: 0.5rem 0.75rem;
      font-size: 0.95rem;
      color: #374151;
    }
    img, video { border-radius: 0.75rem; }
    @media (max-width: 1024px) {
      .dialog-container { flex-direction: column; }
    }
  `]
})
export class IncidentDetailsDialog implements OnInit {
  selectedFiles: File[] = [];
  imagePreviews: string[] = [];
  videoPreviews: string[] = [];

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<IncidentDetailsDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  /** ✅ Automatically load media and prefill form when dialog opens */
  ngOnInit(): void {
    console.log('🔥 Incoming data:', this.data);

    const raw = this.data.firebaseData || this.data;
    const entries = Array.isArray(raw) ? raw : [raw];

    entries.forEach(entry => {
      const type = entry.media_type || '';
      const url = entry.media_url || entry.url || '';

      if (url) {
        if (type === 'photo' || url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          this.imagePreviews.push(url);
        } else if (type === 'video' || url.match(/\.(mp4|mov|avi|mkv)$/i)) {
          this.videoPreviews.push(url);
        }
      }

      // Auto-fill coordinates
      if (entry.latitude) this.data.latitude = entry.latitude;
      if (entry.longitude) this.data.longitude = entry.longitude;
    });

    // ✅ Auto-fill Who's Involved, No. of People, Details, Notes
    const entry = entries[0];
    if (!this.data.whoInvolved || this.data.whoInvolved === 'N/A') {
      this.data.whoInvolved = this.data.phone_number || entry?.phone_number || 'N/A';
    }
    if (!this.data.peopleCount || this.data.peopleCount === 0) {
      this.data.peopleCount = entry?.peopleCount || entry?.numberOfPeople || 'N/A';
    }
    if (!this.data.details || this.data.details === 'No additional details provided.') {
      this.data.details = entry?.details || 'No additional details provided.';
    }
    if (!this.data.notes || this.data.notes === 'No notes provided.') {
      this.data.notes = entry?.notes || 'No notes provided.';
    }

    console.log('✅ Prefilled Data:', {
      whoInvolved: this.data.whoInvolved,
      peopleCount: this.data.peopleCount,
      details: this.data.details,
      notes: this.data.notes
    });

    this.cdr.detectChanges();
  }

  getMapLink(): string {
    if (!this.data.latitude || !this.data.longitude) return '';
    return `https://www.google.com/maps?q=${this.data.latitude},${this.data.longitude}`;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    this.selectedFiles = Array.from(input.files);

    this.selectedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const fileURL = reader.result as string;
        if (file.type.startsWith('image/')) {
          this.imagePreviews.push(fileURL);
        } else if (file.type.startsWith('video/')) {
          this.videoPreviews.push(fileURL);
        }
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    });
  }

  onSave(): void {
    const formData = new FormData();
    formData.append('incident_id', this.data.id || this.data.incident_id || 'N/A');
    formData.append('from_role', this.data.from_role || 'PNP');
    formData.append('to_role', this.data.to_role || 'MDRRMO');
    formData.append('status', this.data.status || 'Before');
    formData.append('whoInvolved', this.data.whoInvolved?.trim() || 'N/A');
    formData.append('peopleCount', (this.data.peopleCount ?? 0).toString());
    formData.append('details', this.data.details?.trim() || 'No additional details provided.');
    formData.append('notes', this.data.notes?.trim() || 'No notes provided.');
    formData.append('latitude', this.data.latitude?.toString() || '');
    formData.append('longitude', this.data.longitude?.toString() || '');
    formData.append('timestamp', Date.now().toString());

    this.selectedFiles.forEach(file => formData.append('files', file, file.name));

    this.http.post(`${environment.backendUrl}/api/report/request_data`, formData)
      .subscribe({
        next: res => this.dialogRef.close(res),
        error: err => {
          console.error('Failed to save incident report:', err);
          alert('Failed to save incident report. Please try again.');
        }
      });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
