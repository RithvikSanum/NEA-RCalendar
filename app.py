from flask import Flask, request, jsonify, render_template
from datetime import date, timedelta
import sqlite3

app = Flask(__name__)


def usernamecheck(new_username):#Returns True if the username is already in use
    if new_username != "":
        usernames = getusers()
        for i in range(0, len(usernames)):#Checks if username is in use
            if usernames[i] == new_username:
                return True
    return False

def getusers():#Returns all used usernames
    conn = get_connection_user()#Users database is accessed
    cursor = conn.cursor()#All users are fetched
    cursor.execute("""SELECT username FROM users""")
    result = cursor.fetchall()#The answer is saved to result
    conn.close()
    usernames = []
    for row in result:
        usernames += row
    return usernames

def get_connection():#Function used to access the tasks database
    conn = sqlite3.connect("taskdatabase.db")
    conn.row_factory = sqlite3.Row
    return conn

def get_connection_user():#Function used to access the users database
    conn = sqlite3.connect("users.db")
    conn.row_factory = sqlite3.Row
    return conn


#Defines the users table
user_tablecreator = [
    """CREATE TABLE IF NOT EXISTS users (
            userid INTEGER PRIMARY KEY AUTOINCREMENT,
            username text NOT NULL,
            password text NOT NULL,
            security_question text NOT NULL,
            security_answer text NOT NULL
        );""",
]

#Defines the tasks table
task_tablecreator = [
    """CREATE TABLE IF NOT EXISTS tasks (
            username text NOT NULL,
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name text NOT NULL,
            duration INTEGER NOT NULL,
            colour text NOT NULL,
            time INTEGER NOT NULL,
            completion INTEGER NOT NULL,
            date TEXT NOT NULL,
            difficulty INTEGER NOT NULL,
            type text NOT NULL,
            removed INTEGER NOT NULL DEFAULT 0,
            taskday text NOT NULL,
            reschedule INTEGER NOT NULL
        );""",
]

#Uses the function to make the tasks table
with get_connection() as conn:
    cursor = conn.cursor()
    for statement in task_tablecreator:#Executes the SQL to make the table
        cursor.execute(statement)
    conn.commit()

#Uses the function to make the users table
with get_connection_user() as conn:
    cursor = conn.cursor()
    for statement in user_tablecreator:#Executes the SQL to make the table
        cursor.execute(statement)
    conn.commit()


@app.route("/checkusername/<username>")
def checkusername(username):
    conn = get_connection_user()#Connects to the users database
    cursor = conn.cursor()
    cursor.execute("""SELECT userid FROM users WHERE username=?""", (username,))#Finds the userid of the given username
    result = cursor.fetchone()
    conn.close()
    if result is None:
        return "False"#Returns False if username does not exist
    else:
        return "True"#Returns True if username exists

def cost_algorithm(username, tasktype, user_pref):#Generates a cost to schedule a task at a particular slot
    timeslots = {"Monday": {i: 100 for i in range(1, 21)},#Defines the timeslots dictionary and initialises score to 100
                 "Tuesday": {i: 100 for i in range(1, 21)},
                 "Wednesday": {i: 100 for i in range(1, 21)},
                 "Thursday": {i: 100 for i in range(1, 21)},
                 "Friday": {i: 100 for i in range(1, 21)},
                 "Saturday": {i: 100 for i in range(1, 21)},
                 "Sunday": {i: 100 for i in range(1, 21)}
                 }
    conn = get_connection()#Selects tasks which the user has scheduled
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tasks WHERE username=?", (username,))
    rows = cursor.fetchall()#Executes the SQL
    conn.close()
    if user_pref != "None":#Takes into account the user's preferred day
        for i in timeslots[user_pref]:
            timeslots[user_pref][i] -= 30

    for row in rows:#Cycles through all the tasks the user has completed
        timeslot = row[5]#Defines the attributes being used
        day = row[11]
        difficulty = row[8]
        task_type = row[9]
        if row[6] == 1:#Checks if the task is marked as completed
            duration = row[3]
            for i in range(0, duration):
                if timeslot + i <= 20:#Validates to make sure the task does not go over
                    if task_type == tasktype:
                        timeslots[day][timeslot + i] -= 5#Subtracts five if the type matches
                    timeslots[day][timeslot + i] -= (difficulty * 2)#Takes into account the difficulty when subtracting the score
        elif row[6] == 0 and row[10] == 1:
            duration = row[3]#If the task was removed and incomplete, score is added to make the slot less suitable
            for i in range(0, duration):
                if timeslot + i <= 20:#Validation to ensure the task does not go over
                    timeslots[day][timeslot + i] += 0.5

    return timeslots#Returns timeslots

def newdate(day):#Function used to find the next date of a particular day
    currentday = date.today()#Calculates today's date
    daysincrease = (day - currentday.weekday() + 7) % 7#Identifies the days to be added to the current one
    if daysincrease == 0:#If already on the day it changes it to 7 to go to the next date
        daysincrease = 7
    newdate = currentday + timedelta(days=daysincrease)#Defines the new date
    return newdate.isoformat()#Returns the new date as YYYY-MM-DD

def reschedule(taskid):
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    conn = get_connection()#Connection is established with the tasks database
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tasks WHERE id=?", (taskid,))#Task is fetched with taskid
    task = cursor.fetchone()
    conn.close()#Connection is closed with the database
    username = task[0]#Defines the task details
    name = task[2]
    duration = task[3]
    colour = task[4]
    time = task[5]
    difficulty = task[8]
    type = task[9]
    taskday = task[11]
    reschedule = task[12]
    if reschedule == 1:
        for i in range(0, 7):
            if taskday == days[i]:
                inttaskday = i
        new_date = newdate(inttaskday)
        conn = get_connection()#Gets connection to task database
        cursor = conn.cursor()#Adds the task to the chosen timeslot
        cursor.execute("""
                    INSERT into tasks (username, name, duration, colour, time, date, completion, difficulty, type, removed, taskday, reschedule)
                    VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
                    """, (username, name, duration, colour, time, new_date, 0, difficulty, type, 0, taskday, reschedule))
        conn.commit()
        conn.close()#Carries out the SQL


@app.route('/')
def index():#Loads the HTML
    return render_template('home.html')

@app.route('/uservalidation', methods=['POST'])
def uservalidation():#This function checks user details
    data = request.get_json()#Data is requested from the frontend
    username = data.get('username')#Username and password entered are accessed
    password = data.get('password')
    conn = get_connection_user()#Connects to the users database
    cursor = conn.cursor()
    cursor.execute("""SELECT password FROM users WHERE username=?""", (username,))#Fetches the stored password
    result = cursor.fetchone()
    conn.close()#SQL instruction is carried out
    if result is None:#If no data is returned then the username does not exist
        return jsonify({"message": "User does not exist!", "id": -1})
    elif result[0] == password:#Password entered matches database password so user is validated
        return jsonify({"message": "Login Successful!", "id": 0})
    else:#The password entered is incorrect
        return jsonify({"message": "Login Unsuccessful!", "id": 1})

@app.route('/signup', methods=['POST'])
def signup():#This function creates a new instance of user in the database
    data = request.get_json()#Data is requested from the frontend
    username = data.get('username')#Data is split into the variables
    password = data.get('password')
    squestion = data.get('security_question')
    sanswer = data.get('security_answer')
    usernames = getusers()
    if username == "" or password == "" or sanswer == "":#Checks if username, password or answer is empty
        return jsonify({"message": "Field empty", "userid": -2})
    for i in range(0, len(usernames)):#Checks if username is in use
        if usernames[i] == username:
            return jsonify({"message": "Username in use", "userid": -1})
    conn = get_connection_user()#Connection to the users database
    cursor = conn.cursor()
    cursor.execute("""
                   INSERT into users (username, password, security_question, security_answer)
                   VALUES(?,?,?,?)
                   """, (username, password, squestion, sanswer))#Inserts the values the user has entered as a new record
    userid = cursor.lastrowid
    conn.commit()
    conn.close()#SQL is carried out
    return jsonify({"message": "User created successfully", "userid": userid})#Message is sent back to frontend

@app.route('/addtask', methods=['POST'])
def add_task():#A new instance of a task is created
    found = False#Variables defined
    i = 0
    rankedslots = []
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    data = request.get_json()#Data is requested from the frontend
    username = data.get('username')#All the attributes of the task are defined
    task_name = data.get('taskname')
    task_time = data.get('timetaken')
    task_colour = data.get('taskcolour')
    start_time = data.get('timeslot')
    task_date = data.get('taskdate')
    completion = data.get('completion')
    removed = data.get('removed')
    difficulty = data.get('difficulty')
    type = data.get('type')
    taskday = data.get('taskday')
    dayselected = data.get('dayselected')
    reschedule = data.get('reschedule')
    method = data.get('method')

    if method == "manual":#Checks if assignment method is manual
        conn = get_connection()#Connects to the tasks database
        cursor = conn.cursor()#Adds the task and attributes as a new record at the given time
        cursor.execute("""
                    INSERT into tasks (username, name, duration, colour, time, date, completion, difficulty, type, removed, taskday, reschedule)
                    VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
                    """, (username, task_name, task_time, task_colour, start_time, task_date, completion, difficulty, type, removed, taskday, reschedule))
        taskid = cursor.lastrowid#Stores the id of the new task
        conn.commit()
        conn.close()#Carries out the SQL
        return jsonify({"message": "Received", "id": taskid})#Sends success message to the frontend
    elif method == "auto":#Checks if the method of scheduling is automatic
        dayselected = "None"#Sets the preferred day as none so it does not affect the cost algorithm
    time_costs = cost_algorithm(username, type, dayselected)#Cost of each timeslot is calculated

    for day, slots in time_costs.items():#Ranks all the timeslots
        for timeslot, cost in slots.items():#Iterates through all the timeslots and their respective costs
            rankedslots.append((day, timeslot, cost))
    sorted_slots = sorted(rankedslots, key=lambda x: x[2])#Sorts the slots from best to worst

    while found != True:#Loop is used to check that no tasks overlap
        if i >= len(sorted_slots):#Every slot in the week has been tried
            return jsonify({"message": "No free slot available", "id": -1}), 400
        taskday = sorted_slots[i][0]#From the sorted slots the best one is chosen
        for m in range(0, len(days)):#Finds the index of the chosen day
            if days[m] == taskday:
                inttaskday = m
        task_date = newdate(inttaskday)#The date of the chosen day is acquired
        start_time = sorted_slots[i][1]#The time of the best timeslot is chosen
        conn = get_connection()#Connection is created with the task database
        cursor = conn.cursor()
        cursor.execute("""SELECT * FROM tasks WHERE username=? AND date=? AND completion=0 AND removed=0""", (username, task_date))
        existingtasks = cursor.fetchall()#The tasks which are already scheduled are fetched
        conn.close()
        taskend = start_time + int(task_time)#End time is calculated from the start time and duration
        if taskend > 21:#Validation to check that the task doesn't go over daily limits
            taskend = 21
        overlap = False#Flag variable to ensure no overlap
        for task in existingtasks:#This loop ensures there is no overlap between existing tasks
            existingstart = task[5]
            existingend = existingstart + task[3]
            if existingend > 21:
                existingend = 21
            if start_time < existingend and taskend > existingstart:#Checks to make sure start and end times don't overlap
                overlap = True
        if overlap == False:
            found = True#The task can be scheduled
        else:
            i += 1#Moves on to the next best timeslot

    conn = get_connection()#Gets connection to task database
    cursor = conn.cursor()#Adds the task to the chosen timeslot
    cursor.execute("""
                INSERT into tasks (username, name, duration, colour, time, date, completion, difficulty, type, removed, taskday, reschedule)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
                """, (username, task_name, task_time, task_colour, start_time, task_date, completion, difficulty, type, removed, taskday, reschedule))
    taskid = cursor.lastrowid#Identifies the taskid
    conn.commit()
    conn.close()#Carries out the SQL
    return jsonify({"message": "Received", "id": taskid})#Returns success message to frontend

@app.route('/deletetask/<int:taskid>', methods=['DELETE'])
def deletetask(taskid):#The task id is used as a parameter
    conn = get_connection()#Connection is established with the database
    cursor = conn.cursor()#The SQL is used to mark a task as completed and removed
    cursor.execute("UPDATE tasks SET completion = 1, removed = 1 WHERE id = ?", (taskid,))
    conn.commit()
    conn.close()#SQL is carried out
    reschedule(taskid)
    return jsonify({"message": "Task deleted"})#Success message is returned

@app.route('/removetask/<int:taskid>', methods=['DELETE'])
def removetask(taskid):#The task id is used as a parameter
    conn = get_connection()#Connection is established with the database
    cursor = conn.cursor()#The SQL is used to mark a task as incomplete and removed
    cursor.execute("UPDATE tasks SET completion = 0, removed = 1 WHERE id = ?", (taskid,))
    conn.commit()
    conn.close()#SQL is carried out
    return jsonify({"message": "Task deleted"})#Success message is returned

@app.route('/tasks', methods=['GET'])
def returntasks():#This function returns the existing tasks to the frontend
    tasks = []#Variables are defined
    conn = get_connection()#Connection is established with the tasks database
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tasks")#All tasks are fetched
    rows = cursor.fetchall()
    conn.close()#Connection is closed with the database
    for row in rows:#All the tasks fetched are sent to the frontend as a list
        task = {
            "username": row["username"],
            "id": row["id"],
            "name": row["name"],
            "duration": row["duration"],
            "colour": row["colour"],
            "time": row["time"],
            "date": row["date"],
            "completion": row["completion"],
            "difficulty": row["difficulty"],
            "type": row["type"],
            "removed": row["removed"],
            "taskday": row["taskday"]
        }
        tasks.append(task)#The task is added to the overall tasks list
    return jsonify(tasks)#The tasks are returned to the frontend

@app.route('/checkdetails', methods=['POST'])
def checkdetails():#Function is used to check security question and change details
    change_username = False#Variables are defined
    change_password = False
    data = request.get_json()#Data is requested from the frontend
    username = data.get('username')#Variables received are defined
    old_username = username#Old username is saved
    answer = data.get('answer')
    security_question = data.get('security_question')
    new_username = data.get('new_username')
    new_password = data.get('new_password')
    check = usernamecheck(new_username)#Checks if username is already in use
    if check == True:
        return jsonify({"message": "Username in use", "id": -2})
    conn = get_connection_user()#Users database is accessed
    cursor = conn.cursor()#The security question answer is fetched from the database
    cursor.execute("""SELECT security_question, security_answer, userid FROM users WHERE username=?""", (username,))
    result = cursor.fetchone()#The answer is saved to result
    conn.close()
    if result is None:#Error check is carried out to see if user exists
        return jsonify({"message": "User does not exist!", "id": -1})
    if result[0] == security_question and result[1] == answer:#Checks if the security question and answers match
        if new_username != "":#Checks if new username is entered
            username = new_username
            conn = get_connection_user()#Establishes the connection to the users database
            cursor = conn.cursor()#Changes the username to the one entered
            cursor.execute("""UPDATE users SET username=? WHERE userid=?""", (username, result[2],))
            conn.commit()#SQL is carried out
            conn.close()
            conn = get_connection()#The tasks database is accessed
            cursor = conn.cursor()#Changes the username of the tasks to the new one
            cursor.execute("""UPDATE tasks SET username=? WHERE username=?""", (username, old_username,))
            conn.commit()#Carries out the SQL
            conn.close()
            change_username = True#Marks that the username has changed
        if new_password != "":#Checks if new password is entered
            password = new_password
            conn = get_connection_user()#Establishes the connection to the users database
            cursor = conn.cursor()#Changes the password to the one entered
            cursor.execute("""UPDATE users SET password=? WHERE userid=?""", (password, result[2],))
            conn.commit()
            conn.close()#SQL is carried out
            change_password = True#Marks that the password has changed
        if change_username == True and change_password == True:#Returns the correct success message depending on the details changed
            return jsonify({"message": "Password and username changed!", "id": 0})#The id sent to the frontend determines the details that have changed
        elif change_username == True:
            return jsonify({"message": "Username changed!", "id": 1})
        else:
            return jsonify({"message": "Password changed!", "id": 2})
    else:
        return jsonify({"message": "Security question is wrong!", "id": -1})

if __name__ == '__main__':
    app.run(debug=True)
