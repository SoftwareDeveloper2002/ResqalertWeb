import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestGetModal } from './request-get-modal';

describe('RequestGetModal', () => {
  let component: RequestGetModal;
  let fixture: ComponentFixture<RequestGetModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestGetModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequestGetModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
