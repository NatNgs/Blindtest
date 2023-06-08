function onLoad() {
	curtain = document.getElementById('curtain')
	counterElement = document.getElementById('counter')
	banner = document.getElementById('banner')

	Papa.parse("video-list.csv", {
		download: false, // False for local, TRUE for online ##########################################
		header: true,
		//worker: true, // for large csv
		complete: function(res) {
			console.log('database loaded:', res);
			// ################################################# Local mock v
			// videoList = res.data
			videoList = [
				{id:'QHpU0ZfXZ_g', start:0, end:180, name:'Nathaël'},
				{id:'d020hcWA_Wg', start:0, end:255, name:'Nathaël'},
				{id:'M7X6oYg6iro', start:0, end:233, name:'Nathaël'},
				{id:'l482T0yNkeo', start:0, end:207., name:'Nathaël'},
				{id:'_ovdm2yX4MA', start:0, end:198, name:'Nathaël'},
				{id:'3b8btcCmL0c', start:0, end:60, name:'Nathaël'},
				{id:'2vjPBrBU-TM', start:0, end:231., name:'Nathaël'},
				{id:'hT_nvWreIhg', start:0, end:257, name:'Nathaël'},
				{id:'BXhIT4MpRis', start:0, end:230., name:'Nathaël'},
				{id:'jAxOyFE59c4', start:0, end:260, name:'Nathaël'},
				{id:'2EIeUlvHAiM', start:0, end:230., name:'Nathaël'},
				{id:'wHylQRVN2Qs', start:0, end:230., name:'Nathaël'},
				{id:'Bag1gUxuU0g', start:0, end:285, name:'Nathaël'},
				{id:'tXZXLmzyKkw', start:0, end:385, name:'Nathaël'},
				{id:'TPE9uSFFxrI', start:30, end:310, name:'Nathaël'},
				{id:'8AHCfZTRGiI', start:0, end:215, name:'Nathaël'},
				{id:'_YqzuE-5RE8', start:3, end:157, name:'Nathaël'},
				{id:'MbXWrmQW-OE', start:0, end:260, name:'Nathaël'},
				{id:'fKopy74weus', start:22, end:200., name:'Nathaël'},
				{id:'8DyziWtkfBw', start:0, end:270., name:'Nathaël'},
				{id:'IJiHDmyhE1A', start:15, end:214., name:'Nathaël'},
				{id:'b-3BI9AspYc', start:0, end:242, name:'Nathaël'},
				{id:'9KyolyVcWu8', start:3, end:258, name:'Nathaël'},
				{id:'h_MzYQTLXbk', start:8, end:322, name:'Nathaël'},
			]
			// ################################################## Local Mock ^
			videoList.shuffle()
			console.log(videoList)

			banner.innerHTML = 'Click on "Next" to start !'
			counterElement.innerHTML = '⇊'
		}
	});

}


// 3. This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
let player;
function onYouTubeIframeAPIReady() {
	player = new YT.Player('player', {
		height: '95%',
		width: '95%',
		videoId: '',
		events: {
			'onReady': onPlayerReady,
			'onStateChange': onPlayerStateChange
		}
	});
	onLoad()
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
	let soluce = '(' + vdata['author'] + ') ' + vdata['title']
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