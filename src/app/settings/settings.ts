import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { getDatabase, ref, update, get } from 'firebase/database'; // Firebase Realtime DB

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html'
})
export class Settings implements OnInit {
  selectedTheme: string = 'system';
  username: string = '';
  password: string = '';
  phoneNumber: string = '';
  role: string = '';

  ngOnInit(): void {
    this.selectedTheme = localStorage.getItem('theme') || 'system';
    this.username = localStorage.getItem('username') || '';
    this.role = localStorage.getItem('role') || ''; // 👈 get role of logged-in user
    this.applyTheme();

    // Load existing phone number from Firebase
    if (this.role && this.username) {
      const db = getDatabase();
      const userRef = ref(db, `${this.role}/admin1`);
      get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          this.phoneNumber = data.phoneNumber || '';
        }
      });
    }
  }

  applyTheme(): void {
    const html = document.documentElement;
    html.setAttribute('data-theme', this.selectedTheme);
    localStorage.setItem('theme', this.selectedTheme);
  }

  updateAccount(): void {
    localStorage.setItem('username', this.username);
    localStorage.setItem('password', this.password); // ⚠️ Not secure – for demo only

    if (!this.role) {
      alert('⚠️ Role not found. Cannot update Firebase.');
      return;
    }

    const db = getDatabase();
    const userRef = ref(db, `${this.role}/admin1`);

    update(userRef, {
      username: this.username,
      password: this.password,
      phoneNumber: this.phoneNumber // 👈 new field
    })
      .then(() => {
        alert('✅ Account updated in Firebase!');
      })
      .catch((error) => {
        console.error(error);
        alert('❌ Failed to update Firebase: ' + error.message);
      });
  }
}
