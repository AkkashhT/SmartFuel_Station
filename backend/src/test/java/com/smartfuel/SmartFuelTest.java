package com.smartfuel;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import java.util.Base64;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:t;DB_CLOSE_DELAY=-1","spring.jpa.hibernate.ddl-auto=create-drop"}) @AutoConfigureMockMvc
class SmartFuelTest {
  @Autowired MockMvc mvc;
  String h(String u) throws Exception {
    String r=mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content("{\"username\":\""+u+"\",\"password\":\"Demo@123\"}")).andReturn().getResponse().getContentAsString();
    java.util.regex.Matcher m=java.util.regex.Pattern.compile("\"token\":\"([^\"]+)\"").matcher(r); m.find(); return "Bearer "+m.group(1); }
  @Test void unauthenticatedIs401() throws Exception { mvc.perform(get("/api/v1/dashboard")).andExpect(status().isUnauthorized()); }
  @Test void cashierCannotRecordDelivery() throws Exception {
    mvc.perform(post("/api/v1/deliveries").header("Authorization",h("cashier")).contentType(MediaType.APPLICATION_JSON).content("{\"note\":\"N1\",\"tankId\":1,\"qty\":10}")).andExpect(status().isForbidden()); }
  @Test void deliveryOverCapacityRejected() throws Exception {
    mvc.perform(post("/api/v1/deliveries").header("Authorization",h("manager")).contentType(MediaType.APPLICATION_JSON).content("{\"note\":\"N2\",\"tankId\":1,\"qty\":99999}")).andExpect(status().isUnprocessableEntity()); }
  @Test void insufficientStockRejected() throws Exception {
    mvc.perform(post("/api/v1/sales").header("Authorization",h("cashier")).contentType(MediaType.APPLICATION_JSON).content("{\"tankId\":1,\"qty\":999999,\"payMode\":\"CASH\"}")).andExpect(status().isConflict()); }
  @Test void saleUsesCurrentPriceAndWritesLedger() throws Exception {
    mvc.perform(post("/api/v1/sales").header("Authorization",h("cashier")).contentType(MediaType.APPLICATION_JSON).content("{\"tankId\":1,\"qty\":100,\"payMode\":\"CASH\"}"))
      .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(10250.0));
    mvc.perform(get("/api/v1/tanks/1/ledger").header("Authorization",h("manager"))).andExpect(jsonPath("$[0].type").value("SALE")); }
  @Test void auditorCannotSell() throws Exception {
    mvc.perform(post("/api/v1/sales").header("Authorization",h("auditor")).contentType(MediaType.APPLICATION_JSON).content("{\"tankId\":1,\"qty\":1,\"payMode\":\"CASH\"}")).andExpect(status().isForbidden()); }
}
