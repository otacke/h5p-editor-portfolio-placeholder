import './h5peditor-portfolio-placeholder-preview.scss';
import LayoutTemplate from './h5peditor-portfolio-placeholder-layout-template';
import Util from './../h5peditor-portfolio-placeholder-util';
import FormManager from './h5peditor-portfolio-placeholder-form-manager';
import Dictionary from './../services/dictionary';

export default class PortfolioPlaceholderPreview {

  /**
   * @class
   * @param {object} params Parameters.
   * @param {object} callbacks Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      layout: '1'
    }, params);

    this.params.params = this.params.listWidget.getValue();

    this.callbacks = Util.extend({
      onChanged: (() => {})
    }, callbacks);

    // Keep reference for handlers
    this.handleFormRemoved = this.handleFormRemoved.bind(this);
    this.handleFormDone = this.handleFormDone.bind(this);
    this.handleFormClosed = this.handleFormClosed.bind(this);

    this.currentPlaceholder = null;
    this.loadedLibraries = {};

    this.formManager = new FormManager(
      {
        parent: this.params.listWidget.parent.parent,
        customIconClass: 'portfolioplaceholder'
      }
    );

    this.preview = this.buildDOM();
  }

  /**
   * Get DOM.
   *
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.preview;
  }

  /**
   * Build DOM.
   *
   * @returns {HTMLElement} DOM.
   */
  buildDOM() {
    const preview = document.createElement('div');
    preview.classList.add('h5peditor-portfolio-placeholder-contents-wrapper');
    preview.appendChild(this.buildPreviewDOM());

    return preview;
  }

  /**
   * Build preview DOM.
   *
   * @returns {HTMLElement} Preview DOM.
   */
  buildPreviewDOM() {
    const contents = document.createElement('div');
    contents.classList.add('h5peditor-portfolio-placeholder-contents');

    this.layoutTemplate = new LayoutTemplate(
      {},
      {
        onDoubleClicked: (buttonId => {
          this.handlePlaceholderClicked(buttonId);
        }),
        onReordered: ((id1, id2) => {
          this.handleReordered(id1, id2);
        })
      }
    );

    this.setLayout(this.params.layout);

    contents.appendChild(this.layoutTemplate.getDOM());

    return contents;
  }

  /**
   * Build form.
   *
   * @param {number} id Placeholder id.
   * @returns {HTMLElement} Form.
   */
  buildEditorForm(id) {
    const fieldsNeededCount = this.params.layout
      .split('-')
      .reduce((sum, current) => sum + Number(current), 0);

    // Fill up fields
    while (this.params.params.length < fieldsNeededCount) {
      this.params.params.push({
        isHidden: false
      });
    }

    const editorForm = document.createElement('div');
    editorForm.classList.add('h5p-editor-portfolio-placeholder-form');

    // Render element fields to form in DOM
    H5PEditor.processSemanticsChunk(
      this.params.listWidget.getField().fields,
      this.params.params[id],
      H5P.jQuery(editorForm),
      this.params.listWidget.parent
    );

    return editorForm;
  }

  /**
   * Set layout.
   *
   * @param {string} layout Layout.
   */
  setLayout(layout) {
    if (!Util.validateLayout(layout)) {
      return; // No valid layout
    }

    this.params.layout = layout;
    this.layoutTemplate.setLayout(this.params.layout);
    this.updateInstances();
  }

  /**
   * Validate parameters.
   *
   * @returns {boolean} True, if parameters are valid. Else false.
   */
  validate() {
    return true; // This might need to be implemented at some point
  }

  /**
   * Handle placeholder instance was deleted.
   */
  handleFormRemoved() {
    this.formManager.getFormManager().closeFormUntil(0);
    this.params.params[this.currentPlaceholder] = { isHidden: false };
  }

  /**
   * Handle placeholder instance was saved.
   */
  handleFormDone() {
    this.validate();
  }

  /**
   * Handle form was closed after deleted/done.
   */
  handleFormClosed() {
    this.formManager.off('formremove', this.handleFormRemoved);
    this.formManager.off('formdone', this.handleFormDone);
    this.formManager.off('formclose', this.handleFormClosed);

    setTimeout(() => {
      this.updateInstance(this.currentPlaceholder, true);
      this.layoutTemplate.focusButton(this.currentPlaceholder);

      this.currentPlaceholder = null;

      this.handleChanged();
    }, 0); // Allow remove/done handler to run
  }

  /**
   * Handle form changed.
   */
  handleChanged() {
    this.callbacks.onChanged(this.params.params);
  }

  /**
   * Handle buttons reordered.
   *
   * @param {number} id1 Button 1 id.
   * @param {number} id2 Button 2 id.
   */
  handleReordered(id1, id2) {
    [this.params.params[id1], this.params.params[id2]] =
      [this.params.params[id2], this.params.params[id1]];

    this.handleChanged();
  }

  /**
   * Handle placeholder clicked.
   *
   * @param {number} placeholderId Placeholder id.
   */
  handlePlaceholderClicked(placeholderId) {
    this.currentPlaceholder = placeholderId;
    const form = this.buildEditorForm(placeholderId);

    this.formManager.on('formremove', this.handleFormRemoved);
    this.formManager.on('formdone', this.handleFormDone);
    this.formManager.on('formclose', this.handleFormClosed);

    const title = this.params.params[placeholderId]?.content?.metadata?.title ||
      this.params.params[placeholderId]?.content?.metadata?.contentType;

    const libraryField = this.params.params[placeholderId]?.content?.library ?
      { params: this.params.params[placeholderId]?.content } :
      { params: {
        library: 'H5P.notset 1.0',
        metadata: { title: '-' } }
      };

    this.formManager.openForm(libraryField, form, null, title);
  }

  /**
   * Hide element and all children from tab index.
   *
   * @param {HTMLElement} element HTML element.
   */
  hideFromTab(element) {
    element.setAttribute('tabindex', '-1');
    [...element.children].forEach(child => {
      this.hideFromTab(child);
    });
  }

  /**
   * Update instance.
   *
   * @param {number} id Placeholder id.
   * @param {boolean} [force=false] If true, will enforce instance recreation.
   */
  updateInstance(id, force = false) {
    if (typeof id !== 'number' || id < 0 || id >= this.params.params.length) {
      return; // Invalid id
    }

    const field = this.params.params[id];

    // Set state for user hidden content
    this.layoutTemplate.setButtonContentHidden(id, field?.isHidden);

    if (!force && this.loadedLibraries[id] === field?.content?.library) {
      return; // We can keep the instance
    }

    let instancePreview;
    let instanceDOM;
    let instance;

    if (field?.content?.library) {
      const instanceWrapper = document.createElement('div');
      instanceWrapper.classList.add('h5p-editor-placeholder-instance-wrapper');

      instanceDOM = document.createElement('div');
      instanceDOM.classList.add('h5p-editor-placeholder-instance');
      instanceWrapper.appendChild(instanceDOM);

      const instanceBlocker = document.createElement('div');
      instanceBlocker.classList.add('h5p-editor-placeholder-instance-blocker');

      instancePreview = document.createElement('div');
      instancePreview.classList.add('h5p-editor-placeholder-instance-preview');

      instancePreview.appendChild(instanceWrapper);
      instancePreview.appendChild(instanceBlocker);

      const machineName = (field?.content?.library || '').split(' ')[0];
      if (PortfolioPlaceholderPreview.CONTENT_TYPES_WITHOUT_PREVIEW.includes(machineName)) {
        instanceDOM.classList.add('h5p-editor-placeholder-no-preview-possible');
        instanceDOM.innerHTML = `<p>${machineName.split('.')[1]}</p><p>${Dictionary.get('l10n.noPreviewPossible')}</p>`;
      }
      else {
        // Fix required for video fitting, common issue
        if (machineName === 'H5P.Video') {
          field.content.params.visuals.fit = (
            field.content?.params?.sources?.length > 0 &&
            ['video/mp4', 'video/webm', 'video/ogg']
              .includes(field.content.params.sources[0].mime)
          );
        }

        instance = new H5P.newRunnable(
          field.content,
          H5PEditor.contentId,
          undefined, // Not attaching here deliberately
          true,
          {}
        );

        instance.once('loaded', () => {
          this.resize();
        });
        this.resize();

        instance.on('resize', () => {
          this.resize({ skipInstance: true });
        });

        // Hide content elements from tab
        this.hideFromTab(instancePreview);
      }
    }

    // Keep track of currently loaded library type
    this.loadedLibraries[id] = field?.content?.library;

    this.layoutTemplate.setButtonContent({
      id: id,
      content: instancePreview,
      instanceDOM: instanceDOM,
      instance: instance
    });
  }

  /**
   * Update all visible instances.
   *
   * @param {object} [params={}] Parameters.
   * @param {boolean} [params.force] If true, force instance recreation.
   */
  updateInstances(params = {}) {
    const count = Math.min(
      this.params.params.length,
      Util.countLayoutFields(this.params.layout)
    );

    for (let id = 0; id < count; id++) {
      this.updateInstance(id, params.force);
    }
  }

  /**
   * Resize.
   *
   * @param {object} [params={}] Parameters.
   * @param {boolean} [params.skipInstance] If true, don't resize instance.
   */
  resize(params = {}) {
    this.layoutTemplate.resize({ skipInstance: params.skipInstance });
  }
}

/** @constant {string[]} Content types that cannot render preview */
PortfolioPlaceholderPreview.CONTENT_TYPES_WITHOUT_PREVIEW = [
  'H5P.Chart', // Sizing issue when dragging
  'H5P.CoursePresentation', // Reopening instance in editor form fails
  'H5P.InteractiveVideo', // Sizing issue when dragging
  'H5P.Timeline' // Seems to require some extra treatment when attaching
];
