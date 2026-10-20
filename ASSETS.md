# Бриф на арт для «Бензака»

Положите готовые PNG в папку `assets/` **с точными именами из таблицы** и пересоберите игру
(`python3 build.py`) — или просто отдайте мне файлы, соберу сам.
Чего нет в папке, игра рисует запасной заглушкой, поэтому можно подключать арт по частям.

> **Актуально (20.10.2026).** Ниже — исходный бриф; часть пунктов устарела. Что действует сейчас:
> - **Размеры:** текстуры 256 px на клетку, в мире клетка = 180 px (`CELL` в `game.js`); землю карт рисуем 1536 × 2560.
> - **Карты — слоистые.** `map.jpg`, `map_dunes.jpg`, `map_city.jpg` — *только земля* (дорога с кромкой и плиты под площадки, без предметов и построек);
>   всё остальное — отдельные спрайты в `assets/props/<набор>_<N>.png` (`wasteland_1..9`, `dunes_1..9`, `city_1..11`), которые игра расставляет по свободным клеткам (`decor` в `MAPS`) с тенями и анимацией.
> - **Площадки:** `slot_wasteland.png`, `slot_dunes.png`, `slot_city.png` (низкий профиль, тонкий круг-маркер); `slot.png` — запасная.
> - **Интерфейс:** иконки `ui_scrap|fuel|skull|air|rep|emp|ff|snd|star.png` (≈128 px), текстура панелей `ui_panel.jpg` (512 px, повторяется).
> - **Головы башен:** у пулемёта и огнемёта перерисованы (компактные: круглый корпус, короткие толстые стволы; ось вращения в центре кадра). Старые — в `assets_old/heads_v1/`.
> - **Червь:** `worm.png` (512 px, пасть сверху) — декор на «Дюнах».
> - **Музыка:** `music_battle.m4a`, `music_calm.m4a` (AAC, около 64 и 46 с); игра зацикливает их с перекрёстным затуханием.
> - **WebP:** рядом с каждым PNG/JPG лежит одноимённый `.webp` (`tools/to_webp.js`); игра грузит его первым и откатывается на PNG/JPG, `build.py` встраивает только WebP. При замене картинки обновите и `.webp` (список — `tools/webp_manifest.json`).
> - **Сюжет:** `story_0.webp`, `story_1.webp`, `story_2.webp` (вступления к картам) и `story_3.webp` (финал) — 1000 × 671, 3:2; исходники 2528 × 1696 в `assets_hf/story/`.
> - **Враги 20.10.2026:** `raider`, `biker`, `armor`, `shield`, `sniper`, `drone`, `medic`, `boss` перерисованы (Nano Banana Pro, референс — броневик, `cutout`, кадр ×2: например `armor` 716 × 460). Размеры на карте — `ART` в `game.js`.
> - **Эффекты:** `vfx_boom.webp` (взрыв в 6 кадров) и `vfx_flash.webp` (6 вспышек: звезда, шип, шар, конус, молния, пыльный выхлоп), по 1536 × 1030, сетка 3×2; чёрный фон, рисуются как ADD.
> - Как получать арт и собирать файлы: `tools/make_new_art.sh`, `tools/make_sprites.sh`; промпты и порядок работы с SYNTX — в `HANDOFF.md`.

## Общие правила (важно для единого стиля)

- **Вид строго сверху** (top-down, ортографически), без перспективы и без наклона камеры.
- **Свет падает слева-сверху** на всех картинках одинаково.
- **Прозрачный фон** (PNG с альфа-каналом), кроме `map.png`.
- **Без теней на земле** — тень игра добавляет сама.
- **Техника смотрит вправо** (носом по оси X →).
- **Один стиль:** рисованная (painterly) постапокалиптика: выцветший песок, ржавчина, грязно-оранжевый,
  вытертый металл, чёрная сажа. Без крови, без логотипов и узнаваемых машин известных франшиз.
- Объект по центру кадра, оставьте 5–8% прозрачного поля по краям.

## Размеры (1 клетка = 256 px)

| Файл | Размер, px | Что это |
|---|---|---|
| `map.png` | 1536 × 2560 | Вся карта (6×10 клеток), **без** площадок под башни |
| `slot.png` | 256 × 256 | Площадка под башню (металлическая плита) |
| `station.png` | 256 × 256 | Заправка: цистерна и колонка |
| `rubble.png` | 256 × 256 | Куча обломков на месте башни |
| `mg_base.png` / `mg_head.png` | 256 × 256 | Пулемёт: основание / вращающаяся часть |
| `fl_base.png` / `fl_head.png` | 256 × 256 | Огнемёт: основание / вращающаяся часть |
| `sp_base.png` / `sp_head.png` | 256 × 256 | Шипомёт: основание / вращающийся барабан |
| `gen_base.png` | 256 × 256 | Генератор (не вращается) |
| `raider.png` | 256 × 192 | Налётчик (багги) |
| `biker.png` | 205 × 128 | Байкер |
| `armor.png` | 307 × 230 | Броневик-таран |
| `boss.png` | 512 × 256 | Босс «Боевая фура» |

**Головы башен (`*_head.png`)** — отдельный слой, который крутится к цели:
рисуйте ствол/сопло **направленным вправо**, точка вращения — **центр картинки**.

## Дорога на карте

Карта — сетка 6×10 клеток. Дорога идёт змейкой (толщина ≈ 0,8 клетки, по центру клетки):

```
вход ↓ (кол.0, ряд 0)
ряд 1:  → слева направо (кол.0…5)
ряд 2:  вниз по кол.5
ряд 3:  ← справа налево
ряд 4:  вниз по кол.0
ряд 5:  → слева направо
ряд 6:  вниз по кол.5
ряд 7:  ← справа налево
ряд 8–9: вниз по кол.0 до заправки (кол.0, ряд 9)
```

Центры дороги в клетках (x, y): (0.5,0.5) → (0.5,1.5) → (5.5,1.5) → (5.5,3.5) → (0.5,3.5) →
(0.5,5.5) → (5.5,5.5) → (5.5,7.5) → (0.5,7.5) → (0.5,9.5).
Поверх карты игра кладёт 18 плит `slot.png` и заправку `station.png`, поэтому в этих клетках
фон должен быть спокойным (песок/камни), без важных деталей.
Свободные клетки: ряд 0 — кол.1…5; ряд 2 — кол.0…4; ряд 4 — кол.1…5; ряд 6 — кол.0…4;
ряды 8–9 — кол.1…5. Туда можно сажать декор: остовы машин, скелеты, колючку, шины, бочки.

## Промпты (английский, для Midjourney / DALL·E / Firefly / Flux)

**Общий префикс** — вставляйте перед каждым промптом:

> top-down orthographic view, hand-painted game asset, gritty post-apocalyptic wasteland,
> rusted scrap metal, weathered, desaturated sand and rust orange palette, soft top-left lighting,
> transparent background, no ground shadow, no text, no logos, centered

### Карта
> **Prefix** + vertical game map 6x10 grid, cracked desert wasteland seen from above, a winding dark asphalt road
> zigzagging horizontally across the map with a worn yellow center line, dusty sand, rocks, dead scrub,
> old tires and rusty barrels beside the road, matte painted, no buildings, no characters, no towers

### Площадка (`slot`)
> **Prefix** + square riveted steel plate pad, scratched, bolted corners, dark rust, hazard marks, flat base for a turret

### Заправка (`station`)
> **Prefix** + last gas station fuel tank, horizontal steel cylinder tank with ribs, small red fuel pump,
> concrete pad, warning stripes, patched metal

### Обломки (`rubble`)
> **Prefix** + pile of destroyed turret wreckage, twisted scrap metal, smoking, charred, embers, small flames

### Пулемёт
- `mg_base`: **Prefix** + round steel turret base with sandbags around, bolted ring, no gun
- `mg_head`: **Prefix** + twin heavy machine gun turret top, ammo box, barrels pointing right, no base

### Огнемёт
- `fl_base`: **Prefix** + round platform with two red fuel tanks and hazard stripes, pipes, no nozzle
- `fl_head`: **Prefix** + flamethrower nozzle on a swivel with hose, pointing right, no base

### Шипомёт
- `sp_base`: **Prefix** + dark round steel pedestal with launcher ring, no spikes
- `sp_head`: **Prefix** + round spiked drum made of scrap, eight long steel spikes radiating, bolted hub, centered

### Генератор
> **Prefix** + junkyard power generator box, green painted metal, copper coil, cooling fan, exhaust pipe,
> yellow lightning bolt decal, wires

### Техника (смотрит вправо)
- `raider`: **Prefix** + small scrap-built raider buggy facing right, roll cage, spiked bumper, big rear wheels,
  helmeted driver, rusty orange body
- `biker`: **Prefix** + raider motorcycle with rider facing right, red scarf trailing, jagged chopper frame
- `armor`: **Prefix** + heavy armored ramming truck facing right, bolted steel plates, wedge ram with warning
  stripes, side spikes, small slit window, six wheels
- `boss`: **Prefix** + giant war rig truck facing right, huge spiked trailer, red cab, chrome exhaust stacks,
  mounted flamethrower, skull emblem, scrap armor, menacing

## Советы по генерации

1. Сначала сделайте **один** эталон (например, `armor`) и повторяйте его стиль в остальных:
   в Midjourney — `--sref` ссылкой на эталон, в DALL·E/Firefly — «same style as the reference».
2. Вид сверху нейросети часто «заваливают» в изометрию. Добавляйте `flat top-down, 90 degree camera angle, plan view`.
3. Фон убирайте в Photoshop/Photopea/remove.bg. Для `*_head` отрежьте основание.
4. Если картинка получилась большой — это нормально, игра масштабирует. Главное — пропорции из таблицы.

## Как подключить

```bash
python3 build.py            # соберёт ../Benzak.html (один файл, работает по двойному клику)
```

## Уровни башен (необязательный арт)

У башен 3 уровня. Если положить в `assets/` файлы ниже, игра покажет их вместо базовых; если файла нет —
берётся обычный спрайт, голова чуть крупнее и над башней рисуются золотые шевроны (ур.2 — один, ур.3 — два).
Размер и правила те же, что у базовых (256 × 256, прозрачный фон, голова смотрит вправо, вращение вокруг центра).

| Файлы | Что нарисовать |
|---|---|
| `mg_base2.png`, `mg_head2.png`, `mg_base3.png`, `mg_head3.png` | Пулемёт: ур.2 — броневые щитки, спаренные стволы длиннее; ур.3 — тяжёлый кожух, 3 ствола, патронная лента |
| `fl_base2.png`, `fl_head2.png`, `fl_base3.png`, `fl_head3.png` | Огнемёт: ур.2 — 3 баллона, толстый шланг; ур.3 — большое сопло, броня, форсунки |
| `sp_base2.png`, `sp_head2.png`, `sp_base3.png`, `sp_head3.png` | Шипомёт: ур.2 — шипы длиннее, тёмный барабан; ур.3 — двойное кольцо шипов, усиленная ступица |
| `gen_base2.png`, `gen_base3.png` | Генератор: ур.2 — больше катушек, второй вентилятор; ур.3 — две катушки, антенна, молния ярче |

Прирост характеристик по уровням: см. `LV` в начале `game.js` (урон, скорострельность, дальность, замедление).


## Кампания (актуально)

Три карты идут друг за другом: Пустошь → Дюны → Руины города. Победа на карте открывает следующую.

| Файл | Что это |
|---|---|
| `map.jpg`, `map_dunes.jpg`, `map_city.jpg` | Арт карт, 1536 × 2560, дорога строго по `MAPS[i].WP` в `game.js` |
| `shield.png` (307 × 230) | Щитовик: пули и шипы бьют вполовину слабее, огонь — полностью |
| `sniper.png` (288 × 216) | Штурмовик: останавливается и стреляет по башням издалека |

Если нужна новая карта: добавьте запись в `MAPS`, нарисуйте схему `tools/guide.swift`, перекрасьте и положите `map_<имя>.jpg`.

## Ветки 3-го уровня и новые юниты

| Файл | Что это |
|---|---|
| `mg_head3a/3b`, `fl_head3a/3b`, `sp_head3a/3b` (.png, 256×256) | Голова башни с выбранной веткой A или B (ось вращения в центре) |
| `tes_base`, `tes_head`, `mor_base`, `mor_head` (256×256) | Тесла и миномёт |
| `drone` (192×192), `medic` (288×216) | Дрон и лекарь |
