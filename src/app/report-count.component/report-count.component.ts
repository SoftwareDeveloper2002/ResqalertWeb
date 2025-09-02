import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ReportModalComponent } from '../report-modal/report-modal';

@Component({
  selector: 'app-report-count',
  standalone: true,
  imports: [ReportModalComponent],
  templateUrl: './report-count.component.html',
  styleUrls: ['./report-count.component.scss']
})
export class ReportCountComponent {

  constructor(private dialog: MatDialog) { }

  openModal() {
    this.dialog.open(ReportModalComponent, {
      width: '400px',   // optional
      data: { title: 'Incident Report' }  // optional, send data to modal
    });
  }
}
