import './h5peditor-portfolio-placeholder-preview.scss';
import LayoutTemplate from '@components/h5peditor-portfolio-placeholder-layout-template.js';
import Util from '@services/util.js';
import FormManager from '@components/h5peditor-portfolio-placeholder-form-manager.js';
import PortfolioPlaceholderPassepartout from '@components/passepartout/passepartout.js';

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

    // Keep track of visibility state
    this.isVisible = false;

    this.formManager = new FormManager(
      {
        dictionary: this.params.dictionary,
        parent: this.params.listWidget.parent.parent,
        customIconClass: 'portfolioplaceholder'
      }
    );

    this.preview = this.buildDOM();

    this.wasRenderedInitially = false;

    /*
     * There may be a lot of resizing going on in many instances, so only
     * allow to prevent resizing when the preview is not visible
     */
    new IntersectionObserver((entries) => {
      const entry = entries[0];

      // Preview became visible
      if (entry.isIntersecting) {
        if (this.isVisible) {
          return;
        }

        // Set state for user hidden content on first view
        if (!this.wasRenderedInitially) {
          this.params.params.forEach((placeholder, index) => {
            this.layoutTemplate.setButtonContentHidden(index, placeholder.isHidden);
          });

          this.wasRenderedInitially = true;
        }

        this.isVisible = true;
        this.resize();
      }
      else {
        this.isVisible = false;
      }
    }, {
      root: null,
      threshold: [0, 1] // Get events when it is shown and hidden
    }).observe(this.preview);
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.preview;
  }

  /**
   * Build DOM.
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
   * @returns {HTMLElement} Preview DOM.
   */
  buildPreviewDOM() {
    const contents = document.createElement('div');
    contents.classList.add('h5peditor-portfolio-placeholder-contents');

    this.layoutTemplate = new LayoutTemplate(
      {
        dictionary: this.params.dictionary
      },
      {
        onDoubleClicked: (buttonId) => {
          this.handlePlaceholderClicked(buttonId);
        },
        onReordered: (id1, id2) => {
          this.handleReordered(id1, id2);
        },
        onChanged: (params) => {
          params?.widths.forEach((width, index) => {
            // No content may have been set yet
            this.params.params[index] = this.params.params[index] ?? {};

            this.params.params[index].width = Number(width);
          });

          this.handleChanged();
        }
      }
    );

    this.setLayout({
      layout: this.params.layout,
      widths: this.params.params.reduce((all, param) => {
        return [...all, param.width];
      }, [])
    });

    contents.appendChild(this.layoutTemplate.getDOM());

    return contents;
  }

  /**
   * Build form.
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
   * @param {object} [params] Parameters.
   * @param {string} params.layout Layout.
   * @param {number[]} params.widths Grow values.
   */
  setLayout(params = {}) {
    if (!Util.validateLayout(params.layout)) {
      return; // No valid layout
    }

    // Fill up fields
    const numberOfFields = params.layout
      .split('-')
      .reduce((a, b) => parseInt(a) + parseInt(b), 0);

    while (this.params.params.length < numberOfFields) {
      const emptyField = {
        content: { params: {} },
        isHidden: false,
        width: 100
      };
      this.params.params.push(emptyField);
    }

    this.params.layout = params.layout;
    this.layoutTemplate.setLayout(params);
    this.updateInstances();
  }

  /**
   * Validate parameters.
   * @returns {boolean} True, if parameters are valid. Else false.
   */
  validate() {
    return true; // This might need to be implemented at some point
  }

  /**
   * Delete hidden placeholders.
   */
  deleteHidden() {
    for (let i = 0; i < this.params.params.length; i++) {
      if (this.params.params[i].isHidden) {
        this.params.params[i] = { isHidden: false };
      }
    }

    this.handleChanged();
  }

  /**
   * Handle placeholder instance was deleted.
   */
  handleFormRemoved() {
    this.formManager.getFormManager().closeFormUntil(0);
    this.params.params[this.currentPlaceholder] = { isHidden: false };
    this.layoutTemplate.deleteForm(this.currentPlaceholder);
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
    this.passepartout?.remove();
    delete this.passepartout;

    this.libraryFieldObserver?.disconnect();
    delete this.libraryFieldObserver;

    this.formManager.off('formremove', this.handleFormRemoved);
    this.formManager.off('formdone', this.handleFormDone);
    this.formManager.off('formclose', this.handleFormClosed);

    setTimeout(() => {
      this.updateInstance(this.currentPlaceholder, true);
      this.layoutTemplate.focusButton(this.currentPlaceholder);

      // Set state for user hidden content
      this.layoutTemplate.setButtonContentHidden(
        this.currentPlaceholder, this.params.params[this.currentPlaceholder]?.isHidden
      );

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
   * @param {number} id1 Button 1 id.
   * @param {number} id2 Button 2 id.
   */
  handleReordered(id1, id2) {
    if (typeof id1 !== 'number' || typeof id2 !== 'number') {
      return;
    }

    [this.params.params[id1], this.params.params[id2]] =
      [this.params.params[id2], this.params.params[id1]];

    this.handleChanged();
  }

  /**
   * Handle placeholder clicked.
   * @param {number} placeholderId Placeholder id.
   */
  handlePlaceholderClicked(placeholderId) {
    this.currentPlaceholder = placeholderId;
    let form = this.layoutTemplate.getForm(placeholderId);
    if (!form) {
      form = this.buildEditorForm(placeholderId);
      this.layoutTemplate.setForm(placeholderId, form);
    }

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

    /*
     * There doesn't seem to be a way to get hold of the H5PEditor.Library
     * instance in order to register a "change" callback. One can access the
     * H5PEditor.Group instance inside the listWidget, but it crashes when
     * running forEachChild as its `children` are said to not be set.
     * Using a mutation observer to refit the passepartout is a workaround.
     */
    const libraryContentField = form.querySelector('.field.library > .libwrap');
    if (libraryField) {
      this.libraryFieldObserver = new MutationObserver(() => {
        this.passepartout?.handleResize();
      });
      this.libraryFieldObserver.observe(
        libraryContentField, { childList: true }
      );
    }

    this.passepartout = new PortfolioPlaceholderPassepartout();
    this.passepartout.fitTo(this.formManager.formContainer.parentNode.parentNode);
    this.passepartout.attach(document.body);
  }

  /**
   * Update instance.
   * @param {number} id Placeholder id.
   * @param {boolean} [force] If true, will enforce instance recreation.
   */
  updateInstance(id, force = false) {
    if (typeof id !== 'number' || id < 0 || id >= this.params.params.length) {
      return; // Invalid id
    }

    const fieldsNeededCount = this.params.layout
      .split('-')
      .reduce((sum, current) => sum + Number(current), 0);

    // Fill up fields
    while (this.params.params.length < fieldsNeededCount) {
      this.params.params.push({
        isHidden: false
      });
    }

    const field = this.params.params[id];

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
        instanceDOM.innerHTML = `<p>${machineName.split('.')[1]}</p><p>${this.params.dictionary.get('l10n.noPreviewPossible')}</p>`;
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
          clearTimeout(this.instanceResizeListener);
          this.instanceResizeListener = setTimeout(() => {
            this.resize({ skipInstance: true });
          }, 100); // Many instances may resize at the same time ...
        });
      }
    }

    // Keep track of currently loaded library type
    this.loadedLibraries[id] = field?.content?.library;

    this.layoutTemplate.setButtonContent({
      id: id,
      content: instancePreview,
      instanceDOM: instanceDOM,
      instance: instance,
      verticalAlignment: field.verticalAlignment
    });
    this.layoutTemplate.setButtonContentHidden(
      id, this.params.params[id].isHidden
    );
  }

  /**
   * Update all visible instances.
   * @param {object} [params] Parameters.
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
   * @param {object} [params] Parameters.
   * @param {boolean} [params.skipInstance] If true, don't resize instance.
   */
  resize(params = {}) {
    if (!this.isVisible) {
      return; // Don't resize if preview is not visible
    }

    this.layoutTemplate.resize({ skipInstance: params.skipInstance });
  }
}

/** @constant {string[]} Content types that cannot render preview */
PortfolioPlaceholderPreview.CONTENT_TYPES_WITHOUT_PREVIEW = [
  'H5P.Timeline' // Seems to require some extra treatment when attaching
];
