import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';

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
  selectedRole = ''; // 👈 Role: PNP, BFP, MDRRMO

  constructor(private router: Router, private http: HttpClient) {}

  onLogin(): void {
    if (!this.username || !this.password || !this.selectedRole) {
        localStorage.setItem('role', this.selectedRole);
      alert('All fields are required.');
      return;

    }

    const dbUrl = `https://resqalert-22692-default-rtdb.asia-southeast1.firebasedatabase.app/admins/${this.selectedRole}.json`;

    this.http.get<any>(dbUrl).subscribe((users) => {
      if (!users) {
        alert('No users found for selected role.');
        return;
      }

      const matchedUser = Object.values(users).find(
        (user: any) => user.username === this.username && user.password === this.password
      );

      if (matchedUser) {
        console.log(`✅ Login successful as ${this.selectedRole}`);
        this.router.navigate(['/dashboard']);
        localStorage.setItem('role', this.selectedRole);
      } else {
        alert('❌ Invalid credentials');
      }
    }, error => {
      console.error('Error connecting to Firebase:', error);
      alert('Login failed. Please try again later.');
    });
  }
}
