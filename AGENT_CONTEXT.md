# 🤖 Zouth App - Context Transfer for AI Agents

> **Context Date**: April 2026. This document is optimized for AI agents jumping into the codebase to instantly grasp architecture, current state, and strict directives.

## 1. Project Overview
- **Name**: Zouth App
- **Goal**: Multi-service SaaS platform for product catalog management and WhatsApp customer service.
- **Architecture**: Multi-tenant (Tenants are `Manufacturers`).
- **Core Services**: 
  - *ZouthCatálogo* (Catalog management)
  - *ZouthAtendimento* (Evolution API WhatsApp integration)
  - *ZouthMembros* (User/staff management)
- **Current Status**: Active development. Backend and frontend logic is fully wired. WhatsApp QR generation and the basic chat flow were validated locally after provisioning an isolated Evolution API stack.

## 2. Tech Stack
- **Backend**: Laravel 12, PHP 8.4.19
- **Frontend**: React 19, Inertia.js v2, Tailwind CSS v4, shadcn/ui
- **Animations**: GSAP & @gsap/react (used for sidebar and service switcher)
- **Database**: PostgreSQL (Migrations/Seeders are production-safe and idempotent)
- **Authentication**: Laravel Fortify v1 (Headless auth, 2FA, Email verification)
- **Integrations**: Evolution API v2 (WhatsApp Baileys), Stripe (via Cashier v16)
- **Tools**: Pest v4 (Testing), Laravel Pint, TypeScript, Vite, Wayfinder

## 3. Database Schema & Relationships
- `users`: Authenticable. `belongsTo(Manufacturer, 'current_manufacturer_id')`.
- `manufacturers`: The Tenant. `hasMany(User | WhatsappInstance | WhatsappConversation | Product | Categoria)`.
- `whatsapp_instances`: Evolution API instances. `belongsTo(Manufacturer)`.
- `whatsapp_conversations`: Chats. `belongsTo(Manufacturer | WhatsappInstance)`, `hasMany(WhatsappMessage)`. Remote JID format expected: `number@s.whatsapp.net`.
- `whatsapp_messages`: Messages. `belongsTo(WhatsappConversation | WhatsappInstance)`.
- `products` & `categorias`: `belongsToMany` relationship (pivot).

## 4. Key Files & Architecture Patterns
- **Multi-Tenancy**: All controller operations MUST map to `$request->user()->currentManufacturer`.
- **Policies**: Auth rules isolated in `app/Policies/` (e.g., `WhatsappInstancePolicy`, `WhatsappConversationPolicy`).
- **Evolution API Service** (`app/Services/EvolutionApiService.php`): Encapsulates all outgoing HTTP requests to the WhatsApp API.
- **Webhooks** (`EvolutionWebhookController`): Handles WhatsApp events (`MESSAGES_UPSERT`, `MESSAGES_UPDATE`, `CONNECTION_UPDATE`). Bypasses CSRF (`bootstrap/app.php`). Authenticated via `apikey` header.
- **State Mgmt** (`resources/js/contexts/active-service-context.tsx`): React Context + URL + `localStorage` keep the active service in sync.
- **Service Switcher Animations** (`app-sidebar.tsx`, `zouth-logo-picker.tsx`): Highly specific implementations of `useGSAP` handling route-aware slide-in/slide-out animations without conflicting with React's render cycle. 

## 5. Recent Fixes (Feb 2026)
- **Event Mismatch**: Controller now normalizes Evolution API uppercase events (`MESSAGES_UPSERT` -> `messages.upsert`).
- **LID Format**: Normalized webhook JIDs to standard `@s.whatsapp.net` by prioritizing `key.remoteJidAlt` over `key.remoteJid`.
- **Payload Normalization**: Webhook now safely processes both single-object and array payloads from the Evolution API.
- **Webhook API Key**: Now explicitly passed in the payload during `createInstance`.
- **GSAP Animation Bugs**: Eliminated re-render flash issues using `isInitialRenderRef` and removing React inline styles for display state.

## 6. Local Evolution API & Known Issues
- **Local Evolution API**: Running via an isolated Docker Compose stack under `.local/evolution-api/` (excluded from Git). The API is exposed at `http://127.0.0.1:18080`; its internal PostgreSQL and Redis containers do not publish host ports, so they do not interfere with the Zouth App PostgreSQL container on `localhost:5432`.
- **Validated Flow**: A smoke instance successfully returned a real `qrcode.base64` from Evolution API v2.3.7, and the basic ZouthAtendimento chat flow was tested through the Zouth App UI.
- ⚠️ **Mid Risk**: `WhatsappChatController@messages` might suffer from N+1 query performance without proper eager loading.
- ⚠️ **Mid Risk**: Webhooks use basic API key auth; could be upgraded to HMAC signature validation.

## 7. Testing
- **Framework**: Pest v4.
- **Status**: 21 tests / 55 assertions passing perfectly.
- **Command**: `php artisan test tests/Feature/WhatsappAtendimentoTest.php --compact`
- **Coverage**: WhatsApp instance CRUD, webhook processing, policies, basic messaging logic.

## 8. 🚨 Strict Agent Directives
1. **Multi-Tenancy Enforcement**: ALWAYS scope DB queries to the user's `currentManufacturer_id`. Never allow cross-tenant data leakage.
2. **Use FormRequests & Policies**: Never write inline validation or inline authorization in controllers.
3. **GSAP Animations**: Do not remove `isInitialRenderRef` or revert to React inline styles for display transitions in the sidebar. Doing so breaks the Inertia page transition timeline.
4. **Database Focus**: Project is strictly PostgreSQL. Stop adhering to SQLite assumptions.
5. **Next Immediate Step**: Continue from the working ZouthAtendimento baseline. The QR code blocker is no longer the active issue in this local environment.
