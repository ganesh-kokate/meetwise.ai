package com.codebuddy.services;

import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Random;

@Service
public class RoomServices {

    private static final String ALPHABET = "abcdefghijklmnopqrstuvwxyz";
    private static final Random random = new Random();

    public String MeetingID;
    private static String generateSegment(int len) {
        StringBuilder segment =  new StringBuilder();
        for (int i = 0; i < len; i++) {
            char c = ALPHABET.charAt(random.nextInt(ALPHABET.length()));
            segment.append(c);
        }
        return segment.toString();
    }

    public String generateMeetingId() {
        MeetingID = generateSegment(3) + "-" + generateSegment(4) + "-" + generateSegment(3);
        ProcessBuilder processBuilder = new ProcessBuilder("node", "node-bot/bot-server.js", MeetingID);
        try {
            processBuilder.inheritIO();
            processBuilder.start();
            System.out.println("🤖 Bot launched for meeting ID: " + MeetingID);
        } catch (IOException e) {
            e.printStackTrace();
        }
        return MeetingID;
    }



}
