let animationId = null;
let audioContext = null;
let canvas = null;
let ctx = null;
let ballPosition = { x: 400, y: 50 };

// 初始化 canvas
function initCanvas() {
	canvas = document.getElementById('canvas');
	if (!canvas) return;
	
	ctx = canvas.getContext('2d');
	resizeCanvas();
	
	// 绘制初始小球
	drawBall(ballPosition.x, ballPosition.y);
}

// 设置canvas尺寸
function resizeCanvas() {
	if (!canvas) return;
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
}

// 绘制小球
function drawBall(x, y) {
	if (!ctx) return;
	ctx.beginPath();
	ctx.arc(x, y, 10, 0, Math.PI * 2);
	ctx.fillStyle = 'orange';
	ctx.fill();
	ctx.closePath();
}

// 创建碰撞音效
const createCollisionSound = () => {
	// 延迟创建 AudioContext 直到第一次需要时
	if (!audioContext) {
		try {
			audioContext = new (window.AudioContext || window.webkitAudioContext)();
		} catch (e) {
			console.log('Web Audio API not supported');
			return null;
		}
	}

	try {
		const oscillator = audioContext.createOscillator();
		const gainNode = audioContext.createGain();
		
		oscillator.connect(gainNode);
		gainNode.connect(audioContext.destination);
		
		oscillator.type = 'sine';
		oscillator.frequency.value = 200; // 频率
		gainNode.gain.value = 0.1; // 音量
		
		return { oscillator, gainNode };
	} catch (e) {
		console.log('Error creating sound:', e);
		return null;
	}
};

// 碰撞反馈函数
const collisionFeedback = (intensity = 1) => {
	// 只在启用反馈时执行
	if (!$id('feedback').checked) return;

	// 震动反馈 - 根据强度调整震动时长
	if ('vibrate' in navigator) {
		const vibrationTime = Math.floor(20 + intensity * 40); // 20-60ms
		navigator.vibrate(vibrationTime);
	}

	// 声音反馈
	const sound = createCollisionSound();
	if (sound) {
		const { oscillator, gainNode } = sound;
		try {
			// 使用非线性映射使弱碰撞的声音更小
			const volume = 0.01 + (intensity * intensity * 0.15); // 音量范围 0.01-0.16
			gainNode.gain.value = volume;

			// 调整频率范围，使声音不那么刺耳
			oscillator.frequency.value = 100 + (intensity * 80); // 频率范围 100-180Hz
			
			oscillator.start();
			setTimeout(() => {
				try {
					// 更平滑的淡出效果
					gainNode.gain.exponentialRampToValueAtTime(
						0.001,
						audioContext.currentTime + 0.15
					);
					setTimeout(() => {
						oscillator.stop();
					}, 150);
				} catch (e) {
					console.log('Error stopping sound:', e);
				}
			}, 30);
		} catch (e) {
			console.log('Error starting sound:', e);
		}
	}
};

const shoot = (x, y, a, t, friction = "0.005", verticalLoss = "0.2", horizontalLoss = "0.2") => {
	// 如果已有动画正在运行，先停止它
	if (animationId) {
		cancelAnimationFrame(animationId);
	}

	// 初始化物理参数
	const physics = {
		velocityX: parseFloat(x),
		velocityY: parseFloat(y),
		gravity: parseFloat(a),
		timeStep: parseInt(t),
		friction: parseFloat(friction),
		verticalLoss: parseFloat(verticalLoss),
		horizontalLoss: parseFloat(horizontalLoss)
	};

	const boundaries = {
		width: canvas.width - 20,  // 20是小球直径
		height: canvas.height - 20
	};

	let lastTime = performance.now();

	const updatePosition = (currentTime) => {
		const deltaTime = currentTime - lastTime;
		
		if (deltaTime >= physics.timeStep) {
			// 清除画布
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			
			// 更新位置
			ballPosition.x += physics.velocityX * physics.timeStep;
			ballPosition.y += physics.velocityY * physics.timeStep;
			
			// 重力影响
			physics.velocityY += physics.gravity * physics.timeStep;

			// 处理底部碰撞
			if (ballPosition.y >= boundaries.height) {
				ballPosition.y = boundaries.height;
				
				const intensity = Math.min(Math.abs(physics.velocityY) / 2, 1);
				collisionFeedback(intensity);
				
				physics.velocityX = (Math.abs(physics.velocityX) - physics.friction < 0) ? 
					0 : 
					Math.sign(physics.velocityX) * (Math.abs(physics.velocityX) - physics.friction);
				
				physics.velocityY = (Math.abs(physics.velocityY) - physics.verticalLoss < 0) ? 
					0 : 
					-(Math.abs(physics.velocityY) - physics.verticalLoss);

				if (physics.velocityX === 0 && physics.velocityY === 0) {
					cancelAnimationFrame(animationId);
					// 在动画结束时绘制最后一帧
					drawBall(ballPosition.x, ballPosition.y);
					return;
				}
			}

			// 处理左右边界碰撞
			if (ballPosition.x < 0 || ballPosition.x > boundaries.width) {
				ballPosition.x = ballPosition.x < 0 ? 0 : boundaries.width;
				
				const intensity = Math.min(Math.abs(physics.velocityX) / 2, 1);
				collisionFeedback(intensity);
				
				const remainingSpeed = Math.abs(physics.velocityX) - physics.horizontalLoss;
				physics.velocityX = remainingSpeed < 0 ? 
					0 : 
					-Math.sign(physics.velocityX) * remainingSpeed;
			}

			// 绘制小球
			drawBall(ballPosition.x, ballPosition.y);
			
			lastTime = currentTime;
		}
		
		animationId = requestAnimationFrame(updatePosition);
	};

	animationId = requestAnimationFrame(updatePosition);
};