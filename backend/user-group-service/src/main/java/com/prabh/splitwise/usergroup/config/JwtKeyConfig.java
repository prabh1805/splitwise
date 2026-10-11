package com.prabh.splitwise.usergroup.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

@Configuration
public class JwtKeyConfig {

    @Bean
    public PrivateKey jwtPrivateKey(@Value("${jwt.private-key}") Resource resource)
            throws IOException, GeneralSecurityException {
        byte[] der = readPem(resource);
        return KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(der));
    }

    @Bean
    public PublicKey jwtPublicKey(@Value("${jwt.public-key}") Resource resource)
            throws IOException, GeneralSecurityException {
        byte[] der = readPem(resource);
        return KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(der));
    }

    private static byte[] readPem(Resource resource) throws IOException {
        String base64 = resource.getContentAsString(StandardCharsets.UTF_8)
                .replaceAll("-----(BEGIN|END) [A-Z ]+-----", "")
                .replaceAll("\\s", "");
        return Base64.getDecoder().decode(base64);
    }
}