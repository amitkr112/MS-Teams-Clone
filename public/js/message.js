//DOM variables
let joinCall = document.getElementById("joinCall")
let leaveCall = document.getElementById("leaveCall")
let sendMsgButton = document.getElementById("sendMsgButton")
let msgsContent = document.getElementById("msgs-content")
let signIn = document.getElementById("signIn")
let signOut = document.getElementById("signOut")
let myName = document.getElementById("myName")
let str = location.pathname
let roomId = str.substring(6, str.length - 4);
let email
let cnt = 0; // For tracking how many times join call link is clicked


//Function and other variables
let socket
let serverPort = 3000;//localhost port
let server = getServerUrl();


localStorage.setItem("cnt", 0);

//console.log(roomId)

socket = io(server)

// If the username is empty it must have not signed in 
// Hence don't provide the option of signout
if (myName.innerText === "") {
    signOut.style.display = "none"
}

//Listen for events of messaging
socket.on('msgs', function (data) {
    if (data.room == roomId) {

        //console.log("myEmail")
        //console.log(data.email)
        //console.log(localStorage.getItem("myEmail"))

        // If the email matches with the user's mail
        // append the message to the right
        if (email == data.email)
            append(`You:${data.msg}`, 'right')
        else
            append(`${data.name}:${data.msg}`, 'left')
    }

})


// Getting the url at which server is running
function getServerUrl() {
    return (
        "http" +
        (location.hostname == "localhost" ? "" : "s") +
        "://" +
        location.hostname +
        (location.hostname == "localhost" ? ":" + serverPort : "")
    );
}

// Handling join call click event
joinCall.addEventListener("click", () => {

    let cnt = localStorage.getItem("cnt")

    // If there is no user
    if (myName.innerText == '') {
        Swal.fire("Sign In First")
    }

    // If already joined the call
    else if (localStorage.getItem("cnt") >= 1) {
        Swal.fire("Already Joined the call!! If not joined,rejoin the room")
    }

    // If the above user is signed and has not joined the room yet
    // Let them join the call
    else if (myName.innerText !== '') {
        window.open(`/join/${roomId}`);
        cnt++;
        localStorage.setItem("cnt", cnt);
    }

    // Handling exceptions
    else {
        Swal.fire("Rejoin the room")
    }
})

// When the user leaves the room/call
leaveCall.addEventListener("click", () => {
    window.location.href = "/";
})


/*------------Messaging Functioanlity---------*/

sendMsgButton.addEventListener("click", () => {
    // If the user is not signed in
    if (myName.innerText == "") {
        Swal.fire("Sign In First")
    }

    // If the user is signed in and enter a valid message
    if (sendMessage.value != "" && myName.innerText != "") {

        // console.log("send to the server" + sendMessage.value + name + roomId)
        console.log(roomId)
        // console.log(name)

        append(`You:${sendMessage.value}`, 'right')

        // Emit the message to all the peers in this roomid
        socket.emit("message", {
            name: myName.innerText,
            msg: sendMessage.value,
            room: roomId
        });
        //Clearing the message from input area
        sendMessage.value = ""
    }

})

// Appending the message in the content section
function append(message, position) {
    const messagelement = document.createElement('div');
    messagelement.innerText = message;
    messagelement.classList.add('message');
    messagelement.classList.add(position);
    msgsContent.append(messagelement);
}

/*----------------------------------------------*/

//Whenever the user signed in
function onSignIn(googleUser) {
    // Useful data for your client-side scripts:
    var profile = googleUser.getBasicProfile();

    //console.log("ID: " + profile.getId()); // Don't send this directly to your server!
    //console.log('Full Name: ' + profile.getName());
    //console.log('Given Name: ' + profile.getGivenName());
    //console.log('Family Name: ' + profile.getFamilyName());
    //console.log("Image URL: " + profile.getImageUrl());
    //console.log("Email: " + profile.getEmail());

    // The ID token you need to pass to your backend:
    var id_token = googleUser.getAuthResponse().id_token;
    console.log("ID Token: " + id_token);
    signIn.style.display = 'none'

    //Setting the display name
    myName.innerText = profile.getName();

    //Storing the name and email id to the database
    localStorage.setItem("myName", profile.getName());
    localStorage.setItem("myEmail", profile.getEmail());
    email = profile.getEmail()

    // Showing the signout option to the user
    signOut.style.display = "block"
}

//Whenevr the user signs out
signOut.addEventListener("click", () => {
    //He has to leave the call as well 
    if (cnt) {
        Swal.fire("Rejoin the room!")
        return;
    }
    gapi.auth2.getAuthInstance().signOut().then(function () {
        // Showing sign in option 
        signIn.style.display = "block"
        myName.innerText = "";

        // Removing the name frm localstorage
        localStorage.removeItem("myName")
        signOut.style.display = "none"
        console.log("Signed out")
        email = ""

    })
})