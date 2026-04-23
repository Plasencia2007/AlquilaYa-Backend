package com.plasencia.servicio_catalogos.repositories;

import com.plasencia.servicio_catalogos.entities.ItemCatalogo;
import com.plasencia.servicio_catalogos.enums.TipoItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ItemCatalogoRepository extends JpaRepository<ItemCatalogo, Long> {
    List<ItemCatalogo> findByTipoAndActivoTrue(TipoItem tipo);
    List<ItemCatalogo> findByActivoTrue();
}
