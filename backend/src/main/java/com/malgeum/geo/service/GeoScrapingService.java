package com.malgeum.geo.service;

import java.io.IOException;
import java.net.URI;
import java.security.KeyManagementException;
import java.security.NoSuchAlgorithmException;
import java.security.cert.X509Certificate;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.select.Elements;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class GeoScrapingService {

    private static final String CHROME_UA =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
            "AppleWebKit/537.36 (KHTML, like Gecko) " +
            "Chrome/124.0.0.0 Safari/537.36";

    /**
     * 앱 시작 시 SSL 인증서 검증을 우회합니다.
     * 일부 한국 사이트(히마트 등)는 SAN이 없는 구형 인증서를 사용하여
     * Java 기본 SSL 검증에서 거부됩니다.
     */
    @PostConstruct
    private void disableSslVerification() {
        try {
            TrustManager[] trustAll = new TrustManager[]{
                new X509TrustManager() {
                    public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
                    public void checkClientTrusted(X509Certificate[] c, String a) {}
                    public void checkServerTrusted(X509Certificate[] c, String a) {}
                }
            };
            SSLContext sc = SSLContext.getInstance("TLS");
            sc.init(null, trustAll, new java.security.SecureRandom());
            HttpsURLConnection.setDefaultSSLSocketFactory(sc.getSocketFactory());
            HttpsURLConnection.setDefaultHostnameVerifier((hostname, session) -> true);
            log.info("[GeoScrapingService] SSL 인증서 검증 우회 설정 완료 (구형 인증서 사이트 지원)");
        } catch (NoSuchAlgorithmException | KeyManagementException e) {
            log.warn("[GeoScrapingService] SSL 우회 설정 실패: {}", e.getMessage());
        }
    }

    // AI 서버가 요구하는 모든 필드 포함
    public record ScrapedData(String htmlText, JsonNode jsonLd, String domain, Map<String, String> metaTags) {}

    /**
     * 타겟 URL에서 정적 HTML을 긁어와 본문 텍스트와 JSON-LD 데이터를 추출합니다.
     * 봇 차단, 리다이렉트, HTTP 에러, JSON-LD 파싱 실패 등의 상황을 모두 처리합니다.
     *
     * @param url 프론트엔드로부터 입력받은 타겟 URL
     * @return 추출된 ScrapedData (스크래핑 실패 시 빈 내용으로 대체하여 AI 분석은 계속 진행)
     */
    public ScrapedData extractDataForAi(String url) {
        ObjectMapper objectMapper = new ObjectMapper();

        try {
            log.info("[Geo Scraping] Jsoup 스크래핑 시작 - URL: {}", url);

            // Chrome 브라우저처럼 요청해서 봇 차단(403/406/429) 우회
            Document doc = Jsoup.connect(url)
                    .userAgent(CHROME_UA)
                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8")
                    .header("Accept-Language", "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7")
                    .header("Accept-Encoding", "gzip, deflate, br")
                    .header("Connection", "keep-alive")
                    .header("Upgrade-Insecure-Requests", "1")
                    .referrer("https://www.google.com/")
                    .timeout(15000)          // 15초 타임아웃 (기존 5초에서 상향)
                    .followRedirects(true)
                    .ignoreHttpErrors(true)  // 4xx/5xx도 파싱 시도 (예외 대신 빈 본문 반환)
                    .ignoreContentType(true)
                    .method(Connection.Method.GET)
                    .execute()
                    .parse();

            // 1. domain 추출 (AI 서버 필수 필드)
            String domain = "";
            try {
                domain = new URI(url).getHost();
                if (domain == null) domain = "";
            } catch (Exception uriEx) {
                log.warn("[Geo Scraping] domain 파싱 실패: {}", uriEx.getMessage());
            }

            // 2. meta 태그 추출 (AI 서버 필수 필드)
            Map<String, String> metaTags = new HashMap<>();
            for (Element meta : doc.select("meta")) {
                String key = meta.attr("name");
                if (key.isEmpty()) key = meta.attr("property"); // og:, twitter: 등
                String content = meta.attr("content");
                if (!key.isEmpty() && !content.isEmpty()) {
                    metaTags.put(key, content);
                }
            }

            // 3. JSON-LD 추출 및 하나의 배열 문자열로 결합
            Elements scriptTags = doc.select("script[type=application/ld+json]");
            String combinedJsonLd = scriptTags.stream()
                    .map(Element::data)
                    .collect(Collectors.joining(", ", "[", "]"));

            // 4. 불필요한 태그(GNB, Footer, Script 등) 제거 후 순수 본문 추출
            doc.select("header, nav, footer, script, style, noscript, iframe, svg").remove();
            String bodyText = doc.body() != null ? doc.body().text() : "";
            String cleanHtmlText = limitTextLength(bodyText);

            // 5. 본문이 너무 짧으면 봇 차단 페이지일 가능성 경고 (분석은 계속 진행)
            if (cleanHtmlText.length() < 100) {
                log.warn("[Geo Scraping] 추출된 본문이 너무 짧습니다 ({}자). 봇 차단 또는 JS 렌더링 페이지일 수 있습니다. URL: {}",
                        cleanHtmlText.length(), url);
            } else {
                log.info("[Geo Scraping] 스크래핑 성공 - domain: {}, 본문 {}자, meta {}개, JSON-LD {}개",
                        domain, cleanHtmlText.length(), metaTags.size(), scriptTags.size());
            }

            // 6. JSON-LD 파싱 (실패 시 빈 배열로 대체하여 AI 분석 계속 진행)
            JsonNode jsonLdNode;
            try {
                jsonLdNode = objectMapper.readTree(
                        combinedJsonLd.equals("[]") ? "[]" : combinedJsonLd);
            } catch (Exception parseEx) {
                log.warn("[Geo Scraping] JSON-LD 파싱 실패 (빈 배열로 대체): {}", parseEx.getMessage());
                jsonLdNode = objectMapper.readTree("[]");
            }

            return new ScrapedData(cleanHtmlText, jsonLdNode, domain, metaTags);

        } catch (IOException e) {
            // 네트워크 접속 자체가 불가능한 경우 (DNS 실패, 연결 거부 등)
            log.error("[GEO Scraping] 페이지 접속 불가 - URL: {}, 원인: {}", url, e.getMessage());
            throw new RuntimeException("웹페이지에 접속할 수 없습니다: " + e.getMessage());
        }
    }

    // AI 서버의 컨텍스트 윈도우 한계(~4096 토큰)에 맞춰 본문 앞부분 4000자로 제한
    private String limitTextLength(String text) {
        if (text.length() > 4000) {
            text = text.substring(0, 4000);
        }
        return text;
    }
}
