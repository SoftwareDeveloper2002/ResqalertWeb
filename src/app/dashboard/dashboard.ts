import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClientModule, HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class Dashboard implements OnInit {
  firebaseData: any[] = [];

  totalUsers = 0;         // Placeholder (adjust with actual user logic if needed)
  totalReports = 0;
  rescuedCount = 0;
  invalidCount = 0;
  otherCount = 0;

  role: string = '';

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    this.role = localStorage.getItem('role') || 'Unknown';
    const url = 'https://resqalert-22692-default-rtdb.asia-southeast1.firebasedatabase.app/reports.json';

    this.http.get<any>(url).subscribe((response) => {
      if (response) {
        this.firebaseData = Object.entries(response).map(([key, entry]: [string, any]) => {
          const lat = entry.latitude ?? null;
          const lng = entry.longitude ?? null;
          return {
            id: key,
            ...entry,
            googleMapLink: lat && lng ? this.getGoogleMapsLink(lat, lng) : null
          };
        });

        this.totalReports = this.firebaseData.length;
        this.rescuedCount = this.firebaseData.filter(item => item.status === 'Rescued').length;
        this.invalidCount = this.firebaseData.filter(item => item.status === 'Invalid').length;
        this.otherCount = this.totalReports - this.rescuedCount - this.invalidCount;

        // Placeholder for logged-in users (adjust logic based on actual auth integration)
        this.totalUsers = 17;

        console.log('Processed Firebase data with analytics:', this.firebaseData);
      }
    });
  }

  getGoogleMapsLink(lat: number, lng: number): string {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }

  markAsRescued(itemId: string): void {
    const updateUrl = `https://resqalert-22692-default-rtdb.asia-southeast1.firebasedatabase.app/reports/${itemId}.json`;
    this.http.patch(updateUrl, { status: 'Rescued' }).subscribe(() => {
      this.firebaseData = this.firebaseData.map(item =>
        item.id === itemId ? { ...item, status: 'Rescued' } : item
      );
      this.updateAnalytics();
    });
  }

  markAsInvalid(itemId: string): void {
    const updateUrl = `https://resqalert-22692-default-rtdb.asia-southeast1.firebasedatabase.app/reports/${itemId}.json`;
    this.http.patch(updateUrl, { status: 'Invalid' }).subscribe(() => {
      this.firebaseData = this.firebaseData.map(item =>
        item.id === itemId ? { ...item, status: 'Invalid' } : item
      );
      this.updateAnalytics();
    });
  }

  updateAnalytics(): void {
    this.totalReports = this.firebaseData.length;
    this.rescuedCount = this.firebaseData.filter(item => item.status === 'Rescued').length;
    this.invalidCount = this.firebaseData.filter(item => item.status === 'Invalid').length;
    this.otherCount = this.totalReports - this.rescuedCount - this.invalidCount;
  }

  logout(): void {
    this.router.navigate(['/login']);
  }
}
