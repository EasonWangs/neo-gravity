let animationId = null;

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
			// 使用原始计算方式
			physics.velocityX = (Math.abs(physics.velocityX) - physics.horizontalLoss < 0) ? 
				0 : 
				-Math.sign(physics.velocityX) * (Math.abs(physics.velocityX) - physics.horizontalLoss);
		}

		// 更新球的位置
		ball.style.left = `${position.x}px`;
		ball.style.top = `${position.y}px`;
	};

	animationId = setInterval(updatePosition, physics.timeStep);
};