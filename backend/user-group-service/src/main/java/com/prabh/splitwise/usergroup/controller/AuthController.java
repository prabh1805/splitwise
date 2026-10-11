package com.prabh.splitwise.usergroup.controller;

import com.prabh.splitwise.usergroup.dto.LoginRequest;
import com.prabh.splitwise.usergroup.dto.LoginResponse;
import com.prabh.splitwise.usergroup.dto.RefreshRequest;
import com.prabh.splitwise.usergroup.dto.RegisterRequest;
import com.prabh.splitwise.usergroup.dto.UserResponse;
import com.prabh.splitwise.usergroup.entity.User;
import com.prabh.splitwise.usergroup.service.JwtService;
import com.prabh.splitwise.usergroup.service.RefreshTokenService;
import com.prabh.splitwise.usergroup.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {
    private final UserService userService;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    @Value("${jwt.access-token-ttl}")
    private Long accessTokenTtl;

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest registerRequest) {
        User user = userService.createUser(registerRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(
                new UserResponse(
                        user.getId(),
                        user.getName(),
                        user.getEmail(),
                        user.getCreatedAt()
                )
        );
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest loginRequest) {
        Authentication auth = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(
                        loginRequest.email(),
                        loginRequest.password()
                )
        );
        User user = (User) auth.getPrincipal();
        String accessToken = jwtService.generateToken(user);
        String refreshToken = refreshTokenService.create(user);

        return ResponseEntity.ok(new LoginResponse(accessToken, refreshToken, "Bearer", accessTokenTtl));
    }

    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse> refresh(@Valid @RequestBody RefreshRequest refreshRequest) {
        return ResponseEntity.ok(refreshTokenService.rotate(refreshRequest.refreshToken()));
    }
}
