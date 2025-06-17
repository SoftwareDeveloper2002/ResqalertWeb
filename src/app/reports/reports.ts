import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClientModule, HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    RouterLink
  ],
  templateUrl: './reports.html',
  styleUrls: ['./reports.scss']
})
export class Reports implements OnInit {
  firebaseData: any[] = [];
  role: string = '';

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    // Get role from local storage
    this.role = localStorage.getItem('role') || 'Unknown';

    const url = 'https://resqalert-22692-default-rtdb.asia-southeast1.firebasedatabase.app/reports.json';

    this.http.get<any>(url).subscribe((response) => {
      if (response) {
        this.firebaseData = Object.entries(response)
          .map(([key, entry]: [string, any]) => {
            const lat = entry.latitude ?? null;
            const lng = entry.longitude ?? null;

            return {
              id: key,
              ...entry,
              googleMapLink: lat && lng ? this.getGoogleMapsLink(lat, lng) : null
            };
          })
          .filter(item =>
            Array.isArray(item.flag) && item.flag.includes(this.role)
          );

        console.log(`Reports visible to role "${this.role}":`, this.firebaseData);
      }
    });
  }

  getGoogleMapsLink(lat: number, lng: number): string {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }

  markAsResponding(itemId: string): void {
    const updateUrl = `https://resqalert-22692-default-rtdb.asia-southeast1.firebasedatabase.app/reports/${itemId}.json`;
    this.http.patch(updateUrl, { status: 'Responding' }).subscribe(() => {
      this.firebaseData = this.firebaseData.map(item =>
        item.id === itemId ? { ...item, status: 'Responding' } : item
      );
    });
  }

  markAsRescued(itemId: string): void {
    const updateUrl = `https://resqalert-22692-default-rtdb.asia-southeast1.firebasedatabase.app/reports/${itemId}.json`;
    this.http.patch(updateUrl, { status: 'Rescued' }).subscribe(() => {
      this.firebaseData = this.firebaseData.map(item =>
        item.id === itemId ? { ...item, status: 'Rescued' } : item
      );
    });
  }

  markAsInvalid(itemId: string): void {
    const updateUrl = `https://resqalert-22692-default-rtdb.asia-southeast1.firebasedatabase.app/reports/${itemId}.json`;
    this.http.patch(updateUrl, { status: 'Invalid' }).subscribe(() => {
      this.firebaseData = this.firebaseData.map(item =>
        item.id === itemId ? { ...item, status: 'Invalid' } : item
      );
    });
  }

  logout(): void {
    this.router.navigate(['/login']);
  }
}
