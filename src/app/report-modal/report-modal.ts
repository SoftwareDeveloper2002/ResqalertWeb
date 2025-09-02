import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-report-modal',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule
  ],
  templateUrl: './report-modal.html'
})
export class ReportModalComponent {
  reportForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ReportModalComponent>
  ) {
    this.reportForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required]
    });
  }

  saveReport() {
    if (this.reportForm.valid) {
      // Send form data back to the parent component or API
      console.log(this.reportForm.value);
      this.dialogRef.close(this.reportForm.value);
    }
  }
}
