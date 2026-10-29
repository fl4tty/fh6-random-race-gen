# Forza Horizon 6 Random Race Generator — How-To

A single-page app for Forza Horizon 6 that rolls a random race (car type, class, race type and track), shows which car types suit which races, lists every car in each type, and pins every track on the official FH6 map.

## Getting started

1. Keep these two files together in the same folder:
   - `fh6-random-race-gen.html` (the app)
   - `fh6-map.jpg` (the map image)
2. Double-click `fh6-random-race-gen.html` to open it in your browser. No install or internet connection is needed, except for the fonts. If `fh6-map.jpg` is missing, the app tries to load the map from forza.net instead.

## Rolling a random race

1. Click **🎲 Random race**. The **Your selection** summary at the top always shows your current **Car Type**, **Class**, **Race Type** and **Track** ("Any" where nothing is picked yet).
2. After the first roll the button changes to **🎲 Reroll**. To keep part of the race, click the padlock on that card in the summary (it lights up), then click **🎲 Reroll**. Kept cards stay; everything else rolls again. Click the padlock again to let it change.
   - Keeping the track also keeps its race type, since the track decides it. Letting the race type change lets the track change too.
3. You can also pick things yourself first: click a car type, race type, class or track, then click **🎲 Random race**. Anything you picked is kept automatically, and the rest is filled in to match:
   - A car type only gets a race type it's suited to.
   - A class is only picked from the classes that car type can run in.
   - The track always comes from the chosen race type.
4. Click **Clear all** to start over, or use the small **clear** link next to any one group.

On a phone, **🎲 Random race** and **Clear** stay pinned to the bottom of the screen.

## Browsing on your own

- **Choose buttons (left side)**: **Race type**, **Car type**, **Class**, **Track** and **Map** each show your current pick. Click one to open it in the main area. Any number can be open at once, stacked in that order, so you can see everything you've picked together. Click the button again or **✕ Close** to close it. The page always starts with only the **Map** open. **Clear** in a list clears just that choice.
- **Highlights**: after **🎲 Random race**, the Race type, Car type, Class and Track lists open with your picks highlighted. The same rule applies in every list: your pick is **solid orange with a ✓**, and options that go with your other picks (car types that fit your race type, race types that suit your car type, classes your car type comes in) are **outlined in blue**. Kept cards in the summary get the same orange, a bar on their left edge and a closed padlock; open menu buttons get a bar on their left edge and a ▾ arrow. The colors and these shapes are chosen to stay clear for color-blind players.
- **Car type**: picking one lists all of its cars, with each one's starting class, at the bottom of the Car type list. Car types are grouped into **Modern**, **Retro**, **Classic**, **Track & Racing** and **Offroad & Utility**.
- **Race type**: picking one outlines the car types that fit it in the Car type list.
- **Class**: filters the car list to cars that start in that class and highlights the car types that come in it. If no car in the type starts in that class (it's only reachable by upgrading), the list shows all of the type's cars instead.
- **Search a car**: type a year, make or model, then pick a result. The app jumps to that car's type and class.

### Forza Edition cars

Forza Edition cars have their own **Forza Edition** type. Click any car in that list (or search for one) to see its usual car type and the races and tracks that type runs on.

## Tracks and the map

- **Track** opens the list of every track, grouped by race type (just one race type's tracks once you've picked a race type). Click a track to select it and jump to it on the map. Picking a track keeps your car type; if that car type isn't usually raced on that kind of track, the Track list shows a heads-up.
- **Map** (button on the left; open by default) shows the official FH6 map with every track as an icon for its race type. When it opens, it centres on your selected track.
  - **Drag** to pan. **Scroll, pinch or double-click** to zoom. Use **+ / − / ⤢** for zoom in, zoom out and fit-to-screen.
  - **Hover** over an icon for the track name. **Click** an icon to select that track.
  - Choosing a race type shows only that discipline's tracks on the map.
  - The side panel shows the selected track's area and has links to its exact spot on **MapMaster** and to the **GamerGuides** map.

### Fixing a pin

All 86 tracks already have positions from fan-made map data. If one is off:

1. Select the track, then click **Adjust pin** (or **Pin exact spot**).
2. Click the right spot on the map. Press **Esc** to cancel.
3. To undo your change, click **Reset to map data**.

Your pins are saved in this browser only. Use **Back up pins** to save them to a `.json` file, and **Restore pins** to load that file in another browser or after clearing browser data.

## Reference

**Classes**, lowest to highest: D, C, B, A, S1, S2, R, X. No car starts in Class X; it's only reachable by upgrading.

**Race types:**

| Race type | Car types it suits |
|---|---|
| Street | Muscle, hot hatches, sports cars, super saloons, supercars, hypercars, GT cars, racers, rare classics, cult cars, eclectic domestics, rods & customs, utility heroes, track toys, drift cars |
| Road | Supercars, hypercars, GT cars, track toys, racers, rare classics, sports cars, super saloons, modern muscle, super hot hatches |
| Touge | Sports cars, hot hatches, rally cars, track toys, drift cars, eclectic domestics |
| Drag | Muscle, rods & customs, hypercars, modern supercars, Super GT, extreme track toys, modern super saloons, retro sports cars, pickups & 4x4s |
| Dirt | Rally cars, pickups & 4x4s, UTVs, buggies, offroad, SUVs, retro hot hatches, eclectic domestics, cult cars |
| Cross Country | Buggies, offroad, pickups & 4x4s, UTVs, SUVs, utility heroes, rally cars |
| Drift Attack | Drift cars (Shimanoyama Circuit only) |

Forza Edition cars suit every race type. FH6 itself lets any car enter any race (only class caps apply), so these pairings follow guide recommendations by surface; every car type has at least two race types.

The app has 38 car types, 658 cars, 7 race types and 86 tracks (up to date through Series 6, Oct 2026).

## Keeping the data up to date

All the app's data is built into `fh6-random-race-gen.html`, inside the `<script>` near the top:

| Block | What it holds | Source |
|---|---|---|
| `TYPE_TO_CARS` | Every car, grouped by type, with its starting class | `forza_horizon_6_car_list.csv` |
| `TYPE_CLASSES` | The classes each type can be raced in | `car_divisions.csv`, plus every car's starting class |
| `TYPE_RACE_MAP` | The race types each car type suits | FH6 car-type-to-race data |
| `TRACKS` / `BAKED_PINS` | Track names per race type, and their map positions | FH6 track list, FH6 Live Map fan data |

**When a new series adds cars:**

1. Add a row for each car to `forza_horizon_6_car_list.csv`. Columns: `Year,Make,Model,Type,TraditionalType,Class,Country`.
   - Use the car's official type and starting class from the [official FH6 car list](https://forza.net/fh6cars).
   - For a Forza Edition car, set `Type` to `Forza Edition` and put the car's official type in `TraditionalType`.
2. Rebuild `TYPE_TO_CARS` in the HTML and `fh6-car-types-to-cars.md` from the CSV. If FH6 adds a new car type, also add it to one of the groups in `TYPE_GROUPS` (until then it shows under "Other").
3. If a new car starts in a class its type doesn't have yet, add that class to the type in `TYPE_CLASSES`.

Claude can do all three steps: just ask it to "check for new FH6 cars".

## Files in this folder

| File | What it is |
|---|---|
| `fh6-random-race-gen.html` | The app |
| `fh6-map.jpg` | Official FH6 map image used by the app |
| `forza_horizon_6_car_list.csv` | Master car list (year, make, model, type, class, country) |
| `fh6-car-types-to-cars.md` | Readable list of every car, grouped by type |
| `car_divisions.csv`, `fh6-car-type-class-ranges.csv` | Original class-range reference data |

Map image © Playground Games / Microsoft. Track positions come from the FH6 Live Map fan project. The race-type icons were drawn for this app.
