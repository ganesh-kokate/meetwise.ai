package com.codebuddy.controllers;

import com.codebuddy.services.RoomServices;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/room")
@CrossOrigin(origins = "*")
public class RoomController {

    @Autowired
    private RoomServices roomServices;

    @GetMapping("/generate-meetingId")
    public String meetingId()
    {
        return roomServices.generateMeetingId();
    }

    @GetMapping("/test")
    public String test()
    {
        return "test";
    }

}
