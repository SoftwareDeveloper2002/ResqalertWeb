import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
    <div class="dialog-container flex flex-col sm:flex-row gap-6 p-6 max-w-5xl w-full bg-white rounded-2xl shadow-lg">

      <!-- Left Column: Media / Thumbnail -->
      <div class="flex-1 flex justify-center items-start">
        <div class="w-full max-w-sm h-64 bg-gray-100 rounded-xl shadow-inner flex items-center justify-center overflow-hidden">
          <img *ngIf="data.mediaUrl" [src]="data.mediaUrl" alt="Incident Media" class="w-full h-full object-cover rounded-xl">
          <div *ngIf="!data.mediaUrl" class="flex flex-col items-center justify-center text-gray-400 gap-2">
            <mat-icon class="text-5xl">image_not_supported</mat-icon>
            <span>No Media</span>
          </div>
        </div>
      </div>

      <!-- Right Column: Form -->
      <div class="flex-1 flex flex-col gap-4">

        <!-- People Involved Section -->
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

        <!-- Incident Information Section -->
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

        <!-- Actions -->
        <div class="flex justify-end gap-3 mt-4">
          <button mat-stroked-button color="warn" class="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-50 transition" (click)="onCancel()">
            <mat-icon>cancel</mat-icon> Cancel
          </button>
          <button mat-raised-button color="primary" class="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition transform hover:-translate-y-0.5" (click)="onSave()">
            <mat-icon>save</mat-icon> Save & Export
          </button>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .dialog-container { box-sizing: border-box; }
    mat-form-field { width: 100%; }
    input.mat-input-element, textarea.mat-input-element { padding: 0.5rem 0.75rem; font-size: 0.95rem; color: #374151; }
    .dialog-content img { border-radius: 0.75rem; }
    @media (max-width: 640px) { .dialog-container { flex-direction: column; } }
  `]
})
export class IncidentDetailsDialog {
  constructor(
    private http: HttpClient,
    public dialogRef: MatDialogRef<IncidentDetailsDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onSave(): void {
    // ✅ Save approved details directly into request_data
    const requestData = {
      incident_id: this.data.incident_id,
      from_role: this.data.from_role,
      to_role: this.data.to_role,
      status: 'Approved',
      whoInvolved: this.data.whoInvolved,
      peopleCount: this.data.peopleCount,
      details: this.data.details,
      notes: this.data.notes,
      timestamp: Date.now()
    };

    console.log('Payload sent to /request_data:', requestData);

    // ✅ Send to request_data collection, not requests
    this.http.post(`${environment.backendUrl}/api/report/request_data`, requestData, {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' })
    })
      .subscribe({
        next: (res) => {
          console.log('Approved request saved successfully:', res);
          this.dialogRef.close(res); // return saved data
        },
        error: (err) => {
          console.error('Failed to save approved request:', err);
          alert('Failed to save approved request. Please try again.');
        }
      });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
