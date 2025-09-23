import { Component, Input, Output, EventEmitter, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FeedbackDialog } from '../../feedback-dialog/feedback-dialog';
import { ChangeAccountDialog } from '../../change-account-dialog/change-account-dialog';
import { ref, onChildAdded, off } from 'firebase/database';
import { db } from '../../firebase'; // ✅ use the initialized db

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, MatDialogModule, FeedbackDialog, ChangeAccountDialog],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  @Input() role: string = '';
  @Input() isLoggedIn: boolean = false;
  @Output() logoutEvent = new EventEmitter<void>();

  private dialog = inject(MatDialog);
  private reportsRef = ref(db, 'reports'); // ✅ Firebase reports reference
  private listener: any;

  // 👇 State for notifications
  showNewReportNotification: boolean = false;
  newReportMessage: string = '';

  ngOnInit(): void {
    let initialLoad = true;

    // ✅ unlock audio on first user click (due to browser autoplay restrictions)
    document.addEventListener("click", () => {
      const audio = document.getElementById("alert-audio") as HTMLAudioElement;
      if (audio) {
        audio.play().then(() => audio.pause()); // preload/unlock
      }
    }, { once: true });

    // ✅ Listen for new reports
    this.listener = onChildAdded(this.reportsRef, (snapshot) => {
      if (snapshot.exists()) {
        if (initialLoad) {
          return; // skip existing reports
        }

        const report = snapshot.val();
        this.newReportMessage = `🚨 New report added: ${report?.title || 'Untitled Report'}`;
        this.triggerAlert(); // ✅ play sound + show overlay
      }
    });

    setTimeout(() => {
      initialLoad = false;
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.listener) {
      off(this.reportsRef, 'child_added', this.listener);
    }
  }

  triggerAlert() {
    this.showNewReportNotification = true;

    const audio = document.getElementById("alert-audio") as HTMLAudioElement;
    if (audio) {
      audio.play().catch(err => {
        console.warn("Autoplay blocked, waiting for user interaction:", err);
      });
    }
  }

  dismissNotification() {
    this.showNewReportNotification = false;

    const audio = document.getElementById("alert-audio") as HTMLAudioElement;
    if (audio) {
      audio.pause();
      audio.currentTime = 0; // rewind
    }
  }

  logout(): void {
    localStorage.clear();
    this.logoutEvent.emit();
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

  openAccountDialog(): void {
    const dialogRef = this.dialog.open(ChangeAccountDialog, {
      width: '400px',
      data: { role: this.role }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.username || result?.password) {
        console.log('🔄 Updating account with:', result);
        alert('✅ Account details updated successfully.');
      }
    });
  }
}
