# Microsoft Teams Clone
This is the project done under the [Microsoft Engage Mentorship Program 2021](https://microsoft.acehacker.com/engage2021/index.html). This is [WebRTC](https://webrtc.org/) and [socket.io](https://socket.io/) based video chat application.
Open the below link in any of the browser which supports webTRC and socketio like Microsoft Edge, Google Chrome, Mozilla Firefox etc.'
<!--Link-->
[https://microsoft-teams-clone.azurewebsites.net/](https://microsoft-teams-clone.azurewebsites.net/)

<!---->
# Features
* Multiparty - Maximum of 4 persons can join the call
* Concept of rooms - Many rooms can operate simultaneously
* Operate in desktop as well as mobile devices 
* Direct communication between peers and hence has the low latency
* Responsive 
* Messaging Functionality - One can communicate to the peers **before,during as well as after** the call.
* Google Based Authentication - One has to signin in order to use the app
* Audio Mute - One can turn on/off the audio during the call using audio button
* Video Mute - One can turn on/off the video during the call using video button
* Copy Link Button - We can send invites by copying the meeeting link using the copy link button
* Show Participants - We can see the participants present in the call
* Leave - One can leave the call using the leave button

# Futuristic
* Adding screen sharing, file sharing ,screen presenting etc  
* Adding face recognition gestures like hand raise whenever i raise my hand, audio mute by covering lips,video mute using covering eyes etc..
* Linking cortana to the website for hand-free operation

# Demo
* Open the website in WebRTC compatible browser
* Click on the **Try** button
* Enter a **non-empty** roomid
* Click on the **Join Room** button
* Here you can chat with the peers without joining the call
* In order ot join the call click on the **Join Call** button
* Copy the room id and invite your peers
* Enjoy the call

<!---->
**Note** - If you are not able to join the call or video/audio loading does not takes place the rejoin the room and rejoin the call.This is due to the network issues

# Running on the local computer
* Install nodejs on the computer
* Clone the repository
```bash
https://github.com/amitkr112/MS-Teams-Clone.git
```
* Install the dependencies using **npm install**
* Start the development server using **node server.js**
* Open localhost:3000 on your browser
<!---->
**Note** - If it shows the error while logging in, create a client-id using google developer console and replace this id with the "your-client-id" which is being written in message.html file.











