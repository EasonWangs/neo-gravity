let animationId = null;
let audioContext = null;

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

const shoot = (x, y, a, t) => {
	// 如果已有动画正在运行，先停止它
	if (animationId) {
		clearInterval(animationId);
	}

	const ball = document.getElementById('fall');
	if (!ball) return;

	// 初始化物理参数
	const physics = {
		velocityX: parseFloat(x),      // 水平速度，正值向右，负值向左，单位：px/ms
		velocityY: parseFloat(y),      // 垂直速度，正值向下，负值向上，单位：px/ms
		gravity: parseFloat(a),        // 重力加速度，正值向下，单位：px/ms²
		timeStep: parseInt(t),         // 时间步长，单位：ms
		friction: 0.005,               // 底部摩擦系数，每次碰撞后的水平速度损耗
		verticalLoss: 0.2,            // 垂直碰撞能量损失，每次碰撞后的垂直速度损耗
		horizontalLoss: 0.2           // 水平碰撞能量损失，每次与墙壁碰撞后的水平速度损耗
	};

	let position = {
		x: ball.offsetLeft,
		y: ball.offsetTop
	};

	const boundaries = {
		width: document.documentElement.offsetWidth - ball.offsetWidth,
		height: document.documentElement.offsetHeight - ball.offsetHeight
	};

	const updatePosition = () => {
		// 更新位置
		position.x += physics.velocityX * physics.timeStep;
		position.y += physics.velocityY * physics.timeStep;
		
		// 重力影响
		physics.velocityY += physics.gravity * physics.timeStep;

		// 处理底部碰撞
		if (position.y >= boundaries.height) {
			position.y = boundaries.height;
			
			// 根据垂直速度计算碰撞强度
			const intensity = Math.min(Math.abs(physics.velocityY) / 2, 1);
			collisionFeedback(intensity);
			
			// 处理水平摩擦
			physics.velocityX = (Math.abs(physics.velocityX) - physics.friction < 0) ? 
				0 : 
				Math.sign(physics.velocityX) * (Math.abs(physics.velocityX) - physics.friction);
			
			// 处理垂直反弹
			physics.velocityY = (Math.abs(physics.velocityY) - physics.verticalLoss < 0) ? 
				0 : 
				-(Math.abs(physics.velocityY) - physics.verticalLoss);

			// 如果球停止运动，结束动画
			if (physics.velocityX === 0 && physics.velocityY === 0) {
				clearInterval(animationId);
				return;
			}
		}

		// 处理左右边界碰撞
		if (position.x < 0 || position.x > boundaries.width) {
			position.x = position.x < 0 ? 0 : boundaries.width;
			
			// 根据水平速度计算碰撞强度
			const intensity = Math.min(Math.abs(physics.velocityX) / 2, 1);
			collisionFeedback(intensity);
			
			const remainingSpeed = Math.abs(physics.velocityX) - physics.horizontalLoss;
			physics.velocityX = remainingSpeed < 0 ? 
				0 : 
				-Math.sign(physics.velocityX) * remainingSpeed;
		}

		// 更新球的位置
		ball.style.left = `${position.x}px`;
		ball.style.top = `${position.y}px`;
	};

	animationId = setInterval(updatePosition, physics.timeStep);
};