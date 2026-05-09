# NindTest: Youtube player based Blind-test

Automatic blind test using youtube video and Iframe API

Try it at : https://natngs.github.io/Blindtest/

-----

## Playlist format

To import songs into the app to be played, you'll need a file in .tsv format

### Simple list

A simple list with only video urls or ids, one by line, will work.\
Every video will start at 00:00, play until the end, display no clue, and display as the answer the youtube video title. Example:

```txt
ucZl6vQ_8Uo
mVg_l2Fbw6U
```

### Advanced list

For more settings, the TSV (**T**abulation **S**eparated **V**alues) list file may be formatted as follow:

```tsv
## Video ##	Answer	Clue	Begins	Ends
ucZl6vQ_8Uo	The answer	A clue	00:00	01:03
mVg_l2Fbw6U	TEST 2	00:00:05	01:30
```
(note that the space between `## Video ##` and `Answer` is a tabulation and not a space; same betwen `Answer` and `Clue` etc. Copy this text in a text editor and use the option to display special characters to see them)


Each line of the file is one unique video to be played. Each line is formatted like this:
- First, the video url (https://www.youtube.com/watch?v=xxxx or https://youtu.be/xxxx) or youtube id (11 char)
- Then a tab, followed by the Answer text to be shown after 30s listening time
	- If blank, will display the Youtube video title as the answer
- Then another tab, followed by the Clue text to be shown during the blind listening time (may also be let blank)
- Then another tab, followed by the timestamp when to start the video
	- Accepted formats: 
		- `92` (seconds since the video starts)
		- `92.12` (same, with miliseconds precision)
		- `01:32` (minutes:seconds)
		- `01:32.12` (minutes:seconds.miliseconds)
		- `00:01:32` (hours:minutes:seconds)
		- `00:01:32.12` (hours:minutes:seconds.miliseconds)
	- If blank, zero or invalid (after video ends or wrong format): Will start the video at the beginning
- Then another tab character, followed by the timestamp when to automatically skip the song to the next one
	- Same formats supported as start timestamp
	- If invalid, zero or blank, will play the song till the end
	- Precision: this is the timestamp in the video, not the duration of the sample to play. If start timestamp has been set for example to `01:32` and end timestamp to `03:38`, video will play from 01:32 to 03:38 (total play duration = 03:38 - 01:32 = 02:06)

Header line (`## Video ## ...`) is not necessary, and comments (any row beginning with invalid youtube URL or id, or starting with #) are possible and will be ignored.

Columns order cannot be swapped. Any value can be let blank, but tabs characters must be added to distinguish columns, for example:

```txt
## Video ## <tab> Answer     <tab> Clue   <tab> Begins   <tab> Ends
ucZl6vQ_8Uo <tab> The answer <tab>        <tab>          <tab> 01:03
mVg_l2Fbw6U <tab>            <tab> A clue <tab> 00:00:05
```


### JSON mode (old)

The app may also accept JSON formatted playlist (for backwards compatibility).\
This json should be formatted like following:

```json
[
	{
		"id":"ucZl6vQ_8Uo",
		"start":0,
		"end":63,
		"name":"A clue",
		"title":"The answer"
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
- title: Title to be shown after the blind duration (if not set, will display the video title)

-----

## Features 

- Pre load videos to check if they are ok to be watched

## TODO

- Improve menu style
- refactor so that not everything is in the main.js
- Use async/await instead of timeouts
