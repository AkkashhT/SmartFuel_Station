package com.smartfuel;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.authentication.*;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

/** Backend-enforced RBAC. Auditor gets read-only access simply because it has no POST rights. */
@Configuration @EnableWebSecurity
class SecurityConfig {
  @Bean PasswordEncoder passwordEncoder(){ return new BCryptPasswordEncoder(); }
  @Bean UserDetailsService users(UserRepo r){
    return n -> r.findByUsername(n).map(u -> User.withUsername(u.username).password(u.passwordHash).roles(u.role).build())
      .orElseThrow(() -> new UsernameNotFoundException(n)); }
  @Bean SecurityFilterChain chain(HttpSecurity h) throws Exception {
    h.csrf(c -> c.disable()).cors(Customizer.withDefaults())
     .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
     .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(conv())))
     .authorizeHttpRequests(a -> a
       .requestMatchers("/", "/index.html", "/error").permitAll()
       .requestMatchers(HttpMethod.POST, "/api/v1/auth/login").permitAll()
       .requestMatchers(HttpMethod.POST, "/api/v1/sales").hasAnyRole("ADMIN", "MANAGER", "CASHIER", "ATTENDANT")
       .requestMatchers(HttpMethod.POST, "/api/v1/deliveries", "/api/v1/fuels/*/price", "/api/v1/alerts/*/ack", "/api/v1/tanks/*/adjust").hasAnyRole("ADMIN", "MANAGER")
       .requestMatchers(HttpMethod.POST, "/api/v1/shifts/**").hasAnyRole("ADMIN", "MANAGER")
       .requestMatchers(HttpMethod.POST, "/api/v1/customers", "/api/v1/vehicles").hasAnyRole("ADMIN", "MANAGER", "CASHIER")
       .requestMatchers("/api/v1/reports/**").hasAnyRole("ADMIN", "MANAGER", "AUDITOR")
       .requestMatchers("/api/v1/audit").hasAnyRole("ADMIN", "AUDITOR")
       .requestMatchers("/api/v1/**").authenticated()
       .anyRequest().permitAll());
    return h.build(); }
  static JwtAuthenticationConverter conv(){ JwtGrantedAuthoritiesConverter g=new JwtGrantedAuthoritiesConverter(); g.setAuthoritiesClaimName("role"); g.setAuthorityPrefix("ROLE_");
    JwtAuthenticationConverter c=new JwtAuthenticationConverter(); c.setJwtGrantedAuthoritiesConverter(g); return c; }
  @Bean SecretKey jwtKey(@Value("${smartfuel.jwt-secret}") String s){ return new SecretKeySpec(s.getBytes(java.nio.charset.StandardCharsets.UTF_8),"HmacSHA256"); }
  @Bean JwtDecoder jwtDecoder(SecretKey k){ return NimbusJwtDecoder.withSecretKey(k).macAlgorithm(MacAlgorithm.HS256).build(); }
  @Bean JwtEncoder jwtEncoder(SecretKey k){ return new NimbusJwtEncoder(new ImmutableSecret<>(k)); }
}
