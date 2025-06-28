import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { NgChartsModule } from 'ng2-charts';
import { ChartData, ChartType, ChartOptions } from 'chart.js';
import { environment } from '../../environments/environment';
import { catchError, map, of, firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';

declare global {
  interface Window {
    google: any;
  }
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
    NgChartsModule
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class Dashboard implements OnInit, AfterViewInit {
  selectedCrimeType: string = 'All';
  crimeTypes: string[] = [];
  filteredLocationAddresses: { address: string, lat: number, lng: number, crime: string }[] = [];

  firebaseData: any[] = [];

  totalReports = 0;
  rescuedCount = 0;
  invalidCount = 0;
  otherCount = 0;

  role: string = '';
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

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    this.role = localStorage.getItem('role') || 'Unknown';

    const url = 'https://resqalert-22692-default-rtdb.asia-southeast1.firebasedatabase.app/reports.json';
    this.http.get<any>(url).subscribe((response) => {
      if (response) {
        this.firebaseData = Object.entries(response).map(([key, entry]: [string, any]) => {
          const lat = entry.latitude ?? null;
          const lng = entry.longitude ?? null;
          return {
            id: key,
            ...entry,
            googleMapLink: lat && lng ? this.getGoogleMapsLink(lat, lng) : null
          };
        });

        this.updateAnalytics();
        this.generateFlagPieChart();
        this.generateMonthlyLineChart();
        this.generateRecentLocations();
        this.initHeatMap();
      }
    });
  }

  ngAfterViewInit(): void {
    const interval = setInterval(() => {
      if (window.google && window.google.maps && window.google.maps.visualization) {
        this.initHeatMap();
        clearInterval(interval);
      }
    }, 300);
  }

  initHeatMap(): void {
    const heatmapContainer = document.getElementById("crimeHeatMap");
    if (!heatmapContainer || !window.google) return;

    const map = new window.google.maps.Map(heatmapContainer, {
      zoom: 12,
      center: { lat: 120.6200, lng: 15.0794 },
      mapTypeId: 'roadmap'
    });

    const heatmapData = this.firebaseData
      .filter(d => d.latitude && d.longitude)
      .map(d => ({
        location: new window.google.maps.LatLng(d.latitude, d.longitude),
        weight: d.crimeWeight || 1 // Eto yung nag cacount ng crime for the specific places.
      }));

    const heatmap = new window.google.maps.visualization.HeatmapLayer({
      data: heatmapData,
      radius: 30, // eto yung lawak ng isang crime so gawin nating mas maliit since per brgy sya.
      opacity: 0.7 // familiar naman siguro tayo sa opacity and it's a visibilty of an object.
    });

    heatmap.setMap(map);
  }

  getGoogleMapsLink(lat: number, lng: number): string {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }

  markAsRescued(itemId: string): void {
    const updateUrl = `https://resqalert-22692-default-rtdb.asia-southeast1.firebasedatabase.app/reports/${itemId}.json`;
    this.http.patch(updateUrl, { status: 'Rescued' }).subscribe(() => {
      this.firebaseData = this.firebaseData.map(item =>
        item.id === itemId ? { ...item, status: 'Rescued' } : item
      );
      this.refreshCharts();
    });
  }

  markAsInvalid(itemId: string): void {
    const updateUrl = `https://resqalert-22692-default-rtdb.asia-southeast1.firebasedatabase.app/reports/${itemId}.json`;
    this.http.patch(updateUrl, { status: 'Invalid' }).subscribe(() => {
      this.firebaseData = this.firebaseData.map(item =>
        item.id === itemId ? { ...item, status: 'Invalid' } : item
      );
      this.refreshCharts();
    });
  }

  refreshCharts(): void {
    this.updateAnalytics();
    this.generateFlagPieChart();
    this.generateMonthlyLineChart();
    this.generateRecentLocations();
    this.initHeatMap();
  }

  updateAnalytics(): void {
    this.totalReports = this.firebaseData.length;
    this.rescuedCount = this.firebaseData.filter(item => item.status === 'Rescued').length;
    this.invalidCount = this.firebaseData.filter(item => item.status === 'Invalid').length;
    this.otherCount = this.totalReports - this.rescuedCount - this.invalidCount;

    this.statusPieChartData = {
      labels: ['Rescued', 'Invalid', 'Others'],
      datasets: [{
        data: [this.rescuedCount, this.invalidCount, this.otherCount],
        backgroundColor: ['#28a745', '#dc3545', '#6c757d']
      }]
    };
  }

  generateFlagPieChart(): void {
    const flagCounter: { [key: string]: number } = {};
    this.firebaseData.forEach(item => {
      if (Array.isArray(item.flag)) {
        item.flag.forEach((flag: string) => {
          flagCounter[flag] = (flagCounter[flag] || 0) + 1;
        });
      }
    });

    const labels = Object.keys(flagCounter);
    const data = Object.values(flagCounter);
    const colors = ['#007bff', '#ffc107', '#dc3545', '#28a745', '#6c757d'];

    this.pieChartData = {
      labels,
      datasets: [{
        data,
        backgroundColor: labels.map((_, i) => colors[i % colors.length])
      }]
    };
  }

  generateMonthlyLineChart(): void {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const reportsPerMonth: Record<string, number> = {};
    const yearsWithData = new Set<number>();

    this.firebaseData.forEach(item => {
      if (item.timestamp) {
        const date = new Date(item.timestamp);
        const year = date.getFullYear();
        const month = date.getMonth();
        yearsWithData.add(year);
        const key = `${monthNames[month]} ${year}`;
        reportsPerMonth[key] = (reportsPerMonth[key] || 0) + 1;
      }
    });

    const sortedYears = Array.from(yearsWithData).sort((a, b) => a - b);
    const allLabels: string[] = [];

    sortedYears.forEach(year => {
      monthNames.forEach(month => {
        allLabels.push(`${month} ${year}`);
      });
    });

    const dataPoints = allLabels.map(label => reportsPerMonth[label] || 0);

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

  async generateRecentLocations(): Promise<void> {
    const sorted = [...this.firebaseData]
      .filter(item => item.timestamp)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const recentCoords = sorted
      .filter(item => item.latitude && item.longitude)
      .slice(0, 50);

    this.recentLocationAddresses = [];
    const crimeSet = new Set<string>();

    for (const item of recentCoords) {
      const address = await this.getPlusCodeFromCoordinates(item.latitude, item.longitude);
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
  if (this.selectedCrimeType === 'All') {
    this.filteredLocationAddresses = this.recentLocationAddresses;
  } else {
    this.filteredLocationAddresses = this.recentLocationAddresses.filter(
      loc => loc.crime === this.selectedCrimeType
    );
  }
}


  getPlusCodeFromCoordinates(lat: number, lng: number): Promise<string> {
    const apiKey = environment.firebase.googleMapsApiKey;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

    return firstValueFrom(
      this.http.get<any>(url).pipe(
        map((response: any) => {
          if (response.status === 'OK' && Array.isArray(response.results) && response.results.length > 0) {
            const best = response.results.find((r: any) => typeof r.formatted_address === 'string');
            return best?.formatted_address || `${lat}, ${lng}`;
          }
          console.warn('No geocoding result:', response);
          return 'Unknown Location';
        }),
        catchError(error => {
          console.error('Geocoding failed:', error);
          return of('Error retrieving address');
        })
      )
    );
  }

  logout(): void {
    this.router.navigate(['/login']);
  }
}
