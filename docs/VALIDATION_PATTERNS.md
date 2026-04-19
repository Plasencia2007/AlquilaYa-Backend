# Capa de Validaciones (Frontend & Backend)

Hemos implementado una capa de validación simétrica que garantiza que los datos sean correctos antes de ser procesados por la lógica de negocio.

## Frontend (Zod + React Hook Form)

Todas las validaciones del lado del cliente se centralizan en `src/validations/`.

-   **Tecnologías**: `react-hook-form` para gestión de estados y `@hookform/resolvers/zod` para la lógica de esquemas.
-   **Esquemas Principales**:
    -   `authSchema.ts`: Reglas para Login y Registro (DNI 8 dígitos, Clave 8 caracteres, etc.).
    -   `documentSchema.ts`: Reglas para subida de archivos (Tipo de archivo, Tamaño máx 5MB).

### Ejemplo de uso
```typescript
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(authSchema)
});
```

## Backend (Spring Boot Validation)

Se utiliza el estándar `Jakarta Validation` (anteriormente Bean Validation 2.0).

-   **DTOs**: Las clases en `AuthDtos` están anotadas con `@NotBlank`, `@Email`, `@Size`, y `@Pattern`.
-   **Controladores**: El uso de `@Valid` en los parámetros `@RequestBody` activa la validación automática.
-   **Gestión de Errores**: `GlobalExceptionHandler` intercepta las excepciones `MethodArgumentNotValidException` y las convierte en un mapa legible de errores (Campo -> Mensaje).

## Sincronización

Es vital mantener las reglas de negocio sincronizadas. Si se cambia el número mínimo de caracteres de una contraseña en el backend, se debe actualizar el esquema Zod correspondiente en el frontend para mantener la consistencia.
