import FocusTrap from '@services/focus-trap.js';
import './passepartout.scss';

export default class PortfolioPlaceholderPassepartout {

  /**
   * @class
   */
  constructor() {
    this.handleResize = this.handleResize.bind(this);

    const top = document.createElement('div');
    top.classList.add('passepartout');
    top.classList.add('top');

    const right = document.createElement('div');
    right.classList.add('passepartout');
    right.classList.add('right');

    const bottom = document.createElement('div');
    bottom.classList.add('passepartout');
    bottom.classList.add('bottom');

    const left = document.createElement('div');
    left.classList.add('passepartout');
    left.classList.add('left');

    this.sections = { top, right, bottom, left };

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

    Object.keys(this.sections).forEach((key) => {
      container.append(this.sections[key]);
    });

    this.focusTrap.attachTo({ trapElement: this.element });
    this.focusTrap.activate();

    window.addEventListener('resize', this.handleResize);

    window.requestAnimationFrame(() => {
      Object.keys(this.sections).forEach((key) => {
        this.sections[key].classList.add('animate');
      });
    });
  }

  /**
   * Remove.
   */
  remove() {
    this.focusTrap.deactivate();

    Object.keys(this.sections).forEach((key) => {
      this.sections[key]?.parentNode?.removeChild(this.sections[key]);
    });

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

    this.sections.top.style.height = `${rect.y}px`;

    this.sections.right.style.height = `${rect.height}px`;
    this.sections.right.style.top = `${rect.y}px`;
    this.sections.right.style.width = `calc(100% - ${rect.x + rect.width}px)`;

    this.sections.bottom.style.height =
      `calc(100% - ${rect.y + rect.height}px)`;

    this.sections.left.style.height = `${rect.height}px`;
    this.sections.left.style.top = `${rect.y}px`;
    this.sections.left.style.width = `${rect.x}px`;
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
