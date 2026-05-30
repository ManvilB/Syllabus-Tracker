from icalendar import Calendar, Event
from datetime import datetime, timedelta

def generate_ics(syllabus_data):
    cal = Calendar()
    cal.add('prodid', '-//Syllabus Tracker AI//EN')
    cal.add('version', '2.0')

    course_name = syllabus_data.get("course_name", "My Course")
    schedule = syllabus_data.get("schedule", [])

    for item in schedule:
        title = item.get("title", "Assignment")
        item_type = item.get("type", "assignment").lower()
        due_date_str = item.get("due_date")

        if not due_date_str:
            continue

        try:
            # Convert string (YYYY-MM-DD) to a Python datetime object
            due_date = datetime.strptime(due_date_str, "%Y-%m-%d")
            
            # 1. Create the main event (The actual deadline/exam)
            main_event = Event()
            main_event.add('summary', f"{course_name}: {title} Due")
            main_event.add('dtstart', due_date.date()) # All-day event
            cal.add_component(main_event)

            # 2. Generate Study Plan (Only for exams/major projects)
            if item_type in ['exam', 'project', 'midterm', 'final']:
                # Example: Create study blocks 7 days, 3 days, and 1 day before
                study_intervals = [
                    (7, "Spaced Repetition: Concept Review"),
                    (3, "Active Recall: Practice Problems"),
                    (1, "Final Review & Flashcards")
                ]
                
                for days_before, method in study_intervals:
                    study_date = due_date - timedelta(days=days_before)
                    
                    study_event = Event()
                    study_event.add('summary', f"Study for {title} ({method})")
                    study_event.add('dtstart', study_date.date())
                    cal.add_component(study_event)

        except ValueError:
            print(f"Skipping invalid date format: {due_date_str}")
            continue

    # Return the raw calendar file as bytes
    return cal.to_ical()