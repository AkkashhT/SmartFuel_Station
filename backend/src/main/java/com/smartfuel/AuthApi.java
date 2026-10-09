package com.smartfuel;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.Map;

@RestController @RequestMapping("/api/v1/auth")
class AuthApi {
  final UserRepo users; final PasswordEncoder pe; final JwtEncoder enc;
  AuthApi(UserRepo u, PasswordEncoder p, JwtEncoder e){ users=u; pe=p; enc=e; }
  @PostMapping("/login") Map<String,String> login(@RequestBody Map<String,String> b){
    Domain.AppUser u=users.findByUsername(b.getOrDefault("username","")).orElse(null);
    if(u==null||!pe.matches(b.getOrDefault("password",""),u.passwordHash)) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Invalid username or password");
    Instant now=Instant.now();
    JwtClaimsSet c=JwtClaimsSet.builder().subject(u.username).claim("role",u.role).issuedAt(now).expiresAt(now.plusSeconds(8*3600)).build();
    String t=enc.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(),c)).getTokenValue();
    return Map.of("token",t,"username",u.username,"role",u.role); }
}
