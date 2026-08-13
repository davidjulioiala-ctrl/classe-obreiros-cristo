# Activity documents implementation findings

- The activity form is in `client/src/pages/Activities.tsx` and already has `type`, `isReligious`, `biblicalReference`, commission fields, and create/update mutations.
- The backend activity procedures are in `server/routers.ts`; create/update use `safeText` and `liderProcedure`.
- Activity persistence is in `server/db.ts`; `activities` is protected with `ACTIVITY_PRIVATE_FIELDS`, and `deleteActivity` currently removes commission and attendance rows before the activity.
- Storage rules require file bytes in S3 via `storagePut` and only metadata in MySQL. Downloads should use `storageGetSignedUrl` through an authenticated proxy.
- The global multipart guard in `server/_core/index.ts` currently permits only `/api/status-report`; the activity document route must be explicitly allowed.
- Planned fields: `meetingAgenda`, `meetingReason`; planned metadata table: `activityDocuments` with activity link, document type (`ata`/`relatorio`), original name, storage key/URL, MIME, size, uploader and timestamp.
- Planned UI rules: add explicit `social` type, force `isReligious=false` for social activities, hide/clear biblical reference when non-religious, show agenda and meeting reason only for `reunião`, and provide upload/list/download controls on each activity card.
