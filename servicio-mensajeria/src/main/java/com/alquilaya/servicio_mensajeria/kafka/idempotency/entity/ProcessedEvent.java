package com.alquilaya.servicio_mensajeria.kafka.idempotency.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.IdClass;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Fila de la tabla {@code processed_events}: marca que un eventId ya fue
 * procesado por un consumer particular. PK compuesta (event_id, consumer_name)
 * permite que distintos consumers procesen el mismo evento.
 *
 * Ver docs/consistencia/02-convenciones.md sección 6.
 */
@Entity
@Table(name = "processed_events")
@IdClass(ProcessedEvent.PK.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProcessedEvent {

    @Id
    @Column(name = "event_id", nullable = false)
    private UUID eventId;

    @Id
    @Column(name = "consumer_name", nullable = false, length = 100)
    private String consumerName;

    @Column(name = "processed_at", nullable = false)
    private LocalDateTime processedAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PK implements Serializable {
        private UUID eventId;
        private String consumerName;

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof PK pk)) return false;
            return Objects.equals(eventId, pk.eventId)
                    && Objects.equals(consumerName, pk.consumerName);
        }

        @Override
        public int hashCode() {
            return Objects.hash(eventId, consumerName);
        }
    }
}
