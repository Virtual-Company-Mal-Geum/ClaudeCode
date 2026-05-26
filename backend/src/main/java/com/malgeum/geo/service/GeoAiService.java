package com.malgeum.geo.service;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;

import lombok.extern.slf4j.Slf4j;

import org.springframework.web.client.ResourceAccessException;

@Slf4j
@Service
public class GeoAiService {
    private final RestClient restClient;

    public GeoAiService(RestClient.Builder restClientBuilder,
                        @Value("${geo.ai-server.url}") String aiServerUrl) {
        this.restClient = restClientBuilder
                .baseUrl(aiServerUrl)
                .build();
    }

    // AI 서버 /evaluate 가 요구하는 모든 필드 포함 (domain, meta_tags 추가)
    public record GeoEvaluationRequest(
        @JsonProperty("url")
        String url,

        @JsonProperty("domain")
        String domain,

        @JsonProperty("html_text")
        String htmlText,

        @JsonProperty("json_ld")
        JsonNode jsonLd,

        @JsonProperty("meta_tags")
        Map<String, String> metaTags) {
    }

    // AI 서버 실제 응답: {status, result_type, content}
    public record GeoEvaluationResponse(
        String status,
        @JsonProperty("result_type") String resultType,
        String content
    ) {}

    @SuppressWarnings("null")
    public GeoEvaluationResponse evaluateTarget(
            String url, String htmlText, JsonNode jsonLd,
            String domain, Map<String, String> metaTags) {

        // AI 모델 컨텍스트 윈도우 초과(OOM) 방지를 위해 텍스트 길이 선제적 절삭
        String safeHtmlText = htmlText.length() > 4000 ? htmlText.substring(0, 4000) : htmlText;
        GeoEvaluationRequest request = new GeoEvaluationRequest(url, domain, safeHtmlText, jsonLd, metaTags);
        log.info("[GeoAiService] AI 서버 분석 요청 전송 - URL: {}, domain: {}, meta {}개",
                url, domain, metaTags != null ? metaTags.size() : 0);

        try {
            return restClient.post()
                    .uri("/evaluate")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(GeoEvaluationResponse.class);

        } catch (ResourceAccessException e) {
            log.error("[GeoAiService] AI 서버 응답 지연 또는 다운: {}", e.getMessage());
            return new GeoEvaluationResponse("error", "text", "AI 서버 응답 지연 (Timeout).");
        } catch (RestClientResponseException e) {
            log.error("[GeoAiService] AI 연산 중 오류 발생 (Status: {}): {}", e.getStatusCode(), e.getResponseBodyAsString());
            return new GeoEvaluationResponse("error", "text", "AI 연산 중 오류 발생: " + e.getStatusCode());
        }
    }
}
