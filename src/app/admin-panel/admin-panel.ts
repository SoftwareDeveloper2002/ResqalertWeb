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
  isLoading = false;

  constructor(private router: Router, private http: HttpClient) {}

  onLogin(): void {
    if (!this.username || !this.password) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Fields',
        text: '⚠️ Username and password are required.',
      });
      return;
    }

    this.isLoading = true;
    Swal.fire({
      title: 'Checking account...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const url = `${environment.databaseURL}/admins.json`;

    this.http.get<any>(url).subscribe({
      next: (data) => {
        let foundRole: string | null = null;
        for (const role in data) {
          const admins = data[role];

          for (const adminKey in admins) {
            const admin = admins[adminKey];

            if (
              admin.username === this.username.trim() &&
              admin.password === this.password
            ) {
              foundRole = role;
              break;
            }
          }

          if (foundRole) break;
        }

        this.isLoading = false;
        Swal.close();

        if (foundRole) {
          localStorage.setItem('role', foundRole);
          localStorage.setItem('username', this.username);

          Swal.fire({
            icon: 'success',
            title: 'Login Successful',
            text: `Role detected: ${foundRole}`,
            timer: 1500,
            showConfirmButton: false
          });

          if (foundRole === 'SA') {
            this.router.navigate(['/admin-dashboard']);
          } else {
            this.router.navigate(['/dashboard']);
          }

        } else {
          Swal.fire({
            icon: 'error',
            title: 'Invalid Credentials',
            text: '❌ Username or password incorrect.',
          });
        }
      },
      error: (err) => {
        this.isLoading = false;
        Swal.close();
        console.error('Error:', err);

        Swal.fire({
          icon: 'error',
          title: 'Database Error',
          text: '❌ Unable to read admin database.',
        });
      }
    });
  }
}
