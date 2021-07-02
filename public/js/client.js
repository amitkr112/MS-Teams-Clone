//DOM variables
let middle = document.getElementsByClassName('middle')
let navbar = document.getElementsByClassName('navbar')
let footer = document.getElementsByClassName('footer')
let content = document.getElementById('content')
let audioButton = document.getElementById("audioButton")
let videoButton = document.getElementById("videoButton")
let leaveButton = document.getElementById("leaveButton")
let moreButton = document.getElementById("moreButton")
let template = document.getElementById("template")
let showButton = document.getElementById("showButton")
let messageButton = document.getElementById("messageButton")
let copyButton = document.getElementById("copyButton")
let closeChat = document.getElementById("closeChat")
let msg = document.getElementById("msg")
let sendButton = document.getElementById("sendButton")
let msgContent = document.getElementById("msg-content")



//Configuring the systems
const isWebRTCSupported = DetectRTC.isWebRTCSupported;
const isMobileDevice = DetectRTC.isMobileDevice;


//Function and other variables
let socket
let serverPort = 5000;
let server = getServerUrl();
let localMediaStream
let useAudio = true;
let useVideo = true;
let remoteMediaControls = false;
let peerConnections = {};
let useRTCDataChannel = true;
let peerMediaElements = {};
let iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
let myVideo;
let roomId = location.pathname.substring(6); //----Skipping/join/----// 
let peers;

console.log("Inside connect function")

//I f the browser does not supports webrtc 
if (!isWebRTCSupported) {
    console.log("The browser does not supports webRTC");
}

socket = io(server)

socket.on("connect", () => {
    console.log("Connected to signaling server");
    if (localMediaStream) joinToChannel();
    else {
        setupLocalMedia(function () {
            joinToChannel()
        });
    }
})

socket.on("addPeer", function (config) {
    // console.log("addPeer", JSON.stringify(config));

    let peer_id = config.peer_id;
    peers = config.peers

    if (peer_id in peerConnections) {
        console.log("Already connected to peer", peer_id);
        return;
    }

    if (config.iceServers) iceServers = config.iceServers;

    peerConnection = new RTCPeerConnection({ iceServers: iceServers });

    peerConnections[peer_id] = peerConnection;


    peerConnections[peer_id].onicecandidate = function (event) {
        if (event.candidate) {
            socket.emit("relayICE", {
                peer_id: peer_id,
                ice_candidate: {
                    sdpMLineIndex: event.candidate.sdpMLineIndex,
                    candidate: event.candidate.candidate,
                    address: event.candidate.address,
                },
            });
        }
    };

    let ontrackCount = 0;
    peerConnections[peer_id].ontrack = function (event) {
        ontrackCount++;
        if (ontrackCount === 2) {
            console.log("ontrack", event);
            remoteMediaStream = event.streams[0];

            const videoWrap = document.createElement("div");

            const remoteMedia = document.createElement("video");
            videoWrap.className = "video";
            videoWrap.appendChild(remoteMedia);
            remoteMedia.setAttribute("id", peer_id + "_video");
            remoteMedia.setAttribute("playsinline", true);
            remoteMedia.mediaGroup = "remotevideo";
            remoteMedia.autoplay = true;
            if (isMobileDevice)
                remoteMediaControls = false;
            else
                remoteMediaControls = remoteMediaControls;
            remoteMedia.controls = remoteMediaControls;
            peerMediaElements[peer_id] = remoteMedia;
            content.appendChild(videoWrap);
            // attachMediaStream is a part of the adapter.js library
            attachMediaStream(remoteMedia, remoteMediaStream);
            resizeVideos();


        }
    };

    localMediaStream.getTracks().forEach(function (track) {
        peerConnections[peer_id].addTrack(track, localMediaStream);
    });

    console.log("Config should ", config)

    if (config.should_create_offer) {
        console.log("Creating RTC offer to", peer_id);
        peerConnections[peer_id].createOffer()
            .then(function (local_description) {
                console.log("Local offer description is", local_description);
                peerConnections[peer_id].setLocalDescription(local_description)
                    .then(function () {
                        socket.emit("relaySDP", {
                            peer_id: peer_id,
                            session_description: local_description,
                        });
                        console.log("Offer setLocalDescription done!");
                    })
                    .catch((e) => {
                        console.error("[Error] offer setLocalDescription", e);
                        console.log(
                            "error",
                            "Offer setLocalDescription failed: " + e.message
                        );
                    });
            })
            .catch((e) => {
                console.error("[Error] sending offer", e);
            });
    }
});

socket.on("msg", function (data) {
    console.log("reveived values", data)
    msgContent.innerHTML += '<p><strong>' + data.name + ':</strong>' + data.msg + '</p>'
})

socket.on("sessionDescription", function (config) {
    console.log("Remote Session-description", config);

    let peer_id = config.peer_id;
    let remote_description = config.session_description;

    let description = new RTCSessionDescription(remote_description);

    // ON receiving the description the peer will set his/her remote description
    // Thereafter the peer will create the answer to that description
    // THta answer will be his local description
    peerConnections[peer_id].setRemoteDescription(description)
        .then(function () {
            console.log("Setting Remote Description is done!");
            if (remote_description.type == "offer") {
                console.log("Creating answer");
                peerConnections[peer_id].createAnswer()
                    .then(function (local_description) {
                        console.log("Answer description is: ", local_description);
                        peerConnections[peer_id].setLocalDescription(local_description)
                            .then(function () {
                                socket.emit("relaySDP", {
                                    peer_id: peer_id,
                                    session_description: local_description,
                                });
                                console.log("Answer setLocalDescription done!");
                            })
                            .catch((e) => {
                                console.log("Error occured in setting Local Description", e.message);
                            });
                    })
                    .catch((e) => {
                        console.log("Error occured in creating answer", e.message);
                    });
            }
        })
        .catch((e) => {
            console.log("Error occured in setting Remote Description", e.message);
        });
});

socket.on("iceCandidate", function (config) {
    let peer_id = config.peer_id;
    let ice_candidate = config.ice_candidate;

    peerConnections[peer_id].addIceCandidate(new RTCIceCandidate(ice_candidate))
        .catch((e) => {
            console.error("Error occured in adding Ice Candidate", e.message);
        });
});


socket.on("disconnect", function () {
    console.log("Disconnected from signaling server");
    //Removing all peers videos
    for (let peer_id in peerMediaElements) {
        content.removeChild(peerMediaElements[peer_id].parentNode);
        //Resizing after load
        resizeVideos();

    }


    for (let peer_id in peerConnections) {
        peerConnections[peer_id].close();
    }
    peerConnections = {};
    peerMediaElements = {};
});

socket.on("removePeer", function (config) {
    console.log("Signaling server said to remove peer:", config);

    let peer_id = config.peer_id;


    //Removing the video element from it's peer's screen
    if (peer_id in peerMediaElements) {
        content.removeChild(peerMediaElements[peer_id].parentNode);
        resizeVideos();
    }
    if (peer_id in peerConnections) {
        peerConnections[peer_id].close();
    }

    delete peerConnections[peer_id];
    delete peerMediaElements[peer_id];
    delete peers[peer_id];


});




/* Auxiliary functions */


function joinToChannel() {
    console.log("join to channel", roomId);
    socket.emit("join", {
        channel: roomId,
        peerName: name,
    });
}

//Setting up local-media
function setupLocalMedia(callback, errorback) {
    // if we've already been initialized do nothing
    if (localMediaStream != null) {
        if (callback) callback();
        return;
    }
    console.log("Requesting audio and video access");

    const constraints = {
        audio: useAudio,
        video: useVideo,
    };
    navigator.mediaDevices.getUserMedia(constraints)
        .then(function (stream) {
            console.log("Access granted to audio/video");
            // hide img bg and loading div
            document.body.style.backgroundImage = "none";

            localMediaStream = stream;
            const addVideo = document.createElement("div");



            const localMedia = document.createElement("video");
            addVideo.className = "video";
            addVideo.setAttribute("id", "myAddVideo");
            addVideo.appendChild(localMedia);
            localMedia.setAttribute("id", "myVideo");
            localMedia.setAttribute("playsinline", true);
            localMedia.autoplay = true;
            localMedia.muted = true;
            localMedia.volume = 0;
            localMedia.controls = false;
            content.appendChild(addVideo);

            console.log("local-video-audio", {
                video: localMediaStream.getVideoTracks()[0].label,
                audio: localMediaStream.getAudioTracks()[0].label,
            });

            // attachMediaStream is a part of the adapter.js library
            attachMediaStream(localMedia, localMediaStream);
            resizeVideos()

            setButtonsTitle();
            if (callback) callback();
        })
        .catch((err) => {
            console.log(err.message)
        });
}

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



function attachMediaStream(element, stream) {
    console.log("Success, media stream attached");
    element.srcObject = stream;
}

function resizeVideos() {
    const numToString = ["", "one", "two", "three", "four"];
    const videos = document.querySelectorAll(".video");
    document.querySelectorAll(".video").forEach((v) => {
        v.className = "video " + numToString[videos.length];
    });
}

function setButtonsTitle() {

    // Not need for mobile
    if (isMobileDevice) return;


    tippy(audioButton, {
        content: "Turn Off Audio",
        placement: "top",
    });
    tippy(videoButton, {
        content: "Turn Off Video",
        placement: "top",
    });

    tippy(leaveButton, {
        content: "Leave the call",
        placement: "top"
    })

    tippy(moreButton, {
        content: "More actions",
        placement: "top"
    })



}



/*--------- Audio Button---------------- */

audioButton.addEventListener("click", (e) => {
    localMediaStream.getAudioTracks()[0].enabled = !localMediaStream.getAudioTracks()[0].enabled;
    myAudioStatus = localMediaStream.getAudioTracks()[0].enabled;
    e.target.className = "fas fa-microphone" + (myAudioStatus ? "" : "-slash");
    setMyAudioStatus(myAudioStatus);
});



function setMyAudioStatus(status) {
    if (!isMobileDevice) {
        tippy(audioButton, {
            content: status ? "Turn Off Audio" : "Turn On Audio",
            placement: "top",
        });
    }
}
/*---------------------------------------------*/




/*----------------Video Button -------------------*/

videoButton.addEventListener("click", (e) => {
    localMediaStream.getVideoTracks()[0].enabled = !localMediaStream.getVideoTracks()[0].enabled;
    myVideoStatus = localMediaStream.getVideoTracks()[0].enabled;
    e.target.className = "fas fa-video" + (myVideoStatus ? "" : "-slash");
    setMyVideoStatus(myVideoStatus);
});


function setMyVideoStatus(status) {
    if (!isMobileDevice) {
        tippy(videoButton, {
            content: status ? "Turn Off video " : "Turn On video",
            placement: "top",
        });
    }
}

/*---------------------------------------------*/



/*-------------Leave Button--------------------*/
leaveButton.addEventListener("click", () => {
    window.location.href = "/";
});

/*---------------------------------------------*/


/*-------------Showing Participants------------*/

showButton.addEventListener("click", () => {
    var arr = [];
    if (peers) {
        for (var peer_id in peers) {
            arr.push(peers[peer_id].peer_name)
            // id.push(peer_id)
            console.log(peers[peer_id].peer_name)
        }

    }
    else {
        arr.push(name)
        // id.push(peerId)
        console.log(name)
    }

    if (arr.length == 1) {
        swal.fire({
            html: `<table border=1 style="margin:auto;">
                  <thead >
                      <tr>
                          <th >Serial Number</th>
                          <th >Name of the attendee</th>
                      </tr>
                  </thead>
                  <tbody>
                      <tr>
                          <td>1</td>
                          <td>${arr[0]}</td>
                      </tr>
                      
          </tbody>
          </table>`
        })

    }
    else if (arr.length == 2) {
        swal.fire({
            html: `<table style="margin:auto;" border=1>
                  <thead>
                  <tr>
                  <th >Serial Number</th>
                  <th >Name of the attendee</th>
              </tr>
                  </thead>
                  <tbody>
                      <tr>
                          <td>1</td>
                          <td>${arr[0]}</td>
                      </tr>
                      
                      <tr>
                          <td>2</td>
                          <td>${arr[1]}</td>
                      </tr>
                      
          </tbody>
          </table>`
        })


    }
    else if (arr.length == 3) {
        swal.fire({
            html: `<table style="margin:auto;" border=1>
                  <thead>
                  <tr>
                  <th >Serial Number</th>
                  <th >Name of the attendee</th>
              </tr>
                  </thead>
                  <tbody>
                  <tr>
                          <td>1</td>
                          <td>${arr[0]}</td>
                      </tr>
                      
                      <tr>
                          <td>2</td>
                          <td>${arr[1]}</td>
                      </tr>
                          
                  <tr>
                          <td>3</td>
                          <td>${arr[2]}</td>
                      </tr>
                      
          </tbody>
          </table>`
        })


    }
    else {
        swal.fire(
            {
                html: `<table style="margin:auto;" border=1>
                  <thead>
                  <tr>
                  <th >Serial Number</th>
                  <th >Name of the attendee</th>
              </tr>
                  </thead>
                  <tbody>
                  <tr>
                          <td>1</td>
                          <td>${arr[0]}</td>
                      </tr>
                      
                      <tr>
                          <td>2</td>
                          <td>${arr[1]}</td>
                      </tr>
                          
                  <tr>
                          <td>3</td>
                          <td>${arr[2]}</td>
                      </tr>
                  
                  <tr>
                          <td>4</td>
                          <td>${arr[3]}</td>
                      </tr>
                      
          </tbody>
          </table>`
            })


    }


})

/*---------------------------------------------*/


/*--------------Copy Class Link----------------*/
copyButton.addEventListener("click", () => {
    var inputc = document.body.appendChild(document.createElement("input"));
    inputc.value = window.location.href;
    inputc.focus();
    inputc.select();
    document.execCommand('copy');
    inputc.parentNode.removeChild(inputc);
    Swal.fire("URL Copied.");
})
/*--------------------------------------------*/




closeChat.addEventListener("click", () => {
    console.log(msg.style.display)
    console.log("close Button clicked")
    if (msg.style.display == "block") {
        msg.style.display = "none"
    }
})


messageButton.addEventListener("click", () => {
    console.log("message btn clicked")
    console.log(msg.style.display)
    if (!msg.style.display || msg.style.display == "none") {
        msg.style.display = "block"
    }

})
sendButton.addEventListener("click", () => {
    console.log("send to the server" + sendMessage.value + name + roomId)
    // console.log(peerConnections)
    console.log(roomId)
    console.log(name)
    msgContent.innerHTML += '<p><strong>' + name + ':</strong>' + sendMessage.value + '</p>'
    socket.emit("chat", {
        peerConnections: peerConnections,
        room_id: roomId,
        name: name,
        msg: sendMessage.value
    });
    sendMessage.value = ""

})





/*--------------------------------------*/

// emailButton.addEventListener("click", () => {

//     console.log("Email clikced")
//     let message = {
//         email: "",
//         subject: "Please join the call",
//         body: "Click to join: ",
//     };
//     shareRoomByEmail(message);

// })




/*---------Getting the name of person-------*/

let name = "";
while (name == "")
    name = prompt("Enter your name", "Guest");
console.log(name);
document.getElementById("myName").innerText = name

/*------------------------------------------*/




/*-------------------Creating Dropup----------*/

function myFunction() {
    document.getElementById("dropup").classList.toggle("show");
}

// Close the dropdown if the user clicks outside of it
window.onclick = function (event) {
    if (!event.target.matches('.dropbtn')) {
        var dropdowns = document.getElementsByClassName("drop-menu");
        var i;
        for (i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}
/*-------------------------------------------------*/

