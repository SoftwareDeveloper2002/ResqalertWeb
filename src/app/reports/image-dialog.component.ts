import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-image-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  template: `
    <div class="dialog-content">
      <img [src]="data.imageUrl" alt="Report Image" class="img-fluid rounded" />
    </div>
  `,
  styles: [`
    .dialog-content {
      text-align: center;
      padding: 1rem;
    }
    img {
      max-width: 100%;
      height: auto;
    }
  `]
})
export class ImageDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { imageUrl: string }) {}
}
