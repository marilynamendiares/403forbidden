# 403Forbidden — Performance Budgets v1

**Date:** 2026-04-05  
**Status:** active working budget  
**Purpose:** определить первые инженерные бюджеты для ключевых UX-потоков, чтобы дальнейшая оптимизация шла по измеримым целям, а не по интуиции.

---

## 1. Budget Philosophy

Бюджеты в этом проекте нужны не ради формальности.

Они должны защищать два главных ощущения:

- проект ощущается как большая и качественная цифровая система;
- проект не ощущается тяжёлым, дешёвым или медленным.

Главный принцип:

- `forum` — быстрый и живой social layer;
- `writer flow` — надёжный и ценный content layer;
- `shell` — максимально безшовная программа;
- incidental traffic не должен незаметно съедать проект изнутри.

---

## 2. Budget Targets

## 2.1. Forum Thread First Render

### Goal

Thread page должна открываться быстро и без ощущения тяжёлого форума.

### Budget

- server-side thread read model: стремиться к `<= 250ms` на тёплом окружении
- initial post slice size: контролируемый, без лишнего overfetch
- full page render не должен требоваться для continuation старых постов

### Regression Signal

- thread open начинает ощущаться как “подождать, пока поднимется страница”
- continuation снова приводит к полному shell/page pipeline

## 2.2. Forum Reply Perceived Speed

### Goal

Ответ должен ощущаться быстрым, но не обязательно мессенджер-моментальным.

### Budget

- локальное появление своего нового reply: практически сразу после успешного submit
- repair/realtime sync не должен быть единственным способом увидеть свой reply

### Regression Signal

- пользователь отправляет reply и ждёт второй цикл, чтобы увидеть результат

## 2.3. Chapter Page First Render

### Goal

Chapter screen как главный gameplay-экран должен собираться плотнее и чище, чем средний экран проекта.

### Budget

- server-side screen composition: стремиться к `<= 300ms` на тёплом окружении
- один и тот же chapter/post slice не должен читаться повторно для разных зон экрана
- page read model должен уже содержать главные ACL/visibility truth

### Regression Signal

- chapter screen снова обрастает последовательными reads и duplicate identity hops

## 2.4. Chapter Post Submit Perceived Speed

### Goal

Новый пост внутри главы должен ощущаться мгновенным с точки зрения пользователя, при сохранении writer-grade надёжности.

### Budget

- immediate local append после успешного create
- SSE и repair fetch — только consistency layer, а не основной UX path

### Regression Signal

- новый post снова виден только после отдельного follow-up fetch/realtime cycle

## 2.5. Arcs Discovery First Render

### Goal

Discovery должен ощущаться богатым archive screen, но без тяжёлой внутренней композиции.

### Budget

- discovery compose path: стремиться к `<= 350ms` на тёплом окружении
- viewer membership считается только по реально показанным arc cards
- одни и те же rows не мапятся и не перечитываются повторно между секциями

### Regression Signal

- archive screen становится тяжёлым из-за внутреннего duplicated compose-cost

## 2.6. Presence / Notifications Incidental Traffic

### Goal

Фоновая активность не должна незаметно плодить лишние запросы.

### Budget

- один каноничный unread truth
- один каноничный presence contract
- no mount-time duplicate fetch ladders for the same meaning

### Regression Signal

- экран просто открылся, а система уже делает несколько запросов за один и тот же смысл

## 2.7. Shell Intra-App Navigation

### Goal

Переходы внутри shell должны ощущаться как смена экрана в программе, а не как грубая перезагрузка веб-страницы.

### Budget

- избегать full navigation там, где достаточно local continuation or scoped refresh
- локальная геометрия и scroll behavior не должны разрушаться при простом переходе

### Regression Signal

- shell начинает снова ощущаться как набор отдельных страниц с пересборкой

---

## 3. Budget Rules

Если приходится выбирать между:

- более красивой, но тяжёлой реализацией;
- чуть более скучной, но более дешёвой и надёжной реализацией;

то для hot paths по умолчанию выигрывает вторая.

Исключение:

- если более лёгкая реализация ломает core identity `terminal + shell` или убивает ощущение живой цифровой системы.

---

## 4. First Measurement Scope

На первом этапе измерять нужно прежде всего:

- `GET /api/forum/categories/[category]/threads/[slug]/posts`
- `POST /api/forum/categories/[category]/threads/[slug]/posts`
- `GET /api/arcs/[slug]/chapters/[id]/posts`
- `POST /api/arcs/[slug]/chapters/[id]/posts`
- `POST /api/presence/ping`
- `GET /api/notifications/count`

Это не весь проект, но это уже даёт хорошую картину:

- social traffic
- writer traffic
- incidental traffic

---

## 5. Budget Verdict

Этот документ не должен быть “идеальным навсегда”.

Он должен стать первым реальным инженерным фильтром:

- что важно;
- что измерять;
- что считать регрессией;
- где проект не имеет права снова становиться тяжёлым.
