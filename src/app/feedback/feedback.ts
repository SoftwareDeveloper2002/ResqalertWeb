import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { NavbarComponent } from "../shared/navbar/navbar";
import { FullMessageDialogComponent } from './full-message-dialog';

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, MatDialogModule, FullMessageDialogComponent],
  templateUrl: './feedback.html'
})
export class Feedback implements OnInit {
  feedbackList: any[] = [];
  role = localStorage.getItem('role') || '';

  currentPage: number = 1;
  itemsPerPage: number = 10;

  private http = inject(HttpClient);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  ngOnInit(): void {

    if (this.role !== 'SA') {
      this.router.navigate(['/admin-panel']);
      return;
    }

    this.fetchFeedback();
  }

  fetchFeedback(): void {
    this.http.get<any>('https://resqalert-22692-default-rtdb.asia-southeast1.firebasedatabase.app/feedbacks.json')
      .subscribe({
        next: res => {
          if (!res) {
            this.feedbackList = [];
            return;
          }

          let index = 1;
          const entries = Object.entries(res).map(([id, data]: any) => {
            const timestamp = data.timestamp || Date.now();
            const date = new Date(timestamp);
            const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
            const ticket = `#${dateStr}-${String(index++).padStart(3, '0')}`;

            return {
              id,
              ...data,
              status: data.status || 'Unresolved',
              timestamp: date,
              ticket
            };
          });

          // Sort entries by timestamp (newest first)
          this.feedbackList = entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          this.currentPage = 1; // Reset to first page
        },
        error: err => {
          console.error('❌ Failed to load feedback:', err);
        }
      });
  }

  get pagedFeedbackList(): any[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.feedbackList.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.feedbackList.length / this.itemsPerPage);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  updateFeedbackStatus(feedback: any, status: 'Resolved' | 'Unresolved' | 'Queued'): void {
    if (!feedback?.id) {
      console.warn('⚠️ Feedback ID missing, cannot update.');
      return;
    }

    feedback.status = status;

    const updateUrl = `https://resqalert-22692-default-rtdb.asia-southeast1.firebasedatabase.app/feedbacks/${feedback.id}.json`;

    this.http.patch(updateUrl, { status }).subscribe({
      next: () => console.log(`✅ Updated status to ${status}`),
      error: err => console.error('❌ Failed to update status:', err)
    });
  }

  openFullMessageDialog(message: string): void {
    this.dialog.open(FullMessageDialogComponent, {
      width: '500px',
      data: { message }
    });
  }

  logout(): void {
    localStorage.clear();
    window.location.href = '/admin-panel';
  }
}
