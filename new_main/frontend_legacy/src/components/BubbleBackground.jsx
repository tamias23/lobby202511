import React, { useEffect, useRef } from 'react';

const BubbleBackground = ({ speedFactor = 1.0, randomColors = false }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width, height;
    let bubbles = [];
    const numBubbles = 65; // between 50 and 80
    const colorChoices = [
      'DarkGreen', 'DarkOliveGreen', 'DarkBlue', 'DarkSlateGrey', 'Grey', 'Olive', 'OrangeRed'
    ];

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    class Bubble {
      constructor() {
        this.radius = Math.random() * 25 + 5;
        this.x = Math.random() * (width - this.radius * 2) + this.radius;
        this.y = Math.random() * (height - this.radius * 2) + this.radius;
        this.vx = (Math.random() - 0.5) * 1.5 * speedFactor; // movement scaled by factor
        this.vy = (Math.random() - 0.5) * 1.5 * speedFactor;
        this.mass = this.radius;
        this.color = randomColors 
          ? colorChoices[Math.floor(Math.random() * colorChoices.length)]
          : 'rgba(13, 18, 56, 0.85)';
      }

      update() {
        // Random color change logic
        if (randomColors && Math.random() < 1 / 7200) { // On average once every 2 mins (120s * 60fps)
          this.color = colorChoices[Math.floor(Math.random() * colorChoices.length)];
        }

        this.x += this.vx;
        this.y += this.vy;

        // Wall collisions
        if (this.x - this.radius <= 0) {
          this.x = this.radius;
          this.vx *= -1;
        } else if (this.x + this.radius >= width) {
          this.x = width - this.radius;
          this.vx *= -1;
        }

        if (this.y - this.radius <= 0) {
          this.y = this.radius;
          this.vy *= -1;
        } else if (this.y + this.radius >= height) {
          this.y = height - this.radius;
          this.vy *= -1;
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        if (!randomColors) ctx.globalAlpha = 1.0; // Ensure consistency
        else ctx.globalAlpha = 0.8;
        ctx.fill();
        ctx.closePath();
      }
    }

    const init = () => {
      resize();
      bubbles = [];
      for (let i = 0; i < numBubbles; i++) {
        bubbles.push(new Bubble());
      }
    };

    const resolveCollision = (b1, b2) => {
      const dx = b2.x - b1.x;
      const dy = b2.y - b1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < b1.radius + b2.radius) {
        // Simple elastic collision
        const normalX = dx / distance;
        const normalY = dy / distance;

        // Relative velocity
        const rvx = b2.vx - b1.vx;
        const rvy = b2.vy - b1.vy;

        const velAlongNormal = rvx * normalX + rvy * normalY;

        // If bubbles already moving apart, skip
        if (velAlongNormal > 0) return;

        const restitution = 1;
        let j = -(1 + restitution) * velAlongNormal;
        j /= 1 / b1.mass + 1 / b2.mass;

        const impulseX = j * normalX;
        const impulseY = j * normalY;

        b1.vx -= (1 / b1.mass) * impulseX;
        b1.vy -= (1 / b1.mass) * impulseY;
        b2.vx += (1 / b2.mass) * impulseX;
        b2.vy += (1 / b2.mass) * impulseY;

        // Prevent sticking
        const overlap = b1.radius + b2.radius - distance;
        const separationX = (overlap / 2) * normalX;
        const separationY = (overlap / 2) * normalY;
        b1.x -= separationX;
        b1.y -= separationY;
        b2.x += separationX;
        b2.y += separationY;
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < bubbles.length; i++) {
        bubbles[i].update();
        for (let j = i + 1; j < bubbles.length; j++) {
          resolveCollision(bubbles[i], bubbles[j]);
        }
        bubbles[i].draw();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    init();
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [speedFactor, randomColors]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  );
};

export default BubbleBackground;
