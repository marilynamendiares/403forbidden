# 403FORBIDDEN — Access Matrix V1

**Date:** 2026-03-31  
**Status:** active draft / working canon  
**Purpose:** формально зафиксировать текущую truth-модель доступа для `arcs` и связанных действий после первого access-refactor.

---

## 1. Scope

Этот документ фиксирует только текущую access truth для:

- просмотра `arcs`;
- просмотра `chapters`;
- просмотра `chapter posts`;
- создания арок;
- создания глав;
- создания постов;
- доступа к drafts;
- private/public-like поведения текущей модели.

Это **не** финальная security bible всего проекта.  
Forum/world/admin/economy/pager должны быть формализованы отдельно.

---

## 2. Role Model

### 2.1. Guest

Незалогиненный пользователь.

Для `arcs` в текущей реализации не считается основной целевой ролью.  
Текущий shell/protected flow предполагает вход через авторизацию.

### 2.2. Restricted

Залогиненный пользователь без approved character application.

Может:

- читать доступные арки;
- читать опубликованные главы;
- читать опубликованные посты;
- использовать system как observer/read-only participant.

Не может:

- создавать арки;
- создавать главы;
- публиковать игровые посты;
- полноценно участвовать в gameplay.

### 2.3. Player

Залогиненный пользователь с approved character application.

Может:

- создавать арки;
- создавать главы;
- публиковать игровые посты;
- участвовать в gameplay в рамках role/collab-ограничений.

### 2.4. Owner / Collaborator

Это уже не site-wide роль, а роль внутри конкретной арки.

Текущие collab-роли:

- `OWNER`
- `EDITOR`
- `AUTHOR`
- `VIEWER`

Текущая truth-модель чтения treats all invited collaborators as trusted readers of the arc and its drafts.

---

## 3. Current Visibility Truth

### 3.1. Public-like readable arcs

Сейчас арка считается читаемой обычным залогиненным пользователем, если:

- `searchVisibility !== "HIDDEN"`

Это означает:

- `PUBLIC` — читаемо;
- `LIMITED` — сейчас тоже читаемо;
- `HIDDEN` — не читаемо без прямого отношения к арке.

### 3.2. Private-like arcs

В текущей модели `HIDDEN` фактически работает как private read access.

То есть:

- обычный пользователь не должен видеть и читать такую арку;
- читать её могут только `OWNER` и приглашённые `collaborators`.

### 3.3. Discovery vs readability

Важно:

- `allowDiscovery` и `searchVisibility` влияют на попадание арки в discovery/search/catalog;
- но для прямого чтения арки после access-refactor решающим условием стала не discovery-видимость, а `searchVisibility`.

Итог:

- арка может не попадать в discovery, но всё ещё быть читаемой по прямому пути, если она не `HIDDEN`;
- `HIDDEN` уже трактуется как non-public/private-like режим.

---

## 4. Draft Truth

Draft-материалы:

- draft chapters;
- unpublished chapters;
- связанные draft-only chapter views.

Текущая truth-модель:

- `OWNER` и любой приглашённый `collaborator` могут читать drafts;
- обычный `restricted` или `player` без участия в арке drafts не видит;
- для неучаствующего пользователя draft chapter должен маскироваться как not found / invisible.

---

## 5. Arc Matrix

### 5.1. Read arc page `/arcs/[slug]`

- `Restricted`: yes, если арка не `HIDDEN`
- `Player`: yes, если арка не `HIDDEN`
- `Owner`: yes
- `Collaborator`: yes

### 5.2. Read chapter page `/arcs/[slug]/[index]`

- published chapter + non-hidden arc:
  - `Restricted`: yes
  - `Player`: yes
- draft/unpublished chapter:
  - `Owner`: yes
  - `Collaborator`: yes
  - everyone else: no

### 5.3. Read chapter posts `/api/arcs/[slug]/[index]/posts`

- published chapter + non-hidden arc:
  - `Restricted`: yes
  - `Player`: yes
- draft/unpublished chapter:
  - `Owner`: yes
  - `Collaborator`: yes
  - everyone else: no

### 5.4. Create arc `/api/arcs`

- `Restricted`: no
- `Player`: yes

### 5.5. Create chapter `/api/arcs/[slug]/chapters`

- requires `Player`
- requires arc role `EDITOR` or above

Практически:

- `Owner`: yes
- invited `EDITOR`: yes
- `Restricted`: no
- ordinary non-collab `Player`: no

### 5.6. Create chapter post `/api/arcs/[slug]/[index]/posts`

- requires `Player`
- requires chapter open status
- requires arc role in allowed gameplay set

Практически:

- `Owner`: yes
- `EDITOR`: yes
- `AUTHOR`: yes
- `VIEWER`: no
- `Restricted`: no

---

## 6. UX Meaning

Эта матрица соответствует продуктовой цели:

- restricted-user может изучать проект и читать, как играют другие;
- но не может врываться в игровой процесс без approval;
- approved player получает право на реальное участие;
- private-like arcs и drafts сохраняют пространство для закрытого письма и подготовки.

---

## 7. Known Limitations

### 7.1. `LIMITED` пока не имеет отдельной сильной семантики

Сейчас:

- `PUBLIC` и `LIMITED` практически одинаковы с точки зрения read access;
- различие у них пока больше discovery/search-oriented, чем security-oriented.

Это допустимо на текущем этапе, но позже может потребовать отдельной модели.

### 7.2. Нет отдельного explicit privacy field

Сейчас private-like чтение опирается на `searchVisibility === HIDDEN`.

Это работает, но концептуально это всё ещё компромисс.  
В будущем можно ввести отдельное поле вроде:

- `readVisibility`
- `accessScope`
- `privacyMode`

если продуктовая модель станет сложнее.

### 7.3. Guest access for arcs не формализован

Текущая truth в основном описывает залогиненных пользователей внутри shell flow.  
Полная guest-facing matrix для arcs может быть определена позже отдельно.

---

## 8. Canon Decisions For Now

До следующего пересмотра считаем каноном:

- `restricted` может читать public-like arcs в view-only режиме;
- `player` нужен для gameplay actions;
- `HIDDEN` трактуется как private-like arc;
- drafts видят только owner/collaborators;
- `allowDiscovery` не равен read permission;
- access checks должны проходить через единые helpers, а не размазываться вручную по каждому route.

---

## 9. Refactor Implications

После появления этого документа следующие пакеты должны опираться именно на него.

В частности:

- legacy naming cleanup не должен ломать access truth;
- future pager/inbox work не должен заново размывать role semantics;
- дальнейший refactor `books -> arcs` должен сохранять текущую матрицу доступа;
- если появится отдельная privacy model, этот документ должен стать базой для `Access Matrix V2`.
