import LayoutTemplate from './h5peditor-portfolio-placeholder-layout-template';
import Util from './h5peditor-portfolio-placeholder-util';
import FormManager from './h5peditor-portfolio-placeholder-form-manager';

export default class PortfolioPlaceholderPreview {

  /**
   * @constructor
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      layout: '1',
      parent: { parent: {} },
      params: []
    }, params);

    this.callbacks = Util.extend({
      onGetCurrentLibrary: (() => {
        return '';
      }),
      onChanged: (() => {})
    }, callbacks);

    if (!this.params.semanticsChunk || !this.params.params) {
      console.warn('No fields or parameters given!');
    }

    // Keep reference for handlers
    this.handleFormRemoved = this.handleFormRemoved.bind(this);
    this.handleFormDone = this.handleFormDone.bind(this);
    this.handleFormClosed = this.handleFormClosed.bind(this);

    this.currentPlaceholder = null;
    this.loadedLibraries = {};

    this.formManager = new FormManager(
      {
        parent: this.params.parent.parent,
        customIconClass: 'portfolioplaceholder'
      }
    );

    this.preview = this.buildDOM();
  }

  /**
   * Get DOM.
   * @return {HTMLElement} DOM.
   */
  getDOM() {
    return this.preview;
  }

  /**
   * Build DOM.
   */
  buildDOM() {
    const preview = document.createElement('div');
    preview.classList.add('h5peditor-portfolio-placeholder-contents-wrapper');
    preview.appendChild(this.buildPreviewDOM());

    return preview;
  }

  /**
   * Build preview DOM.
   * @return {HTMLElement} Preview DOM.
   */
  buildPreviewDOM() {
    const contents = document.createElement('div');
    contents.classList.add('h5peditor-portfolio-placeholder-contents');

    this.layoutTemplate = new LayoutTemplate(
      {},
      {
        onDoubleClicked: (buttonId => {
          this.handlePlaceholderClicked(buttonId);
        })
      }
    );

    this.updateInstances();
    this.setLayout(this.params.layout);

    contents.appendChild(this.layoutTemplate.getDOM());

    return contents;
  }

  /**
   * Build form.
   * @param {number} id Placeholder id.
   * @return {HTMLElement} Form.
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

    // TODO: This should be handled differently
    const formInstance = {
      passReadies: true,
      ready: (() => {}),
      parent: this.params.parent,
      field: {
        type: 'group'
      }
    };

    // Render element fields to form in DOM
    H5PEditor.processSemanticsChunk(
      this.params.semanticsChunk,
      this.params.params[id],
      H5P.jQuery(editorForm),
      formInstance,
      this.callbacks.onGetCurrentLibrary()
    );

    return editorForm;
  }

  /**
   * Set layout.
   * @param {string} layout Layout.
   */
  setLayout(layout) {
    if (typeof layout !== 'string' || !/^[0-9]+(-[0-9]+)*$/.test(layout)) {
      return; // No valid layout
    }

    this.params.layout = layout;
    this.layoutTemplate.setLayout(this.params.layout);
  }

  /**
   * Validate parameters.
   * @return {boolean} True, if parameters are valid. Else false.
   */
  validate() {
    return true; // TODO: Validate params
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
      this.updateInstances(this.currentPlaceholder);
      this.layoutTemplate.setLayout(this.params.layout); //TODO: Refactor to use separate update function
      (this.layoutTemplate.getButton(this.currentPlaceholder)).focus();

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
   * Handle placeholder clicked.
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

    // TODO: Focus on first field after opening

    this.formManager.openForm(
      libraryField,
      form,
      null,
      title
    );
  }

  /**
   * Hide element and all children from tab index.
   * @param {HTMLElement} element HTML element.
   */
  hideFromTab(element) {
    element.setAttribute('tabindex', '-1');
    [...element.children].forEach(child => {
      this.hideFromTab(child);
    });
  }

  /**
   * Update instances.
   * @param {number} placeholderId Placeholder id.
   */
  updateInstances(id) {
    if (Object.keys(this.params.params).length === 0) {
      return; // Not ready yet
    }

    const contentFields = (typeof id === 'number') ?
      [this.params.params[id]] :
      this.params.params;

    contentFields.forEach((field, index) => {
      if (typeof id === 'number') {
        index = id;
      }

      if (this.loadedLibraries[index] === field.content.library) {
        return; // We can keep the instance
      }

      let instancePreview;

      if (field?.content?.library) {
        const instanceWrapper = document.createElement('div');
        instanceWrapper.classList.add('h5p-editor-placeholder-instance-wrapper');

        const instanceDOM = document.createElement('div');
        instanceDOM.classList.add('h5p-editor-placeholder-instance');
        instanceWrapper.appendChild(instanceDOM);

        const instanceBlocker = document.createElement('div');
        instanceBlocker.classList.add('h5p-editor-placeholder-instance-blocker');

        instancePreview = document.createElement('div');
        instancePreview.classList.add('h5p-editor-placeholder-instance-preview');
        if (field.isHidden) {
          instancePreview.classList.add('h5p-editor-placeholder-instance-hidden');
        }

        instancePreview.appendChild(instanceWrapper);
        instancePreview.appendChild(instanceBlocker);

        const instance = new H5P.newRunnable(
          field.content,
          H5PEditor.contentId,
          H5P.jQuery(instanceDOM),
          false,
          {}
        );

        const machineName = instance?.libraryInfo?.machineName;
        // TODO: This may need to be done for more content types ...
        if (machineName === 'H5P.Image') {
          window.addEventListener('resize', () => {
            this.layoutTemplate.resize();
          });
          instance.once('loaded', () => {
            this.layoutTemplate.resize();
          });
          this.layoutTemplate.resize();
        }

        instance.on('resize', () => {
          this.layoutTemplate.resize();
        });

        // Hide content elements from tab
        this.hideFromTab(instancePreview);
      }

      this.loadedLibraries[index] = field?.content?.library;

      this.layoutTemplate.setButtonContent(
        index,
        instancePreview
      );
    });
  }
}
