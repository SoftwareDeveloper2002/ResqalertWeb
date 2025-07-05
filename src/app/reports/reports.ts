import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ImageDialogComponent } from './image-dialog.component';
import { FeedbackDialog } from '../feedback-dialog/feedback-dialog';
import { NavbarComponent } from "../shared/navbar/navbar";

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    RouterLink,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatButtonModule,
    MatTooltipModule,
    MatDialogModule,
    FeedbackDialog,
    NavbarComponent
  ],
  templateUrl: './reports.html',
  styleUrls: ['./reports.scss']
})
export class Reports implements OnInit {
  firebaseData: any[] = [];
  pagedReports: any[] = [];
  currentPage = 1;
  itemsPerPage = 10;

  role: string = '';
  barangayStats: { barangay: string; count: number }[] = [];

  constructor(
    private readonly router: Router,
    private readonly http: HttpClient,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.role = localStorage.getItem('role') || 'Unknown';
    const apiUrl = `${environment.backendUrl}/api/report/reports?role=${this.role}`;

    this.http.get<any[]>(apiUrl).subscribe({
      next: (data) => {
        this.firebaseData = (data || []).sort((a, b) => {
          return new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime();
        });

        this.updatePagedReports();

        const counts: Record<string, number> = {};
        for (const report of this.firebaseData) {
          const barangay = report.barangay || 'Unknown';
          counts[barangay] = (counts[barangay] || 0) + 1;
        }

        this.barangayStats = Object.entries(counts)
          .map(([barangay, count]) => ({ barangay, count }))
          .sort((a, b) => b.count - a.count);
      },
      error: (err) => console.error('Error loading reports:', err)
    });
  }

  updatePagedReports(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.pagedReports = this.firebaseData.slice(start, end);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagedReports();
  }

  openImageDialog(url: string): void {
    this.dialog.open(ImageDialogComponent, {
      data: { imageUrl: url },
      panelClass: 'custom-dialog-container'
    });
  }

  updateStatus(itemId: string, status: 'Responding' | 'Rescued' | 'Invalid'): void {
    const url = `${environment.backendUrl}/api/report/reports/${itemId}/status`;

    this.http.patch(url, { status }).subscribe({
      next: () => {
        this.firebaseData = this.firebaseData.map(item =>
          item.id === itemId ? { ...item, status } : item
        );
        this.updatePagedReports();
      },
      error: (err) => console.error(`Error updating status for ${itemId}:`, err)
    });
  }

  markAsResponding(itemId: string): void {
    this.updateStatus(itemId, 'Responding');
  }

  markAsRescued(itemId: string): void {
    this.updateStatus(itemId, 'Rescued');
  }

  markAsInvalid(itemId: string): void {
    this.updateStatus(itemId, 'Invalid');
  }

  openFeedbackDialog(): void {
    if (this.role === 'SA') return;

    const dialogRef = this.dialog.open(FeedbackDialog, {
      width: '400px',
      data: { role: this.role }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.message) {
        const ticket = `#${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 8)}`;
        const payload = {
          message: result.message,
          submittedBy: this.role,
          timestamp: new Date().toISOString(),
          ticket: ticket
        };

        this.http.post(
          'https://resqalert-22692-default-rtdb.asia-southeast1.firebasedatabase.app/feedbacks.json',
          payload
        ).subscribe(
          () => alert(`✅ Feedback submitted with Ticket ${ticket}`),
          () => alert('❌ Failed to submit feedback')
        );
      }
    });
  }

  logout(): void {
    this.router.navigate(['/login']);
  }

  get totalPages(): number {
    return Math.ceil(this.firebaseData.length / this.itemsPerPage);
  }
}
