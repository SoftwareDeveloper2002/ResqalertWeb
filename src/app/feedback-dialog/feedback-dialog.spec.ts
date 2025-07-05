import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeedbackDialog } from './feedback-dialog';

describe('FeedbackDialog', () => {
  let component: FeedbackDialog;
  let fixture: ComponentFixture<FeedbackDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeedbackDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeedbackDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
