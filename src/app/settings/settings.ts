import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

  ngOnInit(): void {
    this.selectedTheme = localStorage.getItem('theme') || 'system';
    this.username = localStorage.getItem('username') || '';
    this.applyTheme(); // Apply on load
  }

  applyTheme(): void {
    const html = document.documentElement;
    html.setAttribute('data-theme', this.selectedTheme);
    localStorage.setItem('theme', this.selectedTheme);
  }

  updateAccount(): void {
    localStorage.setItem('username', this.username);
    localStorage.setItem('password', this.password); // Not secure – for demo only
    alert('✅ Account updated!');
  }
}
