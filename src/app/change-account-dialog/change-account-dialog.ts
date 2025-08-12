import { Component, Inject } from '@angular/core';
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
    <h2 mat-dialog-title>Change Account Details</h2>
    <mat-dialog-content>
      <form>
        <mat-form-field appearance="outline" class="w-100 mb-3">
          <mat-label>New Username</mat-label>
          <input matInput [(ngModel)]="username" name="username">
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-100 mb-3">
          <mat-label>New Password</mat-label>
          <input matInput type="password" [(ngModel)]="password" name="password">
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-100">
          <mat-label>Confirm Password</mat-label>
          <input matInput type="password" [(ngModel)]="confirmPassword" name="confirmPassword">
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="save()">Save</button>
    </mat-dialog-actions>
  `
})
export class ChangeAccountDialog {
  username: string = '';
  password: string = '';
  confirmPassword: string = '';

  constructor(
    public dialogRef: MatDialogRef<ChangeAccountDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { role: string } // role passed from navbar
  ) {}

  async save() {
    if (!this.username && !this.password) {
      alert('⚠ Please enter at least a new username or password.');
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

      const url = `https://resqalert-22692-default-rtdb.asia-southeast1.firebasedatabase.app/admins/${this.data.role}/admin1.json`;

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
