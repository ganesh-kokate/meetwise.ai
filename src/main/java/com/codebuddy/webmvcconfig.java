package com.codebuddy;

import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

public class webmvcconfig implements WebMvcConfigurer {
    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addViewController("/").setViewName("forward:/index.html");
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {

        registry.addMapping("/**").allowedOriginPatterns("*").allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS").allowedHeaders("*");;
    }


}
