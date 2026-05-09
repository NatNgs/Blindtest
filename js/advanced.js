

// Prepare playlist
function saveToFile() {
	// Ask to save text file .tsv
	const tsv = ['## Video ##\tAnswer\tClue\tBegins\tEnds']
	for(const v of videoList) {
		tsv.push([v.id, v.title || '', v.name || '', v.start, v.end].join('\t').trimEnd())
	}

	const blob = new Blob([tsv.join('\n')], {type: "text/plain;charset=utf-8"})
	const url = URL.createObjectURL(blob)
	const a = document.createElement("a")
	a.href = url
	a.download = "Nindtest advanced.tsv"
	a.click()
	URL.revokeObjectURL(url)
}
function loadFromFile() {
	// Load from TSV file
	const input = document.createElement('input')
	input.type = 'file'
	input.accept = '.tsv'
	input.onchange = () => {
		const file = input.files[0]
		const reader = new FileReader()
		reader.onload = () => {
			const rows = reader.result.split('\n')
			const newVideoList = []
			for(const r of rows) {
				const cols = r.trim().split('\t')

				if(cols[0].length > 11) {
					// Parse yt video URL to video id
					let match = url.match(/(?:[^/]+\/)*([a-zA-Z0-9_-]{11})/)
					if(match && match.length > 1)
						cols[0] = match[1]
					else {
						// Extract url params, and find parameter "v"
						match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
						if(match && match.length > 1)
							cols[0] = match[1]
					}
				}
				if(cols[0].length !== 11 || cols[0][0] === '#') continue

				const dta = {id: cols[0]}
				if(cols.length >= 2) dta['title'] = cols[1]
				if(cols.length >= 3) dta['name'] = cols[2]
				if(cols.length >= 4) dta['start'] = parseTime(cols[3])
				if(cols.length >= 5) dta['end'] = parseTime(cols[4])
				newVideoList.push(dta)
			}
			loadVideos(newVideoList)
		}
		reader.readAsText(file)
	}
	input.click()
}
function loadFromJson() {
	// Load from JSON text
	let txt_video_list = prompt("Paste the JSON video list below");
	try {
		const newVideoList = JSON.parse(txt_video_list)
		loadVideos(newVideoList)
	} catch(e) {
		alert('Failed to load. Format may be incorrect.')
		console.log(e, txt_video_list)
	}
}
