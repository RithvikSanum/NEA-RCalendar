# RCalendar: Smart Timetable App

A web app that automatically schedules your tasks into the times of day you're most productive.

Built as my A-Level Computer Science NEA, where it was awarded full marks. It's now used daily by 11 people, including me.

## Features

- **Smart scheduling:** places each task in your most productive hours, based on when you've completed similar tasks before
- **Three scheduling modes:** manual (pick the time yourself), automatic (the app picks the best slot), or semi-automatic (pick a preferred day and the app picks the time)
- **Group tasks:** share a task with other users and it's scheduled into every member's timetable
- **Exam timetable generator:** enter your subjects with their priority, difficulty and hours needed, and revision sessions are scheduled for you
- **Weekly repeats:** completed tasks can automatically come back at the same time next week
- **Progress charts:** see how each day's time is split, and which days of the week you complete the most tasks
- **User accounts:** sign up and log in, with a security question for changing your username or password

## How it works

The week is split into 140 one-hour slots (7 days × 20 hours, starting at 7 AM). Every slot starts with a score of 100, and a lower score means a better time for the task.

The score is adjusted using your history:

- Completed a task in that slot: score goes down by 2 × the task's difficulty
- That task was the same type as the new one: score goes down by a further 5
- Removed a task there without completing it: score goes up by 0.5
- Slot is on your preferred day (semi-automatic mode): score goes down by 30

All 140 slots are then sorted from lowest to highest score. The app works down the list and gives the task the first slot that doesn't overlap anything already in your timetable.

The more you use it, the better your timetable fits the times you actually get work done.

## Tech stack

- **Backend:** Python (Flask)
- **Database:** SQLite
- **Frontend:** HTML, CSS, JavaScript, with Chart.js for the charts

## Screenshots

![Login screen](screenshots/login.png)
![Add task form](screenshots/add-task.png)

## Running it locally

1. Clone the repo: `git clone https://github.com/RithvikSanum/rcalendar.git`
2. Move into the folder: `cd rcalendar`
3. Install dependencies: `pip install -r requirements.txt`
4. Run: `python app.py`
5. Open `http://localhost:5000` in your browser

The database files are created automatically the first time the app runs.

## Project structure

```
rcalendar/
├── app.py              # Flask server, routes and scheduling algorithm
├── requirements.txt
├── templates/
│   └── home.html       # Page layout
└── static/
    ├── script.js       # Frontend logic and charts
    └── styles.css      # Styling
```
