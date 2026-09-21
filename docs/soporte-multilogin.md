# Reporte a soporte de Multilogin

## Resumen

El arranque de perfiles por **API** falla con `LOCK_PROFILE_ERROR / can't lock profile`,
mientras que por la **UI** de la app los mismos perfiles arrancan correctamente.

## Detalle técnico (logs del agente)

Agente local **v12.13.0**, entorno **Multilogin EU**. Flujo por API en `desktop_*.log`:

```
service/gateway.go:286  got metadata ... browserID=mimic core_major_version=152   ✅
service/service.go:175  starting profile <id>                                      ✅
gateway/gateway.go:507  lock profile <id> response status 501                      ❌
service/service.go:264  can't start locked profile <id>: http client error
```

- La **creación** del lock vía servicio `bpds` devuelve **HTTP 501**.
- La operación `RemoveProfileLock` (quitar lock) sí responde **200 OK**.
- Ocurre con **todos** los perfiles del workspace (todos en **Cloud storage**).
- Persiste tras **logout/login** en la app y tras reiniciar el agente.
- Por **UI** los perfiles arrancan sin problema.

## Descartado desde el lado del cliente

- Código / parámetros del request (probado con y sin `automation_type`, con `selenium`,
  con `core_version` explícito, `X-Strict-Mode: false`).
- Conexión de red al agente (responde 200 en `/api/v1/version` y `/api/v1/profile/statuses`).
- Token: validado como `owner` por `GET /user/workspaces`.
- Sesión duplicada: `active_counter` en 0, `in_use_by` vacío.
- Almacenamiento: los perfiles son **Cloud**.
- Archivo de perfil corrupto (`Default/AutofillStrikeDatabase`): renombrado; el 501 persiste.

## Datos de la cuenta

- Email: rocker1058@gmail.com
- Workspace ID: d89f01fc-3295-4d88-8ac0-edbba46a9253
- Perfiles de prueba: DEMO 01 (`843f0f9e-daa5-488c-a9fe-4a2917abdb01`),
  DEMO02 (`f3041718-073b-4f51-8154-8232f9e08625`)

## Adjunto

- `desktop_<fecha>.log` del agente (ruta en Windows: `C:\Users\<usuario>\mlx\logs\`).

## Pregunta a soporte

¿Por qué el servicio `bpds` responde **501** al crear el lock del perfil por API,
si por UI el mismo perfil arranca correctamente? ¿Hay algo que deba habilitarse en la
cuenta/workspace o en el token de automatización para permitir el lock por API?
