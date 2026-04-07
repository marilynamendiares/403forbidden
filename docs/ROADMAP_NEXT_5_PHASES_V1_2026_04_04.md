# 403Forbidden — Roadmap: Next 5 Phases

**Date:** 2026-04-04  
**Status:** active roadmap  
**Purpose:** зафиксировать следующие пять фаз развития проекта так, как их строил бы технический лидер, который одновременно отвечает за продуктовую целостность, UX и инженерную зрелость.

---

## 1. Roadmap Logic

Этот roadmap строится не по принципу “что ещё осталось сделать”, а по принципу:

- что делает проект сильнее как продукт;
- что снижает риски будущего роста;
- что увеличивает perceived quality;
- что создаёт правильную платформу под нагрузку и дальнейшую экспансию.

Последовательность фаз намеренно такая:

1. сначала укрепить эксплуатационную и измеримую базу;
2. затем довести social и writer hot paths до более серьёзной зрелости;
3. потом расширять продуктовые слои `world` и `pager`;
4. в конце уже переходить к release-grade polish.

---

## 2. Phase 1 — Production Hardening And Observability

## Goal

Перевести проект из “хорошо выпрямленной системы” в “измеримую и управляемую систему”.

## Why This Phase Comes First

Без этого следующие шаги будут снова делаться на интуиции.

Проект уже слишком большой и слишком живой по UX, чтобы дальше развиваться без:

- performance baselines;
- query visibility;
- operational smoke checks;
- release discipline.

## Main Workstreams

- ввести performance budgets для:
  - forum thread first load
  - chapter page first load
  - arcs discovery first load
  - notification/presence incidental traffic
- сделать query-shape и slow-path audit по Prisma/DB hot paths
- добавить базовые integration/smoke сценарии для:
  - auth
  - forum thread flow
  - chapter posting flow
  - character approval gate
- зафиксировать release checklist и regression guardrail
- подготовить error/latency observability слой

## Exit Criteria

- у ключевых потоков есть измеримые baselines;
- у проекта есть понятный набор smoke checks;
- есть список подтверждённых hot queries и их стоимость;
- регрессии производительности и критических flow-paths перестают быть “ощущением”.

---

## 3. Phase 2 — Forum And Social Scale Maturity

## Goal

Довести `forum` до уровня действительно устойчивой социальной системы, способной к большому объёму чтений и сообщений.

## Product Meaning

Forum — это не вторичный раздел, а социальный вход в продукт.  
Если forum ощущается тяжёлым или хрупким, страдает весь проект.

## Main Workstreams

- окончательно закрепить thread read/write model как hot-path contract
- проверить и укрепить cursor/index strategy под большой поток постов
- сделать moderation, outbox и administrative flows более строгими
- доработать client-side continuation/history UX для длинных тредов
- укрепить realtime event discipline и repair/fallback policy
- пересмотреть forum category/thread landing screens под perceived speed и clarity

## Exit Criteria

- длинные треды читаются и продолжаются мягко;
- новые сообщения появляются быстро и предсказуемо;
- forum write/read paths имеют измеримую и понятную стоимость;
- social layer выглядит не просто рабочим, а зрелым.

---

## 4. Phase 3 — Writer Core Excellence

## Goal

Сделать `arcs + chapters + editors` самым сильным и самым профессиональным слоем проекта.

## Product Meaning

Это главный gameplay loop.  
Именно он определяет, будет ли проект просто атмосферной платформой или действительно сильной RP-средой.

## Main Workstreams

- усилить lock/edit reliability и поведение multi-tab / collaborative editing
- довести drafts/autosave/recovery до надёжной системной формы
- ещё плотнее ужать chapter/arc read models
- доработать optimistic/realtime модели вокруг write flows
- провести editor UX review с точки зрения friction, focus, posting cadence
- улучшить chapter rail / reading / writing continuity как единый опыт

## Exit Criteria

- writer flows ощущаются быстрыми и надёжными;
- потеря контента и странное lock-поведение становятся крайне редкими;
- chapter screen и editor flows выглядят как продуктовый peak проекта;
- collaborative writing больше не держится на “работает, пока повезло”.

---

## 5. Phase 4 — World And Pager Product Expansion

## Goal

Довести два стратегических слоя, которые сейчас важны концептуально, но ещё не раскрыты полностью:

- `world`
- `pager`

## Product Meaning

`World` отвечает за глубину сеттинга и ощущение, что пользователь находится в реальном архиве мира.  
`Pager` должен стать системной нервной системой проекта: inbox, system delivery, escalation, message routing.

## Main Workstreams

- переосмыслить `world` как полноценный archive/reference layer
- определить canon UX и data model для `pager`
- связать `pager` с notifications, approvals, invites, system notices и future direct flows
- спроектировать pager не как “ещё одну страницу”, а как обязательный системный слой
- выровнять информацию и маршруты между shell, forum, arcs и pager

## Exit Criteria

- `world` перестаёт быть только вспомогательной encyclopedic зоной и становится частью identity;
- `pager` получает ясную продуктовую роль и первый реальный функциональный слой;
- проект становится заметно ближе к ощущению полноценной внутренней системы, а не набора разделов.

---

## 6. Phase 5 — Release-Grade Polish And Launch Discipline

## Goal

Подготовить проект к состоянию, в котором его уже можно уверенно считать сильным, цельным и устойчивым публичным продуктом.

## Main Workstreams

- accessibility и mobile review
- design consistency pass по shell/forum/arcs/world
- content/admin operational tooling polish
- security and abuse review
- performance/load verification
- release playbook и support workflow

## Exit Criteria

- проект ощущается цельным на всех главных экранах;
- нет крупных архитектурных долгов, мешающих релизной уверенности;
- продукт выдерживает не только демо-сценарий, но и реальное ежедневное использование;
- команда понимает, как сопровождать проект после запуска.

---

## 7. Leadership Priority Order

Если смотреть максимально прагматично, приоритет должен быть таким:

1. `Production Hardening And Observability`
2. `Forum And Social Scale Maturity`
3. `Writer Core Excellence`
4. `World And Pager Product Expansion`
5. `Release-Grade Polish And Launch Discipline`

Это лучший порядок, потому что:

- он не ломает текущий product truth;
- он усиливает самое важное раньше, чем начинается декоративная полировка;
- он делает рост проекта управляемым, а не хаотичным.

---

## 8. Final Roadmap Verdict

Следующие пять фаз не про “дописать фичи”.

Они про то, чтобы:

- превратить уже сильный проект в зрелую систему;
- укрепить социальное и gameplay ядро;
- довести продуктовые слои до полной связности;
- подготовить проект к реальному использованию, росту и удержанию пользователей.

Именно так этот проект сейчас и нужно развивать.
