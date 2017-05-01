
let canvas = document.getElementById('canvas');

canvas.width = 600;
canvas.height = 600;

let context = canvas.getContext('2d');


context.fillStyle = "rgb(0, 0, 0)";
context.fillRect(0, 0, canvas.width, canvas.height);


let image = new Image();
image.onload = () => {
	let start = Date.now();
	// for (let i = 0; i < 10000; i++) {
	// 	context.fillStyle = "rgb(255, 0, 0)";
	// 	context.fillRect(i % 600, i % 600, 100, 100);
	// }
	for (let i = 0; i < 10000; i++) {
		// context.fillRect(i % 600, i % 600, 100, 100);
		context.drawImage(image, i % 600, i % 600);
	}
	let time = Date.now() - start;
	console.log('time=' + time);
};
image.src = './image.jpg';

