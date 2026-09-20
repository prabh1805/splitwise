package com.prabh.splitwise.expense.config;


import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Configuration
public class CommonConfig {

    @Value("${aiven.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Value("${aiven.kafka.username}")
    private String username;

    @Value("${aiven.kafka.password}")
    private String password;

    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper();
    }

    @Bean
    public ProducerFactory<String, String> producerFactory() throws IOException {
        Map<String, Object> configProps = new HashMap<>();
        configProps.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        configProps.put("security.protocol", "SASL_SSL");
        configProps.put("ssl.truststore.type", "PEM");
        configProps.put("ssl.truststore.certificates", loadCertificate());
        configProps.put("sasl.mechanism", "SCRAM-SHA-256");
        configProps.put("sasl.jaas.config", String.format(
                "org.apache.kafka.common.security.scram.ScramLoginModule required username=\"%s\" password=\"%s\";",
                username, password
        ));
        configProps.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        configProps.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        return new DefaultKafkaProducerFactory<>(configProps);
    }

    @Bean
    public KafkaTemplate<String, String> kafkaTemplate(ProducerFactory<String, String> producerFactory) {
        return new KafkaTemplate<>(producerFactory);
    }

    private String loadCertificate() throws IOException {
        ClassPathResource resource = new ClassPathResource("ca.pem");
        return new String(resource.getInputStream().readAllBytes());
    }
}