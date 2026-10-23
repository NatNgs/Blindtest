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
## Video ##	Artist	Title
ucZl6vQ_8Uo	TheArtist	The song name
mVg_l2Fbw6U	Another artist	The second song name
```
(note that the space between `## Video ##` and `Artist` is a tabulation and not a space; same betwen `Artist` and `Title` etc. Copy this text in a text editor and use the option to display special characters to see them)


Each line of the file is one unique video to be played. Each line is formatted like this:
- First, the video id (from youtube url https://www.youtube.com/watch?v=xxxx or https://youtu.be/xxxx)
- Then a tab, followed by the Artist (may be left blank)
- Then a tab, followed by the Title
	- If blank, will display the Youtube video title as the answer

Header line (`## Video ## ...`) is not necessary, and comments (any row beginning with invalid youtube id) will be ignored.



## Technicalities

### Operation flow

On game start:
	- Init players on page load
	- When player click on start
		- Cue backPlayer
		- When backplayer is fully cued:
			- switch back and front players
			- play frontPlayer
			- asynchroneously call to prepare the next song
				- cue backPlayer

	- When counter is ended:
		- Check if backPlayer is cued
			- if not, and backPlayer is cleared (nothing being cued), send end of the game event, and stop here
			- if not, and backPlayer is cuing, wait for it to be cued
		- stop frontPlayer
		- switch back and front players
		- play frontPlayer


	- After GUESSING_TIME if backplayer didn't cue anything :
		- consider as a cuing error
	- When backplayer get cuing error :
		- cue another one, still in backplayer
	- If frontplayer get an error :
		- switch back and front players
