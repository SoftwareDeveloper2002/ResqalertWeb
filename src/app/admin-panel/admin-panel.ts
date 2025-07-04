import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './admin-panel.html',
  styleUrls: ['./admin-panel.scss']
})
export class AdminPanel {
  username = '';
  password = '';
  selectedRole = ''; // e.g., 'PNP', 'BFP', 'MDRRMO'
  isLoading = false;

  constructor(private router: Router, private http: HttpClient) {}

  onLogin(): void {
    if (!this.username || !this.password || !this.selectedRole) {
      alert('⚠️ All fields are required.');
      return;
    }

    const loginPayload = {
      username: this.username.trim(),
      password: this.password,
      role: this.selectedRole
    };

    const url = `${environment.backendUrl}/api/admin/login`;

    this.isLoading = true;

    this.http.post<{ success: boolean; message: string }>(url, loginPayload).subscribe({
      next: (response) => {
        this.isLoading = false;

        if (response.success) {
          localStorage.setItem('role', this.selectedRole);
          this.router.navigate(['/dashboard']);
        } else {
          alert('❌ ' + response.message);
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Login failed:', err);
        alert('❌ Login failed. Please try again later.');
      }
    });
  }
}
