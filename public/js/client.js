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
let myName = document.getElementById("myName")
let myEmail
let name

// Checking whether the device is mobile or not
// In order to implement tippy features
let isMobileDevice = DetectRTC.isMobileDevice


//Function and other variables
let socket
let serverPort = 3000;
let server = getServerUrl();
let localMediaStream
let remoteMediaControls = false;
let peerConnections = {};
let useRTCDataChannel = true;
let peerMediaElements = {};
let iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
let myVideo;
let roomId = location.pathname.substring(6); //----Skipping/join/----// 
let peers;




socket = io(server)

socket.on("connect", () => {
    console.log("Connected to signaling server");

    // First add the mediastream and then join to the channel
    if (localMediaStream) joinToChannel();
    else {
        setupLocalMedia(function () {
            joinToChannel()
        });
    }
})

socket.on("addPeer", function (config) {

    let peer_id = config.peer_id;
    peers = config.peers

    // If already joined to the channel do nothing
    if (peer_id in peerConnections) {
        console.log("Already connected to peer", peer_id);
        return;
    }

    if (config.iceServers) iceServers = config.iceServers;

    peerConnection = new RTCPeerConnection({ iceServers: iceServers });

    // Adding the peer to the peerconnections
    peerConnections[peer_id] = peerConnection;

    // Relaying ice to the peers
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

    // Adding audio and tracks 
    localMediaStream.getTracks().forEach(function (track) {
        peerConnections[peer_id].addTrack(track, localMediaStream);
    });

    console.log("Config should ", config)

    //Creating sdp offers
    if (config.should_create_offer) {
        console.log("Creating RTC offer to", peer_id);
        console.log(peerConnections)
        console.log("PEER CONNECTIONS", peerConnections[peer_id])
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
                        console.log("Error occured in setting Local Description " + e.message);
                    });
            })
            .catch((e) => {
                console.log("Error occured in sending offer", e.message);
            });
    }
});

// On receiving the message
socket.on("msg", function (data) {
    console.log("reveived values", data)
    // Appending the message to the left side in content section
    append(`${data.name}:${data.msg}`, 'left')

})

// On  receiving the session description
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

// On receiving ice candidates
socket.on("iceCandidate", function (config) {
    console.log("Inside ice candidate")
    let peer_id = config.peer_id;
    let ice_candidate = config.ice_candidate;

    peerConnections[peer_id].addIceCandidate(new RTCIceCandidate(ice_candidate))
        .catch((e) => {
            console.error("Error occured in adding Ice Candidate", e.message);
        });
});

// On receiving the disconnect call 
socket.on("disconnect", function () {
    console.log("Disconnected from signaling server");

    let prevcnt = localStorage.getItem("cnt");
    console.log("prevcnt", prevcnt)
    let newcnt = prevcnt - 1;
    localStorage.setItem("cnt", newcnt)
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

// Removing the user from its peers connections 
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
function setupLocalMedia(callback) {
    console.log("Requesting audio and video access");
    const constraints = {
        audio: true,
        video: true,
    };
    navigator.mediaDevices.getUserMedia(constraints)
        .then(function (stream) {
            console.log("Access audio/video");
            localMediaStream = stream;

            const addVideo = document.createElement("div");



            const localMedia = document.createElement("video");
            addVideo.className = "video";
            addVideo.appendChild(localMedia);
            localMedia.setAttribute("id", "myVideo");
            localMedia.setAttribute("playsinline", true);
            localMedia.autoplay = true;
            localMedia.muted = true;
            localMedia.volume = 0;
            localMedia.controls = false;

            //Appending myvideo to the browser
            content.appendChild(addVideo);

            //Tracking aduio and video
            console.log("local-video-audio", {
                video: localMediaStream.getVideoTracks()[0].label,
                audio: localMediaStream.getAudioTracks()[0].label,
            });

            // attachMediaStream is a part of the adapter.js library
            attachMediaStream(localMedia, localMediaStream);

            // Rendering the UI while loading
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


//Attaching the media stream
function attachMediaStream(element, stream) {
    console.log("Success, media stream attached");
    element.srcObject = stream;
}

//Whenever any peer leaves/joins there must be resizing of videos
function resizeVideos() {
    const numToString = ["", "one", "two", "three", "four"];
    const videos = document.querySelectorAll(".video");
    document.querySelectorAll(".video").forEach((v) => {
        v.className = "video " + numToString[videos.length];
    });
}

//Displaying the information about buttons upon hovering
function setButtonsTitle() {

    // OnHover will not work for mobile
    // Hence not need for mobile
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
    //Just Reverse the situation
    localMediaStream.getAudioTracks()[0].enabled = !localMediaStream.getAudioTracks()[0].enabled;
    audioStatus = localMediaStream.getAudioTracks()[0].enabled;
    if (audioStatus)
        e.target.className = "fas fa-microphone"
    else
        e.target.className = "fas fa-microphone-slash";
    setAudioStatus(audioStatus);
});


function setAudioStatus(status) {
    //Onhover will not work in mobile devices
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
    videoStatus = localMediaStream.getVideoTracks()[0].enabled;
    if (videoStatus)
        e.target.className = "fas fa-video"
    else
        e.target.className = "fas fa-video-slash";
    setVideoStatus(videoStatus);
});


function setVideoStatus(status) {
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
    // Direct the user to homepage
    window.location.href = '/';

    // Just decrementing the count so that the user may rejoin from the chat page 
    let prevcnt = localStorage.getItem("cnt")
    console.log("prevcnt", prevcnt)
    let newcnt = prevcnt - 1;
    localStorage.setItem("cnt", newcnt)
    console.log("newcnt", newcnt)
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

    //Only 1 user
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
    // 2 users
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
    //3 users
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
    // 4 users
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
    // Copying the url
    inputc.value = window.location.href + "/msg";
    inputc.focus();
    inputc.select();
    document.execCommand('copy');
    inputc.parentNode.removeChild(inputc);
    Swal.fire("URL Copied.");
})
/*---------------------------------------------*/

/*------------Messaging Functioanlity---------*/


closeChat.addEventListener("click", () => {
    console.log(msg.style.display)
    console.log("close Button clicked")
    if (msg.style.display == "block") {
        msg.style.display = "none"
    }
})


messageButton.addEventListener("click", () => {
    //console.log("message btn clicked")
    //console.log(msg.style.display)
    // If the message box is not visible make it visible 
    if (!msg.style.display || msg.style.display == "none") {
        msg.style.display = "block"
    }

})

sendButton.addEventListener("click", () => {
    if (sendMessage.value != "") {

        // console.log("send to the server" + sendMessage.value + name + roomId)
        // console.log(peerConnections)
        console.log(roomId)
        // console.log(name)
        append(`You:${sendMessage.value}`, 'right')
        socket.emit("chat", {
            peerConnections: peerConnections,
            room: roomId,
            name: myName.innerText,
            msg: sendMessage.value,
            email: myEmail
        });
        sendMessage.value = ""
    }

})

function append(message, position) {
    const messagelement = document.createElement('div');
    messagelement.innerText = message;
    messagelement.classList.add('message');
    messagelement.classList.add(position);
    msgContent.append(messagelement);
}

/*---------Getting the name of person-------*/

console.log("myname is ", localStorage.getItem("myName"));
console.log("myname is ", localStorage.getItem("myEmail"));
myName.innerText = localStorage.getItem("myName")
myEmail = localStorage.getItem("myEmail")
name = myName.innerText
/*------------------------------------------*/

/*--------------Creating Dropup-------------*/

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

