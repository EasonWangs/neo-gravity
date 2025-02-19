let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let lastDragPosition = { x: 0, y: 0 };
let lastDragTime = 0;
let dragVelocity = { x: 0, y: 0 };

// 初始化拖拽功能
function initDrag(canvas) {
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    
    // 触摸事件支持
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    });

    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        const touch = e.changedTouches[0];
        const mouseEvent = new MouseEvent('mouseup', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    });
}

function handleMouseMove(e) {
    if (!isDragging) return;
    
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    // 更新小球位置
    ballPosition.x = currentX - dragOffset.x;
    ballPosition.y = currentY - dragOffset.y;
    
    // 计算当前速度
    const currentTime = performance.now();
    const deltaTime = currentTime - lastDragTime;
    if (deltaTime > 0) {
        // 使用指数移动平均来平滑速度
        const alpha = 0.8;
        const newVelocityX = (currentX - lastDragPosition.x) / deltaTime;
        const newVelocityY = (currentY - lastDragPosition.y) / deltaTime;
        dragVelocity.x = dragVelocity.x * alpha + newVelocityX * (1 - alpha);
        dragVelocity.y = dragVelocity.y * alpha + newVelocityY * (1 - alpha);
    }
    
    // 记录位置和时间
    lastDragPosition.x = currentX;
    lastDragPosition.y = currentY;
    lastDragTime = currentTime;
    
    // 清除画布并重绘小球
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBall(ballPosition.x, ballPosition.y);
}

function handleMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 检查是否点击到小球
    if (Math.hypot(x - ballPosition.x, y - ballPosition.y) <= 10) {
        isDragging = true;
        dragOffset.x = x - ballPosition.x;
        dragOffset.y = y - ballPosition.y;
        
        // 重置速度和位置记录
        dragVelocity = { x: 0, y: 0 };
        lastDragPosition.x = x;
        lastDragPosition.y = y;
        lastDragTime = performance.now();
        
        // 停止当前动画
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    }
}

function handleMouseUp(e) {
    if (!isDragging) return;
    isDragging = false;
    
    // 使用累积的速度来甩出
    const velocityMagnitude = Math.hypot(dragVelocity.x, dragVelocity.y);
    if (velocityMagnitude > 0.1) { // 速度足够大时才甩出
        // 放大速度效果
        const speedMultiplier = 2;
        shoot(
            (dragVelocity.x * speedMultiplier).toString(),
            (dragVelocity.y * speedMultiplier).toString(),
            $id('a').value,
            $id('t').value,
            $id('friction').value,
            $id('verticalLoss').value,
            $id('horizontalLoss').value
        );
    } else {
        // 速度太小时给一个很小的初速度
        shoot(
            "0.1",
            "0",
            $id('a').value,
            $id('t').value,
            $id('friction').value,
            $id('verticalLoss').value,
            $id('horizontalLoss').value
        );
    }
} 