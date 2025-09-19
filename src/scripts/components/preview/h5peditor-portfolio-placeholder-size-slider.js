import Util from '@services/util.js';
import './h5peditor-portfolio-placeholder-size-slider.scss';

/** @constant {number} DEFAULT_MOVE_DISTANCE_PERCENT Default move distance in percent. */
const DEFAULT_MOVE_DISTANCE_PERCENT = 5;

export default class PortfolioPlaceholderSizeSlider {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      aria: {
        min: 1,
        max: 99,
      },
    }, params);

    this.callbacks = Util.extend({
      onStartedSliding: () => {},
      onPositionChanged: () => {},
      onEndedSliding: () => {},
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5peditor-portfolio-placeholder-size-slider');
    this.dom.setAttribute('tabindex', '0');
    this.dom.setAttribute('role', 'separator');
    this.dom.setAttribute('aria-min', this.params.aria.min);
    this.dom.setAttribute('aria-max', this.params.aria.max);
    if (params.aria.controls) {
      this.dom.setAttribute('aria-controls', this.params.aria.controls);
    }
    this.dom.setAttribute(
      'aria-label', this.params.dictionary.get('a11y.sizeSliderLabel'),
    );

    this.dom.addEventListener('keydown', (event) => {
      if (event.code === 'ArrowLeft') {
        this.callbacks.onPositionChanged({
          percentage: (this.position - DEFAULT_MOVE_DISTANCE_PERCENT) / 100,
        });
      }
      else if (event.code === 'ArrowRight') {
        this.callbacks.onPositionChanged({
          percentage: (this.position + DEFAULT_MOVE_DISTANCE_PERCENT) / 100,
        });
      }
      else if (event.code === 'Enter') {
        if (this.position > DEFAULT_MOVE_DISTANCE_PERCENT) {
          this.previousPosition = this.position / 100;
          this.callbacks.onPositionChanged({
            percentage: 0.05,
          });
        }
        else {
          this.callbacks.onPositionChanged({
            percentage: this.previousPosition,
          });
          this.previousPosition = 0.05;
        }
      }
      else {
        return;
      }

      event.preventDefault();
    });

    this.dom.addEventListener('mousedown', (event) => {
      this.handleSliderStart(event);
    });

    this.dom.addEventListener('touchstart', (event) => {
      this.handleSliderStart(event);
    }, { passive: true });

    window.addEventListener('mousemove', (event) => {
      this.handleSliderMove(event);
    });

    window.addEventListener('touchmove', (event) => {
      this.handleSliderMove(event);
    }, false);

    // Detect mouseup out of slider area
    window.addEventListener('mouseup', (event) => {
      this.handleSliderEnd(event);
    });

    // Detect mouseup out of slider area
    window.addEventListener('touchend', (event) => {
      this.handleSliderEnd(event);
    }, false);
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} dom.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Set position.
   * @param {number} position Position.
   */
  setPosition(position) {
    this.position = position;
    this.dom.setAttribute('aria-valuenow', Math.round(position));
  }

  /**
   * Enable.
   */
  enable() {
    this.dom.classList.remove('disabled');
  }

  /**
   * Disable.
   */
  disable() {
    this.dom.classList.add('disabled');
  }

  /**
   * Handle slider movement starting.
   * @param {MouseEvent|TouchEvent} event Event.
   */
  handleSliderStart(event) {
    this.dom.classList.add('sliding');
    this.isSliding = true;

    if (event instanceof MouseEvent) {
      this.callbacks.onStartedSliding({ x: event.clientX });
    }
    else if (event instanceof TouchEvent) {
      this.callbacks.onStartedSliding({ x: event.touches[0].clientX });
    }
  }

  /**
   * Handle slider movement happening.
   * @param {MouseEvent|TouchEvent} event Event.
   */
  handleSliderMove(event) {
    if (!this.isSliding) {
      return;
    }

    if (event instanceof MouseEvent) {
      event.preventDefault();
      this.callbacks.onPositionChanged({ x: event.clientX });
    }
    else if (event instanceof TouchEvent) {
      this.callbacks.onPositionChanged({ x: event.touches[0].clientX });
    }
  }

  /**
   * Handle slider movement ended.
   * @param {MouseEvent|TouchEvent} event Event.
   */
  handleSliderEnd(event) {
    if (!this.isSliding) {
      return;
    }

    event.stopPropagation();

    this.dom.classList.remove('sliding');
    this.isSliding = false;

    if (event instanceof MouseEvent) {
      event.preventDefault();
    }

    this.callbacks.onEndedSliding();
  }
}
