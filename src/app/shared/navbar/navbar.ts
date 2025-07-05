import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FeedbackDialog } from '../../feedback-dialog/feedback-dialog'; // adjust path as needed

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, MatDialogModule, FeedbackDialog],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss']
})
export class NavbarComponent {
  @Input() role: string = '';
  @Input() isLoggedIn: boolean = false;
  @Output() logoutEvent = new EventEmitter<void>();

  private dialog = inject(MatDialog);

  logout(): void {
    localStorage.clear();
    this.logoutEvent.emit(); // let parent handle navigation
  }

  canAccessFeedback(): boolean {
    return ['PNP', 'BFP', 'MDRRMO'].includes(this.role);
  }

  openFeedbackDialog(): void {
    if (!this.canAccessFeedback()) {
      alert('❌ You are not allowed to access the feedback form.');
      return;
    }

    const dialogRef = this.dialog.open(FeedbackDialog, {
      width: '400px',
      data: { role: this.role }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.message) {
        const ticket = `#${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 8)}`;
        const payload = {
          message: result.message,
          submittedBy: this.role,
          timestamp: new Date().toISOString(),
          ticket: ticket
        };

        // Firebase POST (replace with correct path if needed)
        fetch('https://resqalert-22692-default-rtdb.asia-southeast1.firebasedatabase.app/feedbacks.json', {
          method: 'POST',
          body: JSON.stringify(payload)
        }).then(() => {
          alert(`✅ Feedback submitted with Ticket ${ticket}`);
        }).catch(() => {
          alert('❌ Failed to submit feedback');
        });
      }
    });
  }
}
