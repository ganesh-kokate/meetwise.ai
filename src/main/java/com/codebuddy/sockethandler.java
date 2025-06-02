
package com.codebuddy;

import com.corundumstudio.socketio.AckRequest;
import com.corundumstudio.socketio.SocketIOClient;
import com.corundumstudio.socketio.SocketIOServer;
import com.corundumstudio.socketio.annotation.OnConnect;
import com.corundumstudio.socketio.annotation.OnDisconnect;
import com.corundumstudio.socketio.annotation.OnEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class sockethandler {

    private final SocketIOServer server;
    private static final Map<String, String> userRooms = new ConcurrentHashMap<>();
    private static final Map<String, Set<String>> roomUsers = new ConcurrentHashMap<>();
    private static List<String> allhost = new ArrayList<>();
    private static final int MAX_USERS_PER_ROOM = 4;

    public sockethandler(SocketIOServer server) {
        this.server = server;
        server.addListeners(this);
        server.start();
    }

    @OnConnect
    public void onConnect(SocketIOClient client) {
        String clientId = client.getSessionId().toString();
        log.info("Client connected: {}", clientId);
    }

    @OnDisconnect
    public void onDisconnect(SocketIOClient client) {
        String clientId = client.getSessionId().toString();
        String room = userRooms.get(clientId);

        if (room != null) {
            handleUserDisconnect(client, clientId, room);
        }
    }

    private void handleUserDisconnect(SocketIOClient client, String clientId, String room) {
        Set<String> users = roomUsers.get(room);
        if (users != null) {
            users.remove(clientId);

            // Reassign the host if the current host disconnects
            String newHostId = users.isEmpty() ? null : users.iterator().next();
            if (newHostId != null) {
                client.getNamespace().getRoomOperations(room).sendEvent("hostAssigned", newHostId);
            }

            if (users.isEmpty()) {
                roomUsers.remove(room);
            } else {
                // Notify remaining users about disconnection and updated user list
                client.getNamespace().getRoomOperations(room).sendEvent("userDisconnected", clientId);
                client.getNamespace().getRoomOperations(room).sendEvent("roomUsers", new ArrayList<>(users));
            }
        }

        userRooms.remove(clientId);
        client.leaveRoom(room);
        log.info("Client disconnected: {} from room: {}", clientId, room);
    }

    @OnEvent("joinRoom")
    public void onJoinRoom(SocketIOClient client, String room) {
        String clientId = client.getSessionId().toString();

        Set<String> users = roomUsers.computeIfAbsent(room, k -> ConcurrentHashMap.newKeySet());

        if (users.size() >= MAX_USERS_PER_ROOM) {
            client.sendEvent("full", room);
            return;
        }

        // Join room
        client.joinRoom(room);
        users.add(clientId);
        userRooms.put(clientId, room);

        // Assign the host if this is the first user

        String hostId = users.iterator().next();

        // Notify all clients about the host
        client.getNamespace().getRoomOperations(room).sendEvent("hostAssigned", hostId);

        // Notify all users in room about the new user list
        client.getNamespace().getRoomOperations(room).sendEvent("roomUsers", new ArrayList<>(users));

        log.info("Client {} joined room: {}. Total users: {}", clientId, room, users.size());

    }


    @OnEvent("offer")
    public void onOffer(SocketIOClient client, Map<String, Object> payload) {
        String room = (String) payload.get("room");
        String to = (String) payload.get("to");

        // Add the sender's information to the payload
        payload.put("from", client.getSessionId().toString());

        // Send the offer only to the intended recipient
        server.getClient(UUID.fromString(to)).sendEvent("offer", payload);
        //client.getNamespace().getRoomOperations(room).sendEvent("offer", payload);

        log.debug("Offer sent from {} to {} in room {}", client.getSessionId(), to, room);
    }

    @OnEvent("answer")
    public void onAnswer(SocketIOClient client, Map<String, Object> payload) {
        String room = (String) payload.get("room");
        String to = (String) payload.get("to");

        // Add the sender's information to the payload
        payload.put("from", client.getSessionId().toString());

        // Send the answer only to the intended recipient
        server.getClient(UUID.fromString(to)).sendEvent("answer", payload);
        //client.getNamespace().getRoomOperations(room).sendEvent("answer", payload);

        log.debug("Answer sent from {} to {} in room {}", client.getSessionId(), to, room);
    }

    @OnEvent("candidate")
    public void onCandidate(SocketIOClient client, Map<String, Object> payload) {
        String room = (String) payload.get("room");
        String to = (String) payload.get("to");

        // Add the sender's information to the payload
        payload.put("from", client.getSessionId().toString());

        // Send the candidate only to the intended recipient
        server.getClient(UUID.fromString(to)).sendEvent("candidate", payload);
        //client.getNamespace().getRoomOperations(room).sendEvent("candidate", payload);
        log.debug("ICE candidate sent from {} to {} in room {}", client.getSessionId(), to, room);
    }
}