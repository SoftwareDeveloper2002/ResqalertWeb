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
// sa taas yung mga imports
declare global { // to declare global variables
  interface Window {
    google: any; // to access google maps
  }
}

interface BarangayCrimeCount { // to define the structure of barangay crime counts
  barangay: string; // name of the barangay
  crimes: Record<string, number>; // crimes in the barangay with their counts
}

@Component({ // to define the component
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
export class Dashboard implements OnInit, AfterViewInit { // to implement OnInit and AfterViewInit interfaces
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
    { label: 'January', value: 'Jan' },
    { label: 'February', value: 'Feb' },
    { label: 'March', value: 'Mar' },
    { label: 'April', value: 'Apr' },
    { label: 'May', value: 'May' },
    { label: 'June', value: 'Jun' },
    { label: 'July', value: 'Jul' },
    { label: 'August', value: 'Aug' },
    { label: 'September', value: 'Sep' },
    { label: 'October', value: 'Oct' },
    { label: 'November', value: 'Nov' },
    { label: 'December', value: 'Dec' }
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
// to define the pie chart data for status distribution
// to define the line chart data for monthly reports
// to define the line chart options
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
  // to get the barangay counts as an array of BarangayCrimeCount objects
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
  // to initialize the component and load data from API and Firebase
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
          'https://resqalert-22692-default-rtdb.asia-southeast1.firebasedatabase.app/feedbacks.json', // Firebase URL to submit feedback
          payload
        ).subscribe(
          () => alert(`✅ Feedback submitted with Ticket ${ticket}`),
          () => alert('❌ Failed to submit feedback')
        );
      }
    });
  }

  logout(): void {
    this.router.navigate(['/login']); // Navigate to login page pag nag logout ka
  }

  private loadSummaryFromAPI(): void {
    this.http.get<any>('/api/dashboard/summary').subscribe({ // to fetch summary data from the API
      next: (res) => {
        this.totalReports = res.totalReports || 0;
        this.rescuedCount = res.rescuedCount || 0;
        this.invalidCount = res.invalidCount || 0;
        this.otherCount = res.otherCount || 0;

        this.statusPieChartData = {
          labels: ['After', 'Invalid', 'Others'],
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
    const url = 'https://resqalert-22692-default-rtdb.asia-southeast1.firebasedatabase.app/reports.json'; // Firebase URL to fetch reports
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
    const userRole = (this.role ?? '').toLowerCase(); // pnp, bfp, mdrrmo, sa

    for (const item of this.firebaseData) {
      const flags = Array.isArray(item.flag) ? item.flag : [item.flag || 'Unknown'];

      for (let flag of flags) {
        if (typeof flag === 'string') {
          flag = flag.trim().toUpperCase();
          if (flag === 'MDRMM') flag = 'MDRRMO'; // normalize typo
        }

        // ROLE FILTER: show only current role
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
    const patterns = [/Brgy\.?\s*([A-Za-z0-9\s]+)/i, /Barangay\s*([A-Za-z0-9\s]+)/i]; // common patterns to match barangay names
    for (const pattern of patterns) { // loop through each pattern
      const match = address.match(pattern);
      if (match) return `Barangay ${match[1].trim()}`;
    }
    const parts = address.split(',');
    return parts.length > 0 ? parts[0].trim() : 'Unknown';
  }

  private generateMonthlyLineChart(): void {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; // array of month names
    const userRole = (this.role ?? '').toLowerCase();
    const reportCount: Record<string, number> = {}; // object to hold report counts
    const yearsWithData = new Set<number>();

    for (const item of this.firebaseData) {
      const ts = item.timestamp;
      if (ts) {
        const flags = Array.isArray(item.flag) ? item.flag : [item.flag || 'Unknown'];

        // Filter by role
        const matchesRole =
          userRole === 'sa' ||
          flags.some((flag: string | null | undefined) =>
            (flag ?? '').toLowerCase() === userRole
          );

        if (!matchesRole) continue;
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
        label: 'Reports', // label for the line chart
        data: dataPoints, // data points for the line chart
        borderColor: '#0d6efd', // color of the line
        backgroundColor: 'rgba(13,110,253,0.1)', // background color for the area under the line
        tension: 0.4, // smoothness of the line
        fill: true // fill the area under the line
      }]
    };
  }


  initHeatMap(): void {
    const container = document.getElementById("crimeHeatMap");
    if (!container || !window.google) return; // Ensure Google Maps is loaded

    const map = new window.google.maps.Map(container, {
      zoom: 16, // zoom to, the higher the number the closer the zoom
      center: { lat: 15.220356, lng: 120.658494 }, // center of the map 15.220356, 120.658494

      mapTypeId: 'roadmap' // as you can see sa googlemap
    });

    const heatmapData = this.firebaseData
      .filter(d => d.latitude && d.longitude) // filter out entries without coordinates
      .map(d => ({
        location: new window.google.maps.LatLng(d.latitude, d.longitude), //  coordinates of the point
        weight: d.crimeWeight || 1 // you can set a weight for each point, default is 1
      }));

    const heatmap = new window.google.maps.visualization.HeatmapLayer({
      data: heatmapData,
      radius: 15,// gaano kalaki ang circle ng heatmap
      opacity: 0.7 // opacity ng heatmap
    });

    heatmap.setMap(map); // to display the heatmap on the map
  }

  async generateRecentLocations(): Promise<void> {
    const sorted = [...this.firebaseData] // to create a copy of firebaseData
      .filter(item => item.timestamp) // to filter out entries without timestamp
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // to sort by timestamp in descending order

    const recentCoords = sorted.filter(item => item.latitude && item.longitude).slice(0, 50); // to get the most recent 50 entries with coordinates
    this.recentLocationAddresses = [];// to store recent location addresses
    const crimeSet = new Set<string>(); // to store unique crime types

    for (const item of recentCoords) {
      const address = await this.getAddressFromCoordinates(item.latitude, item.longitude); // to get address from coordinates
      const crimeType = item.flag?.[0] || 'Unknown'; // to get the crime type from the flag, default to 'Unknown' if not available
      this.recentLocationAddresses.push({
        address: address || `${item.latitude}, ${item.longitude}`,
        lat: item.latitude, // latitude of the location
        lng: item.longitude, // longitude of the location
        crime: crimeType
      });
      crimeSet.add(crimeType); // to add the crime type to the set
    }

    this.crimeTypes = Array.from(crimeSet).sort();
    this.filterRecentLocations();
  }

  filterRecentLocations(): void {
    this.filteredLocationAddresses = this.selectedCrimeType === 'All' // to show all recent locations
      ? this.recentLocationAddresses // to show all recent locations
      : this.recentLocationAddresses.filter(loc => loc.crime === this.selectedCrimeType); // to filter by selected crime type
  }

  getAddressFromCoordinates(lat: number, lng: number): Promise<string> {
    const apiKey = environment.firebase.googleMapsApiKey;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`; // to get address from coordinates using Google Maps Geocoding API

    return firstValueFrom( // to convert observable to promise
      this.http.get<any>(url).pipe( // to make HTTP GET request to the Geocoding API
        map((response) => { // to process the response from the API
          if (response.status === 'OK' && Array.isArray(response.results) && response.results.length > 0) { // check if the response is OK and has results
            const best = response.results.find((r: any) => typeof r.formatted_address === 'string'); // to find the best formatted address
            return best?.formatted_address || `${lat}, ${lng}`; // return the formatted address or coordinates if not found
          }
          return 'Unknown Location'; // return 'Unknown Location' if no address found
        }),
        catchError(err => {
          console.error('Geocoding failed:', err);
          return of('Error retrieving address');
        })
      )
    );
  }

  getGoogleMapsLink(lat: number, lng: number): string { // to generate Google Maps link for the coordinates
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }

  exportPDF(): void {
    if (!this.firebaseData || this.firebaseData.length === 0) {
      alert('No data available to export.');
      return;
    }

    const monthInput = this.selectedExportMonth;

    // Filter by role
    const userRole = (this.role ?? '').toLowerCase();
    let filteredReports = this.firebaseData.filter(item => {
      const flags = Array.isArray(item.flag) ? item.flag : [item.flag || 'Unknown'];
      if (userRole === 'sa') return true;
      return flags.some((flag: string) => flag?.toLowerCase() === userRole);
    });

    // Filter by month
    if (monthInput !== 'All') {
      filteredReports = filteredReports.filter(r => {
        if (!r.timestamp) return false;
        const date = new Date(r.timestamp);
        const monthShort = date.toLocaleString('en-US', { month: 'short' });
        return monthShort === monthInput;
      });
    }

    if (filteredReports.length === 0) {
      alert(`No reports found for: ${monthInput}`);
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text(`ResqAlert Dashboard Data (${monthInput})`, pageWidth / 2, 40, { align: 'center' });

    autoTable(doc, {
      head: [['ID', 'Crime Type', 'Status', 'Timestamp', 'Location']],
      body: filteredReports.map(r => [
        r.id,
        Array.isArray(r.flag) ? r.flag.join(', ') : r.flag || 'Unknown',
        r.status || 'N/A',
        r.timestamp ? new Date(r.timestamp).toLocaleString() : 'N/A',
        r.latitude && r.longitude ? `${r.latitude}, ${r.longitude}` : 'N/A'
      ]),
      startY: 70,
      theme: 'grid'
    });

    const now = new Date();
    doc.setFontSize(10);
    doc.text(`Generated on: ${now.toLocaleString()}`,
      pageWidth - 40,
      doc.internal.pageSize.getHeight() - 20,
      { align: 'right' }
    );

    doc.save(`resqalert_data_${monthInput}.pdf`);
  }


  updateSelectedMonth() {
    if (this.selectedMonth === 'All') {
      this.generateMonthlyLineChart(); // reset to normal
      return;
    }

    const filteredLabels: string[] = [];
    const filteredValues: number[] = [];

    this.lineChartData.labels?.forEach((label, index) => {
      if (label.startsWith(this.selectedMonth)) {
        filteredLabels.push(label);
        filteredValues.push(this.lineChartData.datasets[0].data[index]);
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
