-- U4: nuevos estados de cuenta REJECTED (registro/KYC rechazado) y SUSPENDED (suspensión temporal).
-- El baseline V1 creó un CHECK que sólo permitía PENDING/ACTIVE/BANNED → sin esto, persistir
-- REJECTED/SUSPENDED fallaría con una violación de constraint. Se reemplaza por los 5 valores.
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_estado_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_estado_check
    CHECK (estado IN ('PENDING', 'ACTIVE', 'BANNED', 'REJECTED', 'SUSPENDED'));
