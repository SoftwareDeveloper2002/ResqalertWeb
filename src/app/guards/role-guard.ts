import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const expectedRole = route.data['expectedRole'];
    const userRole = localStorage.getItem('role');

    if (userRole === expectedRole) {
      return true;
    }

    this.router.navigate(['/admin-panel']); // 👈 Redirect unauthorized users
    return false;
  }
}
