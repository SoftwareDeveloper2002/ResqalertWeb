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
    MatDialogModule
  ],
  templateUrl: './reports.html',
  styleUrls: ['./reports.scss']
})
export class Reports implements OnInit {
  firebaseData: any[] = [];
  role: string = '';
  barangayStats: { barangay: string; count: number }[] = [];

  constructor(
    private readonly router: Router,
    private readonly http: HttpClient,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.role = localStorage.getItem('role') || 'Unknown';

    // ✅ UPDATED API endpoint
    const apiUrl = `${environment.backendUrl}/api/report/reports?role=${this.role}`;

    this.http.get<any[]>(apiUrl).subscribe({
      next: (data) => {
        this.firebaseData = data;
        console.log(`Fetched reports for role "${this.role}"`, data);

        const counts: Record<string, number> = {};
        for (const report of data) {
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

  openImageDialog(url: string): void {
    this.dialog.open(ImageDialogComponent, {
      data: { imageUrl: url },
      panelClass: 'custom-dialog-container'
    });
  }

  updateStatus(itemId: string, status: 'Responding' | 'Rescued' | 'Invalid'): void {
    // ✅ UPDATED PATCH endpoint
    const url = `${environment.backendUrl}/api/report/reports/${itemId}/status`;

    this.http.patch(url, { status }).subscribe({
      next: () => {
        this.firebaseData = this.firebaseData.map(item =>
          item.id === itemId ? { ...item, status } : item
        );
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

  logout(): void {
    this.router.navigate(['/login']);
  }
}
