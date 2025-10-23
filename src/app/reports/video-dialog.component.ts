import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-video-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-4 text-center">
      <video controls autoplay muted class="rounded-xl max-w-full max-h-[80vh]">
        <source [src]="data.videoUrl" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  `
})
export class VideoDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<VideoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { videoUrl: string }
  ) {}
}
