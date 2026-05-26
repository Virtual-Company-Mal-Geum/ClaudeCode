package com.malgeum.geo.service;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.malgeum.geo.domain.domain.Client;
import com.malgeum.geo.domain.domain.Order;
import com.malgeum.geo.domain.domain.Order.CategoryStatus;
import com.malgeum.geo.global.common.ClientRepository;
import com.malgeum.geo.global.common.OrderRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orderRepository;
    private final ClientRepository clientRepository;
    private final GeoAsyncWorker geoAsyncWorker;

    @SuppressWarnings("null")
    @Transactional
    public Long acceptOrder(String targetUrl, CategoryStatus categoryStatus) {
        // 1. JWT 필터를 통과한 현재 로그인 고객사 ID 가져오기
        String clientIdStr = SecurityContextHolder.getContext().getAuthentication().getName();

        Client client;
        try {
            Long clientId = Long.valueOf(clientIdStr);
            client = clientRepository.findById(clientId)
                    .orElseGet(this::getDefaultClient);
        } catch (NumberFormatException e) {
            // JWT 없이 요청 (anonymousUser 등) → 기본 테스트 클라이언트로 처리
            log.warn("[OrderService] 비인증 요청 수신 (auth={}) — 기본 테스트 클라이언트로 처리합니다.", clientIdStr);
            client = getDefaultClient();
        }

        Order savedOrder = orderRepository.save(createOrder(client, targetUrl, categoryStatus));
        log.info("[OrderService] 새로운 분석 주문 접수 완료 - OrderID: {}, client: {}", savedOrder.getId(), client.getId());

        // 비동기 워커에게 처리 위임 (즉시 리턴, 실제 작업은 별도 스레드)
        geoAsyncWorker.processAnalysis(savedOrder.getId());
        return savedOrder.getId();
    }

    /** 비인증 요청 시 사용할 기본 테스트 클라이언트 반환 */
    private Client getDefaultClient() {
        return clientRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new RuntimeException("초기화된 테스트 클라이언트가 없습니다. DataInitializer를 확인하세요."));
    }

    // 2. 주문서 생성 (초기 상태: PENDING)
    public Order createOrder(Client client, String targetUrl,CategoryStatus categoryStatus) {
        Order order = Order.builder()
                .client(client)
                .targetUrl(targetUrl)
                .categoryStatus(categoryStatus)
                .build();
        return order;
    }

}
