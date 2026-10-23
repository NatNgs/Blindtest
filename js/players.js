
function Players() {

	this.GUESSING_TIME = 20 // seconds
	this.AFTER_GUESSING_TIME = 10 // seconds
	this.frontPlayer = null
	this.backPlayer = null
	this.onEndGame = null
	this.onRequestingNextVideo = null
	let curtain = null
	let counterElement = null

	this.initPlayers = async function() {
		// Initialize UI elements
		curtain = document.getElementById('curtain')
		counterElement = document.getElementById('counter')

		this.frontPlayer = new YT.Player('player1', {
			height: '95%',
			width: '95%',
			videoId: '',
			events: {
				'onStateChange': onYouTubeEventStateChange,
				'onError': onYoutubeErrorEvent,
			},
			disablekb: 1,
			controls: 0,
			iv_load_policy: 3,
			rel: 0,
			origin: window.location.origin === 'null' ? window.location.href.split('#')[0] : window.location.origin,
		})
		this.backPlayer = new YT.Player('player2', {
			height: '95%',
			width: '95%',
			videoId: '',
			events: {
				'onStateChange': onYouTubeEventStateChange,
				'onError': onYoutubeErrorEvent,
			},
			disablekb: 1,
			controls: 0,
			iv_load_policy: 3,
			rel: 0,
			origin: window.location.origin === 'null' ? window.location.href.split('#')[0] : window.location.origin,
		})

		// Wait for both to be mutable
		await waitUntilTrue(() => this.frontPlayer.mute && this.backPlayer.mute)

		// Mute both
		this.frontPlayer.mute()
		this.backPlayer.mute()
	}


	function onYouTubeEventStateChange(evt) {
		// Check what player triggered the event, and call onFrontPlayerEventStateChange or onBackPlayerEventStateChange accordingly
		if(evt.target === this.frontPlayer && onFrontPlayerEventStateChange) {
			console.debug('FrontPlayer', evt.data)
			onFrontPlayerEventStateChange(evt)
		}
		if(evt.target === this.backPlayer && onBackPlayerEventStateChange) {
			console.debug('BackPlayer', evt.data)
			onBackPlayerEventStateChange(evt)
		}
	}
	function onYoutubeErrorEvent(evt) {
		/**
		 * errCodes:
		 * 2 – The request contains an invalid parameter value. For example, this error occurs if you specify a video ID that does not have 11 characters, or if the video ID contains invalid characters, such as exclamation points or asterisks.
		 * 5 – The requested content cannot be played in an HTML5 player or another error related to the HTML5 player has occurred.
		 * 100 – The video requested was not found. This error occurs when a video has been removed (for any reason) or has been marked as private.
		 * 101 – The owner of the requested video does not allow it to be played in embedded players.
		 * 150 – same as 101
		 */
		evt.target.errCode = evt.data
		switch(evt.data) {
			case 2: evt.target.errMessage = 'Invalid video id'; break
			case 5: evt.target.errMessage = 'Device cannot play this video'; break
			case 100: evt.target.errMessage = 'Video not found or removed'; break
			case 101:
			case 150:
				evt.target.errMessage = 'Video not found or not allowed outside Youtube'
				break
			case 153: evt.target.errMessage = 'Player settings error'; break
			default: evt.target.errMessage = 'Unknown error (code:' + evt.data + ')'
		}

		// Check what player triggered the event, and call onFrontPlayerEventStateChange or onBackPlayerEventStateChange accordingly
		if(evt.target === this.frontPlayer && onFrontPlayerEventError) onFrontPlayerEventError(evt)
		if(evt.target === this.backPlayer && onBackPlayerEventError) onBackPlayerEventError(evt)
	}
	let onFrontPlayerEventStateChange
	let onFrontPlayerEventError
	let onBackPlayerEventStateChange
	let onBackPlayerEventError

	this.queueNext = async function(vdata, ifError) {
		this.backPlayer.vdata = vdata

		this.onBackPlayerEventError = (evt) => {
			onBackPlayerEventError = null
			ifError(vdata, evt.data)
		}

		// Cue the first half-a-second to validate and get metadata
		this.backPlayer.cueVideoById({'videoId': vdata['id'], 'startSeconds': 0, 'endSeconds': 0.5})

		const hasBeenCued = await waitUntilTrue(() => this.backPlayer.getPlayerState() === YT.PlayerState.CUED || this.backPlayer.errMessage)
		if(!hasBeenCued) {
			ifError(vdata, this.backPlayer.errMessage)
			return
		}

		const vdataCurrent = this.backPlayer.getVideoData()

		// Check and fill title, author
		if (!vdata['title'] || !vdata['author']) {
			const [channel, title] = _extractTitleAndAuthor(vdata, vdataCurrent)
			if (channel && !vdata['author']) vdata['author'] = channel
			if (title && !vdata['title']) vdata['title'] = title
		}

		// Calculate _start and _end
		const duration = this.backPlayer.getDuration()
		let _start = 0
		let _end = duration - 7 // Ignore last 7s

		// Ensure we have enough time for the game phases
		const requiredTime = this.GUESSING_TIME + this.AFTER_GUESSING_TIME

		if (_end - _start > requiredTime) {
			// Pick a random start time allowing for the full game duration
			_start = Math.random() * (_end - requiredTime) + _start
			_end = _start + requiredTime
		} else {
			// Video is too short, just play from start
			_start = 0
			_end = duration
		}

		// Set metadata for counter
		vdata['_start'] = _start

		// Cue the video to the chosen _start for ready playback
		// We use cueVideoById again to position exactly where we want without playing yet
		this.backPlayer.cueVideoById({'videoId': vdata['id'], 'startSeconds': _start})

		// Note: The switchBackFrontPlayers logic expects the backPlayer to be in CUED state
		// before switching. This final cue keeps it in CUED state, ready for the switch.
	}

	this._updateCounter = async function() {
		const v = this.frontPlayer.vdata
		const seekTime = v['_start']
		const revealTime = seekTime + this.GUESSING_TIME
		const skipTime = revealTime + this.AFTER_GUESSING_TIME
		const currentTime = this.frontPlayer.getCurrentTime()

		// Fix possible desync (failed to skip beginning of the video)
		if(currentTime < seekTime - 1) {
			frontPlayer.seekTo(seekTime) // Will try to seek to requested start before next _updateCounter loop
		} else if(currentTime >= skipTime) {
			await this.switchBackFrontPlayers()
			return true
		} else if(currentTime >= revealTime) {
			curtain.style.display = 'none'
			counterElement.innerHTML = (v['author'] ? (v['author'] + '<br/>-<br/>') : '') + v['title']
			curtain.style['backdrop-filter'] = ''
		} else {
			const counter = revealTime - currentTime
			counterElement.innerText = ((counter+0.9)|0)

			if (counter <= 1) {
				curtain.style['backdrop-filter'] = 'blur(0) grayscale(0)'
			} else if (counter <= 6) {
				curtain.style['backdrop-filter'] = 'blur(' + ((counter-1) * 10) + 'px) grayscale(' + ((counter-1)*20) + '%)'
			} else {
				curtain.style['backdrop-filter'] = ''
			}
		}
		return false;
	}

	this.switchBackFrontPlayers = async function() {
		// If backPlayer is stopped : nothing more has been listed, do nothing
		if(this.backPlayer.getPlayerState() === YT.PlayerState.STOPED) return

		// If backPlayer is not cued: set event on backPlayer and run swithcBackFrontPlayer then
		if(!this.backPlayer.getPlayerState() !== YT.PlayerState.CUED) {
			onBackPlayerEventStateChange = (evt) => {
				if(evt.data === YT.PlayerState.CUED) {
					onBackPlayerEventStateChange = null
					this.switchBackFrontPlayers()
				}
			}
			return
		}

		// Stop frontPlayer
		this.frontPlayer.stopVideo()

		// Change z-index of backPlayer to 0, and frontPlayer to -1
		this.backPlayer.getIframe().style.zIndex(0)
		this.frontPlayer.getIframe().style.zIndex(-1)

		// Mute frontPlayer, and unmute backPlayer
		this.frontPlayer.mute()
		this.backPlayer.unMute()

		// Switch variables
		let temp = this.frontPlayer
		this.frontPlayer = backPlayer
		this.backPlayer = temp

		// Set curtain
		curtain.style.display = 'block'
		curtain.style['backdrop-filter'] = ''

		// Prepare counter
		let counter_interval
		onFrontPlayerEventStateChange = (evt) => {
			if(counter_interval) clearInterval(counter_interval)
			if(evt.data === YT.PlayerState.PLAYING) {
				counter_interval = setInterval(async ()=>{
					if(await this._updateCounter()) {
						clearInterval(counter_interval)
						onFrontPlayerEventStateChange = null
					}
				}, 125)
			}
		}

		// Start frontPlayer
		this.frontPlayer.playVideo()

		onRequestingNextVideo()
	}

	this.forceSkip = function() {
		// Modify start such as skip time is the begining of the video. Next tick of _updateCounter will do skip
		frontPlayer.vdata['_start'] = -this.GUESSING_TIME -this.AFTER_GUESSING_TIME
	}

	this.initPlayers()
}
