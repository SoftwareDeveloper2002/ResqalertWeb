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
    FormsModule,
    RouterLinkActive,
    NgChartsModule,
    MatDialogModule,
    FeedbackDialog,
    NavbarComponent
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

  role: string = '';
  isLoggedIn: boolean = false;
  recentLocationAddresses: { address: string, lat: number, lng: number, crime: string }[] = [];

  pieChartType: ChartType = 'pie';
  pieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: [],
    datasets: [{ data: [], backgroundColor: [] }]
  };

  statusPieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: ['Rescued', 'Invalid', 'Others'],
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

  ngOnInit(): void {
    this.role = localStorage.getItem('role') ?? 'Unknown';
    this.isLoggedIn = !!this.role;
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

  openFeedbackDialog(): void {
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

  private loadSummaryFromAPI(): void {
    this.http.get<any>('/api/dashboard/summary').subscribe({
      next: (res) => {
        this.totalReports = res.totalReports || 0;
        this.rescuedCount = res.rescuedCount || 0;
        this.invalidCount = res.invalidCount || 0;
        this.otherCount = res.otherCount || 0;

        this.statusPieChartData = {
          labels: ['Rescued', 'Invalid', 'Others'],
          datasets: [{
            data: [this.rescuedCount, this.invalidCount, this.otherCount],
            backgroundColor: ['#28a745', '#dc3545', '#6c757d']
          }]
        };
      },
      error: (err) => {
        console.error('Failed to load summary:', err);
      }
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

  private generateFlagDistribution(): void {
    const flagCounts: Record<string, number> = {};
    for (const item of this.firebaseData) {
      const flags = Array.isArray(item.flag) ? item.flag : [item.flag || 'Unknown'];
      for (let flag of flags) {
        if (typeof flag === 'string') {
          flag = flag.trim();
          if (flag.toUpperCase() === 'MDRMM') flag = 'MDRMMO';
        }
        flagCounts[flag] = (flagCounts[flag] || 0) + 1;
      }
    }

    const labels = Object.keys(flagCounts);
    const values = labels.map(label => flagCounts[label]);
    const colors = ['#007bff', '#ffc107', '#dc3545', '#28a745', '#6c757d'];

    this.pieChartData = {
      labels,
      datasets: [{
        data: values,
        backgroundColor: labels.map((_, i) => colors[i % colors.length])
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

      const address = await this.getAddressFromCoordinates(latitude, longitude);
      const barangay = this.extractBarangayFromAddress(address);
      if (!barangay) continue;

      this.barangayCrimeCounts[barangay] = this.barangayCrimeCounts[barangay] || {};
      this.barangayCrimeCounts[barangay]['Reports'] = (this.barangayCrimeCounts[barangay]['Reports'] || 0) + 1;

      this.processedBarangays.add(latlngKey);
      await new Promise(res => setTimeout(res, 150));
    }
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

  private generateMonthlyLineChart(): void {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const reportCount: Record<string, number> = {};
    const yearsWithData = new Set<number>();

    for (const item of this.firebaseData) {
      const ts = item.timestamp;
      if (ts) {
        try {
          const date = new Date(ts);
          const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
          reportCount[label] = (reportCount[label] || 0) + 1;
          yearsWithData.add(date.getFullYear());
        } catch (_) {}
      }
    }

    const sortedYears = Array.from(yearsWithData).sort((a, b) => a - b);
    const allLabels: string[] = [];
    sortedYears.forEach(year => {
      monthNames.forEach(month => {
        allLabels.push(`${month} ${year}`);
      });
    });

    const dataPoints = allLabels.map(label => reportCount[label] || 0);

    this.lineChartData = {
      labels: allLabels,
      datasets: [{
        label: 'Reports',
        data: dataPoints,
        borderColor: '#0d6efd',
        backgroundColor: 'rgba(13,110,253,0.1)',
        tension: 0.4,
        fill: true
      }]
    };
  }


  initHeatMap(): void {
    const container = document.getElementById("crimeHeatMap");
    if (!container || !window.google) return;

    const map = new window.google.maps.Map(container, {
      zoom: 12,
      center: { lat: 14.5995, lng: 120.9842 },
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
      radius: 45,
      opacity: 0.7
    });

    heatmap.setMap(map);
  }

  async generateRecentLocations(): Promise<void> {
    const sorted = [...this.firebaseData]
      .filter(item => item.timestamp)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const recentCoords = sorted.filter(item => item.latitude && item.longitude).slice(0, 50);
    this.recentLocationAddresses = [];
    const crimeSet = new Set<string>();

    for (const item of recentCoords) {
      const address = await this.getAddressFromCoordinates(item.latitude, item.longitude);
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
    this.filteredLocationAddresses = this.selectedCrimeType === 'All'
      ? this.recentLocationAddresses
      : this.recentLocationAddresses.filter(loc => loc.crime === this.selectedCrimeType);
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
}
