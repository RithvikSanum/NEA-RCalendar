const timetable = document.getElementById("menu");
const taskinfo = document.getElementById('form');
const taskcreation = document.getElementById('addtaskbutton');
const taskdeletion = document.getElementById('deletetaskbutton');
const examtimetable = document.getElementById('etbutton');
const back = document.getElementById('back');
const confirm1 = document.getElementById('settask');
const datepicker = document.getElementById('selectedDate');
const submit = document.getElementById('submit_login');
const submit_signup = document.getElementById('submit_signup');
const home  = document.getElementById('home');
const profile = document.getElementById('profile');
const changedetails = document.getElementById('changedetails');
const method = document.getElementById('method');
const manual_time_selection = document.getElementById('time_selection');
const dayselection = document.getElementById('dayselection');
const timetableform = document.getElementById('timetable');
const singleusertask = document.getElementById('singleusertask');
const gtaskselection = document.getElementById('gtaskselection');
const grouptaskform = document.getElementById('grouptask');
let currentselecteddate = localdate(new Date());//Today's date in YYYY-MM-DD (local time)
let incomplete = false;
let piechart = null;
let barchart = null;

//Colour palette used to give each task colour a softer, consistent look
const palette = {
    grey:  { main: '#64748b', light: '#f1f5f9' },
    blue:  { main: '#3b82f6', light: '#eff6ff' },
    green: { main: '#10b981', light: '#ecfdf5' },
    pink:  { main: '#ec4899', light: '#fdf2f8' },
    coral: { main: '#f97362', light: '#fff1ef' },
};

function getcolour(name){//Returns the palette entry for a task colour
    const key = (name || '').toLowerCase();
    return palette[key] || { main: name, light: 'light' + name };
}

function localdate(d){//Formats a date as YYYY-MM-DD using local time
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
}

function slotlabel(slot){//Converts a timeslot number (1 = 7AM) into a readable time
    const hour = (6 + slot) % 24;
    const suffix = hour < 12 ? 'AM' : 'PM';
    const display = hour % 12 === 0 ? 12 : hour % 12;
    return `${display} ${suffix}`;
}

if (window.Chart){//Default chart styling to match the interface
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#64748b';
}

examtimetable.addEventListener('click', ()=>{
    timetableform.style.display = 'block';
})

document.addEventListener("DOMContentLoaded", function() {
    changedetails.style.display = 'none';
    taskinfo.style.display = 'none';
    dayselection.style.display = 'none';
    timetableform.style.display = 'none';
})

gtaskselection.addEventListener('change', (event)=>{
    selectedvalue = document.getElementById('gtaskselection').value;
    if(selectedvalue == 2){
        grouptaskform.style.display = 'none';
        singleusertask.style.display = 'block';
        document.getElementById('usernamelist').innerHTML = "";
    }
    else{
        grouptaskform.style.display = 'block';
        singleusertask.style.display = 'none';
    }
});

profile.addEventListener('click', ()=>{
    changedetails.style.display = 'block';
});

function openapp(username){//Shows the timetable once the user has logged in or signed up
    document.getElementById('username').value = username;//Keeps the logged in username in one place
    timetable.style.display = 'block';
    datepicker.style.display = 'block';
    home.style.display = 'none';
    datepicker.value = currentselecteddate;//Shows today's tasks straight away
    loadtasks(currentselecteddate, username);
}

submit.addEventListener('click', ()=>{//The user's details are checked to log in
    const username = document.getElementById('username').value.trim();//username and password stored as variables
    const password = document.getElementById('password').value.trim();
    login_function(username,password).then(result =>{
    if(result == -4){//Checks if username or password is empty
        alert("You have to enter a username and password!")
    }
    else if(result.id === 0) { //if the result id=0, the user is directed to their timetable
        openapp(username);
    }
    else if(result.id === 1){//If the id=1, the user's password is wrong
        alert("Login unsuccessful: the password is incorrect.")
    }
    else{//Otherwise the user does not exist
        alert("User does not exist!")
    }});
});

document.getElementById('password').addEventListener('keydown', (event)=>{//Pressing Enter logs in
    if(event.key === 'Enter'){ submit.click(); }
});

submit_signup.addEventListener('click', async()=>{//checks if the signup button is clicked
    id = await signup_function()
    if (id == -1){
        alert("Username in use")
    }
    else if(id==-2){
        alert("Username, Password or Security question answer cannot be empty")
    }
    else{
        openapp(document.getElementById('username_signup').value);//Hides the signup page and opens the timetable
    }
})

datepicker.addEventListener('change', (event)=>{
    currentselecteddate = event.target.value;
    const username = document.getElementById('username').value.trim();
    loadtasks(currentselecteddate,username);
})


method.addEventListener('change', (event)=>{
    if(method.value == "auto"){
        manual_time_selection.style.display = 'none';
        dayselection.style.display='none';
    }
    else if(method.value == "semiauto"){
        manual_time_selection.style.display = 'none';
        dayselection.style.display='block';
    }
    else{
        manual_time_selection.style.display = 'block';
        dayselection.style.display='none';
    }
})

function setremovemode(state){//Turns remove mode on or off and updates the interface
    incomplete = state;
    document.body.classList.toggle('remove-mode', state);
}

taskdeletion.addEventListener('click',()=>{
    setremovemode(!incomplete);
})

taskcreation.addEventListener('click', ()=>{
    confirm1.style.display = 'block';
    taskinfo.style.display = 'block';
    singleusertask.style.display = gtaskselection.value == 2 ? 'block' : 'none';//Shows the fields that match the group task choice
    grouptaskform.style.display = gtaskselection.value == 2 ? 'none' : 'block';
})

back.addEventListener('click',()=>{
    timetable.style.display= 'block';
    taskinfo.style.display = 'none';
    confirm1.style.display = 'none';
    datepicker.style.display = 'block';
})

confirm1.addEventListener('click',()=>{
    timetable.style.display= 'block';
    taskinfo.style.display = 'none';
    confirm1.style.display = 'none';
    datepicker.style.display = 'block';
})

class Task{//General class used to define all tasks
    constructor(username, taskid, taskname, tasktime, taskcolour, timeslot, taskdate, taskdifficulty, type){//Constructor of the class used to store info
        this.username = username
        this.id = taskid;
        this.name = taskname;
        this.tasktime= parseInt(tasktime);
        this.taskcolour= taskcolour;
        this.starttime = parseInt(timeslot);
        this.taskdate = taskdate;
        this.difficulty = taskdifficulty;
        this.type = type;
    }

    createtask() {//function defines the style of the task and assigns it to the timetable
    const div = document.createElement('div');
    const colour = getcolour(this.taskcolour);
    div.dataset.id = this.id;
    div.className = 'gridelement';//Referred to in the CSS file for general style
    const title = document.createElement('span');//Task name
    title.className = 'task-name';
    title.textContent = this.name;
    const meta = document.createElement('span');//Task time and type
    meta.className = 'task-meta';
    meta.textContent = `${slotlabel(this.starttime)} – ${slotlabel(this.starttime + this.tasktime)}` + (this.type ? ` · ${this.type}` : '');
    div.append(title, meta);
    div.style.backgroundColor = colour.light;//Sets the light and dark colours of the task
    div.style.borderLeftColor = colour.main;
    div.style.gridRowStart = this.starttime;
    div.style.gridRowEnd = `span ${this.tasktime}`;
    div.style.gridColumn=1;//Fills one column
    div.title = 'Click to mark complete';

    div.addEventListener('click', () => {
        this.deletetask(this.id, div);});//If task is clicked on it is deleted
    return div;
}
    async deletetask(id,divElement){//Deleting task function
        if(incomplete==true){//Variable used to determine whether task is marked as complete/incomplete
            divElement.remove();
            const res = await fetch(`/removetask/${id}`, { method: 'DELETE' });//Removes the task without completing it
            setremovemode(false);
        }
        else{
        const res = await fetch(`/deletetask/${id}`, { method: 'DELETE' });//Marks the task as completed
        const data = await res.json();
        divElement.remove();//removes the task
        }
        loadtasks(currentselecteddate, this.username);//Refreshes the charts
    }
}

function homepage(){
    timetable.style.display = 'block';
    datepicker.style.display = 'block';
    changedetails.style.display = 'none';
    home.style.display = 'none';
    timetableform.style.display = 'none';
}

async function change_details(){
    if (document.getElementById('username_signup').value != ""){//assigns the username
        username = document.getElementById('username_signup').value;
    }
    else {
        username = document.getElementById('username').value.trim();
    }//assigns the inputs that the user has entered to variables
    const new_username = document.getElementById('new_username').value;
    const new_password = document.getElementById('new_password').value;
    const answer = document.getElementById('answer').value;
    const question = document.getElementById('validation').value;
    const details= {//stores details in a single data structure
        username: username,
        security_question: question,
        answer: answer,
        new_username: new_username,
        new_password: new_password,
    };//sends the details to the backend
    const response= await fetch('/checkdetails', {//calls the correct backend function
        method: 'POST',//sends the data to the backend
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(details)
    })
    const result = await response.json();//receives the response
    if(result.id === 0 || result.id === 1){//keeps the logged in username up to date
        document.getElementById('username').value = new_username;
        document.getElementById('username_signup').value = "";
    }
    if(result.id === 0) {//checks the id and returns correct message
        alert("Username and password changed!")
        homepage()//redirects user to the timetable
    }
    else if(result.id === -2){
        alert("Username in use!")
        homepage()
    }
    else if(result.id === 1){
        alert("Username changed!")
        homepage()
    }
    else if(result.id===2){
        alert("Password changed!")
        homepage()
    }
    else if (result.id === -1){
        alert("Security Question is wrong!")//alerts the user that the answer is wrong
    }
    document.getElementById('userdetails').reset();//clears the form
}

function loadtasks(selecteddate, username) {//This function loads all the tasks into the timetable
    dayslist= [0,0,0,0,0,0,0]
    const heading = new Date(selecteddate + 'T00:00:00');//Shows the selected date as a heading
    document.getElementById('dayheading').textContent = heading.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    fetch('/tasks')//receives tasks from the backend
    .then(response => response.json())//gets data from response
    .then(tasks => {//iterates through all the tasks
            completedtasks= tasks.filter(task=> task.completion == 1 && task.username == username)//iterates through completed tasks
            completedtasks.forEach(taskdata =>{
                taskday = new Date(taskdata.date).getDay()//counts the number of tasks done on particular days
                dayslist[taskday]+=1
            })
        createbarchart(dayslist)//bar chart is created
        const grid = document.getElementById('grid');//defines the grid
        grid.innerHTML = '';//sets inner HTML to none to remove current tasks in it
            //filters tasks based on username, selecteddate and if it has been removed
            currenttasks=tasks.filter(task => task.date === selecteddate && task.username === username && task.removed === 0)
            currenttasks.forEach(taskdata => {//iterates through the filtered tasks
                const task = new Task( //creates new task object with all inputs
                    taskdata.username,
                    taskdata.id,
                    taskdata.name,
                    taskdata.duration,
                    taskdata.colour,
                    taskdata.time,
                    taskdata.date,
                    taskdata.difficulty,
                    taskdata.type,
                );
                grid.appendChild(task.createtask());//appends the task into the timetable
            });
            const labels = currenttasks.map(task => task.name);//adds the piechart using name as label
            const duration = currenttasks.map(task => task.duration);//stores duration of task as data
            const colours = currenttasks.map(task => getcolour(task.colour).main);//selects the colour of the task
            document.getElementById('pie-empty').style.display = currenttasks.length ? 'none' : 'flex';

            createpiechart(labels,duration, colours)//calls piechart to add the task
    });
}

function createbarchart(dayslist){
    const content = document.getElementById("bar-chart").getContext("2d");//chart is extracted
    if(barchart){//Barchart details are updated if the barchart is already defined
        barchart.data.datasets[0].data = dayslist;//list of tasks completed on each day is added
        barchart.update()//barchart is updated
    }
    else{
    barchart = new Chart(content, {//barchart is defined
        type: 'bar',//type is barchart
        data: {
            labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],//labels are added in order of data
            datasets: [{
                label: 'Tasks completed',
                data: dayslist,
                backgroundColor: '#6366f1',//one brand colour for every bar
                borderRadius: 6,
                maxBarThickness: 28,
            }]
        },
        options:{//options are defined
            responsive: true,//chart fills its card
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x:{ grid: { display: false } },
                y:{
                    beginAtZero: true,//chart begins at 0
                    grid: { color: '#eef0f5' },
                    ticks:{
                        precision:0
                    }
                }
            }
        }
    })
    }
}

function createpiechart(labels,duration,colours){//creates piechart
    const content = document.getElementById("pie-chart").getContext('2d');//extracts the chart canvas
    if (piechart){//if piechart exists it changes the data in it
        piechart.data.labels = labels;//labels, duration and colours are defined
        piechart.data.datasets[0].data = duration;
        piechart.data.datasets[0].backgroundColor = colours;
        piechart.update();//piechart is updated
    }
    else{
    piechart = new Chart(content, {//if chart does not exist a new chart is created
        type: 'doughnut',
        data: {//data in the piechart is set
            labels: labels,
            datasets: [{
                label: 'Hours',
                data: duration,
                backgroundColor: colours,
                borderColor: '#ffffff',
                borderWidth: 3
            }]//datasets created
        },
        options: {//custom options of the piechart are set
            responsive: true,
            maintainAspectRatio: false,
            cutout: '62%',
            plugins: {//plugins created
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, padding: 14 }
                }
            }
        }
    });
}
}

async function sendtask(taskdata){
    return fetch('/addtask', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskdata)
    })
    .then(response => response.json())
    .then(data => {
        console.log(data.message);
        return data;
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

async function addtask() {
    const name = document.getElementById('taskname').value;//Saves the details entered by the user about the tasks
    const timetaken = document.getElementById('timetaken').value;
    const taskcolour = document.getElementById('taskcolour').value;
    const timeslot = document.getElementById('timeslot').value;
    const taskdate = document.getElementById('taskdate').value;
    const taskdifficulty = document.getElementById('taskdifficulty').value;
    const type = document.getElementById('type').value;
    const username = document.getElementById('username').value;
    const dateObj = new Date(taskdate);//Stores the date of the task
    const options = { weekday: 'long' };
    const taskday = dateObj.toLocaleDateString('en-GB', options);//identifies the taskday
    const dayselected = document.getElementById('dayselected').value;
    const reschedule = document.getElementById('reschedule').value;//identifies whether the task will be rescheduled
    const listitems = document.querySelectorAll('#usernamelist li')//makes the list of items in the usernames variable
    if(gtaskselection.value == 1){
        schedulingmethod ="auto"
    }
    else{
        schedulingmethod = document.getElementById('method').value;//Stores the method the task is being scheduled by
    }
    const groupmembers = Array.from(listitems).map(li=>{//creates an array of usernames
        const text = li.textContent.trim();
        return text.split(" (")[0];
    });
    groupmembers.push(username);//adds the user's username to the array
    for(const user of groupmembers){
        const taskdata = {//stores data in one data structure
            username: user,
            taskname: name,
            timetaken: timetaken,
            taskcolour: taskcolour,
            timeslot: timeslot,
            taskdate: taskdate,
            completion: 0,
            difficulty: taskdifficulty,
            type: type,
            removed:0,
            taskday: taskday,
            method: schedulingmethod,
            dayselected: dayselected,
            reschedule: reschedule,
        };
        await sendtask(taskdata,schedulingmethod);//sends the task details
    }
    document.getElementById('usernamelist').innerHTML = "";//clears the list after the task is scheduled
    document.getElementById('taskinfo').reset();
    method.dispatchEvent(new Event('change'));//resets the visible fields to match the form
    loadtasks(currentselecteddate, username)
}

async function login_function(username,password) {//The username and password are checked
    if(username=="" || password==""){
        return -4
    }
    const userdata = {//user details sent as list
        username: username,
        password: password,
    };
    const response= await fetch('/uservalidation', { //data is sent to backend
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(userdata)
    })
    const data = await response.json();//Response from the backend is noted
    return data//data is returned
}

async function signup_function() { //Sends new user details to the backend
    username = document.getElementById('username_signup').value;//The values entered are saved to variables
    password = document.getElementById('password_signup').value;
    squestion = document.getElementById('security_question').value;
    sanswer = document.getElementById('security_answer').value;
    dataresponse = await fetch('/signup', {//The signup function in the backend is called and data is sent
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },//JSON methods used to send details
        body: JSON.stringify({ username: username, password: password, security_question: squestion, security_answer: sanswer })
    });
    const data = await dataresponse.json();//Returns userid
    return data.userid;
}

function addsubject(){//Subject is added to the list
    const subject = document.getElementById('subject').value;//Data from fields are retrieved through their ids
    const priority = document.getElementById('priority').value;
    const difficulty = document.getElementById('difficulty').value;
    const hours = document.getElementById('hours').value;
    if(subject === "" || hours === ""){//If all fields are not filled error is sent out
        alert("Enter all fields")
    }
    else{
        const list = document.getElementById('subjectslist')
        const li = document.createElement('li')//Subject is added to the list to be shown to users
        li.innerHTML = `
        <strong>${subject}</strong> <span class="chip-meta">(Priority: ${priority}, Difficulty: ${difficulty}, Hours: ${hours})</span>
        <button type="button" class="chip-remove" aria-label="Remove" onclick="this.parentElement.remove()">&times;</button>
    `;
        list.appendChild(li)//Subject is added to the HTML element
        document.getElementById('subject').value = "";//Clears the inputs ready for the next subject
        document.getElementById('hours').value = "";
    }
}

async function createtimetable(){
    const subjectslist = document.getElementById('subjectslist');//The subjects and their data are fetched
    const subjectlistitem = subjectslist.querySelectorAll('li');//The subjects are extracted from the list HTML element
    const username = document.getElementById('username').value;//Username is fetched

    if(subjectslist){
        for(let i=0; i< subjectlistitem.length; i++){//Rotates through all the subjects
            const element = subjectlistitem[i];//Receives one of the subjects
            const strong = element.querySelector('strong');//extracts subject name
            const taskname = strong ? strong.textContent : "";

            const text = element.textContent;//Extracts subject information such as priority, hours and difficulty
            const match = text.match(/Priority: (\d+), Difficulty: (\d+), Hours: (\d+)/);

            let priority = 1;//Defines the attributes of the subject
            let hours = 1;
            let difficulty = 1;

            if (match) {
                priority = parseInt(match[1], 10);
                difficulty = parseInt(match[2], 10);
                hours = parseInt(match[3], 10);
            }

            for(let h=0; h<hours;h++){//schedules the task using the number of hours
                const taskdata = {//stores data in one data structure
                    username: username,
                    taskname: taskname,
                    timetaken: 1,
                    taskcolour: "blue",
                    timeslot: 7,
                    taskdate: "2025-11-23",
                    completion: 0,
                    difficulty: difficulty,
                    type: "Studying",
                    removed:0,
                    taskday: "Monday",
                    method: "auto",
                    dayselected: "Monday",
                    reschedule: 0,
                };
                await sendtask(taskdata);//sends the task to the backend
            }
        }
    }
    subjectslist.innerHTML = "";//Clears the list and returns to the timetable
    homepage();
    loadtasks(currentselecteddate, username);
}

function addusername(){
    const memberusername = document.getElementById('groupusername').value;//Data from fields are retrieved through their ids
    if(memberusername === ""){//If all fields are not filled error is sent out
        alert("Enter all fields")//returns error if all fields are not entered
    }
    else{
        fetch(`/checkusername/${memberusername}`)
        .then(response => response.text())//response from the backend is noted
        .then(result =>{
            if (result!="False"){//Ensures the user exists
                const list = document.getElementById('usernamelist')
                const li = document.createElement('li')//username is added to the list to be shown to users
                li.innerHTML = `
                <strong>${memberusername}</strong> <span class="chip-meta">(Username: ${memberusername})</span>
                <button type="button" class="chip-remove" aria-label="Remove" onclick="this.parentElement.remove()">&times;</button>
            `;//appends the list
                list.appendChild(li)//username is added to the HTML element
                document.getElementById('groupusername').value = "";
            }
            else{
                alert("User does not exist!")//alerts the user if username does not exist
            }
        })
    }
}
