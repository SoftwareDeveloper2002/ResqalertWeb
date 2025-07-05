import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-feedback-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>📝 Submit Feedback</h2>
    <form [formGroup]="form" (ngSubmit)="submit()" class="p-3">
      <mat-form-field class="w-100" appearance="outline">
        <mat-label>Your Feedback</mat-label>
        <textarea matInput rows="5" formControlName="message"></textarea>
      </mat-form-field>

      <div class="mt-3 d-flex justify-content-end">
        <button mat-button type="button" (click)="close()">Cancel</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid">Submit</button>
      </div>
    </form>
  `
})
export class FeedbackDialog {
  form: FormGroup;
  submittedBy: string = 'Anonymous';

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<FeedbackDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { role?: string } | null
  ) {
    this.form = this.fb.group({
      message: ['', Validators.required]
    });

    // Safely resolve role from dialog data or localStorage
    const roleFromDialog = data?.role;
    const roleFromStorage = localStorage.getItem('role');

    if (roleFromDialog && roleFromDialog !== 'Unknown') {
      this.submittedBy = roleFromDialog;
    } else if (roleFromStorage && roleFromStorage !== 'Unknown') {
      this.submittedBy = roleFromStorage;
    }
  }

  submit(): void {
    if (this.form.valid) {
      const feedback = {
        message: this.form.value.message,
        timestamp: Date.now(),
        ticket: `#${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
        submittedBy: this.submittedBy
      };
      this.dialogRef.close(feedback);
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
