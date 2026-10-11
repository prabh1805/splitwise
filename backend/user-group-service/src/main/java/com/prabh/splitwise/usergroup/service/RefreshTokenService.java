package com.prabh.splitwise.usergroup.service;

import com.prabh.splitwise.usergroup.dto.LoginResponse;
import com.prabh.splitwise.usergroup.entity.RefreshToken;
import com.prabh.splitwise.usergroup.entity.User;
import com.prabh.splitwise.usergroup.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int TOKEN_BYTES = 32;

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;

    @Value("${jwt.refresh-token-ttl-seconds}")
    private Long refreshTokenTtl;

    @Value("${jwt.access-token-ttl}")
    private Long accessTokenTtl;

    public String create(User user) {
        byte[] bytes = new byte[TOKEN_BYTES];
        SECURE_RANDOM.nextBytes(bytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .tokenHash(hash(rawToken))
                .expiresAt(Instant.now().plusSeconds(refreshTokenTtl))
                .build());
        return rawToken;
    }

    @Transactional
    public LoginResponse rotate(String rawToken) {
        RefreshToken token = refreshTokenRepository.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new BadCredentialsException("Invalid refresh token"));

        if (token.isRevoked() || !token.getExpiresAt().isAfter(Instant.now())) {
            throw new BadCredentialsException("Invalid refresh token");
        }
        // Two requests with the same token can both pass the check above; only one wins here
        if (refreshTokenRepository.revokeIfActive(token.getId()) != 1) {
            throw new BadCredentialsException("Invalid refresh token");
        }

        User user = token.getUser();
        return new LoginResponse(jwtService.generateToken(user), create(user), "Bearer", accessTokenTtl);
    }

    private static String hash(String rawToken) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
