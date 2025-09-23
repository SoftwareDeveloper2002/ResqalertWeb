import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ReportService {
  constructor(private http: HttpClient) {}

  checkNewReports(): Observable<boolean> {
    return this.http.get<{ hasNew: boolean }>('http://localhost:3000/api/reports/check')
      .pipe(map(res => res.hasNew));
  }
}
