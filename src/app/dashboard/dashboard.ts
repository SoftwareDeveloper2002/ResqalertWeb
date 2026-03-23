import { Component, OnInit, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { NgChartsModule } from 'ng2-charts';
import { ChartData, ChartType, ChartOptions } from 'chart.js';
import { environment } from '../../environments/environment';
import { catchError, map, of, firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { FeedbackDialog } from '../feedback-dialog/feedback-dialog';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NavbarComponent } from "../shared/navbar/navbar";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { A11yModule } from "@angular/cdk/a11y";
import { SidebarComponent } from '../shared/sidebar/sidebar';

declare global {
  interface Window {
    google: any;
  }
}

interface BarangayCrimeCount {
  barangay: string;
  crimes: Record<string, number>;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    RouterLink,
    SidebarComponent,
    FormsModule,
    RouterLinkActive,
    NgChartsModule,
    MatDialogModule,
    FeedbackDialog,
    NavbarComponent,
    A11yModule
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class Dashboard implements OnInit, AfterViewInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  selectedCrimeType: string = 'All';
  crimeTypes: string[] = [];
  filteredLocationAddresses: { address: string, lat: number, lng: number, crime: string }[] = [];

  firebaseData: any[] = [];
  barangayCrimeCounts: Record<string, Record<string, number>> = {};
  processedBarangays: Set<string> = new Set();

  totalReports = 0;
  rescuedCount = 0;
  invalidCount = 0;
  otherCount = 0;
  selectedMonth: string = 'All';
  selectedExportMonth: string = 'All';

  months = [
    { label: 'All Months', value: 'All' },
    { label: 'January',   value: 'Jan' },
    { label: 'February',  value: 'Feb' },
    { label: 'March',     value: 'Mar' },
    { label: 'April',     value: 'Apr' },
    { label: 'May',       value: 'May' },
    { label: 'June',      value: 'Jun' },
    { label: 'July',      value: 'Jul' },
    { label: 'August',    value: 'Aug' },
    { label: 'September', value: 'Sep' },
    { label: 'October',   value: 'Oct' },
    { label: 'November',  value: 'Nov' },
    { label: 'December',  value: 'Dec' }
  ];

  role: string = '';
  isLoggedIn: boolean = false;
  recentLocationAddresses: { address: string, lat: number, lng: number, crime: string }[] = [];

  roleFilteredPieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: [],
    datasets: [{ data: [], backgroundColor: [] }]
  };

  pieChartType: ChartType = 'pie';
  pieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: [],
    datasets: [{ data: [], backgroundColor: [] }]
  };

  statusPieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: ['After', 'Invalid', 'Others'],
    datasets: [{
      data: [],
      backgroundColor: ['#28a745', '#dc3545', '#6c757d']
    }]
  };

  lineChartType: ChartType = 'line';
  lineChartOptions: ChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Reports per Month' }
    },
    scales: {
      x: { title: { display: true, text: 'Month' } },
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Report Count' },
        ticks: { stepSize: 1 }
      }
    }
  };

  lineChartData: ChartData<'line', number[], string> = {
    labels: [],
    datasets: [{
      label: 'Reports',
      data: [],
      fill: true,
      borderColor: '#0d6efd',
      backgroundColor: 'rgba(13,110,253,0.1)',
      tension: 0.4
    }]
  };

  objectKeys = Object.keys;
  getCrimeTypes = (item: BarangayCrimeCount) => Object.keys(item.crimes);

  get barangayCounts(): BarangayCrimeCount[] {
    return Object.entries(this.barangayCrimeCounts).map(([barangay, crimes]) => ({ barangay, crimes }));
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.role = localStorage.getItem('role') ?? 'Unknown';
    this.isLoggedIn = !!this.role;
    if (this.role === 'SA') {
      this.router.navigate(['/admin-dashboard']);
      return;
    }
    this.loadSummaryFromAPI();
    this.fetchRawDataAndProcessRecentLocations();
  }

  ngAfterViewInit(): void {
    const interval = setInterval(() => {
      if (window.google && window.google.maps?.visualization) {
        this.initHeatMap();
        clearInterval(interval);
      }
    }, 300);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Safely parses a Firebase timestamp value into a JS Date.
   * Handles three formats:
   *   1. Firebase Timestamp object  → { seconds: number, nanoseconds: number }
   *   2. Unix epoch (milliseconds)  → number
   *   3. ISO / date string          → string
   * Returns null when the value cannot be parsed.
   */
  private parseTimestamp(ts: any): Date | null {
    if (!ts) return null;

    let date: Date;

    if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
      // Firebase Timestamp object
      date = new Date(ts.seconds * 1000);
    } else if (typeof ts === 'number') {
      // Unix epoch in milliseconds
      date = new Date(ts);
    } else {
      // ISO string or other string format
      date = new Date(ts);
    }

    return isNaN(date.getTime()) ? null : date;
  }

  // ─── Data loading ─────────────────────────────────────────────────────────

  private loadSummaryFromAPI(): void {
    this.http.get<any>('/api/dashboard/summary').subscribe({
      next: (res) => {
        this.totalReports  = res.totalReports  || 0;
        this.rescuedCount  = res.rescuedCount  || 0;
        this.invalidCount  = res.invalidCount  || 0;
        this.otherCount    = res.otherCount    || 0;

        this.statusPieChartData = {
          labels: ['After', 'Invalid', 'Others'],
          datasets: [{
            data: [this.rescuedCount, this.invalidCount, this.otherCount],
            backgroundColor: ['#28a745', '#dc3545', '#6c757d']
          }]
        };
      },
      error: (err) => console.error('Failed to load summary:', err)
    });
  }

  private async fetchRawDataAndProcessRecentLocations(): Promise<void> {
    const url = 'https://resqalert-22692-default-rtdb.asia-southeast1.firebasedatabase.app/reports.json';
    try {
      const response = await firstValueFrom(this.http.get<any>(url));
      if (!response) return;

      this.firebaseData = Object.entries(response).map(([key, entry]: [string, any]) => {
        const lat = entry.latitude ?? null;
        const lng = entry.longitude ?? null;
        return {
          id: key,
          ...entry,
          googleMapLink: lat && lng ? this.getGoogleMapsLink(lat, lng) : null
        };
      });

      this.generateRecentLocations();
      this.generateMonthlyLineChart();
      await this.generateBarangayCrimeCounts();
      this.generateFlagDistribution();
    } catch (err) {
      console.error('Failed to fetch Firebase data:', err);
    }
  }

  // ─── Chart builders ───────────────────────────────────────────────────────

  private generateFlagDistribution(): void {
    const flagCounts: Record<string, number> = {};
    const userRole = (this.role ?? '').toLowerCase();

    for (const item of this.firebaseData) {
      const flags = Array.isArray(item.flag) ? item.flag : [item.flag || 'Unknown'];

      for (let flag of flags) {
        if (typeof flag === 'string') {
          flag = flag.trim().toUpperCase();
          if (flag === 'MDRMM') flag = 'MDRRMO';
        }
        if (userRole !== 'sa' && flag.toLowerCase() !== userRole) continue;
        flagCounts[flag] = (flagCounts[flag] || 0) + 1;
      }
    }

    const labels = Object.keys(flagCounts);
    const values = labels.map(label => flagCounts[label]);
    const colors = ['#007bff', '#ffc107', '#dc3545', '#28a745', '#6c757d'];

    this.roleFilteredPieChartData = {
      labels,
      datasets: [{
        data: values,
        backgroundColor: labels.map((_, i) => colors[i % colors.length])
      }]
    };
  }

  private generateMonthlyLineChart(): void {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const userRole = (this.role ?? '').toLowerCase();
    const reportCount: Record<string, number> = {};
    const yearsWithData = new Set<number>();

    for (const item of this.firebaseData) {
      const date = this.parseTimestamp(item.timestamp);
      if (!date) continue;

      const flags = Array.isArray(item.flag) ? item.flag : [item.flag || 'Unknown'];
      const matchesRole =
        userRole === 'sa' ||
        flags.some((flag: string | null | undefined) =>
          (flag ?? '').toLowerCase() === userRole
        );

      if (!matchesRole) continue;

      const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      reportCount[label] = (reportCount[label] || 0) + 1;
      yearsWithData.add(date.getFullYear());
    }

    const sortedYears = Array.from(yearsWithData).sort((a, b) => a - b);
    const allLabels: string[] = [];
    sortedYears.forEach(year => {
      monthNames.forEach(month => allLabels.push(`${month} ${year}`));
    });

    this.lineChartData = {
      labels: allLabels,
      datasets: [{
        label: 'Reports',
        data: allLabels.map(label => reportCount[label] || 0),
        borderColor: '#0d6efd',
        backgroundColor: 'rgba(13,110,253,0.1)',
        tension: 0.4,
        fill: true
      }]
    };
  }

  private async generateBarangayCrimeCounts(): Promise<void> {
    this.barangayCrimeCounts = {};
    this.processedBarangays.clear();

    for (const report of this.firebaseData) {
      const { latitude, longitude } = report;
      const latlngKey = `${latitude},${longitude}`;
      if (!latitude || !longitude || this.processedBarangays.has(latlngKey)) continue;

      const address  = await this.getAddressFromCoordinates(latitude, longitude);
      const barangay = this.extractBarangayFromAddress(address);
      if (!barangay) continue;

      this.barangayCrimeCounts[barangay] = this.barangayCrimeCounts[barangay] || {};
      this.barangayCrimeCounts[barangay]['Reports'] =
        (this.barangayCrimeCounts[barangay]['Reports'] || 0) + 1;

      this.processedBarangays.add(latlngKey);
      await new Promise(res => setTimeout(res, 150));
    }
  }

  // ─── Map ──────────────────────────────────────────────────────────────────

  initHeatMap(): void {
    const container = document.getElementById('crimeHeatMap');
    if (!container || !window.google) return;

    const map = new window.google.maps.Map(container, {
      zoom: 16,
      center: { lat: 15.220356, lng: 120.658494 },
      mapTypeId: 'roadmap'
    });

    const heatmapData = this.firebaseData
      .filter(d => d.latitude && d.longitude)
      .map(d => ({
        location: new window.google.maps.LatLng(d.latitude, d.longitude),
        weight: d.crimeWeight || 1
      }));

    const heatmap = new window.google.maps.visualization.HeatmapLayer({
      data: heatmapData,
      radius: 15,
      opacity: 0.7
    });

    heatmap.setMap(map);
  }

  // ─── Locations ────────────────────────────────────────────────────────────

  async generateRecentLocations(): Promise<void> {
    const sorted = [...this.firebaseData]
      .filter(item => item.timestamp)
      .sort((a, b) => {
        const da = this.parseTimestamp(a.timestamp)?.getTime() ?? 0;
        const db = this.parseTimestamp(b.timestamp)?.getTime() ?? 0;
        return db - da;
      });

    const recentCoords = sorted
      .filter(item => item.latitude && item.longitude)
      .slice(0, 50);

    this.recentLocationAddresses = [];
    const crimeSet = new Set<string>();

    for (const item of recentCoords) {
      const address   = await this.getAddressFromCoordinates(item.latitude, item.longitude);
      const crimeType = item.flag?.[0] || 'Unknown';
      this.recentLocationAddresses.push({
        address: address || `${item.latitude}, ${item.longitude}`,
        lat: item.latitude,
        lng: item.longitude,
        crime: crimeType
      });
      crimeSet.add(crimeType);
    }

    this.crimeTypes = Array.from(crimeSet).sort();
    this.filterRecentLocations();
  }

  filterRecentLocations(): void {
    this.filteredLocationAddresses =
      this.selectedCrimeType === 'All'
        ? this.recentLocationAddresses
        : this.recentLocationAddresses.filter(loc => loc.crime === this.selectedCrimeType);
  }

  extractBarangayFromAddress(address: string): string {
    const patterns = [/Brgy\.?\s*([A-Za-z0-9\s]+)/i, /Barangay\s*([A-Za-z0-9\s]+)/i];
    for (const pattern of patterns) {
      const match = address.match(pattern);
      if (match) return `Barangay ${match[1].trim()}`;
    }
    const parts = address.split(',');
    return parts.length > 0 ? parts[0].trim() : 'Unknown';
  }

  getAddressFromCoordinates(lat: number, lng: number): Promise<string> {
    const apiKey = environment.firebase.googleMapsApiKey;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

    return firstValueFrom(
      this.http.get<any>(url).pipe(
        map((response) => {
          if (response.status === 'OK' && Array.isArray(response.results) && response.results.length > 0) {
            const best = response.results.find((r: any) => typeof r.formatted_address === 'string');
            return best?.formatted_address || `${lat}, ${lng}`;
          }
          return 'Unknown Location';
        }),
        catchError(err => {
          console.error('Geocoding failed:', err);
          return of('Error retrieving address');
        })
      )
    );
  }

  getGoogleMapsLink(lat: number, lng: number): string {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }

  // ─── Export PDF ───────────────────────────────────────────────────────────

  exportPDF(): void {
    if (!this.firebaseData || this.firebaseData.length === 0) {
      alert('No data available to export.');
      return;
    }

    const monthInput = this.selectedExportMonth;
    const userRole   = (this.role ?? '').toLowerCase();

    // Step 1: Filter by role
    let filteredReports = this.firebaseData.filter(item => {
      if (userRole === 'sa') return true;
      const flags = Array.isArray(item.flag) ? item.flag : [item.flag || ''];
      return flags.some((f: string) => (f ?? '').toLowerCase() === userRole);
    });

    // Step 2: Filter by selected export month using parseTimestamp
    if (monthInput !== 'All') {
      // months[0] = 'All', so Jan is at index 1 → JS month index 0
      const monthIndex = this.months.findIndex(m => m.value === monthInput) - 1;

      filteredReports = filteredReports.filter(r => {
        const date = this.parseTimestamp(r.timestamp);
        if (!date) return false;
        return date.getMonth() === monthIndex;
      });
    }

    if (filteredReports.length === 0) {
      alert(`No reports found for: ${monthInput === 'All' ? 'any month' : monthInput}`);
      return;
    }

    const monthLabel = this.months.find(m => m.value === monthInput)?.label ?? monthInput;

    const doc       = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text(`ResqAlert Dashboard Report — ${monthLabel}`, pageWidth / 2, 40, { align: 'center' });

    autoTable(doc, {
      head: [['ID', 'Crime Type', 'Status', 'Timestamp', 'Location']],
      body: filteredReports.map(r => {
        const parsedDate = this.parseTimestamp(r.timestamp);
        return [
          r.id ?? 'N/A',
          Array.isArray(r.flag) ? r.flag.join(', ') : r.flag || 'Unknown',
          r.status || 'N/A',
          parsedDate ? parsedDate.toLocaleString() : 'N/A',
          r.latitude && r.longitude ? `${r.latitude}, ${r.longitude}` : 'N/A'
        ];
      }),
      startY: 70,
      theme: 'grid'
    });

    const now = new Date();
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(
      `Generated on: ${now.toLocaleString()}`,
      pageWidth - 40,
      doc.internal.pageSize.getHeight() - 20,
      { align: 'right' }
    );

    doc.save(`resqalert_report_${monthInput}.pdf`);
  }

  // ─── Dialogs / Auth ───────────────────────────────────────────────────────

  openFeedbackDialog(): void {
    const dialogRef = this.dialog.open(FeedbackDialog, {
      width: '400px',
      data: { role: this.role }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.message) {
        const ticket  = `#${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 8)}`;
        const payload = {
          message:     result.message,
          submittedBy: this.role,
          timestamp:   new Date().toISOString(),
          ticket
        };

        this.http.post(
          'https://resqalert-22692-default-rtdb.asia-southeast1.firebasedatabase.app/feedbacks.json',
          payload
        ).subscribe(
          () => alert(`✅ Feedback submitted with Ticket ${ticket}`),
          () => alert('❌ Failed to submit feedback')
        );
      }
    });
  }

  logout(): void {
    this.router.navigate(['/login']);
  }

  // ─── Month filter for chart ───────────────────────────────────────────────

  updateSelectedMonth(): void {
    if (this.selectedMonth === 'All') {
      this.generateMonthlyLineChart();
      return;
    }

    const filteredLabels: string[]  = [];
    const filteredValues: number[]  = [];

    this.lineChartData.labels?.forEach((label, index) => {
      if ((label as string).startsWith(this.selectedMonth)) {
        filteredLabels.push(label as string);
        filteredValues.push(this.lineChartData.datasets[0].data[index] as number);
      }
    });

    this.lineChartData = {
      labels: filteredLabels,
      datasets: [{
        label: 'Reports',
        data: filteredValues,
        borderColor: '#0d6efd',
        backgroundColor: 'rgba(13,110,253,0.1)',
        tension: 0.4,
        fill: true
      }]
    };
  }
}
