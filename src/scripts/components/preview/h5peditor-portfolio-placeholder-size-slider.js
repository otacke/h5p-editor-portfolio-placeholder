import Util from '../../h5peditor-portfolio-placeholder-util';
import Dictionary from '../../services/dictionary';
import './h5peditor-portfolio-placeholder-size-slider.scss';

export default class PortfolioPlaceholderSizeSlider {

  /**
   * @class
   * @param {object} [params={}] Parameters.
   * @param {object} [callbacks={}] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      aria: {
        min: 1,
        max: 99
      }
    }, params);

    this.callbacks = Util.extend({
      onStartedSliding: () => {},
      onPositionChanged: () => {},
      onEndedSliding: () => {}
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
    this.dom.setAttribute('aria-label', Dictionary.get('a11y.sizeSliderLabel'));

    this.dom.addEventListener('keydown', (event) => {
      if (event.code === 'ArrowLeft') {
        this.callbacks.onPositionChanged({ percentage: this.position - 5 });
      }
      else if (event.code === 'ArrowRight') {
        this.callbacks.onPositionChanged({ percentage: this.position + 5 });
      }
      else {
        return;
      }

      event.preventDefault();
      // TODO: Enter
    });

    this.dom.addEventListener('mousedown', () => {
      this.dom.classList.add('sliding');
      this.isSliding = true;
      this.callbacks.onStartedSliding();
    });

    window.addEventListener('mousemove', (event) => {
      event = event || window.event;
      event.preventDefault();
      if (this.isSliding) {
        this.callbacks.onPositionChanged({ x: event.clientX });
      }
    });

    // Detect mouseup out of slider area
    window.addEventListener('mouseup', (event) => {
      if (!this.isSliding) {
        return;
      }

      event = event || window.event;
      event.preventDefault();
      event.stopPropagation();

      this.dom.classList.remove('sliding');
      this.isSliding = false;

      this.callbacks.onEndedSliding();
    });
  }

  getDOM() {
    return this.dom;
  }

  /**
   * Set position.
   *
   * @param {number} position Position.
   */
  setPosition(position) {
    this.position = position;
    this.dom.setAttribute('aria-valuenow', Math.round(position));
  }
}
