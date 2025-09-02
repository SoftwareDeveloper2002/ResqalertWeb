import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { CommonModule, DatePipe } from '@angular/common';

// ✅ Angular Material modules
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';

// ✅ Angular Forms
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-request-get-modal',
  templateUrl: './request-get-modal.html',
  styleUrls: ['./request-get-modal.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatDialogModule,
    MatTableModule
  ],
  providers: [DatePipe]
})
export class RequestGetModalComponent implements OnInit {
  requests: any[] = [];
  role: string;

  constructor(
    private http: HttpClient,
    public dialogRef: MatDialogRef<RequestGetModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.role = data?.role || '';
  }

  ngOnInit(): void {
    this.loadRequests();
  }

  close(): void {
    this.dialogRef.close();
  }

  // 🔎 Fetch requests for current role
  loadRequests(): void {
    if (!this.role) return;

    this.http.get<any[]>(`${environment.backendUrl}/api/report/requests?role=${this.role}`)
      .subscribe({
        next: (res: any[]) => {
          // Only show requests where the current role matches the to_role and status is Pending
          this.requests = res.filter(req => req.to_role === this.role && req.status === 'Pending');
        },
        error: (err) => {
          console.error('Failed to load requests', err);
          this.requests = [];
        }
      });
  }

  // ✅ Approve a request
  approveRequest(requestId: string): void {
    this.http.patch(`${environment.backendUrl}/api/report/requests/${requestId}/approve`, {})
      .subscribe({
        next: () => {
          alert('Request approved!');
          // Update local list
          this.requests = this.requests.map(req =>
            req.id === requestId ? { ...req, status: 'Approved' } : req
          );
        },
        error: (err) => {
          console.error('Failed to approve request', err);
          alert('Failed to approve request.');
        }
      });
  }
}
