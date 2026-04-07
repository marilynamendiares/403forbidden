# 403Forbidden — Writer Reliability Review v1

**Date:** 2026-04-05  
**Status:** active engineering review  
**Purpose:** оценить `arc/chapter intro`, `chapter editor`, `drafts` и `locks` как самый ценный content path проекта, чтобы дальше усиливать его не вслепую, а по реальным рискам.

---

## 1. Strategic Verdict

Writer flow уже выглядит лучше, чем типичный hobby RP-project.

Сильные стороны уже есть:

- local drafts существуют;
- save flows уже не хаотичны;
- writer UI разложен лучше, чем раньше;
- chapter posting и chapter editing уже не привязаны к полной перезагрузке экрана.

Но главный риск writer layer не в скорости.

Главный риск в доверии:

- потеряется ли текст;
- сломается ли lock;
- поймёт ли пользователь, что именно с его контентом происходит;
- не превратится ли сложный редактор в fragile UX.

Именно это и должно быть главным фокусом дальше.

---

## 2. What Is Already Good

## 2.1. Draft Safety Exists

Во всех ключевых writer surfaces уже есть local draft storage:

- arc intro
- chapter intro
- chapter editor

Это уже серьёзное преимущество по надёжности.

## 2.2. Intro And Chapter Editing Canon Is Simpler

Для `arc intro`, `chapter intro` и `chapter editor` продуктовый канон уже упрощён:

- intro редактирует только создатель сущности;
- chapter text редактирует только автор главы;
- multi-user edit-lock для writer surfaces больше не нужен.

Это сильнее соответствует реальному UX проекта:

- игрок пишет свой собственный текст;
- система не пытается координировать несколько редакторов одного и того же content surface;
- writer flow становится предсказуемее и легче.

Дополнительный save-failure канон уже выбран:

- экран явно показывает ошибку сохранения;
- локальный draft не считается потерянным;
- система прямо сообщает, что текст всё ещё хранится в этом браузере.

## 2.3. Writer UI Is No Longer Monolithic

Редактор и intro-слои уже начали жить как составные части, а не как один giant file на всё сразу.

Это уменьшает вероятность дальнейшего хаоса.

---

## 3. Real Remaining Risks

## 3.1. Draft Truth Is Reliable, But Still Primitive

Текущая draft-модель хороша как baseline, но ещё не до конца зрелая:

- нет формализованного versioning baseline;
- нет richer metadata around “when/why draft was restored”;
- нет явной стратегии на cross-tab ambiguity.

Для текущего этапа это приемлемо, но для writer-core excellence позже это нужно усилить.

## 3.2. Draft Recovery UX Still Needs Stronger Canon

Теперь главный remaining риск уже не в lock loss, а в том, насколько ясно система объясняет пользователю статус локального черновика и server save.

---

## 4. What Should Be Done Next

## W1. Draft Recovery Canon

Нужно зафиксировать:

- когда draft восстанавливается;
- когда draft очищается;
- что происходит при конфликте baseline vs local draft;
- как система объясняет пользователю, что текст безопасно сохранён локально.

## W2. Failure Mode Audit

Нужен отдельный список сценариев:

- закрыли вкладку;
- упал fetch;
- save завершился ошибкой;
- текст остался только локально.

Writer layer должен иметь каноничную реакцию на эти случаи.

---

## 5. Leadership Verdict

Writer flow уже не выглядит слабым.

Но именно потому, что это самый ценный контентный путь проекта, к нему надо относиться строже, чем к остальным частям:

- больше предсказуемости;
- больше наблюдаемости;
- меньше расхождений поведения;
- больше доверия со стороны пользователя.

Следующий правильный шаг после этого review:

- `draft recovery canon`
- затем `draft/failure mode hardening`
