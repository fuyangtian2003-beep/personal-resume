package com.bob.personalresume.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * AI 聊天安全中转代理控制器
 * 隐藏 OpenRouter API Key，防止前端暴露密钥，并进行 IP 限流控制。
 */
@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class AiProxyController {

    @Value("${openrouter.api.key:}")
    private String apiKey;

    @Value("${openrouter.api.url:https://openrouter.ai/api/v1/chat/completions}")
    private String apiUrl;

    @Value("${openrouter.api.model:openrouter/free}")
    private String modelId;

    private final RestTemplate restTemplate = new RestTemplate();

    // 内存 IP 限流缓存：记录每个 IP 的请求时间戳
    private final Map<String, List<Long>> requestLog = new ConcurrentHashMap<>();
    private static final int MAX_REQUESTS_PER_MINUTE = 5;

    @PostMapping("/chat")
    public ResponseEntity<?> chat(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        // 1. 安全校验：检查 API Key 是否配置
        if (apiKey == null || apiKey.trim().isEmpty()) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "后端未配置 OPENROUTER_API_KEY 环境变量。请在服务器的系统环境变量中设置此 Key（例如：export OPENROUTER_API_KEY=your_key）并重启后端服务。");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }

        // 2. 限流校验：限制每个 IP 每分钟最多 5 次请求
        String clientIp = getClientIp(request);
        long now = System.currentTimeMillis();
        List<Long> timestamps = requestLog.computeIfAbsent(clientIp, k -> new CopyOnWriteArrayList<>());
        
        // 清理 1 分钟（60000毫秒）之前的时间戳记录
        timestamps.removeIf(t -> now - t > 60000);
        
        if (timestamps.size() >= MAX_REQUESTS_PER_MINUTE) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "老板，请求太频繁啦！为了防止盗刷，AI 助手设置了保护限制（每分钟最多提问 5 次）。请稍后再试～");
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(errorResponse);
        }
        timestamps.add(now);

        // 3. 构建请求 OpenRouter 的 Request Body
        Map<String, Object> openRouterBody = new HashMap<>();
        // 默认使用配置的模型 ID
        openRouterBody.put("model", modelId);

        // 灵活解析参数：前端可以传 prompt，也可以传标准的 messages 数组
        if (payload.containsKey("messages")) {
            openRouterBody.put("messages", payload.get("messages"));
        } else if (payload.containsKey("prompt")) {
            List<Map<String, String>> messages = new ArrayList<>();
            Map<String, String> userMessage = new HashMap<>();
            userMessage.put("role", "user");
            userMessage.put("content", (String) payload.get("prompt"));
            messages.add(userMessage);
            openRouterBody.put("messages", messages);
        } else {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "无效的请求参数，缺少 'prompt' 或 'messages'。");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        }

        // 4. 设置请求头
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + apiKey.trim());
        // 遵循 OpenRouter 的推荐规范：传入引用站点
        headers.set("HTTP-Referer", "https://fythub.top");
        headers.set("X-Title", "Personal Resume AI Assistant");

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(openRouterBody, headers);

        // 5. 发送请求并返回给前端
        try {
            ResponseEntity<?> response = restTemplate.postForEntity(apiUrl, entity, Map.class);
            return ResponseEntity.status(response.getStatusCode()).body(response.getBody());
        } catch (HttpClientErrorException e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "调用 OpenRouter 失败（客户端错误）：" + e.getResponseBodyAsString());
            return ResponseEntity.status(e.getStatusCode()).body(errorResponse);
        } catch (HttpServerErrorException e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "调用 OpenRouter 失败（服务器错误）：" + e.getResponseBodyAsString());
            return ResponseEntity.status(e.getStatusCode()).body(errorResponse);
        } catch (Exception e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "请求异常：" + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * 获取客户端真实 IP
     */
    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        // 如果是多级代理，X-Forwarded-For 会是多个 IP 逗号分隔，取第一个真实 IP
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
}
