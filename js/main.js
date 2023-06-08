
// Prepare Youtube Player
let player;
function onYouTubeIframeAPIReady() {
	player = new YT.Player('player', {
		height: '95%',
		width: '95%',
		videoId: '',
		events: {
			'onReady': onPlayerReady,
			'onStateChange': onPlayerStateChange
		},
		disablekb: 1,
		controls: 0,
		iv_load_policy: 3,
	});
	
	curtain = document.getElementById('curtain')
	counterElement = document.getElementById('counter')
	banner = document.getElementById('banner')
	
	onLoad()
}

// Prepare playlist
function onLoad() {
	try {
		let txt_video_list = prompt("Paste the JSON video list below");
		console.log(txt_video_list)
		videoList = JSON.parse(txt_video_list)
		videoList.shuffle()
		console.log(videoList)

		banner.innerHTML = 'Click on "Next" to start !'
		counterElement.innerHTML = '⇊'
	} catch(e) {
		banner.innerHTML = 'Load Failed. [F5] to retry.'
		counterElement.innerHTML = e
		console.log(e)
	}
}



// 4. The API will call this function when the video player is ready.
function onPlayerReady(event) {
	console.log('onready triggered')
	player.playVideo();
}

// 5. The API calls this function when the player's state changes.
//    The function indicates that when playing a video (state=1),
//    the player should play for six seconds and then stop.
let gameStarted = false
let timerStarted = false
let cued = false
function onPlayerStateChange(event) {
	console.log('triggered on player change', event.data)
	if (!gameStarted) {
		return
	}
	if (event.data == YT.PlayerState.CUED && !cued) {
		console.log('video is cued, we can start playing')
		
		cued = true
		banner.innerHTML = '(' + videoList[ivideo]['name'] + ')'
		counterElement.innerHTML = '<br>' + guessingTime
		player.playVideo()
	} else if (event.data == YT.PlayerState.PLAYING && !timerStarted) {
		console.log('starting the timers')
		counter = guessingTime
		countInter = setInterval(updateCounter, 1000)
		guessTimeout = setTimeout(liftCurtain, guessingTime*1000) // change here for guessing time
	} else if (event.data == YT.PlayerState.ENDED && cued) {
		console.log('video is ended, let us play next video')
		clickNext()
	} else {
		console.log('UNKNOWN EVENT', event.data)
	}
}

let videoList = []
Array.prototype.shuffle = function() {
	for(let i = 0; i < this.length; i++) {
		let rnd = (Math.random() * this.length)|0
		let tmp = this[rnd]
		this[rnd] = this[i]
		this[i] = tmp
	}
}

let ivideo = -1
let counter = 0
let curtain = null
let counterElement = null
let countInter = null
let guessingTime = 30 // seconds
let guessTimeout = null
let cuingTimeout = null
let banner = null

function liftCurtain() {
	let vdata = player.getVideoData()
	let soluce = vdata['title']
	console.log('lift curtain', soluce)
	curtain.style.opacity = '0'
	banner.innerHTML = soluce
}

function updateCounter() {
	counter --
	counterElement.innerHTML = '<br>' + counter
}

function playNextVideo() {
	// reset flags
	cued = false

	clearTimeout(guessTimeout)
	clearInterval(countInter)
	clearTimeout(cuingTimeout)
	timerStarted = false
	gameStarted = true
	guessingTime = 30

	// increase video index
	ivideo += 1

	// if no more video, stop player and return
	if (ivideo >= videoList.length) {
		console.log('no more video to play')
		curtain.style.display = 'block'
		counterElement.innerHTML = 'End of the list !'
		clearInterval(countInter)
		ivideo = -1
		return
	}

	// cue a new video (it will be played once cued)
	console.log('cued video:', ivideo, videoList[ivideo])
	player.cueVideoById({'videoId': videoList[ivideo]['id'],
		'startSeconds': videoList[ivideo]['start'],
		'endSeconds': videoList[ivideo]['end']}
	)
	
	// reset counter end drop the curtain
	curtain.style.opacity = '1'
	banner.innerHTML = '(loading song '+ (ivideo+1) + '/' + videoList.length +'...)'
	counterElement.innerHTML = ''

	cuingTimeout = setTimeout(()=>{
		if(!cued) {
			playNextVideo()
		}
	}, 5000)
}
function clickNext() {
	player.stopVideo()
	setTimeout(playNextVideo, 100)
}

function clickPlayPause() {
	player.pauseVideo()
}