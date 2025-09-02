import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestIncidentModal } from './request-incident-modal';

describe('RequestIncidentModal', () => {
  let component: RequestIncidentModal;
  let fixture: ComponentFixture<RequestIncidentModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestIncidentModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequestIncidentModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
