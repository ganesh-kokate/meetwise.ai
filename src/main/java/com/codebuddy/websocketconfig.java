    package com.codebuddy;

    import com.corundumstudio.socketio.SocketIOServer;
    import org.springframework.beans.factory.annotation.Value;
    import org.springframework.context.annotation.Bean;
    import org.springframework.context.annotation.Configuration;

    @Configuration
    public class websocketconfig {

        @Value("${socketio.host}")
        private String host;

        //@Value("${PORT:8181}")
        @Value("${server.port}")
        private String port;

        @Bean
        public SocketIOServer socketIOServer() throws Exception {

            com.corundumstudio.socketio.Configuration config =
                    new com.corundumstudio.socketio.Configuration();

            config.setHostname("0.0.0.0");
           // config.setPort(Integer.parseInt(port));
            config.setPort(8000);

            return new SocketIOServer(config);
        }
    }
