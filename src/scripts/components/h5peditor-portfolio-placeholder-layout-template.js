import Util from '@services/util';
import { swapDOMElements } from '@services/util-dom';
import LayoutButton from './h5peditor-portfolio-placeholder-layout-button.js';
import PortfolioPlaceholderSizeSlider from './preview/h5peditor-portfolio-placeholder-size-slider.js';

/** @constant {number} SLIDER_PERCENTAGE_MIN Minimum slider percentage. */
const SLIDER_PERCENTAGE_MIN = 0.05;

/** @constant {number} SLIDER_PERCENTAGE_MAX Maximum slider percentage. */
const SLIDER_PERCENTAGE_MAX = 0.95;

/** @constant {number} RESIZE_TIMEOUT_MS Resize timeout in ms. */
const RESIZE_TIMEOUT_MS = 10;

export default class LayoutTemplate {

  /**
   * @class
   * @param {object} params Parameters.
   * @param {object} callbacks Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      onClicked: () => {},
      onDoubleClicked: () => {},
      onReordered: () => {},
      onChanged: () => {},
    }, callbacks);

    this.forms = {};
    this.buttons = {};
    this.separators = {};
    this.layout = '1';

    this.hasClickListener =
      !!callbacks.onClicked ||
      !!callbacks.onDoubleClicked;

    this.container = document.createElement('div');
    this.container.classList
      .add('h5peditor-portfolio-placeholder-layout-template');
  }

  /**
   * Get template DOM.
   * @returns {HTMLElement} Template DOM.
   */
  getDOM() {
    return this.container;
  }

  /**
   * Set layout.
   * @param {object} [params] Parameters.
   * @param {string} params.layout Layout.
   * @param {number[]} params.widths Grow values.
   */
  setLayout(params = {}) {
    if (!Util.validateLayout(params.layout)) {
      return; // No valid layout
    }

    this.layout = params.layout;
    this.container.innerHTML = '';
    this.rows = {};

    const fieldIds = this.computeFieldIds(params.layout);

    this.layout.split('-').forEach((colCount, currentRow, rows) => {
      colCount = Number(colCount);

      this.rows[currentRow] = document.createElement('div');
      this.rows[currentRow].classList.add(
        'h5peditor-portfolio-placeholder-layout-template-row',
      );
      this.rows[currentRow].style.height = `${ 100 / rows.length }%`;

      fieldIds[currentRow].forEach((fieldId, currentCol) => {
        // Current columns width
        const width = params.widths?.length ?
          params.widths[fieldId] ?? 100 :
          100 / fieldIds[currentRow].length;

        // Create and add new button if required
        if (!this.buttons[fieldId]) {
          const buttonUUID = `button-${H5P.createUUID()}`;

          this.buttons[fieldId] = new LayoutButton(
            {
              id: fieldId,
              uuid: buttonUUID,
              width: width,
              type: this.hasClickListener ? 'button' : 'div',
            },
            {
              onClicked: ((id, event) => {
                this.callbacks.onClicked(id, event);
              }),
              onDoubleClicked: ((id, event) => {
                this.callbacks.onDoubleClicked(id, event);
              }),
              onFocusOut: (() => {
                this.handleFocusOut();
              }),
              onMouseUp: (() => {
                this.handleMouseUp();
              }),
              onMouseDown: (() => {
                this.handleMouseDown();
              }),
              onDragStart: ((button) => {
                this.handleDragStart(button);
              }),
              onDragEnter: ((button) => {
                this.handleDragEnter(button);
              }),
              onDragLeave: ((button) => {
                this.handleDragLeave(button);
              }),
              onDragEnd: ((button) => {
                this.handleDragEnd(button);
              }),
              onMovedUp: ((id) => {
                this.handleMovedUp(id);
              }),
              onMovedDown: ((id) => {
                this.handleMovedDown(id);
              }),
            },
          );

          // A separator should be put between buttons of a row
          this.separators[fieldId] = new PortfolioPlaceholderSizeSlider(
            {
              dictionary: this.params.dictionary,
              aria: { controls: buttonUUID, min: 1, max: 99 },
            },
            {
              onStartedSliding: (params) => {
                this.handleSizeSliderStarted({
                  id: fieldId,
                  x: params.x,
                });
              },
              onPositionChanged: (params) => {
                this.handleSizeSliderChanged({
                  id: fieldId,
                  x: params.x,
                  percentage: params.percentage,
                });
              },
              onEndedSliding: () => {
                this.handleSizeSliderEnded();
              },
            },
          );
        }

        // Set number of columns in row according to layout
        this.buttons[fieldId].setColumnWidth(width);
        this.separators[fieldId]?.setPosition(width);

        this.rows[currentRow].appendChild(this.buttons[fieldId].getDOM());

        if (
          this.separators[fieldId] &&
          params.widths && currentCol + 1 < colCount
        ) {
          this.rows[currentRow].appendChild(this.separators[fieldId].getDOM());
        }

      });

      this.container.appendChild(this.rows[currentRow]);
    });

    this.resize();
  }

  /**
   * Handle slider resizing started.
   * @param {object} [params] Parameters.
   * @param {number} [params.id] Field id.
   */
  handleSizeSliderStarted(params = {}) {
    this.container.classList.add('sliding');

    for (const id in this.buttons) {
      this.buttons[id].disable();
    }

    for (const id in this.separators) {
      if (id === params.id) {
        return;
      }
      this.separators[id].disable();
    }
  }

  /**
   * Handle slider resizing ended.
   */
  handleSizeSliderEnded() {
    this.container.classList.remove('sliding');

    const widths = [];
    for (const id in this.buttons) {
      this.buttons[id].enable();
      widths.push(this.buttons[id].getWidthPercentage());
    }

    for (const id in this.separators) {
      this.separators[id].enable();
    }

    this.callbacks.onChanged({ widths: widths });

    this.resize();
  }

  /**
   * Handle slider is resizing.
   * @param {object} [params] Parameters.
   * @param {number} [params.percentage] Percentage.
   */
  handleSizeSliderChanged(params = {}) {
    const button1 = this.buttons[params.id];
    const button2 = this.buttons[params.id + 1];
    const separator = this.separators[params.id];

    // Combined percentage of space that buttons adjacent to slider take up
    const combinedPercentage = button1.getWidthPercentage() +
      button2.getWidthPercentage();

    let percentage = params.percentage; // Predefined
    if (!params.percentage && typeof params.x === 'number') {
      // Compute percentage based on slider position
      const totalWidth =
        button1.getDOM().offsetWidth +
        separator.getDOM().offsetWidth +
        button2.getDOM().offsetWidth;

      const offset = button1.getDOM().getBoundingClientRect();

      percentage = (params.x - offset.x) / totalWidth;
    }

    if (typeof percentage !== 'number') {
      return;
    }

    percentage = Math.max(SLIDER_PERCENTAGE_MIN, Math.min(percentage, SLIDER_PERCENTAGE_MAX));

    button1.setColumnWidth(percentage * combinedPercentage);
    button2.setColumnWidth((1 - percentage) * combinedPercentage);
    separator.setPosition(percentage * 100); // ARIA value-now

    // Resizing causes mouse pointer flicker
    this.resize({ skipInstance: true });
  }

  /**
   * Get form for placeholder.
   * @param {number} id Placeholder id.
   * @returns {object} Form.
   */
  getForm(id) {
    return this.forms[id] || null;
  }

  /**
   * Set form for placeholder.
   * @param {number} id Placeholder id.
   * @param {object} form Form.
   */
  setForm(id, form) {
    this.forms[id] = form;
  }

  /**
   * Delete form for placeholder.
   * @param {number} id Placeholder id.
   */
  deleteForm(id) {
    if (!this.forms[id]) {
      return;
    }

    this.forms[id] = null;
  }

  /**
   * Compute field ids.
   * @param {string} layout Layout as 1-2-3...
   * @returns {object} Arrays of field ids referenced by row id.
   */
  computeFieldIds(layout) {
    const rows = {};
    let index = 0;

    layout.split('-')
      .forEach((colCount, rowId) => {
        colCount = Number(colCount);
        rows[rowId] = Array(colCount).fill(0).map((value, pos) => index + pos);
        index = index + colCount;
      });

    return rows;
  }

  /**
   * Resize placeholders.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.skipInstance] If true, don't resize instance.
   */
  resize(params = {}) {
    if (Object.keys(this.buttons).length === 0) {
      return;
    }

    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.resizeButtons({ skipInstance: params.skipInstance });
    }, RESIZE_TIMEOUT_MS);
  }

  /**
   * Resize buttons to match contents.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.skipInstance] If true, don't resize instance.
   */
  resizeButtons(params = {}) {
    for (let id in this.buttons) {
      this.buttons[id].resize({ skipInstance: params.skipInstance });
    }

    window.requestAnimationFrame(() => {
      this.resizeToMaxHeight();
    });
  }

  /**
   * Resize buttons to maximum height.
   */
  resizeToMaxHeight() {
    this.layout.split('-').forEach((colCount, currentRow, rows) => {
      colCount = Number(colCount);

      // Determine highest placeholder in row
      let highestHeight = 0;
      for (let i = 0; i < colCount; i++) {
        const id = rows
          .slice(0, currentRow)
          .reduce((sum, current) => sum + Number(current), i);

        highestHeight = Math.max(
          highestHeight, this.buttons[id].getInstanceHeight(),
        );
      }

      if (highestHeight === 0) {
        highestHeight = ''; // Let browser decide.
      }

      // Set all placeholders in row to highest height
      for (let i = 0; i < colCount; i++) {
        const id = rows
          .slice(0, currentRow)
          .reduce((sum, current) => sum + Number(current), i);

        this.buttons[id].setHeight(highestHeight);
      }
    });
  }

  /**
   * Set button content.
   * @param {object} [params] Parameters.
   * @param {number} params.id Button id.
   * @param {HTMLElement} params.content Button content.
   * @param {HTMLElement} params.instanceDOM Element that H5P is attached to.
   * @param {H5P.ContentType} params.instance Required to attach later.
   * @param {string} params.verticalAlignment Vertical alignment in preview.
   */
  setButtonContent(params = {}) {
    if (!this.buttons[params.id]) {
      return;
    }

    this.buttons[params.id].setContent(
      params.content,
      params.instanceDOM,
      params.instance,
      params.verticalAlignment,
    );

    this.resize();
  }

  /**
   * Set button content hidden.
   * @param {number} id Button id.
   * @param {boolean} state Hidden state.
   */
  setButtonContentHidden(id, state) {
    if (!this.buttons[id] || typeof state !== 'boolean') {
      return;
    }

    this.buttons[id].setContentHidden(state);
  }

  /**
   * Focus button.
   * @param {number} id Button id.
   */
  focusButton(id) {
    if (!this.buttons[id]) {
      return;
    }

    this.buttons[id].focus();
  }

  /**
   * Reset buttons after dragging.
   */
  resetButtonsAfterDragging() {
    for (let id in this.buttons) {
      this.buttons[id].toggleEffect('over', false);
    }
  }

  /**
   * Move buttons (mouse).
   * @param {object} params Parameters.
   * @param {number} params.id1 Button id #1.
   * @param {number} params.id2 Button id #2.
   */
  moveButtons(params = {}) {
    // Swap visuals
    swapDOMElements(
      this.buttons[params.id1].getDOM(),
      this.buttons[params.id2].getDOM(),
    );

    this.buttons[params.id1].attachDragPlaceholder();

    // Change buttons/placeholder size to match new position
    const tmp = this.buttons[params.id1].getSwapValues();
    const tmp2 = this.buttons[params.id2].getSwapValues();

    this.buttons[params.id1].setSwapValues(tmp2);
    this.buttons[params.id2].setSwapValues(tmp);
    this.buttons[params.id1].updateDragPlaceholderSize();

    // Change actual order
    [this.buttons[params.id1], this.buttons[params.id2]] =
      [this.buttons[params.id2], this.buttons[params.id1]];

    [this.forms[params.id1], this.forms[params.id2]] =
      [this.forms[params.id2], this.forms[params.id1]];

    if (
      typeof this.pendingIndex === 'number' &&
      this.pendingIndex !== this.startIndex &&
      !(this.startIndex === params.id2 && this.pendingIndex === params.id1)
    ) {
      // Swap visuals
      swapDOMElements(
        this.buttons[this.pendingIndex].getDOM(),
        this.buttons[this.startIndex].getDOM(),
      );

      // Change buttons/placeholder size to match new position
      const tmp = this.buttons[this.pendingIndex].getSwapValues();
      const tmp2 = this.buttons[this.startIndex].getSwapValues();
      this.buttons[this.pendingIndex].setSwapValues(tmp2);
      this.buttons[this.startIndex].setSwapValues(tmp);

      // Change actual order
      [this.buttons[this.pendingIndex], this.buttons[this.startIndex]] =
        [this.buttons[this.startIndex], this.buttons[this.pendingIndex]];

      [this.forms[this.pendingIndex], this.forms[this.startIndex]] =
        [this.forms[this.startIndex], this.forms[this.pendingIndex]];
    }

    this.pendingIndex = params.id2;
  }

  /**
   * Swap buttons.
   * @param {object} params Parameters.
   * @param {number} params.id1 Button id #1.
   * @param {number} params.id2 Button id #2.
   */
  swapButtons(params = {}) {
    // Swap visuals
    swapDOMElements(
      this.buttons[params.id1].getDOM(),
      this.buttons[params.id2].getDOM(),
    );

    // Change buttons/placeholder size to match new position
    const tmp = this.buttons[params.id1].getSwapValues();
    const tmp2 = this.buttons[params.id2].getSwapValues();
    this.buttons[params.id1].setSwapValues(tmp2);
    this.buttons[params.id2].setSwapValues(tmp);

    // Change actual order
    [this.buttons[params.id1], this.buttons[params.id2]] =
      [this.buttons[params.id2], this.buttons[params.id1]];

    [this.forms[params.id1], this.forms[params.id2]] =
      [this.forms[params.id2], this.forms[params.id1]];

    // Inform about reordering
    this.callbacks.onReordered(params.id1, params.id2);
  }

  /**
   * End move.
   * @param {object} params Parameters.
   * @param {number} params.id1 Button id #1.
   * @param {number} params.id2 Button id #2.
   */
  endMove(params = {}) {
    this.buttons[params.id2].focus();
    this.buttons[params.id2].select();

    this.resize({ skipInstance: true });
  }

  /**
   * Handle focus out.
   */
  handleFocusOut() {
    // focusout is handled before mouseup, the selectedDraggable may be needed
    if (!this.isMouseDownOnDraggable) {
      this.selectedDraggable = null;
    }
  }

  /**
   * Handle mouse up.
   */
  handleMouseUp() {
    this.isMouseDownOnDraggable = false;
  }

  /**
   * Handle mouse down.
   */
  handleMouseDown() {
    this.isMouseDownOnDraggable = true;
  }

  /**
   * Handle drag start.
   * @param {LayoutButton} button Button dragged.
   */
  handleDragStart(button) {
    this.draggedElement = button;
    this.startIndex = this.draggedElement.getId();
  }

  /**
   * Handle drag enter.
   * @param {LayoutButton} button Button dragged on.
   */
  handleDragEnter(button) {
    if (this.dropzoneElement && this.dropzoneElement === button) {
      return; // Prevent jumping when paragraph is smaller than others
    }

    this.dropzoneElement = button;

    // Swap dragged draggable and draggable that's dragged to if not identical
    if (
      this.dropzoneElement && this.draggedElement &&
      this.draggedElement !== this.dropzoneElement
    ) {
      this.moveButtons({
        id1: this.draggedElement.getId(),
        id2: this.dropzoneElement.getId(),
      });

      this.resize();
    }
  }

  /**
   * Handle drag leave.
   */
  handleDragLeave() {
    this.dropzoneElement = null;
  }

  /**
   * Handle drag end.
   */
  handleDragEnd() {
    // Reset row height
    this.layout.split('-').forEach((colCount, currentRow, rows) => {
      this.rows[currentRow].style.height = `${ 100 / rows.length }%`;
    });

    this.resetButtonsAfterDragging();

    this.draggedElement.focus();
    this.draggedElement = null;
    this.dropzoneElement = null;

    //  Inform about reordering
    this.callbacks.onReordered(this.startIndex, this.pendingIndex);

    this.startIndex = null;
    this.pendingIndex = null;

    this.resize();
  }

  /**
   * Handle button moved up.
   * @param {number} id Button id.
   */
  handleMovedUp(id) {
    if (id <= 0) {
      return;
    }

    this.swapButtons({ id1: id, id2: id - 1, type: 'keyboard' });
    this.endMove({ id1: id, id2: id - 1, type: 'keyboard' });
  }

  /**
   * Handle button moved down.
   * @param {number} id Button id.
   */
  handleMovedDown(id) {
    if (id >= this.buttons.length - 1) {
      return;
    }

    this.swapButtons({ id1: id, id2: id + 1, type: 'keyboard' });
    this.endMove({ id1: id, id2: id + 1, type: 'keyboard' });
  }
}
