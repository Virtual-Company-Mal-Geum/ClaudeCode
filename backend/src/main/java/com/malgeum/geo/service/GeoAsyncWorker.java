package com.malgeum.geo.service;

import java.util.HashMap;
import java.util.Map;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.malgeum.geo.domain.domain.AnalysisReport;
import com.malgeum.geo.domain.domain.Order;
import com.malgeum.geo.global.common.AnalysisReportRepository;
import com.malgeum.geo.global.common.OrderRepository;
import com.malgeum.geo.service.GeoAiService.GeoEvaluationResponse;
import com.malgeum.geo.service.GeoScrapingService.ScrapedData;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class GeoAsyncWorker {
    private final GeoScrapingService geoScrapingService;
    private final GeoAiService geoAiService;
    private final OrderRepository orderRepository;
    private final AnalysisReportRepository analysisReportRepository;

    // 이전에 설정한 커스텀 스레드 풀에서 실행되도록 지정
    @SuppressWarnings("null")
    @Async("taskExecutor")
    @Transactional
    public void processAnalysis(Long orderId) {
        log.info("[AsyncWorker] 백그라운드 분석 시작 - OrderID: {}", orderId);
        if (orderId == null || orderId <= 0) {
            log.error("[AsyncWorker] 유효하지 않은 OrderID: {}", orderId);
            return;
        }

        Order order = null;
        try {
            order = orderRepository.findById(orderId).orElseThrow();
            // 1. 상태를 PROCESSING(진행 중)으로 변경
            order.updateStatus(Order.JobStatus.PROCESSING);
            String targetUrl = order.getTargetUrl();

            // 2. Jsoup 스크래핑 실행 — 실패해도 빈 데이터로 AI 분석 계속 진행
            ScrapedData scrapedData;
            try {
                scrapedData = geoScrapingService.extractDataForAi(targetUrl);
            } catch (Exception scrapEx) {
                log.warn("[AsyncWorker] 스크래핑 실패, 빈 데이터로 AI 분석 계속 진행 - OrderID: {}, 원인: {}",
                        orderId, scrapEx.getMessage());
                // domain만 추출하고 나머지는 빈 값으로 채움
                String domain = "";
                try { domain = new java.net.URI(targetUrl).getHost(); } catch (Exception ignored) {}
                scrapedData = new ScrapedData(
                        "", // htmlText 없음
                        new com.fasterxml.jackson.databind.ObjectMapper().readTree("[]"), // jsonLd 빈 배열
                        domain != null ? domain : "",
                        java.util.Map.of() // metaTags 없음
                );
            }
            // 3. AI 서버에 평가 요청 (부품 2) — domain, meta_tags 포함
            GeoEvaluationResponse aiResponse = geoAiService.evaluateTarget(
                    targetUrl,
                    scrapedData.htmlText(),
                    scrapedData.jsonLd(),
                    scrapedData.domain(),
                    scrapedData.metaTags());

            // 4. 성공: 결과 리포트(AnalysisReport) 생성 및 상태 업데이트
            if ("success".equals(aiResponse.status())) {
                String content = aiResponse.content() != null ? aiResponse.content() : "";

                // AI 응답 JSON에서 suggested_json_ld 추출
                Map<String, Object> aiLogMap = new HashMap<>();
                aiLogMap.put("content", content);
                try {
                    ObjectMapper mapper = new ObjectMapper();
                    JsonNode aiJson = mapper.readTree(content);
                    JsonNode suggestedJsonLd = aiJson.get("suggested_json_ld");
                    if (suggestedJsonLd != null && !suggestedJsonLd.isNull()) {
                        aiLogMap.put("suggested_json_ld", mapper.convertValue(suggestedJsonLd, Object.class));
                        log.info("[AsyncWorker] suggested_json_ld 추출 성공 - OrderID: {}", orderId);
                    }
                } catch (Exception parseEx) {
                    log.warn("[AsyncWorker] suggested_json_ld 파싱 실패 (무시) - OrderID: {}, 원인: {}",
                            orderId, parseEx.getMessage());
                }

                AnalysisReport report = AnalysisReport.builder()
                        .clientOrder(order)
                        .rawScrapedData(Map.of("htmlText", scrapedData.htmlText()))
                        .rawAILog(aiLogMap)
                        .build();
                analysisReportRepository.save(report);
                order.updateStatus(Order.JobStatus.SUCCESS);
                log.info("[AsyncWorker] 분석 완료 및 저장 성공 - OrderID: {}", orderId);
            } else {
                order.updateStatus(Order.JobStatus.FAILED);
                log.info("[AsyncWorker] AI 서버 분석 실패 - OrderID: {}, 사유: {}", orderId, aiResponse.content());
            }
        } catch (Exception e) {
            log.error("[AsyncWorker] 작업 중 치명적 오류 발생 - OrderID: {}", orderId, e);
            order.updateStatus(Order.JobStatus.FAILED);
        }
    }

    private Map<String, Object> parseJsonMap(String jsonString) throws Exception {
        // AI 응답에서 JSON 문자열을 Map으로 변환
        ObjectMapper objectMapper = new ObjectMapper();
        Map<String, Object> aiResultMap = objectMapper.readValue(jsonString,
                new TypeReference<Map<String, Object>>() {
                });
        return aiResultMap;
    }
}
