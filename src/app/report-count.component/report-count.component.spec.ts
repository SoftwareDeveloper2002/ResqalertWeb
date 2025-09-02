import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportCountComponent } from './report-count.component';

describe('ReportCountComponent', () => {
  let component: ReportCountComponent;
  let fixture: ComponentFixture<ReportCountComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportCountComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportCountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
