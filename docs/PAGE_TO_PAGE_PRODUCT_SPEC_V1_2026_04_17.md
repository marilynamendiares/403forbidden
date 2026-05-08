# 403Forbidden — Page-to-Page Product Specification v1

**Date:** 2026-04-17  
**Status:** active product specification draft  
**Purpose:** зафиксировать постраничную продуктовую карту проекта: зачем существует каждая страница, что пользователь на ней делает, какие роли имеют доступ, какие состояния нужны и какие решения должны направлять дальнейшую разработку.

---

## 1. Product Spine

`403Forbidden` — это литературная roleplay-платформа нового поколения, оформленная как внутренняя цифровая система футуристичного города.

Проект совмещает:

- roleplay forum;
- литературное совместное письмо;
- arcs / chapters / posts как основной gameplay;
- character approval gate;
- world archive;
- social forum;
- player economy;
- profile cosmetics and inventory;
- future pager / in-world messenger;
- admin and moderation tooling.

Главная задача проекта — создать современный стандарт RP-платформы после старых форумных конструкторов, где пользователь ощущает не очередной форум со скином, а цельную, быструю, отзывчивую и атмосферную систему.

---

## 2. Core Product Promise

Игрок попадает в правдоподобный футуристичный мир, в который можно поверить и который хочется испытать своей фантазией.

Внутри этого мира игрок:

- создаёт персонажа;
- проходит approval;
- знакомится с другими игроками;
- договаривается о совместных историях;
- создаёт arcs and chapters;
- пишет большие литературные posts;
- зарабатывает points for completed play;
- покупает cosmetics, artifacts and profile appearance items;
- постепенно оставляет след в общей хронологии мира.

Главный gameplay проекта — не форумная болтовня, а совместное литературное письмо.

---

## 3. User Roles

## 3.1. Guest

Гость должен видеть достаточно, чтобы почувствовать масштаб мира и понять, что проект живой.

Guest can:

- see public entry page;
- read the high-level world layer;
- read public rules / setting introduction;
- understand the joining process;
- see signs of active life inside the system.

Guest should not:

- read real gameplay arcs by default;
- create threads or posts;
- access internal player layers;
- access shop, inventory or full profile customization.

## 3.2. Registered / Restricted User

Registered user has entered the first internal layer, but is not yet a full player.

Restricted user can:

- access more of the shell;
- read allowed forum areas;
- communicate in allowed onboarding / guestbook / help zones;
- study world and rules more deeply;
- prepare and submit a character application.

Restricted user should not:

- create gameplay arcs;
- publish gameplay posts;
- use full shop/economy;
- access full player-only forum layers;
- use advanced profile appearance tools.

## 3.3. Player

Player is a registered user with approved character application.

Player can:

- create and join arcs;
- create chapters;
- publish gameplay posts;
- access player-only threads;
- use shop / inventory / appearance systems;
- participate in the living chronology of the world.

## 3.4. Admin / Moderator

Admin and moderator roles can also be players, but have additional control responsibilities.

Admin/moderator can:

- approve or reject character applications;
- post official announcements;
- manage forum and reports;
- manually adjust player points;
- fix shop/inventory/economy issues;
- support users through help flows.

---

## 4. Layer Model

## 4.1. Public Layer

The public layer should feel like a doorway into a larger hidden system.

It should:

- be atmospheric;
- be understandable enough for new users;
- not over-explain the product like a marketing page;
- make experienced RP users feel that this is not another old forum template.

## 4.2. Registered Layer

Registration should feel like opening a new system layer.

The user should discover that more exists inside:

- shell;
- forum access;
- application flow;
- internal navigation;
- future pager/system surfaces.

## 4.3. Player Layer

Approval should be the real transition from observer to participant.

The user gains access to:

- gameplay;
- player-only forum zones;
- arcs;
- profile/inventory economy;
- richer identity expression.

---

## 5. Realtime Model

Realtime should not be uniform across the project.

## 5.1. Pager

Fastest realtime layer.

Should feel close to an in-world messenger / character smartphone:

- personal messages;
- system inbox;
- admin messages;
- city/system notifications;
- direct personal delivery.

## 5.2. Forum

Medium realtime layer.

Forum should feel alive, like a social network/forum hybrid:

- posts can appear without page refresh;
- likes/reactions should update quickly;
- presence can be visible;
- notifications should feel connected to the system.

But forum should not feel like a high-speed chat room.

## 5.3. Arcs

Slowest and most deliberate layer.

Arcs are for serious literary posts that may take hours or days to write.

Realtime here should support:

- trust;
- delivery confirmation;
- draft safety;
- consistency;
- awareness that new posts exist.

It should not turn gameplay writing into a chat experience.

---

## 6. Design Tone

The interface should feel:

- mysterious;
- cybernetic;
- city-like;
- system-driven;
- cinematic;
- precise;
- modern;
- expensive but restrained.

It should not rely on generic neon cyberpunk decoration.

The design target is practical engineering UI with atmospheric city-system details: minimal, sharp, functional, and meaningful.

---

## 7. Page Specification: `/`

## 7.1. Product Role

`/` is the entry gateway.

It is not a generic landing page and not a marketing homepage.  
It is the visible threshold of a much larger hidden system.

The user should feel:

- this is only the door;
- something large exists behind it;
- the system is active;
- the world is serious and deep;
- this is not another old RP forum template.

## 7.2. Primary Audience

Primary:

- experienced RP users who already understand forum roleplay culture.

Secondary:

- new users who do not yet understand forum RP but can be guided without childish onboarding.

## 7.3. First Impression

The first screen should communicate:

- system gateway;
- unusual layout;
- terminal/shell identity;
- mysterious access point;
- modern performance and interface quality;
- a serious world behind the visible surface.

The page should create the thought:

> This is clearly something I have not seen before.

## 7.4. What Guest Must Understand

Before registration, guest should understand:

- this is not a typical old RP forum;
- the project is a fast modern system, not a site pretending to be one;
- there is a large world to explore;
- joining means more than creating an account;
- the real next milestone is character application and approval;
- the project may contain adult / NSFW / NC-18 / NC-21 content inside.

## 7.5. What Guest Should Be Able To Do

Guest should be able to:

- enter or inspect the public world layer;
- understand that registration opens a deeper system layer;
- sign up or log in;
- read basic rules / setting entry points;
- see that the project is alive.

Guest may see:

- a subtle activity signal, such as users online or recent internal activity.

Guest should not need to see:

- full news feed;
- real player arcs;
- active player lists;
- detailed internal gameplay feeds.

## 7.6. Hidden / Later-Revealed Content

The following should generally stay behind registration or player approval:

- real arcs / episodes;
- player-only forum spaces;
- shop/economy;
- full profile appearance system;
- internal player activity;
- pager/messenger.

Possible exception:

- a controlled demo/sample episode may exist later to show the writing format without exposing real gameplay.

## 7.7. Calls To Action

The page should not aggressively force registration.

Primary actions should feel cold, system-like and atmospheric:

- enter / open system;
- inspect world;
- sign in;
- request access / create account.

Exact wording remains undecided and should be chosen during page design.

Important rule:

- the page should gently reveal the path to becoming a player;
- it should not sound like a generic SaaS signup funnel.

## 7.8. Joining Explanation

The joining flow should be explained, but through the system tone.

Required information:

- register;
- read the world/rules;
- submit a character application;
- wait for approval;
- enter gameplay as a full player.

Tone:

- mysterious system voice;
- slightly cold;
- cinematic;
- not childish;
- not over-explaining RP to experienced users.

## 7.9. Adult Content / Safety Disclaimer

The page needs a visible but controlled disclaimer that the internal project can contain:

- NSFW;
- NC-18 / NC-21;
- mature themes;
- erotic writing;
- violence;
- morally grey stories.

This should be present before entering deeper layers.

The disclaimer should not dominate the whole first impression, but it must be clear enough to be responsible.

## 7.10. Registered User State

If a registered user opens `/`, the page should differ from guest state.

Minimum:

- show that the user is signed in;
- provide a clear way into the internal system.

Future possible states:

- continue to shell;
- continue application;
- view approval status;
- unread messages / notifications;
- active arcs summary for approved players.

This is not fully specified yet.

## 7.11. Player State

Approved player may eventually see a more useful gateway:

- continue playing;
- active arcs;
- unread pager messages;
- forum notifications;
- system status.

For now, player and registered state can remain close until internal dashboard strategy is defined.

## 7.12. Content That Should Not Be On `/` For Now

Do not prioritize:

- full news feed;
- real arcs preview;
- active character directory;
- heavy dashboard logic;
- complex personalization;
- marketing-style feature sections.

## 7.13. Open Decisions

- Exact CTA wording.
- Whether `/` should redirect signed-in users or remain a distinct atmospheric gateway.
- Whether to show live online count on the public page.
- Whether to include a demo/sample episode later.
- How much of the joining process should be visible on first screen versus lower on page.

---

## 8. Page Specification: `/world`

## 8.1. Product Role

`/world` is the public world encyclopedia and visitor directory.

It should most likely live outside the main shell, near the project gates, before the user fully enters the internal system.

It is not a marketing page and not a gameplay dashboard.  
It is the place where a visitor realizes that the world is large, coherent, detailed and worth entering.

## 8.2. First Impression

The page should communicate:

- this is a huge developed world;
- the material is deep but navigable;
- the user is not expected to understand everything at once;
- the world has history, laws, geography, factions, systems and cultural logic;
- the setting feels like something recovered from archives, leaks and surviving documentation.

The user should feel:

> This is insanely detailed and seriously built.

## 8.3. Access Model

Most of `/world` should be available to guests.

Guest access should include:

- world introduction;
- lore;
- city / map;
- laws;
- factions;
- locations;
- timeline;
- rules;
- mechanics;
- FAQ;
- high-level economy explanation.

The project should not require registration just to understand the setting.

## 8.4. Future Hidden Lore / Unlocks

Even if 99% of world information is public, the architecture should allow future hidden lore unlocks.

Possible future model:

- a player buys or receives a special artifact;
- the system delivers a message through pager/inbox;
- this artifact reveals new information in `/world`;
- previously invisible locations, documents or secrets become readable;
- unlocked lore may later become usable in gameplay context.

Example:

- a hidden location is not visible on the standard map;
- after acquiring a specific artifact, the player can see that location;
- that location may become selectable or referenceable in an episode.

This should remain a future capability, not a requirement for the first mature `/world` pass.

## 8.5. Main User Scenarios

The page must support several reading modes:

- read the entry version from the beginning;
- browse through categories;
- search for specific information;
- wander through the world out of curiosity;
- prepare mentally for character creation;
- understand what kinds of characters are plausible in this setting.

`/world` should help users imagine characters, but it should not directly push them into the character application form.

## 8.6. Entry Version

The `/world` landing page should provide an entry version of the setting.

This entry version should:

- catch attention;
- explain the basic shape of the world;
- reduce fear of scale;
- point toward deeper sections;
- make the user want to explore.

It should not dump the full lore immediately.

## 8.7. Section Model

Expected world sections:

- `/world/lore`;
- `/world/map`;
- `/world/factions`;
- `/world/locations`;
- `/world/timeline`;
- `/world/systems`;
- `/world/systems/rules`;
- `/world/systems/mechanics`;
- `/world/systems/faq`.

Shop should not conceptually belong inside `/world`.

Shop is closer to:

- character;
- player economy;
- profile/inventory;
- shell surface.

Guest may eventually see shop as a storefront, but player purchase behavior belongs to the internal player layer.

## 8.8. Map

`/world/map` should ideally become interactive.

The map should allow users to:

- inspect regions;
- inspect important points;
- connect visual geography with encyclopedia entries;
- feel that places described in lore actually exist.

The map should not initially be tied to arcs or episodes.

Possible future:

- locations can be referenced by episodes;
- player timeline can later connect to locations.

But first map purpose is world comprehension, not gameplay tracking.

## 8.9. Timeline

`/world/timeline` should first describe the history of the world before the current playable time.

It should include:

- historical breakdown;
- major conflicts;
- crises;
- political shifts;
- social changes;
- the events that created the present world.

Future possibility:

- completed player episodes can form a separate living chronology because each episode has an in-world date.

This future player-generated timeline should not replace the world-history timeline.

## 8.10. Factions

`/world/factions` should be a reference of organizations, groups and powers.

Factions may influence character creation because a player may choose affiliation with:

- faction;
- mafia;
- organization;
- political body;
- other group.

But faction pages should not directly start character creation.

Allowed supporting pattern:

- subtle note that this information may matter when designing a character.

## 8.11. Locations

`/world/locations` should be a reference of significant locations.

Primary purpose:

- lore;
- orientation;
- setting depth;
- inspiration.

Future possibility:

- episodes may reference or choose locations.

First priority:

- make the city/world feel real.

## 8.12. Systems / Rules / Mechanics / FAQ

These pages are rules and player guidance, but should be presented through the atmosphere of the world.

Tone:

- city/system documentation;
- recovered archive;
- internal registry;
- surviving documents;
- official or semi-official system text.

They must remain readable and useful.

The atmosphere must not make rules unclear.

## 8.13. Economy Explanation

World/system pages should explain the economy enough for users to understand:

- points;
- rewards for completed episodes/arcs;
- shop;
- cosmetics;
- artifacts;
- profile appearance items;
- manual admin correction when needed.

This likely belongs in mechanics or a nearby systems section.

## 8.14. What `/world` Should Not Do

For now, `/world` should not:

- directly launch character creation;
- push signup too aggressively;
- show live arcs;
- show active characters as a core feature;
- connect locations to current gameplay feeds;
- become a shop;
- become a player dashboard.

## 8.15. Tone

Preferred tone:

- artistic encyclopedia;
- leaked documents;
- surviving archives;
- records from before and after the global internet collapse;
- fragments of a world where WWW was disconnected or destroyed after loss of control over AI.

The tone can be atmospheric, but must remain navigable.

## 8.16. Open Decisions

- Whether `/world` visually belongs entirely outside shell or uses a partial shell-adjacent frame.
- How hidden lore unlocks will be represented in data model later.
- Whether guest shop storefront exists outside shell or shop is entirely internal.
- Whether map starts as static interactive regions or a richer visual system.
- Whether player-generated timeline becomes part of `/world/timeline` or a separate chronology surface later.

---

## 9. Page Group Specification: Auth And Character Gate

Covered pages:

- `/signup`;
- `/login`;
- `/verify-email`;
- `/forgot-password`;
- `/reset-password`;
- `/characters`;
- `/characters/[id]`;
- related profile gate surfaces.

## 9.1. Product Role

Auth and character gate are not only account utilities.

They define the transition from:

- visitor;
- registered system user;
- approved player with a real character.

Registration opens the internal layer.  
Character approval opens the actual gameplay layer.

## 9.2. Signup

`/signup` should be simple, understandable and low-friction.

Tone:

- cold system;
- clear;
- restrained;
- slightly atmospheric;
- not overcomplicated.

The page may use cosmetic details that suggest system intrusion / access request, but the form itself must stay practical.

## 9.3. Signup Fields

Required first-step fields:

- username;
- email;
- password.

Username should have:

- realtime availability check;
- clear note that username is the primary public handle;
- note that username can be changed later if needed.

## 9.4. Username Truth

Username is the account/player handle.

It is used for:

- forum posts;
- mentions;
- pager/messenger;
- finding users;
- social identity;
- profile identity.

Username is not the character full name.

Important distinction:

- forum and pager display primarily `@username`;
- arcs / episodes should display character identity, such as full character name.

This distinction is central to the product model.

## 9.5. Email Verification

Email verification should be mandatory before entering the internal shell.

Reason:

- fewer account integrity issues later;
- cleaner onboarding state;
- simpler access model.

After verification, the user can enter shell.

## 9.6. First Post-Verification Destination

Current preferred direction:

- send the user to `/profile`.

Reason:

- profile can become the natural restricted-user surface;
- it can explain that the user is inside the system but not yet a full player;
- it can show the next step: create / submit character.

## 9.7. Restricted User Profile State

For registered users without approved character, `/profile` should clearly show a gate banner.

Possible banner:

- create your character;
- submit character application;
- application pending;
- edits requested;
- application rejected;
- character approved.

The profile may also show locked player-only sections.

Locked section copy pattern:

- you need an approved character to access this section;
- only approved characters can use this system;
- additional system layers unlock after character approval.

## 9.8. System-Wide Restricted Signals

The system should gently remind restricted users that they are not seeing everything.

Possible surfaces:

- shell header symbol / badge;
- profile banner;
- disabled create buttons;
- forum notes;
- arcs visibility notices.

Example notes:

- only public threads visible; more threads are shown for approved characters;
- only approved characters can create arcs;
- restricted arcs are only visible to approved characters.

This should feel like access-level truth, not a punishment.

## 9.9. `/characters`

`/characters` should be the character creation center.

It should not primarily be a public list of all user applications.

It can contain:

- create character flow;
- current application state;
- good examples;
- fictional sample dossiers;
- selected approved examples if needed.

Purpose:

- help the user build a valid character;
- make the application process feel serious but approachable;
- connect the user to the world without directly duplicating `/world`.

## 9.10. Number Of Characters

Initial canon:

- one account = one active character.

Future possible expansion:

- one account can have multiple characters.

If this is added later:

- forum and pager can still post as `@username`;
- arcs / episodes can let the player choose which character participates.

The current architecture should avoid assuming that account and character are permanently the same entity.

## 9.11. Character Application Shape

The application should be relatively simple but serious.

Current core fields:

- full name;
- gender;
- age;
- appearance;
- personality;
- background;
- faction affiliation dropdown;
- faceclaim / external appearance reference.

Faceclaim note:

- RP users commonly use the appearance of an existing character, actor or media figure as a visual basis;
- this should be supported carefully as reference metadata, not confused with character identity.

Possible additional useful fields:

- occupation / role in society;
- residence / district;
- affiliations;
- personal limitations;
- relationship availability;
- NSFW preferences;
- consent boundaries;
- content limits;
- desired story themes;
- player notes for moderation.

These should be designed carefully so the form does not become intimidating.

## 9.12. Character Application Tone

The application should feel like:

- atmospheric dossier;
- system document;
- access request;
- civic/personnel record;
- internal city registry.

But it should remain easy to fill.

The user should feel:

- creative freedom;
- seriousness;
- awareness that moderation will review the application;
- confidence that the system helps them submit correctly.

## 9.13. Guidance And Validation

The system should help users avoid bad applications.

First practical layer should not require AI.

Non-AI guidance can include:

- field-level helper text;
- examples;
- links to relevant `/world` sections;
- faction notes near faction dropdown;
- age / setting plausibility notes;
- forbidden concept reminders;
- NSFW / consent guidance;
- draft autosave;
- checklist before submit.

Future optional AI-assisted layer:

- application consistency check;
- setting contradiction warnings;
- tone and completeness suggestions;
- moderation preflight summary.

This should be treated as future enhancement, not a dependency for the core application flow.

## 9.14. Application Statuses

Supported statuses:

- draft;
- pending review;
- returned for edits;
- approved;
- rejected.

Status should be visible:

- on `/characters`;
- on `/profile`;
- through system notification;
- later through pager.

## 9.15. Moderator Review

Moderators should be able to:

- approve;
- reject;
- return for edits;
- leave comments;
- explain what they liked;
- explain what must be corrected.

Desired advanced review feature:

- moderator can highlight specific text spans;
- attach comments to highlighted fragments;
- show why a section should be rewritten.

This is high-value but can be implemented after the basic review loop is reliable.

## 9.16. Approval Result

Approval should unlock:

- full profile editing and appearance customization;
- shop access;
- inventory and cosmetics relevance;
- visible arcs page;
- ability to create arcs / episodes;
- ability to write gameplay posts;
- player-only forum threads;
- visibility into approved-player-only arcs where allowed;
- future richer pager surfaces;
- potential player economy/reward systems.

Approval can be communicated through:

- large system notification;
- pager message later;
- profile banner transformation;
- access-level upgrade language.

It does not need to be overly grandiose, but it should feel meaningful.

Possible tone:

- welcome, new citizen;
- access level upgraded;
- profile registered in the city system.

## 9.17. Returned / Rejected Applications

Returned-for-edits state should feel supportive.

Tone:

- clear;
- constructive;
- moderation-guided;
- not humiliating;
- not a cold dead-end.

Rejected state should still explain what happened and what the user can do next, if anything.

## 9.18. `/characters/[id]`

`/characters/[id]` is primarily an internal application/dossier page.

After approval, the character information may become reachable from a public user profile, but users should not necessarily be redirected directly to `/characters/[id]`.

Preferred product direction:

- `/profile` shows a character button/card after approval;
- another player can open character information from the profile;
- long-term structure may become `/profile/characters` or similar.
- `/me` should surface the approved character in the right rail of the profile header;
- `/u/[username]` should expose the approved character card publicly;
- approved character card should expand inline into the full character dossier view.

Draft safety for this page:

- editable application fields should autosave into local browser storage after input starts;
- returning to the page should restore an unsaved local draft automatically;
- successful save or submit should clear the local draft;
- failed save or submit should keep the current text and explain that the draft remains stored in this browser.

Visual reference:

- the application should allow uploading one visual reference image for character appearance;
- the image supports the written appearance section and does not replace it;
- visual reference is required before submit;
- upload changes are treated as draft changes until the user saves or submits;
- moderators should see the visual reference in readonly review.

## 9.19. Account Profile vs Character Profile

Account profile and character profile should be linked but conceptually distinct.

Account profile:

- `@username`;
- social identity;
- forum identity;
- pager identity;
- inventory/cosmetics holder;
- player-facing profile surface.

Character profile:

- in-world identity;
- full name;
- faction;
- age/gender/appearance/personality/background;
- visual reference image for appearance;
- story participation;
- arcs/episodes identity.

The UI can present them together, but development should preserve the distinction.

## 9.20. Critical Failure Risks

The system must avoid:

- losing character draft text;
- unclear application status;
- missing moderator comments;
- lost moderator feedback;
- confusing account identity with character identity;
- unclear access after approval;
- disabled features without explanation.

## 9.21. Open Decisions

- Whether first verified login always goes to `/profile` or sometimes to `/characters`.
- Exact copy for restricted-user banners.
- Whether character examples use fictional templates or selected real approved characters.
- Full field list for v1 character application.
- How public approved character view is routed.
- When to implement span-level moderator comments.
- Whether AI-assisted application review is ever introduced.

---

## 10. Page Group Specification: Forum

Covered pages:

- `/forum`;
- `/forum/news`;
- `/forum/news/public`;
- `/forum/news/players`;
- `/forum/news/devlog`;
- `/forum/[category]`;
- `/forum/[category]/[slug]`.

## 10.1. Product Role

Forum is the social layer of the project.

It should not feel like a classic old RP forum, even though it keeps the useful structure of:

- categories;
- threads;
- posts inside threads.

The target model is closer to a modern social-thread system:

- forum-like organization;
- Twitter-like post behavior;
- live activity;
- mentions;
- reactions;
- quotes;
- partial quotes;
- moderation and access states.

Forum is where users:

- talk to other players;
- find co-writers;
- ask questions;
- introduce themselves;
- follow project updates;
- participate in social life around the game.

## 10.2. First Impression

When a user opens `/forum`, they should understand:

- people are active here;
- this is where communication happens;
- there are multiple conversation zones;
- some areas are open;
- some areas are locked behind registration or character approval;
- the project is larger than what the user can currently access.

The forum should feel alive and modern, not like an archived bulletin board.

## 10.3. Access Model

Guest:

- can see basic/open areas;
- can read selected public threads;
- can see that more locked sections exist;
- cannot post.

Registered / restricted user:

- can access and post in allowed social areas;
- can use welcome/offtopic-style communication;
- can see locked player-only hints;
- cannot access full player-only areas;
- cannot create or participate in gameplay-only spaces.

Approved player:

- can see and use full player forum layer;
- can access player-only categories/threads;
- can participate in the full social system.

Admin/moderator:

- can see all normal areas;
- can see archived/moderated states where appropriate;
- can manage threads/posts/reports/news.

## 10.4. Locked Visibility

Locked sections should generally remain visible as locked surfaces.

Reason:

- users should understand that the system has more inside;
- hidden depth motivates registration and approval;
- access state becomes part of the product atmosphere.

Pattern:

- show category/thread shell;
- disable entry or show restricted state;
- explain required access level.

Example copy:

- visible to approved characters;
- register to access internal discussions;
- character approval required.

## 10.5. Categories

Expected category meanings:

### `welcome`

Forum foyer.

Purpose:

- newcomer introduction;
- first questions;
- light onboarding;
- social entry;
- first contact between restricted users and existing players.

Registered users should be able to post here.

### `offtopic`

General social/off-topic space.

Purpose:

- casual talk;
- non-game chatter;
- social bonding;
- daily conversation.

Restricted users should likely have access, because this is not gameplay content.

### Help / Support

For now, a separate support category is not required as a major product layer.

Support/help can initially live within common visible surfaces.

Future:

- dedicated help desk;
- report/request queue;
- moderator support flow.

### Player-Only Areas

There should be player-only categories or threads.

Purpose:

- deeper community coordination;
- gameplay-related social planning;
- internal discussions;
- spaces only approved characters can access.

## 10.6. `/forum`

`/forum` is the social entry board.

It should contain:

- category buttons/cards;
- access state indicators;
- latest activity hints;
- possibly hot/active thread previews;
- broadcast/news preview tiles.

It should not become visually identical to a classic forum index.

Good direction:

- category tiles with activity context;
- strict, sharp UI;
- enough motion/activity signal to feel alive;
- no heavy clutter.

## 10.7. Category Tiles And Activity

Category tiles can show:

- category name;
- short description;
- thread/post count;
- latest activity;
- active/hot thread preview;
- locked status;
- access requirement.

This helps users quickly find where the current movement is.

Current implementation rule:

- unlocked categories may show a direct latest-thread entry on the right side of the tile;
- locked categories must not leak latest activity;
- hidden threads must not appear as latest activity for normal viewers;
- admins may see hidden latest activity.

Future useful feature:

- category tile can surface the currently most active thread.

## 10.8. News / Broadcasts

News is conceptually a broadcast layer, not ordinary social discussion.

It may use forum-like infrastructure, but product meaning is different.

News types:

- public announcements;
- player announcements;
- devlog;
- maintenance.

Possible later:

- event notices;
- moderation updates.

News authors:

- admins;
- moderators.

Possible future:

- special role with permission to publish news only.

News presentation should be closer to:

- broadcasts;
- cards;
- system messages;
- official channel entries.

Players may react to news, but news should not initially behave like open forum threads.

## 10.9. `/forum/[category]`

Category page should show a thread list, but can be visually styled as:

- board;
- compact archive;
- social topic list;
- structured activity surface.

Important thread card fields:

- title;
- post count;
- last reply time;
- last activity;
- tags if introduced later;
- locked/archived state;
- access state.

Possible later:

- author;
- last reply author;
- unread count for subscribed threads;
- hot activity marker.

## 10.10. Thread Subscriptions / Unread

General read-state for every forum thread is not required immediately.

Better first model:

- user can subscribe/follow a thread;
- subscribed threads can show unread count;
- notifications can be tied to subscribed threads;
- user can quickly return to conversations they care about.

This gives useful signal without forcing full global unread complexity at first.

## 10.11. Pinned Threads

There are two different meanings of pinned:

Admin/moderator pinned:

- official important threads fixed at top of category.

User pinned/favorited:

- user personally pins threads they care about.

Both are useful, but should be modeled separately.

## 10.12. Tags

Thread tags are not required for the first mature pass.

Categories may be enough initially.

Tags can be added later if thread discovery becomes too flat.

## 10.13. `/forum/[category]/[slug]`

Thread page should feel like a modern social feed inside a structured forum thread.

It should combine:

- ordered forum posts;
- social feed readability;
- realtime updates;
- post reactions;
- quotes;
- partial quotes;
- replies/reply-to context;
- mentions.

Target tempo:

- between slow forum and Twitter-like flow;
- alive, but not chat-speed.

## 10.14. Post Composition

Forum posts should support:

- plain text;
- rich text where appropriate;
- mentions;
- full quote;
- partial quote;
- quote multiple fragments from another post;
- reply-to relationship;
- reactions/likes;
- report action.

Partial quote is important because users may want to answer a long post in pieces.

## 10.15. Mentions

`@mention` should notify the mentioned user.

Mentions belong strongly to:

- forum;
- pager;
- notifications;
- user identity by `@username`.

This reinforces username as social handle.

## 10.16. Realtime Behavior

Forum should have medium realtime.

Expected:

- new replies can appear without refresh;
- likes/reactions can update quickly;
- activity feels connected;
- notifications are timely.

Not expected:

- full chat-speed pressure;
- every keystroke or presence detail;
- aggressive typing indicators.

## 10.17. Likes And Reputation

Forum likes can count toward account/player social statistics.

Reputation can influence player reputation.

Important distinction:

- forum activity is social/statistical value;
- gameplay progression and character rewards should still primarily come from arcs/episodes.

Forum should not become a replacement progression source for gameplay.

## 10.18. Moderation

Forum posts should support:

- report;
- delete/hide;
- lock thread;
- archive thread;
- moderator visibility into archived/hidden states.

Archived threads:

- may be hidden from normal users or moved out of active surfaces;
- should remain visible to admins/moderators.

## 10.19. Create Thread Access

If user cannot create a thread:

- prefer disabled button with access reason;
- or show a clear alert/explanation.

Do not allow a user to discover access rules only after a failed submit.

## 10.20. Design Priority

Forum must balance:

- atmosphere;
- speed;
- clarity;
- social density.

Where speed/clarity wins:

- thread reading;
- reply posting;
- moderation actions;
- access explanations.

Where atmosphere can be stronger:

- `/forum` entry board;
- news/broadcast cards;
- category tiles;
- locked section presentation.

## 10.21. Critical Failure Risks

The forum must avoid:

- lost replies;
- duplicate posts;
- unclear moderation result;
- invisible access restrictions;
- stale counts that mislead users;
- realtime repair being the only way to see your own reply;
- locked content feeling like a bug instead of a system state.

## 10.22. Desired User Feeling

After five minutes in forum, user should feel:

- people are actually here;
- conversations are happening;
- there are places to join in;
- the system is deeper than what is currently visible;
- this is not a dead old forum template.

## 10.23. Open Decisions

- Exact guest-visible category list.
- Whether support/help stays inside welcome or becomes its own category.
- Exact player-only category set.
- Whether latest activity appears on `/forum` immediately or later.
- First implementation shape for partial quotes.
- Whether user-pinned threads ship before or after thread subscriptions.
- How forum reputation maps into profile statistics.
- Exact archive visibility rules for normal users.

---

## 11. Page Group Specification: Arcs And Gameplay Writing

Covered pages:

- `/arcs`;
- `/arcs/[slug]`;
- `/arcs/[slug]/[index]`;
- create arc flow;
- create chapter flow;
- chapter post flow;
- arc collaborators;
- arc/chapter close and reward flows.

## 11.1. Product Role

`arcs` are the core gameplay layer of the project.

RP users may commonly call this kind of activity "episodes", but this project should intentionally use `arc` / `ARCS` as its own product language.

In-world meaning:

- ARCS are a technology for immersion into artificial simulations.

Product meaning:

- an arc is a flexible story container;
- players can use it as a single scene, long episode, campaign, storyline, chronicle or multi-chapter book-like structure;
- chapters divide the arc into playable parts;
- chapter posts are the actual literary gameplay.

## 11.2. Arc

An arc can be:

- standalone story;
- storyline;
- campaign;
- large episode;
- short one-scene play;
- container for many chapters;
- container for one chapter only.

One-chapter arcs are valid.

The system should not force players into a large structure when they only want a single scene.

## 11.3. Chapter

A chapter is a part of an arc.

It can be understood as:

- chapter inside a larger story;
- episode inside a larger arc;
- scene;
- act;
- part of a chronicle.

Inside a chapter, players publish story posts in the size and cadence that suits their play.

## 11.4. `/arcs`

`/arcs` should be a discovery/catalog and active gameplay surface.

It should combine:

- discovery of available arcs;
- active arcs by other players;
- quick access to user's current arcs;
- recently updated arcs;
- hot/active arcs;
- create new arc action for approved players;
- link to forum thread/category for finding co-writers.

The page should not be only a static archive.

## 11.5. Access Model

Guest:

- can have limited access;
- may see public arcs or public previews;
- should understand that more opens after registration/approval.

Registered / restricted user:

- can see preview/explanation of approval;
- can read public arcs where allowed;
- cannot create arcs;
- cannot publish gameplay posts.

Approved player:

- can see normal discovery;
- can create arcs;
- can participate in allowed arcs;
- can access player-only visibility where allowed.

Admin/moderator:

- can access all relevant moderation/admin states according to admin policy.

## 11.6. Visibility Modes

Arcs should support visibility modes such as:

- public to guests;
- public to registered users;
- approved players only;
- collaborators only;
- hidden/private;
- invite-only.

Important:

- authors should be able to control who can see an arc/episode;
- locked or restricted visibility should be explained clearly.

## 11.7. Create Arc

Any approved player or higher can create an arc.

Required or strongly expected fields:

- title;
- description;
- cover;
- in-world date;
- location;
- participants;
- visibility;
- tags;
- rating / NSFW level.

## 11.8. Date And Calendar

Every arc and every chapter should have an in-world date.

Reason:

- the project builds a chronological map/history over time;
- player stories should feel like events inside the world;
- completed arcs/chapters may later feed a living player chronology.

## 11.9. Location

Location should come from `/world/locations` or a related canonical location list.

Recommended model:

- select a larger location/region from canonical list;
- optionally provide free text for exact place.

Example:

- region/district from list;
- exact point: apartment, park, street, club, warehouse.

This keeps world structure coherent without blocking player creativity.

## 11.10. Participants And Collaborators

Players invite participants through collaborators inside the arc.

Current roles are enough:

- owner;
- editor;
- author;
- viewer.

Authors and editors can create chapters and publish posts where allowed.

## 11.11. Chapter Creation

Chapter creation should be available to:

- arc owner;
- editors;
- authors where role rules allow.

Exact permission mapping should stay consistent with current collaboration roles.

## 11.12. Chapter Posts

Chapter posts are the main unit of gameplay writing.

They should feel like a hybrid:

- more literary and weighty than forum posts;
- still readable as a sequence of contributions;
- not a chat;
- not a full collaborative document editor.

Each player writes and publishes their own post.

Collaborative live editor is not needed.

## 11.13. Post Identity

Inside arcs/chapters, posts should display character identity.

Preferred display:

- character name;
- character avatar.

Forum/pager use account identity by `@username`; arcs use character identity.

This preserves the difference between social user and in-world character.

Current implementation direction:

- collapsed chapter post header shows character name and post date;
- account `@username` is not shown in the collapsed header;
- expanding the header reveals account attribution and links to `/u/[username]`;
- for now, character avatar falls back to the shared account avatar;
- character-specific image upload belongs to character application/profile expansion.

Future identity options:

- allow per-post identity masking for NPC/third-party posts;
- preserve old posts even if a character later disappears/deactivates;
- show a `went missing`-style state if the author profile is no longer reachable;
- support richer expanded character card in the post header.

## 11.14. Reactions And Reputation

Chapter posts should support reactions/likes.

Comments under chapter posts are not needed for the core flow.

Reason:

- comments may clutter the literary format;
- reactions are enough social signal;
- reputation and rewards can use reactions without turning chapters into forum threads.

Likes/reputation should matter:

- they can increase player reputation;
- reputation can unlock shop items;
- reactions become part of the game economy/social progression.

## 11.15. Rewards And Economy

The desired long-term model is automatic reward calculation.

Closing a chapter or arc should automatically calculate and award eurodollars based on signals such as:

- post count;
- likes/reactions;
- reputation;
- completion state;
- possibly word count later.

Re-opening a closed chapter or arc can cost the same eurodollar amount if players want to rewrite or continue after closure.

This creates an economic consequence around completion and revision.

## 11.16. Closing Chapters And Arcs

Only the arc author/owner should be able to close an arc or chapter.

Close means:

- gameplay section is considered completed;
- rewards may be calculated;
- the section may become read-only;
- reopening may cost eurodollars.

States should include:

- draft;
- open;
- closed;
- archived;
- hidden.

## 11.17. Statistics

It would be valuable to calculate:

- number of posts;
- likes/reactions;
- reputation gained;
- completed chapters;
- completed arcs;
- eurodollars awarded;
- possibly word count.

This should support:

- player profile stats;
- reward calculation;
- shop unlocks;
- long-term gameplay history.

## 11.18. Drafts And Autosave

Draft/autosave for chapter posts is mandatory.

This is a high-trust path.

The system must never casually lose:

- a post draft;
- chapter content;
- arc/chapter metadata.

Current browser-cache draft behavior is directionally correct.

Chapter post composer recovery rules:

- autosave starts after the player begins typing;
- returning to the composer should restore local draft text automatically;
- successful post publish clears the local draft;
- failed publish keeps the editor text and local draft;
- the UI should provide a visible local draft status and a discard local draft action.

## 11.19. `/arcs/[slug]`

Arc page should include:

- overview;
- description;
- cover;
- participants;
- chapter list;
- in-world date or date range;
- location;
- visibility/rating state;
- activity;
- possibly rules/context notes for the arc.

It should help players understand:

- what story this is;
- who is involved;
- where and when it happens;
- what chapters exist;
- whether they can participate.

## 11.20. `/arcs/[slug]/[index]`

Chapter page should focus on:

- chapter header;
- chapter context;
- posts;
- post editor;
- participant/character context;
- status/actions.

Reading mode and split view are not required.

The current visual direction can remain the basis and should be reviewed with screenshots/design pass before heavy redesign.

## 11.21. Critical Failure Risks

Arcs must avoid:

- lost post text;
- lost draft;
- wrong access/visibility;
- publishing from the wrong character;
- wrong in-world date;
- broken participant permissions;
- reward miscalculation without admin repair path;
- accidental post duplication;
- closed chapter still accepting posts incorrectly;
- reopening/closing without clear economic consequence.

## 11.22. Open Decisions

- Exact Russian-facing terminology for arc/chapter/post in UI.
- Exact visibility labels.
- Exact reward formula.
- Whether re-open cost equals previously awarded amount in all cases.
- Whether word count enters reward formula.
- Whether location list is managed from `/world/locations` directly or a separate canonical table.
- Exact permission mapping for `author` vs `editor` in chapter creation.
- How much arc activity appears on `/arcs` discovery cards.

---

## 12. Page Group Specification: Profile, Inventory And Shop

Covered pages:

- `/profile`;
- `/profile/settings`;
- `/settings/profile`;
- `/u/[username]`;
- `/u/[username]/inventory`;
- future `/shop`;
- current `/world/shop` until shop is moved or redefined;
- profile cosmetics;
- inventory;
- eurodollars;
- reputation.

## 12.1. Product Role

Profile is both:

- personal dashboard;
- public identity surface;
- profile customization surface;
- player status display;
- gateway into settings.

It should show who the player is socially, what character they have, what they have earned, and how they present themselves inside the system.

## 12.2. `/profile` vs `/u/[username]`

`/me` is the canonical current user's own profile/dashboard.

`/profile` should be a compatibility alias that redirects to `/me`.

It should allow access to:

- own dashboard;
- settings;
- character status;
- profile customization;
- inventory/equipment;
- active arcs;
- statistics;
- account-level controls.

`/u/[username]` is the public profile route for users.

Important routing canon:

- `/me` should open the current user's own profile surface;
- `/u/[own-username]` should redirect to `/me`;
- `/profile` should redirect to `/me`;
- public profile and own profile should visually converge over time instead of becoming unrelated layouts.

`/u/[username]` for another user should show:

It should show:

- public-facing profile identity;
- public character card if approved;
- selected stats;
- visible inventory/cosmetics;
- active or completed arcs where public;
- profile appearance.

## 12.3. Restricted User Profile

Before character approval, `/profile` should exist but feel partially locked.

Restricted user sees:

- basic profile;
- account handle;
- basic editable settings;
- character gate banner;
- locked player-only sections;
- hints that more unlocks after approval.

The profile should not feel broken or empty.

It should feel like the user has entered the system but has not yet activated full identity.

## 12.4. Approved Player Profile

After approval, the character banner transforms into a character card.

The card should:

- show character identity;
- link/open character information from the approved application;
- feel like a meaningful status change.

Approved player profile unlocks:

- full profile editing;
- cosmetics;
- frames;
- badges;
- profile background;
- avatar decorations;
- typography options;
- artifacts;
- title;
- status line;
- inventory relevance;
- shop purchases.

## 12.5. Account And Character Pairing

Public profile should show a linked pair:

- account/player identity;
- character identity.

This keeps the product truth:

- account is used in forum/pager/social layer;
- character is used in arcs/gameplay layer.

## 12.6. Profile Visual Model

The profile can feel like:

- cyberpunk ID;
- player dossier;
- social profile;
- character-linked identity card;
- customizable system surface.

It should not become a generic social media profile.

## 12.7. Customization

Potential cosmetic/profile items:

- frames;
- badges;
- profile background;
- avatar decorations;
- typography;
- artifacts;
- title;
- status line;
- profile cards;
- small identity accessories.

Stickers are not currently a clear priority.

## 12.8. Inventory

Initial inventory model:

- list of purchased/owned items.

Future expanded model:

- item slots;
- artifact equipment;
- character/profile loadout;
- skeleton-like equipment model for visible artifacts and inventory.

The first version can be simpler, but should avoid blocking future equipment/loadout expansion.

## 12.9. Item Types

Shop/inventory items can include:

- cosmetics;
- artifacts;
- profile decorations;
- character items;
- hidden lore keys;
- functional unlocks.

Hidden lore keys are especially important for future integration with `/world`.

Example:

- buy/earn artifact;
- artifact unlocks hidden world information;
- hidden information may reveal secret location or document.

## 12.10. Rarity

Items can have rarity.

Rarity may largely correlate with price:

- more expensive items feel rarer;
- rarity can be used for presentation and unlock hierarchy.

Exact rarity taxonomy is open.

## 12.11. Trading And Gifting

Trading/gifting between players is not a current priority.

Avoid designing the first economy around item transfer.

## 12.12. Currencies And Reputation

Primary currency:

- eurodollars.

Other social/progression signals:

- likes;
- reputation.

Important reputation mechanic:

- each player has a weekly reputation allowance;
- current idea: 10 reputation points per week;
- players can spend reputation on other players' posts;
- players cannot spend reputation on themselves.

Purpose:

- reduce abuse;
- make reputation scarce;
- make reputation-giving feel intentional.

## 12.13. Earning

Eurodollars can be earned by:

- closing chapters;
- closing arcs;
- likes/reputation formulas if included;
- admin manual grants;
- events.

Reputation can be earned by:

- other players giving reputation on posts;
- admin grants.

Likes can be social signal and may contribute to stats.

The exact formulas remain open.

## 12.14. Shop

Shop should eventually live in one canonical place, likely:

- `/shop` inside shell.

Current `/world/shop` should be treated as temporary or conceptually reconsidered, because shop belongs closer to:

- player economy;
- profile;
- inventory;
- shell.

Guest:

- can see storefront.

Restricted:

- can also see storefront or locked purchasing state.

Approved player:

- can buy items automatically.

Purchases should generally be automatic, not admin-delivered.

Admin repair path is still needed for failures.

## 12.15. Profile Stats

Profile can show statistics such as:

- completed arcs;
- completed chapters;
- posts;
- likes;
- reputation;
- eurodollars earned;
- joined date.

Active arcs can also be shown.

Strong future idea:

- player/character arcs can become a chronological chain/list by in-world dates.

This would connect profile identity to the living history of the character.

## 12.16. Public Character Access

Public profile should expose approved character information through a clear card/button.

It should not necessarily redirect to `/characters/[id]`.

Preferred:

- character info opens from profile context;
- long-term routing may become `/profile/characters` or an embedded profile character view.

## 12.17. Privacy

Players may eventually control which profile sections are public.

Potential privacy-controlled areas:

- inventory;
- activity;
- arcs;
- stats;
- profile details.

Future artifact idea:

- some shop artifacts may allow viewing otherwise locked/hidden profile sections.

This must be handled carefully because it can conflict with privacy expectations.

## 12.18. Locked Sections

Restricted users should see locked sections as intentional system surfaces.

They should communicate:

- this exists;
- you cannot use it yet;
- approved character required.

Locked sections should not feel like missing content or bugs.

## 12.19. Critical Failure Risks

The system must avoid:

- lost purchase;
- incorrect balance;
- item bought but not appearing;
- cosmetic breaking profile layout;
- private information becoming public;
- incorrect reputation allowance;
- self-reputation abuse;
- mismatched character/account display;
- shop unlocks not applying.

## 12.20. Open Decisions

- Exact cosmetic categories for v1.
- Whether profile appearance is mostly account-level or character-level.
- Exact inventory/equipment model.
- Whether rarity uses names like common/rare/legendary or a more in-world taxonomy.
- Exact eurodollar reward formula.
- Exact reputation allowance reset schedule and UI.
- Whether restricted users can see shop prices or only item previews.
- How and when `/world/shop` becomes `/shop`.
- Privacy rules for public profile sections.
- Whether artifacts can reveal locked profile sections and how consent/privacy is protected.

---

## 13. Page Group Specification: Pager, Notifications And Inbox

Covered pages:

- `/pager`;
- `/notifications`;
- future unified inbox;
- private messages;
- mentions;
- system alerts;
- admin messages;
- approval updates;
- shop deliveries;
- reward receipts;
- arc invites.

## 13.1. Product Role

Pager should become the unified communication layer of the system.

It is a mix of:

- messenger;
- system inbox;
- notification center;
- city service delivery channel;
- account-level communication device.

Pager should not feel like a generic website notification list.

It should feel like an in-world communication device tied to the city/system.

## 13.2. Identity

Pager belongs to the account / `@username`.

Messages are sent and received as account/player identity, not character identity.

Current canon:

- forum uses `@username`;
- pager uses `@username`;
- arcs use character identity.

No separate in-world character-message mode is needed for now.

## 13.3. Unified Notifications Direction

`/notifications` should likely become part of pager over time.

Preferred direction:

- one unified pager/inbox surface;
- one unread system;
- notification-like events appear as pager entries;
- users do not need to check two parallel inboxes.

Open implementation detail:

- `/notifications` may remain as compatibility route or lightweight redirect later.

## 13.4. Message Types

Pager should eventually receive:

- private messages;
- system alerts;
- admin messages;
- character approval updates;
- moderator comments;
- mentions;
- shop deliveries;
- reward summaries;
- eurodollar receipts;
- arc invites;
- system maintenance notices;
- city/service style notices.

## 13.5. Mentions

Forum mentions can appear in pager as forwarded mention entries.

Purpose:

- user sees they were tagged;
- user can quickly jump to the relevant forum thread/post.

This makes pager the practical center for user attention.

## 13.6. Arc Invites

Arc invites should arrive in pager.

Invite entries should clearly show:

- who invited the user;
- which arc;
- role or access offered;
- accept/decline action if applicable.

## 13.7. Rewards And Shop Deliveries

Reward/eurodollar events should arrive as system receipts.

Shop purchases should arrive as delivery messages.

Tone:

- official receipt;
- city service delivery;
- system confirmation;
- not a generic ecommerce email.

## 13.8. Character Application Updates

Application status updates should arrive in pager:

- pending review confirmation;
- returned for edits;
- moderator comments;
- approved;
- rejected.

This reinforces pager as the official system communication channel.

## 13.9. Access Model

Guest:

- may see pager as a locked feature.

Registered / restricted user:

- can access system inbox and notifications;
- can receive application updates;
- can receive system messages;
- should not have full DM capability with other players yet.

Approved player:

- can use full pager messaging where enabled;
- can receive invites, rewards, delivery messages and player communication.

Admin/moderator:

- can send system/admin messages according to permissions.

## 13.10. Realtime Model

Pager should feel like a normal messenger/inbox, but should not become the main place where users endlessly chat.

Preferred behavior:

- periodic updates are enough initially;
- unread badge updates reliably;
- system feels alive;
- full instant messaging pressure is not required.

Presence can exist globally and reflect inside pager.

Typing indicators are not required.

## 13.11. Features Not Needed Initially

Not needed for first mature version:

- group chats;
- attachments/images;
- message reactions;
- typing indicators;
- complex chat rooms.

Focus first on:

- reliable delivery;
- unread state;
- direct messages if enabled;
- system messages;
- invites;
- receipts.

## 13.12. Visual Tone

Pager should have strong atmospheric treatment.

It can feel like:

- personal city device;
- official communications terminal;
- civic services inbox;
- insurance/company notice stream;
- housing authority / district office / municipal system dispatch;
- corporate and government service messages from inside the world.

Important:

- it should feel like real messages inside the city;
- not decorative fake cyberpunk;
- not a generic chat UI.

## 13.13. Message Persistence

System messages may need to remain accessible as receipts/archive.

This is especially important for:

- purchases;
- rewards;
- approval decisions;
- moderator comments;
- invites;
- admin actions.

Open decision:

- whether users can delete system receipts or only archive/hide them.

## 13.14. User Controls

Users should likely be able to:

- delete personal messages;
- archive/hide messages;
- mark as read/unread.

For official system messages, deletion should be considered carefully because they may function as receipts.

## 13.15. Important Message Presentation

Important system messages should look like official in-world notices.

Examples:

- approval: civic registration / access level notice;
- rejection/returned edits: application office notice with moderator comments;
- reward: payment receipt;
- purchase: delivery confirmation;
- invite: access request to an arc;
- maintenance: system service notice.

## 13.16. Critical Failure Risks

Pager must avoid:

- lost message;
- invite not delivered;
- reward applied but no receipt;
- purchase completed but no delivery notice;
- unread badge out of sync;
- private message becoming public;
- moderator feedback not appearing;
- duplicated/confusing system messages;
- notification split across two competing places.

## 13.17. Open Decisions

- Whether `/notifications` redirects into `/pager` or remains a secondary route.
- Whether restricted users can send any DMs or only receive system messages.
- Exact unread model for unified pager.
- Whether system receipts can be deleted or only archived.
- Exact visual taxonomy for official city/service notices.
- Whether private DMs ship in the first pager version or after system inbox foundation.

---

## 14. Page Group Specification: Admin, Moderation And Operations

Covered pages:

- `/admin`;
- `/admin/characters`;
- `/admin/characters/[id]`;
- `/admin/reports`;
- `/admin/wallet`;
- `/admin/shop`;
- news publishing tools;
- moderation operations;
- manual repair operations.

## 14.1. Product Role

Admin is the operational back office of the project.

Unlike public/player surfaces, admin does not need to preserve the same atmosphere.

Priority order:

1. practicality;
2. clarity;
3. speed;
4. safety;
5. traceability where needed.

Admin should feel like a useful internal panel, not a decorative in-world interface.

## 14.2. Admin / Moderator Identity

Admin/moderator can be understood as:

- technical admins;
- game masters;
- city/system operators;
- community moderators.

Admins and moderators may also have their own characters and play normally.

## 14.3. Roles

Initial roles:

- admin;
- moderator.

Possible future role:

- news editor, for trusted users who only publish forum/news content.

Avoid overbuilding role hierarchy before the operational need is real.

## 14.4. `/admin`

`/admin` should be both:

- task dashboard;
- navigation list of admin tools.

Useful dashboard queues:

- pending characters;
- reports;
- economy issues;
- shop/delivery failures;
- news drafts;
- support/help requests if surfaced from forum.

The first version can be simple, but the page should eventually show what needs attention.

## 14.5. Character Review

`/admin/characters/[id]` should let moderator read and review the full character application.

Moderator needs to:

- read the whole application;
- approve;
- reject;
- return for edits;
- leave general comment;
- request clarification;
- comment on specific problematic parts.

`assign reviewer` is not required.

## 14.6. Character Review Diff

It would be useful to compare versions after edits.

Reason:

- moderator should not need to reread the entire application every time;
- reviewer can quickly see what changed;
- returned-for-edits loop becomes much faster.

This can be a later improvement after the basic review loop is stable.

## 14.7. Span-Level Comments

Span-level commenting/highlighting on character applications is a strong future feature.

Desired behavior:

- moderator highlights a text fragment;
- attaches a comment explaining what is wrong or what should be changed;
- user sees highlighted feedback when editing.

This is high-value but not required for the first working review system.

## 14.8. Reports

Users may eventually report:

- forum posts;
- arc posts;
- profiles;
- DMs;
- characters;
- shop/economy issues.

For now, reports do not need a complex moderation queue.

Minimum report statuses:

- open;
- closed.

`/admin/reports` should be simple but usable:

- list open reports;
- inspect target;
- take moderation action;
- close report.

## 14.9. Moderation Actions

Needed moderation actions:

- hide post;
- delete post;
- lock thread;
- archive thread;
- warn user;
- suspend user;
- ban user.

Audit log is not required immediately, though some destructive actions may still need basic records later.

## 14.10. Wallet / Economy Operations

`/admin/wallet` should support manual correction.

Needed operations:

- add eurodollars;
- subtract eurodollars;
- add reputation;
- correct purchase-related state;
- view relevant history where available.

Manual economy changes can send pager receipts.

Reason:

- user understands why balance changed;
- admin repair is visible;
- support cases become easier to resolve.

## 14.11. Shop Admin

`/admin/shop` should support:

- create item;
- edit item;
- change price;
- set rarity;
- set visibility;
- set unlock requirement;
- configure hidden lore key behavior later.

Admins should also be able to manually grant a shop item to a player without purchase.

Reason:

- repair failed purchase;
- grant event rewards;
- compensate user manually.

## 14.12. News Publishing

News should be created inside the relevant news/broadcast channels.

Needed content types:

- public news;
- player-only news;
- devlog;
- maintenance.

News drafts are useful.

Scheduling is not required for now.

Public and player-only news should be distinct.

## 14.13. Support

Support/help requests should remain forum-based for now.

Possible future:

- support requests surface in admin dashboard;
- support queue if volume becomes high.

Do not create a separate heavy support system before forum support patterns are proven.

## 14.14. Dangerous Actions

Dangerous admin actions should likely require confirmation.

Candidate actions:

- ban/suspend user;
- delete/hide major content;
- subtract eurodollars;
- manually grant expensive item;
- approve/reject character;
- close report after action;
- archive active thread.

Exact confirmation rules remain open.

## 14.15. Critical Failure Risks

Admin/operations must avoid:

- accidentally granting money;
- accidentally subtracting money;
- losing a report;
- approving the wrong character;
- rejecting/returning with missing feedback;
- deleting/hiding post without clarity;
- granting item to wrong user;
- failed repair without user-visible receipt;
- publishing player-only news publicly;
- losing news draft.

## 14.16. Open Decisions

- Whether moderation actions need a lightweight audit log later.
- Exact dangerous-action confirmation rules.
- Whether support reports become admin dashboard items or stay purely forum-based.
- When to add character application version diff.
- When to add span-level moderator comments.
- Whether news editor role becomes separate from moderator/admin.

---

## 15. Page Group Specification: Shell, Navigation And Global Experience

Covered surfaces:

- shell layout;
- terminal background;
- global navigation;
- `/me`;
- `/users`;
- `/archive`;
- locked states;
- global search;
- presence;
- pager/unread badge;
- mobile behavior;
- empty/error/loading states.

## 15.1. Product Role

Shell is the main program of the project after login.

It should feel like:

- an internal system;
- a fast application;
- a portal into the fictional world;
- the main place where user lives after entering.

The user should not feel like they are jumping between old forum pages.

## 15.2. Terminal Layer

Terminal background is not only atmosphere.

It can become a future functional layer because it spans the full screen.

Possible future functions:

- request system information;
- search/query system data;
- trigger artifact-enabled utilities;
- display ambient city/system signals;
- act as a deeper command layer behind shell.

First priority remains atmosphere and identity, but architecture should not block future functionality.

## 15.3. Post-Login Location

After login and verification, user should generally enter shell.

Outside-shell surfaces remain:

- `/`;
- `/world`;
- auth pages;
- possibly character/application pages until fully integrated;
- other special public/fullscreen surfaces if needed.

## 15.4. Restricted User Navigation

Restricted user navigation should include:

- forum;
- users;
- profile;
- arcs as preview/showcase;
- shop as storefront/locked purchasing surface.

Restricted user should feel they are inside the system, but with incomplete access.

## 15.5. Approved Player Navigation

Approved player navigation should include:

- forum;
- arcs;
- pager;
- users;
- profile;
- shop;
- relevant player systems.

For approved players, normal main navigation should not contain locked primary sections by default.

Some optional or artifact-gated features may still be locked later.

## 15.6. `/me`

`/me` may be merged into `/profile`.

Preferred direction:

- avoid duplicate personal-profile surfaces;
- make `/profile` the canonical current-user profile/dashboard.

## 15.7. `/users`

`/users` should be more than a flat user list.

It should become:

- player/user directory;
- presence board;
- quick profile preview surface;
- quick link surface for pager actions.

Possible actions:

- open public profile;
- see online/presence state;
- write in pager if allowed;
- preview profile/character basics.

Guest may be allowed to view `/users`, likely in a limited public form.

## 15.8. `/archive`

`/archive` remains conceptually open.

Possible meanings:

- completed arcs archive;
- old threads archive;
- document archive;
- world/system archive;
- player history archive.

This needs a separate decision before significant implementation.

Do not let `/archive` become a vague dump for unrelated content.

## 15.9. Global Search

Global search is an ideal future feature, but should not be implemented casually.

It must be:

- high-quality;
- access-aware;
- not resource-wasteful;
- reliable across forum/arcs/world/users if scoped that broadly.

Strong product idea:

- global search can be unlocked after approved player buys a first neuralink chip or similar artifact;
- after purchase, shell gains the search capability as an artifact-enabled feature.

This ties functionality to game progression and shop/economy.

## 15.10. Locked Pages

Locked pages should use a mix of:

- teasing preview;
- clear required access;
- system-style blocked state;
- explanation of how to unlock.

They should not feel like accidental errors.

## 15.11. 404 / 403

404/403 pages can be minimal.

Possible treatment:

- inaccessible section;
- black screen/black veil;
- system block;
- restrained copy.

Do not overbuild these before core pages are strong.

## 15.12. Header Signals

Shell header may show:

- access level;
- presence/online state;
- pager unread count;
- restricted-character warning/badge.

Presence can later integrate with artifacts.

Example:

- player can buy an item/artifact that enables invisible mode.

## 15.13. Main Shell Home

The main shell home is currently undecided.

Candidate equal surfaces:

- `/forum`;
- `/profile`;
- `/arcs`.

Because these are all important, avoid forcing a dashboard until the product has enough real signals to make a dashboard useful.

Possible interim:

- send newly verified users to `/profile`;
- let normal navigation treat forum/arcs/profile as primary peers.

## 15.14. Speed And Navigation Feel

Shell must feel fast and seamless.

Goal:

- minimal sense of page reload;
- fast section switches;
- stable shell geometry;
- no old-forum navigation feel.

This is part of the product identity, not just performance polish.

## 15.15. Mobile Behavior

Mobile version should be readable and supportive.

It does not need to be the peak/full experience at first.

Priority:

- important pages readable;
- navigation usable;
- writing not broken;
- no layout overflow;
- profile/forum/arcs usable enough.

## 15.16. Empty States

Empty states are the screens shown when a section has no content yet.

Examples:

- no arcs;
- no messages;
- no threads;
- no character;
- no shop items;
- no reports;
- no notifications.

They should:

- explain what is missing;
- give a next action where appropriate;
- preserve atmosphere lightly;
- not look like broken pages.

For restricted users, empty states often overlap with locked states.

## 15.17. Loading States

Loading states are not fully decided.

Possible options:

- strict skeletons for data-heavy lists;
- minimal terminal/system loading copy;
- simple spinners only where acceptable.

Rule:

- loading should not damage the feeling of a precise system;
- avoid playful/generic web loaders.

## 15.18. Restricted Global Signal

Restricted users should have a clear global signal that they do not yet have an approved character.

Possible surfaces:

- header badge;
- profile banner;
- locked arcs/shop actions;
- forum locked-section hints.

This should be visible but not annoying.

## 15.19. Desired User Feeling

After ten minutes inside shell, user should feel:

- this is a unique system;
- this is not a familiar old RP forum format;
- the product feels like an atmospheric, mysterious program;
- shell is a portal into a fictional world;
- deeper access and functionality exist inside.

## 15.20. Open Decisions

- Whether terminal becomes a real command/query interface and when.
- Exact restricted and approved navigation items for v1.
- Whether `/users` is public to guests and how limited it is.
- Final product meaning of `/archive`.
- Whether neuralink/artifact-unlocked global search becomes canon.
- Exact locked-page visual language.
- Whether access level appears permanently in shell header.
- Whether invisible mode is an artifact, setting, or both.
- Final main shell home strategy.
- Loading state visual language.
