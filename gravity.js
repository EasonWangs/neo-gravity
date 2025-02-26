let animationId = null;
let audioContext = null;
let canvas = null;
let ctx = null;
let ballPosition = { x: 400, y: 50 };

// 物理参数配置
const PHYSICS_CONFIG = {
	BALL_RADIUS: 10,            // 小球半径
	
	// 物理参数配置
	PARAMS: {
		VELOCITY_X: 3,          // 横向初速度：3 px/ms
		VELOCITY_Y: 0,          // 纵向初速度：0 px/ms
		GRAVITY: 0.01,          // 重力加速度：9.8 px/平方ms
		TIME_STEP: 10,          // 单位时间：10ms
		FRICTION: {
			DEFAULT: 0.01,     // 摩擦系数：0.01
			RANDOM: [-0.001, 0.001]  // 摩擦力随机范围
		},
		VERTICAL_LOSS: {
			DEFAULT: 0.5,       // 垂直损耗：0.8
			RANDOM: [-0.1, 0.1] // 垂直损耗随机范围
		},
		HORIZONTAL_LOSS: {
			DEFAULT: 0.5,       // 水平损耗：0.9
			RANDOM: [-0.1, 0.1] // 水平损耗随机范围
		}
	},
	// 添加反馈和随机性的缺省值
	FEEDBACK_ENABLED: true,
	RANDOMNESS_ENABLED: true
};

// 生成随机参数的函数
function generateRandomParam(type) {
	const param = PHYSICS_CONFIG.PARAMS[type];
	if (typeof param !== 'object' || !param.RANDOM) return 0;
	
	const range = param.RANDOM;
	return range[0] + Math.random() * (range[1] - range[0]);
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
	if (!PHYSICS_CONFIG.FEEDBACK_ENABLED) return;

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
	if (!PHYSICS_CONFIG.RANDOMNESS_ENABLED) {
		return baseValue;
	}
	
	// 生成随机偏移量
	const randomOffset = generateRandomParam(paramType);
	
	// 将随机偏移量应用到基础值上
	return baseValue + randomOffset;
};

// 在初始化物理参数时使用默认值
function initPhysics(vx, vy, g, t, friction, verticalLoss, horizontalLoss) {
	return {
		velocityX: parseFloat(vx || PHYSICS_CONFIG.PARAMS.VELOCITY_X),
		velocityY: parseFloat(vy || PHYSICS_CONFIG.PARAMS.VELOCITY_Y),
		gravity: parseFloat(g || PHYSICS_CONFIG.PARAMS.GRAVITY),
		timeStep: parseFloat(t || PHYSICS_CONFIG.PARAMS.TIME_STEP),
		friction: parseFloat(friction || PHYSICS_CONFIG.PARAMS.FRICTION.DEFAULT),
		verticalLoss: parseFloat(verticalLoss || PHYSICS_CONFIG.PARAMS.VERTICAL_LOSS.DEFAULT),
		horizontalLoss: parseFloat(horizontalLoss || PHYSICS_CONFIG.PARAMS.HORIZONTAL_LOSS.DEFAULT)
	};
}

// 修改shoot函数使用参数对象
function shoot(params) {
	// 停止当前动画
	if (animationId) {
		cancelAnimationFrame(animationId);
		animationId = null;
	}
	
	// 更新配置开关
	PHYSICS_CONFIG.FEEDBACK_ENABLED = params.feedbackEnabled;
	PHYSICS_CONFIG.RANDOMNESS_ENABLED = params.randomEnabled;
	
	// 初始化物理参数，使用默认值作为缺省值
	physics = initPhysics(
		params.x, 
		params.y, 
		params.a, 
		params.t, 
		params.friction, 
		params.verticalLoss, 
		params.horizontalLoss
	);
	
	// 清除画布
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	// 绘制小球
	drawBall(ballPosition.x, ballPosition.y);
	
	// 开始动画
	lastTime = performance.now();
	animationId = requestAnimationFrame(updatePosition);
}

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
		if (ballPosition.y >= canvas.height - PHYSICS_CONFIG.BALL_RADIUS * 2) {
			ballPosition.y = canvas.height - PHYSICS_CONFIG.BALL_RADIUS * 2;
			
			const intensity = Math.min(Math.abs(physics.velocityY) / 2, 1);
			collisionFeedback(intensity);
			
			// 应用随机摩擦力
			const currentFriction = applyRandomness(
				physics.friction, 
				'FRICTION'
			);
			
			// 处理摩擦力 - 统一处理正负摩擦力
			const newHorizontalSpeed = Math.abs(physics.velocityX) - currentFriction;
			physics.velocityX = newHorizontalSpeed <= 0 ? 
				0 : 
				Math.sign(physics.velocityX) * newHorizontalSpeed;
			
			// 应用随机垂直损耗
			const currentVerticalLoss = applyRandomness(
				physics.verticalLoss, 
				'VERTICAL_LOSS'
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
		if (ballPosition.x < 0 || ballPosition.x > canvas.width - PHYSICS_CONFIG.BALL_RADIUS * 2) {
			ballPosition.x = ballPosition.x < 0 ? 0 : canvas.width - PHYSICS_CONFIG.BALL_RADIUS * 2;
			
			const intensity = Math.min(Math.abs(physics.velocityX) / 2, 1);
			collisionFeedback(intensity);
			
			// 应用随机水平损耗
			const currentHorizontalLoss = applyRandomness(
				physics.horizontalLoss, 
				'HORIZONTAL_LOSS'
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

// 在适当的地方使用这些缺省值初始化UI元素
function initUI() {
	// ... existing code ...
	
	// 使用配置中的值设置UI状态，而不是直接操作DOM
	// 这部分代码应该在demo.html或其他UI相关文件中实现
	// 在这里只保留必要的逻辑
	
	// ... existing code ...
}