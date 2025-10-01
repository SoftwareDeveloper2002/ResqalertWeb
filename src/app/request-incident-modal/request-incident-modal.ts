import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { CommonModule, DatePipe } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
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
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    DatePipe,
    DragDropModule
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
    // Use role from dialog data OR fallback to localStorage
    this.role = data?.role || localStorage.getItem('role') || '';
  }

  close(): void {
    this.dialogRef.close();
  }

  // 🔎 Find incident by numeric index OR Firebase ID with role filtering
  findIncidentById(): void {
    if (!this.searchId) return;

    const params = new HttpParams().set('role', this.role);

    this.http.get(`${environment.backendUrl}/api/report/reports/${this.searchId}`, { params })
      .subscribe({
        next: (report: any) => {
          this.item = report;
        },
        error: (err) => {
          console.error('Failed to load report:', err);
          this.item = null;
          alert('Incident not found or not accessible for your role');
        }
      });
  }

  // 📌 Send a request entry to "requests" collection
  request(target: string): void {
    if (!this.item) return;

    const payload = {
      incident_id: this.item.id,
      from_role: this.role,
      to_role: target,
      status: 'Before',
      timestamp: Date.now()
    };

    this.http.post(`${environment.backendUrl}/api/report/requests`, payload)
      .subscribe({
        next: () => {
          alert(`✅ Request sent to ${target}`);
          this.dialogRef.close();
        },
        error: () => alert(`❌ Failed to send request to ${target}`)
      });
  }

  // ✅ Check if a role flag is available for this incident
  isRoleAvailable(role: string): boolean {
    if (!this.item) return false;
    return Array.isArray(this.item.flag) && this.item.flag.includes(role);
  }
}
