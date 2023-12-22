import './h5peditor-portfolio-placeholder-layout-selector.scss';
import LayoutTemplate from './h5peditor-portfolio-placeholder-layout-template.js';
import Util from '@services/util.js';

export default class LayoutSelector {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      layouts: []
    }, params);

    this.callbacks = Util.extend({
      onLayoutChanged: (() => {})
    }, callbacks);

    this.layouts = {};
    this.layoutSelectedId = null;

    this.container = document.createElement('div');
    this.container.classList.add(
      'h5peditor-portfolio-placeholder-layout-selector'
    );

    this.params.layouts.forEach((layout) => {
      this.addLayout(layout);
    });
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.container;
  }

  /**
   * Add layout.
   * @param {object} layout Layout.
   */
  addLayout(layout = {}) {
    const layoutDOM = document.createElement('button');
    layoutDOM.classList.add(
      'h5peditor-portfolio-placeholder-layout-selector-preview'
    );
    layoutDOM.setAttribute('aria-label', layout.label);
    layoutDOM.addEventListener('click', () => {
      this.selectLayout(layout.value, true);
    });

    const layoutTemplate = new LayoutTemplate({
      dictionary: this.params.dictionary
    });
    layoutTemplate.setLayout({ layout: layout.value });
    layoutDOM.appendChild(layoutTemplate.getDOM());

    this.layouts[layout.value] = layoutDOM;
    this.container.appendChild(layoutDOM);
  }

  /**
   * Select a layout.
   * @param {string} layoutId Id.
   * @param {boolean} reset If true, reset grow horizontals.
   */
  selectLayout(layoutId, reset = false) {
    if (!this.layouts[layoutId]) {
      return;
    }

    if (this.layoutSelectedId) {
      this.layouts[this.layoutSelectedId].classList
        .remove('h5peditor-portfolio-placeholder-layout-selector-selected');
    }

    this.layoutSelectedId = layoutId;

    this.layouts[layoutId].classList
      .add('h5peditor-portfolio-placeholder-layout-selector-selected');

    this.callbacks.onLayoutChanged({ layout: layoutId, reset: reset });
  }

  /**
   * Validate.
   * @returns {boolean} True, if values are valid.
   */
  validate() {
    return (
      this.layoutSelectedId && this.layouts[this.layoutSelectedId] !== undefined
    );
  }
}
