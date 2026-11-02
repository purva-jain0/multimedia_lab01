/* ==========================================================================
   Jungle Dash: Lost Temple - Unified Input Manager
   MCA Multimedia Systems Lab - Event Handling (Keyboard, Touch Swipes, HUD Buttons)
   ========================================================================== */

export class InputManager {
    constructor() {
        // Callback handlers
        this.onMoveLeft = null;
        this.onMoveRight = null;
        this.onJump = null;
        this.onSlide = null;
        this.onPauseToggle = null;

        // Touch tracking variables
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
        this.isSwiping = false;
        this.swipeThreshold = 35; // Minimum pixels to qualify as a swipe
        this.maxSwipeDuration = 500; // ms

        // Prevent repeated actions while key is held down
        this.keysDown = new Set();

        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundKeyUp = this.handleKeyUp.bind(this);
        this.boundTouchStart = this.handleTouchStart.bind(this);
        this.boundTouchMove = this.handleTouchMove.bind(this);
        this.boundTouchEnd = this.handleTouchEnd.bind(this);
    }

    /**
     * Attaches all input event listeners to the window and canvas.
     * @param {HTMLElement} canvasElement
     */
    attach(canvasElement) {
        window.addEventListener('keydown', this.boundKeyDown, { passive: false });
        window.addEventListener('keyup', this.boundKeyUp, { passive: false });

        if (canvasElement) {
            canvasElement.addEventListener('touchstart', this.boundTouchStart, { passive: false });
            canvasElement.addEventListener('touchmove', this.boundTouchMove, { passive: false });
            canvasElement.addEventListener('touchend', this.boundTouchEnd, { passive: false });
        }

        this.bindOnScreenButtons();
    }

    /**
     * Removes all input event listeners.
     */
    detach(canvasElement) {
        window.removeEventListener('keydown', this.boundKeyDown);
        window.removeEventListener('keyup', this.boundKeyUp);

        if (canvasElement) {
            canvasElement.removeEventListener('touchstart', this.boundTouchStart);
            canvasElement.removeEventListener('touchmove', this.boundTouchMove);
            canvasElement.removeEventListener('touchend', this.boundTouchEnd);
        }
    }

    /**
     * Binds on-screen mobile HUD directional & action buttons.
     */
    bindOnScreenButtons() {
        const bindBtn = (id, callback) => {
            const btn = document.getElementById(id);
            if (!btn) return;

            const trigger = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (callback) callback();
            };

            btn.addEventListener('touchstart', trigger, { passive: false });
            btn.addEventListener('click', trigger);
        };

        bindBtn('btn-touch-left', () => this.triggerLeft());
        bindBtn('btn-touch-right', () => this.triggerRight());
        bindBtn('btn-touch-jump', () => this.triggerJump());
        bindBtn('btn-touch-slide', () => this.triggerSlide());
    }

    handleKeyDown(e) {
        // Check for pause key (Escape or P)
        if (e.code === 'Escape' || e.code === 'KeyP') {
            e.preventDefault();
            if (!this.keysDown.has(e.code)) {
                this.keysDown.add(e.code);
                if (this.onPauseToggle) this.onPauseToggle();
            }
            return;
        }

        // Gameplay movement keys
        const validKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space'];
        if (validKeys.includes(e.code)) {
            e.preventDefault(); // Prevent page scrolling

            if (this.keysDown.has(e.code)) {
                return; // Suppress auto-repeat for clean single actions
            }
            this.keysDown.add(e.code);

            switch (e.code) {
                case 'ArrowLeft':
                case 'KeyA':
                    this.triggerLeft();
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.triggerRight();
                    break;
                case 'ArrowUp':
                case 'KeyW':
                case 'Space':
                    this.triggerJump();
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.triggerSlide();
                    break;
            }
        }
    }

    handleKeyUp(e) {
        this.keysDown.delete(e.code);
    }

    handleTouchStart(e) {
        if (!e.touches || e.touches.length === 0) return;
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.touchStartTime = Date.now();
        this.isSwiping = true;
    }

    handleTouchMove(e) {
        // Prevent default screen pull-to-refresh or page bouncing during gameplay
        if (this.isSwiping) {
            e.preventDefault();
        }
    }

    handleTouchEnd(e) {
        if (!this.isSwiping) return;
        this.isSwiping = false;

        if (!e.changedTouches || e.changedTouches.length === 0) return;
        const touch = e.changedTouches[0];

        const deltaX = touch.clientX - this.touchStartX;
        const deltaY = touch.clientY - this.touchStartY;
        const duration = Date.now() - this.touchStartTime;

        if (duration > this.maxSwipeDuration) return; // Ignore very slow drags

        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (Math.max(absX, absY) < this.swipeThreshold) {
            return; // Tap, not a swipe
        }

        if (absX > absY) {
            // Horizontal swipe
            if (deltaX < 0) {
                this.triggerLeft();
            } else {
                this.triggerRight();
            }
        } else {
            // Vertical swipe
            if (deltaY < 0) {
                this.triggerJump();
            } else {
                this.triggerSlide();
            }
        }
    }

    triggerLeft() {
        if (this.onMoveLeft) this.onMoveLeft();
    }

    triggerRight() {
        if (this.onMoveRight) this.onMoveRight();
    }

    triggerJump() {
        if (this.onJump) this.onJump();
    }

    triggerSlide() {
        if (this.onSlide) this.onSlide();
    }
}
