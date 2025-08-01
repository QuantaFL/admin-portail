import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeacherDashboardHomeComponent } from './teacher-dashboard-home.component';

describe('TeacherDashboardHomeComponent', () => {
  let component: TeacherDashboardHomeComponent;
  let fixture: ComponentFixture<TeacherDashboardHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TeacherDashboardHomeComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TeacherDashboardHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
