import { Component, Input, Output, EventEmitter, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FeedbackDialog } from '../../feedback-dialog/feedback-dialog';
import { ChangeAccountDialog } from '../../change-account-dialog/change-account-dialog';
import { ref, onChildAdded, off } from 'firebase/database';
import { db } from '../../firebase';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, MatDialogModule, FeedbackDialog, ChangeAccountDialog],
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
  dropdownOpen: boolean = false;

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    let initialLoad = true;

    // Unlock audio on first user interaction
    document.addEventListener('click', () => {
      const audio = document.getElementById('alert-audio') as HTMLAudioElement;
      if (audio) {
        audio.play().then(() => audio.pause());
      }
    }, { once: true });

    // Listen for new Firebase reports
    this.listener = onChildAdded(this.reportsRef, (snapshot) => {
      if (!snapshot.exists() || initialLoad) return;

      const reportId = snapshot.key;
      const report   = snapshot.val();

      if (!reportId) {
        console.warn('Report ID is null — skipping SMS trigger.');
        return;
      }

      this.newReportMessage = `New report added: ${report?.title || 'Untitled Report'}`;
      this.triggerAlert();
      this.sendSmsNotification(reportId);
    });

    // Ignore pre-existing children on first load
    setTimeout(() => { initialLoad = false; }, 1000);
  }

  ngOnDestroy(): void {
    if (this.listener) {
      off(this.reportsRef, 'child_added', this.listener);
    }
  }

  // ─── Dropdown ─────────────────────────────────────────────────────────────

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  // Close dropdown when clicking outside the navbar
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('app-navbar')) {
      this.dropdownOpen = false;
    }
  }

  // ─── Alert ────────────────────────────────────────────────────────────────

  triggerAlert(): void {
    this.showNewReportNotification = true;
    const audio = document.getElementById('alert-audio') as HTMLAudioElement;
    if (audio) {
      audio.play().catch(err => {
        console.warn('Autoplay blocked — waiting for user action:', err);
      });
    }
  }

  dismissNotification(): void {
    this.showNewReportNotification = false;
    const audio = document.getElementById('alert-audio') as HTMLAudioElement;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  // ─── SMS ──────────────────────────────────────────────────────────────────

  async sendSmsNotification(reportId: string): Promise<void> {
    try {
      const response = await fetch('https://resqalertwebbackend-1.onrender.com/api/sms/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('SMS notification failed:', errorText);
      }
    } catch (err) {
      console.error('SMS request error:', err);
    }
  }

  // ─── Auth / Dialogs ───────────────────────────────────────────────────────

  logout(): void {
    this.dropdownOpen = false;
    localStorage.clear();
    this.logoutEvent.emit();
  }

  canAccessFeedback(): boolean {
    return ['PNP', 'BFP', 'MDRRMO'].includes(this.role);
  }

  openFeedbackDialog(): void {
    this.dropdownOpen = false;

    if (!this.canAccessFeedback()) {
      alert('You are not allowed to access the feedback form.');
      return;
    }

    const dialogRef = this.dialog.open(FeedbackDialog, {
      width: '400px',
      data: { role: this.role }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result?.message) return;

      const ticket  = `#${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 8)}`;
      const payload = {
        message:     result.message,
        submittedBy: this.role,
        timestamp:   new Date().toISOString(),
        ticket
      };

      fetch('https://resqalert-22692-default-rtdb.asia-southeast1.firebasedatabase.app/feedbacks.json', {
        method: 'POST',
        body:   JSON.stringify(payload)
      })
        .then(() => alert(`Feedback submitted — Ticket ${ticket}`))
        .catch(() => alert('Failed to submit feedback'));
    });
  }

  openAccountDialog(): void {
    this.dropdownOpen = false;

    const dialogRef = this.dialog.open(ChangeAccountDialog, {
      width: '400px',
      data: { role: this.role }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.username || result?.password) {
        alert('Account details updated successfully.');
      }
    });
  }
}
