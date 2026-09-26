package com.prabh.splitwise.balance.config;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Configuration
public class CommonConfig {

    private static final String GROUP_ID = "balance-service";

    @Value("${aiven.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Value("${aiven.kafka.username}")
    private String username;

    @Value("${aiven.kafka.password}")
    private String password;

    @Bean
    public ConsumerFactory<String, String> consumerFactory() throws IOException {
        Map<String, Object> configProps = new HashMap<>();
        configProps.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);

        // Aiven connection (same as Expense)
        configProps.put("security.protocol", "SASL_SSL");
        configProps.put("ssl.truststore.type", "PEM");
        configProps.put("ssl.truststore.certificates", loadCertificate());
        configProps.put("sasl.mechanism", "SCRAM-SHA-256");
        configProps.put("sasl.jaas.config", String.format(
                "org.apache.kafka.common.security.scram.ScramLoginModule required username=\"%s\" password=\"%s\";",
                username, password
        ));

        // Consumer-specific
        configProps.put(ConsumerConfig.GROUP_ID_CONFIG, GROUP_ID);
        configProps.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        configProps.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        configProps.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);

        // Temporary: confirm this version is the one running, then delete
        System.out.println(">>> consumerFactory built, group.id = " + configProps.get(ConsumerConfig.GROUP_ID_CONFIG));

        return new DefaultKafkaConsumerFactory<>(configProps);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, String> kafkaListenerContainerFactory(
            ConsumerFactory<String, String> consumerFactory) {
        ConcurrentKafkaListenerContainerFactory<String, String> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);
        return factory;
    }

    private String loadCertificate() throws IOException {
        ClassPathResource resource = new ClassPathResource("ca.pem");
        return new String(resource.getInputStream().readAllBytes());
    }
}