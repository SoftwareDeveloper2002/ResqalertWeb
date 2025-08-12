import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-incident-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule
  ],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon color="primary">report</mat-icon>
        &nbsp; Incident Report Details
      </h2>

      <mat-divider></mat-divider>

      <div mat-dialog-content class="dialog-content">
        <section class="form-section">
          <h3 class="section-title">People Involved</h3>

          <mat-form-field appearance="outline">
            <mat-label>Who's Involved</mat-label>
            <input matInput [(ngModel)]="data.whoInvolved" placeholder="e.g. John Doe, Jane Smith" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>No. of People Involved</mat-label>
            <input matInput type="number" [(ngModel)]="data.peopleCount" min="0" />
          </mat-form-field>
        </section>

        <mat-divider></mat-divider>

        <section class="form-section">
          <h3 class="section-title">Incident Information</h3>

          <mat-form-field appearance="outline">
            <mat-label>Details</mat-label>
            <textarea
              matInput
              rows="4"
              [(ngModel)]="data.details"
              placeholder="Brief description of the incident or accident..."
            ></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Additional Notes</mat-label>
            <textarea
              matInput
              rows="3"
              [(ngModel)]="data.notes"
              placeholder="Any other relevant remarks or observations..."
            ></textarea>
          </mat-form-field>
        </section>
      </div>

      <div mat-dialog-actions align="end" class="dialog-actions">
        <button mat-stroked-button color="warn" (click)="onCancel()">
          <mat-icon>cancel</mat-icon> Cancel
        </button>
        <button mat-raised-button color="primary" (click)="onSave()">
          <mat-icon>save</mat-icon> Save & Export
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dialog-container {
      max-width: 560px;
      width: 100%;
      padding: 16px;
      box-sizing: border-box;
    }

    .dialog-title {
      display: flex;
      align-items: center;
      font-size: 1.25rem;
      font-weight: 500;
      gap: 8px;
    }

    .dialog-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding-top: 12px;
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .section-title {
      font-size: 1.1rem;
      font-weight: 500;
      margin-bottom: 4px;
      color: #3f51b5;
    }

    .dialog-actions {
      margin-top: 20px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    mat-form-field {
      width: 100%;
    }
  `]
})
export class IncidentDetailsDialog {
  constructor(
    public dialogRef: MatDialogRef<IncidentDetailsDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onSave(): void {
    this.dialogRef.close(this.data);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
