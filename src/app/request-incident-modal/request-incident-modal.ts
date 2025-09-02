import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { CommonModule, DatePipe } from '@angular/common';

// ✅ Angular Material modules
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

// ✅ Angular Forms
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-request-incident-modal',
  templateUrl: './request-incident-modal.html',
  styleUrls: ['./request-incident-modal.scss'],
  imports: [
    CommonModule,           // 👈 Needed for *ngIf, *ngFor, pipes, etc.
    FormsModule,            // for [(ngModel)]
    MatFormFieldModule,     // for <mat-form-field>
    MatInputModule,         // for matInput
    MatButtonModule,        // for <button mat-button>
    MatCardModule,          // for <mat-card>
    MatIconModule,          // for <mat-icon>
    DatePipe
  ]
})
export class RequestIncidentModalComponent {
  searchId: string = '';
  item: any = null;
  role: string;

  constructor(
    private http: HttpClient,
    public dialogRef: MatDialogRef<RequestIncidentModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.role = data?.role || '';
  }

  close(): void {
    this.dialogRef.close();
  }

  // 🔎 Find incident by ID
  findIncidentById(): void {
    if (!this.searchId) return;

    this.http.get(`${environment.backendUrl}/api/report/reports/${this.searchId}`).subscribe({
      next: (report: any) => {
        this.item = report;
      },
      error: () => {
        this.item = null;
        alert('Incident not found');
      }
    });
  }

  // 📌 Make a request entry in "requests" collection
  request(target: string): void {
    if (!this.item) return;

    const payload = {
      incident_id: this.item.id,
      from_role: this.role,    // user making the request
      to_role: target,         // department / target role
      status: 'Pending',
      timestamp: Date.now()
    };

    this.http.post(`${environment.backendUrl}/api/report/requests`, payload).subscribe({
      next: () => {
        alert(`✅ Request sent to ${target}`);
        this.dialogRef.close();
      },
      error: () => alert(`❌ Failed to send request to ${target}`)
    });
  }

  // ✅ Check if role is available for this incident
  isRoleAvailable(role: string): boolean {
    if (!this.item) return false;
    return Array.isArray(this.item.flag) && this.item.flag.includes(role);
  }
}
