
// Prepare Youtube Player
let player;
function onYouTubeIframeAPIReady() {
	player = new YT.Player('player', {
		height: '95%',
		width: '95%',
		videoId: '',
		events: {
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

// 5. The API calls this function when the player's state changes.
//    The function indicates that when playing a video (state=1),
//    the player should play for six seconds and then stop.
let gameStarted = false
let timerStarted = false
let cued = false
function onPlayerStateChange(event) {
	if (!gameStarted) {
		return
	}
	if (event.data == YT.PlayerState.CUED && !cued) {
		console.log('video is cued, we can start playing => cued = true')
		
		cued = true
		banner.innerHTML = '(' + videoList[ivideo]['name'] + ')'
		counterElement.innerHTML = '<br>' + guessingTime
		player.playVideo()
		playing = true
	} else if (event.data == YT.PlayerState.PLAYING && !timerStarted) {
		countInter = setInterval(updateCounter, 1000)
	} else if (event.data == YT.PlayerState.ENDED) {
		console.log('video is ended, let us play next video')
		playing = false
		clickNext()
	} else {
		console.log('Event ignored', event.data, Object.keys(YT.PlayerState).find(key => YT.PlayerState[key] === event.data))
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
let curtain = null
let counterElement = null
let countInter = null
const guessingTime = 30 // seconds
let cuingTimeout = null
let banner = null
let playing = false


function updateCounter() {
	revealTime = videoList[ivideo]['start'] + guessingTime
	currentTime = player.getCurrentTime()
	if(revealTime <= currentTime) {
		let vdata = player.getVideoData()
		let soluce = vdata['title']
		curtain.style.display = 'none'
		banner.innerHTML = soluce
	} else {
		let counter = (revealTime - currentTime + 0.5)|0
		counterElement.innerHTML = '<br>' + counter
	}
}

function playNextVideo() {
	console.log("Play Next Video => cued = false")
	// reset flags
	cued = false
	clearInterval(countInter)
	clearTimeout(cuingTimeout)
	timerStarted = false
	gameStarted = true

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
	curtain.style.display = 'block'
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
	playing = false
	setTimeout(playNextVideo, 100)
}

function clickPlayPause() {
	console.log("Click play/pauyse", cued, playing)
	if(cued) {
		if(playing) {
			player.pauseVideo()
			playing = false
		} else {
			player.playVideo()
			playing = true
		}
	}
}