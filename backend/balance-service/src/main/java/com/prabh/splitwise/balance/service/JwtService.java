package com.prabh.splitwise.balance.service;


import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.security.PublicKey;

@Service
@RequiredArgsConstructor
public class JwtService {
    private final PublicKey publicKey;

    public Long extractUserIdFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(publicKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return Long.parseLong(claims.getSubject());
    }
}
