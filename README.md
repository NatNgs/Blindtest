# Automatic youtube Blind-test

Automatic blind test using youtube video and Iframe API

Try it at : https://natngs.github.io/Blindtest/

## JSON list

The app will ask for a JSON list of the songs to play.
This json should be formatted like following, and pasted in the pop-up at application start.
If you need to change the list, or the list failed to load: refresh the page (F5), and paste another JSON string in the field.

```json
[
	{
		"id":"ucZl6vQ_8Uo",
		"start":0,
		"end":63,
		"name":"TEST 1"
	},{
		"id":"mVg_l2Fbw6U",
		"start":5,
		"end":90,
		"name":"TEST 2"
	}
]
```

- id: Youtube id of the song (example: https://www.youtube.com/watch?v=ucZl6vQ_8Uo id is ucZl6vQ_8Uo (after "v=" in the url))
- start: Where to start the video (in seconds since the video beginning)
- end: Where to automatically skip to the next music (in seconds since the video beginning)
- name: Information shown when the song is being played hidden (will be replaced by the Youtube video title after 30s)
