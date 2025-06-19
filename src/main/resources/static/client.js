
const MAX_CONNECTIONS = 4;

const getElement = id => document.getElementById(id);
const [btnConnect, btnToggleVideo, btnToggleAudio, divRoomConfig, roomDiv, roomNameInput, localVideo] =
    ["btnConnect", "toggleVideo", "toggleAudio", "roomConfig", "roomDiv", "roomName", "localVideo"]
    .map(getElement);


const videoGrid = document.getElementById('videoGrid');
const uuidGenerator = document.getElementById('uuidGenerator');


let roomName;
let localStream;
let peers = {};
let connections = {};
let hostId = null;
let mediaRecorder;
let audioChunks = [];


const iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

const socketUrl = `http://${window.location.hostname}:8000`;
const socket = io.connect(socketUrl, {
    transports: ["websocket"]
});

const streamConstraints = {
    video: {
        width: { ideal: 200 },
        height: { ideal: 200 },
        frameRate: { ideal: 15 } // lower the frame rate to reduce the load
    },
    audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
    }
};

// Helper function to create video element
function createVideoElement(userId) {
    const videoContainer = document.createElement('div');
    videoContainer.className = 'video-container';

    const video = document.createElement('video');
    video.id = `video-${userId}`;
    video.autoplay = true;
    video.playsInline = true;

    const nameTag = document.createElement('div');
    nameTag.className = 'name-tag';
    nameTag.textContent = userId.substring(0, 8);

    videoContainer.appendChild(video);
    videoContainer.appendChild(nameTag);
    videoGrid.appendChild(videoContainer);

    return video;
}


btnToggleVideo.onclick = () => {
    const videoTrack = localStream.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
    btnToggleVideo.classList.toggle('enabled-style');
    btnToggleVideo.classList.toggle('disabled-style');
    videoIcon.classList.toggle('bi-camera-video-fill');
    videoIcon.classList.toggle('bi-camera-video-off-fill');
};

btnToggleAudio.onclick = () => {
    const audioTrack = localStream.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
    btnToggleAudio.classList.toggle('enabled-style');
    btnToggleAudio.classList.toggle('disabled-style');
    audioIcon.classList.toggle('bi-mic-fill');
    audioIcon.classList.toggle('bi-mic-mute-fill');
};


// Initialize peer connection
async function initializePeerConnection(userId, isInitiator) {
    if (connections[userId]) {
        console.log('Connection already exists for:', userId);
        return connections[userId];
    }

    const peerConnection = new RTCPeerConnection(iceServers);
    connections[userId] = peerConnection;

    // Add local stream
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // Handle ICE candidates
   peerConnection.onicecandidate = event => {
       if (event.candidate) {
           try {
               socket.emit('candidate', {
                   type: 'candidate',
                   label: event.candidate.sdpMLineIndex,
                   id: event.candidate.sdpMid,
                   candidate: event.candidate.candidate,
                   room: roomName,
                   to: userId
               });
           } catch (err) {
               console.error('Failed to send ICE candidate:', err);
           }
       }
   };


    // Handle incoming streams
    peerConnection.ontrack = event => {
        const stream = event.streams[0];
        if (!peers[userId]) {
            peers[userId] = stream;
            const video = createVideoElement(userId);
            video.srcObject = stream;
        }
    };

    if (isInitiator) {
        try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket.emit('offer', {
                type: 'offer',
                sdp: offer,
                room: roomName,
                to: userId
            });
        } catch (error) {
            console.error('Error creating offer:', error);
             peerConnection.close();
                    delete connections[userId];
        }
    }

    return peerConnection;
}

// Connect button handler
btnConnect.onclick = async () => {
    if (!roomNameInput.value) {
        alert("Room cannot be empty!");
        return;
    }

    roomName = roomNameInput.value;

    try {
        //this stream for sharing audio and video to participants
        localStream = await navigator.mediaDevices.getUserMedia(streamConstraints);
        localVideo.srcObject = localStream;

        //this stream for recording purpose
        const audioStream = new MediaStream(localStream.getAudioTracks());
        mediaRecorder = new MediaRecorder(audioStream);

        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        socket.emit('joinRoom', roomName);
        divRoomConfig.classList.add('d-none');
        roomDiv.classList.remove('d-none');
        uuidGenerator.classList.add('d-none');

        mediaRecorder.start();
         mediaRecorder.onstop = () => {
         const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                     console.log('Audio recording complete. Blob:', audioBlob);

                     // Optional: Save or upload audioBlob
                     const url = URL.createObjectURL(audioBlob);
                     const a = document.createElement('a');
                     a.href = url;
                     a.download = 'recorded-audio.webm';
                     a.click();
         }
         }

       catch (error) {
        console.error('Error accessing media devices:', error);
        alert('Could not access camera/microphone');
    }


};

// Socket event handlers
socket.on('roomUsers', async (users) => {
    console.log('Current users in room:', users);

    const currentConnections = Object.keys(connections);

    // Remove disconnected users
    currentConnections.forEach(userId => {
        if (!users.includes(userId) && userId !== socket.id) {
            if (connections[userId]) {
                connections[userId].close();
                delete connections[userId];
            }
            if (peers[userId]) {
                const video = document.getElementById(`video-${userId}`);
                if (video) {
                    video.parentElement.remove();
                }
                delete peers[userId];
            }
        }
    });

    // Initialize new connections
    for (const userId of users) {
            if (userId !== socket.id && !connections[userId]) {
                const isInitiator = socket.id < userId;
                await initializePeerConnection(userId, isInitiator);
            }
        }

});

socket.on('offer', async (data) => {
    if (data.to !== socket.id) return;

    const peerConnection = await initializePeerConnection(data.from, false);
    console.log(peerConnection);
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socket.emit('answer', {
            type: 'answer',
            sdp: answer,
            room: roomName,
            to: data.from
        });
    } catch (error) {
        console.error('Error handling offer:', error);
    }
});

socket.on('answer', async (data) => {
    if (data.to !== socket.id) return;

    const peerConnection = connections[data.from];
    if (peerConnection) {
        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    }
});

socket.on('candidate', async (data) => {
    if (data.to !== socket.id) return;
    const peerConnection = connections[data.from];
    if (peerConnection) {
        try {
            const candidate = new RTCIceCandidate({
                sdpMLineIndex: data.label,
                candidate: data.candidate
            });
            await peerConnection.addIceCandidate(candidate);
        } catch (error) {
            console.error('Error handling ICE candidate:', error);
        }
    }
});

socket.on('userDisconnected', (userId) => {
    if (connections[userId]) {
        connections[userId].close();
        delete connections[userId];
    }
    if (peers[userId]) {
        const video = document.getElementById(`video-${userId}`);
        if (video) {
            video.parentElement.remove();
        }
        delete peers[userId];
    }
});

socket.on('hostAssigned', (id) => {
    hostId = id;
    console.log('Host ID:', hostId);
});

const generateBtn = document.getElementById("generate");
const uniqueId = document.getElementById("uuid");

generateBtn.onclick = () => {
    fetch("http://192.168.2.9:8080/room/generate-meetingId")
    .then(response =>{
        if (!response.ok)
        {
            throw new Error("Network response was not ok");
        }
        return response.text();
    })
    .then(meetingId=>{
        uuid.textContent = meetingId;
    })
    .catch(error => {
                console.error("Error generating meeting ID:", error);
                uuid.textContent = "Failed to generate ID";
            });
};


const hang= document.getElementById('hangUp');
hang.onclick=() =>{
    mediaRecorder.stop();
    socket.emit()

}








