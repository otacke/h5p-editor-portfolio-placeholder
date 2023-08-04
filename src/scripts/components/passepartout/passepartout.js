import FocusTrap from '@services/focus-trap.js';
import './passepartout.scss';

export default class PortfolioPlaceholderPassepartout {

  /**
   * @class
   */
  constructor() {
    this.handleResize = this.handleResize.bind(this);

    this.top = document.createElement('div');
    this.top.classList.add('passepartout');
    this.top.classList.add('top');

    this.right = document.createElement('div');
    this.right.classList.add('passepartout');
    this.right.classList.add('right');

    this.bottom = document.createElement('div');
    this.bottom.classList.add('passepartout');
    this.bottom.classList.add('bottom');

    this.left = document.createElement('div');
    this.left.classList.add('passepartout');
    this.left.classList.add('left');

    this.focusTrap = new FocusTrap();
  }

  /**
   * Attach to container.
   * @param {HTMLElement} container Container to attach passepartout to.
   */
  attach(container) {
    if (!container) {
      return;
    }

    container.append(this.top);
    container.append(this.right);
    container.append(this.bottom);
    container.append(this.left);

    this.focusTrap.attachTo({
      trapElement: this.element
    });
    this.focusTrap.activate();

    window.addEventListener('resize', this.handleResize);

    window.requestAnimationFrame(() => {
      this.top.classList.add('animate');
      this.right.classList.add('animate');
      this.bottom.classList.add('animate');
      this.left.classList.add('animate');
    });
  }

  /**
   * Remove.
   */
  remove() {
    this.focusTrap.deactivate();

    this.top?.parentNode?.removeChild(this.top);
    this.right?.parentNode?.removeChild(this.right);
    this.bottom?.parentNode?.removeChild(this.bottom);
    this.left?.parentNode?.removeChild(this.left);

    window.removeEventListener('resize', this.handleResize);
  }

  /**
   * Fit passepartout around element.
   * @param {HTMLElement} element Element to fit passepartout to.
   */
  fitTo(element) {
    if (!element) {
      return;
    }

    this.element = element;
    const rect = this.element.getBoundingClientRect();

    this.top.style.height = `${rect.y}px`;

    this.right.style.height = `${rect.height}px`;
    this.right.style.top = `${rect.y}px`;
    this.right.style.width = `calc(100% - ${rect.x + rect.width}px)`;

    this.bottom.style.height = `calc(100% - ${rect.y + rect.height}px)`;

    this.left.style.height = `${rect.height}px`;
    this.left.style.top = `${rect.y}px`;
    this.left.style.width = `${rect.x}px`;
  }

  /**
   * Handle resize.
   */
  handleResize() {
    window.clearTimeout(this.resizeTimeout);
    this.resizeTimeout = window.setTimeout(() => {
      this.fitTo(this.element);
    }, 0);
  }
}
