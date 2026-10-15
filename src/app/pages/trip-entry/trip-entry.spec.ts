import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TripEntry } from './trip-entry';

describe('TripEntry', () => {
  let component: TripEntry;
  let fixture: ComponentFixture<TripEntry>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripEntry],
    }).compileComponents();

    fixture = TestBed.createComponent(TripEntry);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
