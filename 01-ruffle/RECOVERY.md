# Xorex recovery

Original game by Adam M. Smith, released on Kongregate in September 2009.
Recovered October 29, 2026. No game code was modified for resurrection.
Subproject 02 subsequently added separate decompilation and inspection.

Source page: https://www.kongregate.com/games/rndmcnlly/xorex

The original executable and external assets were downloaded from:
https://chat.kongregate.com/gamez/0005/7732/live/

Executable: `Xorex.swf?kongregate_game_version=1253647744`
SHA-256: `53514361d3f332e24000a54fad39ec554f289e583b3cab061cb64633621bbbb7`

External assets: `art/structies.swf`, `art/termination.swf`, and all eight MP3s in `sound/`.

Run `python3 -m http.server 8765 --bind 127.0.0.1` here and open
http://127.0.0.1:8765/ in a browser. The wrapper loads Ruffle from unpkg,
so the emulator itself currently requires an internet connection.

Startup may take roughly 15 seconds while the defunct MochiAds requests time out.
Ruffle blocks those obsolete ad hosts. The game then starts automatically.
Verified that the original ship and advancing colored gems render in Ruffle.
Keyboard gameplay and audio output still need human verification.

Background fidelity: the original webpage's `bgcolor` parameter and the SWF's
SetBackgroundColor tag both specify `#404040`. The wrapper uses this same color.
An initial black override was incorrect and concealed dark artwork.

Controls: left/right move; DOWN collects/converts; UP replaces/fires.
The game's own instruction screen and recovered code resolve the old listing's
ambiguous wording. Click the game to focus keyboard input.
