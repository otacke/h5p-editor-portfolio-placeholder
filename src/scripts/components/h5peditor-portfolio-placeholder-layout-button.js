import './h5peditor-portfolio-placeholder-layout-button.scss';
import Util from './../h5peditor-portfolio-placeholder-util';

export default class LayoutButton {

  /**
   * @class
   * @param {object} [params={}] Parameters.
   * @param {object} [callbacks={}] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      type: 'div'
    }, params);

    this.callbacks = Util.extend({
      onClicked: () => {},
      onDoubleClicked: () => {},
      onFocusOut: () => {}, // Button lost focus
      onMouseDown: () => {}, // Select with mouse
      onMouseUp: () => {}, // Select with mouse
      onMovedUp: () => {},
      onMovedDown: () => {},
      onDragStart: () => {}, // Drag start
      onDragEnter: () => {}, // Drag entered other paragraph
      onDragLeave: () => {}, // Drag left other paragraph
      onDragEnd: () => {} // Drag end
    }, callbacks);

    // DOM content of button
    this.buttonContent = null;

    // Build button element
    this.button = document.createElement(params.type);

    if (params.uuid) {
      this.button.setAttribute('id', params.uuid);
    }

    if (params.type === 'button') {
      this.button.classList.add('h5peditor-portfolio-placeholder-layout-template-button');
      this.button.setAttribute('draggable', true);
    }
    else {
      this.button.classList.add('h5peditor-portfolio-placeholder-layout-template-col');
    }

    this.setNumberOfColumns(params.columns);
    this.setColumnWidth(params.width);

    // Event listener for single click
    this.button.addEventListener('click', (event) => {
      if (event.pointerType === '') {
        if (this.isSelected()) {
          this.unselect();
        }
        else {
          this.select();
        }
        this.callbacks.onClicked(this.params.id, event);

        return;
      }

      this.unselect();
      this.callbacks.onDoubleClicked(this.params.id, event);

    });

    // Event listener for double click
    this.button.addEventListener('click', (event) => {
      Util.doubleClick(event, () => {
        if (event.pointerType === '') {
          this.unselect();
          this.callbacks.onDoubleClicked(this.params.id, event);
        }
      });
    });

    // Shown state
    this.shown = true;

    // Placeholder to show when dragging
    this.dragPlaceholder = document.createElement('div');
    this.dragPlaceholder.classList.add('h5peditor-portfolio-placeholder-placeholder');

    // These listeners prevent Firefox from showing draggable animation
    this.dragPlaceholder.addEventListener('dragover', (event) => {
      event.preventDefault();
    });
    this.dragPlaceholder.addEventListener('drop', (event) => {
      event.preventDefault();
    });

    this.addMoveHandlers(this.button);
  }

  /**
   * Get button DOM.
   *
   * @returns {HTMLElement} Button DOM.
   */
  getDOM() {
    return this.button;
  }

  /**
   * Set id.
   *
   * @param {number} id Button id.
   */
  setId(id) {
    this.params.id = id;
  }

  /**
   * Enable.
   */
  enable() {
    this.button.classList.remove('disabled');
  }

  /**
   * Disable.
   */
  disable() {
    this.button.classList.add('disabled');
  }

  /**
   * Get button id.
   *
   * @returns {number} Button id.
   */
  getId() {
    return this.params.id;
  }

  /**
   * Resize button to fit content (H5P instance) inside.
   *
   * @param {object} [params={}] Parameters.
   * @param {boolean} [params.skipInstance] If true, don't resize instance.
   */
  resize(params = {}) {
    if (!this.buttonInstance) {
      return;
    }

    if (!params.skipInstance && this.instance) {
      this.instance.trigger('resize');
    }

    this.setHeight('');

    window.requestAnimationFrame(() => {
      const extraHeight = this.buttonInstance.classList
        .contains('h5p-advanced-text') ?
        18 : // Not sure why scrollheight doesn't cover bottom margin
        2; // Border

      this.setHeight(extraHeight + this.buttonInstance.scrollHeight);
    });
  }

  /**
   * Get height.
   *
   * @returns {number} Offset height.
   */
  getHeight() {
    return this.button.offsetHeight;
  }

  /**
   * Set button height. Defaults numbers to px.
   *
   * @param {string|number} height Height.
   */
  setHeight(height) {
    if (typeof height === 'number') {
      height = `${height}px`;
    }

    if (typeof height !== 'string') {
      return; // Invalid
    }

    this.button.style.height = height;
  }

  /**
   * Get values required for swapping.
   *
   * @returns {object} Values required for swapping.
   */
  getSwapValues() {
    return {
      height: this.button.style.height,
      width: this.button.style.width,
      columns: this.params.columns,
      id: this.params.id
    };
  }

  /**
   * Set values required for swapping.
   *
   * @param {object} values Values required for swapping.
   */
  setSwapValues(values = {}) {
    this.button.style.height = values.height;
    this.button.style.width = values.width;
    this.params.columns = values.columns;
    this.params.id = values.id;
  }

  /**
   * Set number of columns for row that button is in.
   *
   * @param {number} columns Number of columns.
   */
  setNumberOfColumns(columns) {
    if (typeof columns !== 'number' || columns < 1) {
      return; // Invalid
    }

    this.params.columns = columns;
    // this.button.style.width = `${ 100 / columns }%`;
  }

  /**
   * Set width.
   *
   * @param {number} width Width in %.
   */
  setColumnWidth(width) {
    this.button.style.width = `${ width }%`;
  }

  /**
   * Get flex grow value.
   *
   * @returns {number} Flex grow value.
   */
  getFlexGrow() {
    return this.button.style.flexGrow || 100;
  }

  /**
   * Set button content.
   *
   * @param {HTMLElement} content Button content.
   * @param {HTMLElement} instanceDOM DOM element that instance is attached to.
   * @param {H5P.ContentType} instance Instance to attach.
   */
  setContent(content, instanceDOM, instance) {
    this.buttonContent = content || null;
    this.buttonInstance = instanceDOM || null;

    this.button.classList.toggle('has-preview', content instanceof HTMLElement);
    this.button.innerHTML = '';
    this.setHeight('');

    if (content instanceof HTMLElement) {
      this.button.appendChild(content);
    }

    if (instance) {
      this.instance = instance;
      instance.attach(H5P.jQuery(instanceDOM));

      // Hide content elements from tab
      this.hideFromTab(instanceDOM);
    }
    else {
      this.instance = null;
    }

    window.requestAnimationFrame(() => {
      this.resize();
    });
  }

  /**
   * Hide element and all children from tab index.
   *
   * @param {HTMLElement} element HTML element.
   */
  hideFromTab(element) {
    element.setAttribute('tabindex', '-1');
    [...element.children].forEach((child) => {
      this.hideFromTab(child);
    });
  }

  /**
   * Set button content hidden.
   *
   * @param {boolean} state Hidden state.
   */
  setContentHidden(state) {
    if (!this.buttonContent) {
      return; // No content
    }

    this.buttonContent.classList.toggle(
      'h5p-editor-placeholder-instance-hidden',
      state
    );
  }

  /**
   * Determine whether paragraph is shown.
   *
   * @returns {boolean} True, if paragraph is shown.
   */
  isShown() {
    return this.shown;
  }

  /**
   * Focus button.
   */
  focus() {
    this.button.focus();
  }

  /**
   * Show button.
   */
  show() {
    this.button.classList.remove('h5peditor-portfolio-placeholder-no-display');
    this.shown = true;
  }

  /**
   * Hide button.
   */
  hide() {
    this.button.classList.add('h5peditor-portfolio-placeholder-no-display');
    this.shown = false;
  }

  /**
   * Toggle CSS class named after an effect.
   *
   * @param {string} effectName Effect name.
   * @param {boolean} enabled If true, effect will be set, else unset.
   */
  toggleEffect(effectName, enabled) {
    const effects = ['over', 'selected'];
    if (typeof enabled !== 'boolean' || effects.indexOf(effectName) === -1) {
      return;
    }

    if (enabled) {
      this.button.classList.add(`h5peditor-portfolio-placeholder-${effectName}`);
    }
    else {
      this.button.classList.remove(`h5peditor-portfolio-placeholder-${effectName}`);
    }
  }

  /**
   * Update drag placeholder size.
   *
   * @param {object} [params={}] Parameters.
   * @param {number} [params.width] Optional explicit width.
   * @param {number} [params.height] Optional explicit height.
   */
  updateDragPlaceholderSize(params = {}) {
    if (typeof params.width === 'number') {
      params.width = `${params.width}px`;
    }
    else if (typeof params.width !== 'string') {
      params.width = null;
    }
    params.width = params.width || `${this.button.offsetWidth}px`;

    if (typeof params.height === 'number') {
      params.height = `${params.height}px`;
    }
    else if (typeof params.height !== 'string') {
      params.height = null;
    }

    params.height = params.height || `${this.button.offsetHeight}px`;

    this.dragPlaceholder.style.width = params.width;
    this.dragPlaceholder.style.height = params.height;
  }

  /**
   * Show drag placeholder. Draggable must be visible, or width/height = 0
   */
  showDragPlaceholder() {
    if (!this.isShown()) {
      return;
    }

    this.updateDragPlaceholderSize();
    this.attachDragPlaceholder();
  }

  /**
   * Attach drag placeholder.
   */
  attachDragPlaceholder() {
    this.button.parentNode.insertBefore(this.dragPlaceholder, this.button.nextSibling);
  }

  /**
   * Hide drag placeholder.
   */
  hideDragPlaceholder() {
    if (!this.dragPlaceholder.parentNode) {
      return;
    }

    this.dragPlaceholder.parentNode.removeChild(this.dragPlaceholder);
  }

  /**
   * Determine whether button is selected.
   *
   * @returns {boolean} True, if button is selected.
   */
  isSelected() {
    return this.selected;
  }

  /**
   * Select button.
   */
  select() {
    this.selected = true;
    this.toggleEffect('selected', true);
  }

  /**
   * Unselect button.
   */
  unselect() {
    this.selected = false;
    this.toggleEffect('selected', false);
  }

  /**
   * Add drag handlers to button.
   *
   * @param {HTMLElement} button Button.
   */
  addMoveHandlers(button) {
    // Mouse down. Prevent dragging when using buttons.
    button.addEventListener('mousedown', (event) => {
      this.handleMouseUpDown(event, 'onMouseDown');
    });

    // Mouse up. Allow dragging after using buttons.
    button.addEventListener('mouseup', (event) => {
      this.handleMouseUpDown(event, 'onMouseUp');
    });

    // Focus out
    button.addEventListener('focusout', (event) => {
      this.handleFocusOut(event);
    });

    // Drag start
    button.addEventListener('dragstart', (event) => {
      this.handleDragStart(event);
    });

    // Drag over
    button.addEventListener('dragover', (event) => {
      this.handleDragOver(event);
    });

    // Drag enter
    button.addEventListener('dragenter', (event) => {
      this.handleDragEnter(event);
    });

    // Drag leave
    button.addEventListener('dragleave', (event) => {
      this.handleDragLeave(event);
    });

    // Drag end
    button.addEventListener('dragend', (event) => {
      this.handleDragEnd(event);
    });

    // Key down
    button.addEventListener('keydown', (event) => {
      this.handleKeyDown(event);
    });
  }

  /**
   * Handle mouse button up or down.
   *
   * @param {Event} event Mouse event.
   * @param {string} callbackName Callback name.
   */
  handleMouseUpDown(event, callbackName) {
    if (callbackName === 'onMouseDown') {
      // Used in dragstart for Firefox workaround
      this.pointerPosition = {
        x: event.clientX,
        y: event.clientY
      };
    }

    this.callbacks[callbackName]();
  }

  /**
   * Handle focus out
   */
  handleFocusOut() {
    this.toggleEffect('selected', false);

    this.callbacks.onFocusOut(this);
  }

  /**
   * Handle drag start.
   *
   * @param {Event} event Event.
   */
  handleDragStart(event) {
    this.unselect();

    this.toggleEffect('over', true);
    event.dataTransfer.effectAllowed = 'move';

    // Workaround for Firefox that may scale the draggable down otherwise
    event.dataTransfer.setDragImage(
      this.button,
      this.pointerPosition.x - this.button.getBoundingClientRect().left,
      this.pointerPosition.y - this.button.getBoundingClientRect().top
    );

    // Will hide browser's draggable copy as well without timeout
    clearTimeout(this.placeholderTimeout);
    this.placeholderTimeout = setTimeout(() => {
      this.showDragPlaceholder();
      this.hide();
    }, 0);

    this.callbacks.onDragStart(this);
  }

  /**
   * Handle drag over.
   *
   * @param {Event} event Event.
   */
  handleDragOver(event) {
    event.preventDefault();
  }

  /**
   * Handle drag enter.
   */
  handleDragEnter() {
    this.callbacks.onDragEnter(this);
  }

  /**
   * Handle drag leave.
   *
   * @param {Event} event Event.
   */
  handleDragLeave(event) {
    if (this.button !== event.target || this.button.contains(event.fromElement)) {
      return;
    }

    this.callbacks.onDragLeave(this);
  }

  /**
   * Handle drag end.
   */
  handleDragEnd() {
    clearTimeout(this.placeholderTimeout);
    this.hideDragPlaceholder();
    this.show();
    this.toggleEffect('over', false);

    this.callbacks.onDragEnd(this);
  }

  /**
   * Handle keydown.
   *
   * @param {Event} event Event.
   */
  handleKeyDown(event) {
    if (!this.isSelected()) {
      return;
    }

    if (event.code === 'ArrowUp' || event.code === 'ArrowLeft') {
      event.preventDefault();
      this.callbacks.onMovedUp(this.params.id);
    }
    else if (event.code === 'ArrowDown' || event.code === 'ArrowRight') {
      event.preventDefault();
      this.callbacks.onMovedDown(this.params.id);
    }
  }
}
