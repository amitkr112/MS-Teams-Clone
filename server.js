//Suggested 
"use strict";

//For routing
const express = require("express");

//Linking static files
const path = require("path");

//Socket
const socket = require("socket.io")

//Creating our express app
const app = express();

//Server Port
var PORT = process.env.PORT || 5000;

// collect channels
var channels = {};

// collect sockets
var sockets = {};

// collect peers info grp by channels
var peers = {};


const server = app.listen(PORT, () => {
  console.log("Server started at port " + PORT)
})

const io = socket(server)

//STUN server
var iceServers = [{ urls: "stun:stun.l.google.com:19302" }];

// Use all static files from the public folder
app.use(express.static(path.join(__dirname, "public")));


// Main page of browser
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public/homepage.html"))
);

// Page for creating a new room 
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
  console.log("Connection started", socket.id)
  socket.channels = {};
  sockets[socket.id] = socket;

  // console.log("Socket", socket)
  // console.log("Sockets", sockets)
  // console.log("Socket.channels", socket.channels)



  //On peer join
  socket.on("join", (data) => {
    console.log("Inside join function");
    // console.log("Join " + socket.id);

    // Channel/Room name
    var channel = data.channel;
    var peer_name = data.peerName;

    //Channel/Room Name
    console.log("channel" + channel)

    if (channel in socket.channels) {
      console.log(socket.id + " already joined");
      return;
    }

    // No channel in channels create a channel
    if (!(channel in channels)) {
      console.log("No channel in channels init", channel)
      channels[channel] = {};
    }

    // If channel contain no peers create a channel
    if (!(channel in peers)) {
      console.log("No rooms in peers initially", channel)
      peers[channel] = {};
    }

    // Collecting all peers info channelwise
    peers[channel][socket.id] = {
      //Initailizing the peer information
      peer_name: peer_name,
    };

    console.log("Peers present in all room ids", peers);

    // When multiple users join a channel
    for (var id in channels[channel]) {
      //This socket will create offer to these ids
      console.log("ID ", id)
      socket.emit("addPeer", {
        peer_id: id,
        peers: peers[channel],
        should_create_offer: true,
        iceServers: iceServers,
      });

      //Others will accept/answer the offer
      channels[channel][id].emit("addPeer", {
        peer_id: socket.id,
        peers: peers[channel],
        should_create_offer: false,
        iceServers: iceServers,
      });
    }



    channels[channel][socket.id] = socket;
    socket.channels[channel] = channel;
    console.log("Channels ", socket.channels)
    // console.log("channels[channel] ", channels[channel])
  });

  // Relaying  ICE to peers in order to send the network information 
  socket.on("relayICE", (data) => {
    console.log("Inside relayIce function");
    let peer_id = data.peer_id;
    let ice_candidate = data.ice_candidate;

    if (peer_id in sockets) {
      console.log("id ", peer_id)
      sockets[peer_id].emit("iceCandidate", {
        peer_id: socket.id,
        ice_candidate: ice_candidate,
      });
    }
  });

  // Relaying  SDP to peers conatining MetaData
  socket.on("relaySDP", (data) => {
    console.log("Inside relay Sdp function");
    let peer_id = data.peer_id;
    let session_description = data.session_description;


    if (peer_id in sockets) {
      console.log(peer_id)
      sockets[peer_id].emit("sessionDescription", {
        peer_id: socket.id,
        session_description: session_description,
      });
    }
  });

  socket.on("chat", (config) => {
    let peerConnections = config.peerConnections;
    let name = config.name;
    let msg = config.msg;

    for (var peer_id in peerConnections) {
      if (sockets[peer_id]) {
        sockets[peer_id].emit("msg", {
          peer_id: socket.id,
          name: name,
          msg: msg,
        });
      }
    }
  });

  // On peer diconnected
  socket.on("disconnect", () => {
    console.log("Inside disconnect function");
    console.log(socket.channels)
    //The channel/room in which this id is present
    for (var channel in socket.channels) {
      removePeerFrom(channel);
    }
    console.log("Disconnected", socket.id)
    delete sockets[socket.id];
  });

  // Remove peers from channel/room
  async function removePeerFrom(channel) {
    //Handing warnings
    if (!(channel in socket.channels)) {
      console.log(socket.id + "is not in ", channel);
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
      //Removing this id from other channel's screen
      await channels[channel][id].emit("removePeer", { peer_id: socket.id });

      //Removing the other clients from this channel
      await socket.emit("removePeer", { peer_id: id });
      console.log(socket.id + " emit remove Peer " + id);
    }
  }

});

