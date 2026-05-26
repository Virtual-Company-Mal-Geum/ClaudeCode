package com.malgeum.geo.global.config;

import java.net.http.HttpClient;
import java.time.Duration;

import org.springframework.boot.web.client.RestClientCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;

@Configuration
public class AiRestClientConfig {
    @SuppressWarnings("null")
    @Bean
    public RestClientCustomizer aRestClientCustomizer() {
        return builder -> {
                //Java11부터는 기본 connectionTimeout에 대해 HttpClient로만 직접 설정해야합니다. JdkClientHttpRequestFactory로는 불가능.
                HttpClient httpClient = HttpClient.newBuilder()
                                                .connectTimeout(Duration.ofSeconds(15)) // 원격(Tailscale) 서버 대비 여유 있게 설정
                                                .build();

                // AI 모델 추론은 VRAM·입력 길이에 따라 수십 초 소요 가능 → Read Timeout을 120초로 충분히 확보
                JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
                requestFactory.setReadTimeout(Duration.ofSeconds(120));
                builder.requestFactory(requestFactory);
        };
    }
}
