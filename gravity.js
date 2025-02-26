let animationId = null;
let audioContext = null;
let canvas = null;
let ctx = null;
let ballPosition = { x: 400, y: 50 };

// 物理参数配置
const PHYSICS_CONFIG = {
	BALL_RADIUS: 10,            // 小球半径
	
	// 随机范围配置 - 使用数组表示 [最小值, 最大值]
	RANDOM_RANGES: {
		FRICTION: [-0.001, 0.001],     // 摩擦力随机范围
		VERTICAL: [-0.1, 0.1],         // 垂直损耗随机范围
		HORIZONTAL: [-0.1, 0.1]        // 水平损耗随机范围
	}
};

// 生成随机参数的函数
function generateRandomParam(type) {
	const range = PHYSICS_CONFIG.RANDOM_RANGES[type.toUpperCase()];
	if (!range) return 0;
	
	return range[0] + Math.random() * (range[1] - range[0]);
}

// 更新UI显示的随机参数范围
function updateRandomRangesDisplay() {
	const ranges = PHYSICS_CONFIG.RANDOM_RANGES;
	
	$id('randomFriction').value = `${ranges.FRICTION[0].toFixed(3)}-${ranges.FRICTION[1].toFixed(3)}`;
	$id('randomVertical').value = `${ranges.VERTICAL[0].toFixed(2)}-${ranges.VERTICAL[1].toFixed(2)}`;
	$id('randomHorizontal').value = `${ranges.HORIZONTAL[0].toFixed(2)}-${ranges.HORIZONTAL[1].toFixed(2)}`;
}

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
	ctx.arc(x, y, PHYSICS_CONFIG.BALL_RADIUS, 0, Math.PI * 2);
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

// 添加随机变化到物理参数
const applyRandomness = (baseValue, paramType) => {
	if (!$id('randomEnabled').checked) {
		return baseValue;
	}
	
	// 生成随机偏移量
	const randomOffset = generateRandomParam(paramType);
	
	// 将随机偏移量应用到基础值上
	return baseValue + randomOffset;
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
		width: canvas.width - PHYSICS_CONFIG.BALL_RADIUS * 2,
		height: canvas.height - PHYSICS_CONFIG.BALL_RADIUS * 2
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
				
				// 应用随机摩擦力
				const currentFriction = applyRandomness(
					physics.friction, 
					'friction'
				);
				
				// 处理摩擦力 - 统一处理正负摩擦力
				const newHorizontalSpeed = Math.abs(physics.velocityX) - currentFriction;
				physics.velocityX = newHorizontalSpeed <= 0 ? 
					0 : 
					Math.sign(physics.velocityX) * newHorizontalSpeed;
				
				// 应用随机垂直损耗
				const currentVerticalLoss = applyRandomness(
					physics.verticalLoss, 
					'vertical'
				);
				
				// 处理垂直损耗 - 统一处理正负损耗
				const newVerticalSpeed = Math.abs(physics.velocityY) - currentVerticalLoss;
				physics.velocityY = newVerticalSpeed <= 0 ? 
					0 : 
					-newVerticalSpeed; // 垂直方向始终向上反弹

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
				
				// 应用随机水平损耗
				const currentHorizontalLoss = applyRandomness(
					physics.horizontalLoss, 
					'horizontal'
				);
				
				// 处理水平损耗 - 统一处理正负损耗
				const newHorizontalSpeed = Math.abs(physics.velocityX) - currentHorizontalLoss;
				physics.velocityX = newHorizontalSpeed <= 0 ? 
					0 : 
					-Math.sign(physics.velocityX) * newHorizontalSpeed; // 水平方向反向
			}

			// 绘制小球
			drawBall(ballPosition.x, ballPosition.y);
			
			lastTime = currentTime;
		}
		
		animationId = requestAnimationFrame(updatePosition);
	};

	animationId = requestAnimationFrame(updatePosition);
};