function toast(message, toastClass, duration=3000) {
	const parentDiv = document.body
	let previousToasts = parentDiv.querySelectorAll(".toast")

	let box = document.createElement("div");
	box.classList.add("toast")
	if(toastClass) box.classList.add(toastClass);
	box.innerHTML = `<div class="toast-content-wrapper">
	<div class="toast-message">${message}</div>
	<div class="toast-progress"></div>
	</div>`;
	parentDiv.append(box)

	// Close the toast after duration
	box.querySelector(".toast-progress").style.animationDuration = `${duration}ms`
	setTimeout(()=>{
		box.classList.add("closing");
		setTimeout(() => parentDiv.removeChild(box), 1000)
	}, duration)

	// Move all previous toast down by this toast height
	box.style.top = '10px'
	const increase = box.getBoundingClientRect().height + 2;
	for(const toast of previousToasts) {
		const curr = Number.parseInt(toast.style.top || 0)
		toast.style.top = `${curr + increase}px`
	}

	console.log(box.innerText)
}
