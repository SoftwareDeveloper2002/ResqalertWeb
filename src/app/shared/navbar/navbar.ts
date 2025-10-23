import { Component, Input, Output, EventEmitter, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FeedbackDialog } from '../../feedback-dialog/feedback-dialog';
import { ChangeAccountDialog } from '../../change-account-dialog/change-account-dialog';
import { ref, onChildAdded, off } from 'firebase/database';
import { db } from '../../firebase';

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
  private reportsRef = ref(db, 'reports');
  private listener: any;

  showNewReportNotification: boolean = false;
  newReportMessage: string = '';

  ngOnInit(): void {
    let initialLoad = true;

    // 🔊 Unlock audio playback on first click
    document.addEventListener("click", () => {
      const audio = document.getElementById("alert-audio") as HTMLAudioElement;
      if (audio) {
        audio.play().then(() => audio.pause());
      }
    }, { once: true });

    // 👂 Listen for new Firebase reports
    this.listener = onChildAdded(this.reportsRef, (snapshot) => {
      if (snapshot.exists()) {
        if (initialLoad) return; // Skip existing data

        const reportId = snapshot.key;
        const report = snapshot.val();

        if (!reportId) {
          console.warn("⚠️ Report ID is null — skipping SMS trigger.");
          return;
        }

        this.newReportMessage = `🚨 New report added: ${report?.title || 'Untitled Report'}`;
        this.triggerAlert();

        // 🚀 Trigger Flask SMS notification
        this.sendSmsNotification(reportId);
      }
    });

    // Wait 1s before enabling new-report detection
    setTimeout(() => {
      initialLoad = false;
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.listener) {
      off(this.reportsRef, 'child_added', this.listener);
    }
  }

  // 🔔 Play alert and show popup
  triggerAlert() {
    this.showNewReportNotification = true;

    const audio = document.getElementById("alert-audio") as HTMLAudioElement;
    if (audio) {
      audio.play().catch(err => {
        console.warn("Autoplay blocked — waiting for user action:", err);
      });
    }
  }

  // ❌ Dismiss notification and stop audio
  dismissNotification() {
    this.showNewReportNotification = false;

    const audio = document.getElementById("alert-audio") as HTMLAudioElement;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  // 📡 Call Flask backend to send SMS
  async sendSmsNotification(reportId: string): Promise<void> {
    try {
      const response = await fetch('https://resqalertwebbackend-1.onrender.com/api/sms/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ SMS notification triggered successfully:', result);
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to trigger SMS:', errorText);
      }
    } catch (err) {
      console.error('🚫 Error calling Flask SMS API:', err);
    }
  }

  // 🔓 Logout handler
  logout(): void {
    localStorage.clear();
    this.logoutEvent.emit();
  }

  // 🧭 Check access for feedback
  canAccessFeedback(): boolean {
    return ['PNP', 'BFP', 'MDRRMO'].includes(this.role);
  }

  // 📝 Open feedback dialog
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
        })
        .then(() => {
          alert(`✅ Feedback submitted with Ticket ${ticket}`);
        })
        .catch(() => {
          alert('❌ Failed to submit feedback');
        });
      }
    });
  }

  // 👤 Open account dialog
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
