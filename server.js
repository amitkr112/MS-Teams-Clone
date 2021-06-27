//Suggested 
"use strict";

require("dotenv").config();
const express = require("express");
const path = require("path");
const compression = require("compression");
const socket = require("socket.io")
const app = express();
app.use(compression());



//Server Port
var PORT = process.env.PORT || 5000;
var channels = {}; // collect channels
var sockets = {}; // collect sockets
var peers = {}; // collect peers info grp by channels


const server = app.listen(PORT, () => {
  console.log("Server started at port " + PORT)
})

const io = socket(server)
var iceServers = [{ urls: "stun:stun.l.google.com:19302" }];


// Use all static files from the public folder
app.use(express.static(path.join(__dirname, "public")));


// Api parse body data as json
app.use(express.json());

// all start from here
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public/landing.html"))
);

// set new room name and join
app.get("/newcall", (req, res) =>
  res.sendFile(path.join(__dirname, "public/newcall.html"))
);




// no room name specified to join
app.get("/join/", function (req, res) {
  res.redirect("/");
});


// join to room
app.get("/join/:id", function (req, res) {
  res.sendFile(path.join(__dirname, "public/client.html"));
});



// Using signaling server

io.on("connect", (socket) => {

  // console.log("Socket", socket)
  // console.log("Connection started", socket.id)
  socket.channels = {};
  sockets[socket.id] = socket;



  //On peer join
  socket.on("join", (config) => {
    console.log("Inside join function");
    console.log("Join " + socket.id);

    var channel = config.channel;
    var peer_name = config.peerName;
    var peer_video = config.peerVideo;
    var peer_audio = config.peerAudio;
    var peer_hand = config.peerHand;

    if (channel in socket.channels) {
      console.log("[" + socket.id + "] [Warning] already joined", channel);
      return;
    }
    // no channel aka room in channels init
    if (!(channel in channels)) {
      channels[channel] = {};
    }

    // no channel aka room in peers init
    if (!(channel in peers)) {
      peers[channel] = {};
    }

    // collect peers info grp by channels
    peers[channel][socket.id] = {
      peer_name: peer_name,
      peer_video: peer_video,
      peer_audio: peer_audio,
      peer_hand: peer_hand,
    };
    // console.log("connected peers grp by roomId", peers);

    for (var id in channels[channel]) {
      // offer false
      channels[channel][id].emit("addPeer", {
        peer_id: socket.id,
        peers: peers[channel],
        should_create_offer: false,
        iceServers: iceServers,
      });
      // offer true
      socket.emit("addPeer", {
        peer_id: id,
        peers: peers[channel],
        should_create_offer: true,
        iceServers: iceServers,
      });
      console.log(socket.id + "emit add Peer " + id);
    }

    channels[channel][socket.id] = socket;
    socket.channels[channel] = channel;
  });

  // Relay ICE to peers
  socket.on("relayICE", (config) => {
    console.log("Inside relayIce function");
    let peer_id = config.peer_id;
    let ice_candidate = config.ice_candidate;

    if (peer_id in sockets) {
      sockets[peer_id].emit("iceCandidate", {
        peer_id: socket.id,
        ice_candidate: ice_candidate,
      });
    }
  });

  // Relay SDP to peers
  socket.on("relaySDP", (config) => {
    console.log("Inside relay Sdp function");
    let peer_id = config.peer_id;
    let session_description = config.session_description;


    if (peer_id in sockets) {
      sockets[peer_id].emit("sessionDescription", {
        peer_id: socket.id,
        session_description: session_description,
      });
    }
  });


  // On peer diconnected
  socket.on("disconnect", () => {
    console.log("Inside disconnect function");
    console.log(socket.channels)
    for (var channel in socket.channels) {
      removePeerFrom(channel);
    }
    console.log("Disconnected", socket.id)
    delete sockets[socket.id];
  });

  // Remove peers from channel/room
  async function removePeerFrom(channel) {
    if (!(channel in socket.channels)) {
      console.log(socket.id + "Warning not in ", channel);
      return;
    }

    delete socket.channels[channel];
    delete channels[channel][socket.id];
    delete peers[channel][socket.id];

    //  no channel  peers remove it
    if (Object.keys(peers[channel]).length === 0) {
      delete peers[channel];
    }

    for (var id in channels[channel]) {
      await channels[channel][id].emit("removePeer", { peer_id: socket.id });
      await socket.emit("removePeer", { peer_id: id });
      console.log(socket.id + " emit remove Peer " + id);
    }
  }


});

