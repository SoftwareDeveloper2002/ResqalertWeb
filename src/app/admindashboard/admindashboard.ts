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

interface Report {
  id: string;
  flag?: string[];
  timestamp?: number;
  status?: string;
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
  imports: [NavbarComponent, FormsModule, RouterLink, NgChartsModule, CommonModule],
  templateUrl: './admindashboard.html',
  styleUrls: ['./admindashboard.scss']
})
export class Admindashboard implements OnInit, OnDestroy {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  private eventSource?: EventSource;
  role: string = 'Unknown';
  firebaseData: any = {};

  selectedMonth: string = '';

  totalReports = 0;
  totalPNP = 0;
  totalBFP = 0;
  totalMDRRMO = 0;
  totalBlocked = 0;

  monthlyLineChartData: ChartData<'line', number[], string> = {
    labels: [],
    datasets: [
      {
        label: 'Reports',
        data: [],
        fill: true,
        borderColor: '#0d6efd',
        backgroundColor: 'rgba(13,110,253,0.1)',
        tension: 0.4
      }
    ]
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

  constructor(private router: Router, private http: HttpClient, private zone: NgZone) {}

  ngOnInit(): void {
    this.role = localStorage.getItem('role') ?? 'Unknown';
    this.fetchInitialData();
    this.startRealtimeListener();
  }

  ngOnDestroy(): void {
    this.eventSource?.close();
  }

  logout(): void {
    this.router.navigate(['/login']);
  }

  private fetchInitialData() {
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

  private startRealtimeListener() {
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
    const reportsData: Report[] = this.firebaseData['reports'] ? Object.values(this.firebaseData['reports']) as Report[] : [];
    const blockedData: BlockedNumber[] = this.firebaseData['blocked_num'] ? Object.values(this.firebaseData['blocked_num']) as BlockedNumber[] : [];

    this.totalReports = reportsData.length;
    this.totalPNP = reportsData.filter(r => r.flag?.includes('PNP')).length;
    this.totalBFP = reportsData.filter(r => r.flag?.includes('BFP')).length;
    this.totalMDRRMO = reportsData.filter(r => r.flag?.includes('MDRRMO')).length;
    this.totalBlocked = blockedData.length;

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthCount: Record<string, number> = {};
    reportsData.forEach(r => {
      if (!r.timestamp) return;
      const d = new Date(r.timestamp);
      const label = `${months[d.getMonth()]} ${d.getFullYear()}`;
      monthCount[label] = (monthCount[label] || 0) + 1;
    });
    const labels = Object.keys(monthCount).sort((a,b) => new Date(a).getTime() - new Date(b).getTime());
    this.monthlyLineChartData.labels = labels;
    this.monthlyLineChartData.datasets[0].data = labels.map(l => monthCount[l]);
  }

  exportPDF(): void {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(24);
    doc.setTextColor(0, 51, 102);
    doc.setFont('helvetica', 'bold');
    doc.text('ResqAlert Printed Data', pageWidth / 2, 40, { align: 'center' });

    // KPI Summary Cards
    const kpiValues = [
      { label: 'Total Reports', value: this.totalReports, color: [13, 110, 253] },
      { label: 'PNP Reports', value: this.totalPNP, color: [40, 167, 69] },
      { label: 'BFP Reports', value: this.totalBFP, color: [255, 193, 7] },
      { label: 'MDRRMO Reports', value: this.totalMDRRMO, color: [220, 53, 69] },
      { label: 'Blocked Numbers', value: this.totalBlocked, color: [108, 117, 125] }
    ];

    const cardWidth = (pageWidth - 80) / kpiValues.length;
    let startX = 40;
    const startY = 70;
    const cardHeight = 40;

    kpiValues.forEach(kpi => {
      const [r, g, b] = kpi.color;
      doc.setFillColor(r, g, b);
      doc.rect(startX, startY, cardWidth, cardHeight, 'F');
      doc.setTextColor(255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(kpi.label, startX + cardWidth / 2, startY + 14, { align: 'center' });
      doc.setFontSize(16);
      doc.text(String(kpi.value), startX + cardWidth / 2, startY + 30, { align: 'center' });
      startX += cardWidth + 10;
    });

    // Reports Table
    const reports: Report[] = this.firebaseData['reports'] ? Object.values(this.firebaseData['reports']) as Report[] : [];
    autoTable(doc, {
      head: [['ID', 'Flags', 'Status', 'Timestamp']],
      body: reports.map(r => [
        r.id,
        r.flag?.join(', ') || '',
        r.status || '',
        r.timestamp ? new Date(r.timestamp).toLocaleString() : ''
      ]),
      startY: startY + cardHeight + 30,
      theme: 'grid',
      headStyles: { fillColor: [13, 110, 253], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      styles: { cellPadding: 5, fontSize: 10 }
    });

    // Blocked Numbers Table
    const blocked: BlockedNumber[] = this.firebaseData['blocked_num'] ? Object.values(this.firebaseData['blocked_num']) as BlockedNumber[] : [];
    autoTable(doc, {
      head: [['Report ID', 'Phone Number', 'Blocked By', 'Timestamp']],
      body: blocked.map(b => [
        b.reportId,
        b.phone_number,
        b.blockedBy,
        b.timestamp ? new Date(b.timestamp).toLocaleString() : ''
      ]),
      startY: (doc as any).lastAutoTable?.finalY + 30,
      theme: 'grid',
      headStyles: { fillColor: [108, 117, 125], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      styles: { cellPadding: 5, fontSize: 10 }
    });

    // Footer
    const now = new Date();
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(`Generated on: ${now.toLocaleString()}`, pageWidth - 40, doc.internal.pageSize.getHeight() - 20, { align: 'right' });

    doc.save('resqalert_dashboard.pdf');
  }

}
