import { Component, OnInit, ViewChild, OnDestroy, NgZone } from '@angular/core';
import { NavbarComponent } from '../shared/navbar/navbar';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ChartData, ChartOptions } from 'chart.js';
import { NgChartsModule, BaseChartDirective } from 'ng2-charts';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { CommonModule } from '@angular/common';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SidebarComponent } from '../shared/sidebar/sidebar';

interface Report {
  id: string;
  flag?: string[];
  timestamp?: any; // can be number, string, or Firebase Timestamp object
  status?: string;
  latitude?: number;
  longitude?: number;
  [key: string]: any;
}

interface BlockedNumber {
  blockedBy: string;
  phone_number: string;
  reportId: string;
  timestamp: string;
}

@Component({
  selector: 'app-admindashboard',
  standalone: true,
  imports: [NavbarComponent, FormsModule, RouterLink, NgChartsModule, CommonModule, SidebarComponent],
  templateUrl: './admindashboard.html',
  styleUrls: ['./admindashboard.scss']
})
export class Admindashboard implements OnInit, OnDestroy {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  private eventSource?: EventSource;
  role: string = 'Unknown';
  firebaseData: any = {};

  selectedMonth: string = ''; // bound to <input type="month"> → "2025-08" format

  totalReports  = 0;
  totalPNP      = 0;
  totalBFP      = 0;
  totalMDRRMO   = 0;
  totalBlocked  = 0;

  monthlyLineChartData: ChartData<'line', number[], string> = {
    labels: [],
    datasets: [{
      label: 'Reports',
      data: [],
      fill: true,
      borderColor: '#ec4899',
      backgroundColor: 'rgba(236,72,153,0.08)',
      tension: 0.4
    }]
  };

  monthlyLineChartOptions: ChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: true },
      title: { display: true, text: 'Monthly Reports' }
    },
    scales: {
      x: { title: { display: true, text: 'Month' } },
      y: { beginAtZero: true, title: { display: true, text: 'Count' } }
    }
  };

  constructor(
    private router: Router,
    private http: HttpClient,
    private zone: NgZone
  ) {}

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.role = localStorage.getItem('role') ?? 'Unknown';
    this.fetchInitialData();
    this.startRealtimeListener();
  }

  ngOnDestroy(): void {
    this.eventSource?.close();
  }

  // ─── Auth ─────────────────────────────────────────────────────────────────

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Safely parses any Firebase timestamp format into a JS Date.
   * Handles:
   *   1. Firebase Timestamp object  { seconds: number, nanoseconds: number }
   *   2. Unix epoch in milliseconds (number)
   *   3. ISO string or other date string
   * Returns null when the value cannot be parsed.
   */
  private parseTimestamp(ts: any): Date | null {
    if (!ts) return null;

    let date: Date;

    if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
      date = new Date(ts.seconds * 1000);
    } else if (typeof ts === 'number') {
      date = new Date(ts);
    } else {
      date = new Date(ts);
    }

    return isNaN(date.getTime()) ? null : date;
  }

  // ─── Data ─────────────────────────────────────────────────────────────────

  private fetchInitialData(): void {
    const url = `${environment.databaseURL}/.json`;
    this.http.get<any>(url).subscribe({
      next: (data) => {
        this.zone.run(() => {
          this.firebaseData = data || {};
          this.calculateKPIs();
          this.chart?.update();
        });
      },
      error: (err) => console.error('Initial Firebase fetch error:', err)
    });
  }

  private startRealtimeListener(): void {
    const url = `${environment.databaseURL}/.json`;
    this.eventSource = new EventSource(url);

    this.eventSource.onmessage = (event) => {
      this.zone.run(() => {
        try {
          if (!event.data || event.data === 'null') return;
          const data = JSON.parse(event.data);
          this.firebaseData = data || {};
          this.calculateKPIs();
          this.chart?.update();
        } catch (e) {
          console.error('Realtime parse error:', e);
        }
      });
    };

    this.eventSource.onerror = (err) => console.error('Realtime Firebase error:', err);
  }

  private calculateKPIs(): void {
    const reportsData: Report[] = this.firebaseData['reports']
      ? Object.values(this.firebaseData['reports']) as Report[]
      : [];

    const blockedData: BlockedNumber[] = this.firebaseData['blocked_num']
      ? Object.values(this.firebaseData['blocked_num']) as BlockedNumber[]
      : [];

    this.totalReports = reportsData.length;
    this.totalPNP     = reportsData.filter(r => r.flag?.includes('PNP')).length;
    this.totalBFP     = reportsData.filter(r => r.flag?.includes('BFP')).length;
    this.totalMDRRMO  = reportsData.filter(r => r.flag?.includes('MDRRMO')).length;
    this.totalBlocked = blockedData.length;

    // Build monthly line chart using parseTimestamp for safety
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthCount: Record<string, number> = {};

    reportsData.forEach(r => {
      const date = this.parseTimestamp(r.timestamp);
      if (!date) return;
      const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      monthCount[label] = (monthCount[label] || 0) + 1;
    });

    const labels = Object.keys(monthCount).sort((a, b) =>
      new Date('01 ' + a).getTime() - new Date('01 ' + b).getTime()
    );

    this.monthlyLineChartData = {
      ...this.monthlyLineChartData,
      labels,
      datasets: [{
        ...this.monthlyLineChartData.datasets[0],
        data: labels.map(l => monthCount[l])
      }]
    };
  }

  // ─── Export PDF ───────────────────────────────────────────────────────────

  exportPDF(): void {
    const allReports: Report[] = this.firebaseData['reports']
      ? Object.values(this.firebaseData['reports']) as Report[]
      : [];

    const allBlocked: BlockedNumber[] = this.firebaseData['blocked_num']
      ? Object.values(this.firebaseData['blocked_num']) as BlockedNumber[]
      : [];

    if (allReports.length === 0) {
      alert('No data available to export.');
      return;
    }

    // ── Month filter ────────────────────────────────────────────────────────
    // selectedMonth from <input type="month"> is "YYYY-MM" (e.g. "2025-08")
    // or "" when nothing is selected → export all
    let filteredReports = [...allReports];
    let monthLabel      = 'All Months';

    const monthInput = this.selectedMonth?.trim();

    if (monthInput && monthInput !== '') {
      const parts = monthInput.split('-');

      if (parts.length === 2) {
        const targetYear  = parseInt(parts[0], 10);
        const targetMonth = parseInt(parts[1], 10) - 1; // JS months 0-indexed

        filteredReports = allReports.filter(r => {
          const date = this.parseTimestamp(r.timestamp);
          if (!date) return false;
          return date.getFullYear() === targetYear && date.getMonth() === targetMonth;
        });

        // Build human-readable label e.g. "August 2025"
        monthLabel = new Date(targetYear, targetMonth, 1)
          .toLocaleString('en-US', { month: 'long', year: 'numeric' });
      }
    }

    if (filteredReports.length === 0) {
      alert(`No reports found for: ${monthLabel}`);
      return;
    }

    // ── Build PDF ────────────────────────────────────────────────────────────
    const doc       = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(22);
    doc.setTextColor(0, 51, 102);
    doc.setFont('helvetica', 'bold');
    doc.text(`ResqAlert Admin Report — ${monthLabel}`, pageWidth / 2, 40, { align: 'center' });

    // KPI summary cards (always shows totals for the filtered period)
    const filteredPNP     = filteredReports.filter(r => r.flag?.includes('PNP')).length;
    const filteredBFP     = filteredReports.filter(r => r.flag?.includes('BFP')).length;
    const filteredMDRRMO  = filteredReports.filter(r => r.flag?.includes('MDRRMO')).length;

    const kpiValues = [
      { label: 'Total Reports',    value: filteredReports.length, color: [236, 72, 153] as [number,number,number] },
      { label: 'PNP Reports',      value: filteredPNP,            color: [59, 130, 246]  as [number,number,number] },
      { label: 'BFP Reports',      value: filteredBFP,            color: [245, 158, 11]  as [number,number,number] },
      { label: 'MDRRMO Reports',   value: filteredMDRRMO,         color: [16, 185, 129]  as [number,number,number] },
      { label: 'Blocked Numbers',  value: this.totalBlocked,      color: [239, 68, 68]   as [number,number,number] },
    ];

    const cardWidth  = (pageWidth - 80) / kpiValues.length;
    const cardHeight = 40;
    const cardY      = 60;
    let   cardX      = 40;

    kpiValues.forEach(kpi => {
      const [r, g, b] = kpi.color;
      doc.setFillColor(r, g, b);
      doc.roundedRect(cardX, cardY, cardWidth - 8, cardHeight, 4, 4, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(kpi.label, cardX + (cardWidth - 8) / 2, cardY + 13, { align: 'center' });
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(String(kpi.value), cardX + (cardWidth - 8) / 2, cardY + 31, { align: 'center' });
      cardX += cardWidth;
    });

    // Reports table
    autoTable(doc, {
      head: [['ID', 'Flags', 'Status', 'Timestamp', 'Location']],
      body: filteredReports.map(r => {
        const date = this.parseTimestamp(r.timestamp);
        return [
          r.id ?? 'N/A',
          Array.isArray(r.flag) ? r.flag.join(', ') : r.flag || 'N/A',
          r.status || 'N/A',
          date ? date.toLocaleString() : 'N/A',
          r.latitude && r.longitude ? `${r.latitude}, ${r.longitude}` : 'N/A'
        ];
      }),
      startY: cardY + cardHeight + 20,
      theme: 'grid',
      headStyles:          { fillColor: [236, 72, 153], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles:  { fillColor: [253, 242, 248] },
      styles:              { cellPadding: 5, fontSize: 9 }
    });

    // Blocked numbers table (always full list — not month-filtered)
    if (allBlocked.length > 0) {
      autoTable(doc, {
        head: [['Report ID', 'Phone Number', 'Blocked By', 'Timestamp']],
        body: allBlocked.map(b => [
          b.reportId    || 'N/A',
          b.phone_number || 'N/A',
          b.blockedBy   || 'N/A',
          b.timestamp   ? new Date(b.timestamp).toLocaleString() : 'N/A'
        ]),
        startY: (doc as any).lastAutoTable?.finalY + 20,
        theme: 'grid',
        headStyles:         { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [254, 242, 242] },
        styles:             { cellPadding: 5, fontSize: 9 }
      });
    }

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(
      `Generated on: ${new Date().toLocaleString()}`,
      pageWidth - 40,
      doc.internal.pageSize.getHeight() - 20,
      { align: 'right' }
    );

    const filename = monthInput
      ? `resqalert_admin_${monthInput}.pdf`
      : 'resqalert_admin_all.pdf';

    doc.save(filename);
  }
}
