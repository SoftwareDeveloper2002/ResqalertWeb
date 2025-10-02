import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MobileApp } from './mobile-app';

describe('MobileApp', () => {
  let component: MobileApp;
  let fixture: ComponentFixture<MobileApp>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileApp]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MobileApp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
