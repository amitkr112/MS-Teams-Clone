//DOM variables
let joinCall = document.getElementById("joinCall")
let leaveCall = document.getElementById("leaveCall")
// let msg = document.getElementById("msg")
let sendMsgButton = document.getElementById("sendMsgButton")
let msgsContent = document.getElementById("msgs-content")
let signIn = document.getElementById("signIn")
let signOut = document.getElementById("signOut")
let myName = document.getElementById("myName")
let str = location.pathname
let roomId = str.substring(6, str.length - 4);
let email
let cnt = 0;


//Function and other variables
let socket
let serverPort = 3000;
let server = getServerUrl();


console.log(roomId)

socket = io(server)

if (myName.innerText === "") {
    signOut.style.display = "none"
}

//Listen for events
socket.on('msgs', function (data) {
    if (data.room == roomId) {
        console.log("myEmail")
        console.log(data.email)
        console.log(localStorage.getItem("myEmail"))
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

joinCall.addEventListener("click", () => {
    if (myName.innerText == '') {
        Swal.fire("Sign In First")
    }

    else if (cnt == 1) {
        Swal.fire("Already Joined")

    }
    else if (myName.innerText !== '') {
        window.open(`/join/${roomId}`);
        cnt++;
    }
    else {
        Swal.fire("Rejoin the room")
    }
})
leaveCall.addEventListener("click", () => {
    window.location.href = "/";
})


/*------------Messaging Functioanlity---------*/


sendMsgButton.addEventListener("click", () => {
    if (myName.innerText == "") {
        Swal.fire("Sign In First")
    }
    if (sendMessage.value != "" && myName.innerText != "") {

        // console.log("send to the server" + sendMessage.value + name + roomId)
        // console.log(peerConnections)
        console.log(roomId)
        // console.log(name)
        // msgContent.innerHTML += '<p><strong>' + name + ':</strong>' + sendMessage.value + '</p>'
        append(`You:${sendMessage.value}`, 'right')
        socket.emit("message", {
            name: myName.innerText,
            msg: sendMessage.value,
            room: roomId
        });
        sendMessage.value = ""
    }

})

function append(message, position) {
    const messagelement = document.createElement('div');
    messagelement.innerText = message;
    messagelement.classList.add('message');
    messagelement.classList.add(position);
    msgsContent.append(messagelement);
}



function onSignIn(googleUser) {
    // Useful data for your client-side scripts:
    var profile = googleUser.getBasicProfile();
    console.log("ID: " + profile.getId()); // Don't send this directly to your server!
    console.log('Full Name: ' + profile.getName());
    console.log('Given Name: ' + profile.getGivenName());
    console.log('Family Name: ' + profile.getFamilyName());
    console.log("Image URL: " + profile.getImageUrl());
    console.log("Email: " + profile.getEmail());

    // The ID token you need to pass to your backend:
    var id_token = googleUser.getAuthResponse().id_token;
    console.log("ID Token: " + id_token);
    signIn.style.display = 'none'
    myName.innerText = profile.getName();
    localStorage.setItem("myName", profile.getName());
    localStorage.setItem("myEmail", profile.getEmail());
    email = profile.getEmail()
    signOut.style.display = "block"
}

signOut.addEventListener("click", () => {
    if (cnt) {
        Swal.fire("Rejoin the room!")
        return;
    }
    gapi.auth2.getAuthInstance().signOut().then(function () {
        signIn.style.display = "block"
        myName.innerText = "";
        localStorage.removeItem("myName")
        signOut.style.display = "none"
        console.log("Signed out")
        email = ""

    })
})