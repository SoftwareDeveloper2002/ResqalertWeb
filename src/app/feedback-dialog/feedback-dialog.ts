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
    <div class="dialog-wrapper">
      <h2 class="dialog-title">📝 We Value Your Feedback</h2>
      <p class="dialog-subtitle">
        Help us improve by sharing your thoughts, suggestions, or issues.
      </p>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field class="feedback-field w-100" appearance="fill">
          <mat-label>Your Feedback</mat-label>
          <textarea
            matInput
            rows="6"
            formControlName="message"
            placeholder="Type your feedback here...">
          </textarea>
          <mat-hint align="start">Minimum 10 characters</mat-hint>
          <mat-error *ngIf="form.controls['message'].hasError('required')">
            Feedback is required.
          </mat-error>
          <mat-error *ngIf="form.controls['message'].hasError('minlength')">
            Feedback must be at least 10 characters long.
          </mat-error>
        </mat-form-field>

        <div class="actions">
          <button mat-stroked-button color="warn" type="button" (click)="close()">
            Cancel
          </button>
          <button
            mat-flat-button
            color="primary"
            type="submit"
            [disabled]="form.invalid">
            🚀 Submit
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .dialog-wrapper {
      padding: 1.8rem;
      border-radius: 16px;
      background: #fff;
      box-shadow: 0 6px 28px rgba(0,0,0,0.12);
      max-width: 520px;
    }
    .dialog-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1a237e;
      margin: 0;
    }
    .dialog-subtitle {
      font-size: 0.95rem;
      color: #555;
      margin: 0.4rem 0 1.5rem;
    }
    .feedback-field textarea {
      border-radius: 10px !important;
      background-color: #f9f9fb !important;
      padding: 12px !important;
      font-size: 0.95rem;
      line-height: 1.5;
    }
    .feedback-field textarea:focus {
      outline: none;
      box-shadow: 0 0 0 2px rgba(63,81,181,0.25);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 1.2rem;
    }
    button[mat-flat-button] {
      font-weight: 600;
      padding: 0.6rem 1.6rem;
      border-radius: 8px;
    }
    button[mat-stroked-button] {
      border-radius: 8px;
      padding: 0.6rem 1.3rem;
    }
  `]
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
      message: ['', [Validators.required, Validators.minLength(10)]]
    });

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
