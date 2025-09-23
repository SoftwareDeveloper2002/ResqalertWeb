import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-change-account-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  template: `
    <div class="dialog-container">
      <!-- Header -->
      <h2 class="dialog-title">
        <span class="icon">⚙️</span> Update Account
        <small class="role-badge">{{ data.role }}</small>
      </h2>

      <!-- Form -->
      <mat-dialog-content class="dialog-content">
        <form>
          <mat-form-field appearance="fill" class="w-100 mb-3">
            <mat-label>Username</mat-label>
            <input matInput [(ngModel)]="username" name="username" placeholder="Enter new username">
          </mat-form-field>

          <mat-form-field appearance="fill" class="w-100 mb-3">
            <mat-label>New Password</mat-label>
            <input matInput type="password" [(ngModel)]="password" name="password" placeholder="Enter new password">
          </mat-form-field>

          <mat-form-field appearance="fill" class="w-100 mb-3">
            <mat-label>Confirm Password</mat-label>
            <input matInput type="password" [(ngModel)]="confirmPassword" name="confirmPassword" placeholder="Re-enter password">
          </mat-form-field>

          <mat-form-field appearance="fill" class="w-100">
            <mat-label>Phone Number</mat-label>
            <input matInput type="tel" [(ngModel)]="phone" name="phone" placeholder="+63 912 345 6789">
          </mat-form-field>
        </form>
      </mat-dialog-content>

      <!-- Actions -->
      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-stroked-button color="warn" mat-dialog-close>Cancel</button>
        <button mat-flat-button color="primary" class="save-btn" (click)="save()">Save Changes</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container {
      padding: 10px;
      border-radius: 12px;
    }
    .dialog-title {
      display: flex;
      align-items: center;
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .dialog-title .icon {
      margin-right: 8px;
      font-size: 22px;
    }
    .role-badge {
      background: #e0e7ff;
      color: #4338ca;
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 8px;
      margin-left: auto;
    }
    .dialog-content {
      margin-top: 10px;
    }
    mat-form-field {
      border-radius: 8px;
    }
    .dialog-actions {
      margin-top: 15px;
    }
    .save-btn {
      border-radius: 8px;
      padding: 6px 20px;
    }
  `]
})
export class ChangeAccountDialog implements OnInit {
  username: string = '';
  password: string = '';
  confirmPassword: string = '';
  phone: string = '';

  constructor(
    public dialogRef: MatDialogRef<ChangeAccountDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { role: string }
  ) {}

  async ngOnInit() {
    try {
      const url = `https://resqalert-22692-default-rtdb.asia-southeast1.firebasedatabase.app/${this.data.role}/admin1.json`;
      const res = await fetch(url);
      const existing = await res.json();

      if (existing?.username) this.username = existing.username;
      if (existing?.phone) this.phone = existing.phone;
    } catch (err) {
      console.error('⚠ Failed to load existing account data', err);
    }
  }

  async save() {
    if (!this.username && !this.password && !this.phone) {
      alert('⚠ Please update at least one field.');
      return;
    }
    if (this.password && this.password !== this.confirmPassword) {
      alert('❌ Passwords do not match');
      return;
    }

    try {
      const updatePayload: any = {};
      if (this.username) updatePayload.username = this.username;
      if (this.password) updatePayload.password = this.password;
      if (this.phone) updatePayload.phone = this.phone;

      const url = `https://resqalert-22692-default-rtdb.asia-southeast1.firebasedatabase.app/${this.data.role}/admin1.json`;

      await fetch(url, {
        method: 'PATCH',
        body: JSON.stringify(updatePayload),
        headers: { 'Content-Type': 'application/json' }
      });

      alert('✅ Account details updated successfully.');
      this.dialogRef.close(updatePayload);
    } catch (error) {
      console.error(error);
      alert('❌ Failed to update account details.');
    }
  }
}
