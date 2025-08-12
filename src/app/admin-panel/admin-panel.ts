import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import Swal from 'sweetalert2';

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
      Swal.fire({
        icon: 'warning',
        title: 'Missing Fields',
        text: '⚠️ All fields are required.',
      });
      return;
    }

    const loginPayload = {
      username: this.username.trim(),
      password: this.password,
      role: this.selectedRole
    };

    const url = `${environment.backendUrl}/api/admin/login`;

    // Show loading indicator
    this.isLoading = true;
    Swal.fire({
      title: 'Logging in...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.http.post<{ success: boolean; message: string }>(url, loginPayload).subscribe({
      next: (response) => {
        this.isLoading = false;
        Swal.close();

        if (response.success) {
          localStorage.setItem('role', this.selectedRole);
          this.router.navigate(['/dashboard']);
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Login Failed',
            text: '❌ ' + response.message,
          });
        }
      },
      error: (err) => {
        this.isLoading = false;
        Swal.close();
        console.error('Login failed:', err);
        Swal.fire({
          icon: 'error',
          title: 'Login Error',
          text: '❌ Login failed. Please try again later.',
        });
      }
    });
  }
}
