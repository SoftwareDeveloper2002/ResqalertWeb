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
  timestamp?: any;
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

  // ── Export filter ─────────────────────────────────────────────────────────
  selectedYear:     string = '';  // e.g. "2025" or "" for all
  selectedMonthNum: string = '';  // e.g. "7" (0-indexed JS month) or "" for all
  availableYears:   number[] = [];

  readonly monthNames = [
    'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'
  ];

  // ── KPIs ──────────────────────────────────────────────────────────────────
  totalReports = 0;
  totalPNP     = 0;
  totalBFP     = 0;
  totalMDRRMO  = 0;
  totalBlocked = 0;

  // ── Chart ─────────────────────────────────────────────────────────────────
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

  // ─── Timestamp helper ─────────────────────────────────────────────────────

  /**
   * Safely parses any Firebase timestamp into a JS Date.
   * Handles:
   *   1. Firebase Timestamp object { seconds, nanoseconds }
   *   2. Unix epoch in milliseconds (number)
   *   3. ISO / date string
   * Returns null for anything unparseable.
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

  // ─── Data fetching ────────────────────────────────────────────────────────

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

  // ─── KPI calculation ──────────────────────────────────────────────────────

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

    this.buildAvailableYears(reportsData);
    this.buildMonthlyChart(reportsData);
  }

  private buildAvailableYears(reportsData: Report[]): void {
    const years = new Set<number>();
    reportsData.forEach(r => {
      const date = this.parseTimestamp(r.timestamp);
      if (date) years.add(date.getFullYear());
    });
    // Sort newest first so the dropdown shows most recent year at top
    this.availableYears = Array.from(years).sort((a, b) => b - a);
  }

  private buildMonthlyChart(reportsData: Report[]): void {
    const shortMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthCount: Record<string, number> = {};

    reportsData.forEach(r => {
      const date = this.parseTimestamp(r.timestamp);
      if (!date) return;
      const label = `${shortMonths[date.getMonth()]} ${date.getFullYear()}`;
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

    // ── Filter by year and/or month ──────────────────────────────────────────
    const hasYear  = this.selectedYear     !== '';
    const hasMonth = this.selectedMonthNum !== '';

    const targetYear  = hasYear  ? parseInt(this.selectedYear, 10)     : null;
    const targetMonth = hasMonth ? parseInt(this.selectedMonthNum, 10)  : null;

    let filteredReports = allReports;

    if (hasYear || hasMonth) {
      filteredReports = allReports.filter(r => {
        const date = this.parseTimestamp(r.timestamp);
        if (!date) return false;
        const yearMatch  = targetYear  === null || date.getFullYear() === targetYear;
        const monthMatch = targetMonth === null || date.getMonth()    === targetMonth;
        return yearMatch && monthMatch;
      });
    }

    // Build human-readable label for the PDF title and filename
    const mLabel   = hasMonth ? this.monthNames[targetMonth!] : '';
    const yLabel   = hasYear  ? this.selectedYear             : '';
    const monthLabel = [mLabel, yLabel].filter(Boolean).join(' ') || 'All Time';

    if (filteredReports.length === 0) {
      alert(`No reports found for: ${monthLabel}`);
      return;
    }

    // ── Build PDF ─────────────────────────────────────────────────────────────
    const doc       = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(22);
    doc.setTextColor(0, 51, 102);
    doc.setFont('helvetica', 'bold');
    doc.text(`ResqAlert Admin Report — ${monthLabel}`, pageWidth / 2, 40, { align: 'center' });

    // KPI cards — counts are recalculated from filteredReports so they match the table
    const filteredPNP    = filteredReports.filter(r => r.flag?.includes('PNP')).length;
    const filteredBFP    = filteredReports.filter(r => r.flag?.includes('BFP')).length;
    const filteredMDRRMO = filteredReports.filter(r => r.flag?.includes('MDRRMO')).length;

    const kpiValues: { label: string; value: number; color: [number, number, number] }[] = [
      { label: 'Total Reports',   value: filteredReports.length, color: [236, 72,  153] },
      { label: 'PNP Reports',     value: filteredPNP,            color: [59,  130, 246] },
      { label: 'BFP Reports',     value: filteredBFP,            color: [245, 158, 11]  },
      { label: 'MDRRMO Reports',  value: filteredMDRRMO,         color: [16,  185, 129] },
      { label: 'Blocked Numbers', value: this.totalBlocked,      color: [239, 68,  68]  },
    ];

    const cardWidth  = (pageWidth - 80) / kpiValues.length;
    const cardHeight = 40;
    const cardY      = 60;
    let   cardX      = 40;

    kpiValues.forEach(kpi => {
      doc.setFillColor(...kpi.color);
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
          r.id                                             ?? 'N/A',
          Array.isArray(r.flag) ? r.flag.join(', ') : r.flag || 'N/A',
          r.status                                         || 'N/A',
          date ? date.toLocaleString()                       : 'N/A',
          r.latitude && r.longitude ? `${r.latitude}, ${r.longitude}` : 'N/A'
        ];
      }),
      startY:              cardY + cardHeight + 20,
      theme:               'grid',
      headStyles:          { fillColor: [236, 72, 153], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles:  { fillColor: [253, 242, 248] },
      styles:              { cellPadding: 5, fontSize: 9 }
    });

    // Blocked numbers table (always full list, not month-filtered)
    if (allBlocked.length > 0) {
      autoTable(doc, {
        head: [['Report ID', 'Phone Number', 'Blocked By', 'Timestamp']],
        body: allBlocked.map(b => [
          b.reportId     || 'N/A',
          b.phone_number || 'N/A',
          b.blockedBy    || 'N/A',
          b.timestamp    ? new Date(b.timestamp).toLocaleString() : 'N/A'
        ]),
        startY:              (doc as any).lastAutoTable?.finalY + 20,
        theme:               'grid',
        headStyles:          { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles:  { fillColor: [254, 242, 242] },
        styles:              { cellPadding: 5, fontSize: 9 }
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

    // Filename: resqalert_admin_2025_August.pdf or resqalert_admin_all.pdf
    const filenameParts = [
      'resqalert_admin',
      hasYear  ? this.selectedYear                      : '',
      hasMonth ? this.monthNames[targetMonth!]           : '',
    ].filter(Boolean);
    doc.save(`${filenameParts.join('_')}.pdf`);
  }
}
